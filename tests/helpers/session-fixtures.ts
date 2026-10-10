/**
 * Event fixtures shaped EXACTLY like the real session logs on this machine.
 *
 * Every object below is a distilled copy of a line observed in a real log; the
 * comments name the file it came from and the `seq`/`time` it carried. They are
 * fixtures rather than live reads because CI has no `~/.dsh`, but nothing here
 * is invented: the key names, the nesting (`data.task` / `data.member` /
 * `data.childId`) and the flat `session` header all match the source.
 *
 * Sources (decompressed with `unzstd -c`):
 * - Lead:  ~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-task-gantt--/
 *          session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99/session.v4.jsonl.zstd
 * - verify (a teammate): …/f828dda6-e91d-4dcc-bbf0-9a9d73d9555e/session.v4.jsonl.zstd
 */
import type { RawSessionEvent } from '../../src/host/fold.ts'

/* --------------------------------------------------------------- headers */

/** `{"type":"session","version":4,"id":"session-…","createdAt":…,"cwd":"…"}`. */
export const SESSION_HEADER: RawSessionEvent = {
  type: 'session',
  version: 4,
  id: 'session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99',
  createdAt: 1_791_647_755_015,
  cwd: '/Users/lzx/Documents/GitHub/dsh-task-gantt',
  agentPreset: 'standard',
}

/** A child session header carries the upward link. */
export const CHILD_SESSION_HEADER: RawSessionEvent = {
  type: 'session',
  version: 4,
  id: 'f828dda6-e91d-4dcc-bbf0-9a9d73d9555e',
  createdAt: 1_791_648_801_688,
  cwd: '/Users/lzx/Documents/GitHub/dsh-task-gantt',
  parentSession: 'session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99',
}

/* ----------------------------------------------------------- team journal */

/**
 * `team/task` — `data.task` has EXACTLY these seven keys in a real log
 * (verified over all 11 `team/task` events of the Lead log):
 * `blockedBy, description, id, revision, status, subject, writeScopes`.
 * In particular there is NO `ownerName` / `ownerId` / `ready`, so lane
 * attribution cannot come from this event alone.
 */
export function teamTaskEvent(options: {
  seq: number
  time: number
  id: string
  revision: number
  status: 'pending' | 'in_progress' | 'completed' | 'deleted'
  subject?: string
  description?: string
  blockedBy?: string[]
  writeScopes?: string[]
  extraTaskKeys?: Record<string, unknown>
}): RawSessionEvent {
  return {
    type: 'team/task',
    seq: options.seq,
    time: options.time,
    data: {
      version: 2,
      teamId: 'session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99',
      task: {
        id: options.id,
        revision: options.revision,
        subject: options.subject ?? `subject of ${options.id}`,
        description: options.description ?? `description of ${options.id}`,
        status: options.status,
        blockedBy: options.blockedBy ?? [],
        writeScopes: options.writeScopes ?? [],
        ...(options.extraTaskKeys ?? {}),
      },
    },
  }
}

/** `team/member` — `data.member` = `{id,name,description,provider,context,phase}`; `id` is the child SESSION id. */
export function teamMemberEvent(options: { seq: number; time: number; id: string; name: string; phase: 'provisioning' | 'active' | 'failed'; error?: string }): RawSessionEvent {
  return {
    type: 'team/member',
    seq: options.seq,
    time: options.time,
    data: {
      version: 2,
      teamId: 'session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99',
      member: {
        id: options.id,
        name: options.name,
        description: `${options.name} description`,
        provider: 'spawn',
        context: 'fresh',
        phase: options.phase,
        ...(options.error === undefined ? {} : { error: options.error }),
      },
    },
  }
}

/** `subagent/catalog` — `{childCreatedAt, childId, label, mode, version}`. */
export function subagentCatalogEvent(options: { seq: number; time: number; childId: string; childCreatedAt: number }): RawSessionEvent {
  return {
    type: 'subagent/catalog',
    seq: options.seq,
    time: options.time,
    data: { version: 1, childId: options.childId, childCreatedAt: options.childCreatedAt, label: 'teammate', mode: 'async' },
  }
}

