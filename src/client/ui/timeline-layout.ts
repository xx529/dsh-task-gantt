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
 *   message row   y = laneY(i) + MESSAGE_MARKER_TOP,        h = MESSAGE_MARKER_HEIGHT
 *   turn band     y = laneY(i) + ACTIVITY_TRACK_TOP,       h = TURN_BAND_HEIGHT
 *   step bar      y = laneY(i) + ACTIVITY_TRACK_TOP
 *                       + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2, h = STEP_BAR_HEIGHT
 *   task card     y = laneY(i) + TASK_CARD_TOP,            h = TASK_CARD_HEIGHT
 *   (The MESSAGE track is first and the ACTIVITY track second, at the user's request:
 *    "信息收发显示的泳道放在 span 的泳道上面". Swapping the two leaves TASK_CARD_TOP at
 *    the same 30 because both terms are summed either way — the task geometry and every
 *    lane height are unchanged by the swap, only the two thin rows move.
 *    A lane of DEFAULT_LANE_HEIGHT = 92 therefore stacks: 3px pad, 11px message-marker
 *    track, 10px turn band (the 8px step bar centred inside it), 36px task card ending
 *    at y=66,
 *    then the ~11px task-TRANSITION rail that hangs under the bar, leaving ~15px of
 *    slack. The LEFT head column shares this height and needs 90px of it for its own
 *    rows — a name pill plus four one-per-line facts — which is what set the value:
 *    at 84px the last head row was clipped, measured at clientHeight 83 vs
 *    scrollHeight 86.)
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
 *     w      = max(TASK_BAR_MIN_WIDTH, (x1 - x0) / msPerPx)   // length == duration
 *   else:
 *     anchor = 'live' ; historyIndex = -1
 *     from   = to = window.end
 *     w      = TASK_MARKER_WIDTH                     // duration unknown: marker only
 *     x      = max(0, dataWidth - TASK_MARKER_WIDTH) // right-aligned to `now`
 *   viewX  = x - scrollLeft
 *   visible = viewX + w >= 0 && viewX <= viewportWidth
 *   at      = from            (epoch ms the card is anchored at)
 *   durationMs = to - from    (0 for a live card and for a single-event card)
 *   live    = anchor === 'live'
 *
 * A card with no dated history is therefore anchored at the window's right edge
 * (i.e. the NOW marker) and flagged `live: true` — the UI must label it as live
 * state, never as a measured interval. A history card spans the first to the
 * last dated transition exactly, floored only at the single-pixel hairline
 * {@link TASK_BAR_MIN_WIDTH} (a 30s task and a 300s task differ by 10x, and a
 * 1ms task really is a hairline rather than a 2px rule).
 * The LABEL is drawn INSIDE the box ({@link TASK_LABEL_MIN_WIDTH} or wider) and
 * truncated there, or omitted entirely below that — never hung beside the box — so
 * label text and box length stay decoupled without the label claiming any time.
 *
 * ============================== CULLING / INPUT SANITIZATION ===============
 * `cull: false` (default) returns every rect with `visible` computed.
 * `cull: true` drops the non-visible span/task rects from the arrays (rect count
 * in the DOM, not correctness). Lanes are always returned.
 *
 * `visible` is decided in VIEW space by {@link rectVisible} for every rect
 * family (spans, task cards, message markers, message bands): a rect that has
 * been scrolled out of the band is not visible, and one scrolled into it is —
 * regardless of how far into the content it sits.
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
import {
  MESSAGE_PREVIEW_MAX,
  type ActivitySpan,
  type LaneColorTokens,
  type MessageSpan,
  type SpanSpeaker,
  type TimelineLane,
  type TimelineResponse,
  type TimelineTask,
} from '../../shared/contract.ts'

/* ------------------------------------------------------------------ units */

export const SECOND_MS = 1_000
export const MINUTE_MS = 60 * SECOND_MS
export const HOUR_MS = 60 * MINUTE_MS
export const DAY_MS = 24 * HOUR_MS

/* -------------------------------------------------------------- viewport */

/** Fixed lane-head column width (px): name + status dot, per the narrow-panel design. */
export const LANE_HEAD_WIDTH = 132
/**
 * Fixed height of one lane row (px).
 *
 * FIXED BY DECISION, not adaptive: the user chose "always taller" over "grow to
 * fit". At 56px the three tracks were crowded — the message markers (12-23)
 * overlapped the task label (17-53) — so one lane now carries three separated
 * tracks (see {@link laneTracks}). Do not make this content-adaptive, and do not
 * shrink the 36px task label to win lanes back: 36px is two measured text lines.
 */
export const DEFAULT_LANE_HEIGHT = 92
/** Default height of the sticky time-axis header (px). */
export const DEFAULT_HEADER_HEIGHT = 28
/**
 * Blank headroom kept to the RIGHT of `now` in follow mode, as a fraction of the
 * viewport width.
 *
 * The user: "跟随时间线情况下，如果时间线已经去到最右边了，应该自动延长空白部分，让时间线
 * 回到整屏的 3/4 位置（左边3 右边1）这样就不用一直贴着边往前". Without it, following
 * pins `now` to the right edge and the timeline seems to crawl against the border.
 *
 * This is a CONTENT-pixel gutter produced HERE, not a CSS spacer: a spacer element
 * would be invisible to the scroll container's arithmetic and would also escape the
 * layout's own tests. `nowX` is deliberately untouched — `win.end` still IS `now`, so
 * an open task's box still ends at `now` (extending the window instead would stretch
 * every running box a quarter of a viewport into the future).
 */
export const FOLLOW_GUTTER_RATIO = 1 / 4

/** Default number of ticks wanted across the visible width. */
export const DEFAULT_TICK_COUNT = 6

/* --------------------------------------------------------------- geometry */

export const LANE_PAD_Y = 3
export const TURN_BAND_HEIGHT = 10
export const STEP_BAR_HEIGHT = 8

/* ------------------------------------------------------- the three tracks */

/**
 * A lane is three stacked TRACKS, with `TRACK_GAP` between them and
 * `LANE_BOTTOM_PAD` under the last one. The tracks are the contract: geometry is
 * derived from these constants (never from literals), and
 * `laneTracks(laneIndex, laneHeight)` returns the rectangles so a test can
 * assert the three of them never overlap — the regression lock for the crowded
 * 56px lane, where the message markers sat on top of the task label.
 *
 *   track 1  message   markers (+ the density band along the lane's bottom edge)
 *   track 2  activity  turn band + step bar
 *   track 3  task      the duration bar + its label chip
 */
export const ACTIVITY_TRACK_HEIGHT = TURN_BAND_HEIGHT
export const MESSAGE_TRACK_HEIGHT = 11
export const TASK_TRACK_HEIGHT = 32
/** Vertical gap between two tracks. */
export const TRACK_GAP = 3
/** Space under the last track, so a lane never ends flush against its bar. */
export const LANE_BOTTOM_PAD = 3

/** One track's vertical slice inside a lane. */
export interface LaneTrack {
  id: 'activity' | 'message' | 'task'
  /** Top edge, in content px (lane 0 starts at `headerHeight`). */
  y: number
  h: number
}

/**
 * The three track rectangles for one lane, in top-to-bottom order.
 *
 * @param laneIndex - 0-based lane index.
 * @param laneHeight - the lane's height; defaults to `DEFAULT_LANE_HEIGHT`.
 */
export function laneTracks(laneIndex: number, laneHeight: number = DEFAULT_LANE_HEIGHT): LaneTrack[] {
  const base = laneIndex * laneHeight
  const message = base + MESSAGE_TRACK_TOP
  const activity = base + ACTIVITY_TRACK_TOP
  const task = activity + ACTIVITY_TRACK_HEIGHT + TRACK_GAP
  return [
    { id: 'message', y: message, h: MESSAGE_TRACK_HEIGHT },
    { id: 'activity', y: activity, h: ACTIVITY_TRACK_HEIGHT },
    { id: 'task', y: task, h: TASK_TRACK_HEIGHT },
  ]
}
/** Vertical gap between the turn band and the card row. */
export const TASK_CARD_GAP = 4
/** Top of the FIRST track: the message-marker row. */
export const MESSAGE_TRACK_TOP = LANE_PAD_Y
/** Top of the SECOND track: the turn band / step bar. */
export const ACTIVITY_TRACK_TOP = MESSAGE_TRACK_TOP + MESSAGE_TRACK_HEIGHT + TRACK_GAP
export const TASK_CARD_TOP = ACTIVITY_TRACK_TOP + ACTIVITY_TRACK_HEIGHT + TRACK_GAP
/**
 * The card SLOT: the task box plus the transition rail that hangs under it.
 *
 * 20px box + 2px gap + 10px rail. The slot is what the lane has to fit, not the box,
 * so this stays the number that guards `DEFAULT_LANE_HEIGHT` (see the geometry note at
 * the top of the file).
 *
 * Declared as a literal rather than derived from {@link TASK_BAR_HEIGHT}, because the
 * track block above it is read before the box constants are declared. A test asserts
 * `TASK_BAR_HEIGHT + 2 + 10 === TASK_CARD_HEIGHT`, so the two cannot drift apart
 * silently — which a literal would otherwise allow.
 */
