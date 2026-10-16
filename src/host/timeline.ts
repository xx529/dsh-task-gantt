/**
 * Timeline derivation — I/O and assembly.
 *
 * `buildTimeline(ctx, sessionId)` turns the agent-team layer into the frozen
 * {@link TimelineResponse}: one lane per roster member, real session time on the
 * x-axis, task title + summary in every bar.
 *
 * Data sources, in the priority order verified on this machine
 * (see docs/FINDINGS-host.md for every command, path and line number):
 *
 * 1. **The durable Team journal in the Lead's session log** — `team/task`,
 *    `team/member` and `subagent/catalog` events carry real epoch-ms `time`
 *    values and are the authoritative dated history (brief §3.4 level 1).
 *    That is the level this implementation reaches; level 2 (`tool/call`
 *    scanning) is used only to attribute a transition to the teammate that
 *    performed it, and to fill a gap in a damaged log.
 * 2. **The live `agentTeams` projection** — authoritative *current* roster and
 *    board state (status, owner, readiness). It carries no timestamps.
 * 3. **Each member's own session log** — activity spans (turn/step bands).
 *
 * Degradation is total and honest, never an exception:
 *
 * | missing | result |
 * |---|---|
 * | `agentTeams` | roster + tasks rebuilt from the Lead log |
 * | `sessionPersistence` and no live log | `spans: []`, `history: []`, `source: 'live'`, `notes` explains |
 * | some member logs unreadable | those lanes degrade, `source: 'partial'`, `notes` names them |
 * | unpaired / reordered / misdated events | handled in `fold.ts`, surfaced in `notes` |
 *
 * No timestamp is ever invented: a span or transition exists only when a real
 * event carried a real `time`. `range.start` is the earliest observed instant;
 * when nothing at all was observed it falls back to the root session's own
 * `createdAt`, and only then to `generatedAt` (an empty chart either way).
 */
import type { Context } from '@deepseek-ai/cordis'
import {
  API_VERSION,
  MESSAGE_PREVIEW_MAX,
  type MemberPhase,
  type MemberStatus,
  type MessageSpan,
  type SpanSpeaker,
  type TimelineLane,
  type TimelineResponse,
  type TimelineTask,
} from '../shared/contract.ts'
import {
  attributeTransitions,
  dateTaskFromToolCalls,
  foldSessionEvents,
  foldSubagentDispatches,
  mergeDiagnostics,
  type FoldDiagnostics,
  type FoldedMessageRecord,
  type FoldedSession,
  type FoldedTeam,
  type FoldedTeamMember,
  type TeamTaskSnapshot,
  type ToolCallTransition,
} from './fold.ts'
import { laneColorTokens } from './lane-color.ts'
import {
  liveAgent,
  liveAgentList,
  liveAgentModel,
  liveAgentRunning,
  readSessionHeader,
  readSessionLog,
} from './session-log.ts'

// --------------------------------------------------------------------------
// Structural faces of the host services this module consumes.
// --------------------------------------------------------------------------

/** `TeamMemberView` as `agentTeams.listMembers` returns it (all fields untrusted). */
interface TeamMemberViewLike {
  id?: unknown
  name?: unknown
  role?: unknown
  status?: unknown
  description?: unknown
  provider?: unknown
  context?: unknown
  model?: unknown
  diagnostics?: unknown
}

/** `TeamTaskView` as `agentTeams.listTasks` returns it (all fields untrusted). */
interface TeamTaskViewLike {
  id?: unknown
  revision?: unknown
  subject?: unknown
  description?: unknown
  status?: unknown
  ownerName?: unknown
  blockedBy?: unknown
  writeScopes?: unknown
  ready?: unknown
  writeScopeWarnings?: unknown
}

/** `TeamMembership` as `agentTeams.tryMembership` returns it. */
interface TeamMembershipLike {
  root?: { id?: unknown } | undefined
  role?: unknown
  name?: unknown
}

/** The host `agentTeams` service face. */
interface AgentTeamsLike {
  tryMembership?(agent: unknown): TeamMembershipLike | undefined
  listMembers(agent: unknown): TeamMemberViewLike[]
  listTasks(agent: unknown): TeamTaskViewLike[]
}

/** How deep the upward `parentSession` walk may go before it gives up. */
const MAX_ROOT_DEPTH = 16

// --------------------------------------------------------------------------
// Untrusted readers
// --------------------------------------------------------------------------

