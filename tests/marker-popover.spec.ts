/**
 * task-29 — my own locks for the round's two user items. This file deliberately
 * does NOT repeat `tests/wait-band.spec.ts` (ui-2's 8 locks, which already cover:
 * the band sitting on the activity track, matching the turn band's y/h, not being
 * on the message track, staying inside its lane, an interval before the window
 * being dropped, a straddling interval clipped to x=0, an open wait running to the
 * window end, and culling). What is asserted here are the cases that file does NOT
 * cover, measured from the contract in `GanttChart.tsx` / `WaitBandRect`.
 *
 * BROWSER MEASUREMENTS on the freshly deployed bundle — served file with the first
 * two loader-shim lines stripped = `a8135e3c6424fd196f1d210b9b93740d` (159799 B,
 * byte-identical to repo `lib/client.js`) — my own page
 * `http://127.0.0.1:8792/demo/verify-range.html?w29b2=1`, my own fixture:
 *
 *   ITEM B (7 waits, one row each; lane band h = 92 = DEFAULT_LANE_HEIGHT):
 *     every wait  y = 17 = ACTIVITY_TRACK_TOP (3 + 11 + 3),  h = 10 = ACTIVITY_TRACK_HEIGHT
 *     the 8px step in the same lane: y = 18  => offset 1px inside the 10px band (centred)
 *     classes kept: dtg-wait-woken (timedOut false) / dtg-wait-timeout (true) /
 *                   dtg-wait-open (end null, ONE cap) / dtg-wait-unknown (timedOut absent)
 *     a lane with waits but NO step (lane 1) still draws its wait on the activity track
 *     two overlapping waits in one lane are BOTH drawn
 *
 *   ITEM A (marker popover), outgoing `发出 → alpha` and incoming `收到 ← alpha`:
 *     rest title "10-12 14:22:55 · 发出 → alpha"; popover text
 *     "发出 → alpha10-12 14:22:55消息内容Lead msg 2"; title null while open; aria kept;
 *     `.dtg-scroll` 140/116 UNCHANGED while open; popover parent = .dtg-chart (NOT
 *     inside .dtg-scroll) and inside the panel; leaving/blurring restores the title
 *     byte-identically; two hovers => 1 popover; after all leaves 0 popovers and 82/82
 *     markers carry their title and aria (no residue).
 *
 * A STALE-ARTIFACT NOTE, recorded because it nearly became a false report: my first
 * wait measurement showed y=3/h=11 (the MESSAGE track) and looked like a real
 * counter-example. It was my own server still serving the PREVIOUS round's bundle
 * (`1c6ff968…`). Only after re-copying the deployed bundle (`a8135e3c…`) did the
 * band measure y=17/h=10. Check the artifact before believing a counter-example.
 */
import { describe, expect, it } from 'vitest'
import { ACTIVITY_TRACK_HEIGHT, ACTIVITY_TRACK_TOP } from '../src/client/ui/timeline-layout.ts'
import { waitBandRects } from '../src/client/ui/GanttChart.tsx'
import type { LaneWait } from '../src/shared/contract.ts'

/** 1 px == 1000 ms, so every expected x/w below is the duration in seconds. */
const WINDOW = { windowStart: 0, windowEnd: 600_000, msPerPx: 1_000 }
const base = { laneId: 'lead', laneIndex: 0, ...WINDOW }

const wait = (start: number, end: number | null, extra: Partial<LaneWait> = {}): LaneWait => ({
  start,
  end,
  sessionId: 'lead',
  ...extra,
})