export const TASK_CARD_HEIGHT = 32
/** A span shorter than this still gets a visible mark. */
export const MIN_SPAN_PX = 2
/**
 * Technical hairline floor for the TASK BAR's width, in px.
 *
 * The bar's length IS its real elapsed time (`(to - from) / msPerPx`), so this
 * floor is NOT a readability minimum and must stay at a single device pixel:
 * at a coarse zoom a two-minute task is legitimately narrower than a pixel, and
 * rounding it up to a visible 2px rule would move both its edges and tell the
 * reader it lasted longer than it did. The previous value was
 * `MIN_SPAN_PX` (2px), which put a floor on the LENGTH — the user reported
 * exactly that as "视图粒度很大的时候…任务框的长度给了最少值，这样会有错觉"
 * (issue 3). Its left edge must always be the task's real start, so the bar may
 * only ever be a sub-pixel short of its real end, never wider than reality.
 *
 * The ACTIVITY spans keep {@link MIN_SPAN_PX}: a span is an instant with no
 * measurable width to distort, while a bar is a duration that does.
 *
 * Exported for the tests that pin both ends of this decision.
 */
export const TASK_BAR_MIN_WIDTH = 1

/**
 * Width of the marker drawn for a task with NO dated history, in px.
 *
 * A fixed size is honest HERE and nowhere else: this task has no duration at all, so
 * there is nothing for a width to misrepresent — the shape says "known to exist at this
 * instant, never observed starting". It is not a floor on a duration; a real duration
 * still gets `TASK_BAR_MIN_WIDTH` and an honest hairline. Without it the marker was a
 * single pixel and effectively invisible.
 */
export const TASK_MARKER_WIDTH = 9
/**
 * Height of the DURATION BAR (px).
 *
 * THE TASK BOX *IS* THE DURATION — there is no separate bar any more.
 *
 * The previous revision drew TWO objects per task: a thin 10px bar whose length was
 * the real duration, and a 36px card BOX that held the label at a FIXED 148px. The user read the box as "the task" and reported the
 * consequence: "如果时间线的长度比任务框固定最小的长度少的时候会出现问题，任务框的长度应该
 * 是按实际时间线来，而不是有个最小固定长度大小（这样意义上不合理）". They were right — a
 * 5-second task and a 5-minute task drew the same 148px box, so the box carried no
 * information and directly contradicted the bar beside it.
 *
 * There is now ONE element per task: a box that spans exactly its duration and holds
 * the label. Its fill is the lane's identity colour with the lane's `on` ink, which is
 * the same treatment the lane NAME gets, so "the coloured box is the task" is a single
 * consistent idea instead of two.
 *
 * 20px is one line of 12px text plus padding, and stays clear of
 * {@link STEP_BAR_HEIGHT} so the two never read as the same kind of object.
 */
export const TASK_BAR_HEIGHT = 20

/**
 * Vertical offset of the task box inside its card slot.
 *
 * Zero: the box starts at the top of the slot. (It used to be centred inside a taller
 * 36px card, which no longer exists.)
 */
export const TASK_BAR_TOP_OFFSET = 0

/**
 * The narrowest task box that still gets a label, in px.
 *
 * The user's rule, twice refined: "只在条内画，装不下就较少显示的文本" — the label lives
 * INSIDE the duration box, and when the box is too narrow for the whole subject the text
 * is TRUNCATED, never moved outside it. There is no outside placement left to fall back
 * on (see `TaskLabelPlacement`), so this constant is the only guard, and it has to be
 * wide enough for CSS `text-overflow: ellipsis` to produce an actual ellipsis: the
 * browser needs room for the ellipsis itself, and below that it clips a glyph in half —
 * the exact unreadable artefact the user reported twice (first as 图 1, then as
 * "还是出现图中文字在任务条外的情况").
 *
 * Arithmetic from the card's own padding in `styles.ts` (8px left + 6px right = 14px):
 * the text box is `w - 14`; one 11px glyph plus an ~8px ellipsis needs ~19px, so
 * `w >= 33`. 36 is that with a small margin. IF THE PADDING CHANGES, RE-DERIVE THIS.
 */
export const TASK_LABEL_MIN_WIDTH = 36

/**
 * The narrowest task box that still shows a bare "…", in px.
 *
 * The user, on a screenshot where a short task rendered NO text at all: "对于这些一个
 * 文本都显示不出来的，我觉得最少也要显示 「...」这样有内容". A box that cannot hold a
 * glyph plus an ellipsis should still be visibly a NAMED task, so there is a middle
 * state between "subject, truncated" and "nothing".
 *
 * Derivation, the same shape as {@link TASK_LABEL_MIN_WIDTH}: the text box is `w - 14`
 * and a "…" is ~8px, so `w >= 22`. Below that the ellipsis would itself be clipped,
 * which is the unreadable fragment this whole ladder exists to avoid.
 */
export const TASK_LABEL_ELLIPSIS_MIN_WIDTH = 22

/**
 * Which of the three label states a box of this width gets.
 *
 * All three thresholds are DERIVED from the card's padding in `styles.ts` (8px left +
 * 6px right = 14px) and two text widths — a "…" is ~8px, one 11px glyph plus that
 * ellipsis is ~19px — so the ladder is `w - 14` against {8, 19}:
 *
 *   w >= 36   'inside'    at least one glyph and the ellipsis; the renderer draws the
 *                         subject and CSS truncates it;
 *   22..35    'ellipsis'  room for the "…" alone, and the renderer draws exactly that;
 *   < 22      'none'      a hairline — even the ellipsis would be clipped.
 *
 * A live anchor has no duration yet (it is a 9px marker), so it never gets a label.
 *
 * IF THE PADDING CHANGES, RE-DERIVE ALL THREE NUMBERS.
 */
export function taskLabelPlacement(anchor: TaskCardRect['anchor'], w: number): TaskLabelPlacement {
  if (anchor !== 'history' || !Number.isFinite(w)) return 'none'
  if (w >= TASK_LABEL_MIN_WIDTH) return 'inside'
  if (w >= TASK_LABEL_ELLIPSIS_MIN_WIDTH) return 'ellipsis'
  return 'none'
}

/* ---------------------------------------------------------------- zoom */

/** 50 ms per px — the SANITY floor: the finest value the geometry layer will accept. */
export const MIN_MS_PER_PX = 50
/** 600 000 ms per px (10 min per px) — the zoom-out ceiling. */
export const MAX_MS_PER_PX = 600_000
export const DEFAULT_MS_PER_PX = 1_000

/**
 * 1 s per px — the finest MANUAL zoom, by user rule.
 *
 * Raised from 50 ms to 5 s ("时间粒度，最少的只需要去到 5 秒就行"), then lowered to 1 s
 * ("最小时间粒度改成 1s 吧") once the 5 s floor was on screen and read as too coarse.
 * The number has moved twice; the STRUCTURE below has not, and that is the part worth
 * keeping:
 *
 * Deliberately a SEPARATE constant from {@link MIN_MS_PER_PX}, and deliberately not
 * wired into {@link clampMsPerPx}: that one function is shared by three callers —
 * this floor's manual-zoom path, {@link fitMsPerPx}, and `layoutTimeline`'s own input
 * sanitisation — so a floor there would also clamp 适应窗口. Measured consequence of
 * getting that wrong (measured while the floor was 5 s/px): a 5-minute range on a 248px
 * canvas fits at ~1.2 s/px, so a clamped fit would have drawn 300s ÷ 5s = 60px of content
 * inside a 248px canvas and stranded the chart in the left quarter. The user's choice was
 * explicit: constrain the manual zoom only.
 */
export const MIN_ZOOM_MS_PER_PX = 1 * SECOND_MS

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
 *
 * KNOWN (open, tracked rather than fixed): this is smaller than
 * {@link MESSAGE_MARKER_WIDTH}, so two kept markers may still overlap by a
 * couple of pixels. Raising it to >= the width is a one-token change, held back
 * because it is a visual-tuning decision for the real-device pass.
 */
export const MESSAGE_MARKER_MIN_GAP_PX = 9
/** Rendered width of one message marker (px) — a dot that fits its glyph. */
export const MESSAGE_MARKER_WIDTH = 11
/** Rendered height of one message marker (px). */
export const MESSAGE_MARKER_HEIGHT = 11
/** Top of the marker row: the start of the message track, which is the FIRST track. */
export const MESSAGE_MARKER_TOP = MESSAGE_TRACK_TOP
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
  /**
   * The time-range filter: show only the last N ms of the window, or all of it.
   *
   * `null` / omitted / non-positive means "no filter". The window's END is untouched
   * (it is still `now` for a live board), so filtering narrows the view without
   * stopping the clock — which is what lets the follow toggle keep working while a
   * range is selected.
   *
   * A range WIDER than the log is clamped to the log's own start, so selecting "3
   * hours" on a two-minute session shows those two minutes rather than an hour of
   * empty axis.
   */
  windowSpanMs?: number | null
  /**
   * OPTION A: the window's LEFT boundary, frozen at the moment the range was chosen.
   *
   * With a range span the window used to SLIDE (`[now - span, now]`), so its left edge
   * advanced with the clock and pushed every old bar leftwards every tick — the user's
   * "越新时间的内容覆盖了旧内容 … 旧内容 … 是不动的". Passing the value here pins the
   * start at selection time and lets only the end grow, so the range means "the window
   * width when I chose it" rather than "the last N".
   *
   * `null`/absent keeps the previous sliding behaviour, which is also what `全部`
   * (no span) does — there the start is the earliest datum either way.
   */
  anchorStartMs?: number | null
  /**
   * Whether the view is following the live edge.
   *
   * When `true`, the canvas is widened by {@link FOLLOW_GUTTER_RATIO} of the viewport
   * so that scrolled fully right, `now` lands at 3/4 of the viewport instead of hard
   * against its right border. When `false` (the default) the geometry is byte-for-byte
   * what it was before this option existed: `contentWidth === dataWidth`.
   */
  follow?: boolean
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

/**
 * Where a task's label is drawn, or that it is not drawn at all.
 *
 * Exported as a named type so the renderer can switch on it exhaustively rather
 * than re-spelling the union and drifting from the layout's own contract.
 */
