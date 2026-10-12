/**
 * Regression locks for the reported defects 1 (a + b) and 2 — "缩放后 icon
 * 定住不动并叠加" and "任务框长度给了最少值".
 *
 * PRE-FIX BASELINE (measured on `HEAD`, quoted verbatim so the "fails before"
 * claim is checkable rather than asserted):
 *
 *   src/client/ui/timeline-layout.ts @ HEAD
 *     key: message.messageId ?? `${lane.id}:${message.kind}:${time}:${keptIndex}`,
 *       → a bare `messageId`, so one message folded onto two lanes produced
 *         `msg:m2` TWICE in `layout.messages` and React logged
 *         "Encountered two children with the same key, msg:m2".
 *     visible: x + MESSAGE_MARKER_WIDTH >= 0 && x <= width,
 *       → CONTENT space, while the module header documents `viewX`.
 *     export const TASK_BAR_MIN_WIDTH = MIN_SPAN_PX      // == 2
 *       → the task bar LENGTH was floored at 2px.
 *
 * WHY THESE TESTS ARE PURE-LAYOUT: vitest runs with `environment: 'node'` and a
 * stubbed React (`tests/stubs/react.ts`: `useState` returns only its initial
 * value, `useEffect` never runs). So `GanttChart` renders its zero-viewport
 * branch and the marker elements are unreachable — every assertion here is on
 * `layoutTimeline`'s data, which is the same data the renderer consumes.
 */
import { describe, expect, it } from 'vitest'
import type { LaneColorTokens, MessageSpan, TimelineResponse } from '../src/shared/contract.ts'
import { MAX_MS_PER_PX, MIN_MS_PER_PX, TASK_BAR_MIN_WIDTH, layoutTimeline } from '../src/client/ui/timeline-layout.ts'

const VIEWPORT = { width: 600, laneHeight: 84, headerHeight: 28 }
const COLOR: LaneColorTokens = { bar: '--dsw-alias-state-idle-primary', on: '--dsw-alias-label-primary-inverted' }

function message(time: number, lane: string, peer: string, messageId?: string): MessageSpan {
  return {
    kind: 'message',
    time,
    end: null,
    from: { kind: 'teammate', id: lane, name: lane },
    to: { kind: 'teammate', id: peer, name: peer },
    preview: `preview ${messageId ?? time}`,
    ...(messageId === undefined ? {} : { messageId }),
    sessionId: lane,
  }
}

function lane(id: string, messages: MessageSpan[]) {
  return {
    id,
    name: id,
    role: 'teammate' as const,
    hasHistory: true,
    spans: [],
    color: COLOR,
    navigation: { type: 'session' as const, value: id },
    tasks: [],
    messages,
  }
}

/**
 * ONE message (`m2`) carried by BOTH lanes — the double-write that made the key
 * collide. `alpha` is the sender, `beta` the recipient.
 */
function exchange(id = 'm2'): TimelineResponse {
  const shared = message(5_000, 'alpha', 'beta', id)
  return {
    apiVersion: 1,
    sessionId: 'alpha',
    rootSessionId: 'alpha',
    generatedAt: 4_000_000,
    range: { start: 0, end: null },
    live: true,
    source: 'log',
    notes: [],
    tasks: [],
    lanes: [lane('alpha', [shared]), lane('beta', [shared])],
  }
}

function taskWith(from: number, to: number): TimelineResponse {
  const base = exchange()
  return {
    ...base,
    tasks: [
      {
        id: 'task-1',
        revision: 1,
        subject: 'subject',
        description: 'description',
        status: 'pending',
        blockedBy: [],
        writeScopes: [],
        ready: true,
        writeScopeWarnings: [],
        laneId: 'alpha',
        history: [
          { time: from, action: 'created', sessionId: 'alpha' },
          { time: to, action: 'completed', sessionId: 'alpha' },
        ],
      },
    ],
  }
}

