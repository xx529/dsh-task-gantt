/**
 * task-19 — locks for the user's ruling "最小时间粒度改成 1s" (MANUAL zoom only).
 *
 * RE-DERIVED, not re-numbered. At the old 5 s/px floor a 5-minute window on a
 * 116px canvas (fit = 2586 ms/px) was a genuine sub-floor fit; at 1 s/px that
 * relation is INVERTED (2586 > 1000). A fixture must make the property it claims
 * actually reachable, so every case below states its window duration and canvas
 * width and shows the arithmetic.
 *
 * BROWSER MEASUREMENTS (my own fixture/page, my own :8792 server; bundle = the
 * deployed file with the first two loader shim lines stripped =
 * `cf92cc1212c2aabc496b04d25b080551`, byte-identical to repo `lib/client.js`, and
 * containing `MIN_ZOOM_MS_PER_PX = 1 * SECOND_MS`):
 *
 *   canvas 116px  (host 249)   'all' fit `93 秒/像素` -> after 24 finer clicks
 *                              `1 秒/像素`, scrollWidth 10832 = 10800 content + 32
 *                              lane head; 6 more clicks: 10833 (floor holds)
 *   canvas 116px               one coarser click from the floor -> 1500 ms/px
 *                              (scrollWidth 7222; 10800000/(7222-32) = 1502)
 *   canvas 1268px (host 1401)  coarsen to `9 秒/像素`, then finer clicks stop at
 *                              `1 秒/像素`, scrollWidth 10835 = 10800 + 35; 5 more
 *                              clicks: 10836 => the floor is canvas-independent
 *   canvas 1268px              5m range + 适应窗口 => `0.24 秒/像素` = 237 ms/px
 *                              = 300000/1268, i.e. BELOW the 1 s/px manual floor
 *   canvas 1268px              at that sub-floor fit: 缩小 = NO-OP (scrollWidth
 *                              1269 unchanged); 放大 moves to `0.35 秒/像素`
 *
 * FINDINGS REPORTED BUT DELIBERATELY NOT ASSERTED (an assertion would freeze
 * them; the task rule is not to lock a defect in):
 *   - the readout formats as integer seconds at or above 1 s/px and with two
 *     decimals below (`GanttChart.tsx`: `toFixed(effectiveMsPerPx < 1000 ? 2 : 0)`),
 *     so DISTINCT zooms can display the same text. Measured: while the readout
 *     read `2 秒/像素` the content width changed 6690 -> 4460 between two clicks,
 *     i.e. 1614 ms/px and 2421 ms/px are indistinguishable. Consequence: "click
 *     until the text stops" is NOT a valid floor check — my first attempt stopped
 *     at 1614 ms/px, 61% above the floor.
 *   - the source doc comment on `clampZoomMsPerPx` still says "(5 s/px)" and uses
 *     a 5m/248px example (~1.2 s/px) that is no longer sub-floor at a 1 s/px floor.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { LaneColorTokens, MessageSpan, TimelineLane, TimelineResponse } from '../src/shared/contract.ts'
import {
  MAX_MS_PER_PX,
  MIN_MS_PER_PX,
  MIN_ZOOM_MS_PER_PX,
  SECOND_MS,
  clampMsPerPx,
  clampZoomMsPerPx,
  fitMsPerPx,
  layoutTimeline,
} from '../src/client/ui/timeline-layout.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ZOOM_STEP = 1.5
const HOUR_MS = 3_600_000
/** The browser's own fit for the 3h window on the 116px canvas. */
const FIT_3H_116PX = fitMsPerPx(3 * HOUR_MS, 116)

