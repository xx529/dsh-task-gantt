/**
 * PURE Gantt layout: `(TimelineResponse, viewport, view options) -> rects + ticks`.
 *
 * No DOM, no React, no `Date.now()`: every time value enters through the
 * arguments, so this module is a deterministic function of its inputs and can
 * be unit-tested in plain Node. The ONE environment-dependent input is the
 * local UTC offset used to align day ticks and to format labels; it is an
 * explicit option with a default derived from `options.now` (see
 * {@link LayoutOptions.tzOffsetMinutes}).
 *
 * Design target: the NARROW native right sidebar (~320-480px), so the timeline
 * area right of the fixed lane head is only ~190-350px wide.
 *
 * ============================ COORDINATE SPACES ============================
 * Three spaces, never mixed; every rect carries its position in the first two:
 *
 *  1. TIME     epoch ms.
 *  2. CONTENT  px inside the scrollable canvas; x = 0 is `window.start`.
 *              `dataWidth = contentWidth = window.durationMs / msPerPx`
 *              The canvas is scrolled by the browser (`overflow:auto`). A task
 *              card anchored near the right edge is wider than the space left
 *              of it and therefore overflows `contentWidth`; the scroll
 *              container's scrollable overflow region includes absolutely
 *              positioned descendants, so such a card stays reachable by
 *              scrolling with no phantom canvas width.
 *  3. VIEW     px from the left edge of the VISIBLE timeline area:
 *              `viewX = x - scrollLeft`, `viewY = y - scrollTop`.
 *
 * ========================= WINDOW RESOLUTION (pure) ========================
 * `computeWindow(data, now)` — the x-axis extent, independent of zoom/scroll:
 *
 *   candidates = [ data.range.start,
 *                  every lane span `.start`,
 *                  every lane span `.end` that is not null,
 *                  every task `history[].time` ]        (finite numbers only)
 *   rawStart   = min(candidates)   (range.start; `now` when range is absent)
 *   rawEnd     = max(candidates)   (range.start; `now` when range is absent)
 *   start      = rawStart
 *   end        = max( range.end !== null ? max(range.end, rawEnd)
 *                                        : max(now, rawEnd),
 *                     start + 1 )
 *   durationMs = end - start                            (always >= 1)
 *   live       = data.range.end === null
 *
 * So the window always covers every datum in the payload (a live board whose
 * last event is newer than `now`, or a historic board whose range is narrower
 * than its data, still shows its data), and a live window's right edge is
 * pinned to `now`.
 *
 * ============================== TICKS (pure) ===============================
 * `buildTicks(...)`:
 *   targetStep = msPerPx * viewportWidth / tickCount
 *   step       = smallest element of {@link TICK_STEPS} >= targetStep
 *                (the largest element when even that is too small)
 *   align      = step >= DAY_MS ? tzOffsetMs : 0
 *   first      = ceil((window.start - align) / step) * step + align
 *   times      = first, first+step, ... while time <= window.end
 *                (hard cap {@link MAX_TICKS}; `layout.truncatedTicks` is true
 *                 when the cap stopped the loop)
 *   x          = (time - window.start) / msPerPx ; viewX = x - scrollLeft
 *   labelKind  = step <  DAY_MS ? 'time' : 'date'
 *   label      = formatTickLabel(time, labelKind, tzOffsetMinutes)
 *   major      = labelKind === 'date' ? true
 *                                   : (time - align) % HOUR_MS === 0
 *
 * ============================ LANE / BAR GEOMETRY ==========================
 * With `i` the lane index, `laneHeight` / `headerHeight` from the viewport:
 *
 *   laneY(i)      = headerHeight + i * laneHeight
 *   laneBox       = { x:0, y:laneY(i), height:laneHeight }
 *   lane.viewY    = laneY(i) - scrollTop
 *   lane.visible  = viewportHeight <= 0 ? true
 *                  : laneY(i) + laneHeight > scrollTop + headerHeight
 *                    && laneY(i) < scrollTop + headerHeight + viewportHeight
 *
 *   turn band     y = laneY(i) + LANE_PAD_Y,               h = TURN_BAND_HEIGHT
 *   step bar      y = laneY(i) + LANE_PAD_Y
 *                       + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2, h = STEP_BAR_HEIGHT
 *   task card     y = laneY(i) + TASK_CARD_TOP,            h = TASK_CARD_HEIGHT
 *   (TASK_CARD_TOP = LANE_PAD_Y + TURN_BAND_HEIGHT + 4, so a lane of
 *    DEFAULT_LANE_HEIGHT = 56 stacks: 3px pad, 10px turn band (the 8px step bar
 *    centred inside it), 4px gap, 36px card (two token lines), 3px pad.)
 *
 * ============================== SPAN RECTS =================================
 * For every lane (in `data.lanes` order) and every span (in `lane.spans` order):
 *
 *   startRaw = span.start                       (non-finite -> window.start)
 *   open     = span.end === null
 *   endRaw   = open ? min(max(now, startRaw), window.end)
 *                   : max(startRaw, span.end)
 *   x0       = clamp(startRaw, window.start, window.end)
 *   x1       = clamp(endRaw,   window.start, window.end)
 *   x        = (x0 - window.start) / msPerPx
 *   w        = max(MIN_SPAN_PX, (x1 - x0) / msPerPx)
 *   viewX    = x - scrollLeft
 *   visible  = viewX + w >= 0 && viewX <= viewportWidth
 *
 * Because the window is the union of every datum (see above), a span can never
 * start before `window.start` nor end after `window.end` — clamped spans are the
 * rule, and no "clipped" flag is needed for them.
 *
 * An OPEN span (`end === null`) therefore grows to `now`, and `open: true` tells
 * the renderer to draw the "still running" treatment (hatched fill + pulse).
 *
 * ============================== TASK CARDS =================================
 * Cards are collected per lane: first every task of `lane.tasks` (input order,
 * which the frozen contract already defines as ascending by first history
 * time), then every `data.tasks` entry whose `id` was not already placed,
 * resolved through its `laneId`. A leftover task whose `laneId` matches no lane
 * is NOT drawn and its id is reported in `layout.unplacedTaskIds`.
 *
 *   history = task.history ?? []
 *   if history.length > 0:
 *     anchor = 'history' ; historyIndex = 0
 *     from   = history[0].time
 *     to     = max over history[].time          (last event; contract: ascending)
 *     x0     = clamp(from, window.start, window.end)
 *     x1     = clamp(to,   window.start, window.end)
 *     x      = (x0 - window.start) / msPerPx
 *     w      = clamp((x1 - x0) / msPerPx, TASK_MIN_WIDTH, TASK_MAX_WIDTH)
 *   else:
 *     anchor = 'live' ; historyIndex = -1
 *     from   = to = window.end
 *     w      = TASK_MIN_WIDTH
 *     x      = max(0, dataWidth - TASK_MIN_WIDTH)    // right-aligned to `now`
 *   viewX  = x - scrollLeft
 *   visible = viewX + w >= 0 && viewX <= viewportWidth
 *   at      = from            (epoch ms the card is anchored at)
 *   durationMs = to - from    (0 for a live card and for a single-event card)
 *   live    = anchor === 'live'
 *
 * A card with no dated history is therefore anchored at the window's right edge
 * (i.e. the NOW marker) and flagged `live: true` — the UI must label it as live
 * state, never as a measured interval. A history card spans the first to the
 * last dated transition, width-clamped to
 * [{@link TASK_MIN_WIDTH}, {@link TASK_MAX_WIDTH}].
 *
 * ============================== CULLING / INPUT SANITIZATION ===============
 * `cull: false` (default) returns every rect with `visible` computed.
 * `cull: true` drops the non-visible span/task rects from the arrays (rect count
 * in the DOM, not correctness). Lanes are always returned.
 *
 * Every numeric input is sanitized, never trusted: a non-finite or out-of-range
 * `msPerPx` falls back to {@link DEFAULT_MS_PER_PX} then clamps into
 * [{@link MIN_MS_PER_PX}, {@link MAX_MS_PER_PX}]; a non-finite/negative
 * `scrollLeft` or `scrollTop` becomes 0; a non-finite `viewport.width` becomes
 * 1; a non-finite/<= 0 `laneHeight` (resp. `headerHeight`) becomes
 * {@link DEFAULT_LANE_HEIGHT} (resp. {@link DEFAULT_HEADER_HEIGHT}); a
 * non-finite or <= 0 `tickCount` becomes 6; a non-finite `now` becomes 0. Empty
 * or malformed payloads (no lanes, no spans, no tasks) return empty arrays and
 * still produce ticks — `layoutTimeline` never throws.
 */
