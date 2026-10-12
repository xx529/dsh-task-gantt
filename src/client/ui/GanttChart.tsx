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
  TASK_CHIP_GAP,
  clampMsPerPx,
  computeWindow,
  fitMsPerPx,
  formatClock,
  formatDateTime,
  isLiveBoard,
  messageMarkerPaint,
  speakerLaneMapper,
  taskDurationLine,
  layoutTimeline,
  type LaneBox,
  type MessageDirection,
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
 * The human's own prompts: a punched-out dot ringed by BOTH ends of the ink pair.
 *
 * The ring paints two layers, an inner `label-primary` and an outer
 * `label-primary-inverted`, so whichever skin is active at least one of them has
 * contrast against the surface — no theme detection, and no reliance on either
 * token's value flipping with the skin (a premise nobody has measured). On the
 * light surface the inner dark ring carries it; on the dark surface the outer
 * light ring does. The fill is the panel's own surface token, so the dot still
 * reads as a hole rather than as a coloured blob.
 *
 * A single mid-luminance token was tried and rejected: `label-secondary` measures
 * below the 3:1 graphical minimum on the dark surface, so a one-layer ring bets
 * on an unverified assumption, while two layers do not.
 */
const USER_COLOR: LaneColorTokens = {
  bar: '--dsw-alias-bg-layer-1',
  on: '--dsw-alias-label-primary',
}
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
 * The user marker's ring layers, INNER FIRST.
 *
 * Both are required and neither may be "simplified" away: they are the two ends
 * of the ink pair, and the whole point is that at least ONE of them has contrast
 * on whichever skin is active, without the component knowing which that is.
 *
 * Exported so a guard can hold the line: the failure mode is silent (a legal,
 * present token painting almost exactly the surface colour).
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
  /** Key of the selected marker, or null (independent of the task selection). */
  selectedMessageKey?: string | null
  /** Clicking a marker toggles it; Esc closes it (handled by the parent). */
  onSelectMessage?: (key: string | null) => void
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
  const { data, now, visible, selectedTaskId, onSelectTask, navigate, selectedMessageKey, onSelectMessage } = props

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
  /**
   * Lane id -> resolved paint, and session id -> lane id.
   *
   * The second map is not a convenience: a message's `from.id`/`to.id` are
   * SESSION ids, while this table is keyed by LANE id. Looking a speaker up
   * directly in `laneColors` returns undefined and paints nothing — the bug that
   * made every agent marker look like the human's fixed colour.
   */
  const laneColors = useMemo(() => {
    const map = new Map<string, LaneColorTokens>()
    data.lanes.forEach((lane, index) => map.set(lane.id, laneColor(lane, index)))
    return map
  }, [data])
  /**
   * Speaker id (a SESSION id) -> lane id.
   *
   * Two hops, because they are two different id spaces:
   *  1. a teammate's lane id IS its session id, so an exact lane-id match wins;
   *  2. otherwise the lane's own `navigation.value` carries its session id —
   *     which is the only way the LEAD resolves, since its lane id is the literal
   *     'lead' while its session id is 'session-…'.
   * Returning null means "not on this board" (system, or a member that left).
   */
  // Shared with the layout's density pass and the details panel, so a speaker id
  // can never be mapped one way while being drawn another way.
  const laneIdOf = useMemo(() => speakerLaneMapper(data.lanes), [data])
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
                  paint={markerPaint(marker, laneColors, laneIdOf, userPaint, systemPaint)}
                  selected={marker.key === selectedMessageKey}
                  onSelect={onSelectMessage}
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
            {/* The legend uses the SAME two shapes as the markers (solid ↗ vs
                hollow ↙), so it explains the cue the reader actually sees rather
                than approximating it. */}
            <span className="dtg-legend-item" title={uiLabel('messageLegendHint')}>
              <span className="dtg-legend-arrow dtg-legend-arrow-solid" aria-hidden="true">↗</span>
              {uiLabel('messageLegendSent')}
            </span>
            <span className="dtg-legend-item" title={uiLabel('messageLegendHint')}>
              <span className="dtg-legend-arrow dtg-legend-arrow-hollow" aria-hidden="true">↙</span>
              {uiLabel('messageLegendReceived')}
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
            ? `${uiLabel('nowLabel')} ${formatClock(marker.time, tzOffsetMinutes, { seconds: false })}`
            : `${uiLabel('endedLabel')} ${formatClock(marker.time, tzOffsetMinutes, { seconds: false })}`}
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
/**
 * The paint + direction a marker needs, resolved outside JSX so a test can
 * assert it (verify imports {@link markerPaint} rather than walking elements,
 * so the tested function and the painted result cannot drift).
 */
