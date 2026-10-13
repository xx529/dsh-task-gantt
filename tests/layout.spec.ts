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
import type { MessageSpan, TimelineLane, TimelineResponse } from '../src/shared/contract.ts'
import {
  FOLLOW_GUTTER_RATIO,
  ACTIVITY_TRACK_TOP,
  DAY_MS,
  DEFAULT_HEADER_HEIGHT,
  dataExtent,
  effectiveWindowStart,
  DEFAULT_LANE_HEIGHT,
  DEFAULT_MS_PER_PX,
  HOUR_MS,
  LANE_HEAD_WIDTH,
  LANE_PAD_Y,
  MAX_MS_PER_PX,
  MAX_TICKS,
  MINUTE_MS,
  MIN_MS_PER_PX,
  MIN_ZOOM_MS_PER_PX,
  MIN_SPAN_PX,
  SECOND_MS,
  STEP_BAR_HEIGHT,
  TASK_CARD_HEIGHT,
  TASK_CARD_TOP,
  TASK_BAR_HEIGHT,
  TASK_BAR_MIN_WIDTH,
  TASK_MARKER_WIDTH,
  TASK_LABEL_ELLIPSIS_MIN_WIDTH,
  TASK_LABEL_MIN_WIDTH,
  TURN_BAND_HEIGHT,
  buildTicks,
  clamp,
  clampMsPerPx,
  clampZoomMsPerPx,
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
import { shouldFollowScroll } from '../src/client/ui/GanttChart.tsx'
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

  it('keeps the SANITY floor at 50ms, separate from the manual zoom floor', () => {
    // These are deliberately two different objects. `clampMsPerPx` is shared by the fit
    // path, `layoutTimeline`'s own sanitisation AND (before this change) the manual zoom,
    // so raising its floor would clamp 适应窗口 too. The user-facing limit lives in
    // `clampZoomMsPerPx`.
    expect(MIN_MS_PER_PX).toBe(50)
    expect(MIN_ZOOM_MS_PER_PX).toBe(1 * SECOND_MS)
    expect(MIN_ZOOM_MS_PER_PX).toBeGreaterThan(MIN_MS_PER_PX)
  })

  it('does NOT lift a fitted zoom up to the manual floor (the fit path stays free)', () => {
    // The manual floor is 1 s/px. A SHORT window fits finer than that — 1 minute on a
    // 248px canvas is 241.9 ms/px — and if the floor leaked into `fitMsPerPx` or into
    // `layoutTimeline`'s input sanitisation, that fit would be raised to 1000 ms/px and
    // the content would be 60s / 1s = 60px inside a 248px canvas: the chart stranded in
    // the left quarter. (At 5 s/px the same trap caught the 5-MINUTE range, which is how
    // it was found; the floor has since moved to 1 s, so the short window is the case
    // that still exercises it.)
    const ONE_MIN = MINUTE_MS
    const data = { ...liveResponse(), range: { start: 0, end: ONE_MIN }, lanes: [], tasks: [] }
    const fitted = fitMsPerPx(ONE_MIN, 248)
    expect(fitted).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    expect(fitted).toBeCloseTo(ONE_MIN / 248, 6)
    const layout = layoutTimeline(data, { ...VIEWPORT, width: 248 }, { now: ONE_MIN, msPerPx: fitted, tzOffsetMinutes: 0 })
    expect(layout.msPerPx).toBe(fitted)
    expect(layout.dataWidth).toBeCloseTo(248, 3)
    // …and a range whose fit is COARSER than the floor is untouched too (the 5m option):
    // the fit path must not be rescaled in either direction.
    const FIVE_MIN = 5 * MINUTE_MS
    const fiveMinData = { ...liveResponse(), range: { start: 0, end: FIVE_MIN }, lanes: [], tasks: [] }
    const fiveMinFit = fitMsPerPx(FIVE_MIN, 248)
    expect(fiveMinFit).toBeGreaterThan(MIN_ZOOM_MS_PER_PX)
    expect(fiveMinFit).toBeCloseTo(FIVE_MIN / 248, 6)
    const fiveMinLayout = layoutTimeline(fiveMinData, { ...VIEWPORT, width: 248 }, { now: FIVE_MIN, msPerPx: fiveMinFit, tzOffsetMinutes: 0 })
    expect(fiveMinLayout.msPerPx).toBe(fiveMinFit)
    expect(fiveMinLayout.dataWidth).toBeCloseTo(248, 3)
  })

  it('clamp() collapses an inverted range to lo', () => {
    expect(clamp(5, 10, 1)).toBe(10)
    expect(clamp(5, 1, 10)).toBe(5)
  })
})

/**
 * The user's rules, in order: "时间粒度，最少的只需要去到 5 秒就行", then — asked which of
 * the two granularities that meant — the MANUAL ZOOM floor, `只约束手动缩放` (constrain
 * the manual zoom only), so 适应窗口 stays free to fit a short range; and finally
 * "最小时间粒度改成 1s 吧", which moved the floor from 5 s to 1 s. The number has changed
 * twice; what these tests lock is the STRUCTURE that makes the number safe to change:
 * two separate floors, the fit path exempt, and no backwards jump from a sub-floor fit.
 */
