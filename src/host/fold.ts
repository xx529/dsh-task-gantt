/**
 * PURE event folding for the host half of dsh-task-gantt.
 *
 * ============================ CONTRACT (for tests) ==========================
 *
 * This module performs NO I/O and imports nothing but the frozen shared types.
 * Every function is deterministic and total: no input can make it throw.
 *
 * ## Input
 *
 * `RawSessionEvent` is one event exactly as the host hands it over — from
 * `Session.snapshotEvents()` (live session) or `handle.read().events` (durable
 * session), both of which are `{ type, seq, time, data }`:
 *
 * ```ts
 * { type: 'step/start', seq: 7, time: 1791648140880, data: { turn: 1, step: 1 } }
 * ```
 *
 * Every field is typed `unknown` on purpose: the fold defends itself against
 * foreign/newer logs. Missing or non-numeric `time` never throws and never
 * produces an invented timestamp — such an event is simply not placeable on a
 * timeline (it is counted in `diagnostics.undated`).
 *
 * One exception to the envelope: the **first** event of a log is its header,
 * stored flat rather than under `data` —
 * `{ type: 'session', version: 4, id, createdAt, cwd, parentSession?, … }`.
 * Both spellings are accepted; the header is where `sessionCreatedAt` and the
 * upward `parentSession` link come from.
 *
 * ## Output — four orthogonal folds
 *
 * 1. `foldActivitySpans(events)` → the lane's activity bands.
 *    - `turn/start` … `turn/end`        ⇒ one `{ kind: 'turn' }` span
 *    - `step/start` … `step/end`        ⇒ one `{ kind: 'step' }` span
 *    - **Tolerance rules (all verified against real logs):**
 *      * an unclosed `step/start` or `turn/start` stays open ⇒ `end: null`;
 *      * an unpaired `step/end` / `turn/end` creates NO span (it is counted in
 *        `diagnostics.orphanCloses`) — a close with no open can never invent a
 *        zero/negative-length span;
 *      * a second `step/start` while one is open closes the first at the new
 *        start ⇒ the span's length may be 0 but is never negative;
 *      * every emitted `end` is clamped by `Math.max(start, closeTime)`;
 *      * equal `time` values are ordered by `seq` (then by original index), so
 *        the result is stable for any input permutation;
 *      * spans come back ascending by `(start, kind, index)` with `'turn'`
 *        before `'step'` at the same instant (the faint band is painted under
 *        the solid bar).
 *
 * 2. `foldTeamEvents(events, sessionId)` → the durable Team journal of ONE log.
 *    The `team/task` / `team/member` / `subagent/catalog` events all live in the
 *    **Lead's** session log (see docs/FINDINGS-host.md §4). The fold returns:
 *    - `taskById`: latest snapshot per task + dated transitions;
 *    - `memberById`: latest durable phase per member + phase history;
 *    - `sessionCreatedAt` / `sessionParentId` from the `session` header event.
 *    The `action` of a transition is DERIVED (the event carries no `action`):
 *    first snapshot at `revision === 1` ⇒ `created`; then by status delta:
 *    `→ completed` ⇒ `completed`, `completed →` ⇒ `reopened`,
 *    `→ in_progress` ⇒ `claimed`, anything else ⇒ `updated`. A snapshot whose
 *    `revision` is not strictly greater than the previous one is skipped (a
 *    duplicated/corrupt tail can never rewind the history).
 *
 * 3. `foldToolCallTransitions(events, sessionId)` → dated `team_task_*` tool
 *    calls, the brief §3.4 level-2 source and the exact actor index:
 *    `team_task_update` carries `task_id` + `expected_revision` (a CAS
 *    precondition ⇒ it uniquely identifies the revision that consumed it).
 *
 * 4. `foldMessageRecords(events)` → message-carrying records: who told whom
 *    what, when (see the section header at `1b` for the exact pairing rules).
 *    Only three event types are read — `team/message/queued`,
 *    `team/message/delivered`, and the human's own `user/message` — and a
 *    delivery is paired to its queue by `messageId`, never by adjacency.
 *
 * `foldSessionEvents(events, sessionId)` runs all four over one log.
 *
 * ## Ordering guarantees
 *
 * - `spans`: ascending by `(start, kind, index)`.
 * - `transitions` / `toolCalls`: ascending by `(time, seq, index)`.
 * - `messages.records`: ascending by `(queuedAt ?? deliveredAt, seq)`.
 * - `messages.userPrompts`: ascending by `(time, seq)`.
 * - `members`: first-appearance order in the log.
 * - `members[i].phases`: log order.
 *
 * ============================================================================
 */
import { WAIT_TOOL_NAME } from '../shared/contract.ts'
import type {
  ActivitySpan,
  LaneLiveActivity,
  LaneLiveActivityKind,
  LaneWait,
  MemberPhase,
  QuestionDetail,
  QuestionItem,
  QuestionOption,
  SubagentDispatch,
  TaskEvent,
  TaskStatus,
} from '../shared/contract.ts'

export { WAIT_TOOL_NAME }

/**
 * One raw session-log event; every field is untrusted.
 *
 * The index signature is deliberate: every *other* event nests its payload
 * under `data`, but the log's FIRST event is its **header, stored flat** —
 * `{"type":"session","version":4,"id":…,"createdAt":…,"cwd":…,"parentSession":…}`.
 * A narrower type could not express a real log line without a cast, so the
 * extra top-level fields are typed `unknown` like everything else here.
 */
export interface RawSessionEvent {
  readonly type?: unknown
  readonly seq?: unknown
  readonly time?: unknown
  readonly data?: unknown
  /** Flat header fields (`version` / `id` / `createdAt` / `cwd` / `parentSession`). */
  readonly [key: string]: unknown
}

/** Non-fatal observations about one fold; never an error channel. */
export interface FoldDiagnostics {
  /** Events handed in. */
  events: number
  /** Events whose `type` was not a usable string. */
  malformed: number
  /** Events dropped because `time` was missing / not a finite number. */
  undated: number
  /** `turn/end` / `step/end` events with no matching open when they were seen. */
  orphanCloses: number
  /** Spans still open when the log ended (`end: null`). */
  openSpans: number
  /** `team/task` snapshots skipped for a non-increasing `revision`. */
  rewoundTransitions: number
}

/** Result of folding one session's activity. */
export interface FoldedActivity {
  /** Ascending spans; a span is open iff `end === null`. */
  spans: ActivitySpan[]
  diagnostics: FoldDiagnostics
}

/** The durable snapshot carried by one `team/task` event. */
export interface TeamTaskSnapshot {
  id: string
  revision: number
  subject: string
  description: string
  status: TaskStatus
  blockedBy: string[]
  writeScopes: string[]
  /** Present once the task is claimed / reassigned. */
  ownerId?: string
}

/** One board task as its own log tells it. */
export interface FoldedTeamTask {
  id: string
  /** Latest accepted snapshot. */
  snapshot: TeamTaskSnapshot
  /** Time of the first accepted snapshot (revision 1 in a healthy log). */
  createdAt: number
  /** Ascending dated transitions; `sessionId` is the log that carried them. */
  transitions: TaskEvent[]
}

/** One roster member as the durable `team/member` journal tells it. */
export interface FoldedTeamMember {
  id: string
  name: string
  /**
   * Latest durable phase.
   *
   * OPTIONAL, and absent for a `subagent/catalog` row. That is deliberate: a
   * catalog row records that a child session was CREATED, not that its member is
   * provisioning, and a hard-coded `'provisioning'` here used to pin every
   * sub-agent lane's status to `provisioning` for the rest of the session — the
   * permanent spinner the user reported. No evidence, no phase.
   */
  phase?: MemberPhase
  /**
   * True when {@link name} is only the child session id, i.e. no better name was
   * found in THIS log's `subagent/catalog` label or in the dispatching
   * `tool/call`. A caller that can also read the child's own log may upgrade it
   * (see the `session/title` fallback).
   */
  nameIsFallback?: boolean
  description?: string
  error?: string
  /** Time of the earliest event that introduced this member. */
  firstSeenAt: number
  /** Time of the latest event that updated this member. */
  lastSeenAt: number
  /** Phase transitions in log order (provisioning → active → …). */
  phases: { phase: MemberPhase; time: number }[]
  /** `childCreatedAt` from `subagent/catalog`, when the log has one. */
  childCreatedAt?: number
}

/** The whole durable Team journal of one session log. */
export interface FoldedTeam {
  /** Session header id, when the log carries a `session` event. */
  sessionId?: string
  /** Session header `createdAt` (a real field of the log, not invented). */
  sessionCreatedAt?: number
  /** Session header `parentSession` — the upward link to the team root. */
  sessionParentId?: string
  /**
   * The session's own title, from `session/title` — but ONLY when DSH produced a
   * real one. A `source.kind === 'fallback'` title is the first line of the
   * prompt, so all five mapper sub-agents in the real `HtDot` run carried the
   * same `"You are a codebase mapper"` and using it would rename five lanes to
   * one string. Absent is better than useless.
   */
  sessionTitle?: string
  /** Tasks in first-appearance order. */
  tasks: FoldedTeamTask[]
  taskById: Map<string, FoldedTeamTask>
  /** Members in first-appearance order (the Lead is not a `team/member` row). */
  members: FoldedTeamMember[]
  memberById: Map<string, FoldedTeamMember>
  /** Member name → session id. */
  memberIdByName: Map<string, string>
  diagnostics: FoldDiagnostics
}

