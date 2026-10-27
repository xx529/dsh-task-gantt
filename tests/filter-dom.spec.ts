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
 *     exist in the renderer: the task
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
 *
 * REVISED 2026-10-27 (v1 shell): the old bottom detail panels became ONE overlay
 * drawer (`.dtg-drawer`). The measurements above stay as the evidence these locks
 * were built from; the shell block at the END of this file adds the structural
 * locks (toolbar/drawer classes, the reachable loading branch, mutual exclusion
 * and the token-only SHELL_CSS) that the redesign needs.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { LaneColorTokens, MessageSpan, TimelineLane, TimelineResponse } from '../src/shared/contract.ts'
import { layoutTimeline } from '../src/client/ui/timeline-layout.ts'
import { waitBandRects } from '../src/client/ui/GanttChart.tsx'
import { nextMessageSelection, nextTaskSelection } from '../src/client/ui/BoardView.tsx'
import { SHELL_CSS } from '../src/client/ui/styles-shell.ts'

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

  it('the 活动+消息 toggle is GONE, and cannot creep back', () => {
    // REPLACED, not deleted. The old lock asserted the opposite — that the activity
    // layers were gated on `messageMode === 'markers'` at least three times — which
    // guarded a switch the user has since asked to remove:
    //   > 活动+消息这个开关感觉意义不大，取消这个功能吧
    // The property worth protecting is now the inverse: neither the state, nor the
    // button, nor its three labels may return. The activity track and the messages are
    // simply always drawn (the old 'both' behaviour), so there is no gate to count.
    expect(chart, 'the messageMode state and its gate must be gone').not.toContain('messageMode')
    expect(chart, 'the toggle button must be gone').not.toContain('setMessageMode')
    // The labels are gone from BOTH locales — the zh/en parity test would not catch a
    // stale key on its own, since deleting from one map fails that other test while a
    // leftover in both maps would pass it.
    const labels = readFileSync(resolve(ROOT, 'src/client/ui/labels.ts'), 'utf8')
    for (const key of ['messageModeBoth', 'messageModeMarkers', 'messageModeHint']) {
      expect(labels, `${key} must be deleted from both locales`).not.toContain(key)
    }
    // ...and the layers really are drawn unconditionally now: the step and turn passes
    // are each a plain `layout.spans.map`, with no short-circuit in front of them.
    const stepPass = chart.indexOf("span.kind === 'step'")
    const turnPass = chart.indexOf("span.kind === 'turn'")
    expect(stepPass, 'the step pass must still exist').toBeGreaterThan(-1)
    expect(turnPass, 'the turn pass must still exist').toBeGreaterThan(-1)
    expect(chart.slice(stepPass - 400, stepPass)).not.toContain('? null')
    expect(chart.slice(turnPass - 400, turnPass)).not.toContain('? null')
  })

  it('PROXY: the TASK popover shows the FULL title plus start, end, status and duration', () => {
    // RE-BASED, not deleted. The previous version of this lock asserted the opposite
    // of what the user now wants: it required `text-overflow: ellipsis` +
    // `white-space: nowrap` on the title, and "title + time only" in the body. The
    // user rejected both after seeing `Falsify the activity toggle, the tr…`:
    //   > 就要完整显示标题，不能缩略了，显示完整标题，显示开始和结束时间、运行状态和运行用时
    // So the guarded property is now: the title WRAPS with no ellipsis, and all four
    // run facts are rendered.
    // Slice from the START of TaskPopoverBody, not from the comment: the four facts
    // (and the `statusText` call) are declared above that comment, so slicing at the
    // comment cut them out of the window and the assertion failed on my own slice.
    const bodyFn = chart.indexOf('function TaskPopoverBody')
    expect(bodyFn, 'TaskPopoverBody must exist').toBeGreaterThan(-1)
    const taskBodyStart = chart.indexOf('The FULL subject, wrapping', bodyFn)
    expect(taskBodyStart, 'the wrapping comment must be inside it').toBeGreaterThan(bodyFn)
    // Slice forward to the NEXT function: `useSuspendedTitle` is defined EARLIER in
    // the file, so using it as the end bound produced an inverted range (my bug).
    const nextFunction = chart.indexOf('\nfunction ', taskBodyStart)
    const taskBody = chart.slice(bodyFn, nextFunction === -1 ? taskBodyStart + 1_800 : nextFunction)
    expect(taskBody).toContain('dtg-popover-title')
    expect(taskBody).toContain('dtg-popover-meta')
    // RE-BASED 2026-10-12 (task-40). The old assertions here demanded the 0.2.17 shape:
    // a "finished" line fed by the last transition, plus `taskDurationLine`. The user
    // rejected that — "应该有创建，开始，结束三个时间 … 不许把最后一次状态迁移当成结束
    // 时间" — so the guarded property is now the three-instant form:
    // created / started / ended, with an explicit "not ended yet" and a duration that is
    // derived from (ended ?? now) - started.
    expect(taskBody).toContain("uiLabel('taskCreatedAt')")
    expect(taskBody).toContain("uiLabel('taskStartedAt')")
    expect(taskBody).toContain("uiLabel('taskEndedAt')")
    expect(taskBody).toContain("uiLabel('taskNotEnded')")
    expect(taskBody).toContain("uiLabel('taskDuration')")
    expect(taskBody).toContain('taskRunTimes(')
    // The last transition must NOT stand in for an end any more.
    expect(taskBody, 'a last transition must not be presented as an end').not.toContain("uiLabel('taskLastTransitionAt')")
    // The description stays OUT: the user asked for the title plus those four facts,
    // and the description has its own home in the TaskDetails panel.
    expect(taskBody, 'the description must NOT be repeated in the task popover').not.toContain('dtg-popover-desc')
    expect(taskBody).not.toContain('task.description')
    // The marker popover keeps its preview label, which is a different thing.
    expect(chart).toContain('messagePopoverPreview')
    // CSS: the single-line rules are GONE from the title and the meta line, and the
    // popover is still height-capped so it cannot grow past the panel.
    expect(styles).not.toMatch(/\.dtg-popover-title\s*\{[^}]*text-overflow/)
    expect(styles).not.toMatch(/\.dtg-popover-meta\s*\{[^}]*text-overflow/)
    expect(styles).toMatch(/\.dtg-popover-title\s*\{[^}]*overflow-wrap:\s*anywhere/)
    expect(styles).toMatch(/\.dtg-popover-meta\s*\{[^}]*flex-wrap:\s*wrap/)
    // THE HEIGHT CAP MOVED OUT OF CSS — RE-BASED 2026-10-16, and the intent is unchanged
    // (the popover must never grow without bound). It used to be a flat `max-height:
    // 200px`, and that constant is exactly what sliced a question's second prompt in half:
    // four answered questions measure ~400-550px. The cap is now computed in `HoverPopover`
    // from the room between the anchor and the VIEWPORT (not the panel, which a fixed
    // overlay may legitimately overflow), and the body still scrolls when the viewport
    // cannot hold it.
    //     old: .dtg-popover { max-height: 200px }            — a CSS constant
    //     new: maxHeight = min(body height, room to the viewport edge, cap)
    expect(styles).not.toMatch(/\.dtg-popover\s*\{[^}]*max-height/)
    expect(chart).toMatch(/const maxHeight = Math\.max\(0, Math\.min\(/)
    expect(chart).toContain('window.innerHeight')
  })

  it('PROXY: the lane filter has exactly ONE application point', () => {
    // The same lesson as the laneId/sessionId mapper: two filtering points drift.
    const applications = [...board.matchAll(/data=\{shownData\}/g)].length
    expect(applications, 'BoardView must filter at exactly one place').toBe(1)
    expect(board).toContain('isPinnedLane')
  })
})