export interface MarkerPaint {
  paint: LaneColorTokens
  direction: MessageDirection
  peerName: string
  peerMatched: boolean
  isUser: boolean
}

/**
 * Colour a message marker for the lane it is drawn on.
 *
 * The colour is always the COUNTERPART's lane colour ("A's lane shows B's
 * colour"), while the user's own fixed two-tone paint is used whenever the
 * counterpart is the human. A counterpart that is not a lane of this board
 * (`system`, or a member already gone) falls back to the neutral paint instead
 * of an invented one, and `peerMatched` carries that fact into the tooltip.
 */
export function markerPaint(
  marker: MessageMarkerRect,
  laneColors: Map<string, LaneColorTokens>,
  laneIdOf: (sessionId: string) => string | null,
  userPaint: LaneColorTokens,
  systemPaint: LaneColorTokens,
): MarkerPaint {
  const resolved = messageMarkerPaint(
    {
      kind: marker.kind,
      time: marker.time,
      end: marker.end,
      from: marker.from,
      to: marker.to,
      preview: marker.preview,
      sessionId: marker.from.id,
    },
    marker.laneId,
    laneColors,
    laneIdOf,
    userPaint,
    systemPaint,
  )
  return {
    paint: resolved.paint,
    direction: resolved.direction,
    peerName: resolved.peerName,
    peerMatched: resolved.peerMatched,
    isUser: resolved.isUser,
  }
}