/** One dated `team_task_*` tool call observed in some session's log. */
export interface ToolCallTransition {
  /** Raw tool name (`team_task_create` / `team_task_update`). */
  tool: string
  action: TaskEvent['action']
  /** Epoch ms of the `tool/call` event. */
  time: number
  /** The session whose log carries the call (i.e. who performed it). */
  sessionId: string
  /** `task_id` of a `team_task_update`; absent for `team_task_create`. */
  taskId?: string
  /** `expected_revision` — the revision this call consumed (CAS proof). */
  expectedRevision?: number
  /** `subject` of a `team_task_create`, used for best-effort attribution. */
  subject?: string
  /** The `seq` of the source event, for stable ordering. */
  seq: number
}

/** All folds of one session log. */
export interface FoldedSession {
  sessionId: string
  activity: FoldedActivity
  team: FoldedTeam
  toolCalls: ToolCallTransition[]
  /** Message exchanges + the human's prompts carried by this log. */
  messages: FoldedMessages
  /**
   * `wait_agent` blocks carried by this log: the time this agent spent blocked on its
   * peers rather than working. A fifth orthogonal fold, for the same reason the other
   * four are separate — a wait is not activity, not a task transition and not a message.
   */
  waits: LaneWait[]
  /** Every question this session put to a human, in log order. */
  questions: QuestionRecord[]
  /**
   * What this lane's agent is doing RIGHT NOW.
   *
   * A sixth orthogonal fold, and the only one that is not about the past: everything
   * else describes what happened, this describes what is happening. See
   * {@link foldLaneLiveActivity} for the rule and {@link LaneLiveActivity} for the two things
   * it deliberately cannot report.
   */
  laneActivity: LaneLiveActivity
}

/** A status value the board can publish. */
const TASK_STATUSES: readonly TaskStatus[] = ['pending', 'in_progress', 'completed', 'deleted']
/** A durable roster phase the journal can publish. */
const MEMBER_PHASES: readonly MemberPhase[] = ['provisioning', 'active', 'failed']
/**
 * The `team_task_update` action → contract action mapping.
 * Source: `@deepseek-ai/dsh-experimental-tool-agent-team/lib/index.js` L459-519
 * (`action` enum) and `.../dsh-experimental-agent-team/lib/types/task-board.js`
 * L107-175 (the status each action commits).
 */
const UPDATE_ACTION_MAP: Readonly<Record<string, TaskEvent['action']>> = {
  claim: 'claimed',
  complete: 'completed',
  reopen: 'reopened',
  release: 'updated',
  edit: 'updated',
  set_dependencies: 'updated',
  reassign: 'updated',
  delete: 'updated',
}

// --------------------------------------------------------------------------
// Untrusted-value readers — every one is total.
// --------------------------------------------------------------------------

/** A finite number, or `undefined`. */
function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** A positive integer, or `undefined`. */
function asPositiveInt(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : undefined
}

/** A non-empty string (trimmed), or `undefined`. */
function asText(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const text = value.trim()
  return text === '' ? undefined : text
}

/** A plain record, or `undefined`. */
function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined
}

/** An array of non-empty strings (order kept, duplicates kept). */
function asTextArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const text = asText(item)
    if (text !== undefined) out.push(text)
  }
  return out
}

/** One event with its normalised, total place in the log. */
interface IndexedEvent {
  /** The caller's raw element — `unknown`, because that is what it really is. */
  event: unknown
  /** Position in the caller's array (final tie-break ⇒ determinism). */
  index: number
  /** `seq` when usable, else `index` (so every event is orderable). */
  seq: number
  /** `time` when usable, else `undefined` (never invented). */
  time: number | undefined
}

/** Normalise every event once. */
function indexEvents(events: readonly unknown[]): IndexedEvent[] {
  return events.map((event, index) => {
    const raw = asRecord(event)
    const seq = raw === undefined ? undefined : asFiniteNumber(raw.seq)
    const time = raw === undefined ? undefined : asFiniteNumber(raw.time)
    return { event, index, seq: seq === undefined ? index : seq, time }
  })
}

/** Ascending by `(seq, index)` — the log's own order. */
function inLogOrder(indexed: readonly IndexedEvent[]): IndexedEvent[] {
  return [...indexed].sort((a, b) => (a.seq - b.seq) || (a.index - b.index))
}

/** Ascending by `(time, seq, index)`; undated events are excluded. */
function inTimeOrder(indexed: readonly IndexedEvent[]): IndexedEvent[] {
  return indexed
    .filter((item): item is IndexedEvent & { time: number } => item.time !== undefined)
    .sort((a, b) => (a.time - b.time) || (a.seq - b.seq) || (a.index - b.index))
}

/** Count events that carry a usable `time`. */
function countUndated(indexed: readonly IndexedEvent[]): number {
  let undated = 0
  for (const item of indexed) if (item.time === undefined) undated += 1
  return undated
}

/** Count events whose `type` is not a usable string. */
function countMalformed(indexed: readonly IndexedEvent[]): number {
  let malformed = 0
  for (const item of indexed) {
    const raw = asRecord(item.event)
    if (raw === undefined || typeof raw.type !== 'string' || raw.type === '') malformed += 1
  }
  return malformed
}

/** The `type` of an event, or `undefined`. */
function eventType(item: IndexedEvent): string | undefined {
  const raw = asRecord(item.event)
  return raw === undefined ? undefined : asText(raw.type)
}

/** The `data` record of an event, or `undefined`. */
function eventData(item: IndexedEvent): Record<string, unknown> | undefined {
  const raw = asRecord(item.event)
  return raw === undefined ? undefined : asRecord(raw.data)
}

/** A fresh zeroed diagnostics record. */
function emptyDiagnostics(events: number): FoldDiagnostics {
  return {
    events,
    malformed: 0,
    undated: 0,
    orphanCloses: 0,
    openSpans: 0,
    rewoundTransitions: 0,
  }
}

// --------------------------------------------------------------------------
// 1. Activity spans
// --------------------------------------------------------------------------

/** A span being accumulated, before its `end` is known. */
interface OpenSpan {
  kind: 'turn' | 'step'
  start: number
  index: number
  turn?: number
  step?: number
}

/** Turn a span into its emitted form, clamping the close to a non-negative length. */
function close(span: OpenSpan, end: number | null): ActivitySpan {
  const emitted: ActivitySpan = {
    kind: span.kind,
    start: span.start,
    end: end === null ? null : Math.max(span.start, end),
  }
  if (span.turn !== undefined) emitted.turn = span.turn
  if (span.step !== undefined) emitted.step = span.step
  return emitted
}

/**
 * Fold one session log into ascending activity spans.
 *
 * Total: tolerates missing pairs, out-of-order input, duplicate and missing
 * `time`, and malformed payloads. See the module header for the exact rules.
 *
 * @param events - raw events of ONE session (any order, any shape).
 * @returns ascending spans plus non-fatal diagnostics.
 */
export function foldActivitySpans(events: readonly unknown[]): FoldedActivity {
  const indexed = indexEvents(events)
  const diagnostics = emptyDiagnostics(events.length)
  diagnostics.malformed = countMalformed(indexed)
  diagnostics.undated = countUndated(indexed)

  const ordered = inTimeOrder(indexed)
  const spans: ActivitySpan[] = []
  let openStep: OpenSpan | undefined
  let openTurn: OpenSpan | undefined

  /** Emit `pending` with the given close (or keep it open / drop it). */
  const settle = (pending: OpenSpan | undefined, end: number | null): void => {
    if (pending === undefined) return
    spans.push(close(pending, end))
    if (end === null) diagnostics.openSpans += 1
  }

  for (const item of ordered) {
    const type = eventType(item)
    const time = item.time
    if (type === undefined || time === undefined) continue
    const data = eventData(item)
    const turn = data === undefined ? undefined : asPositiveInt(data.turn)
    const step = data === undefined ? undefined : asPositiveInt(data.step)

    switch (type) {
      case 'step/start': {
        // A second start closes the previous step at the new start: length 0 at
        // worst, never negative.
        settle(openStep, time)
        openStep = { kind: 'step', start: time, index: item.index, turn, step }
        break
      }
      case 'step/end': {
        if (openStep === undefined) {
          // An orphan close proves nothing about a start; never fabricate one.
          diagnostics.orphanCloses += 1
        } else {
          settle(openStep, time)
          openStep = undefined
        }
        break
      }
      case 'turn/start': {
        settle(openTurn, time)
        openTurn = { kind: 'turn', start: time, index: item.index, turn }
        break
      }
      case 'turn/end': {
        if (openTurn === undefined) {
          diagnostics.orphanCloses += 1
        } else {
          settle(openTurn, time)
          openTurn = undefined
        }
        break
      }
      default:
        break
    }
  }

  // Anything still open at the end of the log is genuinely still open.
  settle(openStep, null)
  settle(openTurn, null)

  const kindRank = (span: ActivitySpan): number => (span.kind === 'turn' ? 0 : 1)
  spans.sort((a, b) => (a.start - b.start) || (kindRank(a) - kindRank(b)))
  return { spans, diagnostics }
}

// --------------------------------------------------------------------------
// 1b. Message-carrying records (who told whom what, at what instant)
// --------------------------------------------------------------------------

/**
 * The `source.kind` that marks a `user/message` as typed by the human.
 *
 * Verified on this machine against the real logs (see docs/FINDINGS-host.md
 * §14): every `user/message` in the run — 80 in the Lead's log, 17 in a
 * teammate's — carries `data.source.kind`, and only a minority are the human:
 * the rest are the runtime feeding the model (`time-context`, `tool-jobs`,
 * `subagent-settled`, `team-message`, `runtime-context`, `agent-instructions`,
 * `schedule`). Treating every `user/message` as the user would put 69 invented
 * "prompts" on the chart, so the kind is the discriminator, not the event type.
 */
const USER_SOURCE_KIND = 'user'