export type TaskLabelPlacement = 'inside' | 'ellipsis' | 'none'

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
  /**
   * The BAR's left edge and width. `w` is the task's real elapsed time divided
   * by `msPerPx` (floored at {@link TASK_BAR_MIN_WIDTH}): the bar length IS the
   * duration. It is independent of any label text.
   */
  x: number
  /** Top of the CARD box (the chip). */
  y: number
  /** CARD box height ({@link TASK_CARD_HEIGHT}); the chip uses this. */
  h: number
  /** BAR width: the task's real elapsed time, floored only at the 1px hairline. */
  w: number
  /**
   * Top of the BAR: `y + TASK_BAR_TOP_OFFSET`. The bar is centred inside the
   * card box, so it never shares the card's height.
   */
  barY: number
  /**
   * BAR height ({@link TASK_BAR_HEIGHT}) — deliberately NOT {@link h}. Sharing
   * the card height made the bar a 2-7px x 36px blob that read as a colour chip
   * beside the text instead of a Gantt bar.
   */
  barH: number
  viewX: number
  visible: boolean
  /** Alias of `anchor === 'live'`, for readable call sites. */
  live: boolean
  /**
   * The LABEL, and it is INSIDE the box or absent — there is no third answer.
   *
   * - `'inside'`   – `labelX === x`, `labelW === w`. The subject is drawn here and CSS
   *                  truncates it when `w` is too small for the whole thing.
   * - `'ellipsis'` – `labelX === x`, `labelW === w`. The box is too narrow for a glyph
   *                  plus an ellipsis, so the renderer draws a bare "…": the user's
   *                  "最少也要显示 「...」这样有内容".
   * - `'none'`     – `labelW === 0`, `labelX === x`: a hairline, where even the ellipsis
   *                  would be clipped. The box, its `title` and its click target are
   *                  unaffected.
   *
   * The label used to move OUTSIDE the box when it did not fit (`'right'`/`'left'`, with
   * the `TASK_CHIP_*` geometry and a clamp-into-the-canvas fallback). The user removed
   * that: "只在条内画，装不下就较少显示的文本" — see `taskCardRect` for the history.
   *
   * Neither answer ever moves `x`/`w`: the box keeps its true start and its true length.
   */
  labelPlacement: TaskLabelPlacement
  /**
   * True when the time-range filter cuts this task's START off, i.e. it began before the
   * window and is still inside it. The UI should say "continues from before" rather than
   * imply the task began at the window's edge.
   */
  clippedLeft?: boolean
  labelX: number
  labelY: number
  labelW: number
  labelH: number
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
  /**
   * Which way this message points ON THIS LANE (sent from here vs received
   * here). Resolved while laying out, so the renderer and the detail view agree
   * without recomputing anything.
   */
  direction: MessageDirection
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

/**
 * Whether a horizontally-positioned rect intersects the visible band.
 *
 * `viewX` must be the VIEW-space left edge (`x - scrollLeft`), never the
 * content-space `x`. Measuring visibility in content space silently declares
 * everything inside the first `viewportWidth` pixels of the CANVAS to be
 * visible, no matter where the user has scrolled to — so a rect scrolled off
 * the left stayed in the DOM, and (whenever the content is wider than the
 * viewport) a rect scrolled INTO view could be culled. Both are the same
 * mistake, and this helper exists so the four call sites cannot drift apart
 * again. It matches the contract documented at the top of this module.
 *
 * `TASK_BAR_MIN_WIDTH` no longer enters here: the floor is a hairline, and a
 * rect is either on screen or it is not.
 *
 * @param viewX - left edge in view space (`x - scrollLeft`).
 * @param w - the rect's width in px (may be sub-pixel).
 * @param viewportWidth - the visible width in px.
 */
export function rectVisible(viewX: number, w: number, viewportWidth: number): boolean {
  return viewX + w > 0 && viewX < viewportWidth
}

/**
 * Whether a rect INTERSECTS the selected time window at all.
 *
 * This is a different question from {@link rectVisible}: that one asks "is it on
 * screen", this one asks "is it in the range the user selected". Both have to hold for a
 * rect to be drawn.
 *
 * It exists because the two positions are CLAMPED into the window (`clamp(from, start,
 * end)`), and clamping an out-of-range rect produces a plausible-looking stub at x=0
 * rather than something obviously wrong. Measured with a 5-minute filter over a
 * 30-minute log: a task that had ended 14 minutes before the window opened was still
 * drawn as a 10px box clinging to the left edge, and a span that ended 20 minutes
 * earlier became a 2px bar there. Both say "something happened here", and nothing did.
 *
 * @param from - the rect's start, epoch ms.
 * @param to - the rect's end, epoch ms.
 * @param win - the window in force.
 */
export function inWindow(from: number, to: number, win: { start: number; end: number }): boolean {
  return to >= win.start && from <= win.end
}

function pad2(value: number): string {
  return value < 10 ? `0${value}` : `${value}`
}

/** Clamp a requested zoom into [{@link MIN_MS_PER_PX}, {@link MAX_MS_PER_PX}]. */
export function clampMsPerPx(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MS_PER_PX
  return clamp(value, MIN_MS_PER_PX, MAX_MS_PER_PX)
}

/**
 * Clamp a MANUAL zoom request, given the zoom currently on screen.
 *
 * Two things, and the second is the one that bites:
 *
 * 1. the floor is {@link MIN_ZOOM_MS_PER_PX} (1 s/px), so zooming in stops where the
 *    user said it should;
 * 2. the floor is the FINER of that and `current`. {@link fitMsPerPx} is allowed below
 *    the manual floor, so a plain `clamp(requested, 1000, …)` would make a zoom-IN click
 *    from a fitted sub-floor zoom snap UP to the floor — the user asks to move closer
 *    and the chart jumps AWAY. It needs a SHORT window to show (a 248px canvas only fits
 *    below 1 s/px under ~4 minutes, and the finest range option is 5m), which is exactly
 *    why the unit test constructs one instead of reusing a shipped range.
 *    With `min(floor, current)`, that click clamps onto the current value, and
 *    `applyZoom`'s `next === effectiveMsPerPx` guard turns it into a no-op: the button
 *    simply stops, which is what "5 s is the finest" means when you are already finer.
 *    Zooming OUT from there is unaffected.
 */
export function clampZoomMsPerPx(value: number, current: number): number {
  if (!Number.isFinite(value) || value <= 0) return clampMsPerPx(current)
  const from = clampMsPerPx(current)
  return clamp(value, Math.min(MIN_ZOOM_MS_PER_PX, from), MAX_MS_PER_PX)
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
/**
 * `HH:MM:SS` in the panel's local time.
 *
 * Seconds are included because several messages routinely land inside one
 * minute, and "which of these four replies came first" is exactly what a reader
 * of this chart asks. Call sites that genuinely want the coarser form ask for it
 * (`{ seconds: false }`) — e.g. the NOW marker, where a ticking seconds value
 * would be noise.
 */
export function formatClock(time: number, tzOffsetMinutes = 0, options?: { seconds?: boolean }): string {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS)
  const hm = `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`
  return options?.seconds === false ? hm : `${hm}:${pad2(shifted.getUTCSeconds())}`
}