describe('the manual zoom floor is 1 s/px', () => {
  it('stops a zoom-in request at the floor', () => {
    expect(clampZoomMsPerPx(1, 60_000)).toBe(MIN_ZOOM_MS_PER_PX)
    expect(clampZoomMsPerPx(500, 60_000)).toBe(MIN_ZOOM_MS_PER_PX)
    expect(clampZoomMsPerPx(MIN_ZOOM_MS_PER_PX, 60_000)).toBe(MIN_ZOOM_MS_PER_PX)
    // …and a request that is already coarser than the floor is untouched.
    expect(clampZoomMsPerPx(6_000, 60_000)).toBe(6_000)
  })

  it('lets a zoom-OUT through from the floor', () => {
    expect(clampZoomMsPerPx(MIN_ZOOM_MS_PER_PX * 1.5, MIN_ZOOM_MS_PER_PX)).toBe(1_500)
    expect(clampZoomMsPerPx(10_000_000, 60_000)).toBe(MAX_MS_PER_PX)
  })

  it('turns a zoom-in click from a fitted sub-floor zoom into a no-op, not a backwards jump', () => {
    // `fitMsPerPx` may be finer than the manual floor — 1 minute on a 248px canvas fits
    // at 241.9 ms/px, well under 1 s/px. A plain `clamp(requested, 1000, …)` would answer
    // that click with 1000: the reader asks to move CLOSER and the chart jumps 4x AWAY.
    // The floor is the finer of the two instead, and `applyZoom`'s
    // `next === effectiveMsPerPx` guard makes the equal case a no-op.
    const fitted = MINUTE_MS / 248
    expect(fitted).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    expect(clampZoomMsPerPx(fitted / 1.5, fitted)).toBe(fitted)
    // Zooming OUT from the same place is unaffected by the floor.
    expect(clampZoomMsPerPx(fitted * 1.5, fitted)).toBeCloseTo(fitted * 1.5, 6)
  })

  it('falls back to the current zoom for a non-finite or non-positive request', () => {
    expect(clampZoomMsPerPx(Number.NaN, 60_000)).toBe(60_000)
    expect(clampZoomMsPerPx(0, 60_000)).toBe(60_000)
    expect(clampZoomMsPerPx(-5, 60_000)).toBe(60_000)
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
    // SECONDS ARE A CALL-SITE DECISION, not a default: `formatClock` defaults to
    // seconds (the detail view needs them) while the AXIS asks for the coarse arm
    // explicitly. This regressed for one round — changing the default silently
    // leaked seconds onto every tick — so the boundary itself is pinned here and in
    // the `formatTickLabel` case below. This tick is t=5_000 at tzOffset 0 ⇒ 00:00.
    expect(ticks[0]).toMatchObject({ x: 40, viewX: 40, labelKind: 'time', label: '00:00', major: false })
    expect(truncated).toBe(false)
    // The whole ladder, not just the first tick: no axis label carries seconds.
    for (const tick of ticks) {
      if (tick.labelKind === 'time') expect(tick.label, JSON.stringify(tick)).not.toMatch(/\d{2}:\d{2}:\d{2}/)
    }
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
  it('formats a clock in the given zone, seconds by default', () => {
    expect(formatClock(0, 0)).toBe('00:00:00')
    expect(formatClock(0, 480)).toBe('08:00:00')
    expect(formatClock(0, -300)).toBe('19:00:00')
    // The coarse arm exists for NOW/ENDED markers, which must not flicker a second
    // digit; both arms are pinned WITH offsets so the zone maths is covered too.
    expect(formatClock(0, 0, { seconds: false })).toBe('00:00')
    expect(formatClock(0, 480, { seconds: false })).toBe('08:00')
  })

  it('formats date+time with seconds, but the AXIS without them', () => {
    // 01-01 00:00:00 —— the detail view carries seconds
    expect(formatDateTime(0, 0)).toBe('01-01 00:00:00')
    // The axis does not: a second digit on a coordinate read-out is noise.
    expect(formatTickLabel(0, 'time', 0)).toBe('00:00')
    expect(formatTickLabel(0, 'time', 480)).toBe('08:00')
    expect(formatTickLabel(0, 'date', 0)).toBe('01-01')
    // Explicit boundary: no axis label may ever carry seconds, while the default
    // arm must. A future change to either side shows up here.
    expect(formatTickLabel(61_000, 'time', 0)).toBe('00:01')
    expect(formatClock(61_000, 0)).toBe('00:01:01')
    expect(formatTickLabel(61_000, 'time', 0)).not.toMatch(/\d{2}:\d{2}:\d{2}/)
  })

  it('never throws on a non-finite time', () => {
    expect(formatClock(Number.NaN)).toBe('00:00:00')
    expect(formatDateTime(Number.POSITIVE_INFINITY)).toMatch(/^\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
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
    // The 8px step bar is centred inside the 10px turn band. The activity track is the
    // SECOND one now (the message row moved above it at the user's request), so the
    // band starts at ACTIVITY_TRACK_TOP rather than at LANE_PAD_Y.
    expect(turn?.y).toBe(DEFAULT_HEADER_HEIGHT + ACTIVITY_TRACK_TOP)
    expect(step?.y).toBe(DEFAULT_HEADER_HEIGHT + ACTIVITY_TRACK_TOP + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2)
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

describe('layoutTimeline — the label never overflows the canvas', () => {
  const data = liveResponse()
  const task = (over: Partial<TimelineResponse['tasks'][number]> = {}): TimelineResponse['tasks'][number] => ({
    id: 't', revision: 1, subject: 's', description: 'd', status: 'completed',
    blockedBy: [], writeScopes: [], ready: true, writeScopeWarnings: [], laneId: 'lead',
    history: [{ time: 2_000, action: 'created', sessionId: 's' }], ...over,
  })

  it('keeps every label rect inside [0, contentWidth]', () => {
    // Measured defect: the borderless caption was 148px wide starting just past the box,
    // so for a task at the right edge it reached 151px BEYOND the canvas. An absolutely
    // positioned descendant contributes to its scroll container's scrollable overflow,
    // so `scrollWidth` went 248 -> 399: a phantom horizontal scroll range, which also
    // defeated the follow toggle.
    for (const span of [1_000, 5_000, 40_000, 120_000]) {
      const layout = layoutTimeline(
        withTasks(data, [task({ history: [{ time: 19_000, action: 'created', sessionId: 's' }, { time: 19_000 + span, action: 'completed', sessionId: 's' }] })]),
        VIEWPORT,
        { now: 20_000, msPerPx: 100, tzOffsetMinutes: 0 },
      )
      const card = layout.tasks[0]
      if (card === undefined) continue
      expect(card.labelX, `span ${span}: label starts left of the canvas`).toBeGreaterThanOrEqual(0)
      expect(
        card.labelX + card.labelW,
        `span ${span}: label (x=${card.labelX} w=${card.labelW}) overflows contentWidth ${layout.contentWidth}`,
      ).toBeLessThanOrEqual(layout.contentWidth + 1e-6)
    }
  })

  it('keeps the label on the box even when the task ends at the canvas edge', () => {
    // This replaces `flips the label to the LEFT when the right side has no room`. That
    // flip existed only because the label could be placed OUTSIDE the box; the user
    // removed that ("只在条内画"), so a task at the right edge now simply keeps its label
    // inside its own box — which is the whole point: the label can no longer reach past
    // the canvas, and the measured 151px phantom-scroll defect cannot come back.
    const layout = layoutTimeline(
      withTasks(data, [task({ history: [{ time: 16_100, action: 'created', sessionId: 's' }, { time: 20_000, action: 'completed', sessionId: 's' }] })]),
      VIEWPORT,
      { now: 20_000, msPerPx: 100, tzOffsetMinutes: 0 },
    )
    const card = layout.tasks[0]
    // (20000-16100)/100 = 39px >= TASK_LABEL_MIN_WIDTH => the label is drawn inside.
    expect(card?.w).toBeCloseTo(39, 5)
    expect(card?.labelPlacement).toBe('inside')
    expect(card?.labelX).toBe(card?.x)
    expect(card?.labelW).toBe(card?.w)
    expect((card?.labelX ?? -1) + (card?.labelW ?? 0)).toBeLessThanOrEqual(layout.contentWidth + 1e-6)
  })

  it('draws the label INSIDE the box as soon as the box is wide enough', () => {
    // 1000ms at 100ms/px = a 10px box: under TASK_LABEL_MIN_WIDTH, so no label at all
    // (there is not even room for an ellipsis).
    const narrow = layoutTimeline(
      withTasks(data, [task({ history: [{ time: 2_000, action: 'created', sessionId: 's' }, { time: 3_000, action: 'completed', sessionId: 's' }] })]),
      VIEWPORT,
      { now: 20_000, msPerPx: 100, tzOffsetMinutes: 0 },
    )
    expect(narrow.tasks[0]?.labelPlacement).toBe('none')
    expect(narrow.tasks[0]?.labelX).toBe(narrow.tasks[0]?.x)
    expect(narrow.tasks[0]?.labelW).toBe(0)
    // A 4000ms task at the finest allowed zoom (MIN_MS_PER_PX = 50ms/px) is an 80px box,
    // and then the label IS drawn — inside it, with labelX/labelW equal to the box's own
    // geometry, so it can never claim a time the box does not cover. (A 1000ms task
    // could not be used here: reaching 36px would need 27ms/px, below the sanitiser's
    // own 50ms/px floor.)
    const wide = layoutTimeline(
      withTasks(data, [task({ history: [{ time: 2_000, action: 'created', sessionId: 's' }, { time: 6_000, action: 'completed', sessionId: 's' }] })]),
      VIEWPORT,
      { now: 20_000, msPerPx: MIN_MS_PER_PX, tzOffsetMinutes: 0 },
    )
    const card = wide.tasks[0]
    expect(card?.w).toBeCloseTo(80, 5)
    expect(card?.labelPlacement).toBe('inside')
    expect(card?.labelX).toBe(card?.x)
    expect(card?.labelW).toBe(card?.w)
  })
})

describe('layoutTimeline — the time-range filter', () => {
  const data = liveResponse()
  /** Same shape as the task-card factory; scoped here because that one is per-describe. */
  const task = (overrides: Partial<TimelineResponse['tasks'][number]> = {}): TimelineResponse['tasks'][number] => ({
    id: 'task-1',
    revision: 1,
    subject: 'subject',
    description: 'description',
    status: 'completed',
    blockedBy: [],
    writeScopes: [],
    ready: true,
    writeScopeWarnings: [],
    laneId: 'lead',
    history: [{ time: 2_000, action: 'created', revision: 1, sessionId: 'session-1' }],
    ...overrides,
  })

  it('narrows the window from the LEFT, keeping the right edge at NOW', () => {
    // "只看最近 N" moves the start, never the end. Keeping the end at `now` is what lets
    // the follow toggle keep working while a range is selected.
    const all = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const last5s = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 5_000 })
    expect(all.window.end).toBe(last5s.window.end)
    expect(last5s.window.start).toBe(all.window.end - 5_000)
    expect(last5s.window.durationMs).toBe(5_000)
    // ...and the whole x axis shrinks with it: 5s at 100ms/px is 50px, not 100.
    expect(last5s.dataWidth).toBeCloseTo(50, 5)
    expect(last5s.dataWidth).toBeLessThan(all.dataWidth)
  })

  it('never shows empty axis to the LEFT of the first datum', () => {
    // A range wider than the log is clamped to the log's own start, so "3 hours" on a
    // two-minute session shows those two minutes rather than an hour of nothing.
    const huge = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 3 * 60 * 60 * 1000 })
    const all = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    expect(huge.window.start).toBe(all.window.start)
    expect(huge.dataWidth).toBeCloseTo(all.dataWidth, 5)
  })

  it('a FROZEN board does not creep forward just because a range is selected', () => {
    // The filter may not become a back door for the clock. A frozen window still ends at
    // its last datum, whatever `now` says.
    const frozen = { ...data, live: false, range: { start: 1_000, end: 6_000 } }
    const a = layoutTimeline(frozen, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 2_000 })
    const b = layoutTimeline(frozen, VIEWPORT, { now: 999_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 2_000 })
    expect(a.window.end).toBe(6_000)
    expect(b.window.end).toBe(6_000)
    expect(a.window.start).toBe(b.window.start)
  })

  it('treats null / 0 / negative / NaN as "no filter" rather than as an empty window', () => {
    const all = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    for (const bad of [null, 0, -5_000, Number.NaN, Number.POSITIVE_INFINITY]) {
      const layout = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: bad })
      expect(layout.window.start, `windowSpanMs=${String(bad)}`).toBe(all.window.start)
    }
  })

  it('drops a task that ended BEFORE the window instead of stubbing it at the edge', () => {
    // Measured defect: with a 5-minute filter over a 30-minute log, a task that had ended
    // 14 minutes before the window opened was still drawn as a 10px box clinging to the
    // left edge — it said "something happened here" and nothing had. Clamping is what
    // produced the plausible-looking stub, so the range test has to be explicit.
    const early = withTasks(data, [
      task({ status: 'completed', history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 2_000, action: 'completed', sessionId: 's' }] }),
    ])
    const layout = layoutTimeline(early, VIEWPORT, { now: 20_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 5_000, cull: true })
    // The window is [15_000, 20_000]; the task lived at [1_000, 2_000].
    expect(layout.tasks).toHaveLength(0)
  })

  it('keeps a task that STARTED before the window and is still running inside it', () => {
    // The other half of the same rule: clipping is legitimate, vanishing is not. This
    // task must still be drawn, and must be flagged as continuing from before.
    const spanning = withTasks(data, [
      task({ status: 'completed', history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 18_000, action: 'completed', sessionId: 's' }] }),
    ])
    const layout = layoutTimeline(spanning, VIEWPORT, { now: 20_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 5_000, cull: true })
    const card = layout.tasks[0]
    expect(card, 'a task still running inside the window must survive the filter').toBeDefined()
    expect(card?.x).toBe(0)
    expect(card?.clippedLeft).toBe(true)
    // It ends 3s into the 5s window: 18_000 - 15_000 = 3_000ms at 100ms/px.
    expect(card?.w).toBeCloseTo(30, 5)
  })

  it('does not draw a span stub for a span that ended before the window', () => {
    // Same rule for the activity strips, which had the same 2px phantom. Checked with
    // `cull: false` so the rect is still IN the array and its `visible` flag can be read
    // directly — with `cull: true` it is dropped and the assertion would pass vacuously.
    const layout = layoutTimeline(data, VIEWPORT, { now: 20_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 5_000, cull: false })
    const closed = layout.spans.filter((span) => !span.open)
    // Non-vacuity: the fixture carries a closed span at [2_000, 3_000], which is entirely
    // before the [15_000, 20_000] window.
    expect(closed.length, 'the fixture must contain a closed span to test this').toBeGreaterThan(0)
    for (const span of closed) {
      expect(span.visible, `closed span ${span.start}..${String(span.end)} is outside the window but drawn`).toBe(false)
    }
    // An OPEN span reaches `now`, so it IS in the window and must survive: dropping it
    // would hide work that is still going on.
    const open = layout.spans.filter((span) => span.open)
    expect(open.length).toBeGreaterThan(0)
    for (const span of open) expect(span.visible, 'an open span runs to now and belongs in the window').toBe(true)
    // ...and with culling on, the out-of-range one is gone from the array entirely.
    const culled = layoutTimeline(data, VIEWPORT, { now: 20_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 5_000, cull: true })
    expect(culled.spans.every((span) => !span.open === false || span.start >= 15_000)).toBe(true)
    expect(culled.spans.some((span) => span.start === 2_000 && !span.open)).toBe(false)
  })

  it('occupies the same axis as the unfiltered view, just less of it', () => {
    // The point of filtering in the WINDOW rather than in the renderer: every downstream
    // position is already relative to `win.start`, so the two views cannot disagree
    // about what is in range. A datum at the very end sits at the same x in both.
    const filtered = layoutTimeline(data, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0, windowSpanMs: 5_000 })
    expect(filtered.nowX).toBeCloseTo(filtered.dataWidth, 5)
  })
})