/**
 * The longest body this module emits, mirroring `MESSAGE_PREVIEW_MAX`.
 *
 * Duplicated as a literal on purpose: `fold.ts` is the pure-data layer and must
 * not gain a dependency on the wire contract just to read one number. The
 * `dev-verify` self-check asserts the two stay equal.
 *
 * ## Why this is no longer 140
 *
 * The field used to be a *preview*: 140 characters were enough to tell two
 * messages apart in a one-line marker. The panel now shows the whole message
 * when a marker is clicked, so this is a **defensive body cap**, not a display
 * budget. Measured over every real `team/message/queued` on this machine (360
 * exchanges, whitespace-collapsed exactly as {@link previewOf} does):
 *
 * ```
 * min 110 · median 1790 · max 8003 · over 140: 358 / 360
 * ```
 *
 * At 140 the panel therefore held the opening line of essentially every
 * message. 16384 clears the observed maximum by ~2x while still refusing an
 * adversarial payload (a runaway log line cannot hand the panel a megabyte).
 */
const PREVIEW_MAX = 16384

/** One `team/message/*` exchange as the durable journal records it. */
export interface FoldedMessageRecord {
  /** The journal's message id — what ties a queue to its delivery. */
  messageId: string
  /**
   * Epoch ms of the `queued` event: when the sender handed the message over.
   * `undefined` only for a delivery with no queue in the readable window.
   */
  queuedAt?: number
  /** Epoch ms of the `delivered` event, when one was read. */
  deliveredAt?: number
  /** `senderId` from the `queued` event. Absent when only a delivery was read. */
  senderId?: string
  /** `senderName` from the `queued` event (display only). */
  senderName?: string
  /** `targetId`; every observed delivery also carries it. */
  targetId?: string
  /** Collapsed `content[].text`, clipped to {@link PREVIEW_MAX}. */
  preview?: string
  /**
   * True when {@link PREVIEW_MAX} clipped this body — i.e. `preview` is the head
   * of a longer message and the tail is gone.
   */
  truncated?: boolean
  /** Log `seq` of the record that opened this exchange (stable ordering). */
  seq: number
}

/** One human prompt read from `user/message`. */
export interface FoldedUserPrompt {
  /** Epoch ms of the event. */
  time: number
  /** Log `seq`, for stable ordering against the other records. */
  seq: number
  /** Clipped prompt text. */
  preview?: string
  /**
   * `data.source.kind` — always {@link USER_SOURCE_KIND} today, kept so the
   * caller can prove the discriminator rather than trust it.
   */
  sourceKind: string
}

/** What one message fold observed, for the response-level `notes`. */
export interface MessageFoldDiagnostics {
  /** `team/message/queued` events read. */
  queued: number
  /** `team/message/delivered` events read. */
  delivered: number
  /**
   * Deliveries with no readable queue. Their sender is unknown, so the emitted
   * span carries no `from`; this counter is what makes that visible.
   */
  unpairedDeliveries: number
  /** `user/message` events whose `source.kind` marked them as the human's. */
  userPrompts: number
  /** `user/message` events that were runtime injections, not the human. */
  injectedUserMessages: number
  /**
   * Message bodies that exceeded {@link PREVIEW_MAX} and were clipped.
   *
   * Present so a truncation is never silent: the reader of a panel that shows
   * "the whole message" must be able to tell that the tail was dropped.
   * Measured zero on all 360 real exchanges (max 8003 < 16384).
   */
  truncatedBodies: number
}

/** The message fold of one session log. */
export interface FoldedMessages {
  /** Ascending by `(queuedAt ?? deliveredAt, seq)`. */
  records: FoldedMessageRecord[]
  /** Ascending human prompts. */
  userPrompts: FoldedUserPrompt[]
  diagnostics: MessageFoldDiagnostics
}

/** Collapse every whitespace run to one space and clip to {@link PREVIEW_MAX}. */
function previewOf(value: string): string | undefined {
  const collapsed = collapseWhitespace(value)
  if (collapsed === '') return undefined
  return collapsed.length <= PREVIEW_MAX ? collapsed : `${collapsed.slice(0, PREVIEW_MAX - 1)}\u2026`
}

/**
 * The full collapsed text of a journal `content` array — the value
 * {@link previewFromContent} then clips. Used to detect clipping exactly.
 */
function previewFromText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  const parts: string[] = []
  for (const item of content) {
    const record = asRecord(item)
    if (record === undefined) continue
    const value = record.text
    if (typeof value === 'string' && value !== '') parts.push(value)
  }
  return parts.join(' ')
}

/** Collapse every whitespace run to one space and trim — the shared normal form. */
function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}

/**
 * Flatten a journal message `content` into one preview line.
 *
 * Verified shape: `content: [{ type: 'text', text: '…' }]`. Anything else is
 * ignored rather than stringified — a preview is a hint, never a parse.
 */
function previewFromContent(content: unknown): string | undefined {
  if (!Array.isArray(content)) return undefined
  const parts: string[] = []
  for (const item of content) {
    const record = asRecord(item)
    if (record === undefined) continue
    const value = record.text
    if (typeof value === 'string' && value !== '') parts.push(value)
  }
  if (parts.length === 0) return undefined
  return previewOf(parts.join(' '))
}

/**
 * Fold one session log into message-carrying records.
 *
 * Reads exactly three event types and never invents a fourth:
 * - `team/message/queued`   — carries the sender, target and text;
 * - `team/message/delivered`— carries only `messageId` + `targetId`, so it is
 *   paired to its queue **by id** and never guessed from adjacency or time;
 * - `user/message`          — the human's own prompt, but only when
 *   `data.source.kind === 'user'`.
 *
 * Total by construction: missing, reordered, duplicated and malformed payloads
 * all degrade into diagnostics; nothing throws and nothing is back-filled with
 * a synth.
 *
 * @param events - raw events of ONE session (any order, any shape).
 * @returns ascending records, ascending prompts, and non-fatal diagnostics.
 */
export function foldMessageRecords(events: readonly unknown[]): FoldedMessages {
  const indexed = inLogOrder(indexEvents(events))
  const diagnostics: MessageFoldDiagnostics = {
    queued: 0,
    delivered: 0,
    unpairedDeliveries: 0,
    userPrompts: 0,
    injectedUserMessages: 0,
    truncatedBodies: 0,
  }

  /** The queue half of every exchange: what the sender actually did. */
  const queues = new Map<string, FoldedMessageRecord>()
  /** Delivery `seq` per message id — the last one wins (logs are append-only). */
  const deliveries = new Map<string, { time: number; targetId?: string; seq: number }>()
  const deliveryOrder: string[] = []
  const userPrompts: FoldedUserPrompt[] = []

  for (const item of indexed) {
    const type = eventType(item)
    const time = item.time
    const data = eventData(item)
    if (type === undefined || data === undefined) continue

    if (type === 'team/message/queued') {
      const message = asRecord(data.message)
      if (message === undefined) continue
      const messageId = asText(message.id)
      if (messageId === undefined || time === undefined) continue
      diagnostics.queued += 1
      const record: FoldedMessageRecord = { messageId, queuedAt: time, seq: item.seq }
      const senderId = asText(message.senderId)
      if (senderId !== undefined) record.senderId = senderId
      const senderName = asText(message.senderName)
      if (senderName !== undefined) record.senderName = senderName
      const targetId = asText(message.targetId)
      if (targetId !== undefined) record.targetId = targetId
      const preview = previewFromContent(message.content)
      if (preview !== undefined) {
        record.preview = preview
        // Flag by comparing the collapsed source, not by looking for the ellipsis
        // (a message may legitimately end with one).
        const collapsed = collapseWhitespace(previewFromText(message.content))
        if (collapsed.length > PREVIEW_MAX) {
          record.truncated = true
          diagnostics.truncatedBodies += 1
        }
      }
      // First queue wins: a duplicate queued event is a re-append, not a
      // second message, and the earliest timestamp is the real hand-over.
      if (!queues.has(messageId)) queues.set(messageId, record)
      continue
    }

    if (type === 'team/message/delivered') {
      const messageId = asText(data.messageId)
      if (messageId === undefined || time === undefined) continue
      diagnostics.delivered += 1
      if (!deliveries.has(messageId)) deliveryOrder.push(messageId)
      const targetId = asText(data.targetId)
      const entry: { time: number; targetId?: string; seq: number } = { time, seq: item.seq }
      if (targetId !== undefined) entry.targetId = targetId
      deliveries.set(messageId, entry)
      continue
    }

    if (type === 'user/message') {
      const source = asRecord(data.source)
      const sourceKind = asText(source?.kind)
      if (sourceKind !== USER_SOURCE_KIND) {
        if (sourceKind !== undefined) diagnostics.injectedUserMessages += 1
        continue
      }
      if (time === undefined) continue
      diagnostics.userPrompts += 1
      const prompt: FoldedUserPrompt = { time, seq: item.seq, sourceKind }
      const preview = previewFromContent(data.content)
      if (preview !== undefined) prompt.preview = preview
      userPrompts.push(prompt)
    }
  }

  const records: FoldedMessageRecord[] = []
  for (const record of queues.values()) {
    const delivered = deliveries.get(record.messageId)
    const merged: FoldedMessageRecord = { ...record }
    if (delivered !== undefined) {
      merged.deliveredAt = delivered.time
      if (merged.targetId === undefined && delivered.targetId !== undefined) {
        merged.targetId = delivered.targetId
      }
    }
    records.push(merged)
  }
  // A delivery whose queue is not in the readable window: emit it rather than
  // drop it (the delivery time is real), but leave the sender unset — the
  // journal does not say who sent it, and a guess would be a fabrication.
  for (const messageId of deliveryOrder) {
    if (queues.has(messageId)) continue
    const delivered = deliveries.get(messageId)
    if (delivered === undefined) continue
    diagnostics.unpairedDeliveries += 1
    const record: FoldedMessageRecord = {
      messageId,
      deliveredAt: delivered.time,
      seq: delivered.seq,
    }
    if (delivered.targetId !== undefined) record.targetId = delivered.targetId
    records.push(record)
  }

  const orderOf = (record: FoldedMessageRecord): number => record.queuedAt ?? record.deliveredAt ?? 0
  records.sort((a, b) => (orderOf(a) - orderOf(b)) || (a.seq - b.seq))
  userPrompts.sort((a, b) => (a.time - b.time) || (a.seq - b.seq))
  return { records, userPrompts, diagnostics }
}

