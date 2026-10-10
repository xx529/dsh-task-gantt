/**
 * The chart itself: a fixed lane-head column (name + status) beside a
 * horizontally-scrollable time axis, with the bars and task cards of
 * {@link layoutTimeline} placed absolutely on one shared canvas.
 *
 * Owner: teammate `ui` (write scope `src/client/ui/**`).
 *
 * Interaction model (the sidebar is ~320-480px wide, so the gestures are
 * deliberate):
 *   - Ctrl/Cmd + wheel zooms around the pointer; the time under the cursor
 *     stays put. A plain wheel is left to the browser (vertical lane scroll,
 *     Shift+wheel for horizontal), because stealing the plain wheel in a
 *     190-350px timeline makes scrolling lanes impossible.
 *   - The −/fit/+ buttons zoom around the horizontal centre; `fit` returns to
 *     the auto zoom that fits the whole window.
 *   - Clicking / Enter / Space on a card selects it (the parent renders the
 *     full details); Escape clears the selection.
 *   - `now` is supplied by the parent (it ticks once a second while live), so
 *     this component stays a pure function of its props.
 *
 * Performance: the lane/span/card lists are laid out by the pure module and
 * culled to the visible window (`cull: true`); the only per-frame work while
 * scrolling is one rAF-throttled state write.
 */
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react'
import type {
  MemberStatus,
  TimelineResponse,
  TimelineTask,
} from '../../shared/contract.ts'
import { t } from '../i18n.ts'
import { uiLabel } from './labels.ts'
import {
  STATUS_GLYPH,
  memberStatusText,
  roleText,
  taskStatusText,
} from './status.ts'
import {
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_LANE_HEIGHT,
  LANE_HEAD_WIDTH,
  clampMsPerPx,
  computeWindow,
  fitMsPerPx,
  formatClock,
  formatDateTime,
  layoutTimeline,
  type LaneBox,
  type SpanRect,
  type TaskCardRect,
  type TimelineLayout,
} from './timeline-layout.ts'

/** One wheel/button zoom step. */
const ZOOM_STEP = 1.5

export interface GanttChartProps {
  data: TimelineResponse
  /** Pauses the (parent-owned) polling; the chart only re-renders. */
  visible: boolean
  /** Epoch ms treated as "now". Ticked by the parent while the board is live. */
  now: number
  selectedTaskId: string | null
  onSelectTask: (taskId: string | null) => void
}

