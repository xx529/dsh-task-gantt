/**
 * The Task Gantt tab body: fetch → poll → render.
 *
 * Owner: teammate `ui` (write scope `src/client/ui/**`).
 *
 * Responsibilities kept HERE (so {@link GanttChart} stays a pure render of one
 * response plus the interaction state):
 *   - one request per poll tick against the host route (`fetchTimeline`),
 *     PAUSED while the tab is not visible (`visible === false`) and refreshed
 *     immediately when it becomes visible again (guide §4.2). The route base
 *     comes from the shell (`routeBase` → `resolveHostRoute`), so a
 *     reverse-proxy page prefix and the desktop shell both keep working;
 *   - a 1s "now" tick, only while the payload is live (`range.end === null`),
 *     which drives the NOW marker and the growing open spans;
 *   - the loading / empty / error states, the source-honesty chips
 *     (`source` + `range.end`), the `failure` and `notes` notices;
 *   - the full task details panel (subject / description / blockedBy /
 *     writeScopes / ready / dated history), opened by the chart's selection.
 *
 * The board's own stylesheet is injected once (id `STYLE_ELEMENT_ID`) with a
 * mount refcount, because several tabs may render the same board and HMR may
 * unmount one of them while another stays mounted.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import type { LaneNavigation, TimelineLane, TimelineResponse, TimelineTask } from '../../shared/contract.ts'
import { filterTimelineLanes, isPinnedLane } from './lane-filter.ts'
import { clipBounds, overlaySpace } from './overlay-position.ts'
import { BUILD_LABEL, MESSAGE_PREVIEW_MAX, type MessageSpan } from '../../shared/contract.ts'
import { fetchTimeline, type RouteBase } from '../api.ts'
import { t } from '../i18n.ts'
import { GanttChart, QuestionPopoverBody } from './GanttChart.tsx'
import { uiLabel } from './labels.ts'
import { historyActionText, taskStatusText } from './status.ts'
import { BOARD_CSS, STYLE_ELEMENT_ID } from './styles.ts'
import {
  formatClock,
  formatDateTime,
  messageDetail,
  resolveMessageDirection,
  speakerLaneMapper,
  taskDurationLine,
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
   * could not be cut off by the panel's edge. That fix had a副作用 on SHORT panels: the
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
    element.textContent = BOARD_CSS
    styleMounts += 1
    return () => {
      styleMounts -= 1
      if (styleMounts <= 0) document.getElementById(STYLE_ELEMENT_ID)?.remove()
    }
  }, [])
}

export function BoardView({ sessionId, visible, routeBase, navigate }: BoardViewProps): ReactNode {
  const [data, setData] = useState<TimelineResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const [reloadKey, setReloadKey] = useState(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  /**
   * The selected MESSAGE marker, kept separate from the task selection on
   * purpose: they are two independent readers (a task's duration vs one message's
   * body), so selecting one does not clear the other. Both can be open at once.
   */
  const [selectedMessageKey, setSelectedMessageKey] = useState<string | null>(null)
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
  const filterButtonRef = useRef<HTMLButtonElement | null>(null)

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

  /* ------------------------------------------------------------ derived */

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
    if (selectedTaskId !== null && selectedTask === null && data !== null) setSelectedTaskId(null)
  }, [selectedTaskId, selectedTask, data])

  const onSelectTask = useCallback((taskId: string | null) => setSelectedTaskId(taskId), [])
  const onSelectMessage = useCallback((key: string | null) => setSelectedMessageKey(key), [])

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

  /* Esc closes whichever detail is open (task or message). */
  useEffect(() => {
    if (!visible) return
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key !== 'Escape') return
      if (selectedMessageKey !== null) setSelectedMessageKey(null)
      else if (selectedTaskId !== null) setSelectedTaskId(null)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible, selectedMessageKey, selectedTaskId])
  const retry = useCallback(() => setReloadKey((key) => key + 1), [])

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

  /* -------------------------------------------------------------- states */

  // `shownData` is `data` after the teammate filter, so it is null exactly when `data`
  // is; narrowing it here is what lets the render path below be written against the
  // FILTERED board only, with no second filter anywhere downstream.
  if (shownData === null) {
    return null
  }

  if (data === null) {
    const failed = error !== null
    return (
      <div className="dtg-root" data-dsh-task-gantt="" data-build={BUILD_LABEL}>
        <div className="dtg-center" role={failed ? 'alert' : undefined}>
          <span className="dtg-center-title">
            {failed ? t('errorTitle') : t('loading')}
          </span>
          {failed ? <span>{error}</span> : null}
          {failed ? (
            <button type="button" className="dtg-btn" onClick={retry}>
              {t('retry')}
            </button>
          ) : null}
        </div>
      </div>
    )
  }

  const tzOffsetMinutes = -new Date(now).getTimezoneOffset()
  const sourceChip =
    shownData.source === 'log'
      ? { className: 'dtg-chip', text: t('sourceLog') }
      : { className: 'dtg-chip dtg-chip-warn', text: shownData.source === 'partial' ? t('sourcePartial') : t('sourceLive') }

  return (
    <div className="dtg-root" data-dsh-task-gantt="" data-build={BUILD_LABEL}>
      <div className="dtg-bar">
        <span className={sourceChip.className} title={[t('sourceLog'), t('sourcePartial'), t('sourceLive')].join(' / ')}>
          {sourceChip.text}
        </span>
        {live ? (
          <span className="dtg-chip dtg-chip-live">{uiLabel('nowLabel')}</span>
        ) : (
          <span className="dtg-chip" title={uiLabel('frozenHint')}>
            {`${formatDateTime(shownData.range.start, tzOffsetMinutes)} → ${uiLabel('endedLabel')} ${formatDateTime(shownData.range.end ?? shownData.generatedAt, tzOffsetMinutes)}`}
          </span>
        )}
        <label className="dtg-control" title={uiLabel('rangeHint')}>
          <span className="dtg-control-label">{uiLabel('rangeLabel')}</span>
          <select
            className="dtg-select"
            aria-label={uiLabel('rangeLabel')}
            value={windowSpanMs === null ? 'all' : String(windowSpanMs)}
            onChange={(event) => {
              const raw = event.target.value
              setWindowSpanMs(raw === 'all' ? null : Number(raw))
            }}
          >
            <option value="all">{uiLabel('rangeAll')}</option>
            {WINDOW_SPAN_PRESETS.map((preset) => (
              <option key={preset.ms} value={String(preset.ms)}>
                {preset.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className={follow ? 'dtg-btn dtg-btn-on' : 'dtg-btn'}
          onClick={() => setFollow((value) => !value)}
          title={uiLabel('followHint')}
          aria-label={uiLabel('followLabel')}
          aria-pressed={follow}
        >
          {`${uiLabel('followLabel')} ${follow ? '●' : '○'}`}
        </button>
        <span className="dtg-spacer" />
        <button
          type="button"
          ref={filterButtonRef}
          className="dtg-btn"
          onClick={() => setFilterOpen((open) => !open)}
          title={uiLabel('laneFilterHint')}
          aria-label={uiLabel('laneFilterLabel')}
          aria-expanded={filterOpen}
          aria-haspopup="true"
        >
          {`${uiLabel('laneFilterLabel')} ${[
            workingOnly ? uiLabel('laneFilterWorkingActive') : null,
            hiddenLanes.size === 0 ? null : `−${hiddenLanes.size}`,
          ]
            .filter((part) => part !== null)
            .join(' · ') || '·'}`}
        </button>
        <span className="dtg-chip" title={`${t('tabTitle')} · ${shownData.lanes.length}`}>
          {`${shownData.tasks.length} ${uiLabel('tasksLabel')}`}
        </span>
        <button type="button" className="dtg-btn" onClick={retry} title={t('retry')}>
          ⟳
        </button>
      </div>

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
        <div className="dtg-center">
          <span className="dtg-center-title">{t('emptyTitle')}</span>
          <span>{t('emptyBody')}</span>
          {error === null ? null : <span className="dtg-notice-error">{error}</span>}
        </div>
      ) : (
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
        />
      )}

      {selectedTask === null ? null : (
        <TaskDetails
          task={selectedTask}
          generatedAt={shownData.generatedAt}
          tzOffsetMinutes={tzOffsetMinutes}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {selectedMessage === null ? null : (
        <MessageDetails
          laneId={selectedMessage.laneId}
          laneName={selectedMessage.laneName}
          message={selectedMessage.message}
          direction={selectedMessage.direction}
          tzOffsetMinutes={tzOffsetMinutes}
          onClose={() => setSelectedMessageKey(null)}
        />
      )}

      {error === null ? null : <div className="dtg-notice dtg-notice-error">{`${t('errorTitle')}: ${error}`}</div>}
      {shownData.failure === undefined ? null : (
        <div className="dtg-notice dtg-notice-error">{`${uiLabel('failureLabel')}: ${shownData.failure}`}</div>
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

/* --------------------------------------------------------------- details */

/**
 * The detail view for one message marker.
 *
 * This is where a message's FULL body lives. It is deliberately not in the
 * marker's `title`: real bodies run to several thousand characters, and a browser
 * tooltip both truncates and cannot scroll, so a tooltip could only ever show a
 * prefix while looking like the whole thing.
 *
 * A marker is one span, so the body shown is always that marker's own text —
 * the "+N" badge beside it counts separate, undrawn messages and is not
 * expanded here.
 */
function MessageDetails({
  laneId,
  laneName,
  message,
  direction,
  tzOffsetMinutes,
  onClose,
}: {
  laneId: string
  laneName: string
  message: MessageSpan
  direction: 'outgoing' | 'incoming'
  tzOffsetMinutes: number
  onClose: () => void
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
  const outgoing = detail.direction === 'outgoing'
  return (
    <div className="dtg-details dtg-message-details" role="region" aria-label={uiLabel('messageDetailTitle')}>
      <div className="dtg-details-head">
        <span
          className="dtg-details-title dtg-message-route"
          data-message-route={detail.route}
          data-message-direction={detail.direction}
          data-message-from={detail.fromName}
          data-message-to={detail.toName}
        >
          {detail.route}
        </span>
        <span className="dtg-details-kind" data-message-direction={detail.direction}>
          {outgoing ? uiLabel('messageSentMark') : uiLabel('messageReceivedMark')}
        </span>
        <button type="button" className="dtg-btn dtg-details-close" onClick={onClose} aria-label={uiLabel('close')}>
          ✕
        </button>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{uiLabel('messageWhenLabel')}</span>
        <span className="dtg-kv-val">{detail.when}</span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{uiLabel('messageKindLabel')}</span>
        <span className="dtg-kv-val">{detail.kind}</span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{uiLabel('messageLaneLabel')}</span>
        <span className="dtg-kv-val">{laneId}</span>
      </div>
      {message.kind === 'question' && message.question !== undefined ? (
        /*
         * The SAME body the hover popover renders, so the two can never disagree. The user
         * asked for the question's detail here as well, and a second implementation is
         * exactly how the two would drift apart.
         *
         * It is a PURE BODY: every bit of the popover's positioning — the viewport clamp,
         * the flip, the block-boundary height snapping — lives in `HoverPopover`, not in
         * this component, so nothing floating is dragged into a region that sits in the
         * document flow.
         */
        <QuestionPopoverBody laneName={laneName} when={detail.when} question={message.question} />
      ) : (
        <>
          {detail.maybeTruncated ? (
            <div className="dtg-notice">{uiLabel('messageTruncated', { max: MESSAGE_PREVIEW_MAX })}</div>
          ) : null}
          <div
            className="dtg-message-body"
            data-message-body=""
            data-message-body-length={detail.body.length}
            data-message-has-body={detail.hasBody ? 'true' : 'false'}
          >
            {detail.hasBody ? detail.body : <span className="dtg-muted">{uiLabel('messageNoBody')}</span>}
          </div>
        </>
      )}
    </div>
  )
}

function TaskDetails({
  task,
  generatedAt,
  tzOffsetMinutes,
  onClose,
}: {
  task: TimelineTask
  generatedAt: number
  tzOffsetMinutes: number
  onClose: () => void
}): ReactNode {
  // The user has to be able to CHECK the bar length, so the two endpoints and
  // the elapsed time are spelled out (local time, same clock as the chart).
  // Shared with the card tooltip so the hovered and opened numbers can't drift.
  const duration = taskDurationLine(task, (time) => formatDateTime(time, tzOffsetMinutes), {
    created: uiLabel('taskCreatedAt'),
    finished: uiLabel('taskFinishedAt'),
    lastTransition: uiLabel('taskLastTransitionAt'),
    duration: uiLabel('taskDuration'),
    unknown: uiLabel('taskDurationUnknown'),
    line: uiLabel('taskDurationLine'),
  })

  return (
    <div className="dtg-details" role="region" aria-label={uiLabel('detailsTitle')}>
      <div className="dtg-details-head">
        <span className="dtg-details-title">{task.subject}</span>
        <button type="button" className="dtg-btn" onClick={onClose} title={uiLabel('close')} aria-label={uiLabel('close')}>
          ✕
        </button>
      </div>
      <div className="dtg-details-body">{task.description === '' ? '—' : task.description}</div>
      <div className="dtg-kv dtg-kv-duration" title={duration.text} data-duration-known={duration.known ? 'true' : 'false'}>
        <span className="dtg-kv-key">
          {duration.known ? uiLabel('taskCreatedAt') : uiLabel('taskDuration')}
        </span>
        <span className="dtg-kv-val">
          {duration.known
            ? `${duration.from} → ${duration.label} ${duration.to}（${duration.duration}）`
            : duration.text}
        </span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{t('taskOwner')}</span>
        <span className="dtg-kv-val">{task.owner ?? t('unassigned')}</span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{uiLabel('laneLabel')}</span>
        <span className="dtg-kv-val">{task.laneId}</span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{uiLabel('statusLabel')}</span>
        <span className="dtg-kv-val">{`${taskStatusText(task.status)} · ${uiLabel('revisionLabel')} ${task.revision}`}</span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{t('taskReady')}</span>
        <span className="dtg-kv-val">{task.ready ? '✓' : '✗'}</span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{t('taskBlockedBy')}</span>
        <span className="dtg-kv-val">
          {task.blockedBy.length === 0
            ? uiLabel('blockedByNone')
            : task.blockedBy.map((id) => <code key={id} className="dtg-code">{id}</code>)}
        </span>
      </div>
      <div className="dtg-kv">
        <span className="dtg-kv-key">{t('taskWriteScopes')}</span>
        <span className="dtg-kv-val">
          {task.writeScopes.length === 0
            ? uiLabel('scopesNone')
            : task.writeScopes.map((scope) => <code key={scope} className="dtg-code">{scope}</code>)}
        </span>
      </div>
      {task.writeScopeWarnings.length === 0 ? null : (
        <div className="dtg-kv">
          <span className="dtg-kv-key">{uiLabel('notesLabel')}</span>
          <span className="dtg-kv-val">
            {task.writeScopeWarnings.map((warning) => (
              <code key={warning} className="dtg-code">{warning}</code>
            ))}
          </span>
        </div>
      )}
      <div className="dtg-kv">
        <span className="dtg-kv-key">{uiLabel('historyLabel')}</span>
        <span
          className="dtg-kv-val"
          title={`${uiLabel('historySource')} · ${formatDateTime(generatedAt, tzOffsetMinutes)}`}
        >
          {task.history.length === 0
            ? uiLabel('noHistory')
            : `${task.history.length} · ${uiLabel('historySource')}`}
        </span>
      </div>
      {task.history.length === 0 ? null : (
        <ul className="dtg-hist">
          {task.history.map((event, index) => (
            <li key={`${event.time}:${index}`}>
              <span className="dtg-hist-time">{formatDateTime(event.time, tzOffsetMinutes)}</span>
              <span>{`${historyActionText(event.action)}${event.revision === undefined ? '' : ` · r${event.revision}`} · ${event.sessionId}`}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