// --------------------------------------------------------------------------
// 2. The durable Team journal
// --------------------------------------------------------------------------

/** Read one `team/task` snapshot, or `undefined` when the payload is unusable. */
function readTaskSnapshot(data: Record<string, unknown>): TeamTaskSnapshot | undefined {
  const task = asRecord(data.task)
  if (task === undefined) return undefined
  const id = asText(task.id)
  const revision = asPositiveInt(task.revision)
  const status = asText(task.status)
  if (id === undefined || revision === undefined || status === undefined) return undefined
  if (!(TASK_STATUSES as readonly string[]).includes(status)) return undefined
  const snapshot: TeamTaskSnapshot = {
    id,
    revision,
    subject: typeof task.subject === 'string' ? task.subject : '',
    description: typeof task.description === 'string' ? task.description : '',
    status: status as TaskStatus,
    blockedBy: asTextArray(task.blockedBy),
    writeScopes: asTextArray(task.writeScopes),
  }
  const ownerId = asText(task.ownerId)
  if (ownerId !== undefined) snapshot.ownerId = ownerId
  return snapshot
}

/** Read one `team/member` payload, or `undefined` when it is unusable. */
function readMemberSnapshot(data: Record<string, unknown>): {
  id: string
  name: string
  phase: MemberPhase
  description?: string
  error?: string
} | undefined {
  const member = asRecord(data.member)
  if (member === undefined) return undefined
  const id = asText(member.id)
  const name = asText(member.name)
  const phase = asText(member.phase)
  if (id === undefined || name === undefined || phase === undefined) return undefined
  if (!(MEMBER_PHASES as readonly string[]).includes(phase)) return undefined
  const read: { id: string; name: string; phase: MemberPhase; description?: string; error?: string } = {
    id,
    name,
    phase: phase as MemberPhase,
  }
  const description = asText(member.description)
  if (description !== undefined) read.description = description
  const error = asText(member.error)
  if (error !== undefined) read.error = error
  return read
}

/**
 * Derive the contract action of a task snapshot from its predecessor.
 *
 * The `team/task` event carries no `action` field (verified: `data.task` has
 * exactly the seven snapshot keys), so the action is reconstructed from the
 * `revision` continuity plus the status transition. See the module header.
 *
 * @param previous - the previous accepted snapshot, or `undefined` for the first.
 * @param next - the snapshot being classified.
 * @returns the contract action.
 */
export function deriveTaskAction(
  previous: TeamTaskSnapshot | undefined,
  next: TeamTaskSnapshot,
): TaskEvent['action'] {
  if (previous === undefined) {
    if (next.revision === 1) return 'created'
    // A log that starts mid-stream still tells us what the task IS.
    if (next.status === 'in_progress') return 'claimed'
    if (next.status === 'completed') return 'completed'
    return 'updated'
  }
  if (previous.status !== 'completed' && next.status === 'completed') return 'completed'
  if (previous.status === 'completed' && next.status !== 'completed') return 'reopened'
  if (previous.status !== 'in_progress' && next.status === 'in_progress') return 'claimed'
  return 'updated'
}

/**
 * The `subagent` tool names whose call is a dispatch to a child session.
 *
 * `subagent` is the one observed in the real `HtDot` logs; the `subagent_` prefixed
 * forms are the same built-in family the activity mapper recognises
 * (`toolActivityKind`), included so a fork/continuation is not missed.
 */
const SUBAGENT_TOOL_NAMES: readonly string[] = ['subagent', 'subagent_spawn', 'subagent_fork']

/**
 * The acknowledgement the `subagent` tool returns, which is the ONLY field that
 * links a dispatch `callId` to its child session id.
 *
 * Verified verbatim against the real log:
 * `tool/result` seq 45 → `"started subagent 27f5e98f-1b2f-4160-89ed-c5ad33d5c6a1"`.
 */
const SUBAGENT_ACK = /\bstarted subagent\s+(session-)?([0-9a-fA-F][0-9a-fA-F-]{7,})/

/** The `description` of a dispatch's `arguments` JSON, or `''`. */
function dispatchDescription(argumentsRaw: unknown): string {
  if (typeof argumentsRaw !== 'string') return ''
  let parsed: unknown
  try {
    parsed = JSON.parse(argumentsRaw)
  } catch {
    return ''
  }
  const args = asRecord(parsed)
  return args === undefined ? '' : (asText(args.description) ?? '')
}

/** The child session id an acknowledgement names, or `undefined`. */
function ackChildId(message: Record<string, unknown> | undefined): string | undefined {
  if (message === undefined) return undefined
  const content = message.content
  if (!Array.isArray(content)) return undefined
  let text = ''
  for (const block of content) {
    const record = asRecord(block)
    if (record === undefined) continue
    if (typeof record.text === 'string') text += record.text
  }
  const match = SUBAGENT_ACK.exec(text)
  return match?.[2]
}

/**
 * Every sub-agent hand-off visible in ONE log (normally the parent's).
 *
 * Pairs `tool/call name=subagent` with the acknowledgement that names the child.
 * A call whose acknowledgement never arrived is DROPPED rather than guessed at:
 * the `subagent/catalog` labels are ambiguous on the real data (two dispatches
 * shared `Map conventions and testing`), so label-matching would mispair arrows,
 * and an arrow pointing at the wrong lane is worse than no arrow.
 *
 * @param events - raw events of ONE session (any order, any shape).
 * @returns dispatches in log order, each with a resolved `childId`.
 */
export function foldSubagentDispatches(events: readonly unknown[]): SubagentDispatch[] {
  const byCallId = new Map<string, SubagentDispatch>()
  const out: SubagentDispatch[] = []
  for (const item of inLogOrder(indexEvents(events))) {
    const type = eventType(item)
    const data = eventData(item)
    if (data === undefined) continue
    if (type === 'tool/call') {
      const name = asText(data.name)
      const callId = asText(data.callId)
      const time = item.time
      if (name === undefined || callId === undefined || time === undefined) continue
      if (!SUBAGENT_TOOL_NAMES.includes(name)) continue
      const dispatch: SubagentDispatch = {
        time,
        callId,
        childId: '',
        description: dispatchDescription(data.arguments),
      }
      byCallId.set(callId, dispatch)
      out.push(dispatch)
      continue
    }
    if (type !== 'tool/result') continue
    const message = asRecord(data.message)
    const source = message === undefined ? undefined : asRecord(message.source)
    const callId = asText(source?.callId) ?? asText(message?.toolCallId) ?? asText(data.callId)
    if (callId === undefined) continue
    const dispatch = byCallId.get(callId)
    if (dispatch === undefined) continue
    const childId = ackChildId(message)
    if (childId !== undefined) dispatch.childId = childId
  }
  return out.filter((dispatch) => dispatch.childId !== '')
}

/**
 * The tool names that put a question to a HUMAN.
 *
 * `ask_user_question` is the only one that occurs in 237 real logs (63 calls);
 * `request_user_input` is accepted because the built-in activity mapper treats the two
 * as one category (`toolActivityKind`), so a deployment that renames it still works.
 */
const QUESTION_TOOL_NAMES: readonly string[] = ['ask_user_question', 'request_user_input']

/** One question round-trip folded from a log. */
export interface QuestionRecord {
  /** The `tool/call`'s callId — the key that pairs the ask with its result. */
  callId: string
  /** Epoch ms the question was asked. */
  time: number
  /** Epoch ms the answer (or failure) landed; `null` while the ask is still open. */
  end: number | null
  detail: QuestionDetail
}

/** The `options` array of one question. */
function questionOptions(value: unknown): QuestionOption[] {
  if (!Array.isArray(value)) return []
  const out: QuestionOption[] = []
  for (const entry of value) {
    const record = asRecord(entry)
    if (record === undefined) continue
    const label = asText(record.label)
    if (label === undefined) continue
    const option: QuestionOption = { label }
    const description = asText(record.description)
    if (description !== undefined) option.description = description
    out.push(option)
  }
  return out
}

/**
 * The `questions` array of an `ask_user_question` `tool/call`.
 *
 * Measured shape over 63 real calls: 1 to 4 entries, `header` always present,
 * `options` always present and non-empty, `multi_select: true` on 6 of 98 questions.
 * A malformed payload yields `[]` rather than a throw — the marker still appears at
 * the right instant, it just has nothing to show behind the click.
 */
function questionItemsFromArguments(argumentsRaw: unknown): QuestionItem[] {
  if (typeof argumentsRaw !== 'string') return []
  let parsed: unknown
  try {
    parsed = JSON.parse(argumentsRaw)
  } catch {
    return []
  }
  const raw = asRecord(parsed)?.questions
  if (!Array.isArray(raw)) return []
  const items: QuestionItem[] = []
  for (const [index, entry] of raw.entries()) {
    const question = asRecord(entry)
    if (question === undefined) continue
    const item: QuestionItem = {
      id: asText(question.id) ?? `q${index + 1}`,
      prompt: previewOf(typeof question.question === 'string' ? question.question : '') ?? '',
      options: questionOptions(question.options),
      multiSelect: question.multi_select === true,
      selected: [],
    }
    const header = asText(question.header)
    if (header !== undefined) item.header = header
    items.push(item)
  }
  return items
}

