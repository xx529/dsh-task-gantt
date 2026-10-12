/**
 * task-16 — independent locks for the four reported range-filter defects.
 *
 * Written by `verify` from my OWN fixture (the browser side of the same fixture
 * lives in /tmp/verify16/serve/demo/verify-range.*). Every number quoted in the
 * comments was measured; nothing here repeats a writer's summary.
 *
 * PRE-FIX BASELINE (measured in a real browser on the deployed pre-fix bundle
 * `7662893d9b0ad43ae7c18f1779746d3c`, my fixture, 248px host):
 *   range=all : 82 markers, 0 at the left edge, badges `+12`x37, legend 82/560
 *   range=15m : 8 markers at left edge 0, badges `+164`x3, legend 50/560
 *   coarsest  : 8 captions, each 18px wide while their subject scrollWidth was 42-68px
 *   flags     : 4 `.dtg-task-flag` reading 「实时」
 * POST-FIX (deployed bundle `917fceca426dbe57216cb66b9bc1ea53`): left-edge 0,
 * badges 0, legend absent, captions 0 at 600 s/px, flags 0.
 *
 * Node/vitest cannot see the DOM: these are pure-layout locks. The DOM numbers
 * above come from the browser run and are labelled as such.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { LaneColorTokens, MessageSpan, TimelineLane, TimelineResponse } from '../src/shared/contract.ts'
import {
  MESSAGE_MARKER_MIN_GAP_PX,
  TASK_LABEL_MIN_WIDTH,
  MESSAGE_MARKER_WIDTH,
  computeWindow,
  inWindow,
  layoutTimeline,
  rectVisible,
} from '../src/client/ui/timeline-layout.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VIEWPORT = { width: 248, laneHeight: 84, headerHeight: 28 }
const COLOR: LaneColorTokens = { bar: '--dsw-static-blue-600', on: '--dsw-static-neutral-bluish-00' }
const MINUTE = 60_000
const RANGE_15M = 15 * MINUTE
const RANGE_5M = 5 * MINUTE

/** Mirror of the browser fixture: 3 dense lanes + one lane that ends early. */
function fixture(): TimelineResponse {
  const now = 1_800_000_000_000
  const T0 = now - 180 * MINUTE
  const at = (minute: number): number => T0 + minute * MINUTE
  const lanes: TimelineLane[] = ['lead', 'lane-a', 'lane-b', 'lane-c'].map((id, index): TimelineLane => {
    // lane-c carries messages ONLY in the first 20 minutes: every one of them is
    // outside a 5m/15m window at the end of the span.
    const lastMinute = id === 'lane-c' ? 20 : 180
    const messages: MessageSpan[] = []
    const self = { kind: 'teammate' as const, id: `${id}-session`, name: id }
    const peer = { kind: 'teammate' as const, id: 'peer-session', name: 'peer' }
    for (let k = 1; k <= lastMinute; k += 1) {
      // Directions ALTERNATE, exactly like the browser fixture: otherwise every
      // marker on a lane is `outgoing` and the per-direction spacing rule below
      // cannot be exercised at all.
      const outgoing = k % 2 === 0
      messages.push({
        kind: 'message',
        time: at(k),
        end: null,
        from: outgoing ? self : peer,
        to: outgoing ? peer : self,
        preview: `msg ${k}`,
        messageId: `v-${index}-${k}`,
        sessionId: id,
      })
    }
    return {
      id,
      name: id,
      role: index === 0 ? ('lead' as const) : ('teammate' as const),
      hasHistory: true,
      status: 'idle',
      color: COLOR,
      navigation: { type: 'session' as const, value: `${id}-session` },
      spans: [{ kind: 'step' as const, start: at(2), end: at(178), step: index + 1 }],
      messages,
      tasks: [
        {
          id: `v-long-${index}`,
          revision: 2,
          subject: `长任务${index}`,
          description: '45 分钟',
          status: 'completed' as const,
          blockedBy: [],
          writeScopes: [],
          ready: true,
          writeScopeWarnings: [],
          laneId: id,
          history: [
            { time: at(30), action: 'created', revision: 1, sessionId: id },
            { time: at(75), action: 'completed', revision: 2, sessionId: id },
          ],
        },
        {
          id: `v-open-${index}`,
          revision: 1,
          subject: `进行中任务${index}`,
          description: '还在跑',
          status: 'in_progress' as const,
          blockedBy: [],
          writeScopes: [],
          ready: true,
          writeScopeWarnings: [],
          laneId: id,
          history: [{ time: at(150), action: 'created', revision: 1, sessionId: id }],
        },
      ],
    }
  })
  return {
    apiVersion: 1,
    sessionId: 'root-session',
    rootSessionId: 'root-session',
    generatedAt: now,
    live: true,
    range: { start: T0, end: null },
    source: 'live',
    notes: [],
    tasks: [],
    lanes,
  }
}