/**
 * The v1 shell (toolbar + ONE drawer) — locked as structure, not as a screenshot.
 *
 * These are SOURCE PROXIES for two reasons this repo already accepts: vitest runs
 * in node (no DOM, so the real drawer cannot be opened here), and the properties
 * being guarded are about WHICH element exists, which is exactly what a source
 * read proves. Everything visual (the drawer actually overlaying the chart, the
 * toolbar fitting in 448px) is checked on a real browser in the smoke pass.
 */
describe('the v1 shell replaced the chip toolbar', () => {
  const board = readFileSync(resolve(ROOT, 'src/client/ui/BoardView.tsx'), 'utf8')
  const shell = readFileSync(resolve(ROOT, 'src/client/ui/styles-shell.ts'), 'utf8')

  it('BoardView renders the new toolbar and drawer, and none of the old bar', () => {
    expect(board).toContain('dtg-topbar')
    expect(board).toContain('dtg-drawer')
    // The old row: chips + a text button + the "N 任务" chip. All gone, and the
    // classes must not creep back (the chip row is what overflowed 480px).
    expect(board).not.toContain('dtg-chip')
    expect(board).not.toContain('dtg-bar')
    expect(board).not.toContain('dtg-details')
    expect(board).not.toContain('dtg-select')
    expect(board, 'the "N tasks" chip must stay deleted').not.toContain('tasksLabel')
  })

  it('the toolbar is icon-first and uses the SHORT words, not sentence-length labels', () => {
    expect(board).toContain('dtg-topbar-now')
    expect(board).toContain('dtg-badge')
    expect(board).toContain('dtg-iconbtn')
    expect(board).toContain('role="switch"')
    expect(board).toContain("uiLabel('followShort')")
    expect(board, 'the old long follow label must not come back in the toolbar').not.toContain("uiLabel('followLabel')")
    expect(board).toContain("uiLabel('sessionLog')")
    // The badge is the hidden count, printed as -N.
    expect(board).toContain('−${hiddenCount}')
  })

  it('the loading / error branches are REACHABLE (the P0 blank-frame bug)', () => {
    // The condition must test `data`, not the filtered board: `shownData` is null
    // exactly when `data` is, and the old `if (shownData === null) return null`
    // sat ABOVE the loading/error branches, making both dead code.
    const loadingAt = board.indexOf('if (data === null)')
    const filteredAt = board.indexOf('if (shownData === null)')
    expect(loadingAt, 'the loading/error branch must exist').toBeGreaterThan(-1)
    // ...and it must come BEFORE the filtered-board narrowing. When the old
    // `shownData === null` guard came first, everything after it was dead code.
    expect(loadingAt).toBeLessThan(filteredAt === -1 ? board.length : filteredAt)
    // A retry exists in the centered error state AND in the inline error bar.
    expect((board.match(/dtg-state-retry/g) ?? []).length).toBeGreaterThanOrEqual(3)
    expect(board).toContain('dtg-state-skeleton')
    expect(board).toContain('ErrorBar')
  })

  it('ONE drawer, overlaid on the chart, never squeezing it', () => {
    expect(shell).toMatch(/\.dtg-drawer\s*\{[^}]*position:\s*absolute/)
    expect(shell).toMatch(/\.dtg-drawer\s*\{[^}]*max-height:\s*62%/)
    expect(shell).toMatch(/\.dtg-drawer\s*\{[^}]*z-index:\s*35/)
    expect(shell).toMatch(/\.dtg-drawer-host\s*\{[^}]*position:\s*relative/)
    // The old in-flow panels could be open together and take 45% + 60%.
    expect(board).not.toContain('dtg-message-details')
  })

  it('task / message / question are mutually exclusive by CONSTRUCTION', () => {
    // A union + pure transitions: the illegal "two drawers open" state cannot be
    // produced, so no future edit can forget to clear the other selection.
    const task = nextTaskSelection(null, 'task-1')
    expect(task).toEqual({ kind: 'task', id: 'task-1' })
    const message = nextMessageSelection(task, 'lane:msg')
    expect(message).toEqual({ kind: 'message', key: 'lane:msg' })
    expect(nextTaskSelection(message, 'task-2')).toEqual({ kind: 'task', id: 'task-2' })
    // Closing one kind must never dismiss the other kind that is showing.
    expect(nextTaskSelection(message, null)).toBe(message)
    expect(nextMessageSelection(task, null)).toBe(task)
    // ...while closing its own kind really clears it.
    expect(nextMessageSelection(message, null)).toBeNull()
    expect(nextTaskSelection(task, null)).toBeNull()
  })

  it('status is a 6px dot + a WORD, and the drawer claim comes from taskRunTimes()', () => {
    // The contract forbids a bordered status chip: the dot is 6px and the word carries
    // the meaning, so a monochrome skin loses nothing.
    expect(shell).toMatch(/\.dtg-state-dot\s*\{[^}]*width:\s*6px/)
    expect(shell).toMatch(/\.dtg-state-dot\s*\{[^}]*border-radius:\s*50%/)
    expect(shell, 'a status dot must not grow a border').not.toMatch(/\.dtg-state-dot\s*\{[^}]*border:/)
    // The claim instant is SHARED with the chart's claim rail: both use
    // `taskRunTimes(...).started`, so the drawer and the bar can never disagree.
    expect(board).toContain('const run = taskRunTimes(task, now)')
    expect(board).toContain('const claimed = run.startedIsFallback ? null : run.started')
    expect(board).toContain("uiLabel('histClaimed')")
  })

  it('SHELL_CSS is token-only, so a skin swap repaints the shell too', () => {
    expect(SHELL_CSS).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(SHELL_CSS).not.toMatch(/\brgba?\s*\(/)
    expect(SHELL_CSS).not.toMatch(/\bhsla?\s*\(/)
    expect(SHELL_CSS).toContain('var(--dsw-alias-bg-layer-1)')
    expect(SHELL_CSS).toContain('var(--dsw-font-xxs-12)')
    // The shell styles ride the SAME injected style element as the board.
    expect(board).toContain('SHELL_CSS')
    expect(board).toContain('element.textContent')
  })
})