import type {
  ActivitySpan,
  MessageSpan,
  SpanSpeaker,
  TimelineLane,
  TimelineResponse,
  TimelineTask,
} from '../../shared/contract.ts'

/* ------------------------------------------------------------------ units */

export const SECOND_MS = 1_000
export const MINUTE_MS = 60 * SECOND_MS
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

/* -------------------------------------------------------------- viewport */

/** Fixed lane-head column width (px): name + status dot, per the narrow-panel design. */
export const LANE_HEAD_WIDTH = 132
/** Default height of one lane row (px) — see the geometry table in the module doc. */
export const DEFAULT_LANE_HEIGHT = 56
/** Default height of the sticky time-axis header (px). */
export const DEFAULT_HEADER_HEIGHT = 28
/** Default number of ticks wanted across the visible width. */
export const DEFAULT_TICK_COUNT = 6

/* --------------------------------------------------------------- geometry */

export const LANE_PAD_Y = 3
export const TURN_BAND_HEIGHT = 10
export const STEP_BAR_HEIGHT = 8
/** Vertical gap between the turn band and the card row. */
export const TASK_CARD_GAP = 4
export const TASK_CARD_TOP = LANE_PAD_Y + TURN_BAND_HEIGHT + TASK_CARD_GAP
/** Two token-sized text lines (12px/18px + 11px/14px) plus 4px of padding. */
export const TASK_CARD_HEIGHT = 36
/** A card never renders narrower than this: two readable text lines need it. */
export const TASK_MIN_WIDTH = 148
/** A card never renders wider than this, however long the task lived. */
export const TASK_MAX_WIDTH = 260
/** A span shorter than this still gets a visible mark. */
export const MIN_SPAN_PX = 2

/* ------------------------------------------------------------------ zoom */

/** 50 ms per px — the zoom-in floor (a 50ms step is half a percent of a 100px bar). */
export const MIN_MS_PER_PX = 50
/** 600 000 ms per px (10 min per px) — the zoom-out ceiling. */
export const MAX_MS_PER_PX = 600_000
export const DEFAULT_MS_PER_PX = 1_000

/** Hard cap on generated ticks, so a pathological zoom can never hang a render. */
export const MAX_TICKS = 400

/* ------------------------------------------------------- message markers */

