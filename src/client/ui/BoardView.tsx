/**
 * The Task Gantt tab body: fetch → poll → render.
 *
 * Owner: teammate `shell-ui` (write scope `src/client/ui/BoardView.tsx`,
 * `src/client/ui/styles-shell.ts`, and the three specs that cover this shell).
 *
 * Responsibilities kept HERE (so {@link GanttChart} stays a pure render of one
 * response plus the interaction state):
 *   - one request per poll tick against the host route (`fetchTimeline`),
 *     PAUSED while the tab is not visible (`visible === false`) and refreshed
 *     immediately when it becomes visible again (guide §4.2). The route base
 *     comes from the shell (`routeBase` → `resolveHostRoute`), so a
 *     reverse-proxy page prefix and the desktop shell both keep working;
 *   - a 1s "now" tick, only while the payload is live (`live !== false`),
 *     which drives the toolbar's NOW pill and the chart's growing open spans;
 *   - the toolbar (session-log source, clickable NOW, range picker, follow
 *     switch, filter icon+badge, refresh) — one 40px row, icon-first, no chips;
 *   - the reachable loading / empty / error states and the inline error bar;
 *   - ONE bottom detail drawer (task / message / question) that overlays the
 *     chart instead of squeezing it. The three kinds are mutually exclusive by
 *     construction: a single `selection` state is either a task id or a message
 *     key, never both.
 *
 * The board's stylesheets are injected once (id `STYLE_ELEMENT_ID`) with a
 * mount refcount, because several tabs may render the same board and HMR may
 * unmount one of them while another stays mounted. `BOARD_CSS` (chart, owner:
 * Lead) and `SHELL_CSS` (toolbar + drawer, this file's sibling) share the SAME
 * style element, so there is one ownership counter and one cleanup path.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react'
import type {
  LaneNavigation,
  MessageSpan,
  QuestionDetail,
  QuestionItem,
  TimelineLane,
  TimelineResponse,
  TimelineTask,
} from '../../shared/contract.ts'
import { filterTimelineLanes, isPinnedLane } from './lane-filter.ts'
import { clipBounds, overlaySpace } from './overlay-position.ts'
import { BUILD_LABEL, MESSAGE_PREVIEW_MAX } from '../../shared/contract.ts'
import { fetchTimeline, type RouteBase } from '../api.ts'
import { t } from '../i18n.ts'
import { GanttChart } from './GanttChart.tsx'
import { uiLabel } from './labels.ts'
import { historyActionText, taskStatusText } from './status.ts'
import { taskRunTimes } from './task-times.ts'
import { BOARD_CSS, STYLE_ELEMENT_ID } from './styles.ts'
import { SHELL_CSS } from './styles-shell.ts'
import {
  formatClock,
  formatDateTime,
  formatDuration,
  messageDetail,
  resolveMessageDirection,
  speakerLaneMapper,
} from './timeline-layout.ts'

/**
 * Time-range presets. The value is a DURATION, not a pair of timestamps: the
 * window's right edge stays whatever the board says it is (NOW while live), so a
 * preset means "the last N", never "this fixed slice of the past".
 */
const WINDOW_SPAN_PRESETS: readonly { ms: number; label: string }[] = [
  { ms: 5 * 60_000, label: '5m' },
  { ms: 15 * 60_000, label: '15m' },
  { ms: 30 * 60_000, label: '30m' },
  { ms: 60 * 60_000, label: '1h' },
  { ms: 3 * 60 * 60_000, label: '3h' },
]

/** Poll cadence while the tab is visible (the host folds the log on demand). */
const POLL_MS = 5_000
/** Cadence of the NOW marker while the board is live. */
const NOW_MS = 1_000

export interface BoardViewProps {
  sessionId: string
  visible: boolean
  /**
   * Optional shell-injected route resolver, so the panel follows the page's
   * real transport base (reverse-proxy sub-path / desktop shell). The shell
   * passes `(path) => resolveHostRoute(path, sidebar)` from `src/client/index.ts`;
   * when absent, `api.ts` falls back to `resolveHostRoute(path)` itself.
   */
  routeBase?: RouteBase
  /**
   * Optional shell-injected session opener, called when a lane head is clicked.
   *
   * The shell owns the `uiWorkspace` lookup and does it at CLICK time (that
   * service may arrive later), so this callback cannot be pre-resolved here:
   * `false` or a throw means "the host did not take it" and the panel degrades
   * silently. A lane with no `navigation` is never rendered as clickable at all.
   */
  navigate?: (target: LaneNavigation) => boolean
}

/**
 * WHICH detail is open. Deliberately ONE value rather than two independent ids:
 * the contract requires the task / message / question drawers to be mutually
 * exclusive ("三个抽屉互斥，同一时刻只有一个"), and a union makes the illegal
 * state (both open) unrepresentable instead of something to remember to clear.
 */
export type DrawerSelection =
  | { readonly kind: 'task'; readonly id: string }
  | { readonly kind: 'message'; readonly key: string }
  | null

/**
 * Open or close the TASK drawer.
 *
 * `null` closes only when a task was open, so a stray "clear the task" from the
 * chart cannot dismiss a message drawer that is already showing.
 *
 * @param previous - the current selection.
 * @param taskId - the task to open, or `null` for "close the task drawer".
 */
export function nextTaskSelection(previous: DrawerSelection, taskId: string | null): DrawerSelection {
  if (taskId === null) return previous !== null && previous.kind === 'task' ? null : previous
  return { kind: 'task', id: taskId }
}

/**
 * Open or close the MESSAGE/QUESTION drawer. Mirrors {@link nextTaskSelection}:
 * opening one kind replaces the other, closing only clears its own kind.
 *
 * @param previous - the current selection.
 * @param key - the marker key to open, or `null` for "close the message drawer".
 */
export function nextMessageSelection(previous: DrawerSelection, key: string | null): DrawerSelection {
  if (key === null) return previous !== null && previous.kind === 'message' ? null : previous
  return { kind: 'message', key }
}

/**
 * Which drawer a selected message marker opens.
 *
 * A question marker that CARRIES its parsed detail opens the question drawer;
 * everything else — including a `question` marker whose payload lost the detail
 * (a degraded host) — keeps the generic message drawer, so the full body is still
 * readable instead of an empty question block. Pure, so the rule can be tested
 * without a DOM (the drawer itself is only reachable in a browser).
 *
 * @param message - the selected message span.
 */
export function messageDrawerKind(message: MessageSpan): 'question' | 'message' {
  return message.kind === 'question' && message.question !== undefined ? 'question' : 'message'
}

/** Stylesheet mount refcount; the element is shared by every board instance. */
let styleMounts = 0