const NOW = 1_800_000_000_000
const data = fixture()
const window15 = computeWindow(data, NOW, RANGE_15M)

function layout(msPerPx: number, windowSpanMs: number | null = null, cull = false) {
  return layoutTimeline(data, VIEWPORT, { now: NOW, msPerPx, windowSpanMs, cull, tzOffsetMinutes: 0 })
}

describe('defect 1: the left edge must not collect messages from outside the range', () => {
  it('no marker sits at the window start unless its own time IS the window start', () => {
    const result = layout(100, RANGE_15M)
    const offenders = result.messages
      .filter((marker) => Math.abs(marker.viewX) < 0.5 && marker.time !== window15.start)
      .map((marker) => `${marker.key} time=${marker.time} winStart=${window15.start} viewX=${marker.viewX}`)
    // Pre-fix every out-of-window candidate was `clamp`ed to win.start, so this
    // list held 8 entries (and 8 markers had left edge exactly 0 in the browser).
    expect(offenders, `markers clamped onto the left edge:\n${offenders.join('\n')}`).toEqual([])
    // The legitimate boundary case must still be drawn at x === 0.
    const atStart = result.messages.filter((marker) => marker.time === window15.start)
    expect(atStart.length, 'the message exactly at win.start must be drawn').toBeGreaterThan(0)
    for (const marker of atStart) expect(marker.viewX).toBe(0)
  })

  it('a lane whose messages are ALL before the window contributes no marker and no band', () => {
    const result = layout(100, RANGE_15M)
    expect(result.messages.some((marker) => marker.laneId === 'lane-c'), 'lane-c is entirely out of range').toBe(false)
    const bandLanes = result.messageBands.map((band) => (band as { laneId?: string }).laneId)
    expect(bandLanes).not.toContain('lane-c')
    // The other three lanes DO have in-range messages, so their bands stay.
    expect(new Set(bandLanes)).toEqual(new Set(['lead', 'lane-a', 'lane-b']))
  })

  it('a lane straddling the window start keeps its band, with only in-range markers', () => {
    const result = layout(100, RANGE_15M)
    for (const marker of result.messages) {
      expect(inWindow(marker.time, marker.time, window15), `${marker.key} is out of range`).toBe(true)
    }
  })
})

describe('defect 2: omissions must count in-range candidates only', () => {
  it('reports NO omissions when every in-range message fits the window', () => {
    const result = layout(100, RANGE_15M)
    // Pre-fix `droppedBefore` counted candidates across the whole lane list, so the
    // badges read `+164` / `+173` on this fixture (browser) instead of nothing.
    expect(result.droppedMessageCount, 'no in-range message may be dropped as "before the window"').toBe(0)
  })

  it('drops nothing at 5m either', () => {
    expect(layout(100, RANGE_5M).droppedMessageCount).toBe(0)
  })

  it('does not inflate the marker count beyond the in-range total', () => {
    const result = layout(100, RANGE_15M)
    const inRange = data.lanes.reduce(
      (count, lane) => count + lane.messages.filter((message) => inWindow(message.time, message.time, window15)).length,
      0,
    )
    expect(result.messages.length).toBeLessThanOrEqual(inRange)
    expect(inRange, 'the fixture must actually have in-range messages').toBeGreaterThan(0)
  })
})