/** `MM-DD HH:mm` in the local zone described by `tzOffsetMinutes`. */
export function formatDateTime(time: number, tzOffsetMinutes = 0): string {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS)
  return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())} ${formatClock(time, tzOffsetMinutes)}`
}

/** The header label of one tick. */
export function formatTickLabel(time: number, kind: TickKind, tzOffsetMinutes = 0): string {
  // The AXIS stays minute-coarse on purpose: a tick label is a coordinate
  // readout, and seconds there are noise (the detail views carry the seconds).
  if (kind === 'time') return formatClock(time, tzOffsetMinutes, { seconds: false })
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
/**
 * The `[earliest, latest]` times anywhere in the payload, floored at the server's
 * `range.start`.
 *
 * Extracted from `computeWindow` so the anchored-window helper and the window itself
 * agree on what "the earliest datum" means: two independent scans could disagree, and
 * then the anchor would be clamped differently from the window it is meant to pin.
 *
 * @param data - the payload; hostile or partial entries are ignored, never thrown on.
 * @param fallback - the server's `range.start`, or the clock.
 */
export function dataExtent(data: TimelineResponse, fallback: number): { start: number; end: number } {
  const seed = num(fallback, 0)
  let rawStart = seed
  let rawEnd = seed
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
      // Hostile/partial payloads reach this function by contract: a null entry or a
      // non-finite time must be ignored, never thrown on.
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
  return { start: rawStart, end: rawEnd }
}

/**
 * The window start a range selection ACTUALLY produces, for use as a frozen anchor.
 *
 * Why this exists instead of the caller computing `now - span`: the window start is
 * clamped at the earliest datum (a filter wider than the log shows the whole log rather
 * than empty space to its left). So for the common case — the user picks `1h` but the
 * session is only 30 minutes old — `now - span` is EARLIER than any data, and anchoring
 * to it is silently undone by that clamp: the window keeps sliding and old content keeps
 * being pushed left, which is the very bug this change is about. Measured with the naive
 * anchor: `scrollLeft` moved 126px on every step and `nowViewX` stayed ~186.
 *
 * Anchoring to the clamped value is the only anchor that survives, and it is idempotent
 * because the layout clamps an anchor to the earliest datum too.
 *
 * @param now - the clock at the moment of anchoring.
 * @param windowSpanMs - the selected span; absent/non-positive means no anchor.
 * @param earliestDatum - the earliest time anywhere in the payload.
 * @returns the window start to pin, or `null` when there is nothing to pin.
 */
export function effectiveWindowStart(
  now: number,
  windowSpanMs: number | null | undefined,
  earliestDatum: number,
): number | null {
  if (typeof windowSpanMs !== 'number' || !Number.isFinite(windowSpanMs) || windowSpanMs <= 0) return null
  const clockStart = num(now, 0) - windowSpanMs
  return Math.max(clockStart, num(earliestDatum, clockStart))
}

export function computeWindow(
  data: TimelineResponse,
  now: number,
  windowSpanMs?: number | null,
  anchorStartMs?: number | null,
): TimelineWindow {
  const fallback = num(now, 0)
  const rangeStart = num(data?.range?.start, fallback)
  const hasRangeEnd = typeof data?.range?.end === 'number' && Number.isFinite(data.range.end)
  const rangeEnd = hasRangeEnd ? num(data?.range?.end, fallback) : null
  const live = isLiveBoard(data)

  const extent = dataExtent(data, rangeStart)
  const start = extent.start
  const rawEnd = extent.end
  // A live window is pinned to `now` (but never hides data newer than `now`).
  // A FROZEN window ignores `now` entirely: its right edge is the server's
  // `range.end` when there is one, and otherwise the last datum — never a
  // moving clock, so the axis cannot creep while every member is stopped.
  const endSource: WindowEndSource = live ? 'now' : rangeEnd !== null ? 'range' : 'datum'
  const right =
    endSource === 'now' ? Math.max(fallback, rawEnd) : endSource === 'range' ? Math.max(rangeEnd ?? rawEnd, rawEnd) : rawEnd
  const end = Math.max(right, start + 1)

  // ---- the time-range filter -------------------------------------------
  //
  // "只看最近 N" is expressed by moving the LEFT edge to `end - N`, not by hiding
  // rects in the renderer: every downstream position is already relative to
  // `win.start`, so one number filters the axis, the bars, the markers and the ticks
  // together, and they cannot disagree about what "in range" means.
  //
  // Clamped at `rawStart`: a filter WIDER than the whole log shows the whole log
  // rather than empty space to the left of the first datum. A filter narrower than the
  // log genuinely cuts, which is the point.
  //
  // `end` is deliberately NOT recomputed. For a live board it is still `now`, so the
  // window keeps tracking the clock and the view can follow it; for a frozen board it
  // is still the last datum, so filtering cannot make a stopped chart creep forward.
  const span = typeof windowSpanMs === 'number' && Number.isFinite(windowSpanMs) && windowSpanMs > 0 ? windowSpanMs : null
  /**
   * OPTION A: a frozen left boundary. `start` is PINNED at the value chosen when the
   * range was selected, and only `end` moves (with `now`), so nothing already drawn is
   * pushed left. The anchor is clamped to `rawStart` so it can never be LATER than the
   * earliest datum: the window may not quietly drop data that is still on screen.
   */
  // `start` IS the earliest datum (`dataExtent(...).start`), so these clamps are the
  // same ones the pre-anchor code applied to `rawStart`.
  /**
   * The anchored start, clamped the SAME way the sliding window clamps — and that is
   * the whole subtlety.
   *
   * `Math.min(anchorStartMs, start)` looked harmless ("never later than the earliest
   * datum, so no on-screen data is dropped") but it silently DESTROYED the range filter
   * for any session longer than the chosen span. Measured on a 6-hour session:
   *
   *   computeWindow(data, now, 1h)        -> start 59min ago, duration 60min   (correct)
   *   computeWindow(data, now, 1h, anchor)-> start 360min ago, duration 361min (filter GONE)
   *
   * because `earliest` is 6 hours back, so the clamp pulled the anchor from "1 hour ago"
   * all the way to the session start. Every range then looked identical to `全部`, which
   * is exactly the regression the user reported ("筛选 tim range 页面没有任何变化").
   *
   * The clamp must therefore only stop the anchor going EARLIER than the data
   * (`Math.max(anchor, start)`) — the same `Math.max(start, end - span)` the sliding
   * path uses. An anchor later than `start` is the normal, working case: it is what
   * makes the visible window narrower than the session.
   */
  const anchor =
    typeof anchorStartMs === 'number' && Number.isFinite(anchorStartMs) ? Math.max(anchorStartMs, start) : null
  const filteredStart = anchor !== null ? anchor : span === null ? start : Math.max(start, end - span)
  // NOTE: the window keeps exactly its four original fields. `endSource` is a
  // layout-level field, so the (verified) window shape stays untouched.
  return { start: filteredStart, end, durationMs: end - filteredStart, live }
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
 *     kept one OF THE SAME DIRECTION. The spacing cursor is per direction on
 *     purpose: with a single shared cursor, an outgoing marker that lands a few
 *     pixels after an already-kept incoming one is dropped for the whole lane,
 *     so a lane of N replies renders as N receipts and never shows a single
 *     "sent" arrow. That is a data-distorting failure (the direction layer
 *     silently disappeared), not a cosmetic one.
 *     Consequence to accept consciously: two markers of different directions may
 *     now sit closer than `gapPx`, i.e. they can overlap slightly. Losing an
 *     entire direction to avoid a 2px overlap is the wrong trade.
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
    /** The lane these messages are drawn on — needed to know the direction. */
    laneId?: string
    /** Speaker id -> lane id, so direction can be resolved per lane. */
    laneIdOf?: (sessionId: string) => string | null
  },
): { indices: number[]; droppedTotal: number; candidates: number } {
  const gapPx = input.gapPx > 0 ? input.gapPx : MESSAGE_MARKER_MIN_GAP_PX
  const maxPerLane = input.maxPerLane > 0 ? Math.floor(input.maxPerLane) : MESSAGE_MARKER_MAX
  const msPerPx = input.msPerPx > 0 ? input.msPerPx : DEFAULT_MS_PER_PX

  const candidates: number[] = []
  for (let index = 0; index < list.length; index += 1) {
    const span = list[index]
    if (span === undefined || span === null || typeof span !== 'object') continue
    // A span with no datable time cannot be placed on the axis at all: drawing it
    // would put a marker at an invented position, so it is never a candidate
    // (the backfill pass below must not resurrect it either).
    if (!Number.isFinite(num(span.time, Number.NaN))) continue
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
  // BOTH the spacing cursor and the bucket occupancy are PER DIRECTION.
  //
  // Only one message can be kept per (direction, bucket). With a single shared
  // bucket set, an incoming and an outgoing message landing in the same 9px
  // window meant the later one was dropped — and since a lane's replies sit a few
  // pixels after the prompts they answer, that reliably erased every "sent" arrow
  // from every lane: the direction layer silently disappeared while the count and
  // the times stayed plausible. Losing a direction is a data distortion; a
  // slightly tighter spacing between two markers of DIFFERENT directions is a
  // cosmetic cost, and that is the trade this makes on purpose.
  const usedBuckets = new Set<string>()
  const lastXByKind = new Map<string, number>()
  const kindOf = (span: MessageSpan): string => {
    if (input.laneId === undefined || input.laneIdOf === undefined) return 'any'
    return resolveMessageDirection(span, input.laneId, input.laneIdOf).direction
  }
  for (const index of ordered) {
    if (kept.length >= maxPerLane) break
    const span = list[index]
    if (span === undefined) continue
    const x = (num(span.time, input.windowStart) - input.windowStart) / msPerPx
    const bucket = spanPx > 0 ? clamp(Math.floor(x / bucketSizePx), 0, bucketCount - 1) : 0
    const kind = kindOf(span)
    const bucketKey = `${kind}#${bucket}`
    if (usedBuckets.has(bucketKey)) continue
    const lastX = lastXByKind.get(kind)
    if (lastX !== undefined && x - lastX < gapPx) continue
    usedBuckets.add(bucketKey)
    kept.push(index)
    lastXByKind.set(kind, x)
  }

  // ---- backfill: never let a whole direction vanish ----------------------
  //
  // The greedy pass can still starve a direction on a very wide lane: every
  // "sent" marker sits a few pixels after an already-kept "received" one, so all
  // of them fail the spacing rule. When that happens, re-run for that direction
  // alone with the spacing rule relaxed — it keeps the direction visible at a
  // couple of extra overlapping pixels, which is emphatically better than a lane
  // that shows replies but never replies. Markers still keep their exact times
  // and the lane's own `messageBands` still reports the true extent either way.
  const directionsWithData = new Set(ordered.map((index) => {
    const span = list[index]
    return span === undefined ? 'any' : kindOf(span)
  }))
  const directionsKept = new Set(kept.map((index) => {
    const span = list[index]
    return span === undefined ? 'any' : kindOf(span)
  }))
  for (const kind of directionsWithData) {
    if (directionsKept.has(kind) || kept.length >= maxPerLane) continue
    const fallback = ordered.find((index) => {
      const span = list[index]
      return span !== undefined && kindOf(span) === kind
    })
    if (fallback !== undefined) {
      kept.push(fallback)
      directionsKept.add(kind)
    }
  }
  return { indices: kept.sort((a, b) => a - b), droppedTotal: candidates.length - kept.length, candidates: candidates.length }
}

/**
 * Human-readable elapsed time, for the "how long did it take" readout.
 *
 * Deliberately coarse and unit-stable rather than locale-formatted: the panel
 * shows it next to two clock times the reader is comparing, so `1h 5m 3s` beats
 * a localized duration string that wraps. Sub-second spans floor to `0s`.
 *
 * @param ms - elapsed milliseconds; negative or non-finite yields an empty
 *   string, so a caller can treat "no duration" as "do not render".
 */
export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return ''
  const total = Math.floor(ms / 1000)
  const seconds = total % 60
  const minutes = Math.floor(total / 60) % 60
  const hours = Math.floor(total / 3600)
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

