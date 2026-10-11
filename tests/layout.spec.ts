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
import type { MessageSpan, TimelineResponse } from '../src/shared/contract.ts'
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
  TASK_BAR_MIN_WIDTH,
  TASK_CHIP_GAP,
  TASK_CHIP_WIDTH,
  TASK_CHIP_INSIDE_MIN_WIDTH,
  TURN_BAND_HEIGHT,
  buildTicks,
  clamp,
  clampMsPerPx,
  computeWindow,
  fitMsPerPx,
  formatClock,
  formatDateTime,
  LANE_BOTTOM_PAD,
  MESSAGE_MARKER_MIN_GAP_PX,
  resolveMessageDirection,
  TASK_TRACK_HEIGHT,
  decimateMarkers,
  laneTracks,
  type LaneTrack,
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
    // Frozen pair: `end: null` ⇒ `live: true` (see timeline-assert).
    range: { start: 1_000, end: null },
    live: true,
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
        messages: [],
        color: { bar: '--dsw-alias-brand-primary', on: '--dsw-alias-label-primary-inverted' },
        navigation: { type: 'session', value: 'session-1' },
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
    const data = { ...liveResponse(), range: { start: 1_000, end: 5_000 }, live: false }
    expect(computeWindow(data, 99_999)).toMatchObject({ start: 1_000, end: 5_000, live: false })
    const later = { ...data, lanes: [{ ...data.lanes[0]!, spans: [{ kind: 'step' as const, start: 2_000, end: 9_000 }] }] }
    expect(computeWindow(later, 99_999).end).toBe(9_000)
  })

  it('never returns a non-positive duration', () => {
    const data = { ...liveResponse(), range: { start: 5_000, end: 5_000 }, live: false, lanes: [], tasks: [] }
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
    const past = layoutTimeline({ ...data, range: { start: 1_000, end: 5_000 }, live: false }, VIEWPORT, { now: 99_999, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(past.nowX).toBe(past.dataWidth)
    expect(past.nowVisible).toBe(true)
    // In a narrow pane the clamped NOW marker sits outside the visible band.
    const narrow = layoutTimeline({ ...data, range: { start: 1_000, end: 5_000 }, live: false }, { ...VIEWPORT, width: 10 }, { now: 99_999, msPerPx: 100, tzOffsetMinutes: 0 })
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
    expect(card?.x).toBe((2_000 - layout.window.start) / 100)
    // LENGTH IS DURATION (the user's fix): (3500-2000)/100 = 15px, and only the
    // 2px floor may intervene — never a label-derived width.
    expect(card?.w).toBeCloseTo((3_500 - 2_000) / 100, 5)
    expect(card?.w).toBeGreaterThan(TASK_BAR_MIN_WIDTH)
    expect(card?.durationMs).toBe(1_500)
    // The label chip is a separate rect: the bar itself is only 15px, so the
    // chip hangs to its right rather than stretching the bar.
    expect(card?.labelPlacement).toBe('right')
    expect(card?.labelW).toBe(TASK_CHIP_WIDTH)
    expect(card?.labelX).toBeCloseTo((card?.x ?? 0) + (card?.w ?? 0) + TASK_CHIP_GAP, 5)
    expect(card?.y).toBe(DEFAULT_HEADER_HEIGHT + TASK_CARD_TOP)
    expect(card?.h).toBe(TASK_CARD_HEIGHT)
  })

  it('has NO label-derived cap: a long task is drawn as long as it lasted', () => {
    // This replaces `caps a very long-lived card at the maximum width` — that
    // assertion pinned the very behaviour the user reported as wrong ("every
    // task is the same length"). 148/260 were TEXT widths; a bar clamped into
    // them erases duration.
    const long = withTasks(data, [task({ history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 199_000, action: 'completed', sessionId: 's' }] })])
    const layout = layoutTimeline(long, VIEWPORT, { now: 200_000, msPerPx: MIN_MS_PER_PX, tzOffsetMinutes: 0 })
    expect(layout.msPerPx).toBe(MIN_MS_PER_PX)
    // (199000-1000)/50 = 3960px — far beyond any chip width, and that is correct.
    expect(layout.tasks[0]?.w).toBeCloseTo(198_000 / MIN_MS_PER_PX, 5)
    expect(layout.tasks[0]?.w).toBeGreaterThan(TASK_CHIP_WIDTH)
  })

  it('doubling the duration doubles the bar (no clamping band)', () => {
    const msPerPx = 1_000
    const build = (start: number, end: number): number => {
      const one = withTasks(data, [task({ history: [{ time: start, action: 'created', sessionId: 's' }, { time: end, action: 'completed', sessionId: 's' }] })])
      const layout = layoutTimeline(one, { ...VIEWPORT, width: 600 }, { now: start + 100_000, msPerPx, tzOffsetMinutes: 0 })
      return layout.tasks[0]?.w ?? 0
    }
    const short = build(1_000, 31_000) // 30s
    const long = build(1_000, 301_000) // 300s
    expect(short).toBeCloseTo(30, 5)
    expect(long).toBeCloseTo(300, 5)
    expect(long / short).toBeCloseTo(10, 5)
  })

  it('the floor only applies below it (a 1ms task is a 2px marker, not a 2px rule)', () => {
    const tiny = withTasks(data, [task({ history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 1_001, action: 'completed', sessionId: 's' }] })])
    const layout = layoutTimeline(tiny, VIEWPORT, { now: 11_000, msPerPx: 1_000, tzOffsetMinutes: 0 })
    expect(layout.tasks[0]?.w).toBe(TASK_BAR_MIN_WIDTH)
    expect(layout.tasks[0]?.durationMs).toBe(1)
  })

  it('never lets the subject length move the bar (label/bar decoupling)', () => {
    // The root-cause lock: the previous geometry put TEXT width into the bar
    // width, so a longer subject changed the bar. 1 char vs 4000 chars must be
    // pixel-identical for x/w (the chip carries the text).
    const msPerPx = 1_000
    const build = (subject: string): { x: number; w: number } => {
      const one = withTasks(data, [task({ subject, history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 121_000, action: 'completed', sessionId: 's' }] })])
      const layout = layoutTimeline(one, { ...VIEWPORT, width: 600 }, { now: 200_000, msPerPx, tzOffsetMinutes: 0 })
      return { x: layout.tasks[0]?.x ?? -1, w: layout.tasks[0]?.w ?? -1 }
    }
    const oneChar = build('a')
    const huge = build('x'.repeat(4_000))
    expect(oneChar).toEqual(huge)
    expect(oneChar.w).toBeCloseTo(120, 5)
    // A 4000-char subject is truncated by CSS, so `inside` must consider ONLY
    // the bar width — never the text. 120px < TASK_CHIP_INSIDE_MIN_WIDTH(148).
    const withHugeSubject = withTasks(data, [
      task({ subject: 'x'.repeat(4_000), history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 121_000, action: 'completed', sessionId: 's' }] }),
    ])
    const placement = layoutTimeline(withHugeSubject, { ...VIEWPORT, width: 600 }, { now: 200_000, msPerPx, tzOffsetMinutes: 0 }).tasks[0]?.labelPlacement
    expect(placement).toBe('right')
  })

  it('anchors a card with no dated history at NOW and flags it live', () => {
    const live = withTasks(data, [task({ history: [] })])
    const layout = layoutTimeline(live, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const card = layout.tasks[0]
    expect(card).toMatchObject({ anchor: 'live', historyIndex: -1, live: true, at: 11_000, durationMs: 0, w: TASK_BAR_MIN_WIDTH })
    // An unknown duration must be a POINT, not a bar: 2px.
    expect(card?.w).toBe(TASK_BAR_MIN_WIDTH)
    expect(card?.durationMs).toBe(0)
    expect(card?.labelPlacement).toBe('right')
    // Right-aligned to NOW, but never pushed off the left edge of the canvas.
    expect(card?.x).toBe(Math.max(0, layout.dataWidth - TASK_CHIP_WIDTH))
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

  it('stacks the three tracks without overlap (the user-visible fix, no magic numbers)', () => {
    // The user asked for lanes tall enough that activity, messages and tasks are
    // visibly separate. The TESTABLE form of that is disjointness — NOT
    // `laneHeight === 84`. A magic number would fail the next time ui-2 retunes
    // the height on correct code, and would say nothing about the actual claim.
    const tracks = laneTracks(0, DEFAULT_LANE_HEIGHT)
    expect(tracks.map((track) => track.id)).toEqual(['activity', 'message', 'task'])
    for (const track of tracks) expect(track.h, track.id).toBeGreaterThan(0)
    for (let index = 1; index < tracks.length; index += 1) {
      const previous = tracks[index - 1] as LaneTrack
      const current = tracks[index] as LaneTrack
      expect(current.y, `${current.id} must start at or below the end of ${previous.id}`).toBeGreaterThanOrEqual(previous.y + previous.h)
    }
    // The default lane must FIT all three plus the bottom pad, or the last track
    // is clipped and the tracks stop being visually separate.
    const last = tracks[2] as LaneTrack
    expect(last.y + last.h + LANE_BOTTOM_PAD).toBeLessThanOrEqual(DEFAULT_LANE_HEIGHT)
    // Track heights are FIXED (the user chose fixed taller lanes, not
    // content-adaptive): another lane is offset by exactly one lane height and
    // keeps the same internal layout, and a different laneHeight does not resize
    // the tracks.
    expect(laneTracks(1, DEFAULT_LANE_HEIGHT).map((track) => track.y - DEFAULT_LANE_HEIGHT)).toEqual(tracks.map((track) => track.y))
    expect(laneTracks(0, 100).map((track) => track.h)).toEqual(tracks.map((track) => track.h))
    // TASK_CARD_TOP must be the task track's own top, i.e. one derivation, not two.
    expect(TASK_CARD_TOP).toBe(last.y)
    expect(TASK_CARD_HEIGHT).toBeLessThanOrEqual(TASK_TRACK_HEIGHT)
    // Untouched invariants from before.
    expect(LANE_HEAD_WIDTH).toBeGreaterThan(0)
    expect(DEFAULT_HEADER_HEIGHT).toBeGreaterThan(0)
    expect(MIN_MS_PER_PX).toBeLessThan(MAX_MS_PER_PX)
    expect(HOUR_MS).toBe(3_600_000)
    expect(DAY_MS).toBe(86_400_000)
  })
})

/* ------------------------------------------------------------------------- */
/* Contract v2: the frozen right edge and the message layer (task-8)          */
/* ------------------------------------------------------------------------- */

/**
 * Proposed by ui-2 as the highest-value part of the layout coverage gap. The
 * theme here is "the client clock must not be able to change the geometry":
 * once the team stops, `range.end` is a timestamp and every x/width in the
 * layout has to be independent of `now`.
 */
describe('frozen window semantics (live ⇔ range.end)', () => {
  /** A closed window: the team has stopped, so the right edge is a timestamp. */
  function frozen(): TimelineResponse {
    return { ...liveResponse(), range: { start: 1_000, end: 5_000 }, live: false }
  }

  it('ignores the client clock entirely when the window is frozen', () => {
    const early = layoutTimeline(frozen(), VIEWPORT, { now: 30_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const late = layoutTimeline(frozen(), VIEWPORT, { now: 999_999_999, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(early.window.end).toBe(5_000)
    expect(late.window.end).toBe(5_000)
    expect(late.dataWidth).toBe(early.dataWidth)
    expect(late.spans.map((span) => span.x)).toEqual(early.spans.map((span) => span.x))
    expect(early.endMarker).toMatchObject({ kind: 'ended', time: 5_000 })
    expect(early.endSource).toBe('range')
    expect(late.endSource).toBe('range')
  })

  it('never stretches a closed span to now', () => {
    const data = {
      ...frozen(),
      lanes: [{ ...frozen().lanes[0]!, spans: [{ kind: 'step' as const, start: 1_000, end: 3_000 }] }],
    }
    const layout = layoutTimeline(data, VIEWPORT, { now: 999_999_999, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.spans[0]?.end).toBe(3_000)
  })

  it('pins a live window to now and marks the edge as NOW', () => {
    const layout = layoutTimeline(liveResponse(), VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.window.live).toBe(true)
    expect(layout.window.end).toBe(11_000)
    expect(layout.endMarker).toMatchObject({ kind: 'now', time: 11_000 })
    expect(layout.endSource).toBe('now')
  })

  it('falls back to the last datum when a frozen payload still has end:null', () => {
    // Should not happen under the frozen contract, but the renderer must not
    // hang the right edge off the client clock if it does.
    const degenerate = { ...liveResponse(), live: false }
    const early = layoutTimeline(degenerate, VIEWPORT, { now: 500_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const late = layoutTimeline(degenerate, VIEWPORT, { now: 5_000_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(early.endSource).toBe('datum')
    expect(late.window.end).toBe(early.window.end)
  })

  it('treats a legacy payload with no `live` field as live', () => {
    // Backward compatibility: the field arrived with contract v2, and an old
    // cached payload must not freeze the chart.
    const legacy = { ...liveResponse() } as Record<string, unknown>
    delete legacy.live
    const layout = layoutTimeline(legacy as unknown as TimelineResponse, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.window.live).toBe(true)
    expect(layout.endSource).toBe('now')
  })
})

describe('message markers and density bands', () => {
  /** 51 messages inside a 10px-wide window: decimation must engage. */
  function crowded(count = 51): TimelineResponse {
    const messages: MessageSpan[] = Array.from({ length: count }, (_, index) => ({
      kind: 'message',
      time: 1_000 + index * 20,
      end: null,
      from: { kind: 'lead', id: 'lead', name: 'lead' },
      to: { kind: 'teammate', id: 'member-1', name: 'member-1' },
      preview: `message ${index}`,
      sessionId: 'session-1',
    }))
    const base = liveResponse()
    return {
      ...base,
      lanes: [{ ...base.lanes[0]!, messages, spans: [] }],
      range: { start: 1_000, end: null },
      live: true,
    }
  }

  it('omits markers without ever moving one to a different time', () => {
    const data = crowded()
    const raw = (data.lanes[0]?.messages ?? []).map((message) => message.time)
    const layout = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.messages.length).toBeGreaterThan(0)
    expect(layout.messages.length).toBeLessThan(raw.length)
    // THE lock: every rendered marker carries a time that some real message had.
    for (const marker of layout.messages) expect(raw, `marker time ${marker.time}`).toContain(marker.time)
    expect(layout.droppedMessageCount).toBe(raw.length - layout.messages.length)
    expect(layout.messageCount).toBe(raw.length)
  })

  it('keeps the density band at the TRUE first→last extent (decimation cannot shrink it)', () => {
    const layout = layoutTimeline(crowded(), VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.messageBands).toHaveLength(1)
    expect(layout.messageBands[0]).toMatchObject({ count: 51, firstTime: 1_000, lastTime: 2_000 })
  })

  it('separates kept markers by the documented minimum gap', () => {
    const layout = layoutTimeline(crowded(), VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const xs = layout.messages.map((marker) => marker.x)
    for (let index = 1; index < xs.length; index += 1) {
      expect((xs[index] as number) - (xs[index - 1] as number)).toBeGreaterThanOrEqual(MESSAGE_MARKER_MIN_GAP_PX)
    }
    // OBSERVATION (not asserted as a failure): MESSAGE_MARKER_WIDTH is 11 while
    // the gap floor is 9, so two kept markers can still overlap by 2px. The
    // decimation contract is about the gap; if the intent was "never touch",
    // the gap floor should be >= the marker width (ui-2's call, reported).
  })

  it('the pure decimator is deterministic and honours maxPerLane', () => {
    const list: MessageSpan[] = Array.from({ length: 12 }, (_, index) => ({
      kind: 'message',
      time: 1_000 + index * 1_000,
      end: null,
      from: { kind: 'lead', id: 'lead', name: 'lead' },
      sessionId: 'session-1',
    }))
    const input = { windowStart: 1_000, msPerPx: 10, widthPx: 600, mode: 'markers' as const, gapPx: 9, maxPerLane: 3 }
    const first = decimateMarkers(list, input)
    const second = decimateMarkers(list, input)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
    expect(first.indices).toHaveLength(3)
    expect(first.candidates).toBe(12)
    expect(first.droppedTotal).toBe(9)
  })

  it('de-duplicates a turn from the message candidates in both-mode', () => {
    const turn: MessageSpan = {
      kind: 'turn',
      time: 1_500,
      end: 1_600,
      from: { kind: 'lead', id: 'lead', name: 'lead' },
      sessionId: 'session-1',
    }
    const message: MessageSpan = {
      kind: 'message',
      time: 1_400,
      end: null,
      from: { kind: 'lead', id: 'lead', name: 'lead' },
      sessionId: 'session-1',
    }
    const base = { windowStart: 1_000, msPerPx: 10, widthPx: 600, gapPx: 9, maxPerLane: 40 }
    const both = decimateMarkers([message, turn], { ...base, mode: 'both' })
    const markers = decimateMarkers([message, turn], { ...base, mode: 'markers' })
    // In 'both' mode the turn is de-duplicated because its turn BAND already
    // carries it; in 'markers' mode it is a candidate like any other. (This is
    // ui-2's stated intent — "both 时 turn 被去重、candidates 少 1" — and the
    // implementation does exactly that; my first assertion had the direction
    // inverted and this test caught it.)
    expect(markers.candidates).toBe(both.candidates + 1)
    expect(markers.indices).toHaveLength(both.indices.length + 1)
    expect(both.candidates).toBe(1) // only the message
    expect(markers.candidates).toBe(2) // the message and the turn
  })

  it('draws a message with no addressee instead of inventing one', () => {
    // Contract v2: an unmatched queued message keeps `to` undefined.
    const data = crowded(1)
    const lone: MessageSpan = { ...(data.lanes[0]?.messages?.[0] as MessageSpan) }
    delete lone.to
    const layout = layoutTimeline(
      { ...data, lanes: [{ ...data.lanes[0]!, messages: [lone] }] },
      VIEWPORT,
      { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 },
    )
    expect(layout.messages).toHaveLength(1)
    expect(layout.messages[0]?.to).toBeUndefined()
    expect(layout.messages[0]?.time).toBe(1_000)
  })

  it('survives malformed messages and keeps a positive window', () => {
    const hostile = {
      ...crowded(1),
      lanes: [{ ...crowded(1).lanes[0]!, messages: [null, { kind: 'message' }, { kind: 'message', time: Number.NaN }] as unknown as MessageSpan[] }],
    }
    expect(() => layoutTimeline(hostile, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })).not.toThrow()
    const layout = layoutTimeline(hostile, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(layout.messages.length).toBeLessThanOrEqual(1)
    expect(layout.window.end).toBeGreaterThanOrEqual(layout.window.start + 1)
  })
})

/* ------------------------------------------------------------------------- */
/* Decimation must never erase a whole direction (live bug found by ui-2)      */
/* ------------------------------------------------------------------------- */

/**
 * The live instance showed `dtg-msg-out = 0` with `incoming = 8` while the host
 * data was correct. The cause was NOT the direction logic: `decimateMarkers`
 * shared ONE pixel spacing cursor and ONE bucket set across directions, so on a
 * real lane — where a reply lands a few pixels after the message it answers —
 * every outgoing marker fell inside the minimum gap of a kept incoming one and
 * was dropped. Direction counts vanished while times and totals stayed plausible.
 *
 * My own guards could not see it for the same reason as the earlier fixture gaps:
 * my message fixture spaced the two directions far apart in time. These tests
 * deliberately interleave them INSIDE the minimum gap.
 */
describe('decimation keeps every direction that has data', () => {
  const LANE = 'lead'
  const laneIdOf = (id: string): string | null => (id === 'session-a' ? 'lead' : id === 'session-b' ? 'lane-b' : id)

  const span = (time: number, from: string, to: string, index: number): MessageSpan => ({
    kind: 'message',
    time,
    end: null,
    from: { kind: 'teammate', id: from, name: from },
    to: { kind: 'teammate', id: to, name: to },
    messageId: `m-${index}`,
    sessionId: from,
  })
  /** Outgoing in the lead lane (lead is the sender). */
  const outgoing = (time: number, index: number): MessageSpan => span(time, 'session-a', 'session-b', index)
  /** Incoming in the lead lane (lead is the addressee). */
  const incoming = (time: number, index: number): MessageSpan => span(time, 'session-b', 'session-a', index)

  const decimate = (list: MessageSpan[], overrides: Record<string, unknown> = {}) =>
    decimateMarkers(list, {
      windowStart: 1_000,
      msPerPx: 1, // 1 px == 1 ms, so the 4 ms spacing below is a 4 px spacing
      widthPx: 600,
      mode: 'markers',
      gapPx: MESSAGE_MARKER_MIN_GAP_PX,
      maxPerLane: 40,
      laneId: LANE,
      laneIdOf,
      ...overrides,
    })

  const directionsOf = (list: MessageSpan[], indices: number[]): string[] =>
    indices.map((index) => resolveMessageDirection(list[index] as MessageSpan, LANE, laneIdOf).direction)

  it('keeps BOTH directions when the whole cluster fits inside the minimum gap', () => {
    // SHAPE MATTERS, and this shape is the discriminating one. Verified against a
    // reconstruction of the old algorithm (one shared cursor, 9 px):
    //   - this cluster (six markers inside 6 px) → old kept 1 marker, direction
    //     `incoming` only, outgoing = 0  ⇒ this test fails on the old code;
    //   - a 4 px-spread alternation → old kept 2 (one per direction) ⇒ it would
    //     have PASSED, i.e. a fixture that looks equivalent but proves nothing.
    // That is the same escape path as the id-space and channel fixtures: the shape
    // of the data, not the assertion, decides whether the bug is reachable.
    const list = [
      incoming(1_000, 0),
      outgoing(1_002, 1),
      outgoing(1_003, 2),
      incoming(1_004, 3),
      outgoing(1_005, 4),
      incoming(1_006, 5),
    ]
    const { indices } = decimate(list)
    const directions = directionsOf(list, indices)
    expect(directions.filter((direction) => direction === 'outgoing').length, `kept: ${directions.join(',')}`).toBeGreaterThan(0)
    expect(directions.filter((direction) => direction === 'incoming').length, `kept: ${directions.join(',')}`).toBeGreaterThan(0)
  })

  it('backfills a direction that would otherwise vanish, keeping its EXACT time', () => {
    // One kept incoming, then a lone outgoing 3 px later: without a backfill the
    // outgoing is the only member of its direction and gets dropped by the gap.
    const list = [incoming(1_000, 0), outgoing(1_003, 1)]
    const { indices } = decimate(list)
    const kept = indices.map((index) => list[index] as MessageSpan)
    const outgoingKept = kept.filter((message) => resolveMessageDirection(message, LANE, laneIdOf).direction === 'outgoing')
    expect(outgoingKept).toHaveLength(1)
    // A backfilled marker must never be re-dated: the time is the journal's.
    expect(outgoingKept[0]?.time).toBe(1_003)
  })

  it('never resurrects a marker whose time is not finite', () => {
    // ui-2's backfill made this test red once ("phantom marker"): the fix excludes
    // non-finite times from the candidates AND from the backfill.
    const list = [incoming(1_000, 0), outgoing(Number.NaN, 1), outgoing(Number.POSITIVE_INFINITY, 2)]
    const { indices } = decimate(list)
    const kept = indices.map((index) => list[index] as MessageSpan)
    for (const message of kept) expect(Number.isFinite(message.time), JSON.stringify(message)).toBe(true)
    expect(directionsOf(list, indices).filter((direction) => direction === 'outgoing')).toHaveLength(0)
  })
})
