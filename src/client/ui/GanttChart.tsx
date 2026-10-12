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
  LaneWait,
  LaneNavigation,
  MemberStatus,
  MessageSpan,
  TaskEvent,
  TimelineResponse,
  TimelineTask,
} from '../../shared/contract.ts'
import { format, t } from '../i18n.ts'
import { uiLabel } from './labels.ts'
import {
  STATUS_GLYPH,
  historyActionText,
  memberStatusText,
  roleText,
  taskStatusText,
} from './status.ts'
import {
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_LANE_HEIGHT,
  LANE_COLOR_FALLBACKS as LANE_COLOR_FALLBACKS_SHARED,
  LANE_HEAD_WIDTH,
  MESSAGE_MARKER_HEIGHT,
  MESSAGE_MARKER_TOP,
  TASK_CHIP_GAP,
  clampMsPerPx,
  computeWindow,
  fitMsPerPx,
  formatClock,
  formatDateTime,
  isLiveBoard,
  clamp,
  inWindow,
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
  // `var(--x)` in string fields, and double-wrapping would paint nothing. A
  // `color-mix()` composition of tokens is the third spelling and is left alone for
  // the same reason — `var(color-mix(...))` is a lookup of a name that never exists.
  if (name.startsWith('var(') || name.startsWith('color-mix(')) return name
  return `var(${name})`
}

/**
 * The fallback lane palette is IMPORTED, never copied.
 *
 * There used to be two tables: this one and `LANE_COLOR_FALLBACKS` in
 * `timeline-layout.ts`. When the palette changed, one was updated and the other
 * still named `--dsw-alias-state-idle-primary` — a chroma-0 grey — so "no grey
 * lanes" was true on one code path and false on the other. One table, one meaning.
 */
const LANE_COLOR_FALLBACKS: readonly LaneColorTokens[] = LANE_COLOR_FALLBACKS_SHARED

/**
 * NOTE for a later reader. An ink-selection helper used to live here: it measured
 * a lane's fill and chose between `color.on` and `color.onLight` by WCAG contrast.
 * It was REMOVED because the marker no longer needs it — a marker is painted in the
 * counterpart's lane FILL (the user's colour rule), never in an ink chosen for a
 * fill, and the arrow that sits on the panel gets a hairline of the surface behind
 * it instead. Keeping it would have meant carrying a contrast engine, a
 * `getComputedStyle` probe and a memo, all uncalled.
 *
 * The lesson it encoded is worth keeping, though: a lane colour is chosen to be
 * legible against ITS OWN fill, and that says nothing about how it reads on the
 * PANEL. The measured case was `--dsw-static-green-500` (#22c55e) at 2.28:1 on the
 * light panel. Anything drawn on the panel has to clear 3:1 against the panel.
 */

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
  /**
   * Duration of the trailing window, or `null` for the whole board
   * ("the last N", never a fixed slice: the right edge stays the board's own).
   */
  windowSpanMs?: number | null
  /**
   * When on, the view scrolls itself so the NOW line stays near the right edge as
   * time advances. While off, this component NEVER writes `scrollLeft` — the
   * user's position is theirs, and the panel does not flip the flag either.
   */
  follow?: boolean
  /** Key of the selected marker, or null (independent of the task selection). */
  selectedMessageKey?: string | null
  /** Clicking a marker toggles it; Esc closes it (handled by the parent). */
  onSelectMessage?: (key: string | null) => void
}

/** A lane's identity colour, with a stable fallback when the host omits it. */
function laneColor(lane: TimelineResponse['lanes'][number], index: number): LaneColorTokens {
  const given = lane.color
  if (given !== undefined && typeof given.bar === 'string' && given.bar !== '') {
    const on = lanePaint(given.on ?? '--dsw-alias-label-primary-inverted')
    // A payload from before `onLight` existed gets the SAME ink for both, which
    // is precisely the previous behaviour — never an invented second token.
    return { bar: lanePaint(given.bar), on, onLight: given.onLight === undefined ? on : lanePaint(given.onLight) }
  }
  const pick = (index0: number): LaneColorTokens => {
    const entry = LANE_COLOR_FALLBACKS[index0 % LANE_COLOR_FALLBACKS.length]!
    return {
      bar: lanePaint(entry.bar),
      on: lanePaint(entry.on),
      onLight: entry.onLight === undefined ? lanePaint(entry.on) : lanePaint(entry.onLight),
    }
  }
  if (lane.role === 'lead') return pick(0)
  if (lane.id === 'unassigned' || lane.role === 'unknown') return pick(LANE_COLOR_FALLBACKS.length - 1)
  // Only the NAME-bearing tail of the palette is hashed into: slot 0 belongs to
  // the Lead and the last slot to `unassigned`, so a teammate never silently
  // takes either identity.
  let hash = 0
  for (let i = 0; i < lane.id.length; i += 1) hash = (hash * 31 + lane.id.charCodeAt(i)) >>> 0
  return pick(1 + (hash % (LANE_COLOR_FALLBACKS.length - 2)))
}