describe('wait bands: the vertical place is the activity track (cross-check of the DOM numbers)', () => {
  it('reports y/h that match the constants and the browser measurement (17 / 10)', () => {
    const [band] = waitBandRects([wait(40_000, 45_000)], { ...base, laneY: 0 })
    expect(band?.y).toBe(ACTIVITY_TRACK_TOP)
    expect(band?.h).toBe(ACTIVITY_TRACK_HEIGHT)
    // Measured in the browser: y = 17, h = 10, and the 8px step at y = 18.
    expect(band?.y).toBe(17)
    expect(band?.h).toBe(10)
    // It is NOT the message track: MESSAGE_TRACK_TOP = 3, MESSAGE_TRACK_HEIGHT = 11.
    expect(band?.y).not.toBe(3)
    expect(band?.h).not.toBe(11)
  })

  it('offsets by laneY so lane 3 lands on ITS OWN activity track', () => {
    const [band] = waitBandRects([wait(40_000, 45_000)], { ...base, laneIndex: 3, laneY: 3 * 92 })
    expect(band?.y).toBe(3 * 92 + ACTIVITY_TRACK_TOP)
  })
})

describe('wait bands: semantics ui-2\'s file does not cover', () => {
  it('keeps BOTH of two overlapping waits in one lane (no merge, no dedupe)', () => {
    const bands = waitBandRects([wait(90_000, 110_000), wait(100_000, 115_000)], base)
    expect(bands).toHaveLength(2)
    expect(bands[0]).toMatchObject({ x: 90, w: 20, start: 90_000, end: 110_000 })
    expect(bands[1]).toMatchObject({ x: 100, w: 15, start: 100_000, end: 115_000 })
  })

  it('treats a non-finite end as OPEN, not as a closed zero-length band', () => {
    const [nan, missing] = waitBandRects(
      [wait(50_000, Number.NaN), { start: 50_000, sessionId: 'lead' } as unknown as LaneWait],
      base,
    )
    for (const band of [nan, missing]) {
      expect(band?.open).toBe(true)
      expect(band?.end).toBeNull()
      // open runs to the window end: (600_000 - 50_000) / 1000 = 550
      expect(band?.w).toBe(550)
    }
  })

  it('carries timedOut VERBATIM, including the undefined "could not read" state', () => {
    // The contract is explicit that guessing here becomes a false claim about what
    // an agent was doing, so `undefined` must survive rather than become `false`.
    const bands = waitBandRects(
      [wait(1_000, 2_000, { timedOut: true }), wait(3_000, 4_000, { timedOut: false }), wait(5_000, 6_000)],
      base,
    )
    expect(bands.map((band) => band.timedOut)).toEqual([true, false, undefined])
    expect(bands.map((band) => band.open)).toEqual([false, false, false])
  })

  it('keeps the REAL start when clipping to the left edge (the fact is not clamped)', () => {
    const [band] = waitBandRects([wait(-30_000, 10_000)], base)
    expect(band?.clippedLeft).toBe(true)
    expect(band?.x).toBe(0)
    expect(band?.w).toBe(10)
    expect(band?.start, 'the start epoch is a fact and must survive the clip').toBe(-30_000)
  })

  it('never emits a zero-width band, and survives an inverted interval', () => {
    const [zero] = waitBandRects([wait(20_000, 20_000)], base)
    expect(zero?.w, 'w is floored at 1px so the cap stays visible').toBe(1)
    const [inverted] = waitBandRects([wait(40_000, 30_000)], base)
    expect(inverted?.x).toBe(30) // min(startX, endX)
    expect(inverted?.w).toBe(10) // |Δ|
  })

  it('drops a wait that lies entirely AFTER the window', () => {
    // ui-2's file covers the before-window case; this is the mirror image and the
    // window test must be symmetric or a filtered board would keep future waits.
    expect(waitBandRects([wait(700_000, 800_000)], base)).toHaveLength(0)
    expect(waitBandRects([wait(599_000, 601_000)], base), 'straddling the right edge is kept').toHaveLength(1)
  })

  it('skips malformed entries instead of throwing', () => {
    const bands = waitBandRects(
      [null as unknown as LaneWait, { start: Number.NaN, end: 1_000, sessionId: 'x' } as LaneWait, wait(1_000, 2_000)],
      base,
    )
    expect(bands).toHaveLength(1)
    expect(bands[0]?.start).toBe(1_000)
  })
})
