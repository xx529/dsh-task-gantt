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
  type MemberPhase,
  type MemberStatus,
  type TimelineLane,
  type TimelineResponse,
  type TimelineTask,
} from '../shared/contract.ts'
import {
  attributeTransitions,
  dateTaskFromToolCalls,
  foldSessionEvents,
  mergeDiagnostics,
  type FoldDiagnostics,
  type FoldedSession,
  type FoldedTeam,
  type FoldedTeamMember,
  type TeamTaskSnapshot,
  type ToolCallTransition,
} from './fold.ts'
import { liveAgent, liveAgentModel, liveAgentRunning, readSessionHeader, readSessionLog } from './session-log.ts'

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
  /** Raw `agentTeams` view status, mapped to the contract's status later. */
  viewStatus?: string
  createdAt?: number
  model?: string
  error?: string
}

/** Map a durable phase plus live activity onto the contract's member status. */
function deriveStatus(phase: MemberPhase | undefined, running: boolean | undefined, hasOpenSpan: boolean): MemberStatus {
  if (phase === 'failed') return 'failed'
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
    phase: member.phase,
  }
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
      range: { start: generatedAt, end: null },
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
  for (const [name, id] of rootFold.team.memberIdByName) memberIdByName.set(name, id)
  for (const view of memberViews) {
    const name = text(view.name)
    const id = text(view.id)
    if (name !== undefined && id !== undefined) memberIdByName.set(name, id)
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

  // ---- 5. read every lane's own log (spans + tool-call attribution) --------
  const folds = new Map<string, FoldedSession>()
  folds.set(rootSessionId, rootFold)
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
    const fold = foldSessionEvents(read.events, id)
    folds.set(id, fold)
    allToolCalls.push(...fold.toolCalls)
    diagnostics.push(fold.activity.diagnostics)
  }
  allToolCalls.sort((a, b) => a.time - b.time || a.seq - b.seq)

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
  const lanes: TimelineLane[] = []
  for (const draft of drafts) {
    const fold = draft.sessionId === undefined ? undefined : folds.get(draft.sessionId)
    const spans = fold?.activity.spans ?? []
    const hasOpenSpan = spans.some((span) => span.end === null)
    const fromView = statusFromViewStatus(draft.viewStatus)
    const running = draft.sessionId === undefined ? undefined : liveAgentRunning(ctx, draft.sessionId)
    const status: MemberStatus =
      fromView === 'running' || fromView === 'idle' ? fromView : deriveStatus(draft.phase, running, hasOpenSpan)

    const lane: TimelineLane = {
      id: draft.id,
      name: draft.name,
      role: draft.role,
      status,
      // `hasHistory` is true only when the log was readable AND yielded spans:
      // the flag tells the UI "this is durable history", not "a log exists".
      hasHistory: fold !== undefined && spans.length > 0,
      spans,
      tasks: [],
    }
    if (draft.phase !== undefined) lane.phase = draft.phase
    if (draft.createdAt !== undefined) lane.createdAt = draft.createdAt
    if (draft.model !== undefined) lane.model = draft.model
    if (draft.error !== undefined) lane.error = draft.error
    lanes.push(lane)
  }
  const laneIds = new Set(lanes.map((lane) => lane.id))

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
      tasks: unassignedDrafts.map((draft) => toTimelineTask(draft, 'unassigned')),
    }
    lanes.push(lane)
    tasks.push(...lane.tasks)
  }
  tasks.sort(byFirstTime)

  // ---- 9. range, source, notes --------------------------------------------
  const observed: number[] = []
  for (const lane of lanes) {
    for (const span of lane.spans) {
      observed.push(span.start)
      if (span.end !== null) observed.push(span.end)
    }
    if (lane.createdAt !== undefined) observed.push(lane.createdAt)
  }
  for (const task of tasks) {
    for (const event of task.history) observed.push(event.time)
  }
  if (rootFold.team.sessionCreatedAt !== undefined) observed.push(rootFold.team.sessionCreatedAt)
  const start = observed.length > 0 ? Math.min(...observed) : (rootFold.team.sessionCreatedAt ?? generatedAt)
  if (observed.length === 0) {
    notes.push('no dated session event was readable; the chart has no activity to place and starts at the root session creation time')
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
    range: { start, end: null },
    lanes,
    tasks,
    source,
    notes,
  }
  if (failure !== undefined) response.failure = failure
  return response
}