/**
 * Minimum horizontal gap between two rendered message markers (content px).
 *
 * The panel's timeline area is only ~190-350px wide and one session can carry
 * 50+ messages, so markers must not be allowed to pile into an unreadable
 * smear. {@link decimateMarkers} walks the markers in time order and drops any
 * that would land closer than this to the previously kept one.
 */
export const MESSAGE_MARKER_MIN_GAP_PX = 9
/** Rendered width of one message marker (px) — a dot that fits its glyph. */
export const MESSAGE_MARKER_WIDTH = 11
/** Rendered height of one message marker (px). */
export const MESSAGE_MARKER_HEIGHT = 11
/** Top of the marker row inside a lane, below the step bar. */
export const MESSAGE_MARKER_TOP = LANE_PAD_Y + STEP_BAR_HEIGHT + 1
/**
 * Soft ceiling on rendered markers per lane. Decimation keeps the earliest
 * message of every pixel bucket, so a lane also stops at this count.
 */
export const MESSAGE_MARKER_MAX = 40
/** A lane's message-density band is never thinner than this (px). */
export const MESSAGE_BAND_MIN_PX = 2
/** Height of that band (px); it sits on the lane's own bottom edge. */
export const MESSAGE_BAND_HEIGHT = 2

/** The tick ladder, ascending. Chosen so every step <= 1h is epoch-aligned. */
export const TICK_STEPS: readonly number[] = [
  SECOND_MS,
  2 * SECOND_MS,
  5 * SECOND_MS,
  10 * SECOND_MS,
  15 * SECOND_MS,
  30 * SECOND_MS,
  MINUTE_MS,
  2 * MINUTE_MS,
  5 * MINUTE_MS,
  10 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  HOUR_MS,
  2 * HOUR_MS,
  3 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS,
  2 * DAY_MS,
  7 * DAY_MS,
]

/* ------------------------------------------------------------------ types */

/** The measured geometry of the timeline area (right of the fixed lane head). */
export interface TimelineViewport {
  /** Visible CSS px width of the timeline area (>= 1 after sanitizing). */
  width: number
  /** Visible CSS px height of the timeline area (used for `lane.visible` only). */
  height?: number
  /** CSS px height of one lane row. */
  laneHeight: number
  /** CSS px height of the sticky time-axis header. */
  headerHeight: number
}

export interface LayoutOptions {
  /**
   * Current epoch ms.
   *
   * LIVE windows (`data.live === true`) use it as the right edge and as the end
   * of open spans. FROZEN windows (`data.live === false`) IGNORE it for geometry
   * — only time-zone detection and label formatting read it — so an idle team's
   * chart stops moving instead of creeping forward on every render.
   */
  now: number
  /** Milliseconds per CSS px; larger = zoomed out. Clamped, default 1000. */
  msPerPx?: number
  /** Horizontal scroll offset in content px (>= 0), default 0. */
  scrollLeft?: number
  /** Vertical scroll offset in content px (>= 0), default 0. */
  scrollTop?: number
  /** Target tick count across `viewport.width`, default 6. */
  tickCount?: number
  /** Drop non-visible span/task rects, default false. */
  cull?: boolean
  /** Local UTC offset in minutes (east positive); default from `now`. */
  tzOffsetMinutes?: number
  /**
   * How `lane.messages` are rendered relative to `lane.spans`:
   * - `'both'`    – keep the activity bars AND draw the message markers;
   * - `'markers'` – draw only the message markers (an explicit legend switch).
   * Default `'both'`.
   */
  messageMode?: MessageMode
  /**
   * Minimum content-px gap between rendered markers, default
   * {@link MESSAGE_MARKER_MIN_GAP_PX}. Lower it to trade overlap for detail.
   */
  messageMinGapPx?: number
  /** Ceiling on rendered markers per lane, default {@link MESSAGE_MARKER_MAX}. */
  messageMaxPerLane?: number
}

export interface TimelineWindow {
  /** Epoch ms at content x = 0. */
  start: number
  /** Epoch ms at content x = dataWidth. */
  end: number
  durationMs: number
  /** `data.live`: the right edge tracks `now`. `false` = frozen at {@link end}. */
  live: boolean
}

/** Whether a lane's messages also carry the activity bars, or are markers only. */
export type MessageMode = 'markers' | 'both'

/**
 * Where a window's right edge came from, so the UI can label it honestly:
 * - `'now'`   – a live window pinned to `now`;
 * - `'range'` – the server's frozen `range.end`;
 * - `'datum'` – the last datum (a frozen payload with no usable `range.end`).
 */
export type WindowEndSource = 'now' | 'range' | 'datum'

export interface LaneBox {
  laneId: string
  /** Index in the original `data.lanes` array. */
  index: number
  name: string
  /** Content-space top (header included): `headerHeight + index * laneHeight`. */
  y: number
  height: number
  /** `y - scrollTop`. */
  viewY: number
  /** Whether the row intersects the visible band below the sticky header. */
  visible: boolean
  /** The lane this box was built from (identity of the input object). */
  lane: TimelineLane
}

export interface SpanRect {
  laneId: string
  laneIndex: number
  kind: 'turn' | 'step'
  /** True for a span whose `end` was null: drawn out to `now`. */
  open: boolean
  /** Span start, epoch ms (unclamped input value). */
  start: number
  /** Span end, epoch ms — for an open span, the value it was drawn out to. */
  end: number
  x: number
  y: number
  w: number
  h: number
  viewX: number
  visible: boolean
  turn?: number
  step?: number
}