/** The result's text, concatenated the way a streamed payload arrives. */
function resultText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const block of content) {
    const record = asRecord(block)
    if (record === undefined) continue
    if (typeof record.text === 'string') text += record.text
  }
  return text
}

/** Clip a raw payload to the same ceiling message bodies use. */
function clipRaw(text: string): string {
  return text.length <= PREVIEW_MAX ? text : `${text.slice(0, PREVIEW_MAX - 1)}\u2026`
}

/**
 * Apply a `tool/result` to its question record.
 *
 * Three outcomes, all observed in the real logs:
 *
 * - **failed** — `message.isError === true` (real: `data.error = { name:
 *   'UserQuestionError', code: 'DELEGATED_CALLER' }`, arriving 11 ms after the call).
 *   The question never reached a human, so it is NOT `'answered'`.
 * - **answered** — the text parsed as `{"answers":[{"id","selected","custom"}]}`;
 *   each answer pairs to its question by `id`.
 * - **answered but unparsed** — a result exists whose text is not that JSON. The raw
 *   line is kept and `unparsed` set, so the UI shows it instead of an empty selection
 *   that would read as "the human chose nothing".
 *
 * @param detail - the record's detail, mutated in place.
 * @param data - the `tool/result` event's `data`.
 * @param message - `data.message`, already narrowed.
 */
/**
 * One raw `tool/result` seen for a question, before the authoritative one is chosen.
 *
 * A question can have SEVERAL results with the same `callId`, and that is not a
 * transient: DSH's context compaction APPENDS a replacement whose text is
 * `[dsh-jev-compaction] Historical tool output pruned from active model context.`
 * Measured on the real session `52879591-…`: every one of its 4 questions had exactly
 * two results — the original answer, and a pruning placeholder written **28 minutes
 * later** (call `1791540551542` → answer at `1791540578598`, placeholder at
 * `1791542257132`). Applying both in order is what produced a record that was
 * simultaneously `UNPARSED` and holding `selected`, with `end` pushed to the later time.
 */
interface QuestionResultFact {
  /** Epoch ms this result was written. */
  time: number
  /** `message.isError === true`, or a `data.error` was present. */
  isError: boolean
  /** `data.error.code` (e.g. `DELEGATED_CALLER`) or its `name`. */
  errorCode?: string
  /** The `message.content` text, concatenated. */
  text: string
  /** Whether {@link text} parsed into the documented `{ answers: [...] }` shape. */
  answers: boolean
}

/**
 * Pick the ONE result that speaks for a question.
 *
 * Same class of trap as a duplicated/appended record anywhere else in this file: a
 * later rewrite must not be allowed to speak louder than the real one. The order is:
 *
 * 1. **a parsable answer** — the question really was answered, and this IS the answer.
 *    The EARLIEST such result wins, because a later one can only be a rewrite;
 * 2. otherwise **an error result** — the ask terminated without reaching a human;
 * 3. otherwise **the earliest result at all**, surfaced as `unparsed` with its raw
 *    text. That is the honest outcome when the original output was pruned away before
 *    we ever read it: we know the ask completed, we do not know the answer, and the
 *    raw line says so.
 *
 * @param facts - the results seen for one callId, in log order.
 * @returns the authoritative fact, or `undefined` when the ask is still open.
 */
function chooseQuestionResult(facts: readonly QuestionResultFact[]): QuestionResultFact | undefined {
  if (facts.length === 0) return undefined
  const answered = facts.find((fact) => !fact.isError && fact.answers)
  if (answered !== undefined) return answered
  const failed = facts.find((fact) => fact.isError)
  if (failed !== undefined) return failed
  return facts[0]
}

/**
 * Apply the authoritative result to a question record — exactly once.
 *
 * `selected` is written ONLY on the parsable path and `unparsed` ONLY on the other, so
 * the two are mutually exclusive BY CONSTRUCTION rather than by luck.
 *
 * @param detail - the record's detail, mutated in place.
 * @param fact - the chosen result.
 */
function applyChosenQuestionResult(detail: QuestionDetail, fact: QuestionResultFact): void {
  if (fact.isError) {
    detail.status = 'failed'
    if (fact.errorCode !== undefined) detail.errorCode = fact.errorCode
    const line = previewOf(fact.text) ?? fact.errorCode
    if (line !== undefined) detail.errorText = line
    return
  }
  detail.status = 'answered'
  let parsed: unknown
  try {
    parsed = JSON.parse(fact.text)
  } catch {
    detail.unparsed = true
    detail.raw = clipRaw(fact.text)
    return
  }
  const answers = asRecord(parsed)?.answers
  if (!Array.isArray(answers)) {
    detail.unparsed = true
    detail.raw = clipRaw(fact.text)
    return
  }
  const byId = new Map<string, Record<string, unknown>>()
  for (const entry of answers) {
    const answer = asRecord(entry)
    if (answer === undefined) continue
    const id = asText(answer.id)
    if (id !== undefined) byId.set(id, answer)
  }
  for (const item of detail.questions) {
    const answer = byId.get(item.id)
    if (answer === undefined) continue
    item.selected = asTextArray(answer.selected)
    const custom = asText(answer.custom)
    if (custom !== undefined) item.custom = custom
  }
}

/** Read one `tool/result` event as a {@link QuestionResultFact}. */
function questionResultFact(item: IndexedEvent, data: Record<string, unknown>): QuestionResultFact | undefined {
  const time = item.time
  if (time === undefined) return undefined
  const message = asRecord(data.message)
  const text = resultText(message?.content)
  const isError = message?.isError === true || data.error !== undefined
  const fact: QuestionResultFact = { time, isError, text, answers: false }
  if (isError) {
    const error = asRecord(data.error)
    const code = asText(error?.code) ?? asText(error?.name)
    if (code !== undefined) fact.errorCode = code
    return fact
  }
  try {
    fact.answers = Array.isArray(asRecord(JSON.parse(text))?.answers)
  } catch {
    fact.answers = false
  }
  return fact
}

/**
 * Every question put to a human from ONE log.
 *
 * @param events - raw events of ONE session (any order, any shape).
 * @returns one record per question call, in log order. Never throws.
 */
export function foldQuestionRecords(events: readonly unknown[]): QuestionRecord[] {
  const byCallId = new Map<string, QuestionRecord>()
  /** Every result seen per callId, in log order; exactly one is applied at the end. */
  const factsByCallId = new Map<string, QuestionResultFact[]>()
  const out: QuestionRecord[] = []
  for (const item of inLogOrder(indexEvents(events))) {
    const type = eventType(item)
    const data = eventData(item)
    if (data === undefined) continue
    if (type === 'tool/call') {
      const name = asText(data.name)
      const callId = asText(data.callId)
      const time = item.time
      if (name === undefined || callId === undefined || time === undefined) continue
      if (!QUESTION_TOOL_NAMES.includes(name)) continue
      const record: QuestionRecord = {
        callId,
        time,
        end: null,
        detail: { status: 'waiting', questions: questionItemsFromArguments(data.arguments) },
      }
      byCallId.set(callId, record)
      out.push(record)
      continue
    }
    if (type !== 'tool/result') continue
    // An undated result cannot close the span, and leaving the status `waiting` is the
    // honest outcome: we know an answer exists but not when it landed.
    if (item.time === undefined) continue
    const message = asRecord(data.message)
    const source = message === undefined ? undefined : asRecord(message.source)
    const callId = asText(source?.callId) ?? asText(message?.toolCallId) ?? asText(data.callId)
    if (callId === undefined) continue
    if (!byCallId.has(callId)) continue
    const fact = questionResultFact(item, data)
    if (fact === undefined) continue
    const facts = factsByCallId.get(callId)
    if (facts === undefined) factsByCallId.set(callId, [fact])
    else facts.push(fact)
  }

  // Resolve each question to ONE result. Doing it after the whole log is read is what
  // makes "prefer the parsable answer" possible: the pruning placeholder is appended
  // AFTER the answer, so a running "last one wins" would always pick the placeholder.
  for (const record of out) {
    const chosen = chooseQuestionResult(factsByCallId.get(record.callId) ?? [])
    if (chosen === undefined) continue
    // `end` is when the ask truly finished — the chosen result's own time, never the
    // time of a later rewrite.
    record.end = chosen.time
    applyChosenQuestionResult(record.detail, chosen)
  }
  return out
}

/**
 * Fold one session log's durable Team journal.
 *
 * @param events - raw events of ONE session (normally the Lead's).
 * @param sessionId - the id of the session that owns those events; it is stamped
 *   onto every transition as `TaskEvent.sessionId` (the log that carries it).
 * @returns the latest task snapshots, dated transitions, roster journal and the
 *   session header facts. Never throws.
 */
