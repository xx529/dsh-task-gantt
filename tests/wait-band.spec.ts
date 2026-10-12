/**
 * Where a `wait_agent` band is drawn.
 *
 * ── WHY THIS FILE EXISTS ─────────────────────────────────────────────────────
 * The Lead measured the coverage gap directly:
 *
 *     grep -rn 'waitBandRects\|MESSAGE_MARKER_TOP' tests/    ->  0 hits
 *
 * The band's vertical position had NO test at all, which is exactly how it drifted
 * from the activity track to the message track without anyone noticing. The user's
 * ruling is now the opposite of the original one:
 *
 *   > 我觉得等待的灰色条可以重合在 span，这样表达更清晰
 *
 * So the band must sit ON the span it belongs to — the same track as the turn band
 * and the step bar centred inside it — and this file pins that so the next
 * well-meaning refactor cannot quietly move it back.
 *
 * ── WHAT IS DELIBERATELY *NOT* LOCKED HERE ──────────────────────────────────
 * Only the VERTICAL slice is this file's business. Caps, the striped mask, the
 * open/timedOut/unknown classes and the x/w projection are locked by the callers'
 * own tests; duplicating them here would create a second place to update when the
 * band's horizontal behaviour legitimately changes.
 *
 * Window and scale used by every case below, stated once so a failure is
 * reproducible: a 60-second window starting at 0 with `msPerPx = 100`, i.e. the
 * content strip is 600px wide.
 */
import { describe, expect, it } from 'vitest'

import { ACTIVITY_TRACK_HEIGHT, ACTIVITY_TRACK_TOP, DEFAULT_LANE_HEIGHT, laneTracks } from '../src/client/ui/timeline-layout.ts'
import { waitBandRects } from '../src/client/ui/GanttChart.tsx'
import type { LaneWait } from '../src/shared/contract.ts'

/** A 60s window at 100ms/px: 600px of content. */
const WINDOW = { windowStart: 0, windowEnd: 60_000, msPerPx: 100 }
/** The lane origin the chart uses: the header, then whole lane heights. */
const laneY = (laneIndex: number): number => 0 + laneIndex * DEFAULT_LANE_HEIGHT

const band = (waits: readonly LaneWait[], laneIndex: number, extra: Partial<Parameters<typeof waitBandRects>[1]> = {}) =>
  waitBandRects(waits, {
    laneId: `lane-${laneIndex}`,
    laneIndex,
    ...WINDOW,
    laneY: laneY(laneIndex),
    laneHeight: DEFAULT_LANE_HEIGHT,
    ...extra,
  })

describe('the wait band coincides with the activity span', () => {
  it('sits on the activity track for several lane indices', () => {
    // Several indices on purpose: a formula that hard-coded the first lane would
    // pass a single-lane assertion and break for every other one.
    for (const laneIndex of [0, 1, 2, 7]) {
      const rects = band([{ start: 10_000, end: 20_000, sessionId: 's' }], laneIndex)
      expect(rects, `lane ${laneIndex} must yield exactly one band`).toHaveLength(1)
      expect(rects[0]?.y, `lane ${laneIndex} y`).toBe(laneY(laneIndex) + ACTIVITY_TRACK_TOP)
      expect(rects[0]?.h, `lane ${laneIndex} h`).toBe(ACTIVITY_TRACK_HEIGHT)
    }
  })

  it('is the same y and h as the lane turn band it overlaps', () => {
    // The real assertion the user asked for: not "equals the constant" but "equals
    // the span in the SAME lane", so independent drift in either one is caught.
    const laneIndex = 3
    const activity = laneTracks(laneIndex).find((track) => track.id === 'activity')
    expect(activity, 'the activity track must exist').toBeDefined()
    const [rect] = band([{ start: 5_000, end: 9_000, sessionId: 's' }], laneIndex)
    // `laneTracks` already returns ABSOLUTE y (laneIndex * laneHeight + the track
    // offset), so the lane origin must not be added again here.
    expect(rect?.y).toBe(activity?.y)
    expect(rect?.h).toBe(activity?.h)
  })

  it('is the activity track, not the message track', () => {
    // The specific regression this file was created for. The message track is the
    // FIRST/top track since 0.2.12, so an accidental revert would put the band
    // above the span rather than on it.
    const laneIndex = 0
    const tracks = laneTracks(laneIndex)
    const [rect] = band([{ start: 1_000, end: 2_000, sessionId: 's' }], laneIndex)
    const message = tracks.find((track) => track.id === 'message')
    expect(rect?.y).not.toBe(message?.y)
    expect(rect?.y).toBeGreaterThan(message?.y ?? Number.NaN)
  })

  it('keeps the band inside its own lane', () => {
    for (const laneIndex of [0, 1, 5]) {
      const [rect] = band([{ start: 0, end: 60_000, sessionId: 's' }], laneIndex)
      expect(rect?.y).toBeGreaterThanOrEqual(laneY(laneIndex))
      expect((rect?.y ?? 0) + (rect?.h ?? 0)).toBeLessThanOrEqual(laneY(laneIndex + 1))
    }
  })
})

describe('the window behaviour is unchanged by the move', () => {
  const wait = (start: number, end: number | null): LaneWait => ({ start, end, sessionId: 's' })

  it('drops an interval entirely before the window', () => {
    // The window starts at 0 here, so "before" means a negative interval; the same
    // rule is what removes old waits when the user narrows the range.
    const inside = { windowStart: 50_000, windowEnd: 60_000, msPerPx: 100 }
    const rects = waitBandRects([wait(1_000, 4_000)], { laneId: 'l', laneIndex: 0, ...inside, laneY: 0 })
    expect(rects).toEqual([])
  })

  it('keeps an interval straddling the left edge, clipped to x = 0', () => {
    const inside = { windowStart: 50_000, windowEnd: 60_000, msPerPx: 100 }
    const rects = waitBandRects([wait(10_000, 60_000)], { laneId: 'l', laneIndex: 0, ...inside, laneY: 0 })
    expect(rects).toHaveLength(1)
    expect(rects[0]?.x).toBe(0)
    expect(rects[0]?.clippedLeft).toBe(true)
  })

  it('runs an open wait to the window end', () => {
    const rects = band([wait(10_000, null)], 0)
    expect(rects).toHaveLength(1)
    expect(rects[0]?.open).toBe(true)
    expect(rects[0]?.end).toBeNull()
    // Window is 60s at 100ms/px, so the right edge is 600px.
    expect(rects[0]?.capRightX).toBe(600)
  })

  it('cull drops off-screen bands only when asked', () => {
    // An interval inside the window but scrolled far to the left of the viewport.
    const offscreen = band([wait(1_000, 2_000)], 0)
    expect(offscreen).toHaveLength(1)

    const culled = band([wait(1_000, 2_000)], 0, { cull: true, viewportWidth: 100, scrollLeft: 5_000 })
    expect(culled).toEqual([])

    const kept = band([wait(1_000, 2_000)], 0, { cull: true, viewportWidth: 100, scrollLeft: 0 })
    expect(kept).toHaveLength(1)
  })
})