describe('defect 1a: a message on two lanes must not share a React key', () => {
  it('gives every marker a non-empty key and NO duplicates across lanes', () => {
    const layout = layoutTimeline(exchange(), VIEWPORT, { now: 4_000_000, msPerPx: 100 })
    const keys = layout.messages.map((marker) => marker.key)

    // The double-write really happened (otherwise this test proves nothing).
    expect(layout.messages.length, 'the message must be drawn on BOTH lanes').toBe(2)

    expect(keys.every((key) => typeof key === 'string' && key.length > 0), `empty key in ${JSON.stringify(keys)}`).toBe(true)
    // THE LOCK: `new Set(keys).size` must equal `keys.length`. Pre-fix both were
    // `m2`, React reconciled a duplicate key list, and markers from an earlier
    // layout pass stayed on screen after a zoom ("icon 定住不动并叠加").
    expect(new Set(keys).size, `duplicate React key in ${JSON.stringify(keys)}`).toBe(keys.length)
  })

  it('qualifies the key with the lane, so the two copies stay distinguishable', () => {
    const layout = layoutTimeline(exchange(), VIEWPORT, { now: 4_000_000, msPerPx: 100 })
    for (const marker of layout.messages) {
      expect(marker.key, `key ${marker.key} must name its lane ${marker.laneId}`).toContain(marker.laneId)
    }
  })

  it('is stable: two identical calls return the same keys in the same order', () => {
    const options = { now: 4_000_000, msPerPx: 100 }
    const first = layoutTimeline(exchange(), VIEWPORT, options).messages.map((marker) => marker.key)
    const second = layoutTimeline(exchange(), VIEWPORT, options).messages.map((marker) => marker.key)
    expect(second).toEqual(first)
  })

  it('stays unique when the message carries NO messageId (the fallback path)', () => {
    // Calibration for the fallback: it already included the lane id pre-fix, so
    // this one cannot fail on the old code — it exists so a future edit cannot
    // make the fallback collide either.
    const anonymous = exchange('ignored')
    const shared = message(5_000, 'alpha', 'beta') // no messageId
    const layout = layoutTimeline(
      { ...anonymous, lanes: [lane('alpha', [shared]), lane('beta', [shared])] },
      VIEWPORT,
      { now: 4_000_000, msPerPx: 100 },
    )
    const keys = layout.messages.map((marker) => marker.key)
    expect(keys.length).toBe(2)
    expect(new Set(keys).size).toBe(2)
  })
})

describe('defect 1b: culling must use the VIEW space, in both directions', () => {
  /**
   * A window far wider than the viewport, so `x` (content) and `viewX` (view)
   * genuinely differ. The Lead's warning applies: at the auto-fit zoom
   * `dataWidth === viewportWidth` and a fixture whose two spaces agree proves
   * nothing, so the preconditions below assert that they differ.
   */
  function wideWindow(scrollLeft: number, messageTime: number, cull: boolean) {
    const layout = layoutTimeline(
      { ...exchange(), lanes: [lane('alpha', [message(messageTime, 'alpha', 'beta', 'm2')]), lane('beta', [])] },
      VIEWPORT,
      { now: 4_000_000, msPerPx: 100, scrollLeft, cull },
    )
    return layout
  }

  it('drops a marker pushed off the LEFT edge (pre-fix it stayed "visible")', () => {
    const layout = wideWindow(3_000, 5_000, false)
    const marker = layout.messages[0]
    expect(marker, 'the marker must exist with cull=false').toBeDefined()
    // Preconditions that make the two spaces DIFFERENT (else this is vacuous).
    expect(layout.contentWidth, 'content must overflow the viewport').toBeGreaterThan(VIEWPORT.width)
    expect(marker?.x).not.toBe(marker?.viewX)
    expect(marker?.viewX, 'the marker must sit left of the viewport').toBeLessThan(0)
    expect(marker?.x, 'yet its CONTENT x is still >= 0 — the old check kept it').toBeGreaterThanOrEqual(0)
    expect(marker?.visible, 'a rect left of the viewport is not visible').toBe(false)

    const culled = wideWindow(3_000, 5_000, true)
    expect(culled.messages, 'cull=true must DROP the off-screen marker').toHaveLength(0)
  })

  it('keeps a marker scrolled INTO view whose CONTENT x is beyond the viewport', () => {
    // x = 2050 (= 205s / 100ms-per-px) with scrollLeft 2000 ⇒ viewX = 50, inside
    // [0, 600]. The old CONTENT-space check (`x <= width`) culled it.
    const layout = wideWindow(2_000, 205_000, false)
    const marker = layout.messages[0]
    expect(marker, 'the marker must exist with cull=false').toBeDefined()
    expect(marker?.x, 'content x beyond the viewport is the point of this test').toBeGreaterThan(VIEWPORT.width)
    expect(marker?.viewX).toBeGreaterThanOrEqual(0)
    expect(marker?.viewX).toBeLessThanOrEqual(VIEWPORT.width)
    expect(marker?.visible, 'a rect inside the view must survive').toBe(true)

    const culled = wideWindow(2_000, 205_000, true)
    expect(culled.messages, 'cull=true must KEEP the on-screen marker').toHaveLength(1)
  })
})