export interface TaskCardRect {
  laneId: string
  laneIndex: number
  task: TimelineTask
  /** `'history'` when anchored on `history[0]`, `'live'` when there is none. */
  anchor: 'history' | 'live'
  /** Epoch ms the card starts at. */
  at: number
  /** Last dated history time minus `at` (0 for a live or single-event card). */
  durationMs: number
  /** Index of the anchoring history event, -1 for a live card. */
  historyIndex: number
  x: number
  y: number
  w: number
  h: number
  viewX: number
  visible: boolean
  /** Alias of `anchor === 'live'`, for readable call sites. */
  live: boolean
}

export type TickKind = 'time' | 'date'

export interface Tick {
  /** Epoch ms, aligned to the chosen step. */
  time: number
  x: number
  viewX: number
  /** The step used to generate the whole ladder (ms). */
  stepMs: number
  labelKind: TickKind
  /** `HH:mm` for `'time'`, `MM-DD` for `'date'` (local, per `tzOffsetMinutes`). */
  label: string
  /** Hour boundary for clock ticks; always true for day ticks. */
  major: boolean
  visible: boolean
}

export interface TimelineLayout {
  window: TimelineWindow
  msPerPx: number
  scrollLeft: number
  scrollTop: number
  viewportWidth: number
  viewportHeight: number
  /** `window.durationMs / msPerPx` (the data extent). */
  dataWidth: number
  /** Same as {@link dataWidth}: the canvas is exactly the window's width. */
  contentWidth: number
  /** `headerHeight + lanes.length * laneHeight`. */
  contentHeight: number
  lanes: LaneBox[]
  spans: SpanRect[]
  tasks: TaskCardRect[]
  /** Rendered message markers, every one datable to its exact `time`. */
  messages: MessageMarkerRect[]
  /** Per-lane message-density bands: the true first→last message extent. */
  messageBands: MessageBandRect[]
  /** Message candidates the markers were decimated from (after turn de-duping). */
  messageCount: number
  /** How many candidates decimation dropped (never re-dated, only omitted). */
  droppedMessageCount: number
  ticks: Tick[]
  /**
   * The right-edge marker: NOW while the window is live, the frozen end time
   * when it is not, `null` when the window carries no meaningful end (an empty
   * payload).
   */
  endMarker: EndMarker | null
  /** Epoch ms of the NOW marker (frozen: the window's end time). */
  now: number
  nowX: number
  nowViewX: number
  nowVisible: boolean
  tzOffsetMinutes: number
  /** Where the right edge came from (`'now'` | `'range'` | `'datum'`). */
  endSource: WindowEndSource
  /** True when {@link MAX_TICKS} stopped the tick loop before `window.end`. */
  truncatedTicks: boolean
  /** Ids of `data.tasks` that no lane claims (never drawn). */
  unplacedTaskIds: string[]
}

/**
 * One rendered message marker.
 *
 * `time` is the span's own timestamp, never an aggregate: decimation DROPS
 * markers (reported in {@link MessageMarkerRect.droppedBefore}) but never moves
 * one, so a marker's position is always the true moment of that message.
 */
export interface MessageMarkerRect {
  laneId: string
  laneIndex: number
  kind: MessageSpan['kind']
  /** Exact epoch ms of the rendered message. */
  time: number
  /** The message's close time when it has one (turns). */
  end: number | null
  from: SpanSpeaker
  to?: SpanSpeaker
  preview?: string
  /** Stable key: the journal id when present, else `lane:kind:time:index`. */
  key: string
  /** 0-based index of this marker among its lane's messages (time order). */
  messageIndex: number
  /** Markers of the same lane dropped just before this one by decimation. */
  droppedBefore: number
  x: number
  y: number
  w: number
  h: number
  viewX: number
  visible: boolean
}

/**
 * A lane's message-density band: the honest first→last extent of its messages.
 *
 * This exists so that decimation can thin the MARKERS without hiding the fact
 * that a lane was chatty for three minutes: the band spans the true range of
 * every message, so it can never misreport when messages arrived.
 */
export interface MessageBandRect {
  laneId: string
  laneIndex: number
  /** Earliest message time on the lane. */
  firstTime: number
  /** Latest message time on the lane. */
  lastTime: number
  /** How many messages the band covers. */
  count: number
  x: number
  y: number
  w: number
  h: number
  viewX: number
  visible: boolean
}

/** The chart's right-edge marker. */
export interface EndMarker {
  /** Epoch ms the marker marks. */
  time: number
  /** `'now'` while live; `'ended'` for a frozen window. */
  kind: 'now' | 'ended'
  x: number
  viewX: number
  visible: boolean
}

/* ---------------------------------------------------------------- helpers */

/** Clamp `value` into [lo, hi]; `lo > hi` collapses to `lo`. */
export function clamp(value: number, lo: number, hi: number): number {
  if (value < lo) return lo
  if (value > hi) return hi
  return value
}