describe("defect 3 re-based: the label is INSIDE the box, or absent (user ruling)", () => {
  // The user deleted outside-box placement entirely ("只在条内画，装不下就较少显示
  // 的文本"). New contract, read from the source:
  //   labelPlacement = anchor === 'history' && w >= TASK_LABEL_MIN_WIDTH ? 'inside' : 'none'
  //   'inside' -> labelX === x, labelW === w ;  'none' -> labelX === x, labelW === 0
  // My fixture's completed task spans at(30) -> at(75) = 45 min = 2_700_000 ms, so
  //   w = 2_700_000 / msPerPx. Every zoom below is inside the sanity range
  //   [MIN_MS_PER_PX 50, MAX_MS_PER_PX 600_000], so nothing else clamps w.
  const TASK_MS = 45 * 60_000 // 2_700_000

  function completedTask(msPerPx: number) {
    const result = layout(msPerPx)
    const task = result.tasks.find((card) => card.anchor === 'history' && card.durationMs === TASK_MS)
    expect(task, `the 45-minute task must be laid out (msPerPx=${msPerPx})`).toBeDefined()
    return task as NonNullable<typeof task>
  }

  it('draws the label INSIDE when the box is at least TASK_LABEL_MIN_WIDTH wide', () => {
    // msPerPx = 50_000  =>  w = 2_700_000 / 50_000 = 54 px  >= 36
    const task = completedTask(50_000)
    expect(task.w).toBe(54)
    expect(task.w).toBeGreaterThanOrEqual(TASK_LABEL_MIN_WIDTH)
    expect(task.labelPlacement, 'w=54 >= 36 must be inside').toBe('inside')
    expect(task.labelX).toBe(task.x)
    expect(task.labelW).toBe(task.w)
    expect(task.labelW).toBe(54)
  })

  it('is INSIDE exactly AT the boundary (>= is inclusive)', () => {
    // msPerPx = 2_700_000 / 36 = 75_000  =>  w = exactly 36
    const task = completedTask(75_000)
    expect(task.w).toBe(TASK_LABEL_MIN_WIDTH)
    expect(task.labelPlacement, 'w === 36 is inclusive, so the label must be inside').toBe('inside')
    expect(task.labelW).toBe(TASK_LABEL_MIN_WIDTH)
  })

  it('drops the label entirely just BELOW the boundary', () => {
    // msPerPx = 2_700_000 / 35 = 77_142.857…  =>  w = 35 < 36
    const task = completedTask(2_700_000 / 35)
    expect(task.w).toBeCloseTo(35, 9)
    expect(task.w).toBeLessThan(TASK_LABEL_MIN_WIDTH)
    expect(task.labelPlacement).toBe('none')
    expect(task.labelW).toBe(0)
    expect(task.labelX, 'labelX stays the box edge even when nothing is drawn').toBe(task.x)
  })

  it('hides the label at the coarsest zoom (the browser measured 0 .dtg-task-caption)', () => {
    // 600_000 ms/px  =>  2_700_000 / 600_000 = 4.5 px  << 36
    const result = layout(600_000)
    expect(result.tasks.length, 'the tasks are still laid out').toBeGreaterThan(0)
    for (const task of result.tasks) {
      expect(task.labelPlacement, `${task.task.id} at 600 s/px`).toBe('none')
      expect(task.labelW).toBe(0)
    }
  })
})

describe('defect 4: the 「实时」 flag is gone (PROXY: the real check is the browser)', () => {
  it('the chart no longer renders a .dtg-task-flag element', () => {
    // PROXY. The browser measurement is authoritative: 4 flags pre-fix, 0 after
    // (`.dtg-task-flag` count in the deployed bundles). node/vitest has no DOM, so
    // the source text is the only thing assertable here.
    const source = readFileSync(resolve(ROOT, 'src/client/ui/GanttChart.tsx'), 'utf8')
    expect(source).not.toContain('dtg-task-flag')
  })

  it('the layout still knows an in-progress task is running (the fact was not deleted)', () => {
    // The flag was removed for being noise, but the underlying `live` fact must
    // survive — otherwise the open task could not stretch to the right edge.
    const open = layout(100).tasks.filter((task) => task.live)
    expect(open.length).toBeGreaterThan(0)
  })
})

describe('edge (a)/(b): the window predicate is inclusive on BOTH ends', () => {
  it('accepts a message exactly at win.start and exactly at win.end', () => {
    expect(inWindow(window15.start, window15.start, window15)).toBe(true)
    expect(inWindow(window15.end, window15.end, window15)).toBe(true)
    expect(inWindow(window15.start - 1, window15.start - 1, window15)).toBe(false)
    expect(inWindow(window15.end + 1, window15.end + 1, window15)).toBe(false)
  })

  // NOT ASSERTED, DELIBERATELY. A further boundary defect was FOUND here and
  // confirmed by the Lead as real but OUT OF SCOPE for this round, so the suite
  // must not encode it either way (an expectation would lock it in; an
  // `it.fails` would read as green). It is reported as a Phase-2 ✗ instead:
  //
  //   MEASURED on the post-fix bundle 917fceca426dbe57216cb66b9bc1ea53, frozen
  //   board + 15m filter, my fixture whose last message per lane is exactly at
  //   `range.end`: minutes 165-179 are drawn, 180 is not (hasMinute180 = 0,
  //   hasMinute165 = 3, legend and badges empty). Mechanism: `inWindow` is
  //   inclusive so the candidate passes the range filter, but the marker lands at
  //   `viewX === viewportWidth` (108.3 + 7.7 === 116.0 === layer width) and
  //   `rectVisible` is strict (`viewX < viewportWidth`), so `cull: true` drops it
  //   and it counts as neither drawn nor dropped. In a frozen board that last
  //   message is permanently invisible.
})

