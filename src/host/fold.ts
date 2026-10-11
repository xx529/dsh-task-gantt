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
import type { ActivitySpan, MemberPhase, TaskEvent, TaskStatus } from '../shared/contract.ts'

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
  /** Latest durable phase. */
  phase: MemberPhase
  description?: string
  error?: string
  /** Time of the earliest `team/member` event for this id. */
  firstSeenAt: number
  /** Time of the latest `team/member` event for this id. */
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
 * The longest preview this module emits, mirroring `MESSAGE_PREVIEW_MAX`.
 *
 * Duplicated as a literal on purpose: `fold.ts` is the pure-data layer and must
 * not gain a dependency on the wire contract just to read one number. The
 * `dev-verify` self-check asserts the two stay equal.
 */
const PREVIEW_MAX = 140

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
  const collapsed = value.replace(/\s+/g, ' ').trim()
  if (collapsed === '') return undefined
  return collapsed.length <= PREVIEW_MAX ? collapsed : `${collapsed.slice(0, PREVIEW_MAX - 1)}\u2026`
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
      if (preview !== undefined) record.preview = preview
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

  for (const item of inLogOrder(indexed)) {
    const type = eventType(item)
    if (type === undefined) continue

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
      } else {
        const placeholder: FoldedTeamMember = {
          id: childId,
          name: childId,
          phase: 'provisioning',
          firstSeenAt: item.time ?? childCreatedAt,
          lastSeenAt: item.time ?? childCreatedAt,
          phases: [],
          childCreatedAt,
        }
        team.memberById.set(childId, placeholder)
        team.members.push(placeholder)
      }
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