/**
 * The teammate filter's checkbox menu.
 *
 * Rendered as a FIXED-positioned sibling of the toolbar rather than an absolutely
 * positioned child, for the trap this repository has paid for twice: an absolutely
 * positioned descendant adds to its ancestor's scrollable overflow. Measured with the
 * menu open, `.dtg-scroll`'s scrollWidth/clientWidth must equal the closed values; a
 * child of the toolbar would also be CLIPPED by the panel, since the toolbar is as
 * narrow as the panel.
 *
 * Placement comes from the shared `clipBounds`, so the menu is clamped into the first
 * ancestor that really clips instead of the (much wider) viewport.
 *
 * @param anchor - the button the menu hangs from.
 * @param lanes - the board's lanes, in board order.
 * @param hidden - the hidden lane ids.
 * @param onToggle - flips one lane's visibility.
 * @param onClose - called for Escape and for a click outside.
 */
function LaneFilterMenu({
  anchor,
  lanes,
  hidden,
  workingOnly,
  onToggle,
  onToggleWorking,
  onClose,
}: {
  anchor: HTMLElement
  lanes: readonly TimelineLane[]
  hidden: ReadonlySet<string>
  workingOnly: boolean
  onToggle: (laneId: string) => void
  onToggleWorking: () => void
  onClose: () => void
}): ReactNode {
  const ref = useRef<HTMLDivElement | null>(null)
  /** Fixed positioning means a scroll would strand the menu; close instead. */
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    const onPointer = (event: MouseEvent): void => {
      const target = event.target as Node | null
      // The button itself toggles, so let its own click handle that case.
      if (target !== null && (ref.current?.contains(target) === true || anchor.contains(target))) return
      onClose()
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('mousedown', onPointer)
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('mousedown', onPointer)
    }
  }, [anchor, onClose])

  const rect = anchor.getBoundingClientRect()
  /**
   * THE VIEWPORT IS THE BOUND, not the panel.
   *
   * 0.2.26 clamped the menu into the outermost clipping ancestor (the panel) so it
   * could not be cut off by the panel's edge. That fix had a side effect on SHORT panels: the
   * available height drove `maxHeight` towards zero, so in a bottom-docked panel the menu
   * became invisible — the user's "在矮的面板里点了没反应，够高的时候才见到", with a
   * screenshot of the nine checkboxes proving the click HAD worked.
   *
   * A dropdown is allowed to overflow its panel; `position: fixed` gives it that freedom,
   * and the previous fix was us clamping it back in. So the bound is the WINDOW:
   *   - room is measured from the trigger to the window's edges;
   *   - the menu flips to the side with more room;
   *   - it keeps a MINIMUM usable height (≈3 rows) and scrolls internally, so it can never
   *     collapse to zero or become untouchable.
   */
  const MARGIN = 6
  /** ~3 rows, so the menu is always recognisable and scrollable rather than a sliver. */
  const MIN_USABLE_H = 90
  const MAX_H = 240
  /**
   * WHERE `top`/`left` ARE MEASURED FROM.
   *
   * They are viewport coordinates only while `position: fixed` resolves against the
   * viewport. An ancestor with `transform` / `filter` / `perspective` / `contain` /
   * `will-change: transform` becomes the containing block instead, and then the same
   * numbers land offset by that ancestor's own viewport position — measured on a
   * synthesised case: inline `left: 955` rendered at viewport `x=1555`, i.e. +600, the
   * wrapper's left edge. That is the reported "菜单不在点击处的下方".
   *
   * `overlaySpace` returns the subtraction that cancels it, plus the bounds expressed in
   * the same space so the room/flip/clamp arithmetic below stays correct for a docked
   * panel whose wrapper is smaller than the window.
   */
  const space = overlaySpace(anchor)
  const boundsW = space.bounds.width
  const boundsH = space.bounds.bottom - space.bounds.top
  // Trigger position relative to the containing block (== viewport when there is none).
  const relTop = rect.top - space.offsetY
  const relLeft = rect.left - space.offsetX
  const relBottom = relTop + rect.height
  const width = Math.min(240, Math.max(120, boundsW - 2 * MARGIN))
  const roomBelow = boundsH - relBottom - 2 * MARGIN
  const roomAbove = relTop - 2 * MARGIN
  // Flip only when below cannot hold the menu AND above is genuinely better.
  const flipAbove = roomBelow < MAX_H && roomAbove > roomBelow
  const room = Math.max(0, flipAbove ? roomAbove : roomBelow)
  const maxHeight = Math.max(MIN_USABLE_H, Math.min(MAX_H, room))
  /**
   * Horizontal, and the PRIORITY ORDER is deliberate:
   *   1. ALIGN WITH THE TRIGGER'S LEFT EDGE when it fits (`relLeft + width` is inside the
   *      space). This is the normal case and what "under the button" means.
   *   2. Only when it would overflow is it clamped back inside the space. That fallback is
   *      approved: a transformed containing block can be NARROWER than the menu (measured:
   *      420px space, 240px menu, trigger 181px from the space's left edge), and aligning
   *      there would push the menu past the ancestor's right edge, where it is clipped.
   * So a narrow space costs left-alignment, never visibility.
   */
  const maxLeft = Math.max(MARGIN, boundsW - width - MARGIN)
  const left = relLeft + width <= boundsW - MARGIN ? Math.max(MARGIN, relLeft) : maxLeft
  /**
   * Positioned with `top` only (a `bottom` offset is measured from the containing block's
   * bottom, which misplaced the menu badly on a docked panel). When flipped, the menu sits
   * `MARGIN` above the trigger.
   */
  const style: CSSProperties = {
    left,
    top: flipAbove ? relTop - MARGIN - maxHeight : relBottom + MARGIN,
    maxHeight,
    width,
  }

  // Pinned first, then the filterable lanes in board order.
  const pinned = lanes.filter((lane) => isPinnedLane(lane))
  const filterable = lanes.filter((lane) => !isPinnedLane(lane))

  return (
    <div className="dtg-menu" style={style} ref={ref} role="group" aria-label={uiLabel('laneFilterLabel')}>
      {/*
        The SPECIAL row, above the per-teammate checkboxes and visually distinct from
        them: it is a mode, not one more lane. The user: "上面筛选 teammate 地方，多一个
        特殊的筛选就是筛选当前正在工作中的".

        It is a `role="switch"` with a painted track rather than a checkbox, so it does
        not read as "another teammate to tick", and it carries an explicit state word
        (开/关 via aria-checked + the track) so the visual difference is not the only cue.
      */}
      <button
        type="button"
        className={workingOnly ? 'dtg-menu-mode dtg-menu-mode-on' : 'dtg-menu-mode'}
        onClick={onToggleWorking}
        role="switch"
        aria-checked={workingOnly}
        aria-label={uiLabel('laneFilterWorking')}
      >
        <span className="dtg-menu-mode-track" aria-hidden="true">
          <span className="dtg-menu-mode-knob" aria-hidden="true" />
        </span>
        <span className="dtg-menu-mode-label">{uiLabel('laneFilterWorking')}</span>
      </button>
      <div className="dtg-menu-sep" aria-hidden="true" />
      {pinned.map((lane) => (
        <div className="dtg-menu-row dtg-menu-row-pinned" key={lane.id}>
          <input type="checkbox" checked disabled aria-label={`${lane.name} · ${uiLabel('laneFilterPinned')}`} readOnly />
          <span className="dtg-menu-name">{lane.name}</span>
          <span className="dtg-menu-note">{uiLabel('laneFilterPinned')}</span>
        </div>
      ))}
      {/* No "nothing to filter" row: if every lane is pinned there is nothing this
          control can do, and the button still reports the state. */}
      {filterable.map((lane) => (
        <label className="dtg-menu-row" key={lane.id}>
          <input
            type="checkbox"
            checked={!hidden.has(lane.id)}
            onChange={() => onToggle(lane.id)}
            aria-label={lane.name}
          />
          <span className="dtg-menu-name">{lane.name}</span>
        </label>
      ))}
    </div>
  )
}