describe('marker spacing is per DIRECTION (the Lead\'s documented trade)', () => {
  it('keeps same-direction neighbours at least MESSAGE_MARKER_MIN_GAP_PX apart', () => {
    // My browser run saw 15 markers at 7.7px on one lane with zero omissions,
    // which looked like the 9px floor being ignored. It is not: the decimator
    // keeps a separate cursor and bucket per direction (`lastXByKind`), and its
    // doc says two markers of DIFFERENT directions may sit closer than gapPx
    // ("losing an entire direction to avoid a 2px overlap is the wrong trade").
    // My fixture alternates direction, so neighbours are 7.7px apart by design.
    // This lock pins the part that must still hold: same-direction spacing.
    const result = layout(8_000, RANGE_15M)
    // Group by LANE *and* direction: markers on different lanes share an x but are
    // on different rows, so a cross-lane gap means nothing. (My first version
    // grouped by direction only and "found" two neighbours 0px apart — they were
    // two lanes' markers at the same minute.)
    const groups = new Map<string, number[]>()
    for (const marker of result.messages) {
      const key = `${marker.laneId}|${marker.direction}`
      groups.set(key, [...(groups.get(key) ?? []), marker.viewX].sort((a, b) => a - b))
    }
    let checked = 0
    for (const [key, xs] of groups) {
      for (let index = 1; index < xs.length; index += 1) {
        const gap = xs[index]! - xs[index - 1]!
        expect(gap, `${key} neighbours at x=${xs[index - 1]} and x=${xs[index]} are ${gap}px apart`).toBeGreaterThanOrEqual(MESSAGE_MARKER_MIN_GAP_PX - 1e-6)
        checked += 1
      }
    }
    expect(checked, 'no same-lane, same-direction pair was checked').toBeGreaterThan(0)
    for (const direction of ['outgoing', 'incoming'] as const) {
      const total = result.messages.filter((marker) => marker.direction === direction).length
      expect(total, `the fixture must produce ${direction} markers`).toBeGreaterThan(1)
    }
  })

  it('allows different-direction neighbours closer than the gap (the documented trade)', () => {
    const result = layout(8_000, RANGE_15M)
    let crossed = 0
    const lanes = new Set(result.messages.map((marker) => marker.laneId))
    for (const laneId of lanes) {
      const byX = result.messages.filter((marker) => marker.laneId === laneId).map((marker) => ({ x: marker.viewX, direction: marker.direction })).sort((a, b) => a.x - b.x)
      for (let index = 1; index < byX.length; index += 1) {
        if (byX[index]!.direction !== byX[index - 1]!.direction && byX[index]!.x - byX[index - 1]!.x < MESSAGE_MARKER_MIN_GAP_PX) crossed += 1
      }
    }
    // Observed in the browser: 14 such pairs on a 15-marker lane. If this number
    // ever becomes 0 the per-direction split has been removed.
    expect(crossed, 'no different-direction pair is closer than the gap — the per-direction split may be gone').toBeGreaterThan(0)
  })
})

describe('edge (i): without a filter the fix is a no-op', () => {
  it('windowSpanMs = null is byte-identical to omitting it', () => {
    const withNull = layoutTimeline(data, VIEWPORT, { now: NOW, msPerPx: 93_000, windowSpanMs: null })
    const omitted = layoutTimeline(data, VIEWPORT, { now: NOW, msPerPx: 93_000 })
    expect(JSON.stringify(withNull.messages)).toBe(JSON.stringify(omitted.messages))
    expect(withNull.droppedMessageCount).toBe(omitted.droppedMessageCount)
    expect(withNull.messageCount).toBe(omitted.messageCount)
    // And the pre-fix browser numbers for this state (82 markers / legend 82/560)
    // must still hold: the filter path must not change the unfiltered path.
    expect(withNull.messages.length).toBeGreaterThan(0)
  })
})