export function foldTeamEvents(events: readonly unknown[], sessionId: string): FoldedTeam {
  const indexed = indexEvents(events)
  const diagnostics = emptyDiagnostics(events.length)
  diagnostics.malformed = countMalformed(indexed)
  diagnostics.undated = countUndated(indexed)

  const team: FoldedTeam = {
    tasks: [],
    taskById: new Map(),
    members: [],
    memberById: new Map(),
    memberIdByName: new Map(),
    diagnostics,
  }

  /**
   * `childId → arguments.description`, from this log's own dispatches.
   *
   * The second rung of the name fallback chain: `subagent/catalog` normally carries
   * its own `label`, but when it does not, the call that spawned the child still
   * holds the task name. Built from a pre-scan because a catalog event and its
   * dispatching call can arrive in either order within the log.
   */
  const descriptionByChildId = new Map<string, string>()
  for (const dispatch of foldSubagentDispatches(events)) {
    // An unusable `arguments` payload yields `''`, which must count as ABSENT: storing
    // it would let an empty string win the `??` chain below and name the lane `''`.
    if (dispatch.description === '') continue
    if (!descriptionByChildId.has(dispatch.childId)) descriptionByChildId.set(dispatch.childId, dispatch.description)
  }

  for (const item of inLogOrder(indexed)) {
    const type = eventType(item)
    if (type === undefined) continue

    if (type === 'session/title') {
      // Only a REAL title: a `fallback` title is the prompt's first line, and using
      // it would name every mapper sub-agent "You are a codebase mapper".
      const data = eventData(item)
      if (data === undefined) continue
      const title = asText(data.title)
      const source = asRecord(data.source)
      if (title === undefined || asText(source?.kind) === 'fallback') continue
      team.sessionTitle ??= title
      continue
    }

    if (type === 'session') {
      // The header is the ONE event that is not wrapped in `data`: it is stored
      // flat (`{ type, version, id, createdAt, cwd, parentSession, … }`, verified
      // against the first line of a real log). Accept both spellings.
      const flat = asRecord(item.event) ?? {}
      const nested = eventData(item)
      const source: Record<string, unknown> = nested === undefined ? flat : { ...flat, ...nested }
      team.sessionId ??= asText(source.id)
      team.sessionCreatedAt ??= asFiniteNumber(source.createdAt)
      team.sessionParentId ??= asText(source.parentSession)
      continue
    }

    if (type === 'subagent/catalog') {
      const data = eventData(item)
      if (data === undefined) continue
      const childId = asText(data.childId)
      const childCreatedAt = asFiniteNumber(data.childCreatedAt)
      if (childId === undefined || childCreatedAt === undefined) continue
      // The member row may not have been journaled yet — remember it anyway.
      const existing = team.memberById.get(childId)
      if (existing !== undefined) {
        existing.childCreatedAt ??= childCreatedAt
        continue
      }
      // THE NAME. `catalog.label` is the human task name the parent gave this child
      // ("Map codebase concerns"), and on the real logs it equals the dispatching
      // `tool/call`'s `arguments.description`. Using the child session id here is what
      // made every sub-agent lane read `4b877229-…` in the panel.
      const label = asText(data.label)
      const description = descriptionByChildId.get(childId)
      const name = label ?? description
      const placeholder: FoldedTeamMember = {
        id: childId,
        name: name ?? childId,
        ...(name === undefined ? { nameIsFallback: true } : {}),
        // NO `phase`: a catalog row says the child session was CREATED, which is not
        // evidence of `provisioning`. Writing one here pinned the lane's status to
        // `provisioning` forever (the permanent spinner).
        firstSeenAt: item.time ?? childCreatedAt,
        lastSeenAt: item.time ?? childCreatedAt,
        phases: [],
        childCreatedAt,
      }
      team.memberById.set(childId, placeholder)
      team.members.push(placeholder)
      continue
    }

    if (type === 'team/member') {
      const data = eventData(item)
      const time = item.time
      if (data === undefined || time === undefined) continue
      const member = readMemberSnapshot(data)
      if (member === undefined) continue
      let record = team.memberById.get(member.id)
      if (record === undefined) {
        record = {
          id: member.id,
          name: member.name,
          phase: member.phase,
          firstSeenAt: time,
          lastSeenAt: time,
          phases: [],
        }
        team.memberById.set(member.id, record)
        team.members.push(record)
      }
      // Index the name OUTSIDE the "new record" branch: a `subagent/catalog`
      // event can create the row first (as a name-less placeholder, see below),
      // and indexing only on creation would leave `memberIdByName` empty for
      // that ordering — which silently pushes every task owned by that member
      // into the `unassigned` lane when the live board is unavailable.
      // First name wins: a later row for the same member must not re-key it.
      if (!team.memberIdByName.has(member.name)) team.memberIdByName.set(member.name, member.id)
      // The journal is append-only and ordered, so the last row wins.
      record.name = member.name
      // A real `team/member` row IS the authoritative name, so a catalog row that
      // had fallen back to the session id is no longer a fallback.
      delete record.nameIsFallback
      record.phase = member.phase
      record.lastSeenAt = time
      if (member.description !== undefined) record.description = member.description
      if (member.error !== undefined) record.error = member.error
      record.phases.push({ phase: member.phase, time })
      continue
    }

    if (type === 'team/task') {
      const data = eventData(item)
      const time = item.time
      if (data === undefined || time === undefined) continue
      const snapshot = readTaskSnapshot(data)
      if (snapshot === undefined) continue

      let record = team.taskById.get(snapshot.id)
      if (record === undefined) {
        record = { id: snapshot.id, snapshot, createdAt: time, transitions: [] }
        record.transitions.push({ time, action: deriveTaskAction(undefined, snapshot), revision: snapshot.revision, sessionId })
        team.taskById.set(snapshot.id, record)
        team.tasks.push(record)
        continue
      }
      if (snapshot.revision <= record.snapshot.revision) {
        // A duplicate or a rewound tail: keep the newer-known state, but never
        // let the history go backwards in time.
        diagnostics.rewoundTransitions += 1
        continue
      }
      const action = deriveTaskAction(record.snapshot, snapshot)
      record.snapshot = snapshot
      record.transitions.push({ time, action, revision: snapshot.revision, sessionId })
      continue
    }
  }

  // Transitions are appended in log order; the contract wants time order.
  for (const record of team.tasks) {
    record.transitions.sort((a, b) => a.time - b.time)
  }
  return team
}

// --------------------------------------------------------------------------
// 3. Tool calls (level-2 source + exact actor index)
// --------------------------------------------------------------------------

/** Parse the `arguments` field of a `tool/call` (a JSON string by contract). */
function parseToolArguments(value: unknown): Record<string, unknown> | undefined {
  if (typeof value !== 'string') return undefined
  try {
    const parsed: unknown = JSON.parse(value)
    return asRecord(parsed)
  } catch {
    return undefined
  }
}

/**
 * Fold one session log into the blocks where it was WAITING, not working.
 *
 * A wait is a `tool/call` named {@link WAIT_TOOL_NAME} paired with the `tool/result`
 * that satisfied it. The pairing is by `toolCallId`, which lives in a different place
 * on the two events — `data.callId` on the call, `data.message.toolCallId` on the
 * result — so both spellings are read and neither is assumed.
 *
 * Verified against the real logs on this machine: 24 `wait_agent` calls in one session,
 * 24 of 24 paired, durations 2.4s to 300s, and the result body is
 * `{"timedOut":true|false}`.
 *
 * The rules that matter, all of which are the "never guess" rule wearing different hats:
 *
 * - an unpaired call yields `end: null`, i.e. STILL WAITING — never an invented end,
 *   because an invented end would claim the agent stopped waiting when it did not;
 * - a result whose `timedOut` cannot be read yields `timedOut: undefined`, never
 *   `false`. "A peer arrived" and "I could not tell" are different claims, and the
 *   chart draws them differently;
 * - a call with no `toolCallId` is dropped rather than paired by position. Two waits
 *   can overlap, so position is not identity.
 *
 * @param events - raw events of ONE session, any order.
 * @param sessionId - the session the log belongs to (the waiting agent).
 * @returns ascending waits, each with its own `sessionId`.
 */
export function foldWaitSpans(events: readonly unknown[], sessionId: string): LaneWait[] {
  const indexed = indexEvents(events)
  /** Ends by callId, so the pairing is by identity and not by order. */
  const ends = new Map<string, { time: number; timedOut: boolean | undefined; seq: number | undefined }>()
  const starts: { callId: string; time: number; timeoutMs: number | undefined; seq: number | undefined }[] = []

  for (const item of indexed) {
    const type = eventType(item)
    const time = item.time
    if (time === undefined) continue
    const data = eventData(item)
    if (data === undefined) continue

    if (type === 'tool/call') {
      if (asText(data.name) !== WAIT_TOOL_NAME) continue
      const callId = asText(data.callId)
      // No id, no pairing: a wait matched by position would attach one agent's end to
      // another's start as soon as two waits overlap.
      if (callId === undefined) continue
      const args = parseToolArguments(data.arguments)
      starts.push({
        callId,
        time,
        timeoutMs: args === undefined ? undefined : asPositiveInt(args.timeout_ms),
        seq: item.seq,
      })
      continue
    }

    if (type === 'tool/result') {
      const message = asRecord(data.message)
      if (message === undefined) continue
      const source = asRecord(message.source)
      const callId = asText(message.toolCallId) ?? (source === undefined ? undefined : asText(source.callId))
      if (callId === undefined) continue
      // KEEP THE EARLIEST RESULT FOR THIS CALL, NOT THE LAST.
      //
      // A single call can carry more than one result, and on this machine it always
      // does: the real one, and then a much later re-append from the compaction
      // machinery whose body is `[dsh-jev-compaction] Historical tool output pruned…`.
      // Measured on a real log, every one of the 24 waits had exactly two, the second
      // landing up to 51 minutes later with an unreadable body — so "last wins" gave
      // every wait a wildly wrong duration AND lost every outcome. The earliest result
      // is when the call actually returned; a later duplicate is bookkeeping.
      //
      // Order-independent on purpose: this compares time (and seq) rather than relying
      // on the input being sorted, because a reordered log must not change the answer.
      const previous = ends.get(callId)
      const timedOut = parseTimedOut(message.content)
      if (
        previous === undefined ||
        time < previous.time ||
        (time === previous.time && (item.seq ?? 0) < (previous.seq ?? 0))
      ) {
        ends.set(callId, { time, timedOut, seq: item.seq })
      }
    }
  }

  starts.sort((a, b) => a.time - b.time || (a.seq ?? 0) - (b.seq ?? 0))
  return starts.map((call) => {
    const result = ends.get(call.callId)
    const row: LaneWait = {
      start: call.time,
      // Still open when nothing came back: `null`, not `call.time`.
      end: result === undefined ? null : result.time,
      sessionId,
    }
    if (call.timeoutMs !== undefined) row.timeoutMs = call.timeoutMs
    if (result !== undefined && result.timedOut !== undefined) row.timedOut = result.timedOut
    return row
  })
}