/**
 * The two endpoints of a task's bar plus its elapsed time, as one readable line.
 *
 * Shared by the card tooltip and the details panel so the number the user hovers
 * is the same number the user opens — one implementation, no drift. Returns the
 * "unknown" text when the task has no dated history at all, which is the honest
 * answer for a live task (its bar is a marker, not a duration).
 *
 * @param task - the task whose `history` is already ascending by time.
 * @param formatTime - formats one epoch ms as local time for this panel.
 * @param texts - the three strings, injected so this stays label-agnostic.
 */
export function taskDurationLine(
  task: TimelineTask,
  formatTime: (time: number) => string,
  texts: { created: string; finished: string; lastTransition: string; duration: string; unknown: string; line: string },
): { from: string; to: string; duration: string; label: string; text: string; known: boolean } {
  const history = task.history ?? []
  const created = history[0]?.time
  const last = history[history.length - 1]?.time
  if (created === undefined || last === undefined || history.length === 0) {
    return { from: '', to: '', duration: '', label: texts.unknown, text: texts.unknown, known: false }
  }
  const elapsed = Math.max(0, last - created)
  const from = formatTime(created)
  const to = formatTime(last)
  const duration = formatDuration(elapsed)
  const label = task.status === 'completed' ? texts.finished : texts.lastTransition
  return {
    from,
    to,
    duration,
    label,
    text: texts.line.replace('{from}', from).replace('{to}', `${label} ${to}`).replace('{duration}', duration),
    known: true,
  }
}

/** Which way a message points on the lane it is drawn on. */
export type MessageDirection = 'outgoing' | 'incoming'

/** A message's resolved direction and counterpart on ONE lane. */
export interface MessageLaneDirection {
  direction: MessageDirection
  /** The lane whose id equals the counterpart's session id, when it exists. */
  peerLaneId: string | null
  /** The counterpart's speaker kind, for choosing the paint. */
  peerKind: SpanSpeaker['kind']
  /** Counterpart display name (falls back to the raw id). */
  peerName: string
  /**
   * `false` when the counterpart is not a lane of this board (a `system`
   * sender, or a member that has already left). The caller must then paint a
   * NEUTRAL colour — never guess a lane, and say so in the tooltip.
   */
  peerMatched: boolean
}

/**
 * Resolve a message's direction ON A GIVEN LANE, from that lane's point of view.
 *
 * This is the whole of the user's rule: "A sends to B — A's lane shows B's
 * colour with a sent mark; B's lane shows A's colour with a received mark." The
 * same span therefore paints differently in the two lanes, and the colour is
 * always the COUNTERPART's.
 *
 * Two corners are settled here rather than left to intuition:
 * - A message with NO addressee (`to` absent) is **outgoing** on its sender's
 *   lane (it demonstrably left here; the destination is unrecorded) and has NO
 *   counterpart there — naming the sender would just name this lane. On any other
 *   lane the same message is **incoming**, and its counterpart is the sender.
 *   That is what makes a human prompt read "received from <me>" instead of
 *   "received from <the lane it is drawn on>".
 * - A lane that is BOTH sender and receiver (a note to self) resolves as
 *   **incoming**, per the documented precedence `outgoing = sender && !receiver`
 *   — chosen so the rule is a single expression, not an ordering accident.
 *
 * Critically, the lookup is by **laneId**, and a speaker's `id` is a SESSION id.
 * The board's lanes happen to use session ids as their ids, so this maps them
 * through `laneIdOf` — but it must be an explicit mapping, because querying a
 * lane-keyed colour table with `message.from.id` silently returns undefined and
 * paints nothing. That was a real bug: every agent marker lost its colour.
 *
 * @param message - the message span (its `from`/`to` are session ids).
 * @param laneId - the lane currently being drawn.
 * @param laneIdOf - session id -> lane id, built from the board's lanes.
 */
export function resolveMessageDirection(
  message: MessageSpan,
  laneId: string,
  laneIdOf: (sessionId: string) => string | null,
): MessageLaneDirection {
  const fromId = message.from?.id ?? ''
  const toId = message.to?.id ?? ''
  // BOTH sides must be mapped into LANE space before comparing with `laneId`.
  // A speaker's `id` is a SESSION id and `laneId` is a lane id; they coincide
  // only for a teammate (whose lane id IS its session id). The lead's lane id is
  // the literal 'lead' while its session id is 'session-…', so comparing the raw
  // ids made `outgoing` unreachable on the lead's lane — every marker rendered as
  // incoming even though the data was right.
  const fromLane = fromId === '' ? null : laneIdOf(fromId)
  const toLane = toId === '' ? null : laneIdOf(toId)
  const selfIsSender = fromLane !== null && fromLane === laneId
  const selfIsReceiver = toLane !== null && toLane === laneId
  // Priority when a lane is BOTH the sender and the receiver (a note to self):
  // it counts as outgoing, because the arrow should point away. Keeping the
  // sender check first makes that explicit rather than dependent on order.
  const outgoing = selfIsSender && !selfIsReceiver
  // The counterpart is the OTHER party — derived from the two speakers, not from
  // "whichever side the direction picked". With no addressee recorded there is
  // only ONE party, and which role it plays depends on them:
  //   - the HUMAN writes with no `to`  -> this lane received it: peer = the human;
  //   - a TEAMMATE wrote with no `to`  -> this lane sent it: no peer at all
  //     (taking `message.from` here would name the lane itself, which is how a
  //     prompt on the lead lane ended up reading "received from Lead").
  const noAddressee = message.to === undefined || message.to === null
  let peer: SpanSpeaker | undefined
  if (noAddressee) {
    peer = selfIsSender ? undefined : message.from
  } else {
    peer = outgoing ? message.to : message.from
  }
  const peerKind: SpanSpeaker['kind'] = peer?.kind ?? (outgoing ? 'teammate' : 'system')
  const peerName = peer?.name !== undefined && peer.name !== '' ? peer.name : (peer?.id ?? '')
  const peerLaneId = peer === undefined || peer.id === '' ? null : laneIdOf(peer.id)
  return {
    direction: outgoing ? 'outgoing' : 'incoming',
    peerLaneId,
    peerKind,
    peerName,
    peerMatched: peer !== undefined && (peerKind === 'user' || peerLaneId !== null),
  }
}

/**
 * Resolve a lane's identity colour NAME (a bare `--dsw-alias-…` token) into
 * usable paint, i.e. wrap it in `var(...)`.
 *
 * The contract publishes token NAMES, so passing one straight into a style makes
 * an invalid declaration that paints nothing — silently. A name that is already
 * wrapped is tolerated, because a host have shipped either shape.
 */
export function lanePaint(token: string): string {
  const name = token.trim()
  if (name === '') return 'currentColor'
  // Three spellings reach here and only one needs wrapping:
  //   `--dsw-...`               a token name -> `var(--dsw-...)`
  //   `color-mix(in srgb, ...)` a composition of tokens -> left as-is
  //   `var(--dsw-...)`          already wrapped -> left as-is
  // Wrapping a `color-mix()` in `var()` would turn it into a custom-property LOOKUP
  // of a name that does not exist, which paints nothing — silently, with no error.
  if (name.startsWith('var(') || name.startsWith('color-mix(')) return name
  return `var(${name})`
}

/**
 * A lane's identity colour with a stable fallback, for a payload that predates
 * `lane.color`. Lead and the human get FIXED slots (so "who said this" never
 * depends on roster order); teammates are hashed by id.
 */
export function laneColorIndex(
  lane: { id: string; role: string; color?: LaneColorTokens | undefined },
  index: number,
): LaneColorTokens {
  const given = lane.color
  if (given !== undefined && typeof given.bar === 'string' && given.bar !== '') {
    // A payload with no `on` at all gets the STATIC white, i.e. the same ink the
    // palette uses for a saturated fill — never the flipping alias. See ON_DARK_FILL.
    return { bar: lanePaint(given.bar), on: lanePaint(given.on ?? ON_DARK_FILL) }
  }
  const palette: readonly LaneColorTokens[] = LANE_COLOR_FALLBACKS
  const pick = (slot: number): LaneColorTokens => {
    const entry = palette[slot % palette.length] as LaneColorTokens
    return { bar: lanePaint(entry.bar), on: lanePaint(entry.on) }
  }
  if (lane.role === 'lead') return pick(0)
  if (lane.id === 'unassigned' || lane.role === 'unknown') return pick(palette.length - 1)
  let hash = 0
  for (let i = 0; i < lane.id.length; i += 1) hash = (hash * 31 + lane.id.charCodeAt(i)) >>> 0
  return pick(1 + (hash % (palette.length - 1)))
}

/**
 * The paint for one message marker on one lane — the colour-meaning contract,
 * usable without a renderer.
 *
 * The colour is the COUNTERPART's lane colour ("in A's lane, A→B uses B's
 * colour"), the human's own fixed two-tone paint whenever the counterpart is the
 * human, and the neutral paint when the counterpart is not a lane of this board
 * (`system`, or a member that has left) — never a guessed lane.
 *
 * @param message - the span; `from`/`to` carry SESSION ids.
 * @param laneId - the lane being drawn.
 * @param laneColors - lane id -> paint, built from the payload's lanes.
 * @param laneIdOf - session id -> lane id, or null when not on this board.
 * @param userPaint - the fixed paint for the human.
 * @param systemPaint - the neutral fallback.
 */
