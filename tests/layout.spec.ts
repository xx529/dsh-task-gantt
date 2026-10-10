/**
 * Layout tests for `src/client/ui/timeline-layout.ts` (owner: ui).
 *
 * The module is a pure function `(TimelineResponse, viewport, options) → rects`,
 * so every formula in its contract is checked arithmetically here: window
 * resolution, zoom clamping, tick alignment/caps, lane and bar geometry,
 * scroll-space conversion, card width clamps, culling and input sanitization.
 *
 * Determinism is asserted too (no `Date.now()` inside the module): the same
 * input must always produce a deep-equal layout.
 */
import { describe, expect, it } from 'vitest'
import type { TimelineResponse } from '../src/shared/contract.ts'
import {
  DAY_MS,
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_LANE_HEIGHT,
  DEFAULT_MS_PER_PX,
  HOUR_MS,
  LANE_HEAD_WIDTH,
  LANE_PAD_Y,
  MAX_MS_PER_PX,
  MAX_TICKS,
  MIN_MS_PER_PX,
  MIN_SPAN_PX,
  STEP_BAR_HEIGHT,
  TASK_CARD_HEIGHT,
  TASK_CARD_TOP,
  TASK_MAX_WIDTH,
  TASK_MIN_WIDTH,
  TURN_BAND_HEIGHT,
  buildTicks,
  clamp,
  clampMsPerPx,
  computeWindow,
  fitMsPerPx,
  formatClock,
  formatDateTime,
  formatTickLabel,
  layoutTimeline,
  pickTickStep,
  type TimelineViewport,
} from '../src/client/ui/timeline-layout.ts'
import { validTimeline } from './helpers/timeline-assert.ts'

const VIEWPORT: TimelineViewport = { width: 200, height: 400, laneHeight: DEFAULT_LANE_HEIGHT, headerHeight: DEFAULT_HEADER_HEIGHT }

/** A response with a live range starting at 1000 and no tasks. */
function liveResponse(): TimelineResponse {
  const data = validTimeline()
  return {
    ...data,
    range: { start: 1_000, end: null },
    lanes: [
      {
        id: 'lead',
        name: 'Lead',
        role: 'lead',
        hasHistory: true,
        spans: [
          { kind: 'step', start: 2_000, end: 3_000 },
          { kind: 'turn', start: 2_000, end: null },
        ],
        tasks: [],
      },
    ],
    tasks: [],
  }
}

/** Replace a lane's tasks and mirror them at the top level. */
function withTasks(data: TimelineResponse, tasks: TimelineResponse['tasks']): TimelineResponse {
  const lanes = data.lanes.map((lane, index) => (index === 0 ? { ...lane, tasks } : lane))
  return { ...data, lanes, tasks }
}

describe('computeWindow', () => {
  it('pins a live window to now and covers every datum', () => {
    const win = computeWindow(liveResponse(), 11_000)
    expect(win).toEqual({ start: 1_000, end: 11_000, durationMs: 10_000, live: true })
  })

  it('keeps a live window on now even when a datum is newer than now', () => {
    const win = computeWindow(liveResponse(), 2_500)
    // rawEnd (3000) is newer than now: the window must still cover it.
    expect(win.end).toBe(3_000)
    expect(win.live).toBe(true)
  })

  it('honours a closed range end and still covers later data', () => {
    const data = { ...liveResponse(), range: { start: 1_000, end: 5_000 } }
    expect(computeWindow(data, 99_999)).toMatchObject({ start: 1_000, end: 5_000, live: false })
    const later = { ...data, lanes: [{ ...data.lanes[0]!, spans: [{ kind: 'step' as const, start: 2_000, end: 9_000 }] }] }
    expect(computeWindow(later, 99_999).end).toBe(9_000)
  })

  it('never returns a non-positive duration', () => {
    const data = { ...liveResponse(), range: { start: 5_000, end: 5_000 }, lanes: [], tasks: [] }
    expect(computeWindow(data, 0).durationMs).toBeGreaterThanOrEqual(1)
  })

  it('uses range.start as the only anchor for an empty payload', () => {
    const data = { ...liveResponse(), range: { start: 4_000, end: null }, lanes: [], tasks: [] }
    expect(computeWindow(data, 9_000)).toMatchObject({ start: 4_000, end: 9_000, live: true })
  })

  it('ignores non-finite timestamps', () => {
    const data = {
      ...liveResponse(),
      lanes: [
        { ...liveResponse().lanes[0]!, spans: [{ kind: 'step' as const, start: Number.NaN, end: Number.POSITIVE_INFINITY }] },
      ],
    }
    const win = computeWindow(data, 11_000)
    expect(Number.isFinite(win.start)).toBe(true)
    expect(Number.isFinite(win.end)).toBe(true)
  })
})