function num(value: number | null | undefined, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function positive(value: number | undefined, fallback: number): number {
  const v = num(value, Number.NaN)
  return Number.isFinite(v) && v > 0 ? v : fallback
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`
}

/** Clamp a requested zoom into [{@link MIN_MS_PER_PX}, {@link MAX_MS_PER_PX}]. */
export function clampMsPerPx(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MS_PER_PX
  return clamp(value, MIN_MS_PER_PX, MAX_MS_PER_PX)
}

/** The zoom that fits `durationMs` into `widthPx` — the initial (auto) zoom. */
export function fitMsPerPx(durationMs: number, widthPx: number): number {
  const d = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 1
  const w = Number.isFinite(widthPx) && widthPx > 0 ? widthPx : 1
  return clampMsPerPx(d / w)
}

/** The smallest ladder step >= `targetMs` (the largest step when none is). */
export function pickTickStep(targetMs: number): number {
  const target = Number.isFinite(targetMs) && targetMs > 0 ? targetMs : TICK_STEPS[0] ?? SECOND_MS
  for (const step of TICK_STEPS) {
    if (step >= target) return step
  }
  return TICK_STEPS[TICK_STEPS.length - 1] ?? DAY_MS
}

/** `HH:mm` in the local zone described by `tzOffsetMinutes` (east positive). */
export function formatClock(time: number, tzOffsetMinutes = 0): string {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS)
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`
}

/** `MM-DD HH:mm` in the local zone described by `tzOffsetMinutes`. */
export function formatDateTime(time: number, tzOffsetMinutes = 0): string {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS)
  return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())} ${formatClock(time, tzOffsetMinutes)}`
}

/** The header label of one tick. */
export function formatTickLabel(time: number, kind: TickKind, tzOffsetMinutes = 0): string {
  if (kind === 'time') return formatClock(time, tzOffsetMinutes)
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS)
  return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`
}

/**
 * Is this board still moving?
 *
 * The server's `live` is AUTHORITATIVE (requirement: an idle team must freeze
 * the axis, and the client may not decide that on its own). A payload that
 * predates the field (the contract gained `live` later) is treated as live, so
 * the historical behaviour of pinning the right edge to `now` is preserved
 * rather than silently collapsing the axis onto the last datum.
 */
export function isLiveBoard(data: TimelineResponse): boolean {
  return data?.live !== false
}

/** See the WINDOW RESOLUTION table in the module doc. */
export function computeWindow(data: TimelineResponse, now: number): TimelineWindow {
  const fallback = num(now, 0)
  const rangeStart = num(data?.range?.start, fallback)
  const hasRangeEnd = typeof data?.range?.end === 'number' && Number.isFinite(data.range.end)
  const rangeEnd = hasRangeEnd ? num(data?.range?.end, fallback) : null
  const live = isLiveBoard(data)

  let rawStart = rangeStart
  let rawEnd = rangeStart
  const consider = (value: number | null | undefined): void => {
    if (typeof value !== 'number' || !Number.isFinite(value)) return
    if (value < rawStart) rawStart = value
    if (value > rawEnd) rawEnd = value
  }
  for (const lane of data?.lanes ?? []) {
    for (const span of lane.spans ?? []) {
      consider(span.start)
      consider(span.end)
    }
    for (const message of lane.messages ?? []) {
      // Hostile/partial payloads reach this function by contract: a null entry
      // or a non-finite time must be ignored, never thrown on.
      if (message === null || typeof message !== 'object') continue
      consider(message.time)
      consider(message.end)
    }
    for (const task of lane.tasks ?? []) {
      for (const event of task.history ?? []) consider(event.time)
    }
  }
  for (const task of data?.tasks ?? []) {
    for (const event of task.history ?? []) consider(event.time)
  }

  const start = rawStart
  // A live window is pinned to `now` (but never hides data newer than `now`).
  // A FROZEN window ignores `now` entirely: its right edge is the server's
  // `range.end` when there is one, and otherwise the last datum — never a
  // moving clock, so the axis cannot creep while every member is stopped.
  const endSource: WindowEndSource = live ? 'now' : rangeEnd !== null ? 'range' : 'datum'
  const right =
    endSource === 'now' ? Math.max(fallback, rawEnd) : endSource === 'range' ? Math.max(rangeEnd ?? rawEnd, rawEnd) : rawEnd
  const end = Math.max(right, start + 1)
  // NOTE: the window keeps exactly its four original fields. `endSource` is a
  // layout-level field, so the (verified) window shape stays untouched.
  return { start, end, durationMs: end - start, live }
}

/**
 * Thin a lane's message markers down to a readable set — WITHOUT moving any.
 *
 * Policy (pure, deterministic, and the reason the chart never lies about time):
 *
 *  1. Only `kind: 'turn'` spans are dropped outright when they were already
 *     drawn as activity bars (`mode: 'both'`): the bar IS the turn, so drawing
 *     a marker for it too would double-render the same instant. `'message'`
 *     and `'user-prompt'` are always candidates.
 *  2. The messages that are still candidates keep their exact `time`. Nothing
 *     is averaged, snapped or merged: decimation only ever REMOVES a marker.
 *  3. The lane's pixel span (its `dataWidth`) is cut into
 *     `ceil(span / gapPx)` buckets, and the EARLIEST surviving message in each
 *     bucket is kept. Bucketing — rather than a global greedy pass — is what
 *     stops one dense burst at the start from consuming the whole budget and
 *     erasing the quiet tail.
 *  4. A kept marker must additionally sit at least `gapPx` from the previously
 *     kept one, which is what actually prevents overlap when many messages land
 *     in the same bucket.
 *  5. At most `maxPerLane` markers survive.
 *
 * Every dropped marker is counted in the next kept marker's
 * {@link MessageMarkerRect.droppedBefore}, and the lane's true first→last
 * extent is reported separately as a {@link MessageBandRect} — so "here are 5
 * of 51 messages" stays visible instead of the chart implying there were five.
 *
 * @param list - the lane's messages, in any order (sorted internally by time,
 *   then by index, so equal timestamps stay stable).
 * @param input - pixel scale plus the drop rules.
 * @returns the kept indices, ascending, plus the index of the first candidate.
 */