export function messageMarkerPaint(
  message: MessageSpan,
  laneId: string,
  laneColors: Map<string, LaneColorTokens>,
  laneIdOf: (sessionId: string) => string | null,
  userPaint: LaneColorTokens,
  systemPaint: LaneColorTokens,
): {
  paint: LaneColorTokens
  direction: MessageDirection
  peerName: string
  peerLaneId: string | null
  peerMatched: boolean
  isUser: boolean
} {
  const resolved = resolveMessageDirection(message, laneId, laneIdOf)
  const isUser = resolved.peerKind === 'user'
  const isSystem = resolved.peerKind === 'system'
  const peerPaint = resolved.peerLaneId === null ? undefined : laneColors.get(resolved.peerLaneId)
  const ownPaint = laneColors.get(laneId)
  // Precedence, most specific first:
  //  1. a human counterpart -> the fixed user paint;
  //  2. a counterpart that IS a lane here (including a note to self, whose peer
  //     resolves to this same lane) -> that lane's colour, i.e. "the other side's
  //     colour" as seen from this lane;
  //  3. no addressee yet (a queued message) -> this lane's own colour, as there
  //     is nobody else to borrow from;
  //  4. anything else (system, a member that left) -> neutral, and the tooltip
  //     says the counterpart is not on this board. Never a guess.
  const noAddressee = message.to === undefined || message.to === null
  // A `system` counterpart is checked BEFORE the no-addressee fallback: the
  // fallback exists for "this lane sent it, nobody is recorded as the recipient",
  // not for "the sender is not a lane at all" (which must read as neutral).
  const own =
    isUser && resolved.peerMatched
      ? userPaint
      : resolved.peerMatched && peerPaint !== undefined
        ? peerPaint
        : noAddressee && !isSystem && ownPaint !== undefined
          ? ownPaint
          : systemPaint
  return {
    paint: own,
    direction: resolved.direction,
    peerName: resolved.peerName,
    peerLaneId: resolved.peerLaneId,
    peerMatched: resolved.peerMatched,
    isUser,
  }
}

/** Fallback lane tokens, for a payload that predates `lane.color`. */
/**
 * The ink for a saturated fill; see `LaneColorTokens.on` in the contract.
 *
 * A STATIC white, not the flipping `--dsw-alias-label-primary-inverted`: in the dark
 * skin that alias resolves to `#353638`, which put the lane-name pill at 2.34:1 on a
 * blue fill. Static tokens are the same colour in both skins, which is what a saturated
 * fill needs.
 */
const ON_DARK_FILL = '--dsw-static-neutral-bluish-00'
/** The ink for a pale fill; see `LaneColorTokens.onLight`. */
const ON_LIGHT_FILL = '--dsw-alias-label-primary'

/**
 * Fallback lane tokens for a payload that predates `lane.color`.
 *
 * These MIRROR `LANE_COLOR_TOKENS` in `src/host/lane-color.ts` — the same SEVENTEEN
 * entries in the same order (`[0]` the Lead's blue, `[1..16]` the sixteen teammate
 * colours), composed from the same theme tokens by the same nested two-colour mixes —
 * because a fallback that drifts from the real palette is a palette with two meanings.
 * Exported so the chart uses THIS table instead of keeping a second copy: there were
 * two, and one of them still named `--dsw-alias-state-idle-primary` (a chroma-0 grey)
 * after the other was fixed, which is exactly how "no grey lanes" quietly stops being
 * true.
 *
 * ORDER IS THE CONTRACT, not decoration: the roster cycle addresses this array by
 * lane index (`slot = 1 + ((index - 1) % 16)`, `laneColor` in `GanttChart.tsx`), so a
 * reordering here silently recolours every teammate. `tests/lane-color.spec.ts` pins
 * the guarantees; a test also compares this array's `bar` strings to the host's
 * element by element.
 */
export const LANE_COLOR_FALLBACKS: readonly LaneColorTokens[] = [
  // 0 — blue: the Lead. Never handed to a teammate.
  { bar: '--dsw-static-blue-600', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 1 — crimson deep
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-600) 70%, var(--dsw-static-blue-600) 30%) 92%, var(--dsw-static-neutral-bluish-1000) 8%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 2 — green light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 60%, var(--dsw-static-amber-500) 40%) 68%, var(--dsw-static-neutral-bluish-1000) 32%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 3 — violet light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-500) 35%, var(--dsw-static-blue-450) 65%) 88%, var(--dsw-static-neutral-bluish-1000) 12%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 4 — olive deep
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-400) 15%, var(--dsw-static-amber-500) 85%) 50%, var(--dsw-static-neutral-bluish-1000) 50%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 5 — magenta light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-blue-600) 40%, var(--dsw-static-red-400) 60%) 98%, var(--dsw-static-neutral-bluish-1000) 2%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 6 — teal light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-blue-500) 30%, var(--dsw-static-green-400) 70%) 68%, var(--dsw-static-neutral-bluish-1000) 32%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 7 — magenta deep
  { bar: 'color-mix(in srgb, var(--dsw-static-red-500) 50%, var(--dsw-static-blue-800) 50%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 8 — green deep
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 60%, var(--dsw-static-amber-500) 40%) 54%, var(--dsw-static-neutral-bluish-1000) 46%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 9 — rose light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-500) 75%, var(--dsw-static-blue-600) 25%) 98%, var(--dsw-static-neutral-bluish-1000) 2%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 10 — teal deep
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 50%, var(--dsw-static-blue-900) 50%) 88%, var(--dsw-static-neutral-bluish-1000) 12%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 11 — orange deep
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-600) 45%, var(--dsw-static-amber-500) 55%) 60%, var(--dsw-static-neutral-bluish-1000) 40%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 12 — azure deep
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-400) 35%, var(--dsw-static-blue-500) 65%) 60%, var(--dsw-static-neutral-bluish-1000) 40%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 13 — orange light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-600) 40%, var(--dsw-static-amber-500) 60%) 76%, var(--dsw-static-neutral-bluish-1000) 24%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 14 — violet deep
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-blue-450) 70%, var(--dsw-static-red-600) 30%) 74%, var(--dsw-static-neutral-bluish-1000) 26%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 15 — olive light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 15%, var(--dsw-static-amber-500) 85%) 66%, var(--dsw-static-neutral-bluish-1000) 34%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 16 — azure light
  { bar: 'color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 20%, var(--dsw-static-blue-400) 80%) 70%, var(--dsw-static-neutral-bluish-1000) 30%)', on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
]


/** A message marker's full detail, assembled without a renderer. */
export interface MessageDetail {
  /** `A → B` when sent from this lane, `B → A` when received (as displayed). */
  route: string
  /** Sender name and recipient name, separately, for a testable assertion. */
  fromName: string
  toName: string
  direction: MessageDirection
  /** Local time of the message record, seconds included. */
  when: string
  kind: MessageSpan['kind']
  /** The COMPLETE body. Never a prefix; never truncated here. */
  body: string
  /** `false` when the host recorded no text at all (render "no body", not ""). */
  hasBody: boolean
  /**
   * `true` when the body is exactly at the contract's ceiling, i.e. the host may
   * have clipped it. The panel must SAY so rather than imply completeness.
   */
  maybeTruncated: boolean
}

/**
 * Build everything the detail view shows for one message marker.
 *
 * Exported so the panel's assembly is testable without a DOM, and so the body is
 * guaranteed to be the marker's OWN text: a marker represents one span, and the
 * "+N" badge on it counts DIFFERENT, undrawn messages — clicking never shows a
 * neighbour's body.
 *
 * @param marker - the drawn marker (carries its own exact `preview`).
 * @param input - the span's identity, direction, speakers and body. Deliberately
 *   a narrow shape rather than a full marker rect, so a caller that only has a
 *   `MessageSpan` (the details panel) can use it without inventing geometry.
 * @param texts - display strings, injected so this stays label-agnostic.
 * @param formatTime - formats one epoch ms as local time.
 * @param previewMax - the contract's ceiling, used only to flag a possible clip.
 */
export function messageDetail(
  input: {
    kind: MessageSpan['kind']
    time: number
    direction: MessageDirection
    from: SpanSpeaker
    to?: SpanSpeaker | undefined
    preview?: string | undefined
    /**
     * The lane this message is DRAWN on. Used only to infer a missing
     * recipient — see {@link MessageDetailInput} notes below.
     */
    laneName?: string | undefined
  },
  texts: { you: string; recipientUnrecorded: string },
  formatTime: (time: number) => string,
  previewMax: number = MESSAGE_PREVIEW_MAX,
): MessageDetail {
  const marker = input
  const body = marker.preview ?? ''
  const isUser = marker.from.kind === 'user'
  const fromName = isUser ? texts.you : marker.from.name !== '' ? marker.from.name : marker.from.id
  // A missing `to` is not "unknown": the host deliberately records no recipient
  // for a human prompt (adding one would draw the same prompt on two lanes). The
  // recipient is nevertheless *derivable* — this message is carried by exactly
  // one lane's log, and that lane is who it went to. Only when even that is
  // unavailable do we say the recipient was not recorded; we never print a word
  // like "unknown", which reads as corrupt data.
  const toName =
    marker.to === undefined || marker.to === null
      ? marker.laneName !== undefined && marker.laneName !== ''
        ? marker.laneName
        : texts.recipientUnrecorded
      : marker.to.name !== '' && marker.to.name !== undefined
        ? marker.to.name
        : marker.to.id
  return {
    route: `${fromName} → ${toName}`,
    fromName,
    toName,
    direction: marker.direction,
    when: formatTime(marker.time),
    kind: marker.kind,
    body,
    hasBody: body !== '',
    maybeTruncated: body.length >= previewMax,
    // The direction-specific arrow form (`B ← A`) is built by the renderer from
    // `route` + `direction`, so both languages can order the arrow correctly.
  }
}

/**
 * Build the speaker-id -> lane-id mapper for a payload.
 *
 * Exported because two places need the SAME mapping (the layout's density pass
 * and the message details panel). A second implementation would be free to drift,
 * and the failure mode of drifting is a silently wrong direction.
 *
 * A teammate's lane id IS its session id; the lead's session id only appears in
 * its `navigation`, which is why lane-id equality alone is not enough.
 *
 * @param lanes - the board's lanes.
 */