export function GanttChart(props: GanttChartProps): ReactNode {
  const { data, now, visible, selectedTaskId, onSelectTask } = props

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef(0)
  const pendingScrollLeft = useRef<number | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [scroll, setScroll] = useState({ left: 0, top: 0 })
  /** `null` = auto zoom (fit the whole window); a number = a user zoom. */
  const [msPerPx, setMsPerPx] = useState<number | null>(null)

  const win = useMemo(() => computeWindow(data, now), [data, now])
  const effectiveMsPerPx = msPerPx ?? fitMsPerPx(win.durationMs, Math.max(1, viewport.width))
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset()

  const layout: TimelineLayout = useMemo(
    () =>
      layoutTimeline(
        data,
        {
          width: Math.max(1, viewport.width),
          height: viewport.height,
          laneHeight: DEFAULT_LANE_HEIGHT,
          headerHeight: DEFAULT_HEADER_HEIGHT,
        },
        {
          now,
          msPerPx: effectiveMsPerPx,
          scrollLeft: scroll.left,
          scrollTop: scroll.top,
          cull: true,
        },
      ),
    [data, now, effectiveMsPerPx, viewport.width, viewport.height, scroll.left, scroll.top],
  )

  /* ------------------------------------------------- measurement + scroll */

  const syncScroll = useCallback(() => {
    const el = scrollRef.current
    if (el === null) return
    const top = el.scrollTop
    const left = el.scrollLeft
    setScroll((prev) => (prev.left === left && prev.top === top ? prev : { left, top }))
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    const apply = (): void => {
      const width = el.clientWidth
      const height = el.clientHeight
      setViewport((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      )
    }
    apply()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', apply)
      return () => window.removeEventListener('resize', apply)
    }
    const observer = new ResizeObserver(apply)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const onScroll = useCallback(() => {
    if (frameRef.current !== 0) return
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0
      syncScroll()
    })
  }, [syncScroll])

  useEffect(
    () => () => {
      if (frameRef.current !== 0) cancelAnimationFrame(frameRef.current)
    },
    [],
  )

  /* ---------------------------------------------------------------- zoom */

  const applyZoom = useCallback(
    (requested: number, cursorX: number) => {
      const el = scrollRef.current
      const next = clampMsPerPx(requested)
      if (next === effectiveMsPerPx) return
      if (el !== null) {
        const timeAtCursor = win.start + (el.scrollLeft + cursorX) * effectiveMsPerPx
        pendingScrollLeft.current = Math.max(0, (timeAtCursor - win.start) / next - cursorX)
      }
      setMsPerPx(next)
    },
    [effectiveMsPerPx, win.start],
  )

  useLayoutEffect(() => {
    const el = scrollRef.current
    const pending = pendingScrollLeft.current
    if (el === null || pending === null) return
    pendingScrollLeft.current = null
    el.scrollLeft = pending
    syncScroll()
  }, [effectiveMsPerPx, syncScroll])

  useEffect(() => {
    const el = scrollRef.current
    if (el === null) return
    // A NATIVE non-passive listener: React's root `onWheel` is passive, so
    // `preventDefault()` there could not stop the page from zooming.
    const handler = (event: WheelEvent): void => {
      if (!(event.ctrlKey || event.metaKey)) return
      event.preventDefault()
      const rect = el.getBoundingClientRect()
      const factor = event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP
      applyZoom(effectiveMsPerPx * factor, event.clientX - rect.left)
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [applyZoom, effectiveMsPerPx])

  const zoomByButton = useCallback(
    (factor: number) => {
      const el = scrollRef.current
      applyZoom(effectiveMsPerPx * factor, el === null ? 0 : el.clientWidth / 2)
    },
    [applyZoom, effectiveMsPerPx],
  )

  /* -------------------------------------------------------------- render */

  const showNow = win.live || (now >= win.start && now <= win.end)
  const chartAria = uiLabel('chartAria', {
    lanes: layout.lanes.length,
    tasks: layout.tasks.length,
    from: formatDateTime(win.start, tzOffsetMinutes),
    to: formatDateTime(win.end, tzOffsetMinutes),
  })
  const drawnPerLane = (box: LaneBox): number => box.lane.tasks.length

  return (
    <div
      className={visible ? 'dtg-chart' : 'dtg-chart dtg-paused'}
      role="group"
      aria-label={chartAria}
      data-dsh-task-gantt=""
    >
      <div className="dtg-body">
        <div className="dtg-heads" style={{ width: LANE_HEAD_WIDTH }}>
          <div
            className="dtg-heads-inner"
            style={{ transform: `translateY(${-layout.scrollTop}px)` }}
            role="list"
          >
            <div className="dtg-head-corner" style={{ height: DEFAULT_HEADER_HEIGHT }} role="presentation">
              {uiLabel('activityLabel')}
            </div>
            {layout.lanes.map((lane) => (
              <LaneHead
                key={lane.laneId}
                box={lane}
                tzOffsetMinutes={tzOffsetMinutes}
                drawnTasks={drawnPerLane(lane)}
              />
            ))}
          </div>
        </div>

        <div
          className="dtg-scroll"
          ref={scrollRef}
          onScroll={onScroll}
          tabIndex={0}
          aria-label={uiLabel('zoomHint')}
        >
          <div
            className="dtg-canvas"
            style={{ width: layout.contentWidth, height: layout.contentHeight }}
          >
            <Axis layout={layout} showNow={showNow} tzOffsetMinutes={tzOffsetMinutes} />
            <div className="dtg-layer" aria-hidden="true">
              {layout.lanes.map((lane) => (
                <span
                  key={lane.laneId}
                  className={lane.index % 2 === 1 ? 'dtg-lane-bg dtg-lane-bg-alt' : 'dtg-lane-bg'}
                  style={{ top: lane.y, width: layout.contentWidth, height: lane.height }}
                />
              ))}
              {layout.ticks.map((tick) => (
                <span
                  key={`grid:${tick.time}`}
                  className={tick.major ? 'dtg-gridline dtg-gridline-major' : 'dtg-gridline'}
                  style={{ left: tick.x, height: layout.contentHeight }}
                />
              ))}
              {/* Two passes so every faint turn band paints UNDER every solid
                  step bar, whatever order the host folded the spans in. */}
              {layout.spans.map((span, index) =>
                span.kind === 'turn' ? <SpanBar key={`turn:${index}:${spanKey(span)}`} span={span} /> : null,
              )}
              {layout.spans.map((span, index) =>
                span.kind === 'step' ? <SpanBar key={`step:${index}:${spanKey(span)}`} span={span} /> : null,
              )}
              {showNow ? <span className="dtg-now" style={{ left: layout.nowX }} /> : null}
            </div>
            {layout.tasks.map((rect) => (
              <TaskCard
                key={`${rect.task.id}@${rect.laneIndex}`}
                rect={rect}
                selected={rect.task.id === selectedTaskId}
                onSelectTask={onSelectTask}
                tzOffsetMinutes={tzOffsetMinutes}
              />
            ))}
            {layout.lanes.map((lane) =>
              lane.lane.spans.length === 0 && lane.lane.tasks.length === 0 ? (
                <span
                  key={`empty:${lane.laneId}`}
                  className="dtg-empty-lane"
                  style={{ left: 6, top: lane.y + 20 }}
                >
                  {t('noTask')}
                </span>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <div className="dtg-legend">
        <button type="button" className="dtg-btn" onClick={() => zoomByButton(1 / ZOOM_STEP)} title={uiLabel('zoomOut')}>
          −
        </button>
        <button type="button" className="dtg-btn" onClick={() => setMsPerPx(null)} title={uiLabel('zoomReset')}>
          ⤢
        </button>
        <button type="button" className="dtg-btn" onClick={() => zoomByButton(ZOOM_STEP)} title={uiLabel('zoomIn')}>
          +
        </button>
        <span className="dtg-zoom-readout" title={uiLabel('zoomHint')}>
          {uiLabel('zoomLevel', {
            seconds: (effectiveMsPerPx / 1000).toFixed(effectiveMsPerPx < 1000 ? 2 : 0),
          })}
        </span>
        <span className="dtg-spacer" />
        <span className="dtg-legend-item">
          <span className="dtg-legend-turn" />
          {uiLabel('turnLegend')}
        </span>
        <span className="dtg-legend-item">
          <span className="dtg-legend-step" />
          {uiLabel('stepLegend')}
        </span>
        <span className="dtg-legend-item">
          <span className="dtg-legend-card" />
          {uiLabel('taskLegend')}
        </span>
        {layout.unplacedTaskIds.length === 0 ? null : (
          <span className="dtg-legend-item dtg-ink-failed" title={layout.unplacedTaskIds.join(', ')}>
            {uiLabel('notPlaced', { count: layout.unplacedTaskIds.length })}
          </span>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------- sub-parts */

function spanKey(span: SpanRect): string {
  return `${span.laneId}:${span.kind}:${span.start}:${span.end}:${span.turn ?? ''}:${span.step ?? ''}`
}

function statusText(status: string | undefined): string {
  if (status === undefined) return '—'
  return status === 'pending' ||
    status === 'in_progress' ||
    status === 'completed' ||
    status === 'deleted'
    ? taskStatusText(status)
    : memberStatusText(status as MemberStatus)
}

function LaneHead({
  box,
  tzOffsetMinutes,
  drawnTasks,
}: {
  box: LaneBox
  tzOffsetMinutes: number
  drawnTasks: number
}): ReactNode {
  const lane = box.lane
  const status = lane.status ?? 'idle'
  const ink = `dtg-ink dtg-ink-${status}`
  const spans = lane.spans.length
  const aria = uiLabel('laneAria', {
    name: lane.name,
    status: statusText(status),
    tasks: drawnTasks,
    spans,
  })
  const detail = [
    lane.name,
    statusText(status),
    lane.model ?? '',
    lane.createdAt === undefined ? '' : formatDateTime(lane.createdAt, tzOffsetMinutes),
    lane.error ?? '',
  ]
    .filter((part) => part !== '')
    .join(' · ')

  return (
    <div
      className={status === 'idle' ? 'dtg-head-row dtg-head-row-idle' : 'dtg-head-row'}
      style={{ height: box.height }}
      role="listitem"
      aria-label={aria}
      title={detail}
    >
      <div className="dtg-head-top">
        <span className={ink} aria-hidden="true">
          <span className="dtg-dot" />
        </span>
        <span className="dtg-head-name" title={lane.name}>
          {lane.name}
        </span>
        <span className={ink} aria-hidden="true">
          <span className="dtg-glyph">{STATUS_GLYPH[status] ?? '·'}</span>
        </span>
      </div>
      <div className="dtg-head-meta">
        <span className={`dtg-head-role ${ink}`}>{roleText(lane.role)}</span>
        <span className="dtg-head-meta-text">{statusText(status)}</span>
        {drawnTasks > 0 ? (
          <span className="dtg-head-meta-text">{`${drawnTasks} ${uiLabel('tasksLabel')}`}</span>
        ) : null}
      </div>
    </div>
  )
}

function Axis({
  layout,
  showNow,
  tzOffsetMinutes,
}: {
  layout: TimelineLayout
  showNow: boolean
  tzOffsetMinutes: number
}): ReactNode {
  // The axis clips at the canvas edge; near the right edge the NOW label flips to
  // the left of its line so it stays readable.
  const flipNowLabel = layout.nowX > layout.contentWidth - 60
  return (
    <div className="dtg-axis" style={{ height: DEFAULT_HEADER_HEIGHT, width: layout.contentWidth }}>
      {layout.ticks.map((tick) => (
        <span
          key={`tick:${tick.time}`}
          className={tick.major ? 'dtg-tick dtg-tick-major' : 'dtg-tick'}
          style={{ left: tick.x }}
        >
          <span className="dtg-tick-label">{tick.label}</span>
        </span>
      ))}
      {showNow ? (
        <span
          className="dtg-now-head"
          style={{ left: layout.nowX, ...(flipNowLabel ? { transform: 'translateX(-100%)' } : {}) }}
          title={formatDateTime(layout.now, tzOffsetMinutes)}
        >
          {`${uiLabel('nowLabel')} ${formatClock(layout.now, tzOffsetMinutes)}`}
        </span>
      ) : null}
    </div>
  )
}

function SpanBar({ span }: { span: SpanRect }): ReactNode {
  const classes = ['dtg-step']
  if (span.kind === 'turn') classes[0] = 'dtg-turn'
  else if (span.open) classes.push('dtg-step-open', 'dtg-span-open')
  const style: CSSProperties = {
    left: span.x,
    top: span.y,
    width: span.w,
    height: span.h,
  }
  return <span className={classes.join(' ')} style={style} title={spanTitle(span)} />
}

function spanTitle(span: SpanRect): string {
  const head = span.open ? `${span.kind} · ${uiLabel('spanOpen')}` : span.kind
  const parts = [head]
  if (span.turn !== undefined) parts.push(`turn ${span.turn}`)
  if (span.step !== undefined) parts.push(`step ${span.step}`)
  return parts.join(' · ')
}

function TaskCard({
  rect,
  selected,
  onSelectTask,
  tzOffsetMinutes,
}: {
  rect: TaskCardRect
  selected: boolean
  onSelectTask: (taskId: string | null) => void
  tzOffsetMinutes: number
}): ReactNode {
  const task: TimelineTask = rect.task
  const selection = rect.live
    ? uiLabel('taskAriaLive')
    : uiLabel('taskAriaHistory', { from: formatDateTime(rect.at, tzOffsetMinutes) })
  const aria = uiLabel('taskAria', {
    subject: task.subject,
    status: statusText(task.status),
    anchor: selection,
  })
  const full = `${task.subject}\n${task.description}`
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectTask(selected ? null : task.id)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onSelectTask(null)
    }
  }
  return (
    <button
      type="button"
      className={`dtg-task dtg-ink-${task.status}${rect.live ? ' dtg-task-live' : ''}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      title={full}
      aria-label={aria}
      aria-pressed={selected}
      onClick={() => onSelectTask(selected ? null : task.id)}
      onKeyDown={onKeyDown}
      data-task-id={task.id}
      data-task-anchor={rect.anchor}
    >
      <span className="dtg-task-subject">{task.subject === '' ? '—' : task.subject}</span>
      {task.description === '' ? null : <span className="dtg-task-desc">{task.description}</span>}
      {rect.live ? <span className="dtg-task-flag">{uiLabel('liveBadge')}</span> : null}
    </button>
  )
}