function useBoardStyles(): void {
  useEffect(() => {
    if (typeof document === 'undefined') return
    let element = document.getElementById(STYLE_ELEMENT_ID)
    if (element === null) {
      element = document.createElement('style')
      element.id = STYLE_ELEMENT_ID
      element.setAttribute('data-dsh-task-gantt', '')
      document.head.appendChild(element)
    }
    // ONE element, two owners: the chart's CSS is read-only here and the shell's CSS
    // is appended, so the refcount below still governs exactly one node.
    element.textContent = `${BOARD_CSS}\n${SHELL_CSS}`
    styleMounts += 1
    return () => {
      styleMounts -= 1
      if (styleMounts <= 0) document.getElementById(STYLE_ELEMENT_ID)?.remove()
    }
  }, [])
}

/* ------------------------------------------------------------------ icons */

/** The filter funnel. Inline SVG, so no asset is requested and the ink is currentColor. */
function FilterIcon(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2.5 3.5h11l-4.2 5v4.1l-2.6-1.5V8.5z" />
    </svg>
  )
}

/** The refresh glyph: a circular arrow, the conventional "fetch again" affordance. */
function RefreshIcon(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M13 8a5 5 0 1 1-1.6-3.7" />
      <path d="M13 2.6v3.2H9.8" />
    </svg>
  )
}

/** The drawer's close X. A glyph rather than text so it cannot be mistaken for a label. */
function CloseIcon(): ReactNode {
  return (
    <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round">
      <path d="M3.8 3.8l8.4 8.4M12.2 3.8l-8.4 8.4" />
    </svg>
  )
}

/** The empty state's glyph: an empty timeline (a row of ticks with nothing on it). */
function EmptyIcon(): ReactNode {
  return (
    <svg viewBox="0 0 20 20" width={18} height={18} aria-hidden="true" focusable="false" fill="none" stroke="currentColor" strokeWidth={1.4} strokeLinecap="round">
      <path d="M3 6.2h14M3 10h9M3 13.8h6" />
    </svg>
  )
}

/* ----------------------------------------------------------------- toolbar */

/**
 * The 40px toolbar.
 *
 * Deliberately icon-first and text-free for its controls (the old row could not
 * fit its own labels inside 448px): a dot + the word "会话日志" for provenance, a
 * clickable NOW pill, the range picker, the follow switch, then icon-only filter
 * and refresh buttons. The chip that used to print "N 任务" is gone — the lane
 * heads already report their counts and the row was the thing being clipped.
 */
function TopBar({
  timeline,
  now,
  tzOffsetMinutes,
  windowSpanMs,
  follow,
  hiddenCount,
  workingOnly,
  filterOpen,
  filterButtonRef,
  onToggleFollow,
  onChangeSpan,
  onToggleFilter,
  onRefresh,
  onJumpToNow,
}: {
  timeline: TimelineResponse | null
  now: number
  tzOffsetMinutes: number
  windowSpanMs: number | null
  follow: boolean
  hiddenCount: number
  workingOnly: boolean
  filterOpen: boolean
  filterButtonRef: RefObject<HTMLButtonElement>
  onToggleFollow: () => void
  onChangeSpan: (value: string) => void
  onToggleFilter: () => void
  onRefresh: () => void
  onJumpToNow: () => void
}): ReactNode {
  const live = timeline !== null && timeline.live !== false
  const source = timeline?.source ?? 'log'
  const sourceHint =
    timeline === null ? t('sourceLog') : [t('sourceLog'), t('sourcePartial'), t('sourceLive')].join(' / ')
  const nowText = formatClock(now, tzOffsetMinutes, { seconds: false })
  const endedAt = timeline === null ? now : timeline.range.end ?? timeline.generatedAt
  const filterState = [
    hiddenCount === 0 ? null : `−${hiddenCount}`,
    workingOnly ? uiLabel('laneFilterWorkingActive') : null,
  ]
    .filter((part) => part !== null)
    .join(' · ')
  const filterAria =
    filterState === '' ? uiLabel('laneFilterLabel') : `${uiLabel('laneFilterLabel')} · ${filterState}`

  return (
    <div className="dtg-topbar" role="toolbar" aria-label={t('tabTitle')}>
      {/* Provenance is a DOT + a WORD: colour alone is never the signal, and the
          full source wording lives in the tooltip instead of eating the row. */}
      <span className="dtg-topbar-source" data-source={source} title={sourceHint}>
        <span className="dtg-topbar-dot" aria-hidden="true" />
        <span className="dtg-topbar-word">{uiLabel('sessionLog')}</span>
      </span>

      {timeline === null ? null : live ? (
        <button
          type="button"
          className="dtg-topbar-now"
          data-live="true"
          onClick={onJumpToNow}
          title={uiLabel('jumpToNow')}
          aria-label={`${uiLabel('jumpToNow')} ${uiLabel('nowLabel')} ${nowText}`}
        >
          <span className="dtg-topbar-now-label">{uiLabel('nowLabel')}</span>
          <span className="dtg-topbar-now-time">{nowText}</span>
        </button>
      ) : (
        <span className="dtg-topbar-now" data-live="false" title={uiLabel('frozenHint')}>
          <span className="dtg-topbar-now-label">{uiLabel('endedLabel')}</span>
          <span className="dtg-topbar-now-time">{formatClock(endedAt, tzOffsetMinutes, { seconds: false })}</span>
        </span>
      )}

      <span className="dtg-topbar-spacer" />

      {timeline === null ? null : (
        <>
          <select
            className="dtg-topbar-select"
            aria-label={uiLabel('rangeLabel')}
            title={uiLabel('rangeHint')}
            value={windowSpanMs === null ? 'all' : String(windowSpanMs)}
            onChange={(event) => onChangeSpan(event.target.value)}
          >
            <option value="all">{uiLabel('rangeAllTimes')}</option>
            {WINDOW_SPAN_PRESETS.map((preset) => (
              <option key={preset.ms} value={String(preset.ms)}>
                {preset.label}
              </option>
            ))}
          </select>

          {/* A real switch (role="switch" + painted track), not a checkbox: the
              state word stays in the aria-label and the track shows ON/OFF. */}
          <button
            type="button"
            className="dtg-switch"
            role="switch"
            aria-checked={follow}
            aria-label={uiLabel('followShort')}
            onClick={onToggleFollow}
            title={uiLabel('followHint')}
          >
            <span className="dtg-switch-track" aria-hidden="true">
              <span className="dtg-switch-knob" aria-hidden="true" />
            </span>
            <span className="dtg-switch-label">{uiLabel('followShort')}</span>
          </button>

          <button
            type="button"
            ref={filterButtonRef}
            className="dtg-iconbtn"
            onClick={onToggleFilter}
            title={uiLabel('laneFilterHint')}
            aria-label={filterAria}
            aria-expanded={filterOpen}
            aria-haspopup="true"
            aria-pressed={hiddenCount > 0 || workingOnly}
          >
            <FilterIcon />
            {hiddenCount > 0 ? (
              <span className="dtg-badge" aria-hidden="true">{`−${hiddenCount}`}</span>
            ) : null}
          </button>
        </>
      )}

      <button
        type="button"
        className="dtg-iconbtn"
        onClick={onRefresh}
        title={uiLabel('refresh')}
        aria-label={uiLabel('refresh')}
      >
        <RefreshIcon />
      </button>
    </div>
  )
}