describe('zoom helpers', () => {
  it('clamps msPerPx into the supported range', () => {
    expect(clampMsPerPx(1)).toBe(MIN_MS_PER_PX)
    expect(clampMsPerPx(10_000_000)).toBe(MAX_MS_PER_PX)
    expect(clampMsPerPx(1_000)).toBe(1_000)
  })

  it('falls back to the default for non-finite or non-positive input', () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, 0, -5]) {
      expect(clampMsPerPx(value), String(value)).toBe(DEFAULT_MS_PER_PX)
    }
  })

  it('fits a duration into a width, clamped', () => {
    expect(fitMsPerPx(10_000, 100)).toBe(100)
    expect(fitMsPerPx(0, 0)).toBe(MIN_MS_PER_PX)
    expect(fitMsPerPx(DAY_MS, 1)).toBe(MAX_MS_PER_PX)
  })

  it('clamp() collapses an inverted range to lo', () => {
    expect(clamp(5, 10, 1)).toBe(10)
    expect(clamp(5, 1, 10)).toBe(5)
  })
})

describe('tick ladder', () => {
  it('picks the smallest step >= the target', () => {
    expect(pickTickStep(1)).toBe(1_000)
    expect(pickTickStep(1_000)).toBe(1_000)
    expect(pickTickStep(1_001)).toBe(2_000)
    expect(pickTickStep(3 * DAY_MS)).toBe(7 * DAY_MS)
  })

  it('falls back for a nonsensical target', () => {
    expect(pickTickStep(Number.NaN)).toBe(1_000)
    expect(pickTickStep(-1)).toBe(1_000)
  })

  it('generates aligned ticks inside the window, ascending', () => {
    const { ticks, stepMs, truncated } = buildTicks({
      window: { start: 1_000, end: 11_000, durationMs: 10_000, live: true },
      msPerPx: 100,
      viewportWidth: 200,
      scrollLeft: 0,
      tickCount: 6,
      tzOffsetMinutes: 0,
    })
    expect(stepMs).toBe(5_000)
    expect(ticks.map((tick) => tick.time)).toEqual([5_000, 10_000])
    expect(ticks[0]).toMatchObject({ x: 40, viewX: 40, labelKind: 'time', label: '00:00', major: false })
    expect(truncated).toBe(false)
    for (let index = 1; index < ticks.length; index += 1) {
      expect((ticks[index] as { time: number }).time).toBeGreaterThan((ticks[index - 1] as { time: number }).time)
    }
  })

  it('marks day ticks major and shifts them by the local offset', () => {
    const { ticks, stepMs } = buildTicks({
      window: { start: 0, end: 3 * DAY_MS, durationMs: 3 * DAY_MS, live: false },
      msPerPx: (4 * DAY_MS) / 200,
      viewportWidth: 200,
      scrollLeft: 0,
      tickCount: 4,
      tzOffsetMinutes: 0,
    })
    expect(stepMs).toBe(DAY_MS)
    expect(ticks.map((tick) => tick.time)).toEqual([0, DAY_MS, 2 * DAY_MS, 3 * DAY_MS])
    for (const tick of ticks) {
      expect(tick.major).toBe(true)
      expect(tick.labelKind).toBe('date')
      expect(tick.label).toMatch(/^\d{2}-\d{2}$/)
    }
  })

  it('caps the tick count so a pathological zoom cannot hang a render', () => {
    const { ticks, truncated } = buildTicks({
      window: { start: 0, end: 1_000_000_000, durationMs: 1_000_000_000, live: false },
      msPerPx: 1,
      viewportWidth: 200,
      scrollLeft: 0,
      tickCount: 6,
      tzOffsetMinutes: 0,
    })
    expect(truncated).toBe(true)
    expect(ticks).toHaveLength(MAX_TICKS)
  })

  it('offsets viewX by scrollLeft but not x', () => {
    const { ticks } = buildTicks({
      window: { start: 0, end: 10_000, durationMs: 10_000, live: false },
      msPerPx: 100,
      viewportWidth: 200,
      scrollLeft: 30,
      tickCount: 6,
      tzOffsetMinutes: 0,
    })
    expect(ticks[0]?.x).toBe(0)
    expect(ticks[0]?.viewX).toBe(-30)
    expect(ticks[0]?.visible).toBe(false)
  })
})