describe('layoutTimeline — task cards', () => {
  const data = liveResponse()
  const task = (overrides: Partial<TimelineResponse['tasks'][number]> = {}): TimelineResponse['tasks'][number] => ({
    id: 'task-1',
    revision: 1,
    subject: 'subject',
    description: 'description',
    // `completed` by DEFAULT, deliberately. A card's span is only a MEASURED interval
    // when the task is terminal; an open task now stretches to `now` (see the
    // "unfinished" tests below), so a fixture that meant to pin the measured span would
    // otherwise be pinning the stretch instead. Tests that want the open behaviour say
    // so explicitly.
    status: 'completed',
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
    // A 15px box is well under TASK_LABEL_MIN_WIDTH, so this task draws NO label. The
    // label is never moved outside the box any more (the user: "只在条内画，装不下就较少
    // 显示的文本"), and 15px could not hold an ellipsis anyway.
    expect(card?.labelPlacement).toBe('none')
    expect(card?.labelW).toBe(0)
    expect(card?.labelX).toBe(card?.x)
    // The label can never claim a time the box does not cover. This is the old
    // phantom-scroll guard, now trivially true because no label ever leaves the box.
    expect((card?.labelX ?? 0) + (card?.labelW ?? 0)).toBeLessThanOrEqual((card?.x ?? 0) + (card?.w ?? 0) + 1e-6)
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
    expect(layout.tasks[0]?.w).toBeGreaterThan(TASK_LABEL_MIN_WIDTH)
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

  it('a 1ms task is a hairline, NOT a 2px rule (the length floor is gone)', () => {
    // This replaces `the floor only applies below it (a 1ms task is a 2px
    // marker, not a 2px rule)`, which pinned the width floor at 2px. The user
    // reported that floor as wrong: "视图粒度很大的时候…任务框的长度给了最少值，
    // 这样会有错觉" — at a coarse zoom a short task must be drawn as short as it
    // really was, not rounded up to a visible rule. The floor is now the single
    // device pixel `TASK_BAR_MIN_WIDTH`, whose ONLY job is to keep a
    // zero-width rect renderable.
    const tiny = withTasks(data, [task({ history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 1_001, action: 'completed', sessionId: 's' }] })])
    const layout = layoutTimeline(tiny, VIEWPORT, { now: 11_000, msPerPx: 1_000, tzOffsetMinutes: 0 })
    // 1ms at 1000ms/px = 0.001px, which is below the hairline: clamp to 1px.
    expect(TASK_BAR_MIN_WIDTH).toBe(1)
    expect(layout.tasks[0]?.w).toBe(TASK_BAR_MIN_WIDTH)
    expect(layout.tasks[0]?.durationMs).toBe(1)
    // ...and just above the hairline the width is the TRUE value, not a floor.
    const twoSec = withTasks(data, [task({ history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 3_000, action: 'completed', sessionId: 's' }] })])
    const wider = layoutTimeline(twoSec, VIEWPORT, { now: 11_000, msPerPx: 1_000, tzOffsetMinutes: 0 })
    expect(wider.tasks[0]?.w).toBeCloseTo(2, 9)
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
    // A 4000-char subject is truncated by CSS, so the placement must consider ONLY the
    // box width — never the text. 120px >= TASK_LABEL_MIN_WIDTH(36) => 'inside'.
    const withHugeSubject = withTasks(data, [
      task({ subject: 'x'.repeat(4_000), history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 121_000, action: 'completed', sessionId: 's' }] }),
    ])
    const placement = layoutTimeline(withHugeSubject, { ...VIEWPORT, width: 600 }, { now: 200_000, msPerPx, tzOffsetMinutes: 0 }).tasks[0]?.labelPlacement
    expect(placement).toBe('inside')
  })

  it('anchors a card with no dated history at NOW and flags it live', () => {
    const live = withTasks(data, [task({ history: [] })])
    const layout = layoutTimeline(live, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 })
    const card = layout.tasks[0]
    expect(card).toMatchObject({ anchor: 'live', historyIndex: -1, live: true, at: 11_000, durationMs: 0, w: TASK_MARKER_WIDTH })
    // A task with no history has NO duration, so its width is a fixed marker rather
    // than a rounded-up bar — there is nothing for the width to misrepresent.
    expect(card?.w).toBe(TASK_MARKER_WIDTH)
    // The DURATION floor is still a single device pixel: that is the rule a real
    // duration obeys (see the "1ms task is a hairline" test).
    expect(TASK_BAR_MIN_WIDTH).toBe(1)
    expect(card?.durationMs).toBe(0)
    // A live anchor is a 9px marker with no duration, so it never carries a label:
    // TASK_LABEL_MIN_WIDTH is 36 and this box is 9. (Before, the label flipped to the
    // LEFT of the marker to dodge the canvas edge — the geometry that produced the
    // measured 151px phantom-scroll defect.)
    expect(card?.labelPlacement).toBe('none')
    expect(card?.labelW).toBe(0)
    // The MARKER sits at NOW — the right edge of the canvas — not 148px to its left.
    // It used to be offset by a fixed label-chip width (148px) so that the chip would
    // fit inside the canvas; the label is no longer a fixed-width box and never sits
    // outside the box, so pinning the mark 148px away from the instant it marks was
    // pure cost. A live task's last known moment is NOW, so that is where the mark goes.
    expect(card?.x).toBe(layout.dataWidth - TASK_MARKER_WIDTH)
    // ...and it is still never pushed off the left edge of the canvas.
    const narrow = layoutTimeline(withTasks(data, [task({ history: [] })]), { ...VIEWPORT, width: 1 }, { now: 11_000, msPerPx: 10_000, tzOffsetMinutes: 0 })
    expect(narrow.tasks[0]?.x).toBe(0)
  })

  it('an UNFINISHED task keeps growing: the box spans creation to NOW', () => {
    // The user's ask: "当任务未完成时候，应该是跟随时间线不停拖动拉长任务框，这样才代表任务
    // 进行中". Only the creation is dated, so `max(history.time)` is the creation itself —
    // the old code drew a 1px mark and said the task lasted no time, which is the
    // opposite of what an open task means.
    const open = withTasks(data, [task({ status: 'in_progress', history: [{ time: 2_000, action: 'created', sessionId: 's' }] })])
    const at11 = layoutTimeline(open, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 }).tasks[0]
    expect(at11?.durationMs).toBe(9_000)
    expect(at11?.w).toBeCloseTo(90, 5)
    expect(at11?.live, 'a still-growing box must be flagged live').toBe(true)
    // It GROWS with the clock, which is the whole point.
    const at15 = layoutTimeline(open, VIEWPORT, { now: 15_000, msPerPx: 100, tzOffsetMinutes: 0 }).tasks[0]
    expect(at15?.durationMs).toBe(13_000)
    expect(at15?.w).toBeCloseTo(130, 5)
    expect(at15?.w ?? 0).toBeGreaterThan(at11?.w ?? 0)
    // `pending` counts as unfinished too: created and never claimed has no end either.
    const pending = withTasks(data, [task({ status: 'pending', history: [{ time: 2_000, action: 'created', sessionId: 's' }] })])
    expect(layoutTimeline(pending, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 }).tasks[0]?.durationMs).toBe(9_000)
  })

  it('a COMPLETED task does NOT grow: its span is a measured fact', () => {
    const done = withTasks(data, [
      task({ status: 'completed', history: [{ time: 2_000, action: 'created', sessionId: 's' }, { time: 3_000, action: 'completed', sessionId: 's' }] }),
    ])
    // Moving `now` must not move a finished bar — otherwise the chart would claim the
    // task was still running.
    const at11 = layoutTimeline(done, VIEWPORT, { now: 11_000, msPerPx: 100, tzOffsetMinutes: 0 }).tasks[0]
    const at99 = layoutTimeline(done, VIEWPORT, { now: 99_000, msPerPx: 100, tzOffsetMinutes: 0 }).tasks[0]
    expect(at11?.durationMs).toBe(1_000)
    expect(at99?.durationMs).toBe(1_000)
    expect(at11?.live).toBe(false)
  })

  it('the card slot is exactly the box plus its transition rail', () => {
    // The slot height is a literal so the track block can be declared before the box
    // constants; this is what stops the two drifting apart.
    expect(TASK_BAR_HEIGHT + 2 + 10).toBe(TASK_CARD_HEIGHT)
    expect(TASK_TRACK_HEIGHT).toBe(TASK_CARD_HEIGHT)
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
    // A live card on a 1px canvas stays anchored at x = 0, so it is never pushed
    // off the LEFT edge (a negative x would be unreachable: scrollLeft cannot go
    // below 0).
    //
    // NOTE (issue 3): this assertion used to require the live card to OVERFLOW
    // the canvas, i.e. `x + w > dataWidth`, because the card was 148px wide
    // (a fixed label chip) at x = 0 on a 1px canvas. Measurement — not the text —
    // now decides the width, so the card can no longer be assumed to overflow and
    // that assertion pinned layout arithmetic rather than the reachability it was
    // written to protect.
    const narrowCanvas = layoutTimeline(withTasks(data, [task({ history: [] })]), { ...VIEWPORT, width: 1 }, { now: 11_000, msPerPx: 10_000, tzOffsetMinutes: 0 })
    const floored = narrowCanvas.tasks[0]
    expect(floored).toBeDefined()
    expect(floored?.x).toBe(0)
    // NOTE (issue 3): this block used to require the live card to OVERFLOW the
    // canvas (`x + w > dataWidth`) because the card was 148px wide (a fixed label
    // chip) at x = 0 on a 1px canvas. The width is now decided by
    // measurement, not by the text, so that assertion had become a statement
    // about layout arithmetic rather than about the reachability it was written
    // to protect. What actually keeps a card reachable is that its left edge is
    // never pushed off the canvas (x = 0, and scrollLeft cannot go below 0).
    //
    // The width floor itself is asserted directly here: the bar is its real
    // duration in px, and only the 1px hairline may intervene.
    const longTask = withTasks(data, [task({ history: [{ time: 1_000, action: 'created', sessionId: 's' }, { time: 101_000, action: 'completed', sessionId: 's' }] })])
    const overflowing = layoutTimeline(longTask, { ...VIEWPORT, width: 1 }, { now: 200_000, msPerPx: 1_000, tzOffsetMinutes: 0 })
    const wide = overflowing.tasks[0]
    // 100s at 1000ms/px = exactly 100px of bar: a 1px canvas is overflowed by the
    // DURATION, not by a chip width, and the old 2px floor is not in the number.
    expect(wide?.w).toBeCloseTo(100, 9)
    expect((wide?.x ?? 0) + (wide?.w ?? 0)).toBeGreaterThan(1)
    // ...and its LEFT edge is still the task's real start, never moved right to
    // fit: that is the whole point of removing the length floor.
    expect(wide?.x).toBe((1_000 - overflowing.window.start) / 1_000)
    // A genuinely sub-hairline task is clamped to the single hairline pixel for
    // rendering — which is the ONLY clamp left, and it is 1px, not 2px.
    const subHairline = withTasks(data, [task({ history: [{ time: 10_000, action: 'created', sessionId: 's' }, { time: 10_001, action: 'completed', sessionId: 's' }] })])
    const tinyBar = layoutTimeline(subHairline, VIEWPORT, { now: 11_000, msPerPx: 10_000, tzOffsetMinutes: 0 }).tasks[0]
    expect(tinyBar?.durationMs).toBe(1)
    // The raw duration would be 1ms / 10_000ms-per-px = 0.0001px, far below any
    // readability floor — and yet the drawn width is 1px, not 2px.
    expect(tinyBar?.w).toBe(TASK_BAR_MIN_WIDTH)
    expect(tinyBar?.w).toBe(1)
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
    // MESSAGE first, then activity: the user's "信息收发显示的泳道放在 span 的泳道上面".
    expect(tracks.map((track) => track.id)).toEqual(['message', 'activity', 'task'])
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

describe('message markers', () => {
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
/* The message layer is scoped to the SELECTED RANGE (live bugs 1 and 2)       */
/* ------------------------------------------------------------------------- */

/**
 * The user, after the time-range filter shipped:
 *
 *   1. "当时间线不是选 all 的时候，在时间线最开头有莫名其妙标记"
 *   2. "当时间线不是选 all 的时候，发送收取消息的 icon 多了很多 +n 的标记"
 *
 * Both had ONE cause. Every other rect builder in this module asks `inWindow`
 * before drawing — `spanRect` and `taskCardRect` both do; the message markers
 * did not. Because a marker's x is
 * `(clamp(time, win.start, win.end) - win.start) / msPerPx`, an out-of-range
 * message was never dropped: it was CLAMPED onto the window's left edge and drawn
 * there. And `droppedBefore` ran over the lane's whole list, so the badge counted
 * the omission of messages the selected range had excluded.
 *
 * Measured before the fix on a 4-lane / 3-hour / 180-messages-per-lane fixture at
 * a 248px viewport:
 *   range = all : 160 markers, 0 of them at the left edge, every badge "+6"
 *   range = 15m : 8 markers AT the left edge, and badges reading "+163"
 *
 * The fixture below is arithmetic rather than sampled, so every expectation is a
 * count that can be checked by hand. Window: [NOW - 10min, NOW] at 10s per px, so
 * the filtered content is exactly 60px wide.
 */
describe('layoutTimeline — the message layer is scoped to the selected range', () => {
  const BASE = 1_000_000
  const NOW = BASE + HOUR_MS
  const RANGE = 10 * MINUTE_MS
  /** What the filter produces: [WINDOW_START, NOW]. */
  const WINDOW_START = NOW - RANGE
  const MS_PER_PX = 10_000
  const at = (offset: number): number => BASE + offset
  const isInWindow = (time: number): boolean => time >= WINDOW_START && time <= NOW

  const message = (time: number, index: number): MessageSpan => ({
    kind: 'message',
    time,
    end: null,
    from: { kind: 'lead', id: 'session-1', name: 'Lead' },
    to: { kind: 'teammate', id: 'member-1', name: 'member-1' },
    messageId: `m-${index}`,
    sessionId: 'session-1',
  })

  const laneOf = (id: string, times: number[]): TimelineResponse['lanes'][number] => ({
    ...(liveResponse().lanes[0] as TimelineResponse['lanes'][number]),
    id,
    name: id,
    spans: [],
    messages: times.map((time, index) => message(time, index)),
  })

  /** 20 messages, ALL of them older than the window opens. */
  const EARLY = Array.from({ length: 20 }, (_, index) => at(index * 1_000))
  /** 30 older than the window … */
  const SPANNING_BEFORE = Array.from({ length: 30 }, (_, index) => at(2_900_000 + index * 1_000))
  /** … and 12 inside it, spread over ~50 of the 60 content px. */
  const SPANNING_INSIDE = Array.from({ length: 12 }, (_, index) => at(3_030_000 + index * 45_000))
  /** 5 messages, all inside. */
  const INNER = Array.from({ length: 5 }, (_, index) => at(3_400_000 + index * 1_000))
  /** One exactly at each edge of the window: `inWindow` is inclusive on both sides. */
  const EDGES = [WINDOW_START, NOW]

  const IN_RANGE: Readonly<Record<string, number>> = {
    early: 0,
    spanning: SPANNING_INSIDE.length,
    inside: INNER.length,
    edges: EDGES.length,
  }

  const fixture = (): TimelineResponse => ({
    ...liveResponse(),
    range: { start: BASE, end: null },
    live: true,
    tasks: [],
    lanes: [
      laneOf('early', EARLY),
      laneOf('spanning', [...SPANNING_BEFORE, ...SPANNING_INSIDE]),
      laneOf('inside', INNER),
      laneOf('edges', EDGES),
    ],
  })

  const filtered = () =>
    layoutTimeline(fixture(), VIEWPORT, { now: NOW, msPerPx: MS_PER_PX, windowSpanMs: RANGE, tzOffsetMinutes: 0 })
  const unfiltered = () => layoutTimeline(fixture(), VIEWPORT, { now: NOW, msPerPx: MS_PER_PX, tzOffsetMinutes: 0 })

  it('resolves the filtered window as [end - span, now]', () => {
    expect(filtered().window).toMatchObject({ start: WINDOW_START, end: NOW, live: true })
  })

  it('draws no marker for a lane whose messages are all older than the window', () => {
    // The clamp used to turn each of these 20 messages into a marker pinned at
    // x === 0 — the phantom at the very start of the timeline.
    const layout = filtered()
    expect(layout.messages.filter((marker) => marker.laneId === 'early')).toHaveLength(0)
  })

  it('keeps every marker inside the window and still draws a message that sits ON an edge', () => {
    const layout = filtered()
    expect(layout.messages.length).toBeGreaterThan(0)
    for (const marker of layout.messages) {
      expect(isInWindow(marker.time), `marker at ${marker.time} is outside [${WINDOW_START}, ${NOW}]`).toBe(true)
    }
    // Inclusive on BOTH sides: a message at win.start really is at x === 0, and a
    // message at win.end really is at the right edge of the content. Dropping these
    // would be the opposite bug — a range filter that hides the boundaries it names.
    const edgeMarkers = layout.messages.filter((marker) => marker.laneId === 'edges')
    expect(edgeMarkers.map((marker) => marker.time).sort((a, b) => a - b)).toEqual([WINDOW_START, NOW])
    expect(edgeMarkers.find((marker) => marker.time === WINDOW_START)?.x).toBe(0)
    expect(edgeMarkers.find((marker) => marker.time === NOW)?.x).toBeCloseTo(layout.dataWidth, 6)
  })

  it('counts only in-range messages, so a "+n" badge can never claim omissions outside the range', () => {
    const layout = filtered()
    const expected = Object.values(IN_RANGE).reduce((sum, count) => sum + count, 0)
    expect(layout.messageCount).toBe(expected)
    expect(layout.messageCount).toBe(19)
    expect(layout.droppedMessageCount).toBe(layout.messageCount - layout.messages.length)
    for (const marker of layout.messages) {
      // THE lock for bug 2: the badge is a claim about the set being decimated, and
      // with a range selected that set is the range — so it cannot exceed it.
      const allowed = (IN_RANGE[marker.laneId] ?? 0) - 1
      expect(
        marker.droppedBefore,
        `lane ${marker.laneId} claims +${marker.droppedBefore} but only ${IN_RANGE[marker.laneId]} messages are in range`,
      ).toBeLessThanOrEqual(allowed)
    }
    // The decisive one: this lane has 30 messages the range EXCLUDES. Before the fix
    // they were decimated together with the in-range ones and their omission landed on
    // the first in-range badge (measured "+163" on the browser fixture, "+6" at `all`).
    const spanning = layout.messages.filter((marker) => marker.laneId === 'spanning')
    expect(spanning.length).toBeGreaterThan(0)
    for (const marker of spanning) expect(marker.droppedBefore).toBeLessThan(SPANNING_INSIDE.length)
  })

  it('is a no-op when no range is selected', () => {
    // The fix must not change anything the reader sees at `all`: with no filter,
    // `computeWindow` covers every datum by construction, so the candidate list is
    // the whole lane and the counts are the pre-fix ones.
    const layout = unfiltered()
    expect(layout.window).toMatchObject({ start: BASE, end: NOW })
    expect(layout.messageCount).toBe(EARLY.length + SPANNING_BEFORE.length + SPANNING_INSIDE.length + INNER.length + EDGES.length)
    expect(layout.messageCount).toBe(69)
    expect(layout.droppedMessageCount).toBe(layout.messageCount - layout.messages.length)
    // With no filter the window is the WHOLE log, so every message is a candidate and
    // the clamp has nothing to move: the pre-fix and post-fix marker sets are identical.
    for (const marker of layout.messages) {
      expect(marker.time).toBeGreaterThanOrEqual(layout.window.start)
      expect(marker.time).toBeLessThanOrEqual(layout.window.end)
    }
  })
})

/* ------------------------------------------------------------------------- */
/* A task caption that cannot be read is not drawn at all (live bug 3)         */
/* ------------------------------------------------------------------------- */

/**
 * The user: "如果时间线粒度太粗，无法展示任务卡文本时候，就不要强行展示了".
 *
 * Measured before the fix (a 3-hour log at 600 s/px, the coarsest zoom, in a 248px
 * canvas): the content is `3h / 600s = 18px` wide, and all twelve captions were
 * clamped into that same 18.1px column with 45–71px of text inside each — twelve
 * one-character fragments stacked at one x. `taskCardRect`'s last-resort branch
 * ("no side has room, so clamp inside the canvas") cannot tell "this canvas is
 * narrow" from "this canvas cannot show text at all"; the suppression below can.
 */
describe('layoutTimeline — a task caption that cannot be read is not drawn', () => {
  const data = liveResponse()
  const task = (over: Partial<TimelineResponse['tasks'][number]> = {}): TimelineResponse['tasks'][number] => ({
    id: 't',
    revision: 1,
    subject: 's',
    description: 'd',
    status: 'completed',
    blockedBy: [],
    writeScopes: [],
    ready: true,
    writeScopeWarnings: [],
    laneId: 'lead',
    history: [{ time: 2_000, action: 'created', sessionId: 's' }],
    ...over,
  })
  const created = (from: number, to: number) => [
    { time: from, action: 'created' as const, sessionId: 's' },
    { time: to, action: 'completed' as const, sessionId: 's' },
  ]

  it('suppresses the label on a box too narrow to hold even an ellipsis', () => {
    // 19_000ms of window at 1000ms/px = a 19px canvas, and the task is 4px of it. There
    // is no room for one glyph plus an ellipsis, so nothing is drawn — the renderer no
    // longer has a "move it outside" fallback to reach for.
    const layout = layoutTimeline(withTasks(data, [task({ history: created(1_000, 5_000) })]), VIEWPORT, {
      now: 20_000,
      msPerPx: 1_000,
      tzOffsetMinutes: 0,
    })
    expect(layout.contentWidth).toBe(19)
    const card = layout.tasks[0]
    expect(card?.labelPlacement).toBe('none')
    expect(card?.labelW).toBe(0)
    expect(card?.labelX).toBe(card?.x)
    // The BOX is untouched: it still is the duration, still is the click target, and
    // still carries the whole task in its `title`/`aria-label` in the renderer.
    expect(card?.x).toBe(0)
    expect(card?.w).toBe(4)
    expect(card?.anchor).toBe('history')
    // The phantom-scroll invariant, now trivially satisfied because no label can leave
    // the box: `labelX + labelW <= x + w <= contentWidth`.
    expect((card?.labelX ?? -1) + (card?.labelW ?? 0)).toBeLessThanOrEqual((card?.x ?? 0) + (card?.w ?? 0) + 1e-6)
    expect((card?.labelX ?? -1) + (card?.labelW ?? 0)).toBeLessThanOrEqual(layout.contentWidth)
  })

  it('draws the label inside a box that is wide enough, and never outside it', () => {
    // 3000ms at 300ms/px = 10px: still under the floor. At 50ms/px (the finest the
    // sanitiser allows) it is 60px, and the label is drawn INSIDE with labelX/labelW
    // equal to the box's own x/w. NOTE: asking for 30ms/px here would be clamped UP to
    // `MIN_MS_PER_PX` (50) and the box would be 60px, not 100 — the layout sanitises
    // its zoom input.
    const narrow = layoutTimeline(withTasks(data, [task({ history: created(7_000, 10_000) })]), VIEWPORT, {
      now: 20_000,
      msPerPx: 300,
      tzOffsetMinutes: 0,
    })
    expect(narrow.tasks[0]?.w).toBeCloseTo(10, 5)
    expect(narrow.tasks[0]?.labelPlacement).toBe('none')
    const wide = layoutTimeline(withTasks(data, [task({ history: created(7_000, 10_000) })]), VIEWPORT, {
      now: 20_000,
      msPerPx: MIN_MS_PER_PX,
      tzOffsetMinutes: 0,
    })
    const card = wide.tasks[0]
    expect(card?.w).toBeCloseTo(60, 5)
    expect(card?.labelPlacement).toBe('inside')
    expect(card?.labelX).toBe(card?.x)
    expect(card?.labelW).toBe(card?.w)
  })

  it('puts the boundary exactly at TASK_LABEL_MIN_WIDTH', () => {
    // A 36_000ms task at 1000ms/px is 36px — exactly the floor — and one notch coarser
    // is 32.7px. Pinning both sides means moving the constant has to be deliberate.
    const at = (msPerPx: number) =>
      layoutTimeline(withTasks(data, [task({ history: created(2_000, 38_000) })]), VIEWPORT, {
        now: 40_000,
        msPerPx,
        tzOffsetMinutes: 0,
      }).tasks[0]
    expect(at(1_000)?.w).toBeCloseTo(36, 5)
    expect(at(1_000)?.labelPlacement).toBe('inside')
    // 32.7px: too narrow for a glyph plus an ellipsis, but wide enough for the "…"
    // itself — the user's "最少也要显示 「...」这样有内容".
    expect(at(1_100)?.w).toBeCloseTo(36_000 / 1_100, 5)
    expect(at(1_100)?.labelPlacement).toBe('ellipsis')
    // 20px: not even the ellipsis fits, so nothing is drawn.
    expect(at(1_800)?.w).toBeCloseTo(20, 5)
    expect(at(1_800)?.labelPlacement).toBe('none')
    expect(TASK_LABEL_MIN_WIDTH).toBe(36)
    expect(TASK_LABEL_ELLIPSIS_MIN_WIDTH).toBe(22)
    expect(TASK_LABEL_ELLIPSIS_MIN_WIDTH).toBeLessThan(TASK_LABEL_MIN_WIDTH)
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

describe('follow mode advances to the edge then snaps back to 3/4', () => {
  /**
   * RE-BASED for 0.2.20. The 0.2.19 version of this block asserted a PERMANENT PIN —
   * that every call returned the 3/4 target — which was the wrong semantic. The user:
   *
   *   > 他不是永远停在 3/4 位置，而是条到这个位置后，时间线往后推，推到边缘位置又再回到
   *   > 3/4，这个意思
   *
   * So this is a HYSTERESIS cycle, and the load-bearing half is the SILENCE:
   *
   *   1. snap `now` to 3/4;
   *   2. while `now` is inside the viewport the function returns `null`, so nothing
   *      scrolls and the line drifts right on its own (the old version re-targeted
   *      every call, which is exactly the pin the user rejected);
   *   3. once `now` reaches the right edge, snap it back to 3/4.
   *
   * The gutter is CONTENT px produced by the layout, so it is asserted here rather than
   * inferred from a CSS spacer. `now` must NOT move: `win.end` still IS `now`, which is
   * why an open task's box still ends at `nowX`.
   */
  const base = { follow: true, live: true, nowX: 900, viewportWidth: 320, contentWidth: 900, scrollLeft: 0 }

  it('snaps only at the right edge, and stays silent inside the viewport', () => {
    const viewportWidth = base.viewportWidth
    const contentWidth = base.nowX + viewportWidth * FOLLOW_GUTTER_RATIO
    // Where the snap put it: now sits at 3/4, scrollLeft = 900 - 240 = 660.
    const snapped = base.nowX - viewportWidth * (1 - FOLLOW_GUTTER_RATIO)
    expect(snapped).toBe(660)

    // `now` inside the viewport -> NO scrolling, at both stated points.
    for (const fraction of [0.6, 0.99]) {
      const scrollLeft = base.nowX - viewportWidth * fraction
      const inside = shouldFollowScroll({ ...base, contentWidth, scrollLeft })
      expect(inside.scrollTo, `nowViewX ${fraction}v must not scroll`).toBeNull()
    }
    // Exactly AT the edge already fires (the tolerance is half a pixel, not a fraction).
    const atEdge = shouldFollowScroll({ ...base, contentWidth, scrollLeft: base.nowX - viewportWidth })
    expect(atEdge.scrollTo).toBeCloseTo(snapped, 6)
    // A sub-pixel overshoot must not skip the trigger.
    const overshoot = shouldFollowScroll({ ...base, contentWidth, scrollLeft: base.nowX - viewportWidth - 0.2 })
    expect(overshoot.scrollTo).toBeCloseTo(snapped, 6)
    // ...and past the edge (follow turned on while `now` is off-screen) still snaps.
    const offscreen = shouldFollowScroll({ ...base, contentWidth, scrollLeft: base.nowX - viewportWidth * 2 })
    expect(offscreen.scrollTo).toBeCloseTo(snapped, 6)
    expect(base.nowX - (offscreen.scrollTo ?? 0)).toBeCloseTo(viewportWidth * (3 / 4), 6)
  })

  it('clamps the snap target to both ends of the scrollable range', () => {
    const viewportWidth = base.viewportWidth
    const contentWidth = base.nowX + viewportWidth * FOLLOW_GUTTER_RATIO
    const maxScroll = contentWidth - viewportWidth
    // At the END of the content the target clamps to contentWidth - viewportWidth, and
    // that clamped position is exactly where `now` lands at 3/4.
    const atEnd = shouldFollowScroll({ ...base, contentWidth, scrollLeft: base.nowX - viewportWidth })
    expect(atEnd.scrollTo).toBeCloseTo(maxScroll, 6)
    expect(base.nowX - maxScroll).toBeCloseTo(viewportWidth * (3 / 4), 6)
    // Never negative, even for a `now` sitting before the viewport.
    const early = shouldFollowScroll({ ...base, nowX: 10, contentWidth, scrollLeft: 0 })
    expect(early.scrollTo === null || early.scrollTo >= 0).toBe(true)
  })

  it('never scrolls when follow is off', () => {
    const viewportWidth = base.viewportWidth
    const contentWidth = base.nowX + viewportWidth * FOLLOW_GUTTER_RATIO
    expect(shouldFollowScroll({ ...base, follow: false, contentWidth }).scrollTo).toBeNull()
    // ...even in the state that WOULD snap with follow on.
    const edge = { ...base, follow: false, contentWidth, scrollLeft: base.nowX - viewportWidth }
    expect(shouldFollowScroll(edge).scrollTo).toBeNull()
  })

  it('keeps the ratio a single shared number', () => {
    // The gutter and the snap target must not drift apart: one constant feeds both.
    expect(FOLLOW_GUTTER_RATIO).toBe(1 / 4)
  })
})

describe('an anchored range narrows a session that is LONGER than the span', () => {
  /**
   * THE COVERAGE GAP THAT LET A REGRESSION SHIP.
   *
   * Every pre-existing range test used a fixture only a few SECONDS long, so a span of
   * 1h was always wider than the whole log and the clamp at the earliest datum made the
   * result identical to `全部`. That is correct behaviour for a short session — which is
   * exactly why it proved nothing: the NARROWING path was never exercised.
   *
   * The user's real session is ~47 hours, and they reported "筛选 tim range 页面没有任何
   * 变化". The cause was `Math.min(anchorStartMs, start)` in `computeWindow`: it was meant
   * to stop the anchor exceeding the earliest datum, but on a long session it dragged the
   * anchor from "1 hour ago" back to the session start, so every range collapsed to
   * `全部`. Measured on a 6-hour session BEFORE the fix:
   *
   *   span 1h  -> start 360min ago, duration 361min   (filter gone)
   *   span 30m -> start 360min ago, duration 361min   (filter gone)
   *   span 15m -> start 360min ago, duration 361min   (filter gone)
   *
   * AFTER: 1h -> 60min, 30m -> 30min, 15m -> 15min, 全部 -> the whole session.
   *
   * The fixture below is therefore HOURS long on purpose. Do not shrink it: with a
   * fixture shorter than the span every assertion here passes for the wrong reason.
   */
  const MIN = 60_000
  const HOUR = 60 * MIN
  const now = 6 * HOUR + 1_000            // a 6-hour session, `range.start` at 1000
  function longSession(): TimelineResponse {
    const base = liveResponse()
    const lead = base.lanes[0]
    if (lead === undefined) throw new Error('liveResponse must contain a lead lane')
    const spans: TimelineLane['spans'] = []
    for (let t = 1_000; t <= now; t += 5 * MIN) spans.push({ kind: 'step', start: t, end: t + MIN })
    return { ...base, range: { start: 1_000, end: null }, lanes: [{ ...lead, spans }] }
  }

  it('narrows to the span instead of collapsing to the whole session', () => {
    const data = longSession()
    const extent = dataExtent(data, now)
    expect(extent.start, 'the fixture must span hours, not seconds').toBe(1_000)
    const anchored = (span: number | null): ReturnType<typeof layoutTimeline> =>
      layoutTimeline(data, VIEWPORT, {
        now,
        msPerPx: 1_000,
        tzOffsetMinutes: 0,
        windowSpanMs: span,
        anchorStartMs: effectiveWindowStart(now, span, extent.start),
        follow: true,
      })

    const spanOf = (span: number | null): number => anchored(span).window.durationMs
    const all = spanOf(null)
    const oneHour = spanOf(HOUR)
    const halfHour = spanOf(30 * MIN)
    const quarter = spanOf(15 * MIN)

    // Measured with this fixture: all 361min, 1h 61min, 30m 31min, 15m 16min. The
    // extra minute is real and bounded: `end` is `max(now, last datum end)` and the
    // span grid here is 5 minutes, so the right edge can sit up to one grid step past
    // `now`. Hence a two-minute tolerance rather than one.
    expect(all, '全部 must be the whole session').toBeGreaterThan(5 * HOUR)
    // The load-bearing assertions: each range is NARROWER than the session, is close to
    // its own span, and a narrower span gives a narrower window.
    expect(oneHour, '1h must be about an hour, not the session').toBeGreaterThan(HOUR - 2 * MIN)
    expect(oneHour).toBeLessThan(HOUR + 2 * MIN)
    expect(halfHour).toBeGreaterThan(30 * MIN - 2 * MIN)
    expect(halfHour).toBeLessThan(30 * MIN + 2 * MIN)
    expect(quarter).toBeGreaterThan(15 * MIN - 2 * MIN)
    expect(quarter).toBeLessThan(15 * MIN + 2 * MIN)
    expect(oneHour).toBeLessThan(all)
    expect(halfHour).toBeLessThan(oneHour)
    expect(quarter).toBeLessThan(halfHour)
  })

  it('keeps the anchor pinned while the clock advances', () => {
    const data = longSession()
    const extent = dataExtent(data, now)
    const anchor = effectiveWindowStart(now, HOUR, extent.start)
    expect(anchor, 'anchor is one hour before the clock').toBe(now - HOUR)
    const later = layoutTimeline(data, VIEWPORT, {
      now: now + 10 * MIN,
      msPerPx: 1_000,
      tzOffsetMinutes: 0,
      windowSpanMs: HOUR,
      anchorStartMs: anchor,
      follow: true,
    })
    // The start does not move with the clock; only the end grows.
    expect(later.window.start).toBe(anchor)
    expect(later.window.end).toBeGreaterThan(now)
  })
})