export function decimateMarkers(
  list: readonly MessageSpan[],
  input: {
    /** Epoch ms at content x = 0. */
    windowStart: number
    msPerPx: number
    widthPx: number
    mode: MessageMode
    gapPx: number
    maxPerLane: number
  },
): { indices: number[]; droppedTotal: number; candidates: number } {
  const gapPx = input.gapPx > 0 ? input.gapPx : MESSAGE_MARKER_MIN_GAP_PX
  const maxPerLane = input.maxPerLane > 0 ? Math.floor(input.maxPerLane) : MESSAGE_MARKER_MAX
  const msPerPx = input.msPerPx > 0 ? input.msPerPx : DEFAULT_MS_PER_PX

  const candidates: number[] = []
  for (let index = 0; index < list.length; index += 1) {
    const span = list[index]
    if (span === undefined) continue
    if (input.mode === 'both' && span.kind === 'turn') continue
    candidates.push(index)
  }
  const ordered = [...candidates].sort((a, b) => {
    const ta = num(list[a]?.time, 0)
    const tb = num(list[b]?.time, 0)
    return ta === tb ? a - b : ta - tb
  })

  const spanPx = Math.max(0, (input.widthPx > 0 ? input.widthPx : 0) || 0)
  const bucketSizePx = Math.max(gapPx, spanPx > 0 ? spanPx / Math.max(1, Math.ceil(spanPx / gapPx)) : gapPx)
  const bucketCount = spanPx > 0 ? Math.max(1, Math.ceil(spanPx / bucketSizePx)) : 1

  const kept: number[] = []
  const usedBuckets = new Set<number>()
  let lastX = Number.NEGATIVE_INFINITY
  for (const index of ordered) {
    if (kept.length >= maxPerLane) break
    const span = list[index]
    if (span === undefined) continue
    const x = (num(span.time, input.windowStart) - input.windowStart) / msPerPx
    const bucket = spanPx > 0 ? clamp(Math.floor(x / bucketSizePx), 0, bucketCount - 1) : 0
    if (usedBuckets.has(bucket)) continue
    if (kept.length > 0 && x - lastX < gapPx) continue
    usedBuckets.add(bucket)
    kept.push(index)
    lastX = x
  }
  return { indices: kept, droppedTotal: candidates.length - kept.length, candidates: candidates.length }
}

/** See the TICKS table in the module doc. */
export function buildTicks(input: {  window: TimelineWindow
  msPerPx: number
  viewportWidth: number
  scrollLeft: number
  tickCount: number
  tzOffsetMinutes: number
}): { ticks: Tick[]; stepMs: number; truncated: boolean } {
  const { window: win, msPerPx, viewportWidth, scrollLeft, tzOffsetMinutes } = input
  const tickCount = Math.max(1, Math.floor(positive(input.tickCount, DEFAULT_TICK_COUNT)))
  const targetStep = (msPerPx * Math.max(1, viewportWidth)) / tickCount
  const stepMs = pickTickStep(targetStep)
  const align = stepMs >= DAY_MS ? tzOffsetMinutes * MINUTE_MS : 0
  const first = Math.ceil((win.start - align) / stepMs) * stepMs + align
  const labelKind: TickKind = stepMs < DAY_MS ? 'time' : 'date'

  const ticks: Tick[] = []
  let truncated = false
  let time = first
  while (time <= win.end) {
    if (ticks.length >= MAX_TICKS) {
      truncated = true
      break
    }
    const x = (time - win.start) / msPerPx
    const viewX = x - scrollLeft
    ticks.push({
      time,
      x,
      viewX,
      stepMs,
      labelKind,
      label: formatTickLabel(time, labelKind, tzOffsetMinutes),
      major: labelKind === 'date' ? true : (time - align) % HOUR_MS === 0,
      visible: viewX >= -1 && viewX <= viewportWidth + 1,
    })
    time += stepMs
  }
  return { ticks, stepMs, truncated }
}

/* ------------------------------------------------------------- the layout */

/**
 * Lay out one timeline response. Pure; see the module doc for every formula.
 */
