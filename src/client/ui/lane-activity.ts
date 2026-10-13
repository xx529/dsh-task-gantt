/**
 * What a lane head may SAY about the agent's current state.
 *
 * ── PART 1: what text does our data actually have? ───────────────────────────
 * Checked at the source, not assumed:
 *
 *   - `src/host/timeline.ts` → `turnSpansFrom()` builds a turn span as
 *     `{ kind: 'turn', time, end, from, sessionId }` and, when the log carries a turn
 *     number, `messageId = 'turn:<session>:<n>'`. There is NO summary, no tool name and
 *     no activity text on a turn span.
 *   - `src/client/ui/timeline-layout.ts` → `SpanRect` carries only
 *     `kind`, `turn?`, `step?`, `open`, times and geometry.
 *   - The wire type `MessageSpan` has a `preview`, but the host sets it for
 *     `kind: 'message'` and `user-prompt` records only — a `turn` never gets one.
 *   - A real fixture lane's raw turn span, verbatim:
 *     `{"kind":"turn","start":1791876765021,"end":1791877485021}`
 *
 * So there is NO activity description to show. The honest status text is the state
 * word itself, which is why this returns a status word rather than inventing a
 * sentence like "正在分析请求". If a description is wanted later, the host must start
 * carrying one — it cannot be recovered on the client.
 *
 * ── WHY ONLY WORKING LANES GET TEXT ─────────────────────────────────────────
 * The user deleted 「空闲」 one round ago as redundant ("「空闲」这个状态文本我觉得没必要了"),
 * so re-adding it would undo an explicit decision. Text appears only where it adds
 * information: the agent is doing something right now. Idle lanes keep the static glyph
 * and no word.
 *
 * Kept in its own module (like `task-times.ts`) so the rule is unit-testable without
 * pulling React and the renderer into the test graph.
 */
import type { ActivitySpan, LaneLiveActivity, MemberStatus, TimelineLane } from '../../shared/contract.ts'
import type { UiMessageKey } from './labels.ts'

/**
 * Short words for the narrow head column, keyed for `labels.ts` so both locales stay in
 * one place. Deliberately 2-4 characters: the meta column has ~108px total and the counts
 * already take ~62px, so the word's budget is ~45px.
 *
 * These track the wording of the built-in `dsh-client-ui-chat` dictionary (which is where
 * the user's `正在分析请求` comes from) but are shortened for the column.
 */
const ACTIVITY_LABEL_KEY: Record<LaneLiveActivity['kind'], UiMessageKey> = {
  thinking: 'laneActThinking',
  read: 'laneActRead',
  readImage: 'laneActRead',
  search: 'laneActSearch',
  write: 'laneActWrite',
  edit: 'laneActEdit',
  commands: 'laneActCommands',
  code: 'laneActCode',
  webSearch: 'laneActWebSearch',
  webFetch: 'laneActWebFetch',
  subagents: 'laneActSubagents',
  plan: 'laneActPlan',
  questions: 'laneActQuestions',
  tools: 'laneActTools',
}

/**
 * Full phrasing for the tooltip, keyed by the SHORT word's key.
 *
 * The user's reference row reads `正在分析请求`; the head column is too narrow to print that
 * (it is ~78px against a ~45px budget), so the short word goes in the row and the full
 * sentence goes in the tooltip — which is where the host's `detail` is appended too.
 */
const ACTIVITY_FULL_KEY: Record<string, UiMessageKey> = {
  laneActThinking: 'laneActThinkingFull',
  laneActRead: 'laneActReadFull',
  laneActSearch: 'laneActSearchFull',
  laneActWrite: 'laneActWriteFull',
  laneActEdit: 'laneActEditFull',
  laneActCommands: 'laneActCommandsFull',
  laneActCode: 'laneActCodeFull',
  laneActWebSearch: 'laneActWebSearchFull',
  laneActWebFetch: 'laneActWebFetchFull',
  laneActSubagents: 'laneActSubagentsFull',
  laneActPlan: 'laneActPlanFull',
  laneActQuestions: 'laneActQuestionsFull',
  laneActTools: 'laneActToolsFull',
  laneRunning: 'laneWorking',
  laneProvisioning: 'laneProvisioning',
}

/**
 * The tooltip for a lane's word: the FULL phrase's label key, plus the host's `detail`.
 *
 * Returned as a KEY rather than a finished string so `labels.ts` stays the one place the
 * wording lives (and both locales are covered by the parity test). The caller joins them
 * as `full` or `full：detail`.
 *
 * `detail` is truncated by the HOST at 160 chars and again here (`ACTIVITY_DETAIL_MAX`), so
 * a pathological payload cannot produce a title long enough to matter.
 *
 * @param activity - the result of {@link laneActivity}.
 * @returns the full-phrase key (or `null` when the lane gets no word) and the detail.
 */
export function activityTooltip(activity: LaneActivity): { fullKey: UiMessageKey; detail: string | null } | null {
  /**
   * No word in the row ⇒ no word in the title. This is the same gate as the row itself
   * (`statusKey` is only non-null for a lane that is genuinely working), so an idle lane
   * does not get a `正在分析请求` tooltip either — which was the second half of the user's
   * complaint.
   */
  if (activity.statusKey === null || activity.tooltipKey === null) return null
  const full = ACTIVITY_FULL_KEY[activity.tooltipKey]
  return { fullKey: full ?? activity.tooltipKey, detail: activity.tooltipDetail }
}

/** Longest detail shown in a tooltip; the host truncates too, this bounds the title. */
export const ACTIVITY_DETAIL_MAX = 160