describe('the manual floor is exactly 1 s/px', () => {
  it('is one second expressed in ms', () => {
    expect(MIN_ZOOM_MS_PER_PX).toBe(1_000)
    expect(MIN_ZOOM_MS_PER_PX).toBe(SECOND_MS)
  })

  it('stops a finer request at 1 s/px when the current zoom is above it', () => {
    expect(clampZoomMsPerPx(500, FIT_3H_116PX)).toBe(MIN_ZOOM_MS_PER_PX)
    expect(clampZoomMsPerPx(1, 600_000)).toBe(MIN_ZOOM_MS_PER_PX)
    // Above the floor there is no interference.
    expect(clampZoomMsPerPx(5_000, FIT_3H_116PX)).toBe(5_000)
  })

  it('keeps the 600 s/px ceiling reachable', () => {
    expect(clampZoomMsPerPx(10_000_000, 600_000)).toBe(MAX_MS_PER_PX)
    expect(MAX_MS_PER_PX).toBe(600_000)
  })

  it('falls back to the sanitised CURRENT zoom for a nonsense request', () => {
    expect(clampZoomMsPerPx(Number.NaN, FIT_3H_116PX)).toBe(clampMsPerPx(FIT_3H_116PX))
    expect(clampZoomMsPerPx(0, FIT_3H_116PX)).toBe(clampMsPerPx(FIT_3H_116PX))
    expect(clampZoomMsPerPx(-5, FIT_3H_116PX)).toBe(clampMsPerPx(FIT_3H_116PX))
  })

  it('needs 12 finer clicks from the browser fit to land on the floor', () => {
    // 93_103 / 1.5^11 = 1_076 > 1000 (still above), / 1.5^12 = 717 -> clamped to
    // 1000. The browser run used a fixed 24 clicks; the floor is reached at 12.
    expect(FIT_3H_116PX).toBe((3 * HOUR_MS) / 116) // exact: 93_103.448…
    expect(FIT_3H_116PX).toBeCloseTo(93_103, 0) // the readout shows `93 秒/像素`
    expect(FIT_3H_116PX / ZOOM_STEP ** 11).toBeGreaterThan(MIN_ZOOM_MS_PER_PX)
    expect(FIT_3H_116PX / ZOOM_STEP ** 12).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    let current = FIT_3H_116PX
    let clicks = 0
    while (current !== MIN_ZOOM_MS_PER_PX && clicks < 60) {
      current = clampZoomMsPerPx(current / ZOOM_STEP, current)
      clicks += 1
    }
    expect(current).toBe(MIN_ZOOM_MS_PER_PX)
    expect(clicks).toBe(12)
  })
})

describe('the fit path is never clamped by the MANUAL floor (either direction)', () => {
  it('keeps a fit that is FINER than the manual floor (below 1 s/px)', () => {
    // The case that replaced the old 5m/116px lock, which is now above the floor.
    // 300_000 ms into a 1268px canvas (host 1401 measured in the browser).
    const fit = fitMsPerPx(300_000, 1_268)
    expect(fit).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    expect(fit).toBe(300_000 / 1_268) // exact: 236.593…, readout `0.24 秒/像素`
    expect(fit).toBeCloseTo(237, 0)
    expect(fit).toBe(clampMsPerPx(300_000 / 1_268))
    // Another genuinely sub-floor case, with its arithmetic: 60_000 ms into 116px
    // = 517 ms/px.
    expect(fitMsPerPx(60_000, 116)).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    expect(fitMsPerPx(60_000, 116)).toBe(clampMsPerPx(60_000 / 116))
  })

  it('keeps a fit that is COARSER than the manual floor', () => {
    // 3h into 116px = 93_103 ms/px, the reading the browser showed as `93 秒/像素`.
    expect(fitMsPerPx(3 * HOUR_MS, 116)).toBeGreaterThan(MIN_ZOOM_MS_PER_PX)
    expect(fitMsPerPx(3 * HOUR_MS, 116)).toBe(clampMsPerPx((3 * HOUR_MS) / 116))
  })

  it('equals the SANITY clamp for every case, spanning both sides of the floor', () => {
    const cases: [number, number][] = [
      [1_000, 248], // 4 ms/px   -> sanity floor 50
      [5_000, 116], // 43 ms/px  -> sanity floor 50
      [60_000, 116], // 517 ms/px -> below the manual floor
      [300_000, 1_268], // 237 ms/px -> below the manual floor
      [300_000, 380], // 789 ms/px -> below the manual floor
      [300_000, 116], // 2586 ms/px -> above
      [3 * HOUR_MS, 116], // 93_103 ms/px -> above
      [3 * HOUR_MS * 100, 116], // 9.3M ms/px -> above the ceiling
    ]
    for (const [durationMs, widthPx] of cases) {
      const expected = clampMsPerPx(durationMs / widthPx)
      expect(fitMsPerPx(durationMs, widthPx), `${durationMs}ms / ${widthPx}px`).toBe(expected)
    }
    // The matrix really does straddle the manual floor.
    expect(cases.filter(([d, w]) => d / w < MIN_ZOOM_MS_PER_PX).length).toBeGreaterThan(0)
    expect(cases.filter(([d, w]) => d / w > MIN_ZOOM_MS_PER_PX).length).toBeGreaterThan(0)
  })

  it('keeps the sanity clamp on its OWN bound (50), not the manual floor', () => {
    expect(MIN_MS_PER_PX).toBe(50)
    expect(MIN_MS_PER_PX).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    expect(clampMsPerPx(5)).toBe(MIN_MS_PER_PX)
    expect(clampMsPerPx(500)).toBe(500)
  })
})