/* ------------------------------------------------------------ tool calls */

/** `tool/call` — `data` = `{turn, step, callId, name, arguments}`; `arguments` is a JSON STRING.
 *  `time` is optional ON PURPOSE: the fold must drop an undated call rather than
 *  invent one, and that case needs a fixture without a `time`. */
export function toolCallEvent(options: { seq: number; time?: number; name: string; args: unknown; turn?: number; step?: number }): RawSessionEvent {
  return {
    type: 'tool/call',
    seq: options.seq,
    ...(options.time === undefined ? {} : { time: options.time }),
    data: {
      turn: options.turn ?? 1,
      step: options.step ?? 1,
      callId: `call_${options.seq}`,
      name: options.name,
      arguments: typeof options.args === 'string' ? options.args : JSON.stringify(options.args),
    },
  }
}

/* ----------------------------------------------------- team session replay */

/** The Lead log's first ~10 seconds, in the order the events were written. */
export function leadJournal(): RawSessionEvent[] {
  return [
    SESSION_HEADER,
    toolCallEvent({ seq: 484, time: 1_791_648_711_965, name: 'team_task_create', args: { subject: 'task one', description: 'first' } }),
    teamTaskEvent({ seq: 485, time: 1_791_648_711_980, id: 'task-1', revision: 1, status: 'pending', subject: 'task one', description: 'first' }),
    toolCallEvent({ seq: 487, time: 1_791_648_711_989, name: 'team_task_create', args: { subject: 'task two', description: 'second' } }),
    teamTaskEvent({ seq: 488, time: 1_791_648_711_995, id: 'task-2', revision: 1, status: 'pending', subject: 'task two', description: 'second' }),
    teamMemberEvent({ seq: 512, time: 1_791_648_739_342, id: '66b9735d-0000-0000-0000-000000000001', name: 'packaging', phase: 'provisioning' }),
    teamMemberEvent({ seq: 514, time: 1_791_648_745_015, id: '66b9735d-0000-0000-0000-000000000001', name: 'packaging', phase: 'active' }),
    // The claim performed by teammate `packaging` (a `team_task_update` call in
    // ITS log; the resulting snapshot lands in the Lead's log).
    teamTaskEvent({ seq: 524, time: 1_791_648_758_846, id: 'task-1', revision: 2, status: 'in_progress', subject: 'task one', description: 'first' }),
    subagentCatalogEvent({ seq: 600, time: 1_791_648_740_000, childId: '66b9735d-0000-0000-0000-000000000001', childCreatedAt: 1_791_648_739_342 }),
  ]
}

/* --------------------------------------------------- teammate session spans */

/** A teammate log's spans: one `turn/start`, many steps, and NO `turn/end` (still running). */
export function teammateSpans(): RawSessionEvent[] {
  return [
    CHILD_SESSION_HEADER,
    { type: 'turn/start', seq: 4, time: 1_791_648_801_688, data: { turn: 1 } },
    { type: 'step/start', seq: 6, time: 1_791_648_802_860, data: { turn: 1, step: 1 } },
    { type: 'step/end', seq: 20, time: 1_791_648_810_093, data: { turn: 1, step: 1 } },
    { type: 'step/start', seq: 21, time: 1_791_648_810_642, data: { turn: 1, step: 2 } },
    { type: 'step/end', seq: 27, time: 1_791_648_812_818, data: { turn: 1, step: 2 } },
    toolCallEvent({ seq: 30, time: 1_791_648_815_066, name: 'team_task_update', args: { task_id: 'task-5', expected_revision: 1, action: 'claim' } }),
    { type: 'step/start', seq: 35, time: 1_791_648_815_232, data: { turn: 1, step: 4 } },
  ]
}

/** Events whose `data.task` also carries `ownerId` (defensive read in fold.ts). */
export function teamTaskEventWithOwner(options: { seq: number; time: number; id: string; revision: number; status: 'pending' | 'in_progress' | 'completed'; ownerId: string }): RawSessionEvent {
  return teamTaskEvent({ ...options, extraTaskKeys: { ownerId: options.ownerId } })
}
