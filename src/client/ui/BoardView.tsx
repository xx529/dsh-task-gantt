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
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { LaneNavigation, TimelineResponse, TimelineTask } from '../../shared/contract.ts'
import { fetchTimeline, type RouteBase } from '../api.ts'
import { t } from '../i18n.ts'
import { GanttChart } from './GanttChart.tsx'
import { uiLabel } from './labels.ts'
import { historyActionText, taskStatusText } from './status.ts'
import { BOARD_CSS, STYLE_ELEMENT_ID } from './styles.ts'
import { formatClock, formatDateTime, taskDurationLine } from './timeline-layout.ts'

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
  const retry = useCallback(() => setReloadKey((key) => key + 1), [])

  /* -------------------------------------------------------------- states */

  if (data === null) {
    const failed = error !== null
    return (
      <div className="dtg-root" data-dsh-task-gantt="">
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
    data.source === 'log'
      ? { className: 'dtg-chip', text: t('sourceLog') }
      : { className: 'dtg-chip dtg-chip-warn', text: data.source === 'partial' ? t('sourcePartial') : t('sourceLive') }

  return (
    <div className="dtg-root" data-dsh-task-gantt="">
      <div className="dtg-bar">
        <span className={sourceChip.className} title={[t('sourceLog'), t('sourcePartial'), t('sourceLive')].join(' / ')}>
          {sourceChip.text}
        </span>
        {live ? (
          <span className="dtg-chip dtg-chip-live">{uiLabel('nowLabel')}</span>
        ) : (
          <span className="dtg-chip" title={uiLabel('frozenHint')}>
            {`${formatDateTime(data.range.start, tzOffsetMinutes)} → ${uiLabel('endedLabel')} ${formatDateTime(data.range.end ?? data.generatedAt, tzOffsetMinutes)}`}
          </span>
        )}
        <span className="dtg-spacer" />
        <span className="dtg-chip" title={`${t('tabTitle')} · ${data.lanes.length}`}>
          {`${data.tasks.length} ${uiLabel('tasksLabel')}`}
        </span>
        <button type="button" className="dtg-btn" onClick={retry} title={t('retry')}>
          ⟳
        </button>
      </div>

      {data.lanes.length === 0 ? (
        <div className="dtg-center">
          <span className="dtg-center-title">{t('emptyTitle')}</span>
          <span>{t('emptyBody')}</span>
          {error === null ? null : <span className="dtg-notice-error">{error}</span>}
        </div>
      ) : (
        <GanttChart
          data={data}
          visible={visible}
          now={now}
          selectedTaskId={selectedTaskId}
          onSelectTask={onSelectTask}
          navigate={onNavigate}
        />
      )}

      {selectedTask === null ? null : (
        <TaskDetails
          task={selectedTask}
          generatedAt={data.generatedAt}
          tzOffsetMinutes={tzOffsetMinutes}
          onClose={() => setSelectedTaskId(null)}
        />
      )}

      {error === null ? null : <div className="dtg-notice dtg-notice-error">{`${t('errorTitle')}: ${error}`}</div>}
      {data.failure === undefined ? null : (
        <div className="dtg-notice dtg-notice-error">{`${uiLabel('failureLabel')}: ${data.failure}`}</div>
      )}
      {data.notes.length === 0 ? null : (
        <div className="dtg-notice" title={data.notes.join('\n')}>
          {`${uiLabel('notesLabel')}: ${data.notes.join(' · ')}`}
        </div>
      )}
    </div>
  )
}

/* --------------------------------------------------------------- details */

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