describe('defect 2: the task bar length IS the duration', () => {
  /**
   * TWO PREMISES I GOT WRONG FIRST (Lead corrected both, with numbers):
   *
   *  1. `msPerPx: 5` is CLAMPED by the documented `clampMsPerPx` to
   *     `MIN_MS_PER_PX = 50`. My first matrix included a rung of 5 and compared
   *     against `duration / 5`, so every "offender" it printed was off by exactly
   *     10x — the clamp working as designed, not a defect. The ladder below only
   *     uses in-range zooms, and the clamp itself is pinned in its own test.
   *  2. `TASK_BAR_MIN_WIDTH` is 1, and it is a **device-hairline floor**, not a
   *     readability floor: a true width below one pixel is raised to 1px so the
   *     rect is renderable, moving the RIGHT edge by at most one sub-pixel while
   *     the LEFT edge stays exactly on the real start time. So exact equality is
   *     asserted only where the documentation says it applies
   *     (`duration / msPerPx >= 1`); below that the contract is the hairline.
   */
  const ZOOMS = [MIN_MS_PER_PX, 100, 1_000, 10_000, MAX_MS_PER_PX]
  const DURATIONS = [1_000, 5_000, 30_000, 300_000, 3_600_000]
  const effective = (requested: number): number => Math.max(MIN_MS_PER_PX, Math.min(MAX_MS_PER_PX, requested))

  function card(from: number, to: number, msPerPx: number) {
    const layout = layoutTimeline(taskWith(from, to), VIEWPORT, { now: 10_000_000, msPerPx })
    const rect = layout.tasks[0]
    expect(rect, 'the task must be drawn').toBeDefined()
    return { rect: rect as NonNullable<typeof rect>, layout }
  }

  it('is exactly duration / msPerPx wherever the true width is at least 1px', () => {
    const offenders: string[] = []
    for (const msPerPx of ZOOMS) {
      for (const duration of DURATIONS) {
        const { rect } = card(1_000, 1_000 + duration, msPerPx)
        expect(rect.durationMs, 'durationMs must be the real span').toBe(duration)
        const truth = duration / effective(msPerPx)
        if (truth >= 1) {
          if (Math.abs(rect.w - truth) > 1e-9) offenders.push(`msPerPx=${msPerPx} duration=${duration}: w=${rect.w} expected=${truth}`)
        } else {
          // Sub-pixel: the hairline floor is the contract, and the left edge must
          // still be the real start (asserted in its own test below).
          if (rect.w !== TASK_BAR_MIN_WIDTH) offenders.push(`msPerPx=${msPerPx} duration=${duration}: w=${rect.w} expected hairline ${TASK_BAR_MIN_WIDTH}`)
        }
      }
    }
    expect(offenders, `bar length is not the duration:\n${offenders.join('\n')}`).toEqual([])
  })

  it('keeps the hairline floor at ONE device pixel — the reported regression was 2', () => {
    // Pre-fix `TASK_BAR_MIN_WIDTH = MIN_SPAN_PX = 2`, so a short task drew a 2px
    // bar regardless of its duration. This is the regression lock for that value.
    expect(TASK_BAR_MIN_WIDTH).toBe(1)
    const { rect } = card(1_000, 2_000, 10_000) // truth 0.1px
    expect(rect.w).toBe(1)
    expect(rect.durationMs).toBe(1_000)
  })

  it('puts the LEFT edge on the true start time at every zoom (a floor may not move it)', () => {
    for (const msPerPx of ZOOMS) {
      const { rect, layout } = card(1_000, 2_000, msPerPx)
      expect(rect.x, `msPerPx=${msPerPx}`).toBeCloseTo((1_000 - layout.window.start) / layout.msPerPx, 9)
    }
  })

  it('never flattens the width: strictly increasing once the truth reaches 1px', () => {
    // THIS is the user's actual complaint — "视图粒度很大的时候…任务框的长度给了
    // 最少值，这样会有错觉". Sweep true widths 0.1px → 10px at one coarse zoom and
    // require the width to grow. The old 2px floor flattened 0.1/0.2/0.5/1.0/2.0
    // all to 2, which is exactly the "错觉"; with the 1px hairline only the
    // genuinely sub-pixel rows share a width.
    const msPerPx = 10_000
    const durations = [1_000, 2_000, 5_000, 10_000, 20_000, 50_000, 100_000]
    const widths = durations.map((duration) => card(1_000, 1_000 + duration, msPerPx).rect.w)
    const truths = durations.map((duration) => duration / msPerPx)

    for (let index = 1; index < widths.length; index += 1) {
      expect(widths[index]!, `w must never decrease (${widths[index - 1]} → ${widths[index]})`).toBeGreaterThanOrEqual(widths[index - 1]!)
      if (truths[index]! >= 1 && truths[index - 1]! >= 1) {
        expect(
          widths[index]!,
          `truth ${truths[index - 1]}px → ${truths[index]}px must grow the bar (a floor flattens these)`,
        ).toBeGreaterThan(widths[index - 1]!)
      }
    }
    // The flattening rows are now ONLY the genuinely sub-pixel ones, and they
    // share the hairline while their truths differ — the drawn width is floored,
    // the left edge is not (asserted in the test above). My first version of this
    // line compared the DRAWN width to 1 and failed for that reason.
    expect(truths[0]!).toBeLessThan(1)
    expect(widths[0]).toBe(TASK_BAR_MIN_WIDTH)
    expect(widths[widths.length - 1]).toBe(10)
  })

  it('clamps a too-small msPerPx up to MIN_MS_PER_PX (documented, not a defect)', () => {
    const layout = layoutTimeline(taskWith(1_000, 2_000), VIEWPORT, { now: 10_000_000, msPerPx: 5 })
    expect(MIN_MS_PER_PX).toBe(50)
    expect(layout.msPerPx).toBe(MIN_MS_PER_PX)
    // And the resulting bar is what that clamped zoom implies — the 10x I first
    // mistook for a bug: 1000ms / 50 = 20px.
    expect(layout.tasks[0]?.w).toBe(20)
  })

  it('a 1s task at 1000 ms/px is 1 px — the exact width the user asked for', () => {
    const { rect } = card(1_000, 2_000, 1_000)
    expect(rect.w).toBe(1)
  })

  it('scales proportionally: 10x the duration is 10x the bar (no text-derived cap or floor)', () => {
    const short = card(1_000, 6_000, 100).rect
    const long = card(1_000, 51_000, 100).rect
    expect(short.w).toBe(50)
    expect(long.w).toBe(500)
    expect(long.w / short.w).toBe(10)
    // Neither is clamped into the 148/260 TEXT widths any more.
    expect(short.w).toBeLessThan(148)
    expect(long.w).toBeGreaterThan(260)
  })
})