export function GanttChart(props: GanttChartProps): ReactNode {
  const {
    data,
    now,
    visible,
    selectedTaskId,
    onSelectTask,
    navigate,
    selectedMessageKey,
    onSelectMessage,
    windowSpanMs,
    follow,
  } = props

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

  // The trailing window is the LAYOUT's business (`options.windowSpanMs`): it
  // already clamps to the log's own start, ignores null/0/negative/NaN, and keeps
  // `end` untouched so a filtered live board still follows NOW. Re-deriving it
  // here would be a second implementation of the same rule, free to drift.
  /**
   * The window is computed ONCE, here, WITH the time filter applied — and it is
   * the same value the layout receives and the same one the auto-fit uses.
   *
   * Deriving an unfiltered window for the fit (or for the wait blocks) is how a
   * "last 5 minutes" selection ended up drawn as a 41px sliver in a 248px panel:
   * the scale was still fitted to the full 30-minute log. Anything that needs the
   * window must read `layout.window` or this memo, never re-derive it.
   */
  const win = useMemo(() => computeWindow(data, now, windowSpanMs), [data, now, windowSpanMs])
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
  /** Only show the wait legend when the board actually has waits to explain. */
  const waitBandCount = data.lanes.reduce((total, lane) => total + (lane.waits?.length ?? 0), 0)
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
          windowSpanMs,
        },
      ),
    [data, now, effectiveMsPerPx, viewport.width, viewport.height, scroll.left, scroll.top, messageMode],
  )

  /* ------------------------------------------------- measurement + scroll */

  const syncScroll = useCallback(
    () => {
      const el = scrollRef.current
      if (el === null) return
      const top = el.scrollTop
      const left = el.scrollLeft
      setScroll((prev) => (prev.left === left && prev.top === top ? prev : { left, top }))
    },
    [],
  )

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

  /**
   * FOLLOW: keep the NOW line ~24px inside the right edge.
   *
   * With a time filter the scrollable range is short, so the same formula
   * collapses to "park at the far right" — one code path for both cases. The
   * decision itself is the exported pure function, so the behaviour is a truth
   * table rather than a side effect nobody can test.
   */
  useEffect(() => {
    if (follow !== true) return
    const { scrollTo } = shouldFollowScroll({
      follow: true,
      live: isLiveBoard(data),
      nowX: layout.nowX,
      viewportWidth: viewport.width,
      contentWidth: layout.contentWidth,
      scrollLeft: scroll.left,
    })
    if (scrollTo === null) return
    setScroll((previous) => (previous.left === scrollTo ? previous : { ...previous, left: scrollTo }))
    const el = scrollRef.current
    if (el !== null) {
      el.scrollLeft = scrollTo
      syncScroll()
    }
  }, [follow, data, layout.nowX, layout.contentWidth, viewport.width, scroll.left, syncScroll])

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
    // A zoom keeps the cursor's instant under the pointer; that is not the user
    // scrolling, so it is not reported either.
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
  /**
   * The lane's `wait_agent` blocks. Placed on the message track, because that row
   * already means "this agent is dealing with someone else"; the turn/step bars
   * above it mean "working", which a wait is precisely not.
   */
  const waitBands = useMemo(() => {
    const out: WaitBandRect[] = []
    // Read the LAYOUT's window and scale, not a re-derivation: they already carry
    // the time filter, and using anything else put every wait off the canvas.
    const laneWindow = { start: layout.window.start, end: layout.window.end }
    data.lanes.forEach((lane, index) => {
      const waits = lane.waits
      if (waits === undefined || waits.length === 0) return
      out.push(
        ...waitBandRects(waits, {
          laneId: lane.id,
          laneIndex: index,
          windowStart: laneWindow.start,
          windowEnd: laneWindow.end,
          msPerPx: layout.msPerPx,
          cull: true,
          viewportWidth: Math.max(1, viewport.width),
          scrollLeft: scroll.left,
          laneY: DEFAULT_HEADER_HEIGHT + index * DEFAULT_LANE_HEIGHT,
          laneHeight: DEFAULT_LANE_HEIGHT,
        }),
      )
    })
    return out
  }, [data, layout.window.start, layout.window.end, layout.msPerPx, viewport.width, scroll.left])

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
              {/* Wait blocks sit UNDER the message markers: a wait is a period,
                  a marker is an instant. Each one draws both ends: a filled cap at
                  the start, and either a filled cap (it finished) or an open,
                  dashed cap (it is still blocking) at the end. */}
              {waitBands.map((band) => (
                <WaitBand key={`wait:${band.laneId}:${band.start}:${band.end ?? 'open'}`} band={band} />
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
                msPerPx={layout.msPerPx}
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
            {/* The legend uses the SAME two shapes as the markers (filled ↗ vs
                outlined ↙), so it explains the cue the reader actually sees rather
                than approximating it. */}
            <span className="dtg-legend-item" title={uiLabel('messageLegendHint')}>
              <span className="dtg-legend-arrow" aria-hidden="true">
                <ArrowIcon className="dtg-msg-arrow" direction="out" filled ink="currentColor" />
              </span>
              {uiLabel('messageLegendSent')}
            </span>
            <span className="dtg-legend-item" title={uiLabel('messageLegendHint')}>
              <span className="dtg-legend-arrow" aria-hidden="true">
                <ArrowIcon className="dtg-msg-arrow" direction="in" filled={false} ink="currentColor" />
              </span>
              {uiLabel('messageLegendReceived')}
            </span>
            {waitBandCount === 0 ? null : (
              <span className="dtg-legend-item" title={uiLabel('waitLegendHint')}>
                <span className="dtg-legend-wait" aria-hidden="true" />
                {uiLabel('waitLegend')}
              </span>
            )}
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
        {/* The task-transition rail's key. Without it the glyphs under a bar are
            unexplained decoration; with it they say "this task was created, claimed and
            completed, and here is where". The words come from `historyActionText`, i.e.
            the SAME vocabulary the details panel prints, so the key cannot drift from
            the marks it explains. */}
        <span className="dtg-legend-item dtg-legend-events" title={uiLabel('historyLabel')}>
          {uiLabel('historyLabel')}
          {(['created', 'claimed', 'completed'] as const).map((action) => (
            <span className="dtg-legend-event" key={action} title={historyActionText(action)}>
              <span aria-hidden="true">{TASK_EVENT_GLYPH[action]}</span>
              {historyActionText(action)}
            </span>
          ))}
        </span>
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
    roleText(lane.role),
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
        {/* The identity colour is the NAME's background, with white text — the user's
            ask: "改成是 agent 名称的背景色，例如 lead 文字是白色，有个背景色是蓝色".
            It used to be a 2px border on the row's left edge, which read as a hairline
            rather than as identity. The colour is set inline because the CSS must stay
            free of literal paint (the theme scan enforces that), and `color.bar` is
            already resolved by `lanePaint` into `var(...)` or a `color-mix(...)`. */}
        <span
          className="dtg-head-name"
          title={lane.name}
          // BOTH the fill and the ink come from the payload. The ink must, because the
          // theme's "text on a saturated fill" ALIAS flips with the skin (white in the
          // light one, `#353638` in the dark one) and on a blue fill that is 2.34:1. The
          // host sends a static white for exactly this reason; hardcoding the alias here
          // or in the stylesheet would put dark grey text on a blue pill in the dark skin.
          style={color === undefined ? undefined : { background: color.bar, color: lanePaint(color.on) }}
        >
          {lane.name}
        </span>
        <span className={ink} aria-hidden="true">
          <span className="dtg-glyph">{STATUS_GLYPH[status] ?? '·'}</span>
        </span>
      </div>
      <div className="dtg-head-meta">
        {/* NO role badge here. It was a bordered chip printing the role, and for the Lead
            it printed "Lead" directly under a name pill that already said the same word
            — the user's "下面多了一个白色框+ agent名称，这个已经是多余的了". Removing it
            also frees 16px of the head column, which was at zero margin.
            The role is not lost: it stays in the row's tooltip and accessible name. */}
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

/**
 * One `wait_agent` block: a low-saturation band with a cap at EACH end.
 *
 * Both ends are drawn because the user asked to see when a wait began and when
 * it ended. The end cap differs by outcome:
 *   - finished, and a peer arrived -> a solid cap;
 *   - finished, timed out         -> a differently shaped cap (bar), so "nobody
 *     ever came" is visible without reading the tooltip;
 *   - still blocking              -> NO cap, and the band fades out, because that
 *     end has not happened yet;
 *   - outcome unreadable          -> a neutral cap, never a guess.
 */
function WaitBand({ band }: { band: WaitBandRect }): ReactNode {
  const classes = ['dtg-wait']
  if (band.open) classes.push('dtg-wait-open')
  else if (band.timedOut === true) classes.push('dtg-wait-timeout')
  else if (band.timedOut === false) classes.push('dtg-wait-woken')
  else classes.push('dtg-wait-unknown')
  const seconds = band.end === null ? null : Math.round((band.end - band.start) / 1000)
  const outcome =
    band.open
      ? uiLabel('waitOutcomeOpen')
      : band.timedOut === true
        ? uiLabel('waitOutcomeTimedOut')
        : band.timedOut === false
          ? uiLabel('waitOutcomeWoken')
          : uiLabel('waitOutcomeUnknown')
  const from = formatDateTime(band.start, -new Date(band.start).getTimezoneOffset())
  // An open wait states its outcome once, not twice: the duration IS "still
  // blocking" there, so a separate duration phrase repeated the same words.
  const label =
    seconds === null
      ? uiLabel('waitAriaOpen', { from, outcome })
      : uiLabel('waitAria', { from, duration: uiLabel('waitSeconds', { count: seconds }), outcome })
  return (
    <span
      className={classes.join(' ')}
      style={{ left: band.x, top: band.y, width: band.w, height: band.h }}
      title={label}
      aria-label={label}
      data-lane-wait={band.laneId}
      data-wait-open={band.open ? 'true' : 'false'}
      data-wait-outcome={band.open ? 'open' : band.timedOut === true ? 'timeout' : band.timedOut === false ? 'woken' : 'unknown'}
    >
      {/* start cap: always present, the wait definitively began */}
      <span className="dtg-wait-cap dtg-wait-cap-start" aria-hidden="true" />
      {/* end cap: only when the end exists */}
      {band.open ? null : <span className="dtg-wait-cap dtg-wait-cap-end" aria-hidden="true" />}
    </span>
  )
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
/* ------------------------------------------------------------------ waits */

/** Local finite-number guard, so wait geometry never depends on an unexported helper. */
function finiteOr(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** One `wait_agent` block, in content px. */
export interface WaitBandRect {
  laneId: string
  laneIndex: number
  /** Epoch ms the wait started. Never clamped away: the START is a fact. */
  start: number
  /** Epoch ms it returned, or `null` while it is still blocking (open end). */
  end: number | null
  /** `true` while `end` is null: drawn out to the NOW edge and left open. */
  open: boolean
  /**
   * `true` / `false` from the tool result, or UNDEFINED when it could not be
   * read. Undefined renders neutrally — guessing here would assert something
   * about what an agent was doing that the log does not say.
   */
  timedOut: boolean | undefined
  timeoutMs: number | undefined
  x: number
  w: number
  /** Vertical placement on the message track. */
  y: number
  h: number
  /**
   * `true` when the wait began BEFORE this window: the band is clipped to x = 0,
   * so its left edge is the window, not the real start.
   */
  clippedLeft: boolean
  /** Left (start) and right (end) caps, so "begin and end" are both legible. */
  capLeftX: number
  capRightX: number
  viewX: number
  visible: boolean
}

/**
 * Lay out a lane's `wait_agent` spans on the MESSAGE track.
 *
 * Deliberately not on the turn/step bars: those mean "working", a wait means
 * "blocked, waiting for someone else" — the distinction the user asked for — and
 * the message row is already where an agent's contact with others is drawn.
 *
 * @param waits - the lane's waits, in any order.
 * @param input - the window and scale to project into content px.
 */
export function waitBandRects(
  waits: readonly LaneWait[],
  input: {
    laneId: string
    laneIndex: number
    windowStart: number
    windowEnd: number
    msPerPx: number
    cull?: boolean
    viewportWidth?: number
    scrollLeft?: number
    /** Top of the lane row in content px; the band is placed on the message track. */
    laneY?: number
    /** Height of the lane row, used to size the band. */
    laneHeight?: number
  },
): WaitBandRect[] {
  const msPerPx = input.msPerPx > 0 ? input.msPerPx : 1
  const width = input.viewportWidth ?? Number.POSITIVE_INFINITY
  const scrollLeft = input.scrollLeft ?? 0
  const toX = (time: number): number =>
    (clamp(time, input.windowStart, input.windowEnd) - input.windowStart) / msPerPx
  const out: WaitBandRect[] = []
  for (const wait of waits) {
    if (wait === null || typeof wait !== 'object') continue
    const start = finiteOr(wait.start, Number.NaN)
    if (!Number.isFinite(start)) continue
    const resolvedEnd = finiteOr(wait.end ?? Number.NaN, Number.NaN)
    const open = wait.end === null || wait.end === undefined || !Number.isFinite(resolvedEnd)
    const end = open ? null : resolvedEnd
    // Same window test the tasks and spans use, so a filtered board treats every
    // kind of interval consistently: an interval entirely BEFORE the window is
    // gone, one that straddles the left edge is kept and clipped to x = 0, and an
    // open wait takes the window end as its right edge so it is always in view.
    const effectiveEnd = end === null ? input.windowEnd : end
    if (!inWindow(start, effectiveEnd, { start: input.windowStart, end: input.windowEnd })) continue
    const clippedLeft = start < input.windowStart
    const startX = toX(start)
    const endX = end === null ? toX(input.windowEnd) : toX(end)
    const x = Math.min(startX, endX)
    // An open wait runs to the window edge; a closed one keeps its real duration.
    const w = Math.max(1, Math.abs(endX - startX))
    const viewX = x - scrollLeft
    const visible = viewX + w >= 0 && viewX <= width
    if (input.cull === true && !visible) continue
    out.push({
      laneId: input.laneId,
      laneIndex: input.laneIndex,
      start,
      end,
      open,
      timedOut: wait.timedOut,
      timeoutMs: wait.timeoutMs,
      x,
      w,
      clippedLeft,
      y: (input.laneY ?? 0) + MESSAGE_MARKER_TOP,
      h: MESSAGE_MARKER_HEIGHT,
      capLeftX: x,
      capRightX: x + w,
      viewX,
      visible,
    })
  }
  return out
}

/**
 * Decide where the scroll container should be so the NOW edge stays in view.
 *
 * A pure truth table rather than "did we call scrollTo": what matters is the
 * behaviour in each combination, not how many times something was invoked.
 *
 * - follow OFF: never move the container. The user's manual scroll position is
 *   theirs; we do not fight it, and we never flip the toggle behind their back.
 * - follow ON but not live (nobody working): nothing moves, so nothing to chase.
 * - otherwise: put the NOW line at `viewportWidth - margin`, clamped to the
 *   scrollable range. With a time filter the range is short, so this collapses to
 *   "scroll to the far right" — one code path for both cases.
 *
 * @param input - the current follow flag, liveness and geometry.
 * @returns the absolute `scrollLeft` to apply, or `null` to leave it alone.
 */
export function shouldFollowScroll(input: {
  follow: boolean
  live: boolean
  nowX: number
  viewportWidth: number
  contentWidth: number
  scrollLeft: number
  margin?: number
}): { scrollTo: number | null } {
  if (!input.follow || !input.live) return { scrollTo: null }
  const margin = input.margin ?? 24
  const maxScroll = Math.max(0, input.contentWidth - input.viewportWidth)
  if (maxScroll <= 0) return { scrollTo: null }
  const target = clamp(input.nowX - (input.viewportWidth - margin), 0, maxScroll)
  // Sub-pixel differences would otherwise fire on every tick for nothing.
  if (Math.abs(target - input.scrollLeft) < 0.5) return { scrollTo: null }
  return { scrollTo: target }
}

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
  /**
   * The counterpart's lane FILL — the marker's ink.
   *
   * This is the user's colour rule: "A 发给 B，A 的泳道显示 收件人B 的颜色". Note it
   * is the counterpart's `bar` (the lane FILL), never its `on` (the ink for text
   * sitting on that fill). Substituting the ink here painted every white-inked lane
   * as a white arrow on the white panel — invisible, and measured: 48 of 48 arrows
   * came out `rgb(255,255,255)` on a `rgb(255,255,255)` surface.
   */
  const counterpart = color === undefined ? undefined : color.bar
  const arrowInk = counterpart ?? 'var(--dsw-alias-label-secondary)'
  /**
   * The marker's paint.
   *
   * - an agent message: NO plate and NO ring — the arrow is the whole icon, so
   *   nothing boxes in the shape the reader is trying to recognise. Direction is
   *   carried three ways at once: the arrow points ↗ or ↙, it is FILLED for a
   *   message this lane sent and OUTLINED for one it received, and the ink is the
   *   counterpart's lane colour.
   * - the human's own prompt: a punched-out disc with the two-tone ring, because
   *   a prompt must never read as a lane transfer and no single hue is legible on
   *   both skins. This branch deliberately wins over the incoming styling.
   * - a turn marker: the quiet `▸` tick, on no plate at all.
   */
  const shape: 'solid' | 'hollow' = outgoing ? 'solid' : 'hollow'
  const style: CSSProperties = {
    left: marker.x,
    top: marker.y,
    width: marker.w,
    height: marker.h,
    background: 'transparent',
    // The human's bubble is drawn in the panel's own primary ink, which flips with the
    // skin, and carries the SAME surface halo as every other marker. It used to be a
    // punched-out white disc with a two-tone ring and a dark glyph inside, which the
    // user described exactly: "变成一个白色框黑心的东西". A disc plus a ring plus a dark
    // centre is three shapes at 11px; the bubble alone is one, and it says what it means.
    color: isUser ? 'var(--dsw-alias-label-primary)' : arrowInk,
  }
  /**
   * A hairline of the PANEL SURFACE behind every marker.
   *
   * A lane colour is only guaranteed legible against its OWN fill — the marker sits on
   * the PANEL. Measured: `--dsw-static-green-500` (#22c55e) appears at 2.28:1 on the
   * light panel, below the 3:1 graphical minimum, so a bare green arrow would be a
   * smudge. The same is true of the human's ink on a dark skin. Punching a hairline of
   * the surface out behind the icon makes its own edge readable while leaving its
   * middle the ink colour, and it is why no marker needs a plate or a frame.
   */
  style.boxShadow = '0 0 0 1.5px var(--dsw-alias-bg-layer-1)'
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
      {marker.kind === 'turn' ? (
        <span className="dtg-msg-glyph" aria-hidden="true">▸</span>
      ) : isUser ? (
        // The human's own prompt is not a lane transfer, so it does not get an arrow.
        // It used to draw the same arrow in the punched-out disc, which the user read as
        // "变成一个白色框黑心的东西" — a dark glyph inside a white ring says nothing about
        // WHO spoke. A speech bubble is the shape everyone already reads as "a person
        // typed this", and it is unmistakable next to the arrows.
        <BubbleIcon className="dtg-msg-bubble" ink={`var(${UR_MARKER_RING_TOKENS[0]})`} />
      ) : (
        <ArrowIcon className="dtg-msg-arrow" direction={outgoing ? 'out' : 'in'} filled={outgoing} ink={arrowInk} />
      )}
      {marker.droppedBefore > 0 ? <span className="dtg-msg-count" aria-hidden="true">{`+${marker.droppedBefore}`}</span> : null}
    </Tag>
  )
}

/**
 * The diagonal arrow that IS the marker.
 *
 * Drawn as an SVG path rather than set as a text glyph: the character renders as a
 * hairline at the 9-11px this track has room for, its weight depends on the font,
 * and no font-size makes it as legible as a thick stroke with round caps. The
 * user's reference image is exactly this shape — a fat rounded diagonal with a fat
 * rounded head — and the earlier revisions' problem was a plate around the glyph
 * competing with its tip.
 *
 * Both directions describe the SAME arrow, so only the aim and the weight differ —
 * never the silhouette:
 *
 * | | aim | weight |
 * |---|---|---|
 * | outgoing | up-right  | stroke 3.4px, which fills the head's barbs |
 * | incoming | down-left | stroke 2px |
 *
 * Same geometry, same size, same position; only the weight and the aim differ, which
 * is what the user asked for ("改成更接收一样的 icon 只是方向变了").
 *
 * Visibility on the panel is handled OUTSIDE the icon: the marker carries a hairline
 * of the panel surface behind it (see `MessageMarker`), so a pale lane colour still
 * reads as an edge. That keeps this component free of any contrast branching.
 *
 * @param props.direction - `'out'` points up-right (this lane sent it), `'in'`
 *   points down-left (this lane received it).
 * @param props.filled - `true` for outgoing, `false` for incoming.
 * @param props.ink - the counterpart's lane FILL, as a CSS colour.
 */
function ArrowIcon({
  className,
  direction,
  filled,
  ink,
  size = 12,
}: {
  className: string
  direction: 'out' | 'in'
  filled: boolean
  ink: string
  size?: number
}): ReactNode {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      width={size}
      height={size}
      aria-hidden="true"
      focusable="false"
      fill="none"
      stroke={ink}
      strokeWidth={filled ? ARROW_STROKE_SENT : ARROW_STROKE_RECEIVED}
      strokeLinecap="round"
      strokeLinejoin="round"
      transform={direction === 'out' ? undefined : 'scale(-1,-1)'}
    >
      <path d={ARROW_PATH} />
    </svg>
  )
}


/**
 * The speech bubble that marks the human's own prompt.
 *
 * A rounded rectangle with a tail, drawn as an OUTLINE. Solid would put a dark blob in
 * the marker position, which is the "白色框黑心的东西" the user was describing; an outline
 * reads as a bubble at 11px and still cannot be confused with the lane arrows that mean
 * "this lane sent / received a message". One path, one `currentColor`.
 */
function BubbleIcon({ className, ink }: { className: string; ink: string }): ReactNode {
  return (
    <svg
      className={className}
      viewBox="0 0 12 12"
      width={11}
      height={11}
      aria-hidden="true"
      focusable="false"
      style={{ fill: 'none', stroke: ink, strokeWidth: 1.4, strokeLinejoin: 'round' }}
    >
      <path d="M2.4 1.8 H9.6 A1.6 1.6 0 0 1 11.2 3.4 V7 A1.6 1.6 0 0 1 9.6 8.6 H6.1 L3.4 10.9 V8.6 H2.4 A1.6 1.6 0 0 1 0.8 7 V3.4 A1.6 1.6 0 0 1 2.4 1.8 Z" />
    </svg>
  )
}


/**
 * The arrow's geometry, in the 12x12 box: ONE centreline, drawn at two weights.
 *
 * This is deliberately one path and not two. Two earlier revisions used a FILLED
 * path for the sent arrow and a stroked one for the received arrow, and both times
 * the filled variant came out wrong — first because the shared path was all open
 * segments (a fill on open lines paints almost nothing, so the sent marker collapsed
 * to "just a small triangle"), then because the replacement polygon had no real
 * arrowhead and its head ran outside the viewBox and was clipped. A stroke gives the
 * head barbs for free, so the only thing that changes between the two directions'
 * weight is the stroke width.
 *
 *     sent     3.4px  ->  the head's barbs are solid, so the arrow reads as filled
 *     received 2px    ->  the same shape reads as an outline
 *
 * The centreline is inset one unit from the outer silhouette, because a 2px stroke
 * reaches 1px either side of it; that keeps the painted arrow inside the 12px box
 * (the polygon attempt reached 10.8 and clipped).
 */
const ARROW_PATH = 'M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1'

/** Stroke width for a SENT message: wide enough to fill the head's barbs. */
const ARROW_STROKE_SENT = 3.4

/** Stroke width for a RECEIVED message: the same shape, read as an outline. */
const ARROW_STROKE_RECEIVED = 2

/**
 * One glyph per dated task transition.
 *
 * The user's ask: "每个任务的创建，认领，完成，也有有标记显示在任务卡的地方". The task's
 * `history` already carries every dated transition — the chart simply was not drawing
 * them — so this needs no new host data.
 *
 * The glyphs deliberately REUSE the status vocabulary the rest of the panel already
 * teaches (`▶` is "in progress", `✓` is "completed"), so a reader who has learnt the
 * status column does not have to learn a second symbol set:
 *
 * | action | glyph | reads as |
 * |---|---|---|
 * | `created` | `＋` | added |
 * | `claimed` | `▶` | work started (the in-progress glyph) |
 * | `completed` | `✓` | done (the completed glyph) |
 * | `reopened` | `↺` | back to open |
 * | `updated` | `·` | an edit / dependency change, deliberately quiet |
 * | `observed` | `◌` | only ever seen, never dated by an event |
 *
 * They are painted in the LANE's colour, because they belong to the task and the task
 * belongs to the lane; the word for each one lives in `title`/`aria-label`
 * (`historyActionText`) so colour is never the only signal.
 */
const TASK_EVENT_GLYPH: Record<TaskEvent['action'], string> = {
  created: '＋',
  claimed: '▶',
  completed: '✓',
  reopened: '↺',
  updated: '·',
  observed: '◌',
}

/**
 * The transitions of one task, drawn as a rail UNDER its bar.
 *
 * Order and placement come from the data, never from guesswork: each event sits at its
 * own `time` scaled by the same `msPerPx` as the bar, so an event can be read against
 * the bar's length — "it was claimed a third of the way in" is a fact, not an
 * impression. Events are drawn in `history` order and any that share a time get a
 * one-pixel vertical stagger so a burst is not hidden behind its own first mark.
 *
 * The rail sits below the bar rather than on it: the bar's height is the one thing on
 * this chart that must stay exactly proportional (see `TASK_BAR_HEIGHT`), and overlaying
 * glyphs on a 10px bar would either cover it or force it taller.
 */
/**
 * One task's transitions, resolved outside JSX so a test can assert them.
 *
 * Mirrors the `markerPaint` pattern: the tested function and the painted result cannot
 * drift, because the component renders exactly this array.
 */
export interface TaskEventMark {
  action: TaskEvent['action']
  glyph: string
  /** The word for the action, from the panel's ONE transition vocabulary. */
  label: string
  /** Absolute x of the mark: the bar's left edge plus the event's own elapsed time. */
  x: number
  /** Top of the glyph. A second event at the same instant is nudged down 1px. */
  top: number
  time: number
}

/**
 * Where every dated transition of one task belongs, in card-local coordinates.
 *
 * Placement is arithmetic on the data, never a guess: `(event.time - rect.at) / msPerPx`
 * is the same conversion the BAR's width uses, so a mark reads against the bar's own
 * length — "claimed a third of the way in" is a fact here, not an impression.
 *
 * @param rect - the card the marks belong to.
 * @param msPerPx - the chart's scale. A non-finite or non-positive value yields no
 *   marks rather than NaN positions: a mark at an infinite x paints nothing and is
 *   invisible in a way no screenshot review would catch.
 */
export function taskEventMarks(rect: TaskCardRect, msPerPx: number): TaskEventMark[] {
  if (!Number.isFinite(msPerPx) || msPerPx <= 0) return []
  const seenAt = new Map<number, number>()
  const marks: TaskEventMark[] = []
  for (const event of rect.task.history) {
    const offset = (event.time - rect.at) / msPerPx
    if (!Number.isFinite(offset)) continue
    // Events that share an instant get a 1px stagger, so a created+claimed pair shows
    // as two marks instead of one hiding the other.
    const repeat = seenAt.get(event.time) ?? 0
    seenAt.set(event.time, repeat + 1)
    marks.push({
      action: event.action,
      glyph: TASK_EVENT_GLYPH[event.action] ?? '·',
      label: historyActionText(event.action),
      x: rect.x + offset,
      top: rect.barY + rect.barH + 1 + repeat,
      time: event.time,
    })
  }
  return marks
}

/**
 * The transitions of one task, drawn as a rail UNDER its bar.
 *
 * The rail sits below the bar rather than on it: the bar's height is the one thing on
 * this chart that must stay exactly proportional (see `TASK_BAR_HEIGHT`), and overlaying
 * glyphs on a 10px bar would either cover it or force it taller.
 */
function TaskEventMarks({
  rect,
  msPerPx,
  ink,
  tzOffsetMinutes,
}: {
  rect: TaskCardRect
  msPerPx: number
  ink: string
  tzOffsetMinutes: number
}): ReactNode {
  return (
    <>
      {taskEventMarks(rect, msPerPx).map((mark, index) => (
        <span
          key={`${mark.time}-${mark.action}-${index}`}
          className="dtg-task-event"
          // NOT `aria-hidden`: this is information, not decoration. A glyph alone is
          // also unreadable, so the accessible name spells out the time and the action
          // through the shared `taskEventAria` template.
          role="img"
          aria-label={format('taskEventAria', {
            time: formatDateTime(mark.time, tzOffsetMinutes),
            event: mark.label,
          })}
          data-task-event={mark.action}
          style={{ left: mark.x, top: mark.top, color: ink }}
          title={`${mark.label} · ${formatDateTime(mark.time, tzOffsetMinutes)}`}
        >
          {mark.glyph}
        </span>
      ))}
    </>
  )
}

function TaskCard({
  rect,
  selected,
  onSelectTask,
  tzOffsetMinutes,
  msPerPx,
  color,
}: {
  rect: TaskCardRect
  selected: boolean
  onSelectTask: (taskId: string | null) => void
  tzOffsetMinutes: number
  /** Scale of the chart, so an event's mark lands at its own real time. */
  msPerPx: number
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
  // so a user can check "why is this box this long" on hover, without clicking.
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
  /**
   * The task box IS the duration. There is no separate bar and no fixed-width chip.
   *
   * The previous revision drew two objects per task: a thin bar whose length was the
   * real duration, and a 36px card at a FIXED 148px that held the label. The user read
   * the fixed one as "the task" and reported it: "任务框的长度应该是按实际时间线来，而不是
   * 有个最小固定长度大小（这样意义上不合理）". A box that is 148px for a 5-second task and
   * 148px for a 5-minute one carries no information, and it contradicted the bar drawn
   * beside it.
   *
   * The fill is the lane's identity colour with the lane's `on` ink — the same
   * treatment the lane NAME gets, so "the coloured box is the task" is one idea.
   */
  const boxStyle: CSSProperties = {
    left: rect.x,
    top: rect.barY,
    width: rect.w,
    height: rect.barH,
    ...(color === undefined ? {} : { background: color.bar, color: lanePaint(color.on) }),
  }
  /**
   * The label, when it does not fit inside the box.
   *
   * Deliberately NOT a box: no background, no border, so the only bordered rectangle on
   * a task row is the one whose LENGTH means something. A fixed-width label BOX was
   * exactly what the user objected to; label text may be any width it likes precisely
   * because it no longer looks like the task.
   */
  const captionStyle: CSSProperties = {
    left: rect.labelX,
    top: rect.barY,
    width: rect.labelW,
    height: rect.barH,
  }
  const inside = rect.labelPlacement === 'inside'
  const subject = task.subject === '' ? '—' : task.subject
  return (
    <span className="dtg-task-wrap" data-task-id={task.id}>
      <button
        type="button"
        className={`dtg-task dtg-ink-${task.status}${rect.live ? ' dtg-task-live' : ''}${inside ? '' : ' dtg-task-outside'}`}
        style={boxStyle}
        title={full}
        aria-label={aria}
        aria-pressed={selected}
        onClick={() => onSelectTask(selected ? null : task.id)}
        onKeyDown={onKeyDown}
        data-task-anchor={rect.anchor}
        data-label-placement={rect.labelPlacement}
      >
        {inside ? <span className="dtg-task-subject">{subject}</span> : null}
        {rect.live ? <span className="dtg-task-flag">{uiLabel('liveBadge')}</span> : null}
      </button>
      {inside ? null : (
        // `aria-hidden`: the button above already carries the whole accessible name, and
        // this is the same control's mouse affordance, so the text is not read twice.
        <span
          className="dtg-task-caption"
          style={captionStyle}
          aria-hidden="true"
          onClick={() => onSelectTask(selected ? null : task.id)}
        >
          <span className="dtg-task-subject">{subject}</span>
          {task.description === '' ? null : <span className="dtg-task-desc">{task.description}</span>}
        </span>
      )}
      {/* Every dated transition, at its own real time, on a rail under the box. */}
      <TaskEventMarks
        rect={rect}
        msPerPx={msPerPx}
        ink={color === undefined ? 'var(--dsw-alias-label-secondary)' : lanePaint(color.bar)}
        tzOffsetMinutes={tzOffsetMinutes}
      />
    </span>
  )
}