/** A non-empty string (trimmed) or `undefined`. */
function text(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

/** A finite number or `undefined`. */
function num(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/** A boolean or `undefined`. */
function bool(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

/** An array of non-empty strings. */
function textArray(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  const out: string[] = []
  for (const item of value) {
    const entry = text(item)
    if (entry !== undefined) out.push(entry)
  }
  return out
}

/** The `agentTeams` service, or `undefined` when this deployment omits it. */
function agentTeams(ctx: Context): AgentTeamsLike | undefined {
  const teams = ctx.get('agentTeams') as AgentTeamsLike | undefined
  if (teams === undefined || typeof teams.listTasks !== 'function') return undefined
  return teams
}

/** A short, log-safe rendering of an unknown thrown value. */
function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

// --------------------------------------------------------------------------
// Team root resolution
// --------------------------------------------------------------------------

/**
 * Resolve the team's root (Lead) session id for the session the panel is in.
 *
 * 1. `agentTeams.tryMembership(liveAgent)` — authoritative, and the exact live
 *    Agent instance is required (`ctx.agents.get(id)`), because the service
 *    verifies object identity before answering.
 * 2. Walk `parentSession` upward through the stored session headers.
 * 3. Give up and treat the session as its own implicit root (the Team layer
 *    models every session as an implicit-root team, so this is not a lie).
 *
 * @param ctx - the plugin's host context.
 * @param sessionId - the session the panel was opened in.
 * @param notes - receives a non-fatal explanation when a step degrades.
 * @returns the root session id (never empty).
 */
async function resolveRootSessionId(ctx: Context, sessionId: string, notes: string[]): Promise<string> {
  const teams = agentTeams(ctx)
  const agent = liveAgent(ctx, sessionId)
  if (teams !== undefined && agent !== undefined && typeof teams.tryMembership === 'function') {
    try {
      const membership = teams.tryMembership(agent)
      const root = text(membership?.root?.id)
      if (root !== undefined) return root
      notes.push(`agentTeams.tryMembership("${sessionId}") returned no root; falling back to the parentSession chain`)
    } catch (error) {
      notes.push(`agentTeams.tryMembership("${sessionId}") failed: ${reason(error)}`)
    }
  } else if (teams === undefined) {
    notes.push('the agentTeams service is unavailable; the board is rebuilt from the session log alone')
  }

  const visited = new Set<string>()
  let current = sessionId
  for (let depth = 0; depth < MAX_ROOT_DEPTH; depth += 1) {
    if (visited.has(current)) {
      notes.push(`parentSession chain from "${sessionId}" is cyclic at "${current}"; stopping`)
      break
    }
    visited.add(current)
    const header = await readSessionHeader(ctx, current)
    const parent = text(header?.parentSession)
    if (parent === undefined || parent === current) break
    current = parent
  }
  return current
}

// --------------------------------------------------------------------------
// Lane drafts
// --------------------------------------------------------------------------

/** One lane being assembled, before its spans and tasks are attached. */
interface LaneDraft {
  id: string
  name: string
  role: 'lead' | 'teammate' | 'unknown'
  /** The member's own session id — the lane's log and the live-agent key. */
  sessionId?: string
  phase?: MemberPhase
  /**
   * True when {@link name} is only the child session id — a `subagent/catalog` row
   * that carried neither a `label` nor a dispatching `description`. Such a name is
   * upgraded from the child's own `session/title` once its log has been read.
   */
  nameIsFallback?: boolean
  /** Raw `agentTeams` view status, mapped to the contract's status later. */
  viewStatus?: string
  createdAt?: number
  model?: string
  error?: string
}

/** Map a durable phase plus live activity onto the contract's member status. */
function deriveStatus(phase: MemberPhase | undefined, running: boolean | undefined, hasOpenSpan: boolean): MemberStatus {
  if (phase === 'failed') return 'failed'
  // `provisioning` is only honoured when something actually SAID so. A catalog row
  // carries no phase (see `FoldedTeamMember.phase`), which is what lets the
  // span-derived answers below be reached at all — the fix for the lane whose
  // spinner never stopped.
  if (phase === 'provisioning') return 'provisioning'
  if (running === true) return 'running'
  if (running === false) return 'idle'
  return hasOpenSpan ? 'running' : 'idle'
}

/** Invert `TeamRoster.list()`'s phase → status mapping (roster.js L104-128). */
function phaseFromViewStatus(status: string | undefined): MemberPhase | undefined {
  if (status === 'provisioning') return 'provisioning'
  if (status === 'failed') return 'failed'
  if (status === 'running' || status === 'inactive') return 'active'
  return undefined
}

/** Map a member view status onto the contract's derived status. */
function statusFromViewStatus(status: string | undefined): MemberStatus | undefined {
  if (status === 'provisioning') return 'provisioning'
  if (status === 'failed') return 'failed'
  if (status === 'running') return 'running'
  if (status === 'inactive') return 'idle'
  return undefined
}

/** Build the Lead lane draft from the projection, the log, or neither. */
function leadDraft(rootSessionId: string, rootTeam: FoldedTeam, leadView: TeamMemberViewLike | undefined): LaneDraft {
  const draft: LaneDraft = {
    id: 'lead',
    name: text(leadView?.name) ?? 'lead',
    role: 'lead',
    sessionId: rootSessionId,
  }
  const viewStatus = text(leadView?.status)
  if (viewStatus !== undefined) draft.viewStatus = viewStatus
  const phase = phaseFromViewStatus(viewStatus)
  if (phase !== undefined) draft.phase = phase
  if (rootTeam.sessionCreatedAt !== undefined) draft.createdAt = rootTeam.sessionCreatedAt
  const model = text(leadView?.model)
  if (model !== undefined) draft.model = model
  const error = textArray(leadView?.diagnostics).join('; ')
  if (error !== '') draft.error = error
  return draft
}

/** Build one teammate lane draft from the projection and/or the log journal. */
function teammateDraft(view: TeamMemberViewLike, memberId: string, journal: FoldedTeamMember | undefined): LaneDraft {
  const viewStatus = text(view.status)
  const draft: LaneDraft = {
    id: memberId,
    name: text(view.name) ?? journal?.name ?? memberId,
    role: 'teammate',
    sessionId: memberId,
  }
  if (viewStatus !== undefined) draft.viewStatus = viewStatus
  const phase = phaseFromViewStatus(viewStatus) ?? journal?.phase
  if (phase !== undefined) draft.phase = phase
  const createdAt = journal?.childCreatedAt ?? journal?.firstSeenAt
  if (createdAt !== undefined) draft.createdAt = createdAt
  const model = text(view.model)
  if (model !== undefined) draft.model = model
  const error = textArray(view.diagnostics).join('; ') || journal?.error
  if (error !== undefined && error !== '') draft.error = error
  return draft
}

/** Build a teammate lane draft from the durable journal alone. */
function teammateDraftFromJournal(member: FoldedTeamMember): LaneDraft {
  const draft: LaneDraft = {
    id: member.id,
    name: member.name,
    role: 'teammate',
    sessionId: member.id,
  }
  // Only when the journal actually said so. A catalog row carries no phase.
  if (member.phase !== undefined) draft.phase = member.phase
  if (member.nameIsFallback === true) draft.nameIsFallback = true
  const createdAt = member.childCreatedAt ?? member.firstSeenAt
  if (createdAt !== undefined) draft.createdAt = createdAt
  if (member.error !== undefined) draft.error = member.error
  return draft
}

// --------------------------------------------------------------------------
// Task drafts
// --------------------------------------------------------------------------

/** One board task merged with its dated history, before lane assignment. */
interface TaskDraft extends Omit<TimelineTask, 'laneId'> {
  /** Board owner name (`'lead'` for Lead-owned tasks); never sent on the wire. */
  ownerName?: string
}

/** Read a `TeamTaskView` into a draft carrying the board's current state. */
function draftFromView(view: TeamTaskViewLike): TaskDraft | undefined {
  const id = text(view.id)
  const revision = num(view.revision)
  if (id === undefined || revision === undefined) return undefined
  const status = text(view.status)
  if (status !== 'pending' && status !== 'in_progress' && status !== 'completed' && status !== 'deleted') {
    return undefined
  }
  const draft: TaskDraft = {
    id,
    revision,
    subject: typeof view.subject === 'string' ? view.subject : '',
    description: typeof view.description === 'string' ? view.description : '',
    status,
    blockedBy: textArray(view.blockedBy),
    writeScopes: textArray(view.writeScopes),
    ready: bool(view.ready) ?? false,
    writeScopeWarnings: textArray(view.writeScopeWarnings),
    history: [],
  }
  const owner = text(view.ownerName)
  if (owner !== undefined) {
    draft.owner = owner
    draft.ownerName = owner
  }
  return draft
}

/** Build a draft from the session log alone (the degraded, board-less path). */
function draftFromSnapshot(snapshot: TeamTaskSnapshot, snapshots: readonly TeamTaskSnapshot[]): TaskDraft {
  // `ready` mirrors the board's own rule (task-view.js L18-20): the task is
  // pending and every blocker is completed. `writeScopeWarnings` is
  // deliberately NOT recomputed here — the advisory overlaps are the board's
  // derived output, and guessing at them is exactly the kind of invention this
  // plugin refuses.
  const ready =
    snapshot.status === 'pending' &&
    snapshot.blockedBy.every((id) => snapshots.find((candidate) => candidate.id === id)?.status === 'completed')
  const draft: TaskDraft = {
    id: snapshot.id,
    revision: snapshot.revision,
    subject: snapshot.subject,
    description: snapshot.description,
    status: snapshot.status,
    blockedBy: [...snapshot.blockedBy],
    writeScopes: [...snapshot.writeScopes],
    ready,
    writeScopeWarnings: [],
    history: [],
  }
  if (snapshot.ownerId !== undefined) draft.owner = snapshot.ownerId
  return draft
}

/** Strip the internal `ownerName` before anything reaches the frozen wire shape. */
function toTimelineTask(draft: TaskDraft, laneId: string): TimelineTask {
  const { ownerName: _ownerName, ...task } = draft
  void _ownerName
  return { ...task, laneId }
}

// --------------------------------------------------------------------------
// Message-carrying spans (who told whom what, at what instant)
// --------------------------------------------------------------------------

/**
 * Resolve a journal `senderId` / `targetId` to a speaker.
 *
 * Identity is what the payload says, never the log it was read from: every
 * `team/message` event is appended to the **Lead's** log regardless of who sent
 * it, so attributing by log would paint every teammate's message on the Lead's
 * lane. `id` is tried before `name` because it is the stable key; the name is
 * only consulted for the board's `ownerName` spelling of the same member.
 * Anything unrecognised becomes `system` — a fabricated teammate would be worse
 * than an honest "not from the roster".
 *
 * @param id - `senderId` / `targetId` from the event.
 * @param name - `senderName` from the event, when present.
 * @returns the speaker, or `undefined` when the id is missing entirely.
 */
function makeSpeakerLookup(
  laneByMemberId: Map<string, string>,
  memberIdByName: Map<string, string>,
  memberNameById: Map<string, string>,
): (id: string | undefined, name: string | undefined) => SpanSpeaker | undefined {
  return (id, name) => {
    if (id === undefined) return undefined
    // The journal names the sender but NOT the addressee: `delivered` carries
    // only ids, so a `to` speaker must resolve its display name through this
    // reverse index. Without it the recipient showed up as a raw session id.
    const resolved = name ?? memberNameById.get(id) ?? id
    const laneId = laneByMemberId.get(id)
    if (laneId === 'lead') return { kind: 'lead', id: 'lead', name: resolved }
    if (laneId !== undefined) return { kind: 'teammate', id: laneId, name: resolved }
    if (name !== undefined) {
      const byName = memberIdByName.get(name)
      if (byName === 'lead') return { kind: 'lead', id: 'lead', name }
      if (byName !== undefined) return { kind: 'teammate', id: byName, name }
    }
    if (id === 'lead') return { kind: 'lead', id: 'lead', name: resolved }
    return { kind: 'system', id, name: resolved }
  }
}

/**
 * Turn one log's folded message records into wire spans.
 *
 * Pairing, per the journal's real shape: `queued` carries the sender and the
 * text, `delivered` carries only `messageId` + `targetId`, so the two are
 * joined by id inside {@link foldMessageRecords} and a delivery with no queue
 * yields a span with **no `from`** — the journal does not name the sender there
 * and this plugin does not guess one.
 *
 * @param fold - the fold of the log that carried the events.
 * @param lookup - roster resolver for both ids.
 * @param seen - message ids already emitted, **scoped to this call**: the
 *   caller passes a fresh set per fold, because one exchange must be placed on
 *   two lanes. Cross-fold deduplication happens by lane + message id in the
 *   message pass, never here.
 * @returns ascending spans.
 */
function messageSpansFrom(
  fold: FoldedSession,
  lookup: (id: string | undefined, name: string | undefined) => SpanSpeaker | undefined,
  seen: Set<string>,
): MessageSpan[] {
  const spans: MessageSpan[] = []
  for (const record of fold.messages.records) {
    const time = record.queuedAt ?? record.deliveredAt
    if (time === undefined) continue
    if (record.queuedAt !== undefined) {
      if (seen.has(record.messageId)) continue
      seen.add(record.messageId)
    }
    const span: MessageSpan = {
      kind: 'message',
      time,
      end: record.deliveredAt ?? null,
      from: lookup(record.senderId, record.senderName) ?? {
        kind: 'system',
        id: record.senderId ?? 'unknown',
        name: record.senderName ?? 'unknown',
      },
      messageId: record.messageId,
      sessionId: fold.sessionId,
    }
    const to = lookup(record.targetId, undefined)
    if (to !== undefined) span.to = to
    if (record.preview !== undefined) span.preview = record.preview
    spans.push(span)
  }
  return spans
}

/**
 * The human's own prompts, as spans.
 *
 * `from.id` is the literal `'user'` so the client can give every prompt one
 * fixed colour: "I said this" must never look like "a teammate said this".
 *
 * `sessionId` is the **log that carried** the event (the contract's meaning),
 * not the lane the span ends up on — the same prompt is present in several logs,
 * and the copy kept is the first one read. Deduplication must therefore key on
 * something log-independent: keying on `sessionId` drew one prompt on **three**
 * lanes (measured).
 *
 * @param fold - the fold of the log that carried the events.
 * @returns ascending spans.
 */
function userPromptSpansFrom(fold: FoldedSession): MessageSpan[] {
  return fold.messages.userPrompts.map((prompt) => {
    const span: MessageSpan = {
      kind: 'user-prompt',
      time: prompt.time,
      end: null,
      from: { kind: 'user', id: 'user', name: 'you' },
      sessionId: fold.sessionId,
    }
    if (prompt.preview !== undefined) span.preview = prompt.preview
    return span
  })
}

/**
 * One log's questions to a HUMAN, as message spans.
 *
 * The marker belongs on the exchange row at the instant the model asked, so it is
 * shaped as a `MessageSpan`: `from` is the asking agent, `to` is the human
 * (`{ kind: 'user', id: 'user', name: 'you' }`, the same speaker the prompt spans use),
 * and `end` is `null` while the ask is still open — the span is a live duration, not an
 * instant, because a question CAN sit unanswered.
 *
 * Only the asking lane carries it: there is no `'user'` lane to dual-place onto, and
 * inventing one would put a row on the chart that no session owns.
 *
 * @param fold - the folded log that carried the calls.
 * @param asker - the speaker of the lane that owns that log.
 * @returns ascending spans; `[]` when the log asked nothing.
 */
function questionSpansFrom(fold: FoldedSession, asker: SpanSpeaker): MessageSpan[] {
  return fold.questions.map((record) => {
    const first = record.detail.questions[0]
    const span: MessageSpan = {
      kind: 'question',
      time: record.time,
      end: record.end,
      from: asker,
      to: { kind: 'user', id: 'user', name: 'you' },
      messageId: record.callId,
      sessionId: fold.sessionId,
      question: record.detail,
    }
    const preview = first?.prompt !== undefined && first.prompt !== '' ? first.prompt : first?.header
    if (preview !== undefined && preview !== '') span.preview = preview
    return span
  })
}

/**
 * One log's turns as message spans, so a lane records "this teammate was
 * working from t₀ to t₁" alongside what it sent.
 *
 * A turn is taken from the *activity* fold rather than re-derived from
 * `turn/start` / `turn/end`: `foldActivitySpans` already applied every
 * tolerance rule (unpaired closes, duplicated starts, clamping, ordering) and a
 * second implementation here would be a second source of truth.
 *
 * @param fold - the fold of the lane's own log.
 * @param speaker - who owns the lane.
 * @returns ascending spans, one per turn.
 */
function turnSpansFrom(fold: FoldedSession, speaker: SpanSpeaker): MessageSpan[] {
  const spans: MessageSpan[] = []
  for (const span of fold.activity.spans) {
    if (span.kind !== 'turn') continue
    const emitted: MessageSpan = {
      kind: 'turn',
      time: span.start,
      end: span.end,
      from: speaker,
      sessionId: fold.sessionId,
    }
    // The journal's turn number is a real field of `turn/start`; keep it in the
    // id slot so two turns of one lane stay distinguishable to the client.
    if (span.turn !== undefined) emitted.messageId = `turn:${fold.sessionId}:${span.turn}`
    spans.push(emitted)
  }
  return spans
}

/** The speaker a lane stands for — the Lead row is `lead`, every other is a teammate. */
function speakerOfLane(lane: TimelineLane): SpanSpeaker {
  return lane.role === 'lead'
    ? { kind: 'lead', id: lane.id, name: lane.name }
    : { kind: 'teammate', id: lane.id, name: lane.name }
}

/** Ascending by `(time, end)`, with `turn` under `message`/`user-prompt`. */
/**
 * Ascending by `(time, rank)`.
 *
 * ## The rank order is load-bearing, not cosmetic
 *
 * The client thins each lane's markers to one per `MESSAGE_MARKER_MIN_GAP_PX`
 * (9 px) bucket and, inside a bucket, **keeps whichever span it meets first** — which
 * under this ordering is simply the earlier element of this array. At a typical zoom
 * 9 px is about **3.8 minutes**, so this tie-break decides a MINUTE-SCALE conflict
 * window, not a millisecond one.
 *
 * That is why the two RARE, structural kinds (`question`, `dispatch`) outrank the
 * routine `message`: with the old order (`message` 1, `question` 2) a question asked
 * two minutes after a normal message landed in the same bucket, lost, and the "?"
 * marker the user asked for was never drawn at all — a silent, invisible loss.
 * Rarer-and-more-informative wins the bucket; the routine message is the one that
 * gets summarised into the `+N` badge, which is exactly what that badge is for.
 *
 * | rank | kind | why |
 * |---|---|---|
 * | 0 | `turn` | the band a lane's work is drawn on; never a marker |
 * | 1 | `question` | rare, structural, and the entire point of the marker |
 * | 2 | `dispatch` | rare, structural (a hand-off) |
 * | 3 | `message` | routine; the safest thing to summarise away |
 * | 4 | `user-prompt` | the human's own turn boundary, newest in the row |
 *
 * NOTHING IS DROPPED HERE. This function only orders the array; every span stays in
 * `lane.messages`, so the client can still count what it thinned and keep its `+N`
 * badge honest.
 *
 * Exported so the ordering can be LOCKED BY A TEST against the production function
 * rather than against a copy of its table: a test that re-derives the ranks passes
 * even after someone reverts them, which is a lock with no teeth.
 *
 * @param spans - one lane's spans, mutated and returned.
 * @returns the same array, sorted.
 */
export function sortMessageSpans(spans: MessageSpan[]): MessageSpan[] {
  // Identical to the client's own `messageKindRank()`
  // (`src/client/ui/timeline-layout.ts`): the two tables MUST stay in step, and the
  // client cannot import this module. The last two cases are spelled out rather than
  // left to `default` so the pair is literally the same list.
  const rank = (span: MessageSpan): number => {
    switch (span.kind) {
      case 'turn':
        return 0
      case 'question':
        return 1
      case 'dispatch':
        return 2
      case 'message':
        return 3
      case 'user-prompt':
        return 4
      default:
        return 5
    }
  }
  return spans.sort((a, b) => a.time - b.time || rank(a) - rank(b))
}

// --------------------------------------------------------------------------
// buildTimeline
// --------------------------------------------------------------------------

/**
 * Build the timeline for the session the panel was opened in.
 *
 * Total by construction: every host interaction is probed and wrapped, and an
 * unexpected failure returns an honest empty board rather than throwing into
 * the route.
 *
 * @param ctx - the plugin's host context.
 * @param sessionId - the session the request named.
 * @returns the frozen-contract response.
 */
export async function buildTimeline(ctx: Context, sessionId: string): Promise<TimelineResponse> {
  const generatedAt = Date.now()
  try {
    return await deriveTimeline(ctx, sessionId, generatedAt)
  } catch (error) {
    ctx.logger?.warn?.(`dsh-task-gantt: timeline derivation failed for "${sessionId}": ${reason(error)}`)
    return {
      apiVersion: API_VERSION,
      sessionId,
      rootSessionId: sessionId,
      generatedAt,
      // Nothing was derived, so there is nothing to keep growing: freeze an
      // empty window instead of promising a live edge we cannot justify.
      range: { start: generatedAt, end: generatedAt },
      live: false,
      lanes: [],
      tasks: [],
      source: 'live',
      notes: [`timeline derivation failed and was degraded to an empty board: ${reason(error)}`],
    }
  }
}

/** The real derivation, extracted so the outer guard stays tiny. */
async function deriveTimeline(ctx: Context, sessionId: string, generatedAt: number): Promise<TimelineResponse> {
  const notes: string[] = []

  // ---- 1. team root -------------------------------------------------------
  const rootSessionId = await resolveRootSessionId(ctx, sessionId, notes)

  // ---- 2. live projection (roster + board) --------------------------------
  const teams = agentTeams(ctx)
  const rootAgent = liveAgent(ctx, rootSessionId)
  let memberViews: TeamMemberViewLike[] = []
  let taskViews: TeamTaskViewLike[] = []
  let boardRead = false
  let failure: string | undefined

  if (teams !== undefined) {
    if (rootAgent === undefined) {
      notes.push(`no live agent for root session "${rootSessionId}"; the roster and board fall back to the session log`)
    } else {
      try {
        memberViews = teams.listMembers(rootAgent) ?? []
      } catch (error) {
        notes.push(`agentTeams.listMembers failed: ${reason(error)}`)
      }
      try {
        taskViews = teams.listTasks(rootAgent) ?? []
        boardRead = true
      } catch (error) {
        // The Team journal throws the projection's own failure string here.
        failure = reason(error)
        notes.push(`agentTeams.listTasks failed: ${failure}`)
      }
    }
  }

  // ---- 3. root log: the durable Team journal ------------------------------
  const rootRead = await readSessionLog(ctx, rootSessionId)
  if (!rootRead.ok) notes.push(`root session log unavailable: ${rootRead.reason}`)
  const rootFold = foldSessionEvents(rootRead.ok ? rootRead.events : [], rootSessionId)

  // ---- 4. roster: projection first, journal fills the gaps ----------------
  const memberIdByName = new Map<string, string>()
  /** The reverse index: a journal `targetId` arrives WITHOUT a name. */
  const memberNameById = new Map<string, string>()
  for (const [name, id] of rootFold.team.memberIdByName) {
    memberIdByName.set(name, id)
    memberNameById.set(id, name)
  }
  for (const view of memberViews) {
    const name = text(view.name)
    const id = text(view.id)
    if (name !== undefined && id !== undefined) {
      memberIdByName.set(name, id)
      memberNameById.set(id, name)
    }
  }
  for (const member of rootFold.team.members) {
    if (member.name !== undefined && member.name !== '') memberNameById.set(member.id, member.name)
  }

  const leadView = memberViews.find((view) => text(view.role) === 'lead' || text(view.name) === 'lead')
  const drafts: LaneDraft[] = [leadDraft(rootSessionId, rootFold.team, leadView)]

  const seenLaneIds = new Set<string>([rootSessionId])
  for (const view of memberViews) {
    const id = text(view.id)
    if (id === undefined || id === rootSessionId) continue
    if (text(view.role) === 'lead' || text(view.name) === 'lead') continue
    if (seenLaneIds.has(id)) continue
    seenLaneIds.add(id)
    drafts.push(teammateDraft(view, id, rootFold.team.memberById.get(id)))
  }
  // Members the journal knows but the projection did not report (agentTeams
  // absent, or a roster edge the live view dropped).
  for (const member of rootFold.team.members) {
    if (seenLaneIds.has(member.id) || member.id === rootSessionId) continue
    seenLaneIds.add(member.id)
    drafts.push(teammateDraftFromJournal(member))
  }
  // Last resort: the runtime's own child sessions of the root. A teammate
  // whose `team/member` event never reached the journal is still a real session
  // with a real log, and dropping it would hide both its spans and its
  // messages. Only sessions the runtime itself reports as children of the root
  // qualify, so an unrelated agent can never be drawn as a teammate.
  const runtimeMembers = liveAgentList(ctx)
  if (runtimeMembers.length > 0) {
    for (const agent of runtimeMembers) {
      const id = text(agent.id)
      if (id === undefined || id === rootSessionId || seenLaneIds.has(id)) continue
      const header = agent.session?.header
      const parent = header === undefined ? undefined : text(header.parentSession)
      if (parent !== rootSessionId) continue
      seenLaneIds.add(id)
      const draft: LaneDraft = { id, name: id, role: 'teammate', sessionId: id }
      const model = text(agent.options?.model)
      if (model !== undefined) draft.model = model
      const createdAt = num(header?.createdAt)
      if (createdAt !== undefined) draft.createdAt = createdAt
      draft.viewStatus = agent.status === 'running' ? 'running' : 'inactive'
      drafts.push(draft)
    }
  }

  // ---- 5. read every lane's own log (spans + tool-call attribution) --------
  const folds = new Map<string, FoldedSession>()
  folds.set(rootSessionId, rootFold)
  /**
   * Sessions whose log was ACTUALLY read.
   *
   * `folds` cannot serve as that record: the root fold is seeded unconditionally, so
   * an unreadable root still has a (empty) fold. Anything that must distinguish
   * "we read it" from "we made it up" has to ask this set — the live-activity mount
   * below is exactly that case, because `'thinking'` is a CLAIM and a failed read must
   * degrade to an absent field, not to a claim.
   */
  const readableLogs = new Set<string>()
  if (rootRead.ok) readableLogs.add(rootSessionId)
  /** The RAW events per readable session, for the passes that need more than a fold. */
  const rawBySession = new Map<string, readonly unknown[]>()
  if (rootRead.ok) rawBySession.set(rootSessionId, rootRead.events)
  const allToolCalls: ToolCallTransition[] = [...rootFold.toolCalls]
  const diagnostics: FoldDiagnostics[] = [rootFold.activity.diagnostics]
  let readable = rootRead.ok ? 1 : 0
  let unreadable = rootRead.ok ? 0 : 1

  const memberLogIds = drafts
    .map((draft) => draft.sessionId)
    .filter((id): id is string => id !== undefined && id !== rootSessionId)
  const memberReads = await Promise.all(memberLogIds.map(async (id) => ({ id, read: await readSessionLog(ctx, id) })))
  for (const { id, read } of memberReads) {
    if (!read.ok) {
      unreadable += 1
      notes.push(`session log of lane "${id}" unavailable: ${read.reason}`)
      continue
    }
    readable += 1
    readableLogs.add(id)
    rawBySession.set(id, read.events)
    const fold = foldSessionEvents(read.events, id)
    folds.set(id, fold)
    allToolCalls.push(...fold.toolCalls)
    diagnostics.push(fold.activity.diagnostics)
  }
  allToolCalls.sort((a, b) => a.time - b.time || a.seq - b.seq)

  // ---- 5b. upgrade a fallback lane name from the CHILD's own log -----------
  // Last rung of the name chain: the parent's log gave only the session id
  // (neither `catalog.label` nor a dispatch `description`), but the child's own
  // `session/title` may still name the work. Only a REAL title counts —
  // `foldTeamEvents` already drops `source.kind === 'fallback'` ones, because on the
  // real data all five mapper sub-agents carried the same fallback string.
  for (const draft of drafts) {
    if (draft.nameIsFallback !== true || draft.sessionId === undefined) continue
    const title = folds.get(draft.sessionId)?.team.sessionTitle
    if (title === undefined) continue
    draft.name = title
    delete draft.nameIsFallback
  }

  // ---- 6. tasks: board state + dated history ------------------------------
  const byId = new Map<string, TaskDraft>()
  const snapshots: TeamTaskSnapshot[] = []
  for (const record of rootFold.team.tasks) {
    if (record.snapshot.status === 'deleted') continue
    snapshots.push(record.snapshot)
    const draft = draftFromSnapshot(record.snapshot, snapshots)
    draft.history = attributeTransitions(
      record.id,
      record.transitions,
      allToolCalls,
      record.snapshot.subject,
      rootSessionId,
    )
    byId.set(record.id, draft)
  }

  // The board is authoritative for CURRENT state and owner; the log supplies
  // everything the board cannot date.
  if (boardRead) {
    for (const view of taskViews) {
      const fromBoard = draftFromView(view)
      if (fromBoard === undefined || fromBoard.status === 'deleted') continue
      const existing = byId.get(fromBoard.id)
      if (existing === undefined) {
        const record = rootFold.team.taskById.get(fromBoard.id)
        fromBoard.history =
          record === undefined
            ? []
            : attributeTransitions(fromBoard.id, record.transitions, allToolCalls, fromBoard.subject, rootSessionId)
        byId.set(fromBoard.id, fromBoard)
        continue
      }
      existing.revision = fromBoard.revision
      existing.subject = fromBoard.subject
      existing.description = fromBoard.description
      existing.status = fromBoard.status
      existing.blockedBy = fromBoard.blockedBy
      existing.writeScopes = fromBoard.writeScopes
      existing.ready = fromBoard.ready
      existing.writeScopeWarnings = fromBoard.writeScopeWarnings
      if (fromBoard.owner !== undefined) {
        existing.owner = fromBoard.owner
        existing.ownerName = fromBoard.owner
      }
    }
  } else {
    notes.push('board state (owner / readiness / advisory write-scope warnings) is unavailable; tasks were rebuilt from the log')
    for (const draft of byId.values()) {
      const snapshot = snapshots.find((candidate) => candidate.id === draft.id)
      if (snapshot === undefined) continue
      draft.ready = draftFromSnapshot(snapshot, snapshots).ready
    }
  }

  // ---- 6b. brief §3.4 level-2 anchor --------------------------------------
  // Anything the Team journal could not date falls back to scanning the
  // `team_task_*` tool calls. The journal always wins when it has an event,
  // because the journal is the board's own record while a tool call is just the
  // request that produced it. Nothing is ever dated by "now".
  let datedByToolCalls = 0
  for (const draft of byId.values()) {
    if (draft.history.length > 0) continue
    const fromCalls = dateTaskFromToolCalls(draft.id, draft.subject, allToolCalls, rootSessionId)
    if (fromCalls.length === 0) continue
    draft.history = fromCalls
    datedByToolCalls += 1
  }
  if (datedByToolCalls > 0) {
    notes.push(
      `${datedByToolCalls} task(s) had no team/task journal event; their history was dated from team_task_* tool calls (brief §3.4 level 2)`,
    )
  }

  // ---- 7. lanes: spans + status -------------------------------------------
  /** Lane id per member session id — the bridge from a message's id to a row. */
  const laneByMemberId = new Map<string, string>()
  laneByMemberId.set(rootSessionId, 'lead')
  for (const draft of drafts) {
    if (draft.sessionId !== undefined) laneByMemberId.set(draft.sessionId, draft.id)
  }
  for (const member of rootFold.team.members) {
    if (!laneByMemberId.has(member.id)) laneByMemberId.set(member.id, member.id)
  }

  const lanes: TimelineLane[] = []
  for (const draft of drafts) {
    // Position in the final lane array — the Lead is index 0 because `drafts`
    // starts with the Lead. Colours are assigned by position (not by hashing the
    // id) so that the first five lanes are guaranteed five distinct hues; see
    // `lane-color.ts` for the ceiling and the stability trade-off.
    const laneIndex = lanes.length
    const fold = draft.sessionId === undefined ? undefined : folds.get(draft.sessionId)
    const spans = fold?.activity.spans ?? []
    const hasOpenSpan = spans.some((span) => span.end === null)
    const fromView = statusFromViewStatus(draft.viewStatus)
    const running = draft.sessionId === undefined ? undefined : liveAgentRunning(ctx, draft.sessionId)
    // A session with no registered agent is cold: its log can never grow again,
    // so an unclosed span in it is history, not evidence of work in progress.
    // `running` is only trusted when the probe answered with a real boolean.
    const runningKnown = typeof running === 'boolean'
    const coldSession = draft.sessionId !== undefined && !runningKnown
    /**
     * Is there anything at all that lets us STATE a status?
     *
     * A live probe that answered, a durable phase that actually said something, a
     * projection row, or a log we really read. Without one of those the honest
     * answer is no status — the field is optional by contract, and a lane whose log
     * could not be read must not claim `idle` any more than it may claim
     * `provisioning`. (The old code always had a value here; the catalog rows'
     * hard-coded phase is what made that value a permanent `provisioning`.)
     */
    const logRead = draft.sessionId !== undefined && readableLogs.has(draft.sessionId)
    const statusKnown =
      fromView === 'running' ||
      fromView === 'idle' ||
      draft.phase === 'failed' ||
      draft.phase === 'provisioning' ||
      runningKnown ||
      logRead
    const status: MemberStatus | undefined = statusKnown
      ? fromView === 'running' || fromView === 'idle'
        ? fromView
        : deriveStatus(draft.phase, runningKnown ? running : undefined, coldSession ? false : hasOpenSpan)
      : undefined

    const lane: TimelineLane = {
      id: draft.id,
      name: draft.name,
      role: draft.role,
      // `hasHistory` is true only when the log was readable AND yielded spans:
      // the flag tells the UI "this is durable history", not "a log exists".
      hasHistory: fold !== undefined && spans.length > 0,
      spans,
      // Filled by the message pass below (turns + exchanges + prompts) — one
      // single place decides placement, so a turn can never be drawn twice.
      messages: [],
      color: laneColorTokens(draft.id, laneIndex),
      tasks: [],
    }
    if (status !== undefined) lane.status = status
    // The time this lane spent WAITING on its peers rather than working. Read from
    // the lane's OWN log, which is where its `wait_agent` calls live: a wait is
    // something an agent does to itself, so unlike a message it is not dual-written.
    if (draft.sessionId !== undefined) {
      const laneFold = folds.get(draft.sessionId)
      if (laneFold !== undefined && laneFold.waits.length > 0) lane.waits = laneFold.waits
    }
    // What this lane's agent is doing right now. Attached ONLY when the lane's own log
    // was actually READ (`readableLogs`, not `folds` — the root fold exists even when
    // its read failed). The field is optional by contract, and `'thinking'` is a claim:
    // an unreadable log must stay indistinguishable from today's payload rather than
    // asserting that an agent we could not observe is thinking.
    if (draft.sessionId !== undefined && readableLogs.has(draft.sessionId)) {
      const laneFold = folds.get(draft.sessionId)
      if (laneFold !== undefined) lane.activity = laneFold.laneActivity
    }
    if (draft.sessionId !== undefined) {
      lane.navigation = { type: 'session', value: draft.sessionId }
    }
    if (draft.phase !== undefined) lane.phase = draft.phase
    if (draft.createdAt !== undefined) lane.createdAt = draft.createdAt
    if (draft.model !== undefined) lane.model = draft.model
    if (draft.error !== undefined) lane.error = draft.error
    lanes.push(lane)
  }
  const laneIds = new Set(lanes.map((lane) => lane.id))

  // ---- 7b. messages: dual-write every exchange onto BOTH lanes ------------
  // Reads BOTH the root log and each member log, because a teammate's message
  // is journalled into the Lead's log while the teammate's own replies live in
  // its own log. Attribution is by the payload's ids (see `makeSpeakerLookup`),
  // never by the log it was read from.
  //
  // ## Why each exchange lands on TWO lanes
  //
  // The user asked (verbatim) for the pair to be visible from both sides:
  // "A 发给 B，A 的泳道显示 收件人B 的颜色并带有发出的标识，而 B 这显示 收件人A
  // 的颜色并带有接收的标记". That requires the message on A's row *and* B's row.
  // The row itself is the perspective: when `lane.id === span.from.id` the reader
  // is the sender, otherwise the receiver, so the client derives "sent" vs
  // "received" from where it found the span and the contract needs no new field.
  //
  // Measured before this change on the real Lead log: the Lead lane carried 25
  // `message` spans and every teammate lane carried **zero** incoming — the Lead
  // could not see who had answered it.
  const lookup = makeSpeakerLookup(laneByMemberId, memberIdByName, memberNameById)
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]))
  /** Span per message id / prompt, so N logs carrying it still yield one record. */
  const spanByKey = new Map<string, MessageSpan>()
  /** `${laneId}\u0000${messageId}` — one copy per lane, never a third. */
  const placedIn = new Set<string>()
  const messageDiagnostics = []
  /** Unique exchanges seen, regardless of how many lanes display them. */
  let uniqueMessages = 0
  /**
   * Copies of **messages and prompts** written across all lanes (≥ uniqueMessages).
   *
   * Turns are counted separately in {@link turnsWritten}: they are "this person
   * was working here", not an exchange, and folding them into this number made
   * the `notes` line compare two different populations (67 unique vs 141 copies,
   * of which 18 were turns) — a defect named F11 by the verification track.
   */
  let messageCopies = 0
  /** Turn spans written; every turn belongs to exactly one lane. */
  let turnsWritten = 0
  /** Exchanges whose recipient is not on the roster, so only one side shows. */
  let offRosterTargets = 0

  const place = (laneId: string, messageId: string | undefined, span: MessageSpan): void => {
    const lane = laneById.get(laneId)
    if (lane === undefined) return
    const key = `${laneId}\u0000${messageId ?? `${span.kind}:${span.time}:${span.from.id}`}`
    if (placedIn.has(key)) return
    placedIn.add(key)
    lane.messages.push(span)
    if (span.kind === 'turn') turnsWritten += 1
    else messageCopies += 1
  }

  for (const [foldSessionId, fold] of folds) {
    messageDiagnostics.push(fold.messages.diagnostics)
    // Turns are "this person was working here", not an exchange → single lane.
    const ownLaneId = laneByMemberId.get(foldSessionId) ?? foldSessionId
    const ownLane = laneById.get(ownLaneId)
    if (ownLane !== undefined) {
      for (const span of turnSpansFrom(fold, speakerOfLane(ownLane))) {
        const key = `turn\u0000${foldSessionId}\u0000${span.messageId ?? span.time}`
        if (spanByKey.has(key)) continue
        spanByKey.set(key, span)
        place(ownLaneId, `turn:${span.messageId ?? span.time}`, span)
      }
    }

    // Exchanges: keep the first record per message id across all logs.
    for (const span of messageSpansFrom(fold, lookup, new Set<string>())) {
      const key = `message\u0000${span.messageId ?? `${span.time}\u0000${span.from.id}`}`
      if (spanByKey.has(key)) continue
      spanByKey.set(key, span)
      uniqueMessages += 1
      place(span.from.id, span.messageId, span)
      if (span.to === undefined) continue
      if (laneById.has(span.to.id)) {
        place(span.to.id, span.messageId, span)
      } else {
        offRosterTargets += 1
      }
    }

    // The human's prompts: "you" has no lane of its own, so the prompt is shown
    // on the row of the agent it addressed (the lane that carried the log).
    // Keyed by (time, preview) rather than by the carrying log, because the same
    // prompt is present in the Lead's log AND in each teammate's log — keying on
    // the log drew it once per log (measured: three copies of one prompt).
    for (const span of userPromptSpansFrom(fold)) {
      const key = `prompt\u0000${span.time}\u0000${span.preview ?? ''}`
      if (spanByKey.has(key)) continue
      spanByKey.set(key, span)
      uniqueMessages += 1
      place(ownLaneId, `prompt:${span.time}:${span.preview ?? ''}`, span)
      const target = span.to
      if (target !== undefined && laneById.has(target.id)) {
        place(target.id, `prompt:${span.time}:${span.preview ?? ''}`, span)
      }
    }

    // Questions to a human. The asking lane only — `to` is the human, who has no lane,
    // so there is nothing to dual-place onto. `spanByKey` still dedupes, because the
    // same call could in principle be visible from more than one log.
    if (ownLane !== undefined) {
      for (const span of questionSpansFrom(fold, speakerOfLane(ownLane))) {
        const key = `question\u0000${span.messageId ?? `${span.time}\u0000${fold.sessionId}`}`
        if (spanByKey.has(key)) continue
        spanByKey.set(key, span)
        uniqueMessages += 1
        place(ownLaneId, `question:${span.messageId ?? span.time}`, span)
      }
    }
  }

  // ---- 7c. dispatch markers: the sub-agent hand-off (parent → child) -------
  //
  // A plain sub-agent has NO mailbox: the real `HtDot` logs contain no
  // `team/message/*` at all, and no tool that sends a child anything. So the ONLY
  // directed fact available is the parent's own `tool/call name=subagent`, linked to
  // its child by the acknowledgement text `started subagent <id>`.
  //
  // That is why these carry `kind: 'dispatch'` instead of reusing `'message'`: the
  // journal-message kind means "DSH recorded an exchange with a targetId", and this
  // is an inference from the parent/child relationship. Nothing comes BACK — the
  // parent never receives the child's output — so there is deliberately no
  // child → parent dispatch and no completion marker here.
  let dispatchesPlaced = 0
  for (const [sessionId, events] of rawBySession) {
    for (const dispatch of foldSubagentDispatches(events)) {
      const parentLane = laneById.get(laneByMemberId.get(sessionId) ?? sessionId)
      const childLane = laneById.get(laneByMemberId.get(dispatch.childId) ?? dispatch.childId)
      // No arrow when either end is off this roster: a marker pointing at nothing is
      // worse than a missing one.
      if (parentLane === undefined || childLane === undefined) continue
      const span: MessageSpan = {
        kind: 'dispatch',
        time: dispatch.time,
        // A dispatch is an instant, not a duration: it is the moment the work was
        // handed over. `end` mirrors the instant so the client can draw it as a point.
        end: dispatch.time,
        from: speakerOfLane(parentLane),
        to: speakerOfLane(childLane),
        preview: dispatch.description === '' ? undefined : dispatch.description,
        messageId: dispatch.callId,
        sessionId,
      }
      const key = `dispatch\u0000${dispatch.callId}`
      if (spanByKey.has(key)) continue
      spanByKey.set(key, span)
      dispatchesPlaced += 1
      // Both rows, exactly like an exchange: the row is the perspective, so the
      // parent reads it as "sent to X" and the child as "received from Y".
      place(parentLane.id, `dispatch:${dispatch.callId}`, span)
      place(childLane.id, `dispatch:${dispatch.callId}`, span)
    }
  }
  for (const lane of lanes) lane.messages = sortMessageSpans(lane.messages)
  let unpairedDeliveries = 0
  let injectedUserMessages = 0
  let truncatedBodies = 0
  for (const diagnostics of messageDiagnostics) {
    unpairedDeliveries += diagnostics.unpairedDeliveries
    injectedUserMessages += diagnostics.injectedUserMessages
    truncatedBodies += diagnostics.truncatedBodies
  }
  if (offRosterTargets > 0) {
    notes.push(
      `${offRosterTargets} message(s) were addressed to a session outside this roster (a finished/failed member or another team); they are drawn on the sender's lane only, and no lane was invented for them`,
    )
  }
  if (messageCopies > uniqueMessages) {
    // Three numbers on purpose, each a different population, so a reader never
    // has to subtract: unique exchanges, their copies across lanes, and the
    // turns drawn alongside them.
    notes.push(
      `${uniqueMessages} unique message(s): ${messageCopies} message/prompt copies drawn across lanes ` +
        `(an exchange is shown on both the sender's and the recipient's lane, so a per-lane count is not a message total), ` +
        `plus ${turnsWritten} turn span(s)`,
    )
  }
  if (unpairedDeliveries > 0) {
    notes.push(
      `${unpairedDeliveries} team message delivery(ies) had no queued twin in the readable window; those spans carry no sender (the journal does not name one)`,
    )
  }
  if (truncatedBodies > 0) {
    // A body cap is defensive, but hitting it must be visible: the panel shows
    // "the whole message", so a silent clip would read as a complete one.
    notes.push(
      `${truncatedBodies} message body(ies) exceeded the ${MESSAGE_PREVIEW_MAX}-character cap and were clipped; the tail is not in this response`,
    )
  }
  if (injectedUserMessages > 0) {
    notes.push(
      `${injectedUserMessages} user/message event(s) were runtime injections (time-context, tool-jobs, subagent-settled, team-message, …), not the human, and are not drawn as prompts`,
    )
  }

  // ---- 8. task → lane assignment ------------------------------------------
  /** The lane a task belongs to: board owner, else its last actor, else unassigned. */
  const laneIdFor = (draft: TaskDraft): string => {
    const owner = draft.ownerName
    if (owner !== undefined) {
      if (owner === 'lead') return 'lead'
      const byName = memberIdByName.get(owner)
      if (byName !== undefined) return byName
      if (draft.owner === rootSessionId) return 'lead'
      return 'unassigned'
    }
    const last = draft.history[draft.history.length - 1]
    if (last !== undefined) {
      if (last.sessionId === rootSessionId) return 'lead'
      if (laneIds.has(last.sessionId)) return last.sessionId
    }
    return 'unassigned'
  }

  const tasksByLane = new Map<string, TaskDraft[]>()
  for (const draft of byId.values()) {
    let laneId = laneIdFor(draft)
    if (!laneIds.has(laneId)) laneId = 'unassigned'
    const bucket = tasksByLane.get(laneId)
    if (bucket === undefined) tasksByLane.set(laneId, [draft])
    else bucket.push(draft)
  }

  /** Sort key: first dated transition, then subject (undated tasks last). */
  const firstTime = (draft: TaskDraft): number => draft.history[0]?.time ?? Number.POSITIVE_INFINITY
  const byFirstTime = (a: TaskDraft, b: TaskDraft): number => {
    const left = firstTime(a)
    const right = firstTime(b)
    if (left !== right) return left < right ? -1 : 1
    return a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id)
  }

  const tasks: TimelineTask[] = []
  for (const lane of lanes) {
    const laneDrafts = [...(tasksByLane.get(lane.id) ?? [])].sort(byFirstTime)
    lane.tasks = laneDrafts.map((draft) => toTimelineTask(draft, lane.id))
    tasks.push(...lane.tasks)
  }
  const unassignedDrafts = [...(tasksByLane.get('unassigned') ?? [])].sort(byFirstTime)
  if (unassignedDrafts.length > 0) {
    const lane: TimelineLane = {
      id: 'unassigned',
      name: 'unassigned',
      role: 'unknown',
      hasHistory: false,
      spans: [],
      // No session owns this row, so it can carry no turn, no navigation, and
      // the palette's neutral colour rather than borrowing a teammate's.
      messages: [],
      // The sentinel row never participates in the positional cycle.
      color: laneColorTokens('unassigned', lanes.length),
      tasks: unassignedDrafts.map((draft) => toTimelineTask(draft, 'unassigned')),
    }
    lanes.push(lane)
    tasks.push(...lane.tasks)
  }
  tasks.sort(byFirstTime)

  // ---- 9. range, liveness, source, notes ----------------------------------
  const observed: number[] = []
  /** Whether any lane still has an unfinished span / open turn. */
  let hasOpenSpan = false
  for (const lane of lanes) {
    for (const span of lane.spans) {
      observed.push(span.start)
      if (span.end !== null) observed.push(span.end)
      else hasOpenSpan = true
    }
    for (const message of lane.messages) {
      observed.push(message.time)
      if (message.end !== null) observed.push(message.end)
      else if (message.kind === 'turn') hasOpenSpan = true
    }
    if (lane.createdAt !== undefined) observed.push(lane.createdAt)
  }
  for (const task of tasks) {
    for (const event of task.history) observed.push(event.time)
  }
  if (rootFold.team.sessionCreatedAt !== undefined) observed.push(rootFold.team.sessionCreatedAt)
  const start = observed.length > 0 ? Math.min(...observed) : (rootFold.team.sessionCreatedAt ?? generatedAt)
  const lastObserved = observed.length > 0 ? Math.max(...observed) : undefined
  if (observed.length === 0) {
    notes.push('no dated session event was readable; the chart has no activity to place and starts at the root session creation time')
  }

  // Liveness is decided from EVENT EVIDENCE + the runtime's own view, never
  // from the moment this request happened to run and never from a client clock:
  //
  //   * `ctx.agents.get(id)?.status === 'running'` is authoritative when the
  //     session IS registered — the runtime knows whether it is executing;
  //   * an unclosed span (a `turn/start` / `step/start` with no end) is the
  //     primary evidence for a session that is NOT registered: it means the log
  //     stopped mid-flight, which is exactly "the team is still going" for the
  //     panel's own session or a session right after a teammate finished;
  //   * a log with no open span and no live agent is *stopped* for good, so the
  //     right edge freezes at the last observed instant. That frozen edge is a
  //     real event time, so no timestamp ever has to be invented for it.
  //
  // The split matters in practice: every finished teammate's log ends with an
  // unclosed step, so counting "any open span anywhere" as live would leave a
  // dead team's chart creeping forward forever (observed on the real 9-lane log
  // — 4 cold teammate logs carried open spans).
  const anyAgentRunning = lanes.some((lane) => {
    const navigation = lane.navigation
    if (navigation === undefined) return false
    // `type: 'session'` is the only form this half emits today; the address
    // form carries the same conversation and is still a real session.
    const sessionId = navigation.type === 'session' ? navigation.value : navigation.value.sessionId
    return sessionId !== undefined && liveAgentRunning(ctx, sessionId) === true
  })
  const ownSessionStillOpen = lanes.some((lane) => {
    const navigation = lane.navigation
    if (navigation === undefined || navigation.type !== 'session') return false
    if (navigation.value !== sessionId) return false
    return (
      lane.spans.some((span) => span.end === null) ||
      lane.messages.some((message) => message.kind === 'turn' && message.end === null)
    )
  })
  const live = anyAgentRunning || ownSessionStillOpen
  if (!live) {
    notes.push(
      'no live agent is running and the requested session has no open span, so the timeline is frozen at the last observed event; the chart no longer advances with the wall clock',
    )
  }

  const merged = mergeDiagnostics(diagnostics)
  if (merged.orphanCloses > 0) {
    notes.push(`${merged.orphanCloses} unpaired turn/step end event(s) were ignored (a close without an open can never date a span)`)
  }
  if (merged.undated > 0) {
    notes.push(`${merged.undated} event(s) carried no usable time and were excluded (no timestamp is ever invented)`)
  }
  if (merged.rewoundTransitions > 0) {
    notes.push(`${merged.rewoundTransitions} task snapshot(s) were skipped for a non-increasing revision`)
  }

  const source: TimelineResponse['source'] =
    readable > 0 && unreadable === 0 ? 'log' : readable > 0 ? 'partial' : 'live'

  const response: TimelineResponse = {
    apiVersion: API_VERSION,
    sessionId,
    rootSessionId,
    generatedAt,
    // `end: null` means "still growing"; a real instant means "stopped here".
    // The frozen value is the last event actually observed, so the chart shows
    // the work that happened rather than trailing an idle team forever.
    range: { start, end: live ? null : (lastObserved ?? start) },
    live,
    lanes,
    tasks,
    source,
    notes,
  }
  if (failure !== undefined) response.failure = failure
  return response
}