export function layoutTimeline(
  data: TimelineResponse,
  viewport: TimelineViewport,
  options: LayoutOptions,
): TimelineLayout {
  const now = num(options.now, 0)
  const laneHeight = positive(viewport?.laneHeight, DEFAULT_LANE_HEIGHT)
  const headerHeight = positive(viewport?.headerHeight, DEFAULT_HEADER_HEIGHT)
  const width = positive(viewport?.width, 1)
  const viewportHeight = num(viewport?.height, 0)
  const msPerPx = clampMsPerPx(num(options.msPerPx, DEFAULT_MS_PER_PX))
  const scrollLeft = Math.max(0, num(options.scrollLeft, 0))
  const scrollTop = Math.max(0, num(options.scrollTop, 0))
  const cull = options.cull === true
  const tzOffsetMinutes =
    typeof options.tzOffsetMinutes === 'number' && Number.isFinite(options.tzOffsetMinutes)
      ? options.tzOffsetMinutes
      : -new Date(now).getTimezoneOffset()

  const win = computeWindow(data, now)
  const dataWidth = win.durationMs / msPerPx
  const contentWidth = dataWidth

  const lanesInput = data?.lanes ?? []
  const laneIndexById = new Map<string, number>()
  const lanes: LaneBox[] = lanesInput.map((lane, index) => {
    const y = headerHeight + index * laneHeight
    laneIndexById.set(lane.id, index)
    const visible =
      viewportHeight <= 0
        ? true
        : y + laneHeight > scrollTop + headerHeight &&
          y < scrollTop + headerHeight + viewportHeight
    return {
      laneId: lane.id,
      index,
      name: lane.name,
      y,
      height: laneHeight,
      viewY: y - scrollTop,
      visible,
      lane,
    }
  })

  const spans: SpanRect[] = []
  for (let index = 0; index < lanesInput.length; index += 1) {
    const lane = lanesInput[index]
    if (lane === undefined) continue
    const laneY = headerHeight + index * laneHeight
    const list = lane.spans ?? []
    for (let s = 0; s < list.length; s += 1) {
      const span = list[s]
      if (span === undefined) continue
      const rect = spanRect(lane.id, index, laneY, span, win, msPerPx, now, scrollLeft, width)
      if (!cull || rect.visible) spans.push(rect)
    }
  }

  const tasks: TaskCardRect[] = []
  const placed = new Set<string>()
  const pushTask = (task: TimelineTask, laneIndex: number): void => {
    placed.add(task.id)
    const laneY = headerHeight + laneIndex * laneHeight
    const rect = taskCardRect(
      task,
      lanesInput[laneIndex]?.id ?? task.laneId,
      laneIndex,
      laneY,
      win,
      msPerPx,
      scrollLeft,
      width,
    )
    if (!cull || rect.visible) tasks.push(rect)
  }
  for (let index = 0; index < lanesInput.length; index += 1) {
    const lane = lanesInput[index]
    if (lane === undefined) continue
    for (const task of lane.tasks ?? []) pushTask(task, index)
  }
  const unplacedTaskIds: string[] = []
  for (const task of data?.tasks ?? []) {
    if (placed.has(task.id)) continue
    const laneIndex = laneIndexById.get(task.laneId)
    if (laneIndex === undefined) {
      unplacedTaskIds.push(task.id)
      continue
    }
    pushTask(task, laneIndex)
  }

  const { ticks, truncated } = buildTicks({
    window: win,
    msPerPx,
    viewportWidth: width,
    scrollLeft,
    tickCount: num(options.tickCount, DEFAULT_TICK_COUNT),
    tzOffsetMinutes,
  })

  /* --------------------------------------------------- message markers */

  const messageMode: MessageMode = options.messageMode === 'markers' ? 'markers' : 'both'
  const gapPx = num(options.messageMinGapPx, MESSAGE_MARKER_MIN_GAP_PX)
  const maxPerLane = num(options.messageMaxPerLane, MESSAGE_MARKER_MAX)
  const messages: MessageMarkerRect[] = []
  const messageBands: MessageBandRect[] = []
  let messageCount = 0
  let droppedTotal = 0
  for (let index = 0; index < lanesInput.length; index += 1) {
    const lane = lanesInput[index]
    if (lane === undefined) continue
    const list = (lane.messages ?? []).filter(
      (entry): entry is MessageSpan => entry !== null && typeof entry === 'object',
    )
    if (list.length === 0) continue
    const laneY = headerHeight + index * laneHeight
    // The band is the lane's TRUE extent: it is built from every message, so
    // decimation of the markers below can never shrink the reported span.
    let firstTime = Number.POSITIVE_INFINITY
    let lastTime = Number.NEGATIVE_INFINITY
    for (const message of list) {
      const time = num(message?.time, Number.NaN)
      if (!Number.isFinite(time)) continue
      if (time < firstTime) firstTime = time
      if (time > lastTime) lastTime = time
    }
    if (Number.isFinite(firstTime) && Number.isFinite(lastTime)) {
      const x0 = clamp(firstTime, win.start, win.end)
      const x1 = clamp(lastTime, win.start, win.end)
      const x = (x0 - win.start) / msPerPx
      const w = Math.max(MESSAGE_BAND_MIN_PX, (x1 - x0) / msPerPx)
      const viewX = x - scrollLeft
      const band: MessageBandRect = {
        laneId: lane.id,
        laneIndex: index,
        firstTime,
        lastTime,
        count: list.length,
        x,
        y: laneY + laneHeight - MESSAGE_BAND_HEIGHT - 1,
        w,
        h: MESSAGE_BAND_HEIGHT,
        viewX,
        visible: x + w >= 0 && x <= width,
      }
      if (!cull || band.visible) messageBands.push(band)
    }

    const kept = decimateMarkers(list, {
      windowStart: win.start,
      msPerPx,
      widthPx: dataWidth,
      mode: messageMode,
      gapPx,
      maxPerLane,
    })
    // `kept.indices` is ascending already, and every candidate between two kept
    // indices was dropped — counted onto the marker that follows it, so the UI
    // can say "3 more here" instead of silently losing them.
    let previousCandidate = -1
    for (const keptIndex of kept.indices) {
      const message = list[keptIndex]
      if (message === undefined) continue
      const droppedBefore = countCandidatesBetween(list, previousCandidate, keptIndex, messageMode)
      previousCandidate = keptIndex
      const time = num(message.time, win.start)
      const x = (clamp(time, win.start, win.end) - win.start) / msPerPx
      const viewX = x - scrollLeft
      const rect: MessageMarkerRect = {
        laneId: lane.id,
        laneIndex: index,
        kind: message.kind,
        time,
        end: typeof message.end === 'number' && Number.isFinite(message.end) ? message.end : null,
        from: message.from,
        to: message.to,
        preview: message.preview,
        key: message.messageId ?? `${lane.id}:${message.kind}:${time}:${keptIndex}`,
        messageIndex: keptIndex,
        droppedBefore,
        x,
        y: laneY + MESSAGE_MARKER_TOP,
        w: MESSAGE_MARKER_WIDTH,
        h: MESSAGE_MARKER_HEIGHT,
        viewX,
        visible: x + MESSAGE_MARKER_WIDTH >= 0 && x <= width,
      }
      if (!cull || rect.visible) messages.push(rect)
    }
    messageCount += kept.candidates
    droppedTotal += kept.droppedTotal
  }

  const endSource: WindowEndSource = win.live
    ? 'now'
    : typeof data?.range?.end === 'number' && Number.isFinite(data.range.end)
      ? 'range'
      : 'datum'
  const endTime = win.live ? now : win.end
  const endMarkerTime = clamp(endTime, win.start, win.end)
  const endMarkerX = (endMarkerTime - win.start) / msPerPx
  const endMarkerViewX = endMarkerX - scrollLeft
  const endMarker: EndMarker = {
    time: endMarkerTime,
    kind: win.live ? 'now' : 'ended',
    x: endMarkerX,
    viewX: endMarkerViewX,
    visible: endMarkerViewX >= 0 && endMarkerViewX <= width,
  }

  return {
    window: win,
    msPerPx,
    scrollLeft,
    scrollTop,
    viewportWidth: width,
    viewportHeight,
    dataWidth,
    contentWidth,
    contentHeight: headerHeight + lanesInput.length * laneHeight,
    lanes,
    spans,
    tasks,
    messages,
    messageBands,
    ticks,
    endSource,
    endMarker,
    messageCount,
    droppedMessageCount: droppedTotal,
    now,
    nowX: endMarkerX,
    nowViewX: endMarkerViewX,
    nowVisible: endMarker.visible,
    tzOffsetMinutes,
    truncatedTicks: truncated,
    unplacedTaskIds,
  }
}

