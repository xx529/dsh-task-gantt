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
  LaneColorTokens,
  LaneNavigation,
  MemberStatus,
  MessageSpan,
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
  isLiveBoard,
  layoutTimeline,
  type LaneBox,
  type MessageMarkerRect,
  type SpanRect,
  type TaskCardRect,
  type TimelineLayout,
} from './timeline-layout.ts'

/** One wheel/button zoom step. */
const ZOOM_STEP = 1.5

/**
 * The contract publishes token **names** (`--dsw-alias-…`), not css values, so
 * this is the one place they become paint. Every name below exists in the
 * host's own token snapshot (`tests/fixtures/dsw-theme-tokens.json`): a typo
 * would silently paint nothing, which no source scan can catch.
 */
export function lanePaint(token: string): string {
  const name = token.trim()
  if (name === '') return 'currentColor'
  // Tolerate a payload that already wrapped the name: some hosts have shipped
  // `var(--x)` in string fields, and double-wrapping would paint nothing.
  return name.startsWith('var(') ? name : `var(${name})`
}

/** Fallback lane tokens, for a payload that predates `lane.color`. */
const LANE_COLOR_FALLBACKS: readonly LaneColorTokens[] = [
  { bar: '--dsw-alias-brand-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-success-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-warn-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-error-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-business-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-idle-primary', on: '--dsw-alias-label-primary-inverted' },
]
/**
 * The human's own prompts: a HOLE plus a two-tone ring, not a hue.
 *
 * A single semantic token cannot work here, and that is measurable rather than
 * a matter of taste: every candidate is contrast-adequate in one theme and
 * invisible in the other.
 *
 *   token                        on a light panel   on a dark panel
 *   --dsw-alias-markdown-citation   1.16:1 (invisible)     13.83:1
 *   --dsw-alias-label-primary      18.90:1                 1.17:1 (invisible)
 *
 * (Ratios measured from the tokens' resolved values, see
 * {@link UR_MARKER_FILL_TOKEN} / {@link UR_MARKER_RING_TOKENS} below.)
 *
 * So the marker is drawn as a punched-out dot: the FILL is the panel's own
 * surface token (so it reads as a hole), and the RING is painted twice — once
 * in `label-primary` and once in `label-primary-inverted`, in that order. On a
 * light panel the dark inner ring carries the contrast (≈6.6:1) and on a dark
 * panel the light outer ring does (≈13.8:1); neither theme needs to be
 * detected, which matters because this app switches themes WITHOUT changing
 * `data-theme`, a class, or any attribute we could read. Do not "fix" this by
 * swapping in another single token: re-measure first, because a token that is
 * legal and present can still paint the panel's own colour.
 *
 * The shape stays redundant as well: `✎` inside the dot, plus the dashed
 * outline, versus a plain filled square for a teammate's delivery.
 */
const USER_COLOR: LaneColorTokens = {
  bar: '--dsw-alias-bg-layer-1',
  on: '--dsw-alias-label-primary',
}
/** Speaker kinds that are not a lane of their own. */
const SYSTEM_COLOR: LaneColorTokens = {
  bar: '--dsw-alias-label-dimmed',
  on: '--dsw-alias-label-primary',
}

/**
 * The user marker's fill: the panel surface, so the dot reads as punched out.
 * See {@link USER_COLOR} for why this is not a hue.
 */
export const UR_MARKER_FILL_TOKEN = '--dsw-alias-bg-layer-1'
/**
 * The user marker's ring layers, INNER FIRST. Both are required: each one is
 * contrast-adequate on exactly one of the two themes, so dropping either makes
 * the marker invisible for half the users. Exported so a guard can assert the
 * pair is still there (the failure mode is silent: a legal token that paints
 * a colour almost identical to the surface).
 */
export const UR_MARKER_RING_TOKENS = [
  '--dsw-alias-label-primary',
  '--dsw-alias-label-primary-inverted',
] as const

export interface GanttChartProps {
  data: TimelineResponse
  /** Pauses the (parent-owned) polling; the chart only re-renders. */
  visible: boolean
  /** Epoch ms treated as "now". Ticked by the parent while the board is live. */
  now: number
  selectedTaskId: string | null
  onSelectTask: (taskId: string | null) => void
  /** Clicking a navigable lane head opens that session (shell-injected). */
  navigate?: (target: LaneNavigation) => boolean
}