describe('time formatting (pure, offset-driven)', () => {
  it('formats a clock in the given zone', () => {
    expect(formatClock(0, 0)).toBe('00:00')
    expect(formatClock(0, 480)).toBe('08:00')
    expect(formatClock(0, -300)).toBe('19:00')
  })

  it('formats date+time and the tick labels', () => {
    expect(formatDateTime(0, 0)).toBe('01-01 00:00')
    expect(formatTickLabel(0, 'time', 0)).toBe('00:00')
    expect(formatTickLabel(0, 'date', 0)).toBe('01-01')
  })

  it('never throws on a non-finite time', () => {
    expect(formatClock(Number.NaN)).toBe('00:00')
    expect(formatDateTime(Number.POSITIVE_INFINITY)).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}$/)
  })
})

describe('layoutTimeline — geometry', () => {
  const data = liveResponse()

  it('exposes the resolved window, canvas size and viewport', () => {
    const layout = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.window).toEqual({ start: 1_000, end: 11_000, durationMs: 10_000, live: true })
    expect(layout.dataWidth).toBe(100)
    expect(layout.contentWidth).toBe(100)
    expect(layout.contentHeight).toBe(DEFAULT_HEADER_HEIGHT + DEFAULT_LANE_HEIGHT)
    expect(layout.msPerPx).toBe(100)
  })

  it('stacks lanes below the sticky header', () => {
    const twoLanes: TimelineResponse = {
      ...data,
      lanes: [data.lanes[0]!, { ...data.lanes[0]!, id: 'b', name: 'B', role: 'teammate', spans: [], tasks: [] }],
    }
    const layout = layoutTimeline(twoLanes, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.lanes.map((lane) => lane.y)).toEqual([DEFAULT_HEADER_HEIGHT, DEFAULT_HEADER_HEIGHT + DEFAULT_LANE_HEIGHT])
    expect(layout.lanes[1]?.height).toBe(DEFAULT_LANE_HEIGHT)
    expect(layout.contentHeight).toBe(DEFAULT_HEADER_HEIGHT + 2 * DEFAULT_LANE_HEIGHT)
  })

  it('places a closed step bar and an open turn band', () => {
    const layout = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const [step, turn] = layout.spans
    expect(step).toMatchObject({ kind: 'step', open: false, start: 2_000, end: 3_000, x: 10, w: 10 })
    expect(turn).toMatchObject({ kind: 'turn', open: true, start: 2_000, end: 11_000, x: 10, w: 90 })
    // The 8px step bar is centred inside the 10px turn band.
    expect(turn?.y).toBe(DEFAULT_HEADER_HEIGHT + LANE_PAD_Y)
    expect(step?.y).toBe(DEFAULT_HEADER_HEIGHT + LANE_PAD_Y + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2)
    expect(turn?.h).toBe(TURN_BAND_HEIGHT)
    expect(step?.h).toBe(STEP_BAR_HEIGHT)
  })

  it('gives a zero-length span the minimum visible width, never zero', () => {
    const zero: TimelineResponse = {
      ...data,
      lanes: [{ ...data.lanes[0]!, spans: [{ kind: 'step', start: 5_000, end: 5_000 }] }],
    }
    const layout = layoutTimeline(zero, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.spans[0]?.w).toBe(MIN_SPAN_PX)
  })

  it('converts content x to view x with scrollLeft, and flags visibility', () => {
    const layout = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, scrollLeft: 5, scrollTop: 0, tzOffsetMinutes: 0 })
    expect(layout.scrollLeft).toBe(5)
    expect(layout.spans[0]?.x).toBe(10)
    expect(layout.spans[0]?.viewX).toBe(5)
    const scrolledAway = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, scrollLeft: 95, tzOffsetMinutes: 0 })
    expect(scrolledAway.spans[0]?.viewX).toBe(-85)
  })

  it('culls off-screen rects only when asked', () => {
    const offscreen: TimelineResponse = {
      ...data,
      lanes: [{ ...data.lanes[0]!, spans: [{ kind: 'step', start: 2_000, end: 3_000 }] }],
    }
    const kept = layoutTimeline(offscreen, VIEWPORT, { now: 11_000, msPerPx: 100, scrollLeft: 500, tzOffsetMinutes: 0 })
    expect(kept.spans).toHaveLength(1)
    expect(kept.spans[0]?.visible).toBe(false)
    const culled = layoutTimeline(offscreen, VIEWPORT, { now: 11_000, msPerPx: 100, scrollLeft: 500, cull: true, tzOffsetMinutes: 0 })
    expect(culled.spans).toEqual([])
    // Lanes are never culled: the row itself still has to render its head.
    expect(culled.lanes).toHaveLength(1)
  })

  it('pins the NOW marker to the window and clamps it into the canvas', () => {
    const layout = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.now).toBe(11_000)
    expect(layout.nowX).toBe(100)
    expect(layout.nowViewX).toBe(100)
    expect(layout.nowVisible).toBe(true)
    const past = layoutTimeline({ ...data, range: { start: 1_000, end: 5_000 } }, VIEWPORT, { now: 99_999, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(past.nowX).toBe(past.dataWidth)
    expect(past.nowVisible).toBe(true)
    // In a narrow pane the clamped NOW marker sits outside the visible band.
    const narrow = layoutTimeline({ ...data, range: { start: 1_000, end: 5_000 } }, { ...VIEWPORT, width: 10 }, { now: 99_999, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(narrow.nowViewX).toBeGreaterThan(10)
    expect(narrow.nowVisible).toBe(false)
  })
})

describe('layoutTimeline — task cards', () => {
  const data = liveResponse()
  const task = (overrides: Partial<TimelineResponse['tasks'][number]> = {}): TimelineResponse['tasks'][number] => ({
    id: 'task-1',
    revision: 1,
    subject: 'subject',
    description: 'description',
    status: 'pending',
    blockedBy: [],
    writeScopes: [],
    ready: true,
    writeScopeWarnings: [],
    laneId: 'lead',
    history: [{ time: 2_000, action: 'created', revision: 1, sessionId: 'session-1' }],
    ...overrides,
  })

  it('anchors a card on its first history event and spans to the last', () => {
    const withHistory = withTasks(data, [task({ history: [{ time: 2_000, action: 'created', sessionId: 's' }, { time: 3_500, action: 'claimed', sessionId: 's' }] })])
    const layout = layoutTimeline(withHistory, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const card = layout.tasks[0]
    expect(card).toMatchObject({ anchor: 'history', historyIndex: 0, at: 2_000, durationMs: 1_500, live: false })
    expect(card?.x).toBe(10)
    // (3500-2000)/100 = 15px, floored to the readable width.
    expect(card?.w).toBe(TASK_MIN_WIDTH)
    expect(card?.y).toBe(DEFAULT_HEADER_HEIGHT + TASK_CARD_TOP)
    expect(card?.h).toBe(TASK_CARD_HEIGHT)
  })

  it('caps a very long-lived card at the maximum width', () => {
    // The zoom is floored at MIN_MS_PER_PX, so the span must be wide enough in
    // milliseconds to reach the cap: (199000-1000)/50 = 3960px → 260px.
    const long = withTasks(data, [task({ history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 199_000, action: 'completed', sessionId: 's' }] })])
    const layout = layoutTimeline(long, VIEWPORT, { now: 200_000, msPerPx: MIN_MS_PER_PX, tzOffsetMinutes: 0 })
    expect(layout.msPerPx).toBe(MIN_MS_PER_PX)
    expect(layout.tasks[0]?.w).toBe(TASK_MAX_WIDTH)
  })

  it('anchors a card with no dated history at NOW and flags it live', () => {
    const live = withTasks(data, [task({ history: [] })])
    const layout = layoutTimeline(live, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const card = layout.tasks[0]
    expect(card).toMatchObject({ anchor: 'live', historyIndex: -1, live: true, at: 11_000, durationMs: 0, w: TASK_MIN_WIDTH })
    // Right-aligned to NOW, but never pushed off the left edge of the canvas.
    expect(card?.x).toBe(Math.max(0, layout.dataWidth - TASK_MIN_WIDTH))
    expect(card?.x).toBe(0)
  })

  it('never draws a history card past the canvas, and keeps a floored card reachable', () => {
    // The window is the UNION of every datum, so a history card can never be
    // cut off on the right: the datum that would cut it off pulls the window out
    // instead. (An earlier revision exposed a `clippedRight` flag defined as
    // `to > window.end`; it was unreachable and ui removed it — this asserts the
    // observable geometry that replaced it.)
    const beyond = withTasks(data, [task({ history: [{ time: 2_000, action: 'created', sessionId: 's' }, { time: 50_000, action: 'claimed', sessionId: 's' }] })])
    const layout = layoutTimeline(beyond, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const card = layout.tasks[0]
    expect(card?.durationMs).toBe(48_000)
    expect(layout.window.end).toBe(50_000)
    expect((card?.x ?? 0) + (card?.w ?? 0)).toBeLessThanOrEqual(layout.dataWidth)
    // A min-width card on a canvas narrower than the card overflows the canvas —
    // the scroll container's overflow region is what keeps it reachable.
    const narrowCanvas = layoutTimeline(withTasks(data, [task({ history: [] })]), { ...VIEWPORT, width: 1 }, { now: 11_000, msPerPx: 10_000, tzOffsetMinutes: 0 })
    const floored = narrowCanvas.tasks[0]
    expect(floored).toBeDefined()
    expect((floored?.x ?? 0) + (floored?.w ?? 0)).toBeGreaterThan(narrowCanvas.dataWidth)
  })

  it('places a top-level task the lanes did not carry, through its laneId', () => {
    const orphan = { ...data, lanes: [{ ...data.lanes[0]!, tasks: [] }], tasks: [task()] }
    const layout = layoutTimeline(orphan, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.tasks).toHaveLength(1)
    expect(layout.tasks[0]?.laneId).toBe('lead')
    expect(layout.unplacedTaskIds).toEqual([])
  })

  it('reports a task whose laneId names no lane instead of drawing it nowhere', () => {
    const stray = { ...data, lanes: [{ ...data.lanes[0]!, tasks: [] }], tasks: [task({ laneId: 'ghost' })] }
    const layout = layoutTimeline(stray, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.tasks).toEqual([])
    expect(layout.unplacedTaskIds).toEqual(['task-1'])
  })

  it('never draws the same task twice', () => {
    const once = withTasks(data, [task()])
    const layout = layoutTimeline(once, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.tasks).toHaveLength(1)
  })
})

describe('layoutTimeline — sanitization and totality', () => {
  const data = liveResponse()

  it('falls back for every non-finite numeric input', () => {
    const layout = layoutTimeline(
      data,
      { width: Number.NaN, height: Number.NaN, laneHeight: 0, headerHeight: -1 },
      { now: Number.NaN, msPerPx: Number.NaN, scrollLeft: -10, scrollTop: Number.NaN, tickCount: Number.NaN },
    )
    expect(layout.msPerPx).toBe(DEFAULT_MS_PER_PX)
    expect(layout.viewportWidth).toBe(1)
    expect(layout.scrollLeft).toBe(0)
    expect(layout.scrollTop).toBe(0)
    expect(layout.lanes[0]?.height).toBe(DEFAULT_LANE_HEIGHT)
    expect(layout.lanes[0]?.y).toBe(DEFAULT_HEADER_HEIGHT)
    expect(Number.isFinite(layout.window.start)).toBe(true)
    expect(Number.isFinite(layout.window.end)).toBe(true)
  })

  it('returns an empty layout (with ticks) for an empty payload', () => {
    const empty = { ...data, lanes: [], tasks: [] }
    const layout = layoutTimeline(empty, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.lanes).toEqual([])
    expect(layout.spans).toEqual([])
    expect(layout.tasks).toEqual([])
    expect(layout.ticks.length).toBeGreaterThan(0)
    expect(layout.unplacedTaskIds).toEqual([])
  })

  it('never throws on a defensively-shaped payload', () => {
    const broken = {
      ...data,
      lanes: [{ ...data.lanes[0]!, spans: null as never, tasks: null as never }],
      tasks: null as never,
    }
    expect(() => layoutTimeline(broken, VIEWPORT, { now: 11_000 })).not.toThrow()
    const layout = layoutTimeline(broken, VIEWPORT, { now: 11_000 })
    expect(layout.spans).toEqual([])
    expect(layout.tasks).toEqual([])
  })

  it('exposes a finite, in-range timezone offset by default', () => {
    const layout = layoutTimeline(data, VIEWPORT, { now: 11_000 })
    expect(Number.isInteger(layout.tzOffsetMinutes)).toBe(true)
    expect(Math.abs(layout.tzOffsetMinutes)).toBeLessThanOrEqual(24 * 60)
  })

  it('is deterministic: the same input yields a deep-equal layout', () => {
    const options = { now: 11_000, msPerPx: 100, scrollLeft: 3, scrollTop: 7, tickCount: 5, tzOffsetMinutes: 60 }
    expect(layoutTimeline(data, VIEWPORT, options)).toEqual(layoutTimeline(data, VIEWPORT, options))
  })

  it('keeps LANE_HEAD_WIDTH and the lane geometry constants consistent', () => {
    // The lane head is a fixed column; the timeline area is the rest. A layout
    // that assumed a different head width would mis-measure the viewport.
    expect(LANE_HEAD_WIDTH).toBeGreaterThan(0)
    expect(DEFAULT_HEADER_HEIGHT).toBeGreaterThan(0)
    expect(TASK_CARD_TOP).toBe(LANE_PAD_Y + TURN_BAND_HEIGHT + 4)
    expect(TASK_CARD_TOP + TASK_CARD_HEIGHT).toBeLessThanOrEqual(DEFAULT_LANE_HEIGHT)
    expect(MIN_MS_PER_PX).toBeLessThan(MAX_MS_PER_PX)
    expect(HOUR_MS).toBe(3_600_000)
    expect(DAY_MS).toBe(86_400_000)
  })
})