/** The status word to show, or `null` when the lane gets no text. */
export interface LaneActivity {
  /** `true` for a lane whose agent is working right now. */
  working: boolean
  /**
   * BCP-47-independent label KEY for the caller to translate, or `null` for no text.
   * A key rather than a finished string, so `labels.ts` stays the single source of the
   * wording and both locales are covered by the parity test.
   */
  statusKey: UiMessageKey | null
  /** Which signal decided it — reported so the choice is auditable, not implicit. */
  reason: 'activity' | 'status' | 'open-turn' | 'none'
  /** Tooltip body: the full wording, plus the host's `detail` when it has one. */
  tooltipKey: UiMessageKey | null
  /** Host detail verbatim (truncated by the caller), or `null`. */
  tooltipDetail: string | null
}

/**
 * The label key for a lane's head word.
 *
 * THE FALLBACK CHAIN, in order (and why):
 *   1. `lane.activity` PRESENT → its short word. This is the richest signal and the one the
 *      user asked for (`正在分析请求`).
 *   2. absent, but `laneActivity`-style working → `运行中` / `启动中`. Keeps a word on screen
 *      against an older host that does not send `activity` yet.
 *   3. idle → NO word. An idle lane has nothing to say; the user deleted 「空闲」 for exactly
 *      that reason.
 *
 * The `unassigned` bucket and any lane without a status get the same treatment as everyone
 * else: this function has no special cases, so the filter and the head cannot diverge.
 */
function activityFields(lane: TimelineLane): Pick<LaneActivity, 'statusKey' | 'tooltipKey' | 'tooltipDetail'> {
  const descriptor: LaneLiveActivity | null | undefined = lane.activity
  if (descriptor !== undefined && descriptor !== null && typeof descriptor.kind === 'string') {
    const key = ACTIVITY_LABEL_KEY[descriptor.kind]
    if (key !== undefined) {
      const detail = typeof descriptor.detail === 'string' ? descriptor.detail : ''
      return {
        statusKey: key,
        tooltipKey: key,
        tooltipDetail: detail === '' ? null : detail.slice(0, ACTIVITY_DETAIL_MAX),
      }
    }
  }
  return { statusKey: null, tooltipKey: null, tooltipDetail: null }
}

/**
 * Statuses that mean the agent is doing something, and how to say them.
 *
 * `failed` is deliberately excluded: a failed lane is not working, and the spinner was
 * never shown for it. `idle` gets no text at all (see the note above).
 */
const WORKING_STATUS_KEY: Partial<Record<MemberStatus, 'laneWorking' | 'laneProvisioning'>> = {
  running: 'laneWorking',
  provisioning: 'laneProvisioning',
}

/**
 * @param lane - the lane to describe.
 * @returns the working flag, the label key for its status word, and which signal fired.
 */
export function laneActivity(lane: TimelineLane): LaneActivity {
  /**
   * ── THE GATE: IS THE LANE ACTUALLY WORKING? ────────────────────────────────
   *
   * This is decided FIRST and independently of any word, because `lane.activity` is NOT
   * evidence of work. The host clears the descriptor to `thinking` for lanes that merely
   * HAVE an agent, and its own contract says so:
   *
   *   > `thinking` is only rendered for a lane already shown as active (otherwise an idle
   *   > agent would be captioned "正在分析请求")
   *
   * Shipping without that gate produced exactly the user's screenshot: all nine lanes,
   * including the plainly idle ones (`packaging` / `shell` / `verify` / `docs`), shown as
   * `thinking`. The rule is: the word ADORNS a working lane; it never makes one working.
   *
   * Same predicate as the spinner, so the two can never disagree.
   */
  const openTurn = (lane.spans ?? []).some(isOpenTurn)
  const statusWorking = lane.status === undefined ? undefined : WORKING_STATUS_KEY[lane.status]
  /**
   * An EXPLICIT status is final, in both directions: `idle` / `failed` mean not working
   * (and are not overridden by a stale open span), `running` / `provisioning` mean working
   * even with no spans at all. Only a MISSING status falls through to the spans.
   */
  const working = statusWorking !== undefined ? true : lane.status !== undefined ? false : openTurn

  if (!working) {
    return { working: false, statusKey: null, reason: 'none', tooltipKey: null, tooltipDetail: null }
  }

  /**
   * WORKING. Which word?
   *   1. The host's descriptor, when it sent one — it is the only signal that can say WHAT
   *      the agent is doing, not merely that it is busy.
   *   2. Otherwise `运行中` / `启动中`, so an older host still gets a word.
   */
  const fields = activityFields(lane)
  if (fields.statusKey !== null) {
    return { working: true, ...fields, reason: 'activity' }
  }
  const statusKey = statusWorking ?? 'laneWorking'
  return { working: true, statusKey, reason: statusWorking === undefined ? 'open-turn' : 'status', tooltipKey: statusKey, tooltipDetail: null }
}

/**
 * Is this span an unclosed turn?
 *
 * Tolerant of the two shapes that reach the client: the layout's richer `SpanRect` (with
 * `open`) and the wire `MessageSpan` (with `end: null`). Malformed entries are ignored
 * rather than thrown on, because partial payloads are in contract.
 *
 * @param span - candidate span from either side of the boundary.
 */
function isOpenTurn(span: ActivitySpan | { kind?: string; end?: number | null; open?: boolean }): boolean {
  if (span === null || typeof span !== 'object') return false
  if (span.kind !== 'turn') return false
  // `open` exists only on the layout's richer SpanRect, and it is authoritative when
  // present; the wire shape marks an open span with `end: null`.
  if ('open' in span && span.open === true) return true
  return span.end === null
}
