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
import type { ActivitySpan, MemberStatus, TimelineLane } from '../../shared/contract.ts'

/** The status word to show, or `null` when the lane gets no text. */
export interface LaneActivity {
  /** `true` for a lane whose agent is working right now. */
  working: boolean
  /**
   * BCP-47-independent label KEY for the caller to translate, or `null` for no text.
   * A key rather than a finished string, so `labels.ts` stays the single source of the
   * wording and both locales are covered by the parity test.
   */
  statusKey: 'laneWorking' | 'laneProvisioning' | null
  /** Which signal decided it — reported so the choice is auditable, not implicit. */
  reason: 'status' | 'open-turn' | 'none'
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
  const statusKey = lane.status === undefined ? undefined : WORKING_STATUS_KEY[lane.status]
  if (statusKey !== undefined) return { working: true, statusKey, reason: 'status' }
  /**
   * An EXPLICIT non-working status is final. `idle` / `failed` mean the agent is not
   * working, and that must not be overridden by the span fallback below — otherwise a
   * frozen session that left one span open would show a spinner forever. Only a MISSING
   * status falls through to the spans.
   */
  if (lane.status !== undefined) return { working: false, statusKey: null, reason: 'none' }
  /**
   * FALLBACK, used only when `lane.status` is ABSENT — not an override.
   *
   * An open (unclosed) turn span is evidence of work when the payload tells us nothing
   * else. It deliberately does not fire for a lane that explicitly says `idle`: the
   * reported status is the operator's own answer, and overriding it would leave a frozen
   * session looking permanently busy. `end === null` is the contract's "not finished"
   * mark; the layout's `open: true` is accepted too.
   */
  const openTurn = (lane.spans ?? []).some(isOpenTurn)
  if (openTurn) return { working: true, statusKey: 'laneWorking', reason: 'open-turn' }
  return { working: false, statusKey: null, reason: 'none' }
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