/**
 * Read `timedOut` out of a `wait_agent` result body.
 *
 * The body is a message whose `content` is a list of text parts holding JSON. Anything
 * unexpected — no parts, no JSON, a different key, a non-boolean — returns `undefined`
 * so the caller can leave the field ABSENT. Returning `false` here would turn "I could
 * not read it" into the positive claim "a peer arrived", which is exactly the kind of
 * silent falsehood this file exists to avoid.
 */
function parseTimedOut(content: unknown): boolean | undefined {
  if (!Array.isArray(content)) return undefined
  for (const part of content) {
    const record = asRecord(part)
    if (record === undefined) continue
    const text = asText(record.text)
    if (text === undefined) continue
    try {
      const parsed = asRecord(JSON.parse(text))
      if (parsed === undefined) continue
      const value = parsed.timedOut
      if (typeof value === 'boolean') return value
    } catch {
      // Not JSON: keep looking at the other parts.
      continue
    }
  }
  return undefined
}

/**
 * Fold one session log into the dated `team_task_*` tool calls it performed.
 *
 * Undated calls, unparseable `arguments`, and calls whose tool name is not a
 * task-board tool are dropped (never guessed).
 *
 * @param events - raw events of ONE session.
 * @param sessionId - the session whose log this is; stamped onto every row.
 * @returns ascending `(time, seq, index)` transitions.
 */
export function foldToolCallTransitions(
  events: readonly unknown[],
  sessionId: string,
): ToolCallTransition[] {
  const indexed = indexEvents(events)
  const out: ToolCallTransition[] = []
  for (const item of inTimeOrder(indexed)) {
    if (eventType(item) !== 'tool/call') continue
    const data = eventData(item)
    const time = item.time
    if (data === undefined || time === undefined) continue
    const tool = asText(data.name)
    if (tool === undefined) continue
    if (tool !== 'team_task_create' && tool !== 'team_task_update') continue
    const args = parseToolArguments(data.arguments)
    if (args === undefined) continue

    if (tool === 'team_task_create') {
      const row: ToolCallTransition = { tool, action: 'created', time, sessionId, seq: item.seq }
      const subject = asText(args.subject)
      if (subject !== undefined) row.subject = subject
      out.push(row)
      continue
    }

    const action = UPDATE_ACTION_MAP[asText(args.action) ?? '']
    if (action === undefined) continue
    const row: ToolCallTransition = { tool, action, time, sessionId, seq: item.seq }
    const taskId = asText(args.task_id)
    if (taskId !== undefined) row.taskId = taskId
    const expectedRevision = asPositiveInt(args.expected_revision)
    if (expectedRevision !== undefined) row.expectedRevision = expectedRevision
    out.push(row)
  }
  return out
}

/**
 * Re-attribute a task's dated transitions to the session that performed them.
 *
 * `team/task` events live in the Lead's log, so without this step every
 * transition would claim the Lead as its actor. Two exact/best-effort rules:
 *
 * 1. a transition that produced revision `R > 1` is matched to the unique
 *    `team_task_update` call with `task_id === taskId` and
 *    `expected_revision === R - 1` (the CAS precondition makes the match
 *    unique — a stale revision is refused by the board);
 * 2. a `created` transition is matched to a `team_task_create` call whose
 *    `subject` equals the board's subject — best effort, because that tool has
 *    no task id, so ambiguous matches fall back to the log's own session.
 *
 * @param taskId - the board task the transitions belong to.
 * @param transitions - the task's transitions, ascending.
 * @param toolCalls - every in-scope session's task-board tool calls.
 * @param subject - the subject the board currently reports for the task.
 * @param fallbackSessionId - the session whose log carried the transitions;
 *   used whenever a transition has no usable session id of its own.
 * @returns a new array; unmatchable transitions keep `fallbackSessionId`.
 */
export function attributeTransitions(
  taskId: string,
  transitions: readonly TaskEvent[],
  toolCalls: readonly ToolCallTransition[],
  subject: string,
  fallbackSessionId: string,
): TaskEvent[] {
  const byConsumedRevision = new Map<number, ToolCallTransition>()
  const createdBySubject = new Map<string, ToolCallTransition[]>()
  for (const call of toolCalls) {
    if (call.taskId === taskId && call.expectedRevision !== undefined && !byConsumedRevision.has(call.expectedRevision)) {
      byConsumedRevision.set(call.expectedRevision, call)
    }
    if (call.action === 'created' && call.subject !== undefined) {
      const list = createdBySubject.get(call.subject)
      if (list === undefined) createdBySubject.set(call.subject, [call])
      else list.push(call)
    }
  }

  /** Keep the transition's own session when it has one, else the fallback. */
  const withSession = (transition: TaskEvent, sessionId: string | undefined): TaskEvent => {
    const next = transition.sessionId === '' ? fallbackSessionId : transition.sessionId
    return { ...transition, sessionId: sessionId ?? next }
  }

  return transitions.map((transition) => {
    if (transition.action === 'created') {
      const candidates = createdBySubject.get(subject)
      // Only an unambiguous subject match is worth trusting.
      if (candidates !== undefined && candidates.length === 1) {
        return withSession(transition, candidates[0]?.sessionId)
      }
      return withSession(transition, undefined)
    }
    if (transition.revision !== undefined && transition.revision > 1) {
      const call = byConsumedRevision.get(transition.revision - 1)
      if (call !== undefined) return withSession(transition, call.sessionId)
    }
    return withSession(transition, undefined)
  })
}

/**
 * Date one task from tool calls ALONE — brief §3.4's level-2 anchor.
 *
 * Used only when the Team journal in the Lead log has no `team/task` events for
 * this task (a damaged log, a journal written by another build, or a board the
 * live projection knows but no log recorded). Level 1 always wins when it has
 * anything to say, because a journal event is the board's own record while a
 * tool call is merely the request that produced it.
 *
 * - `team_task_update` rows give `time` + the consumed revision
 *   (`expected_revision`), so the produced revision is `expected_revision + 1`;
 * - `team_task_create` has no task id at all, so a create is matched by
 *   `subject` and only when the match is unambiguous.
 *
 * @param taskId - the board task to date.
 * @param subject - the subject the board reports (the only create key there is).
 * @param toolCalls - every in-scope session's task-board tool calls.
 * @param fallbackSessionId - the session whose log carried the calls when a row
 *   has no session of its own.
 * @returns ascending dated transitions; `[]` when nothing can be dated.
 */
export function dateTaskFromToolCalls(
  taskId: string,
  subject: string,
  toolCalls: readonly ToolCallTransition[],
  fallbackSessionId: string,
): TaskEvent[] {
  const matched: ToolCallTransition[] = []
  const creates: ToolCallTransition[] = []
  for (const call of toolCalls) {
    if (call.taskId === taskId) {
      matched.push(call)
      continue
    }
    if (call.action === 'created' && call.subject !== undefined && call.subject === subject) {
      creates.push(call)
    }
  }
  // An ambiguous subject match proves nothing: refuse it rather than guess.
  if (creates.length === 1) {
    const only = creates[0]
    if (only !== undefined) matched.push(only)
  }

  const history: TaskEvent[] = matched.map((call) => {
    const event: TaskEvent = {
      time: call.time,
      action: call.action,
      sessionId: call.sessionId === '' ? fallbackSessionId : call.sessionId,
    }
    if (call.expectedRevision !== undefined) event.revision = call.expectedRevision + 1
    else if (call.action === 'created') event.revision = 1
    return event
  })
  history.sort((a, b) => a.time - b.time)
  return history
}

// --------------------------------------------------------------------------
// 6. Live activity — what the lane's agent is doing right now
// --------------------------------------------------------------------------

/**
 * Tool names that count as "running a command".
 * Verbatim from the built-in `activity()` mapper
 * (`@deepseek-ai/dsh-client-ui-chat/lib/client.js:10500-10505`).
 */
const COMMAND_TOOLS: readonly string[] = ['bash', 'pwsh', 'exec_command', 'write_stdin']

/** Tool names that count as "updating the plan". Verbatim from `:10510-10515`. */
const PLAN_TOOLS: readonly string[] = ['todo_write', 'create_goal', 'update_goal', 'get_goal']

/**
 * Argument keys tried, in order, for a one-line detail of the running tool.
 * Verbatim from `LIVE_TOOL_DETAIL_KEYS` (`:10522-10544`).
 */
const LIVE_TOOL_DETAIL_KEYS: readonly string[] = [
  'title',
  'description',
  'objective',
  'task',
  'task_name',
  'name',
  'question',
  'questions',
  'prompt',
  'message',
  'command',
  'cmd',
  'queries',
  'query',
  'pattern',
  'url',
  'uri',
  'file_path',
  'path',
  'target',
  'action',
  'status',
]

/** Detail clip length, from `LIVE_TOOL_DETAIL_MAX_CHARS` (`:10518`). */
const LIVE_TOOL_DETAIL_MAX_CHARS = 160