/** Candidates strictly between two lane indices (used for the dropped count). */
function countCandidatesBetween(
  list: readonly MessageSpan[],
  fromExclusive: number,
  toExclusive: number,
  mode: MessageMode,
): number {
  let count = 0
  for (let index = fromExclusive + 1; index < toExclusive; index += 1) {
    const span = list[index]
    if (span === undefined) continue
    if (mode === 'both' && span.kind === 'turn') continue
    count += 1
  }
  return count
}

function spanRect(
  laneId: string,
  laneIndex: number,
  laneY: number,
  span: ActivitySpan,
  win: TimelineWindow,
  msPerPx: number,
  now: number,
  scrollLeft: number,
  viewportWidth: number,
): SpanRect {
  const startRaw = num(span.start, win.start)
  const open = span.end === null || span.end === undefined
  const endRaw = open
    ? Math.min(Math.max(now, startRaw), win.end)
    : Math.max(startRaw, num(span.end, startRaw))
  const x0 = clamp(startRaw, win.start, win.end)
  const x1 = clamp(endRaw, win.start, win.end)
  const x = (x0 - win.start) / msPerPx
  const w = Math.max(MIN_SPAN_PX, (x1 - x0) / msPerPx)
  const viewX = x - scrollLeft
  const isTurn = span.kind === 'turn'
  return {
    laneId,
    laneIndex,
    kind: isTurn ? 'turn' : 'step',
    open,
    start: startRaw,
    end: endRaw,
    x,
    y: laneY + (isTurn ? LANE_PAD_Y : LANE_PAD_Y + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2),
    w,
    h: isTurn ? TURN_BAND_HEIGHT : STEP_BAR_HEIGHT,
    viewX,
    visible: viewX + w >= 0 && viewX <= viewportWidth,
    ...(span.turn === undefined ? {} : { turn: span.turn }),
    ...(span.step === undefined ? {} : { step: span.step }),
  }
}

function taskCardRect(
  task: TimelineTask,
  laneId: string,
  laneIndex: number,
  laneY: number,
  win: TimelineWindow,
  msPerPx: number,
  scrollLeft: number,
  viewportWidth: number,
): TaskCardRect {
  const history = task.history ?? []
  let anchor: 'history' | 'live' = 'live'
  let historyIndex = -1
  let from = win.end
  let to = win.end
  let x = 0
  let w = TASK_MIN_WIDTH
  if (history.length > 0) {
    anchor = 'history'
    historyIndex = 0
    from = num(history[0]?.time, win.start)
    to = from
    for (const event of history) {
      const time = num(event.time, from)
      if (time > to) to = time
    }
    const x0 = clamp(from, win.start, win.end)
    const x1 = clamp(to, win.start, win.end)
    x = (x0 - win.start) / msPerPx
    w = clamp((x1 - x0) / msPerPx, TASK_MIN_WIDTH, TASK_MAX_WIDTH)
  } else {
    // No dated history: a fixed-width card right-aligned to the NOW marker, so
    // the live state is never off screen behind the right edge.
    x = Math.max(0, win.durationMs / msPerPx - TASK_MIN_WIDTH)
    w = TASK_MIN_WIDTH
  }
  const viewX = x - scrollLeft
  return {
    laneId,
    laneIndex,
    task,
    anchor,
    at: from,
    durationMs: to - from,
    historyIndex,
    x,
    y: laneY + TASK_CARD_TOP,
    w,
    h: TASK_CARD_HEIGHT,
    viewX,
    visible: viewX + w >= 0 && viewX <= viewportWidth,
    live: anchor === 'live',
  }
}