/** A lane's identity colour, with a stable fallback when the host omits it. */
function laneColor(lane: TimelineResponse['lanes'][number], index: number): LaneColorTokens {
  const given = lane.color
  if (given !== undefined && typeof given.bar === 'string' && given.bar !== '') {
    return { bar: lanePaint(given.bar), on: lanePaint(given.on ?? '--dsw-alias-label-primary-inverted') }
  }
  const pick = (index0: number): LaneColorTokens => {
    const entry = LANE_COLOR_FALLBACKS[index0 % LANE_COLOR_FALLBACKS.length]!
    return { bar: lanePaint(entry.bar), on: lanePaint(entry.on) }
  }
  if (lane.role === 'lead') return pick(0)
  if (lane.id === 'unassigned' || lane.role === 'unknown') return pick(LANE_COLOR_FALLBACKS.length - 1)
  let hash = 0
  for (let i = 0; i < lane.id.length; i += 1) hash = (hash * 31 + lane.id.charCodeAt(i)) >>> 0
  return pick(1 + (hash % (LANE_COLOR_FALLBACKS.length - 1)))
}

export function GanttChart(props: GanttChartProps): ReactNode {
  const { data, now, visible, selectedTaskId, onSelectTask, navigate } = props

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const frameRef = useRef(0)
  const pendingScrollLeft = useRef<number | null>(null)
  const [viewport, setViewport] = useState({ width: 0, height: 0 })
  const [scroll, setScroll] = useState({ left: 0, top: 0 })
  /** `null` = auto zoom (fit the whole window); a number = a user zoom. */
  const [msPerPx, setMsPerPx] = useState<number | null>(null)
  /**
   * `'both'` draws the activity bars plus message markers; `'markers'` hides the
   * bars so the message layer can be read on its own. The switch only changes
   * what is drawn — never any timestamp.
   */
  const [messageMode, setMessageMode] = useState<'both' | 'markers'>('both')

  const win = useMemo(() => computeWindow(data, now), [data, now])
  const live = data.live !== false
  const effectiveMsPerPx = msPerPx ?? fitMsPerPx(win.durationMs, Math.max(1, viewport.width))
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset()
  /** Lane id -> token pair, resolved once per payload. */
  const laneColors = useMemo(() => {
    const map = new Map<string, LaneColorTokens>()
    data.lanes.forEach((lane, index) => map.set(lane.id, laneColor(lane, index)))
    return map
  }, [data])
  const markerCount = data.lanes.reduce((total, lane) => total + (lane.messages?.length ?? 0), 0)
  const userPaint = useMemo(() => ({ bar: lanePaint(USER_COLOR.bar), on: lanePaint(USER_COLOR.on) }), [])
  const systemPaint = useMemo(() => ({ bar: lanePaint(SYSTEM_COLOR.bar), on: lanePaint(SYSTEM_COLOR.on) }), [])

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
          messageMode,
        },
      ),
    [data, now, effectiveMsPerPx, viewport.width, viewport.height, scroll.left, scroll.top, messageMode],
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

  /**
   * The right-edge marker comes from the layout, never from the local clock:
   * while live it is NOW, and once the server reports the team stopped the same
   * component renders the FROZEN end time under a different class and label —
   * so a reader never sees a moving "now" on an idle chart.
   */
  const endMarker = layout.endMarker
  const chartAria = `${uiLabel('chartAria', {
    lanes: layout.lanes.length,
    tasks: layout.tasks.length,
    from: formatDateTime(win.start, tzOffsetMinutes),
    to: formatDateTime(win.end, tzOffsetMinutes),
  })}${live ? '' : `, ${uiLabel('frozenHint')}`}`
  const drawnPerLane = (box: LaneBox): number => box.lane.tasks.length

  return (
    <div
      className={['dtg-chart', visible ? '' : 'dtg-paused', live ? '' : 'dtg-frozen'].filter(Boolean).join(' ')}
      role="group"
      aria-label={chartAria}
      data-dsh-task-gantt=""
      data-dtg-live={live ? 'true' : 'false'}
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
                color={laneColors.get(lane.laneId)}
                navigate={navigate}
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
            <Axis layout={layout} tzOffsetMinutes={tzOffsetMinutes} live={live} />
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
              {/* Per-lane message rhythm: the TRUE first→last extent of every
                  message, so decimated markers can never shrink the reported
                  span of when a lane was talking. */}
              {layout.messageBands.map((band) => (
                <span
                  key={`band:${band.laneId}`}
                  className="dtg-msg-band"
                  style={{
                    left: band.x,
                    top: band.y,
                    width: band.w,
                    height: band.h,
                    background: laneColors.get(band.laneId)?.bar,
                  }}
                  title={uiLabel('messageBandTitle', {
                    count: band.count,
                    from: formatClock(band.firstTime, tzOffsetMinutes),
                    to: formatClock(band.lastTime, tzOffsetMinutes),
                  })}
                />
              ))}
              {/* Two passes so every faint turn band paints UNDER every solid
                  step bar, whatever order the host folded the spans in. */}
              {layout.spans.map((span, index) =>
                span.kind === 'turn' ? (
                  <SpanBar key={`turn:${index}:${spanKey(span)}`} span={span} color={laneColors.get(span.laneId)} />
                ) : null,
              )}
              {layout.spans.map((span, index) =>
                span.kind === 'step' ? (
                  <SpanBar key={`step:${index}:${spanKey(span)}`} span={span} color={laneColors.get(span.laneId)} />
                ) : null,
              )}
              {/* Message markers paint ON TOP of the bars: they are the finest
                  detail on the chart and must stay legible. */}
              {layout.messages.map((marker) => (
                <MessageMarker
                  key={`msg:${marker.key}`}
                  marker={marker}
                  color={marker.from.kind === 'user' ? userPaint : marker.from.kind === 'system' ? systemPaint : laneColors.get(marker.from.id)}
                  tzOffsetMinutes={tzOffsetMinutes}
                />
              ))}
              {endMarker !== null && endMarker.visible ? (
                <span
                  className={live ? 'dtg-now' : 'dtg-now dtg-now-ended'}
                  style={{ left: endMarker.x }}
                />
              ) : null}
            </div>
            {layout.tasks.map((rect) => (
              <TaskCard
                key={`${rect.task.id}@${rect.laneIndex}`}
                rect={rect}
                selected={rect.task.id === selectedTaskId}
                onSelectTask={onSelectTask}
                tzOffsetMinutes={tzOffsetMinutes}
                color={laneColors.get(rect.laneId)}
              />
            ))}
            {layout.lanes.map((lane) =>
              lane.lane.spans.length === 0 &&
              lane.lane.tasks.length === 0 &&
              (lane.lane.messages?.length ?? 0) === 0 ? (
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
        {markerCount === 0 ? null : (
          <button
            type="button"
            className="dtg-btn"
            onClick={() => setMessageMode((mode) => (mode === 'both' ? 'markers' : 'both'))}
            title={uiLabel('messageModeHint')}
            aria-pressed={messageMode === 'markers'}
          >
            {messageMode === 'markers' ? uiLabel('messageModeMarkers') : uiLabel('messageModeBoth')}
          </button>
        )}
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
        {markerCount === 0 ? null : (
          <>
            <span className="dtg-legend-item" title={uiLabel('messageLegendHint')}>
              <span className="dtg-legend-msg dtg-legend-msg-user" />
              {uiLabel('messageLegendYou')}
            </span>
            <span className="dtg-legend-item" title={uiLabel('messageLegendHint')}>
              <span className="dtg-legend-msg" />
              {uiLabel('messageLegendTeammate')}
            </span>
            {layout.droppedMessageCount === 0 ? null : (
              <span className="dtg-legend-item" title={uiLabel('messageDroppedHint')}>
                {uiLabel('messageDropped', {
                  shown: layout.messages.length,
                  total: layout.messageCount,
                })}
              </span>
            )}
          </>
        )}
        {live ? null : (
          <span className="dtg-legend-item" title={uiLabel('frozenHint')}>
            {uiLabel('endedLabel')}
          </span>
        )}
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

/**
 * One lane head — the y-axis label, and (requirement 2) the click target that
 * opens that member's conversation.
 *
 * Clickability is decided SOLELY by `lane.navigation`: a lane with no session
 * behind it (the `unassigned` bucket, a roster row without an id) stays a plain
 * `listitem` with no pointer affordance, so nothing invites a click that cannot
 * go anywhere. When it IS navigable the head becomes a real `<button>` inside
 * the listitem, which keeps list semantics and gives Enter/Space for free.
 */
function LaneHead({
  box,
  tzOffsetMinutes,
  drawnTasks,
  color,
  navigate,
}: {
  box: LaneBox
  tzOffsetMinutes: number
  drawnTasks: number
  color?: LaneColorTokens | undefined
  navigate?: ((target: LaneNavigation) => boolean) | undefined
}): ReactNode {
  const lane = box.lane
  const status = lane.status ?? 'idle'
  const ink = `dtg-ink dtg-ink-${status}`
  const spans = lane.spans.length
  const messages = lane.messages?.length ?? 0
  const navigation = lane.navigation
  const navigable = navigation !== undefined && navigate !== undefined
  const aria = navigable
    ? `${uiLabel('laneAria', { name: lane.name, status: statusText(status), tasks: drawnTasks, spans })}, ${t('openSession')}`
    : uiLabel('laneAria', { name: lane.name, status: statusText(status), tasks: drawnTasks, spans })
  const detail = [
    lane.name,
    statusText(status),
    lane.model ?? '',
    lane.createdAt === undefined ? '' : formatDateTime(lane.createdAt, tzOffsetMinutes),
    lane.error ?? '',
    messages > 0 ? uiLabel('messageCountLabel', { count: messages }) : '',
    navigable ? t('openSession') : t('noSession'),
  ]
    .filter((part) => part !== '')
    .join(' · ')
  // The identity colour is painted on the row's left edge and on the lane dot.
  // The status GLYPH and word stay status-driven, so colour is never the only
  // signal for "who" vs "what state".
  const rowStyle: CSSProperties = {
    height: box.height,
    ...(color === undefined ? {} : { borderLeftColor: color.bar }),
  }

  const body = (
    <>
      <div className="dtg-head-top">
        <span className={ink} aria-hidden="true">
          <span className="dtg-dot" style={color === undefined ? undefined : { background: color.bar }} />
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
        {messages > 0 ? (
          <span className="dtg-head-meta-text" title={uiLabel('messageBandTitle', { count: messages, from: '', to: '' })}>
            {`✉ ${messages}`}
          </span>
        ) : null}
      </div>
    </>
  )

  const rowClass = status === 'idle' ? 'dtg-head-row dtg-head-row-idle' : 'dtg-head-row'

  if (!navigable || navigation === undefined) {
    return (
      <div className={rowClass} style={rowStyle} role="listitem" aria-label={aria} title={detail}>
        {body}
      </div>
    )
  }

  return (
    <div className={rowClass} style={rowStyle} role="listitem" aria-label={aria} title={detail}>
      <button
        type="button"
        className="dsh-task-gantt-lane-head-navigable dtg-head-btn"
        style={{ height: box.height - 2 }}
        title={detail}
        aria-label={`${lane.name}: ${t('openSession')}`}
        onClick={() => {
          // A hostile/broken host must not break the chart: the shell's callback
          // already catches, but a stray throw here would still unmount the tab.
          try {
            navigate(navigation)
          } catch {
            /* silent: a jump that did not happen changes nothing on screen */
          }
        }}
      >
        {body}
      </button>
    </div>
  )
}

function Axis({
  layout,
  tzOffsetMinutes,
  live,
}: {
  layout: TimelineLayout
  tzOffsetMinutes: number
  live: boolean
}): ReactNode {
  const marker = layout.endMarker
  // The axis clips at the canvas edge; near the right edge the label flips to
  // the left of its line so it stays readable.
  const flipLabel = marker !== null && marker.x > layout.contentWidth - 60
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
      {marker === null || !marker.visible ? null : (
        <span
          className={live ? 'dtg-now-head' : 'dtg-now-head dtg-now-head-ended'}
          style={{ left: marker.x, ...(flipLabel ? { transform: 'translateX(-100%)' } : {}) }}
          title={
            live
              ? formatDateTime(marker.time, tzOffsetMinutes)
              : `${uiLabel('endedLabel')} ${formatDateTime(marker.time, tzOffsetMinutes)}`
          }
        >
          {live
            ? `${uiLabel('nowLabel')} ${formatClock(marker.time, tzOffsetMinutes)}`
            : `${uiLabel('endedLabel')} ${formatClock(marker.time, tzOffsetMinutes)}`}
        </span>
      )}
    </div>
  )
}

function SpanBar({ span, color }: { span: SpanRect; color?: LaneColorTokens | undefined }): ReactNode {
  const classes = ['dtg-step']
  if (span.kind === 'turn') classes[0] = 'dtg-turn'
  else if (span.open) classes.push('dtg-step-open', 'dtg-span-open')
  const style: CSSProperties = {
    left: span.x,
    top: span.y,
    width: span.w,
    height: span.h,
    ...(color === undefined ? {} : { background: color.bar }),
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

/** Human-readable `from`/`to` of one message marker. */
function speakerName(speaker: { kind: string; name: string } | undefined): string {
  if (speaker === undefined) return '—'
  if (speaker.kind === 'user') return t('you')
  return speaker.name === '' ? speaker.kind : speaker.name
}

/**
 * One message marker: "at this moment, X told Y something".
 *
 * The time is the message's own record — decimation can omit a marker, but it
 * can never move one, so every tooltip states a fact. The marker carries a
 * redundant, non-colour signal too (`✉` for a delivery, `✎` for the human's own
 * prompt, plus a solid vs dotted outline), because colour alone must not be the
 * only way to tell "I said this" from "a teammate said this".
 */
function MessageMarker({
  marker,
  color,
  tzOffsetMinutes,
}: {
  marker: MessageMarkerRect
  color?: LaneColorTokens | undefined
  tzOffsetMinutes: number
}): ReactNode {
  const isUser = marker.from.kind === 'user'
  const classes = ['dtg-msg', isUser ? 'dtg-msg-user' : 'dtg-msg-agent']
  if (marker.kind === 'turn') classes.push('dtg-msg-turn')
  const when = formatDateTime(marker.time, tzOffsetMinutes)
  const route = isUser
    ? `${t('you')} → ${speakerName(marker.to) === '—' ? uiLabel('leadLabel') : speakerName(marker.to)}`
    : `${speakerName(marker.from)} → ${speakerName(marker.to)}`
  const dropped = marker.droppedBefore > 0 ? ` · ${uiLabel('messageOmitted', { count: marker.droppedBefore })}` : ''
  const label = uiLabel('messageAria', { time: when, route, preview: marker.preview ?? '' })
  const style: CSSProperties = {
    left: marker.x,
    top: marker.y,
    width: marker.w,
    height: marker.h,
    ...(color === undefined ? {} : { background: color.bar }),
    // The two-tone ring is what makes the human's dot legible on BOTH themes;
    // it is a class-level rule too, so this only has to survive culling.
    ...(isUser
      ? { boxShadow: `0 0 0 2px var(${UR_MARKER_RING_TOKENS[0]}), 0 0 0 3.5px var(${UR_MARKER_RING_TOKENS[1]})` }
      : {}),
  }
  return (
    <span
      className={classes.join(' ')}
      style={style}
      title={`${when} · ${route}${dropped}${marker.preview === undefined || marker.preview === '' ? '' : `\n${marker.preview}`}`}
      aria-label={label}
      data-msg-kind={marker.kind}
      data-msg-from={marker.from.id}
      {...(marker.to === undefined ? {} : { 'data-msg-to': marker.to.id })}
    >
      <span className="dtg-msg-glyph" aria-hidden="true">
        {marker.kind === 'turn' ? '▸' : isUser ? '✎' : '✉'}
      </span>
      {marker.droppedBefore > 0 ? <span className="dtg-msg-count" aria-hidden="true">{`+${marker.droppedBefore}`}</span> : null}
    </span>
  )
}

function TaskCard({
  rect,
  selected,
  onSelectTask,
  tzOffsetMinutes,
  color,
}: {
  rect: TaskCardRect
  selected: boolean
  onSelectTask: (taskId: string | null) => void
  tzOffsetMinutes: number
  color?: LaneColorTokens | undefined
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
      style={{
        left: rect.x,
        top: rect.y,
        width: rect.w,
        height: rect.h,
        ...(color === undefined ? {} : { borderLeftColor: color.bar }),
      }}
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