export function speakerLaneMapper(
  lanes: readonly TimelineLane[],
): (speakerId: string) => string | null {
  const lanesById = new Set(lanes.map((lane) => lane.id))
  const bySessionId = new Map<string, string>()
  for (const lane of lanes) {
    const navigation = lane.navigation
    const sessionId =
      navigation === undefined ? undefined : navigation.type === 'session' ? navigation.value : navigation.value?.sessionId
    if (typeof sessionId === 'string' && sessionId !== '') bySessionId.set(sessionId, lane.id)
  }
  return (speakerId: string): string | null =>
    lanesById.has(speakerId) ? speakerId : bySessionId.get(speakerId) ?? null
}

/** See the TICKS table in the module doc. */
export function buildTicks(input: {  window: TimelineWindow
  msPerPx: number
  viewportWidth: number
  scrollLeft: number
  tickCount: number
  tzOffsetMinutes: number
  /**
   * Content px the axis should cover. Defaults to the data's own width; in FOLLOW mode
   * the caller passes the wider canvas so the gutter carries real clock ticks.
   */
  axisExtentPx?: number
}): { ticks: Tick[]; stepMs: number; truncated: boolean } {
  const { window: win, msPerPx, viewportWidth, scrollLeft, tzOffsetMinutes } = input
  const dataWidth = win.durationMs / Math.max(1e-9, msPerPx)
  const axisExtentPx = num(input.axisExtentPx, dataWidth)
  const tickCount = Math.max(1, Math.floor(positive(input.tickCount, DEFAULT_TICK_COUNT)))
  const targetStep = (msPerPx * Math.max(1, viewportWidth)) / tickCount
  const stepMs = pickTickStep(targetStep)
  const align = stepMs >= DAY_MS ? tzOffsetMinutes * MINUTE_MS : 0
  const first = Math.ceil((win.start - align) / stepMs) * stepMs + align
  const labelKind: TickKind = stepMs < DAY_MS ? 'time' : 'date'

  /**
   * Where the AXIS stops generating ticks.
   *
   * With a gutter, the axis is extended by the same amount of TIME the gutter
   * represents, so the strip reads as a continuation of the time axis rather than a
   * bare band with no ticks ("不能是一条没有任何刻度的空白带"). The gutter is future
   * time, so drawing its clock ticks is honest — the session simply has no events
   * there yet. `now` is not moved: `win.end` still IS `now`, which is why the tick
   * generator is given a separate extent instead of a modified window.
   */
  const axisEndTime = axisExtentPx > dataWidth ? win.start + axisExtentPx * msPerPx : win.end
  const ticks: Tick[] = []
  let truncated = false
  let time = first
  while (time <= axisEndTime) {
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
  /**
   * Guarantee the headroom is not a bare strip.
   *
   * Ticks align to the CLOCK, not to the window, so whether one falls in the gutter is
   * luck: measured at 380px the last tick sat at x=241 while the gutter ran 248..310 —
   * exactly the "一条没有任何刻度的空白带" the task rules out. Bounding the STEP cannot
   * fix that (a step no wider than the gutter still lands wherever the clock puts it),
   * so a single boundary tick is appended at the DATA EDGE instead. That x is the real
   * instant the headroom begins, it is as far from the right edge as the other labels,
   * and it makes the strip read as "time continues here" rather than "the axis stopped".
   */
  const gutterPx = axisExtentPx - dataWidth
  // Only when the headroom would otherwise be EMPTY: at some zooms a clock tick lands
  // in there on its own, and adding a second label 53px from it (measured) would just
  // be clutter. This is a floor on legibility, not a second labelling scheme.
  const gutterHasTick = ticks.some((tick) => tick.x >= dataWidth - 0.5)
  if (gutterPx > 0.5 && !gutterHasTick) {
    const boundaryTime = win.start + dataWidth * msPerPx
    const boundaryX = dataWidth
    const alreadyThere = ticks.some((tick) => Math.abs(tick.x - boundaryX) < 0.5)
    if (!alreadyThere && ticks.length < MAX_TICKS) {
      ticks.push({
        time: boundaryTime,
        x: boundaryX,
        viewX: boundaryX - scrollLeft,
        stepMs,
        labelKind,
        label: formatTickLabel(boundaryTime, labelKind, tzOffsetMinutes),
        major: false,
        visible: boundaryX - scrollLeft >= -1 && boundaryX - scrollLeft <= viewportWidth + 1,
      })
    }
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

  const win = computeWindow(data, now, options.windowSpanMs, options.anchorStartMs)
  const dataWidth = win.durationMs / msPerPx
  /**
   * In FOLLOW mode the canvas is wider than the data: the extra strip sits entirely to
   * the RIGHT of `now` (== `dataWidth`), which is what lets follow scroll to the end
   * without pinning `now` to the border. Scrolled fully right, `nowX - scrollLeft`
   * works out to `viewportWidth * (1 - FOLLOW_GUTTER_RATIO)` — i.e. 3/4 — because
   * `contentWidth - viewportWidth === dataWidth - viewportWidth*3/4`.
   *
   * Follow-off keeps this EXACTLY `dataWidth`, so nothing about the non-follow board
   * changes. `dataWidth` itself is never modified: it stays the data's own edge.
   */
  /**
   * The trailing headroom. Kept for ANCHORED windows too — deliberately.
   *
   * Dropping it for anchored windows was tried and measured, and it breaks the follow
   * cycle: with no gutter the snap target `nowX - viewportWidth * 3/4` is clamped up to
   * `maxScroll`, so the snap fires on EVERY tick (`scrollLeft` moved 21px per step,
   * seven steps in a row, and `nowViewX` stayed pinned at 247.6 of a 248px viewport).
   * The gutter is what leaves room for `now` to sit at 3/4 after a snap and then drift,
   * so it must stay.
   *
   * The cost with an anchored window is that `contentWidth - viewportWidth` grows on its
   * own, so one snap costs a page-step shift of what is on screen. See the option-A
   * report for why that is the accepted trade: the window cannot both reframe and hold
   * every on-screen pixel still.
   */
  const gutterPx = options.follow === true ? width * FOLLOW_GUTTER_RATIO : 0
  const contentWidth = dataWidth + gutterPx

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
    // The tick budget follows the AXIS, not just the visible strip: in follow mode the
    // canvas is a quarter wider than the viewport, and measuring the step against the
    // narrower viewport left the 62px gutter with no tick in it at all (measured: the
    // last tick sat at x=247 of a 310px canvas). With no gutter this is exactly `width`,
    // so the unfollowed board's ticks are unchanged.
    viewportWidth: Math.max(width, contentWidth),
    scrollLeft,
    axisExtentPx: contentWidth,
    tickCount: num(options.tickCount, DEFAULT_TICK_COUNT),
    tzOffsetMinutes,
  })

  /* --------------------------------------------------- message markers */

  /**
   * Speaker id (a SESSION id) -> lane id, derived from the payload's own lanes.
   *
   * Built here rather than required from the caller so direction is correct by
   * construction: lane ids match session ids for a teammate, and the lead's
   * session id comes from its `navigation`. This is what lets the density pass
   * below avoid starving one direction on a lane.
   */
  const lanesById = new Set(lanesInput.map((lane) => lane.id))
  const laneBySessionId = new Map<string, string>()
  for (const lane of lanesInput) {
    const navigation = lane.navigation
    const sessionId =
      navigation === undefined ? undefined : navigation.type === 'session' ? navigation.value : navigation.value?.sessionId
    if (typeof sessionId === 'string' && sessionId !== '') laneBySessionId.set(sessionId, lane.id)
  }
  const speakerToLane = (speakerId: string): string | null =>
    lanesById.has(speakerId) ? speakerId : laneBySessionId.get(speakerId) ?? null

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
    // decimation of the markers below can never shrink the reported span. It is
    // deliberately NOT range-scoped the way the markers are — "this lane was talking
    // from here to there, and it keeps talking past the edge of what you selected" is
    // exactly the fact the strip exists to carry, and its own tooltip names the true
    // endpoints. What it must never do is exist for a lane whose messages the window
    // does not touch AT ALL: `clamp` would collapse that to a 2px stub at x=0, i.e. a
    // phantom mark at the very start of the timeline (see the `inWindow` guard below).
    let firstTime = Number.POSITIVE_INFINITY
    let lastTime = Number.NEGATIVE_INFINITY
    for (const message of list) {
      const time = num(message?.time, Number.NaN)
      if (!Number.isFinite(time)) continue
      if (time < firstTime) firstTime = time
      if (time > lastTime) lastTime = time
    }
    if (Number.isFinite(firstTime) && Number.isFinite(lastTime) && inWindow(firstTime, lastTime, win)) {
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
        visible: rectVisible(viewX, w, width),
      }
      if (!cull || band.visible) messageBands.push(band)
    }

    /* ---- the markers ARE range-scoped; the band above is not ---------------- */
    //
    // THE BUG THIS REPLACES. Both this candidate list and the count behind the "+n"
    // badge used to be the lane's WHOLE message list. Because a marker's x is
    // `(clamp(time, win.start, win.end) - win.start) / msPerPx`, every message older
    // than the selected range was clamped onto the window's LEFT EDGE and drawn there.
    // Measured on a 4-lane / 3-hour fixture (180 messages per lane, 248px viewport):
    // 8 markers with a left edge of exactly 0 at the 15-minute range, against 0 of them
    // at `all`. `clamp` had turned "not in the range" into "at the start of the range",
    // which is a claim about a time at which nothing happened — the user's issue 1,
    // "当时间线不是选 all 的时候，在时间线最开头有莫名其妙标记".
    //
    // And `countCandidatesBetween` ran over that same whole list, so the badge counted
    // the omission of messages the reader had explicitly filtered OUT: on the same
    // fixture the badges read "+163" at 15m against "+6" at `all` — the user's issue 2,
    // "发送收取消息的 icon 多了很多 +n 的标记". A decimation count is only meaningful
    // about the set being decimated, and with a range selected that set is the range.
    //
    // Scoping the CANDIDATE LIST (rather than filtering the output) is what makes the
    // pixel budget honest too: `decimateMarkers` is handed `widthPx: dataWidth`, which
    // is the WINDOW's width, so in-range messages now spend the whole budget instead of
    // competing for it with messages that are off the axis entirely.
    const inRange = list.filter((message) => {
      const time = num(message?.time, Number.NaN)
      return Number.isFinite(time) && inWindow(time, time, win)
    })
    const kept = decimateMarkers(inRange, {
      windowStart: win.start,
      msPerPx,
      widthPx: dataWidth,
      mode: messageMode,
      gapPx,
      maxPerLane,
      laneId: lane.id,
      laneIdOf: speakerToLane,
    })
    // `kept.indices` is ascending already, and every candidate between two kept
    // indices was dropped — counted onto the marker that follows it, so the UI
    // can say "3 more here" instead of silently losing them. The count is taken over
    // `inRange`, so "3 more" means three more IN THE SELECTED RANGE.
    let previousCandidate = -1
    for (const keptIndex of kept.indices) {
      const message = inRange[keptIndex]
      if (message === undefined) continue
      const droppedBefore = countCandidatesBetween(inRange, previousCandidate, keptIndex, messageMode)
      previousCandidate = keptIndex
      const time = num(message.time, win.start)
      // In range by construction, so this clamp can no longer drag a marker onto the
      // window's edge; it is kept so a hostile payload cannot yield NaN.
      const x = (clamp(time, win.start, win.end) - win.start) / msPerPx
      const viewX = x - scrollLeft
      const rect: MessageMarkerRect = {
        laneId: lane.id,
        laneIndex: index,
        kind: message.kind,
        direction: resolveMessageDirection(message, lane.id, speakerToLane).direction,
        time,
        end: typeof message.end === 'number' && Number.isFinite(message.end) ? message.end : null,
        from: message.from,
        to: message.to,
        preview: message.preview,
        // LANE-QUALIFIED, always. One message is folded onto BOTH the sender's
        // and the recipient's lane and keeps its `messageId`, so a bare
        // `messageId` key occurred twice in this one array. React then logged
        // "Encountered two children with the same key" and reconciled the list
        // against a duplicate key, which left markers from an EARLIER layout
        // pass frozen on screen after a zoom (issue 2: "缩放后 icon 定在那里
        // 不动并叠加"). The lane is part of the identity here regardless, since
        // the same message paints and points differently per lane.
        key: `${lane.id}:${message.messageId ?? `${message.kind}:${time}:${keptIndex}`}`,
        messageIndex: keptIndex,
        droppedBefore,
        x,
        y: laneY + MESSAGE_MARKER_TOP,
        w: MESSAGE_MARKER_WIDTH,
        h: MESSAGE_MARKER_HEIGHT,
        viewX,
        visible: rectVisible(viewX, MESSAGE_MARKER_WIDTH, width),
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
  // A span that lies wholly outside the selected range is not drawn at all: clamping
  // would otherwise leave a `MIN_SPAN_PX` stub at the window's edge claiming activity.
  const intersects = inWindow(startRaw, endRaw, win)
  return {
    laneId,
    laneIndex,
    kind: isTurn ? 'turn' : 'step',
    open,
    start: startRaw,
    end: endRaw,
    x,
    y: laneY + (isTurn ? ACTIVITY_TRACK_TOP : ACTIVITY_TRACK_TOP + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2),
    w,
    h: isTurn ? TURN_BAND_HEIGHT : STEP_BAR_HEIGHT,
    viewX,
    visible: intersects && viewX + w >= 0 && viewX <= viewportWidth,
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
  /**
   * Whether this task is still elapsing, i.e. its duration is not yet a fact.
   *
   * `pending` counts: a task that was created and never claimed has no end either, and
   * the user's rule is "当任务未完成时候" — not completed, so it grows. Only a terminal
   * transition stops the box.
   */
  const stillRunning = task.status === 'pending' || task.status === 'in_progress'
  /** A box that is still growing must be shown as live, not as a measured interval. */
  let live = false
  // Unknown/live width: a HAIRLINE, never a readability width. See
  // {@link TASK_BAR_MIN_WIDTH}.
  let w = TASK_BAR_MIN_WIDTH
  if (history.length > 0) {
    anchor = 'history'
    historyIndex = 0
    // `history` is ascending, so [0] is the CREATION and the last entry is the
    // final transition (the completion, when the task completed). The bar spans
    // exactly those two instants.
    from = num(history[0]?.time, win.start)
    to = from
    for (const event of history) {
      const time = num(event.time, from)
      if (time > to) to = time
    }
    // AN UNFINISHED TASK KEEPS GROWING.
    //
    // Its duration is not known yet — it is still elapsing — so the box stretches from
    // its creation to `now` and keeps stretching on every render. The user's ask:
    // "当任务未完成时候，应该是跟随时间线不停拖动拉长任务框，这样才代表任务进行中". Drawing
    // it as a zero-length mark at the creation instant (what `max(history.time)` gave,
    // since the only event so far IS the creation) said "this lasted no time", which is
    // the opposite of what an open task means.
    //
    // `win.end` is `now` for a live window (see `computeWindow`), so this follows the
    // clock without this function reading a clock itself — the layout stays a pure
    // function of its inputs, and a frozen window never grows.
    if (stillRunning) {
      to = Math.max(to, win.end)
      live = true
    }
    const x0 = clamp(from, win.start, win.end)
    const x1 = clamp(to, win.start, win.end)
    x = (x0 - win.start) / msPerPx
    // THE BAR LENGTH IS THE DURATION — exactly, with no readability floor.
    //
    // The floor is now a single device pixel (`TASK_BAR_MIN_WIDTH`), so at a
    // coarse zoom a 1s task really is a hairline and a 1h task really is 3600x
    // wider. It previously reused `MIN_SPAN_PX` (2px), which meant a 1ms task
    // and a 1.9s task both drew 2px: the reader was told they were equal, and
    // the user reported it as "任务框的长度给了最少值…会有错觉" (issue 3).
    w = Math.max(TASK_BAR_MIN_WIDTH, (x1 - x0) / msPerPx)
  } else {
    // No dated history: the duration is UNKNOWN, so no duration box is drawn — only a
    // hairline mark pinned to `now`, which is the last moment this task is known to
    // exist. Drawing a long box here would be inventing a START, which is the one thing
    // this panel may never do (the stretching above is allowed to invent an END,
    // because "still open" is exactly the claim being made).
    x = Math.max(0, win.durationMs / msPerPx - TASK_MARKER_WIDTH)
    w = TASK_MARKER_WIDTH
  }
  const viewX = x - scrollLeft
  // Out of the selected range entirely => not drawn (see `inWindow`). `clippedLeft`
  // records the other case, where the task STARTED before the window and is genuinely
  // still running inside it, so the UI can say "continues from before" instead of
  // implying the task began at the window's edge.
  const intersects = inWindow(from, to, win)
  const clippedLeft = intersects && from < win.start
  /**
   * Where the label goes — and there are now only two answers, both INSIDE the box.
   *
   * The user, after seeing the outside caption on screen: "只在条内画，装不下就较少显示的
   * 文本". So the label is never placed beside the box any more; when the box is too narrow
   * for the whole subject the renderer truncates it with CSS ellipsis, and below
   * {@link TASK_LABEL_MIN_WIDTH} there is not even room for the ellipsis, so no label is
   * emitted at all (`'none'`, `labelW === 0`).
   *
   * HISTORY, because the deleted machinery was not stupid — it answered a different
   * question. The outside caption existed so that a short task could still be named: a
   * borderless 148px caption hung to the right of the box, flipped to the left when the
   * right side ran out, and clamped to whichever side had room. Two measured defects came
   * with it: a caption at the canvas edge reached 151px past it and inflated `scrollWidth`
   * from 248 to 399 (a phantom horizontal scroll that broke the follow toggle), and at a
   * coarse zoom all twelve captions were squeezed into the same 18.1px column holding
   * 45-71px of text. Constraining the width fixed the first and suppressing the unreadable
   * case (0.2.9) fixed the second, but the reader was still looking at task names outside
   * the box that measures the task — which is what this removes.
   *
   * The box, its `title` and its click target are untouched by all of it: the full subject
   * and the description stay reachable even when `labelW` is 0.
   */
  const labelPlacement = taskLabelPlacement(anchor, w)
  const labelX = x
  const labelW = labelPlacement === 'none' ? 0 : w
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
    // `h` stays the CARD box; the bar carries its own height, so "the bar became
    // a 36px blob again" is a red test rather than a silent regression.
    h: TASK_CARD_HEIGHT,
    barY: laneY + TASK_CARD_TOP + TASK_BAR_TOP_OFFSET,
    barH: TASK_BAR_HEIGHT,
    viewX,
    visible: intersects && viewX + w >= 0 && viewX <= viewportWidth,
    clippedLeft,
    live: live || anchor === 'live',
    labelPlacement,
    labelX: labelPlacement === 'inside' ? x : labelX,
    labelY: laneY + TASK_CARD_TOP,
    labelW: labelPlacement === 'inside' ? w : labelW,
    labelH: TASK_CARD_HEIGHT,
  }
}
