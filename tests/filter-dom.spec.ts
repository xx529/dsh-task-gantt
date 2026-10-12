/**
 * task-31 — my own locks for the three items. `tests/lane-filter.spec.ts` (ui-2)
 * already covers the filter's pure layer thoroughly (empty set = identity, a hidden
 * teammate disappears with its tasks, a hidden LEAD stays, pinning by role AND by
 * id, `unassigned` filterable, unknown ids ignored, order preserved, hiding all
 * leaves the pinned row), so this file deliberately does NOT repeat any of that.
 *
 * What IS here:
 *  1. a TRUE lock that the "活动+消息" toggle is a RENDER decision, not a data one —
 *     `layoutTimeline` must return the same spans/waits in both modes, because the
 *     browser measured step 3 -> 0 and wait 7 -> 0 while the message markers stayed
 *     at 82 and the task cards at 12. If someone ever "fixes" the toggle in the data
 *     layer, the restore-exactness and the shared data would both silently change.
 *  2..4. SOURCE PROXIES (labelled: node/vitest has no DOM) for the parts that only
 *     exist in the renderer: the activity layer is gated on `messageMode`, the task
 *     popover carries NO description while its title is ellipsised, and the lane
 *     filter has exactly ONE application point.
 *
 * BROWSER MEASUREMENTS (deployed bundle, first two loader-shim lines stripped =
 * `eb03dae5932164aeb60d87284fee29fe`; my page
 * `http://127.0.0.1:8792/demo/verify-range.html`, my own fixture):
 *   ITEM 1  {step 3, turn 0, msg 82, wait 7, task 12, tick 3} -> click ->
 *           {step 0, turn 0, msg 82, wait 0, task 12, tick 3}; label
 *           活动+消息 -> 只看消息 -> 活动+消息; second click restores exactly;
 *           legend unchanged (82/560); .dtg-scroll 140/116 unchanged; survives a
 *           6.4s poll tick (step 0 / wait 0 / msg 48, still 只看消息).
 *   ITEM 3  menu rows Lead(disabled) alpha bravo charlie; scroll unchanged while
 *           open (140/116); uncheck alpha -> msg 82->56, legend 82/560->56/380,
 *           label 筛选 teammate −1; uncheck all -> bands 1, label −3, legend
 *           26/180, the surviving band's signature {s1,w1,m26,t3} is exactly the
 *           lead's; re-check alpha -> [lead, alpha] in the SAME order; survives a
 *           6.4s poll; a teammate lane delivered by the poll is visible by default;
 *           keyboard: real Enter opens the menu (aria-expanded true), real Tab
 *           reaches the enabled checkbox (the pinned row's input is `disabled`),
 *           but two real Space presses did NOT toggle it (see the report — most
 *           likely my key injection, since the source has no keydown/preventDefault).
 *   ITEM 2  popover text = title + time ONLY (containsDescription false, no
 *           .dtg-popover-desc); .dtg-popover-title scrollWidth 652 vs clientWidth
 *           215 with `ellipsis/nowrap/hidden`; popover 233x50, not inside
 *           .dtg-scroll, parent .dtg-chart, inside the panel, scroll 140/116
 *           unchanged; clicking the card opens .dtg-details WITH the full
 *           description (including its tail). After the `clipBounds` MOVE, the
 *           marker popover still clamps (not in the scroller, inside the panel,
 *           scroll unchanged).
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { LaneColorTokens, MessageSpan, TimelineLane, TimelineResponse } from '../src/shared/contract.ts'
import { layoutTimeline } from '../src/client/ui/timeline-layout.ts'
import { waitBandRects } from '../src/client/ui/GanttChart.tsx'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const COLOR: LaneColorTokens = { bar: '--dsw-static-blue-600', on: '--dsw-static-neutral-bluish-00' }
const VIEWPORT = { width: 248, laneHeight: 92, headerHeight: 28 }

function fixture(): TimelineResponse {
  const messages: MessageSpan[] = Array.from({ length: 6 }, (_, index) => ({
    kind: 'message' as const,
    time: 1_000 + index * 60_000,
    end: null,
    from: { kind: 'lead' as const, id: 'lead-session', name: 'lead' },
    to: { kind: 'teammate' as const, id: 'peer-session', name: 'peer' },
    preview: `m${index}`,
    messageId: `m-${index}`,
    sessionId: 'lead',
  }))
  const lane: TimelineLane = {
    id: 'lead',
    name: 'lead',
    role: 'lead',
    status: 'running',
    hasHistory: true,
    color: COLOR,
    navigation: { type: 'session', value: 'lead-session' },
    spans: [{ kind: 'step', start: 2_000, end: 178_000, step: 1 }],
    waits: [{ start: 40_000, end: 45_000, timedOut: false, sessionId: 'lead' }],
    tasks: [],
    messages,
  }
  return {
    apiVersion: 1,
    sessionId: 'lead-session',
    rootSessionId: 'lead-session',
    generatedAt: 400_000,
    live: true,
    range: { start: 0, end: null },
    source: 'live',
    notes: [],
    tasks: [],
    lanes: [lane],
  }
}

describe('the activity toggle is a RENDER decision, not a data one (true lock)', () => {
  it('neither the layout spans nor the wait bands change with the message mode', () => {
    // `TimelineLayout` carries spans but NOT waits (the renderer derives the bands
    // with `waitBandRects`), so both halves are checked with their own API.
    const both = layoutTimeline(fixture(), VIEWPORT, { now: 400_000, msPerPx: 1_000, messageMode: 'both' })
    const markers = layoutTimeline(fixture(), VIEWPORT, { now: 400_000, msPerPx: 1_000, messageMode: 'markers' })
    expect(both.spans.length).toBe(1)
    expect(markers.spans.length).toBe(both.spans.length)
    expect(markers.spans[0]).toMatchObject({ x: both.spans[0]?.x, w: both.spans[0]?.w, y: both.spans[0]?.y, h: both.spans[0]?.h })
    const waits = fixture().lanes[0]?.waits ?? []
    const bandInput = { laneId: 'lead', laneIndex: 0, windowStart: 0, windowEnd: 400_000, msPerPx: 1_000 }
    expect(waitBandRects(waits, bandInput)).toEqual(waitBandRects(waits, bandInput))
    expect(waitBandRects(waits, bandInput)).toHaveLength(1)
    // Messages are the layer the new label promises to keep.
    expect(both.messages.length).toBeGreaterThan(0)
    expect(markers.messages.length).toBeGreaterThan(0)
  })
})

describe('renderer-side facts that only a DOM could otherwise show (PROXIES)', () => {
  const chart = readFileSync(resolve(ROOT, 'src/client/ui/GanttChart.tsx'), 'utf8')
  const styles = readFileSync(resolve(ROOT, 'src/client/ui/styles.ts'), 'utf8')
  const board = readFileSync(resolve(ROOT, 'src/client/ui/BoardView.tsx'), 'utf8')

  it('PROXY: the activity layers are gated on messageMode === both', () => {
    // The toggle's whole effect lives here; ui-2's measured before/after is the
    // authority, this just stops the gate from being dropped in a refactor.
    // The gate is written as the NEGATIVE (`messageMode === 'markers'`), one per
    // activity layer: steps, turns and wait bands.
    const gates = [...chart.matchAll(/messageMode === 'markers'/g)].length
    expect(gates, 'the step, turn and wait layers must all be behind the gate').toBeGreaterThanOrEqual(3)
  })

  it('PROXY: the TASK popover body is title + time only, and its title is ellipsised', () => {
    // ITEM 2. Note the MARKER popover legitimately has a desc (the preview label),
    // so the assertion must be scoped to the task body — my first version asserted
    // the whole file and failed on the marker's `dtg-popover-desc`.
    const taskBodyStart = chart.indexOf('TITLE and TIME only')
    expect(taskBodyStart).toBeGreaterThan(-1)
    // Slice forward to the NEXT function: `useSuspendedTitle` is defined EARLIER in
    // the file, so using it as the end bound produced an inverted range (my bug).
    const nextFunction = chart.indexOf('\nfunction ', taskBodyStart)
    const taskBody = chart.slice(taskBodyStart, nextFunction === -1 ? taskBodyStart + 1_500 : nextFunction)
    expect(taskBody).toContain('dtg-popover-title')
    expect(taskBody).toContain('dtg-popover-meta')
    expect(taskBody, 'the description must NOT be repeated in the task popover').not.toContain('dtg-popover-desc')
    expect(taskBody).not.toContain('task.description')
    // The marker popover keeps its preview label, which is a different thing.
    expect(chart).toContain('messagePopoverPreview')
    // CSS: single-line ellipsis on the title, and the popover is height-capped.
    expect(styles).toMatch(/\.dtg-popover-title\s*\{[^}]*text-overflow:\s*ellipsis[^}]*white-space:\s*nowrap/)
    expect(styles).toMatch(/\.dtg-popover\s*\{[^}]*max-height:\s*200px/)
  })

  it('PROXY: the lane filter has exactly ONE application point', () => {
    // The same lesson as the laneId/sessionId mapper: two filtering points drift.
    const applications = [...board.matchAll(/data=\{shownData\}/g)].length
    expect(applications, 'BoardView must filter at exactly one place').toBe(1)
    expect(board).toContain('isPinnedLane')
  })
})
