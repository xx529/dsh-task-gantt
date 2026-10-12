/**
 * task-18 — locks for the user's ruling "时间粒度最细到 5 秒" (MANUAL zoom only).
 *
 * The browser measurements behind these locks (my own fixture/page, my own 8792
 * server, bundle `947b266681dca6352a8fe16cb65e4fc0` = the artifact the Lead
 * named, footer `v0.2.10 · zoom-floor-5s`):
 *
 *   claim 1  all range, click 缩小 repeatedly  93 秒/像素 -> stops at 5 秒/像素
 *            after 8 clicks; scrollWidth 2162 (3h/5s = 2160 arithmetic)
 *   claim 2  5m range + 适应窗口                -> 3 秒/像素 (BELOW the floor),
 *            scrollWidth 127 vs clientWidth 116  ⇒ fit is NOT clamped
 *   claim 3  from that 3 s/px fit: one 缩小 click (finer) = NO-OP; one 放大
 *            click (coarser) -> 4 秒/像素  ⇒ the "jump 4x away" trap is defused
 *   claim 4  ctrl+wheel zoom-in stops at the same 5 秒/像素 (8 spins); at the
 *            3 s/px fit a ctrl+wheel zoom-in is a NO-OP and zoom-out moves
 *   claim 5  ceiling 600 秒/像素 still reachable (13 clicks from the floor)
 *   claim 6  15m: 27 markers, 0 at the left edge, 0 badges, 0 flags; at
 *            600 s/px: 0 captions  ⇒ previous round's fixes intact
 *
 * Only the pure halves are asserted here (node/vitest has no DOM); the DOM
 * numbers above come from the browser run.
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_MS_PER_PX,
  MIN_MS_PER_PX,
  MIN_ZOOM_MS_PER_PX,
  SECOND_MS,
  clampMsPerPx,
  clampZoomMsPerPx,
  fitMsPerPx,
} from '../src/client/ui/timeline-layout.ts'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const ZOOM_STEP = 1.5

describe('the manual floor is exactly 5 s/px', () => {
  it('is 5 seconds expressed in ms', () => {
    expect(MIN_ZOOM_MS_PER_PX).toBe(5_000)
    expect(MIN_ZOOM_MS_PER_PX).toBe(5 * SECOND_MS)
  })

  it('stops a finer request at 5 s/px when the current zoom is above it', () => {
    // 93_000 ms/px is the measured auto-fit of the 3h window in my 116px canvas.
    expect(clampZoomMsPerPx(93_000 / ZOOM_STEP, 93_000)).toBe(93_000 / ZOOM_STEP)
    expect(clampZoomMsPerPx(1_000, 93_000)).toBe(MIN_ZOOM_MS_PER_PX)
    expect(clampZoomMsPerPx(0.001, 600_000)).toBe(MIN_ZOOM_MS_PER_PX)
  })

  it('keeps the 600 s/px ceiling reachable', () => {
    expect(clampZoomMsPerPx(10_000_000, 600_000)).toBe(MAX_MS_PER_PX)
    expect(MAX_MS_PER_PX).toBe(600_000)
  })

  it('falls back to the sanitised CURRENT zoom for a nonsense request', () => {
    expect(clampZoomMsPerPx(Number.NaN, 93_000)).toBe(clampMsPerPx(93_000))
    expect(clampZoomMsPerPx(0, 93_000)).toBe(clampMsPerPx(93_000))
    expect(clampZoomMsPerPx(-5, 93_000)).toBe(clampMsPerPx(93_000))
  })
})

describe('fit-to-window stays BELOW the manual floor (the user constrained manual zoom only)', () => {
  it('fits a 5-minute window under 5 s/px without being raised to it', () => {
    // The canonical case from the task: 300_000 ms into a 116px canvas.
    const fit = fitMsPerPx(300_000, 116)
    expect(fit).toBeLessThan(MIN_ZOOM_MS_PER_PX)
    expect(fit).toBeGreaterThanOrEqual(MIN_MS_PER_PX)
    expect(Math.round(fit)).toBe(2_586)
    // The Lead's canvas is wider (380px host) and measured `1 秒/像素`; mine is
    // 116px and measured `3 秒/像素`. Both are below the floor — that is the
    // claim. The difference is canvas width, not a disagreement.
    expect(fitMsPerPx(300_000, 248)).toBeLessThan(MIN_ZOOM_MS_PER_PX)
  })

  it('leaves the layout input sanitiser on its OWN lower bound (50), not 5000', () => {
    // `clampMsPerPx` is shared by `fitMsPerPx` and `layoutTimeline`'s input
    // sanitisation; raising IT to the manual floor would clamp fit-to-window too.
    expect(MIN_MS_PER_PX).toBe(50)
    expect(clampMsPerPx(5)).toBe(MIN_MS_PER_PX)
    expect(clampMsPerPx(2_586)).toBe(2_586)
  })
})

describe('the trap: a zoom-in click from a sub-floor fit must not jump 4x away', () => {
  const fit = fitMsPerPx(300_000, 116) // 2586 ms/px, below the 5000 floor

  it('clamps onto the CURRENT zoom instead of the floor', () => {
    const requested = fit / ZOOM_STEP // what a zoom-in click asks for
    const next = clampZoomMsPerPx(requested, fit)
    expect(next).toBe(fit)
    // NOT 5000: a plain `clamp(value, 5000, …)` would answer a "move closer"
    // click by moving 1.9x AWAY (5000/2586), which is the reported trap.
    expect(next).not.toBe(MIN_ZOOM_MS_PER_PX)
  })

  it('is therefore a no-op at the call site (applyZoom returns early)', () => {
    // `applyZoom` does `if (next === effectiveMsPerPx) return`, so equality here
    // is exactly what makes the browser readout stay put.
    const next = clampZoomMsPerPx(fit / ZOOM_STEP, fit)
    expect(next === fit, 'equality is what turns the click into a no-op').toBe(true)
  })

  it('still moves when the request is COARSER (zooming out from a sub-floor fit)', () => {
    const coarser = clampZoomMsPerPx(fit * ZOOM_STEP, fit)
    expect(coarser).toBe(fit * ZOOM_STEP)
    expect(coarser).toBeGreaterThan(fit)
  })

  it('repeatedly zooming in never moves below the floor once above it', () => {
    let current = 93_000
    for (let i = 0; i < 40; i += 1) current = clampZoomMsPerPx(current / ZOOM_STEP, current)
    expect(current).toBe(MIN_ZOOM_MS_PER_PX)
    // 8 clicks were enough in the browser (93_000 * 1.5^-8 = 5413 -> floor).
    expect(93_000 / ZOOM_STEP ** 7).toBeGreaterThan(MIN_ZOOM_MS_PER_PX)
    expect(93_000 / ZOOM_STEP ** 8).toBeLessThan(MIN_ZOOM_MS_PER_PX)
  })
})

describe('both zoom inputs share the one clamp (PROXY: browser run is authoritative)', () => {
  const source = readFileSync(resolve(ROOT, 'src/client/ui/GanttChart.tsx'), 'utf8')

  it('applyZoom is the only place the manual clamp is applied', () => {
    expect([...source.matchAll(/clampZoomMsPerPx\(/g)]).toHaveLength(1)
    // Slice the applyZoom body out by its own boundaries (my first version sliced
    // to the first `useLayoutEffect`, which appears EARLIER in the file and
    // produced an empty string).
    const start = source.indexOf('const applyZoom = useCallback')
    const end = source.indexOf('const zoomByButton = useCallback')
    expect(start, 'applyZoom must exist').toBeGreaterThan(-1)
    expect(end, 'zoomByButton must exist').toBeGreaterThan(start)
    const applyZoom = source.slice(start, end)
    expect(applyZoom).toContain('clampZoomMsPerPx(')
    expect(applyZoom).toContain('if (next === effectiveMsPerPx) return')
  })

  it('the zoom buttons and the ctrl/meta wheel handler both route through applyZoom', () => {
    // Exactly two CALL sites: the wheel handler and the button path. (The
    // definition reads `const applyZoom = useCallback(` — no paren after the
    // name — so counting `applyZoom(` gives 2, not 3. My first expectation of 3
    // was wrong.)
    const calls = [...source.matchAll(/applyZoom\(/g)].length
    expect(calls).toBe(2)
    expect(source).toMatch(/if \(!\(event\.ctrlKey \|\| event\.metaKey\)\) return/)
    expect(source).toMatch(/applyZoom\(effectiveMsPerPx \* factor, event\.clientX/)
    expect(source).toMatch(/applyZoom\(effectiveMsPerPx \* factor, el === null \? 0 : el\.clientWidth \/ 2\)/)
  })

  it('the button titles keep the semantics the browser run measured', () => {
    // MEASURED: the button titled 缩小 DECREASES ms/px (finer, 93 -> 5) and the
    // one titled 放大 increases it (5 -> 600). i.e. the labels are about the
    // time GRANULARITY, not about zooming the picture — consistent with the
    // user's own wording ("时间粒度"). Recorded so a future relabel is deliberate.
    // Attribute ORDER in the JSX is `onClick` first, then `title` — my first
    // regex assumed the opposite and failed for that reason alone.
    expect(source).toMatch(/onClick=\{\(\) => zoomByButton\(1 \/ ZOOM_STEP\)\}[^>]*title=\{uiLabel\('zoomOut'\)\}/)
    expect(source).toMatch(/onClick=\{\(\) => zoomByButton\(ZOOM_STEP\)\}[^>]*title=\{uiLabel\('zoomIn'\)\}/)
  })
})