describe("layoutTimeline's own zoom input is not clamped by the manual floor", () => {
  const COLOR: LaneColorTokens = { bar: '--dsw-static-blue-600', on: '--dsw-static-neutral-bluish-00' }
  const VIEWPORT = { width: 248, laneHeight: 84, headerHeight: 28 }

  function oneLane(): TimelineResponse {
    const message: MessageSpan = {
      kind: 'message',
      time: 1_000,
      end: null,
      from: { kind: 'lead', id: 'lead-session', name: 'lead' },
      to: { kind: 'teammate', id: 'peer-session', name: 'peer' },
      preview: 'x',
      messageId: 'm-1',
      sessionId: 'lead',
    }
    const lane: TimelineLane = {
      id: 'lead',
      name: 'lead',
      role: 'lead',
      status: 'running',
      hasHistory: true,
      color: COLOR,
      navigation: { type: 'session', value: 'lead-session' },
      spans: [],
      tasks: [],
      messages: [message],
    }
    return {
      apiVersion: 1,
      sessionId: 'lead-session',
      rootSessionId: 'lead-session',
      generatedAt: 10_000_000,
      live: true,
      range: { start: 0, end: null },
      source: 'live',
      notes: [],
      tasks: [],
      lanes: [lane],
    }
  }

  const msPerPxOf = (requested: number): number =>
    layoutTimeline(oneLane(), VIEWPORT, { now: 10_000_000, msPerPx: requested }).msPerPx

  it('honours a zoom BETWEEN the sanity bound and the manual floor', () => {
    // 500 ms/px is finer than the 1 s/px manual floor. `layoutTimeline` must draw
    // at 500 — if the manual floor leaked into this path it would answer 1000.
    expect(msPerPxOf(500)).toBe(500)
    expect(msPerPxOf(800)).toBe(800)
    expect(msPerPxOf(999)).toBe(999)
  })

  it('still applies only the sanity bounds on both ends', () => {
    expect(msPerPxOf(5)).toBe(MIN_MS_PER_PX)
    expect(msPerPxOf(5_000)).toBe(5_000)
    expect(msPerPxOf(10_000_000)).toBe(MAX_MS_PER_PX)
  })

  it('is unrelated to the manual clamp: the same request IS raised on the zoom path', () => {
    // The separation, stated in one place: `clampZoomMsPerPx` raises 500 to 1000
    // while the layout input above keeps 500.
    expect(clampZoomMsPerPx(500, 93_103)).toBe(1_000)
    expect(msPerPxOf(500)).toBe(500)
  })
})