function MessageMarker({
  marker,
  paint,
  tzOffsetMinutes,
  selected,
  onSelect,
}: {
  marker: MessageMarkerRect
  paint: MarkerPaint
  tzOffsetMinutes: number
  selected: boolean
  onSelect?: ((key: string | null) => void) | undefined
}): ReactNode {
  const color = paint.paint
  const outgoing = paint.direction === 'outgoing'
  const isUser = paint.isUser
  const classes = ['dtg-msg', isUser ? 'dtg-msg-user' : 'dtg-msg-agent', outgoing ? 'dtg-msg-out' : 'dtg-msg-in']
  if (marker.kind === 'turn') classes.push('dtg-msg-turn')
  if (selected) classes.push('dtg-msg-active')
  const when = formatDateTime(marker.time, tzOffsetMinutes)
  // The route is stated from THIS lane's point of view, so it is self-evident
  // which way the message went and who the other side is.
  const route = outgoing
    ? `${uiLabel('messageSentTo')} ${paint.peerName}`
    : `${uiLabel('messageReceivedFrom')} ${paint.peerName}`
  const peerNote = paint.peerMatched ? '' : ` · ${uiLabel('messagePeerUnknown')}`
  const dropped = marker.droppedBefore > 0 ? ` · ${uiLabel('messageOmitted', { count: marker.droppedBefore })}` : ''
  const label = uiLabel('messageAria', { time: when, route, preview: marker.preview ?? '' })
  const counterpart = color === undefined ? undefined : color.bar
  const solidInk = color === undefined ? 'var(--dsw-alias-label-primary-inverted)' : color.on
  /**
   * The plates and inks for one marker.
   *
   * - outgoing: a SOLID plate in the counterpart's colour, arrow cut out of it;
   * - incoming: NO plate, the counterpart's colour as outline + arrow ink;
   * - the human's own prompt: the surface fill with the two-tone ring, because a
   *   hue cannot be legible on both skins (one candidate measured 1.16:1 on the
   *   light surface). That ring is the reason this branch must win over the
   *   incoming styling: a prompt IS incoming, but it is not a lane transfer.
   * - a turn marker: a quiet solid plate, never mistaken for a person's message.
   */
  const shape: 'solid' | 'hollow' = outgoing ? 'solid' : 'hollow'
  const style: CSSProperties = {
    left: marker.x,
    top: marker.y,
    width: marker.w,
    height: marker.h,
    ...(isUser
      ? {
          background: 'var(--dsw-alias-bg-layer-1)',
          boxShadow: `0 0 0 2px var(${UR_MARKER_RING_TOKENS[0]})`,
        }
      : outgoing
        ? { background: counterpart ?? 'var(--dsw-alias-label-tertiary)', color: solidInk }
        : { background: 'transparent', ...(counterpart === undefined ? {} : { border: `1px solid ${counterpart}`, color: counterpart }) }),
  }
  // A BUTTON, so the body is reachable by mouse and keyboard. The long body is
  // deliberately NOT in `title` (browser tooltips truncate and cannot scroll):
  // the tooltip stays the one-line summary, and the detail view carries the text.
  const interactive = typeof onSelect === 'function'
  const Tag = interactive ? 'button' : 'span'
  return (
    <Tag
      {...(interactive ? { type: 'button', onClick: () => onSelect(selected ? null : marker.key), 'aria-pressed': selected } : {})}
      className={classes.join(' ')}
      style={style}
      title={`${when} · ${route}${peerNote}${dropped}`}
      aria-label={label}
      data-msg-kind={marker.kind}
      data-msg-shape={shape}
      data-msg-direction={paint.direction}
      data-msg-peer={paint.peerName}
      data-msg-key={marker.key}
      data-msg-from={marker.from.id}
      {...(marker.to === undefined ? {} : { 'data-msg-to': marker.to.id })}
    >
      <span className="dtg-msg-glyph" aria-hidden="true" style={{ color: 'inherit' }}>
        {marker.kind === 'turn' ? '▸' : outgoing ? '↗' : '↙'}
      </span>
      {marker.droppedBefore > 0 ? <span className="dtg-msg-count" aria-hidden="true">{`+${marker.droppedBefore}`}</span> : null}
    </Tag>
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
  // The tooltip carries the same endpoints + elapsed time as the details panel,
  // so a user can check "why is this bar this long" on hover, without clicking.
  const elapsed = taskDurationLine(task, (time) => formatDateTime(time, tzOffsetMinutes), {
    created: uiLabel('taskCreatedAt'),
    finished: uiLabel('taskFinishedAt'),
    lastTransition: uiLabel('taskLastTransitionAt'),
    duration: uiLabel('taskDuration'),
    unknown: uiLabel('taskDurationUnknown'),
    line: uiLabel('taskDurationLine'),
  })
  const full = `${task.subject}\n${task.description}${elapsed.known ? `\n${elapsed.from} → ${elapsed.label} ${elapsed.to} (${elapsed.duration})` : `\n${elapsed.text}`}`
  const onKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectTask(selected ? null : task.id)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onSelectTask(null)
    }
  }
  const labelStyle: CSSProperties = {
    left: rect.labelX,
    top: rect.labelY,
    width: rect.labelW,
    height: rect.labelH,
    ...(color === undefined ? {} : { borderLeftColor: color.bar }),
  }
  return (
    <span className="dtg-task-wrap" data-task-id={task.id}>
      {/* The BAR: its length is the task's real elapsed time, floored only at the
          visual minimum. Never widened to fit the label — that is what made every
          task look equally long. A duration-less task draws a marker, not a bar. */}
      <span
        className={`dtg-task-bar dtg-task-bar-${rect.anchor}${rect.live ? ' dtg-task-bar-live' : ''}`}
        style={{
          left: rect.x,
          // Centred inside the card box, at TASK_BAR_HEIGHT tall — a bar, not a
          // 36px blob (that is what read as "a colour chip floating by the text").
          top: rect.barY,
          width: rect.w,
          height: rect.barH,
          ...(color === undefined ? {} : { background: color.bar }),
        }}
        aria-hidden="true"
      />
      {/* The LABEL chip, decoupled: inside the bar when it fits, otherwise hung to
          its right with a hairline anchor back to the bar's end. */}
      {rect.labelPlacement === 'right' && !rect.live ? (
        <span
          className="dtg-task-anchor"
          style={{ left: rect.x + rect.w, top: rect.y + rect.h / 2, width: Math.max(TASK_CHIP_GAP, rect.labelX - (rect.x + rect.w)) }}
          aria-hidden="true"
        />
      ) : null}
      <button
        type="button"
        className={`dtg-task dtg-ink-${task.status}${rect.live ? ' dtg-task-live' : ''}${rect.labelPlacement === 'right' ? ' dtg-task-outside' : ''}`}
        style={labelStyle}
        title={full}
        aria-label={aria}
        aria-pressed={selected}
        onClick={() => onSelectTask(selected ? null : task.id)}
        onKeyDown={onKeyDown}
        data-task-anchor={rect.anchor}
        data-label-placement={rect.labelPlacement}
      >
        <span className="dtg-task-subject">{task.subject === '' ? '—' : task.subject}</span>
        {task.description === '' ? null : <span className="dtg-task-desc">{task.description}</span>}
        {rect.live ? <span className="dtg-task-flag">{uiLabel('liveBadge')}</span> : null}
      </button>
    </span>
  )
}