/**
 * Map a DSH tool name to the activity category the built-in UI shows.
 *
 * A line-by-line mirror of `activity(name)` in
 * `@deepseek-ai/dsh-client-ui-chat/lib/client.js:10494-10517`, including its final
 * `return "tools"` catch-all — so an unknown tool reports the generic
 * "calling a tool" wording instead of being silently dropped. That catch-all is not
 * hypothetical on this machine: `ego_js` (304 calls in the Lead's log),
 * `ego_navigate` and `send_message` are real tools absent from the table, so they
 * land on `'tools'`.
 *
 * @param name - the tool name from a `tool/call` event.
 * @returns the category key; never a sentence, because the client owns the wording.
 */
export function toolActivityKind(name: string): LaneLiveActivityKind {
  if (name === 'read') return 'read'
  if (name === 'read_image') return 'readImage'
  if (name === 'grep' || name === 'glob' || name.endsWith('_inspect')) return 'search'
  if (name === 'write') return 'write'
  if (name === 'edit' || name === 'apply_patch') return 'edit'
  if (COMMAND_TOOLS.includes(name) || name.startsWith('terminal_')) return 'commands'
  if (name === 'run_code') return 'code'
  if (name === 'web_search') return 'webSearch'
  if (name === 'web_fetch') return 'webFetch'
  if (name === 'subagent' || name.startsWith('subagent_')) return 'subagents'
  if (PLAN_TOOLS.includes(name)) return 'plan'
  if (name === 'ask_user_question' || name === 'request_user_input') return 'questions'
  return 'tools'
}

/**
 * Collapse one argument value into a single clipped line.
 *
 * Mirror of `normalizeLiveToolDetail` (`:10545-10549`): a string stays, an all-string
 * array joins with `", "`, anything else is empty; whitespace runs collapse to one
 * space; the result is clipped to 160 characters counted in **code points**
 * (`Array.from` — the built-in counts graphemes with a default `Intl.Segmenter`, which
 * differs only for multi-code-point glyphs and cannot change a one-line label's
 * meaning) with a trailing ellipsis.
 *
 * @param value - the raw argument value.
 * @returns the normalised detail, or `''`.
 */
function normalizeLiveToolDetail(value: unknown): string {
  const text =
    typeof value === 'string'
      ? value
      : Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === 'string')
        ? value.join(', ')
        : ''
  const normalized = text.replace(/\s+/g, ' ').trim()
  const chars = Array.from(normalized)
  return chars.length <= LIVE_TOOL_DETAIL_MAX_CHARS
    ? normalized
    : `${chars.slice(0, LIVE_TOOL_DETAIL_MAX_CHARS - 1).join('').trimEnd()}…`
}

/** First `question` string of an `ask_user_question` argument. Mirror of `:10550-10558`. */
function questionDetail(value: unknown): string {
  if (!Array.isArray(value)) return ''
  for (const item of value) {
    const record = asRecord(item)
    if (record === undefined) continue
    const detail = normalizeLiveToolDetail(record.question)
    if (detail !== '') return detail
  }
  return ''
}

/**
 * The one-line detail for a running tool, from its raw JSON arguments.
 *
 * Mirror of `liveToolDetail` (`:10585-10595`): parse `argsRaw`, walk
 * {@link LIVE_TOOL_DETAIL_KEYS} and return the first non-empty normalised value (with
 * `questions` going through {@link questionDetail}); on unparseable or non-object
 * arguments fall back to the tool NAME — never to an invented phrase.
 *
 * @param name - the tool name, used as the fallback detail.
 * @param argumentsRaw - the `arguments` field of a `tool/call` event (a JSON string).
 * @returns the detail line, or `''`.
 */
export function liveToolDetail(name: string, argumentsRaw: unknown): string {
  if (typeof argumentsRaw !== 'string') return normalizeLiveToolDetail(name)
  let parsed: unknown
  try {
    parsed = JSON.parse(argumentsRaw)
  } catch {
    return normalizeLiveToolDetail(name)
  }
  const args = asRecord(parsed)
  if (args === undefined) return normalizeLiveToolDetail(name)
  for (const key of LIVE_TOOL_DETAIL_KEYS) {
    if (!(key in args)) continue
    const value = args[key]
    const detail = key === 'questions' ? questionDetail(value) : normalizeLiveToolDetail(value)
    if (detail !== '') return detail
  }
  return normalizeLiveToolDetail(name)
}

/**
 * The newest `tool/call` in this log that no `tool/result` has settled.
 *
 * Settling is by `callId`, read from `message.source.callId` — the shape verified
 * against a live log (`tool/result.data.message.source.callId`) — with
 * `message.toolCallId` as a fallback spelling. A result whose id cannot be read
 * settles nothing, which is the safe direction: it may keep a finished call visible
 * for one poll, but it can never invent a running one.
 *
 * @param indexed - the log's events, already indexed.
 * @returns the newest unsettled call, or `undefined`.
 */
function lastUnsettledToolCall(
  indexed: readonly IndexedEvent[],
): { name: string; args: unknown } | undefined {
  const pending = new Map<string, { name: string; args: unknown; seq: number }>()
  for (const item of inLogOrder(indexed)) {
    const type = eventType(item)
    if (type === 'tool/call') {
      const data = eventData(item)
      if (data === undefined) continue
      const callId = asText(data.callId)
      const name = asText(data.name)
      if (callId === undefined || name === undefined) continue
      pending.set(callId, { name, args: data.arguments, seq: item.seq })
      continue
    }
    if (type !== 'tool/result') continue
    const data = eventData(item)
    if (data === undefined) continue
    const message = asRecord(data.message)
    const source = message === undefined ? undefined : asRecord(message.source)
    const callId = asText(source?.callId) ?? asText(message?.toolCallId) ?? asText(data.callId)
    if (callId !== undefined) pending.delete(callId)
  }
  let latest: { name: string; args: unknown; seq: number } | undefined
  for (const entry of pending.values()) {
    if (latest === undefined || entry.seq > latest.seq) latest = entry
  }
  return latest === undefined ? undefined : { name: latest.name, args: latest.args }
}

/**
 * Fold one session log into its lane's CURRENT activity.
 *
 * The rule has two halves, and BOTH must hold:
 *
 * 1. **an unclosed turn or step** — taken straight from {@link foldActivitySpans},
 *    i.e. "a `turn/start` with no later `turn/end`, or a `step/start` with no later
 *    `step/end`". Without this guard an interrupted or aborted turn would leave a
 *    `tool/call` with no `tool/result` forever, and the lane would claim to be running
 *    `bash` for the rest of the session;
 * 2. **an unsettled `tool/call`** — the window in which a tool is genuinely executing.
 *
 * Anything else is `'thinking'` — the built-in's own "no tool in flight" state, and the
 * phrase the user asked for.
 *
 * WHY an unsettled `tool/call` rather than merely `turn/start`: measured over the
 * Lead's real log, 2580 `tool/call` → `tool/result` intervals have a median of **175 ms**
 * but a long tail — 796 over 1 s, 385 over 5 s, 128 over 30 s, longest **900 s**. "A turn
 * is open" would assert work for the whole turn; "no result yet" is exactly the window a
 * tool executes in, and it is wide enough for a human reading the panel to catch. The
 * host reads the LIVE channel (`agents.get(id).session.snapshotEvents()`), so an
 * unflushed `tool/call` is visible immediately.
 *
 * `preparing` (准备读取文件) is deliberately NOT reported — see {@link LaneLiveActivity}.
 *
 * @param events - raw events of ONE session (any order, any shape).
 * @returns the activity; total, never `undefined`, never a throw.
 */
export function foldLaneLiveActivity(events: readonly unknown[]): LaneLiveActivity {
  const spans = foldActivitySpans(events).spans
  // The PRIMARY guard is the TURN: when the log has turn events, "is the turn still
  // open" is the only question that matters, and an orphan `step/start` (a missing
  // `step/end`) must NOT be able to keep a finished turn alive — that is exactly the
  // stale-tool failure this guard exists to stop. Only a log with no turn events at all
  // (a fragment) falls back to the step.
  const hasTurn = spans.some((span) => span.kind === 'turn')
  const open = hasTurn
    ? spans.some((span) => span.kind === 'turn' && span.end === null)
    : spans.some((span) => span.kind === 'step' && span.end === null)
  const running = open ? lastUnsettledToolCall(indexEvents(events)) : undefined
  if (running === undefined) {
    return { kind: 'thinking', detail: '', evidence: 'no-running-tool' }
  }
  return {
    kind: toolActivityKind(running.name),
    detail: liveToolDetail(running.name, running.args),
    toolName: running.name,
    evidence: 'running-tool',
  }
}

/**
 * Run all three folds over one session log.
 *
 * @param events - raw events of ONE session (any order, any shape).
 * @param sessionId - the session that owns those events.
 * @returns the combined fold; never throws.
 */
export function foldSessionEvents(events: readonly unknown[], sessionId: string): FoldedSession {
  return {
    sessionId,
    activity: foldActivitySpans(events),
    team: foldTeamEvents(events, sessionId),
    toolCalls: foldToolCallTransitions(events, sessionId),
    messages: foldMessageRecords(events),
    waits: foldWaitSpans(events, sessionId),
    questions: foldQuestionRecords(events),
    laneActivity: foldLaneLiveActivity(events),
  }
}

/**
 * Sum several per-session diagnostics, for the response-level `notes`.
 *
 * @param diagnostics - the per-session folds to merge.
 * @returns one merged record.
 */
export function mergeDiagnostics(diagnostics: readonly FoldDiagnostics[]): FoldDiagnostics {
  const merged = emptyDiagnostics(0)
  for (const item of diagnostics) {
    merged.events += item.events
    merged.malformed += item.malformed
    merged.undated += item.undated
    merged.orphanCloses += item.orphanCloses
    merged.openSpans += item.openSpans
    merged.rewoundTransitions += item.rewoundTransitions
  }
  return merged
}