/** The inline error strip under the toolbar (poll failure or a host-captured failure). */
function ErrorBar({
  title,
  detail,
  onRetry,
}: {
  title: string
  detail: string
  onRetry?: (() => void) | undefined
}): ReactNode {
  return (
    <div className="dtg-state-errorbar" role="alert">
      <span className="dtg-state-errorbar-icon" aria-hidden="true">!</span>
      <div className="dtg-state-errorbar-body">
        <div className="dtg-state-errorbar-title">{title}</div>
        <div className="dtg-state-errorbar-detail">{detail}</div>
      </div>
      {onRetry === undefined ? null : (
        <button type="button" className="dtg-state-retry" onClick={onRetry}>
          {t('retry')}
        </button>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ drawer */

/** The three status tones the drawer's 6px dot can take. */
type StatusTone = 'neutral' | 'brand' | 'business' | 'success' | 'warn' | 'error'

/** A dot + a word: the ONE way this panel states a status (no bordered chips). */
function StatusWord({ tone, word }: { tone: StatusTone; word: string }): ReactNode {
  return (
    <span className="dtg-drawer-status">
      <span className={`dtg-state-dot dtg-state-dot-${tone}`} aria-hidden="true" />
      <span>{word}</span>
    </span>
  )
}

/** The task status' tone; the word always comes from `taskStatusText`. */
function taskTone(task: TimelineTask): StatusTone {
  switch (task.status) {
    case 'in_progress':
      return 'business'
    case 'completed':
    case 'deleted':
      return 'success'
    default:
      return 'neutral'
  }
}

/** The question status' tone; the word always comes from the shared question keys. */
function questionTone(status: QuestionDetail['status']): StatusTone {
  switch (status) {
    case 'waiting':
      return 'business'
    case 'failed':
      return 'error'
    default:
      return 'success'
  }
}

/** The word for a question status, in the active locale. */
function questionStatusWord(status: QuestionDetail['status']): string {
  if (status === 'waiting') return uiLabel('questionStatusWaiting')
  if (status === 'failed') return uiLabel('questionStatusFailed')
  return uiLabel('questionStatusAnswered')
}

/**
 * The task drawer body: title is in the drawer header; here are the three
 * instants (created / claimed / ended), the two-column facts, the description
 * and the dated transition list.
 *
 * The three-instant timeline is the drawer's reason to exist — the bar only
 * answers "how long", and the moment WORK STARTED (claim) has no room inside a
 * 22px bar. `taskRunTimes` supplies the same three instants the task tooltip
 * uses, so the opened and hovered numbers cannot drift.
 */
function TaskDrawerBody({
  task,
  now,
  generatedAt,
  tzOffsetMinutes,
}: {
  task: TimelineTask
  now: number
  generatedAt: number
  tzOffsetMinutes: number
}): ReactNode {
  const run = taskRunTimes(task, now)
  const claimed = run.startedIsFallback ? null : run.started
  // A live task with NO dated history has no measurable interval: `taskRunTimes`
  // falls back to `now` so its duration is computable, but drawing that fallback
  // as the created time would invent an instant the log never carried.
  const hasHistory = task.history.length > 0
  return (
    <>
      <div className="dtg-drawer-times">
        <div className="dtg-drawer-time">
          <span className="dtg-drawer-time-label">{uiLabel('histCreated')}</span>
          <span className={hasHistory ? 'dtg-drawer-time-value' : 'dtg-drawer-time-value dtg-drawer-time-value-muted'}>
            {hasHistory ? formatDateTime(run.created, tzOffsetMinutes) : '—'}
          </span>
          <span className="dtg-drawer-time-dot" aria-hidden="true" />
        </div>
        <div className="dtg-drawer-time" title={claimed === null ? uiLabel('taskStartedFromCreated') : undefined}>
          <span className="dtg-drawer-time-label">{uiLabel('histClaimed')}</span>
          <span className={claimed === null ? 'dtg-drawer-time-value dtg-drawer-time-value-muted' : 'dtg-drawer-time-value'}>
            {claimed === null ? '—' : formatDateTime(claimed, tzOffsetMinutes)}
          </span>
          <span className={claimed === null ? 'dtg-drawer-time-dot' : 'dtg-drawer-time-dot dtg-drawer-time-dot-brand'} aria-hidden="true" />
        </div>
        <div className="dtg-drawer-time">
          <span className="dtg-drawer-time-label">{uiLabel('histCompleted')}</span>
          <span className={run.ended === null ? 'dtg-drawer-time-value dtg-drawer-time-value-muted' : 'dtg-drawer-time-value'}>
            {run.ended === null ? uiLabel('taskNotEnded') : formatDateTime(run.ended, tzOffsetMinutes)}
          </span>
          <span className={run.ended === null ? 'dtg-drawer-time-dot' : 'dtg-drawer-time-dot dtg-drawer-time-dot-success'} aria-hidden="true" />
        </div>
      </div>

      <dl className="dtg-drawer-kv">
        <div className="dtg-drawer-kv-item">
          <dt className="dtg-drawer-kv-key">{t('taskOwner')}</dt>
          <dd className="dtg-drawer-kv-val">{task.owner ?? t('unassigned')}</dd>
        </div>
        <div className="dtg-drawer-kv-item">
          <dt className="dtg-drawer-kv-key">{t('taskBlockedBy')}</dt>
          <dd className="dtg-drawer-kv-val">
            {task.blockedBy.length === 0 ? uiLabel('blockedByNone') : task.blockedBy.join(', ')}
          </dd>
        </div>
        <div className="dtg-drawer-kv-item">
          <dt className="dtg-drawer-kv-key">{uiLabel('laneLabel')}</dt>
          <dd className="dtg-drawer-kv-val">{task.laneId}</dd>
        </div>
        <div className="dtg-drawer-kv-item">
          <dt className="dtg-drawer-kv-key">{t('taskWriteScopes')}</dt>
          <dd className="dtg-drawer-kv-val">
            {task.writeScopes.length === 0 ? uiLabel('scopesNone') : task.writeScopes.join(', ')}
          </dd>
        </div>
        <div className="dtg-drawer-kv-item">
          <dt className="dtg-drawer-kv-key">{uiLabel('revisionLabel')}</dt>
          <dd className="dtg-drawer-kv-val">{`r${task.revision}`}</dd>
        </div>
        <div className="dtg-drawer-kv-item">
          <dt className="dtg-drawer-kv-key">{uiLabel('taskDuration')}</dt>
          <dd className="dtg-drawer-kv-val">
            {hasHistory ? formatDuration(run.durationMs) : uiLabel('taskDurationUnknown')}
          </dd>
        </div>
      </dl>

      {task.description === '' ? null : (
        <div className="dtg-drawer-section">
          <p className="dtg-drawer-desc">{task.description}</p>
        </div>
      )}

      {task.writeScopeWarnings.length === 0 ? null : (
        <div className="dtg-drawer-section">
          <span className="dtg-drawer-section-title">{uiLabel('notesLabel')}</span>
          {task.writeScopeWarnings.map((warning, index) => (
            <span className="dtg-drawer-note" key={`${warning}:${index}`}>{warning}</span>
          ))}
        </div>
      )}

      <div className="dtg-drawer-section">
        <span className="dtg-drawer-section-title" title={`${uiLabel('historySource')} · ${formatDateTime(generatedAt, tzOffsetMinutes)}`}>
          {uiLabel('historyLabel')}
        </span>
        {task.history.length === 0 ? (
          <span className="dtg-drawer-note">{uiLabel('noHistory')}</span>
        ) : (
          <ul className="dtg-drawer-hist">
            {task.history.map((event, index) => (
              <li key={`${event.time}:${index}`}>
                <span className="dtg-drawer-hist-time">{formatDateTime(event.time, tzOffsetMinutes)}</span>
                <span>{`${historyActionText(event.action)}${event.revision === undefined ? '' : ` · r${event.revision}`} · ${event.sessionId}`}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}

/** The message drawer body: direction route, time, kind, lane and the FULL body. */
function MessageDrawerBody({
  laneId,
  laneName,
  message,
  direction,
  tzOffsetMinutes,
}: {
  laneId: string
  laneName: string
  message: MessageSpan
  direction: 'outgoing' | 'incoming'
  tzOffsetMinutes: number
}): ReactNode {
  const detail = messageDetail(
    {
      kind: message.kind,
      time: message.time,
      direction,
      from: message.from,
      to: message.to,
      preview: message.preview,
      laneName,
    },
    { you: t('you'), recipientUnrecorded: uiLabel('messageRecipientUnrecorded') },
    (time: number) => formatDateTime(time, tzOffsetMinutes),
  )
  return (
    <>
      <div className="dtg-drawer-meta">
        <span data-message-route={detail.route} data-message-direction={detail.direction}>
          {detail.route}
        </span>
        <span>
          <span className="dtg-drawer-meta-key">{uiLabel('messageWhenLabel')}</span>{' '}
          <span className="dtg-drawer-meta-val">{detail.when}</span>
        </span>
        <span>
          <span className="dtg-drawer-meta-key">{uiLabel('messageKindLabel')}</span>{' '}
          <span className="dtg-drawer-meta-val">{detail.kind}</span>
        </span>
        <span>
          <span className="dtg-drawer-meta-key">{uiLabel('messageLaneLabel')}</span>{' '}
          <span className="dtg-drawer-meta-val">{laneId}</span>
        </span>
      </div>
      {detail.maybeTruncated ? (
        <div className="dtg-drawer-note">{uiLabel('messageTruncated', { max: MESSAGE_PREVIEW_MAX })}</div>
      ) : null}
      <pre
        className="dtg-drawer-pre"
        data-message-body=""
        data-message-body-length={detail.body.length}
        data-message-has-body={detail.hasBody ? 'true' : 'false'}
      >
        {detail.hasBody ? detail.body : <span className="dtg-drawer-note">{uiLabel('messageNoBody')}</span>}
      </pre>
    </>
  )
}

/**
 * One question block.
 *
 * The rules, from the contract: a call carries 1-4 questions and they are all
 * rendered in order; an ANSWER is only what was chosen (the selected labels get
 * a check mark, and the unchosen options plus their long descriptions are never
 * listed); a question still waiting shows the prompt ALONE; a failed call shows
 * only its error code; and an unparsed result prints the raw text rather than
 * pretending the person chose nothing.
 */
function QuestionBlock({
  item,
  index,
  status,
}: {
  item: QuestionItem
  index: number
  status: QuestionDetail['status']
}): ReactNode {
  const answered = status === 'answered'
  return (
    <div className={index === 0 ? 'dtg-drawer-question dtg-drawer-question-first' : 'dtg-drawer-question'} data-question-index={index}>
      <div className="dtg-drawer-question-head">
        <span className="dtg-drawer-question-index" aria-hidden="true">{`Q${index + 1}`}</span>
        {item.header === undefined || item.header === '' ? null : <span>{item.header}</span>}
      </div>
      <div className="dtg-drawer-question-prompt">{item.prompt}</div>
      {answered ? (
        <div className="dtg-drawer-answer">
          <span className="dtg-drawer-answer-label">{uiLabel('questionAnswerLabel')}</span>
          {item.selected.map((label) => (
            <span className="dtg-drawer-choice" key={label}>
              <span className="dtg-drawer-choice-mark" aria-hidden="true">✓</span>
              <span>{label}</span>
            </span>
          ))}
          {item.custom === undefined || item.custom === '' ? null : (
            <div className="dtg-drawer-custom">
              <span className="dtg-drawer-answer-label">{uiLabel('questionCustomLabel')}</span>
              <span>{item.custom}</span>
            </div>
          )}
          {item.selected.length === 0 && (item.custom === undefined || item.custom === '') ? (
            // An empty selection is a REAL outcome (the human typed instead); the wording
            // describes the RECORD, never what the person did.
            <div className="dtg-drawer-note">{uiLabel('questionNoSelectionRecorded')}</div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

/** The question drawer body: status, then every question in the call, in order. */
function QuestionDrawerBody({
  question,
  when,
  laneName,
}: {
  question: QuestionDetail | undefined
  when: string
  laneName: string
}): ReactNode {
  const status = question?.status ?? 'answered'
  const items = question?.questions ?? []
  return (
    <>
      <div className="dtg-drawer-meta">
        <span>{when}</span>
        <span>
          <span className="dtg-drawer-meta-key">{uiLabel('messageLaneLabel')}</span>{' '}
          <span className="dtg-drawer-meta-val">{laneName}</span>
        </span>
      </div>
      {status === 'failed' ? (
        // A rejected call never reached the human, so there is nothing to answer and
        // nothing to choose: state the code and the reason instead of empty choices.
        <div className="dtg-drawer-section">
          <span className="dtg-drawer-note">{uiLabel('questionFailedHint')}</span>
          {question?.errorCode === undefined ? null : (
            <code className="dtg-drawer-code">{question.errorCode}</code>
          )}
        </div>
      ) : status === 'waiting' ? (
        items.map((item, index) => <QuestionBlock key={`${item.id}:${index}`} item={item} index={index} status={status} />)
      ) : question?.unparsed === true ? (
        <div className="dtg-drawer-section">
          <span className="dtg-drawer-note">{uiLabel('questionUnparsed')}</span>
          <pre className="dtg-drawer-pre">{question.raw ?? ''}</pre>
        </div>
      ) : (
        items.map((item, index) => <QuestionBlock key={`${item.id}:${index}`} item={item} index={index} status={status} />)
      )}
    </>
  )
}

/* ------------------------------------------------------------- board body */

export function BoardView({ sessionId, visible, routeBase, navigate }: BoardViewProps): ReactNode {
  const [data, setData] = useState<TimelineResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [reloadKey, setReloadKey] = useState(0)
  /**
   * THE one detail selection. A union rather than two ids, so "task AND message
   * open at once" cannot be represented — the old component kept two independent
   * ids and both panels could appear, squeezing the chart to zero.
   */
  const [selection, setSelection] = useState<DrawerSelection>(null)
  /**
   * Time-range filter: `null` means "everything". Kept as component state (not in
   * the payload) so changing it re-lays out the SAME fetched board without a
   * refetch, and so it survives the 5s poll.
   */
  const [windowSpanMs, setWindowSpanMs] = useState<number | null>(null)
  /**
   * Follow: `true` keeps the NOW line pinned near the right edge as time advances.
   * It only ever scrolls while ON; turning it off hands the scroll position
   * entirely to the user, and nothing flips it back on their behalf.
   */
  const [follow, setFollow] = useState(true)
  /**
   * Every change asks the chart to put the NOW line back in view. The follow
   * effect alone cannot do that when follow is ALREADY on and the user dragged
   * away: nothing changed, so nothing re-scrolled.
   */
  const [recenterKey, setRecenterKey] = useState(0)
  /**
   * The HIDDEN lane ids — not the shown ones. An empty set means "全选 / everything",
   * so a teammate that joins the board later is visible by default instead of being
   * excluded by a list written before it existed.
   */
  const [hiddenLanes, setHiddenLanes] = useState<ReadonlySet<string>>(() => new Set())
  /**
   * The special "working only" view. ANDed with the hidden set by `filterTimelineLanes`,
   * so the two compose instead of fighting. Held in BoardView (not in the payload), so it
   * survives the 5s poll exactly like the hidden set does.
   */
  const [workingOnly, setWorkingOnly] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const filterButtonRef = useRef<HTMLButtonElement>(null)

  /**
   * THE one filtering point. Everything downstream — the lane-head column, the lane
   * contents, the send/receive markers, the wait bands and the legend counts — is
   * derived by `GanttChart` from `data.lanes`, so filtering here filters all of it at
   * once and no second filter is needed (or wanted) inside the chart.
   */
  const shownData = useMemo(
    () => (data === null ? null : filterTimelineLanes(data, hiddenLanes, data.lanes, workingOnly)),
    [data, hiddenLanes, workingOnly],
  )

  useBoardStyles()

  /**
   * The resolver lives in a ref: the shell may pass an inline arrow, and a new
   * identity must not restart the polling effect.
   */
  const routeBaseRef = useRef<RouteBase | undefined>(routeBase)
  routeBaseRef.current = routeBase
  /** Same reasoning for the opener: a fresh arrow must not restart anything. */
  const navigateRef = useRef<BoardViewProps['navigate']>(navigate)
  navigateRef.current = navigate

  const onNavigate = useCallback((target: LaneNavigation): boolean => {
    const opener = navigateRef.current
    if (opener === undefined) return false
    try {
      return opener(target) === true
    } catch {
      // The shell promises not to throw; if it ever does, a failed jump must not
      // take the panel down with it.
      return false
    }
  }, [])

  /* ------------------------------------------------------- fetch + poll */

  useEffect(() => {
    if (!visible) return
    let disposed = false
    const controller = new AbortController()
    const load = async (): Promise<void> => {
      try {
        const value = await fetchTimeline(sessionId, {
          signal: controller.signal,
          routeBase: routeBaseRef.current,
        })
        if (disposed) return
        setData(value)
        setError(null)
        setNow(Date.now())
      } catch (cause) {
        if (disposed || controller.signal.aborted) return
        setError(cause instanceof Error ? cause.message : String(cause))
      }
    }
    void load()
    const timer = window.setInterval(() => {
      void load()
    }, POLL_MS)
    return () => {
      disposed = true
      controller.abort()
      window.clearInterval(timer)
    }
  }, [sessionId, visible, reloadKey])

  /* --------------------------------------------------------- now ticker */

  /**
   * AUTHORITATIVE liveness comes from the server (`live`), never from the local
   * clock: when every member has stopped the host says so, and the axis must
   * stop moving. A payload from before the contract gained `live` is treated as
   * live, preserving the old behaviour rather than freezing on stale data.
   */
  const live = data !== null && data.live !== false
  useEffect(() => {
    if (!visible || !live) return
    setNow(Date.now())
    const timer = window.setInterval(() => setNow(Date.now()), NOW_MS)
    return () => window.clearInterval(timer)
  }, [visible, live])

  /* ---------------------------------------------------------- selection */

  const selectedTaskId = selection !== null && selection.kind === 'task' ? selection.id : null
  const selectedMessageKey = selection !== null && selection.kind === 'message' ? selection.key : null

  const onSelectTask = useCallback((taskId: string | null) => {
    setSelection((previous) => nextTaskSelection(previous, taskId))
  }, [])
  const onSelectMessage = useCallback((key: string | null) => {
    setSelection((previous) => nextMessageSelection(previous, key))
  }, [])
  const closeDrawer = useCallback(() => setSelection(null), [])

  /** The selected task, looked up in the payload so its body survives re-renders. */
  const selectedTask = useMemo<TimelineTask | null>(() => {
    if (data === null || selectedTaskId === null) return null
    const direct = data.tasks.find((task) => task.id === selectedTaskId)
    if (direct !== undefined) return direct
    for (const lane of data.lanes) {
      const found = lane.tasks.find((task) => task.id === selectedTaskId)
      if (found !== undefined) return found
    }
    return null
  }, [data, selectedTaskId])

  useEffect(() => {
    if (selectedTaskId !== null && selectedTask === null && data !== null) {
      setSelection((previous) => nextTaskSelection(previous, null))
    }
  }, [selectedTaskId, selectedTask, data])

  /** The selected marker, looked up in the payload so its body survives re-renders. */
  const selectedMessage = useMemo(() => {
    if (data === null || selectedMessageKey === null) return null
    const laneIdOf = speakerLaneMapper(data.lanes)
    // The SAME message is carried by its sender's lane AND its recipient's lane,
    // so a bare `messageId` is not unique across this payload. The layout keys a
    // marker as `<laneId>:<messageId>`; resolving a persisted key into a message
    // must accept any lane that carries it and prefer the LAST one, because the
    // layout culls on scroll and the last matching lane is the deepest one still
    // in the array. Resolving the FIRST match would jump the detail panel to a
    // different lane's copy of the same message than the marker that was clicked.
    let found: {
      laneId: string
      laneName: string
      message: MessageSpan
      direction: 'outgoing' | 'incoming'
    } | null = null
    for (const lane of data.lanes) {
      const list = lane.messages ?? []
      for (let index = 0; index < list.length; index += 1) {
        const message = list[index]
        if (message === undefined) continue
        // Same construction the layout uses, so a key a marker carries can always
        // be resolved back to exactly that marker.
        const key = `${lane.id}:${message.messageId ?? `${message.kind}:${message.time}:${index}`}`
        if (key !== selectedMessageKey) continue
        found = {
          laneId: lane.id,
          // The lane's display name, so a missing recipient can be named
          // instead of printed as "unknown".
          laneName: lane.name !== '' ? lane.name : lane.id,
          message,
          direction: resolveMessageDirection(message, lane.id, laneIdOf).direction,
        }
      }
    }
    return found
  }, [data, selectedMessageKey])

  // A selection that no longer resolves (the 5s poll can drop a row) must not keep
  // the drawer open on nothing.
  useEffect(() => {
    if (selectedMessageKey !== null && selectedMessage === null && data !== null) {
      setSelection((previous) => nextMessageSelection(previous, null))
    }
  }, [selectedMessageKey, selectedMessage, data])

  /** Esc closes the one drawer, whatever kind it is. */
  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      setSelection(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible])

  const retry = useCallback(() => setReloadKey((key) => key + 1), [])
  /**
   * "Follow the NOW line now": switch follow on AND ask the chart to re-centre.
   * Both are needed — the first handles a reader who had turned following off,
   * the second a reader who is following but had dragged the viewport away.
   */
  const jumpToNow = useCallback(() => {
    setFollow(true)
    setRecenterKey((key) => key + 1)
  }, [])

  /**
   * Flip one lane's visibility. The state is the HIDDEN set, so unticking adds and
   * ticking removes; the board keeps its order because the filter preserves it.
   */
  const toggleLane = useCallback((laneId: string) => {
    setHiddenLanes((previous) => {
      const next = new Set(previous)
      if (next.has(laneId)) next.delete(laneId)
      else next.add(laneId)
      return next
    })
  }, [])

  /**
   * A click on the EMPTY part of the chart closes the drawer. Clicks on a task
   * card or a marker are handled by those controls (and must not be undone by the
   * bubble), so anything interactive is ignored here.
   */
  const onChartClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (selection === null) return
      const target = event.target as HTMLElement | null
      if (target === null) return
      if (target.closest('button, a, input, select, textarea, label, [role="button"], [data-drawer]') !== null) return
      setSelection(null)
    },
    [selection],
  )

  const tzOffsetMinutes = -new Date(now).getTimezoneOffset()

  /* -------------------------------------------------------------- states */

  // `data === null` (NOT `shownData === null`) is the loading/error condition:
  // `shownData` is null exactly when `data` is, and testing it FIRST used to make
  // the loading and error branches unreachable — the reported blank first frame
  // and the missing retry button.
  if (data === null) {
    const failed = error !== null
    return (
      <div className="dtg-root" data-dsh-task-gantt="" data-build={BUILD_LABEL}>
        <TopBar
          timeline={null}
          now={now}
          tzOffsetMinutes={tzOffsetMinutes}
          windowSpanMs={windowSpanMs}
          follow={follow}
          hiddenCount={hiddenLanes.size}
          workingOnly={workingOnly}
          filterOpen={false}
          filterButtonRef={filterButtonRef}
          onToggleFollow={() => setFollow((value) => !value)}
          onChangeSpan={() => undefined}
          onToggleFilter={() => undefined}
          onRefresh={retry}
          onJumpToNow={jumpToNow}
        />
        {failed ? <ErrorBar title={t('errorTitle')} detail={error} onRetry={retry} /> : null}
        <div className="dtg-state" role={failed ? 'alert' : 'status'}>
          {failed ? (
            <span className="dtg-state-icon" aria-hidden="true">!</span>
          ) : (
            <div className="dtg-state-skeleton" aria-hidden="true">
              <div className="dtg-state-skeleton-row" />
              <div className="dtg-state-skeleton-row" />
              <div className="dtg-state-skeleton-row" />
            </div>
          )}
          <div className="dtg-state-title">{failed ? t('errorTitle') : t('loading')}</div>
          <div className="dtg-state-body">{failed ? error : t('tabDescription')}</div>
          {failed ? (
            <button type="button" className="dtg-state-retry" onClick={retry}>
              {t('retry')}
            </button>
          ) : null}
        </div>
        <div className="dtg-build" data-build={BUILD_LABEL} title={BUILD_LABEL}>
          {BUILD_LABEL}
        </div>
      </div>
    )
  }

  // Narrowing: `shownData` is the filtered board, never null here.
  if (shownData === null) return null

  /* The drawer's content is decided once, in one place, so the three kinds can
     never disagree about which one is showing. */
  let drawerKind: 'task' | 'message' | 'question' | null = null
  let drawerTitle = ''
  let drawerStatusWord = ''
  let drawerTone: StatusTone = 'neutral'
  let drawerBody: ReactNode = null

  if (selectedTask !== null) {
    drawerKind = 'task'
    drawerTitle = selectedTask.subject === '' ? '—' : selectedTask.subject
    drawerStatusWord = taskStatusText(selectedTask.status)
    drawerTone = taskTone(selectedTask)
    drawerBody = (
      <TaskDrawerBody
        task={selectedTask}
        now={now}
        generatedAt={shownData.generatedAt}
        tzOffsetMinutes={tzOffsetMinutes}
      />
    )
  } else if (selectedMessage !== null) {
    const message = selectedMessage.message
    if (messageDrawerKind(message) === 'question' && message.question !== undefined) {
      drawerKind = 'question'
      drawerTitle = uiLabel('questionRoute')
      drawerStatusWord = questionStatusWord(message.question.status)
      drawerTone = questionTone(message.question.status)
      drawerBody = (
        <QuestionDrawerBody
          question={message.question}
          when={formatDateTime(message.time, tzOffsetMinutes)}
          laneName={selectedMessage.laneName}
        />
      )
    } else {
      drawerKind = 'message'
      drawerTitle = uiLabel('messageDetailTitle')
      drawerStatusWord =
        selectedMessage.direction === 'outgoing' ? uiLabel('messageSentMark') : uiLabel('messageReceivedMark')
      drawerTone = selectedMessage.direction === 'outgoing' ? 'brand' : 'business'
      drawerBody = (
        <MessageDrawerBody
          laneId={selectedMessage.laneId}
          laneName={selectedMessage.laneName}
          message={message}
          direction={selectedMessage.direction}
          tzOffsetMinutes={tzOffsetMinutes}
        />
      )
    }
  }

  const drawerLabel =
    drawerKind === 'task'
      ? uiLabel('detailsTitle')
      : drawerKind === 'message'
        ? uiLabel('messageDetailTitle')
        : uiLabel('questionRoute')

  return (
    <div className="dtg-root" data-dsh-task-gantt="" data-build={BUILD_LABEL}>
      <TopBar
        timeline={shownData}
        now={now}
        tzOffsetMinutes={tzOffsetMinutes}
        windowSpanMs={windowSpanMs}
        follow={follow}
        hiddenCount={hiddenLanes.size}
        workingOnly={workingOnly}
        filterOpen={filterOpen}
        filterButtonRef={filterButtonRef}
        onToggleFollow={() => setFollow((value) => !value)}
        onChangeSpan={(raw) => setWindowSpanMs(raw === 'all' ? null : Number(raw))}
        onToggleFilter={() => setFilterOpen((open) => !open)}
        onRefresh={retry}
        onJumpToNow={jumpToNow}
      />

      {error === null ? null : <ErrorBar title={t('errorTitle')} detail={error} onRetry={retry} />}
      {shownData.failure === undefined ? null : (
        <ErrorBar title={uiLabel('failureLabel')} detail={shownData.failure} />
      )}

      {/*
        The menu is a SIBLING of the toolbar, not a child of it: an absolutely
        positioned descendant adds to its ancestor's scrollable overflow and would be
        clipped by this panel. It is fixed-positioned from the button's own rect and
        clamped by the shared `clipBounds`.
      */}
      {filterOpen && filterButtonRef.current !== null ? (
        <LaneFilterMenu
          anchor={filterButtonRef.current}
          lanes={data.lanes}
          hidden={hiddenLanes}
          workingOnly={workingOnly}
          onToggle={toggleLane}
          onToggleWorking={() => setWorkingOnly((value) => !value)}
          onClose={() => setFilterOpen(false)}
        />
      ) : null}

      {shownData.lanes.length === 0 ? (
        <div className="dtg-state" role="status">
          <span className="dtg-state-icon" aria-hidden="true"><EmptyIcon /></span>
          <div className="dtg-state-title">{t('emptyTitle')}</div>
          <div className="dtg-state-body">{t('emptyBody')}</div>
          <button type="button" className="dtg-state-retry" onClick={retry}>
            {uiLabel('refresh')}
          </button>
        </div>
      ) : (
        /*
         * The drawer's positioning context wraps ONLY the chart. The drawer is
         * absolutely placed at the bottom of this box, so it overlays the drawing
         * area without shrinking it — the old in-flow detail panels could take 45%
         * and 60% at the same time and leave the chart at zero height.
         */
        <div className="dtg-drawer-host" onClick={onChartClick} data-drawer-host="">
          <GanttChart
            data={shownData}
            visible={visible}
            now={now}
            selectedTaskId={selectedTaskId}
            onSelectTask={onSelectTask}
            selectedMessageKey={selectedMessageKey}
            onSelectMessage={onSelectMessage}
            navigate={onNavigate}
            windowSpanMs={windowSpanMs}
            follow={follow}
            recenterKey={recenterKey}
            onJumpToNow={jumpToNow}
          />
          {drawerKind === null ? null : (
            <section
              className="dtg-drawer"
              role="region"
              aria-label={drawerLabel}
              data-drawer={drawerKind}
            >
              <div className="dtg-drawer-grip" aria-hidden="true" />
              <div className="dtg-drawer-head">
                <div className="dtg-drawer-heading">
                  <span className="dtg-drawer-title" title={drawerTitle}>{drawerTitle}</span>
                  <StatusWord tone={drawerTone} word={drawerStatusWord} />
                </div>
                <button
                  type="button"
                  className="dtg-iconbtn dtg-drawer-close"
                  onClick={closeDrawer}
                  title={uiLabel('close')}
                  aria-label={uiLabel('close')}
                >
                  <CloseIcon />
                </button>
              </div>
              <div className="dtg-drawer-body">{drawerBody}</div>
            </section>
          )}
        </div>
      )}

      {/*
        The host's `notes` are deliberately NOT rendered.
        The user, pointing at the footer diagnostic line: "界面中这段内容不需要显示".
        The payload still CARRIES them (the host-side computation is untouched) — this is
        a UI decision, not a data one. Do not reinstate a shorter version of the same
        diagnostic: the request was to remove the block, not to compress it.
      */}
      {/*
        Build identity, ALWAYS rendered and deliberately NOT translated: the
        browser half is served from /plugins/<id>/client.js&rev=<hash of
        mtime+ctime+size>, which does not include the content, so a page can run
        a stale bundle while looking identical. This string is how a human (and
        `document.querySelector('[data-build]')`) tells which code is live.
      */}
      <div className="dtg-build" data-build={BUILD_LABEL} title={BUILD_LABEL}>
        {BUILD_LABEL}
      </div>
    </div>
  )
}