describe('the trap: a finer click from a sub-floor fit must be a no-op', () => {
  /** 5 minutes in a 380px canvas = 789 ms/px — genuinely below the 1 s/px floor. */
  const subFloorFit = fitMsPerPx(300_000, 380)

  it('clamps onto the CURRENT zoom instead of the manual floor', () => {
    expect(subFloorFit).toBe(300_000 / 380) // exact: 789.473…
    expect(subFloorFit).toBeCloseTo(789, 0)
    expect(subFloorFit).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    const requested = subFloorFit / ZOOM_STEP
    const next = clampZoomMsPerPx(requested, subFloorFit)
    expect(next).toBe(subFloorFit)
    expect(next).not.toBe(MIN_ZOOM_MS_PER_PX)
  })

  it('is therefore a no-op at the call site (applyZoom returns early)', () => {
    expect(clampZoomMsPerPx(subFloorFit / ZOOM_STEP, subFloorFit) === subFloorFit).toBe(true)
  })

  it('still moves coarser from a sub-floor fit', () => {
    expect(clampZoomMsPerPx(subFloorFit * ZOOM_STEP, subFloorFit)).toBe(subFloorFit * ZOOM_STEP)
  })

  it('in the browser (canvas 1268px) the 5m fit is 237 ms/px and 缩小 does nothing', () => {
    // Reproduces the measured pair: fit 237 ms/px -> 缩小 requested = 158 ms/px
    // -> clamped onto 237 (no-op); 放大 -> 355.5 ms/px, the readout's `0.35 秒/像素`.
    const fit = fitMsPerPx(300_000, 1_268)
    expect(clampZoomMsPerPx(fit / ZOOM_STEP, fit)).toBe(fit)
    expect(clampZoomMsPerPx(fit * ZOOM_STEP, fit)).toBeCloseTo(fit * ZOOM_STEP, 9) // 354.889…, readout `0.35 秒/像素`
  })
})

describe('both zoom inputs share the one clamp (PROXY: the browser run is authoritative)', () => {
  const source = readFileSync(resolve(ROOT, 'src/client/ui/GanttChart.tsx'), 'utf8')

  it('applyZoom is the only place the manual clamp is applied', () => {
    expect([...source.matchAll(/clampZoomMsPerPx\(/g)]).toHaveLength(1)
    const start = source.indexOf('const applyZoom = useCallback')
    const end = source.indexOf('const zoomByButton = useCallback')
    expect(start).toBeGreaterThan(-1)
    expect(end).toBeGreaterThan(start)
    const applyZoom = source.slice(start, end)
    expect(applyZoom).toContain('clampZoomMsPerPx(')
    expect(applyZoom).toContain('if (next === effectiveMsPerPx) return')
  })

  it('the zoom buttons and the ctrl/meta wheel handler both route through applyZoom', () => {
    expect([...source.matchAll(/applyZoom\(/g)]).toHaveLength(2)
    expect(source).toMatch(/if \(!\(event\.ctrlKey \|\| event\.metaKey\)\) return/)
    expect(source).toMatch(/applyZoom\(effectiveMsPerPx \* factor, event\.clientX/)
    expect(source).toMatch(/applyZoom\(effectiveMsPerPx \* factor, el === null \? 0 : el\.clientWidth \/ 2\)/)
  })

  it('the button titles keep the semantics the browser run measured', () => {
    // MEASURED: 缩小 DECREASES ms/px (finer) and 放大 increases it. The labels are
    // about time GRANULARITY, matching the user's own wording ("时间粒度").
    expect(source).toMatch(/onClick=\{\(\) => zoomByButton\(1 \/ ZOOM_STEP\)\}[^>]*title=\{uiLabel\('zoomOut'\)\}/)
    expect(source).toMatch(/onClick=\{\(\) => zoomByButton\(ZOOM_STEP\)\}[^>]*title=\{uiLabel\('zoomIn'\)\}/)
  })
})
