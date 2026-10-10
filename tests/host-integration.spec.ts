/**
 * Host integration: `buildTimeline` driven end-to-end with fake host services
 * over the REAL Lead-log journal (`tests/fixtures/lead-team-journal.json`,
 * extracted verbatim from
 * `~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-task-gantt--/session-4d51254b-…/session.v4.jsonl.zstd`).
 *
 * This is the layer the unit tests cannot reach: roster assembly, root
 * resolution, per-lane log reading, board-vs-log merging, task→lane assignment,
 * the level-2 tool-call dating fallback, and the degradation paths. The frozen
 * contract validator runs on every response, so a lane/task inconsistency fails
 * here even if no dedicated assertion names it.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { beforeEach, describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { buildTimeline } from '../src/host/timeline.ts'
import { clearSessionLogCache } from '../src/host/session-log.ts'
import { fakeContext } from './helpers/fake-http.ts'
import { assertTimeline } from './helpers/timeline-assert.ts'
import { teammateSpans, toolCallEvent } from './helpers/session-fixtures.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface FixtureEvent {
  type?: string
  seq?: number
  time?: number
  data?: Record<string, unknown>
}

const journal = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/lead-team-journal.json'), 'utf8')) as {
  _note: string
  _source: string
  events: FixtureEvent[]
}

const ROOT_SESSION = (journal.events.find((event) => event.type === 'session') as { id?: string } | undefined)?.id ?? ''

/** Roster rows, in first-appearance order (a member id IS its session id). */
function roster(): { id: string; name: string }[] {
  const out: { id: string; name: string }[] = []
  for (const event of journal.events) {
    if (event.type !== 'team/member') continue
    const member = event.data?.member as { id?: string; name?: string } | undefined
    if (member?.id === undefined || member.name === undefined) continue
    if (!out.some((row) => row.id === member.id)) out.push({ id: member.id, name: member.name })
  }
  return out
}

/** Latest journal snapshot per task, in first-appearance order. */
function journalTasks(): { id: string; revision: number; status: string; subject: string; time: number }[] {
  const latest = new Map<string, { id: string; revision: number; status: string; subject: string; time: number }>()
  for (const event of journal.events) {
    if (event.type !== 'team/task') continue
    const task = event.data?.task as { id?: string; revision?: number; status?: string; subject?: string } | undefined
    if (task?.id === undefined || task.revision === undefined || task.status === undefined) continue
    const previous = latest.get(task.id)
    if (previous !== undefined && previous.revision >= task.revision) continue
    latest.set(task.id, {
      id: task.id,
      revision: task.revision,
      status: task.status,
      subject: task.subject ?? '',
      time: event.time ?? 0,
    })
  }
  return [...latest.values()]
}

// `roster()` reads `team/member` rows only: the Lead is NOT one of them (it is
// the team root), so every row here is a teammate lane.
const ROSTER = roster()
const MEMBERS = ROSTER
const MEMBER_SESSION = new Map(MEMBERS.map((member) => [member.name, member.id]))
const TASKS = journalTasks()

/** The task the board knows but the journal never recorded (level-2 dating). */
const LEVEL2_ID = 'task-level2'
const LEVEL2_SUBJECT = 'level-2 only task'

/** Tool calls that date the level-2 task, taken from a member's own log. */
function level2Calls(): unknown[] {
  return [
    toolCallEvent({ seq: 900, time: 1_791_649_000_000, name: 'team_task_create', args: { subject: LEVEL2_SUBJECT, description: 'd' } }),
    toolCallEvent({ seq: 901, time: 1_791_649_001_000, name: 'team_task_update', args: { task_id: LEVEL2_ID, expected_revision: 1, action: 'claim' } }),
  ]
}

/** The claim of task-1, as the owning teammate's own log records it (CAS proof). */
function claimCalls(): unknown[] {
  const first = TASKS[0]
  if (first === undefined) return []
  return [toolCallEvent({ seq: 800, time: first.time + 1_000, name: 'team_task_update', args: { task_id: first.id, expected_revision: 1, action: 'claim' } })]
}

interface HostOptions {
  /** Read the live `agentTeams` board (default true). */
  teams?: boolean
  /** Mount the `agents` service (live logs, default true). */
  agents?: boolean
  /** Mount `sessionPersistence` (default true). */
  persistence?: boolean
  /** Member names whose log is unreadable. */
  failing?: string[]
  /** `tryMembership` returns nothing, forcing the parentSession walk. */
  membership?: 'ok' | 'none' | 'throw'
  /** Extra `parentSession` links, keyed by session id. */
  parents?: Record<string, string>
  /** Board rows to add on top of the journal tasks. */
  extraTasks?: Record<string, unknown>[]
}

/** Per-session live logs. */
function sessionEvents(options: HostOptions): Map<string, unknown[]> {
  const events = new Map<string, unknown[]>()
  events.set(ROOT_SESSION, journal.events)
  MEMBERS.forEach((member, index) => {
    const extra = index === 0 ? claimCalls() : index === 1 ? level2Calls() : []
    events.set(member.id, [...teammateSpans(), ...extra])
  })
  void options
  return events
}

/** Build the fake host context. */
function host(options: HostOptions = {}): Context {
  const events = sessionEvents(options)
  const failing = new Set((options.failing ?? []).map((name) => MEMBER_SESSION.get(name) ?? name))
  const parents = options.parents ?? {}

  const agents =
    options.agents === false
      ? undefined
      : {
          get: (id: string) => {
            if (failing.has(id)) {
              return {
                id,
                status: 'idle',
                session: {
                  header: { id },
                  snapshotEvents: () => {
                    throw new Error(`session "${id}" log is corrupt`)
                  },
                },
              }
            }
            if (!events.has(id)) return undefined
            return {
              id,
              status: id === ROOT_SESSION ? 'running' : 'idle',
              options: { model: 'deepseek-flash' },
              session: {
                header: { id, ...(parents[id] === undefined ? {} : { parentSession: parents[id] }) },
                snapshotEvents: () => events.get(id) ?? [],
              },
            }
          },
        }

  const persistence =
    options.persistence === false
      ? undefined
      : {
          open: async (id: string) => {
            if (failing.has(id)) throw new Error(`persisted log of "${id}" unreadable`)
            return { read: async () => ({ events: events.get(id) ?? [] }), close: async () => undefined }
          },
        }

  const teams =
    options.teams === false
      ? undefined
      : {
          tryMembership: () => {
            if (options.membership === 'throw') throw new Error('membership exploded')
            if (options.membership === 'none') return undefined
            return { root: { id: ROOT_SESSION }, role: 'lead', name: 'lead' }
          },
          listMembers: () => [
            { id: ROOT_SESSION, name: 'lead', role: 'lead', status: 'running', model: 'deepseek-flash' },
            ...MEMBERS.map((member, index) => ({
              id: member.id,
              name: member.name,
              role: 'teammate',
              status: index === 0 ? 'inactive' : 'running',
              model: 'deepseek-flash',
            })),
          ],
          listTasks: () => {
            const rows: Record<string, unknown>[] = TASKS.map((task, index) => ({
              id: task.id,
              revision: task.revision,
              subject: task.subject,
              description: `description of ${task.id}`,
              status: task.status,
              ownerName: MEMBERS[index % Math.max(1, MEMBERS.length)]?.name,
              blockedBy: [],
              writeScopes: [],
              ready: task.status === 'pending',
              writeScopeWarnings: [],
            }))
            rows.push(
              {
                id: LEVEL2_ID,
                revision: 2,
                subject: LEVEL2_SUBJECT,
                description: 'board-only',
                status: 'in_progress',
                ownerName: MEMBERS[1]?.name,
                blockedBy: [],
                writeScopes: [],
                ready: false,
                writeScopeWarnings: [],
              },
              {
                id: 'task-deleted',
                revision: 2,
                subject: 'deleted task',
                description: '',
                status: 'deleted',
                ownerName: MEMBERS[0]?.name,
                blockedBy: [],
                writeScopes: [],
                ready: false,
                writeScopeWarnings: [],
              },
              {
                id: 'task-ghost',
                revision: 1,
                subject: 'ghost owner',
                description: '',
                status: 'pending',
                ownerName: 'nobody',
                blockedBy: [],
                writeScopes: [],
                ready: true,
                writeScopeWarnings: [],
              },
              ...(options.extraTasks ?? []),
            )
            return rows
          },
        }

  return fakeContext({
    get: (name) => {
      if (name === 'agents') return agents
      if (name === 'sessionPersistence') return persistence
      if (name === 'agentTeams') return teams
      return undefined
    },
  })
}

beforeEach(() => {
  // `session-log.ts` caches reads for 1500ms; each test needs a fresh read.
  clearSessionLogCache()
})

describe('buildTimeline over the real Lead journal', () => {
  it('produces a contract-valid board with one lane per roster member', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    expect(value.source).toBe('log')
    expect(value.sessionId).toBe(ROOT_SESSION)
    expect(value.rootSessionId).toBe(ROOT_SESSION)
    expect(value.range.end).toBeNull()
    expect(value.lanes[0]?.id).toBe('lead')
    expect(value.lanes[0]?.role).toBe('lead')
    expect(value.lanes[0]?.name).toBe('lead')
    const laneIds = value.lanes.map((lane) => lane.id)
    expect(new Set(laneIds).size).toBe(laneIds.length)
    for (const member of MEMBERS) expect(laneIds).toContain(member.id)
  })

  it('gives every lane the real activity spans of its own session log', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    for (const lane of value.lanes) {
      if (lane.id === 'unassigned') continue
      expect(lane.spans.length, lane.id).toBeGreaterThan(0)
      expect(lane.hasHistory, lane.id).toBe(true)
      expect(lane.spans.some((span) => span.kind === 'step')).toBe(true)
    }
  })

  it('dates every task from the durable journal and reports the tool-call fallback', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    const first = TASKS[0]
    expect(first).toBeDefined()
    const task = value.tasks.find((candidate) => candidate.id === first?.id)
    expect(task, `task ${first?.id} must be on the board`).toBeDefined()
    expect(task?.history.length).toBeGreaterThanOrEqual(2)
    expect(task?.history[0]?.action).toBe('created')
    for (let index = 1; index < (task?.history.length ?? 0); index += 1) {
      const previous = task?.history[index - 1]
      const current = task?.history[index]
      expect(current?.time).toBeGreaterThanOrEqual(previous?.time ?? 0)
    }
    // The board-only task is dated from `team_task_*` tool calls (brief §3.4 L2).
    const level2 = value.tasks.find((candidate) => candidate.id === LEVEL2_ID)
    expect(level2?.history.map((event) => event.action)).toEqual(['created', 'claimed'])
    expect(value.notes.join('\n')).toMatch(/level 2/i)
  })

  it('attributes a teammate claim to that teammate through the CAS revision', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    const first = TASKS[0]
    const task = value.tasks.find((candidate) => candidate.id === first?.id)
    const claimed = task?.history.find((event) => event.action === 'claimed')
    expect(claimed, 'the journal records a claim for the first task').toBeDefined()
    // The claim was performed in MEMBERS[0]'s log; the journal event lives in the
    // Lead's log, so only the CAS match can name the real actor.
    expect(claimed?.sessionId).toBe(MEMBERS[0]?.id)
  })

  it('assigns tasks to lanes by board owner and keeps every task drawable', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    const laneIds = new Set(value.lanes.map((lane) => lane.id))
    for (const task of value.tasks) expect(laneIds.has(task.laneId), `${task.id} → ${task.laneId}`).toBe(true)
    const first = TASKS[0]
    if (first !== undefined) {
      expect(value.tasks.find((task) => task.id === first.id)?.laneId).toBe(MEMBERS[0]?.id)
    }
    // An owner the roster does not know is drawn on the unassigned lane, not dropped.
    const ghost = value.tasks.find((task) => task.id === 'task-ghost')
    expect(ghost?.laneId).toBe('unassigned')
    expect(value.lanes.find((lane) => lane.id === 'unassigned')?.tasks.map((task) => task.id)).toContain('task-ghost')
  })

  it('never exposes a deleted task', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    expect(value.tasks.map((task) => task.id)).not.toContain('task-deleted')
    for (const task of value.tasks) expect(task.status).not.toBe('deleted')
  })

  it('is deterministic apart from the build timestamp', async () => {
    const first = await buildTimeline(host(), ROOT_SESSION)
    clearSessionLogCache()
    const second = await buildTimeline(host(), ROOT_SESSION)
    expect({ ...second, generatedAt: 0 }).toEqual({ ...first, generatedAt: 0 })
  })
})

describe('buildTimeline degradation paths', () => {
  it('reports partial when one member log is unreadable, and still validates', async () => {
    const failing = MEMBERS[0]?.name
    expect(failing).toBeDefined()
    const value = await buildTimeline(host({ failing: [failing as string] }), ROOT_SESSION)
    assertTimeline(value)
    expect(value.source).toBe('partial')
    expect(value.notes.join('\n')).toMatch(/unavailable/i)
    const failedLane = value.lanes.find((lane) => lane.id === MEMBERS[0]?.id)
    expect(failedLane?.spans).toEqual([])
    expect(failedLane?.hasHistory).toBe(false)
  })

  it('reports live with an explanation when no log can be read at all', async () => {
    const value = await buildTimeline(host({ agents: false, persistence: false }), ROOT_SESSION)
    assertTimeline(value)
    expect(value.source).toBe('live')
    expect(value.notes.length).toBeGreaterThan(0)
    expect(value.range.end).toBeNull()
    for (const lane of value.lanes) expect(lane.spans).toEqual([])
  })

  it('rebuilds the roster and the board from the log when agentTeams is absent', async () => {
    const value = await buildTimeline(host({ teams: false }), ROOT_SESSION)
    assertTimeline(value)
    expect(value.source).toBe('log')
    expect(value.notes.join('\n')).toMatch(/agentTeams/)
    // The durable journal still names every member and every task.
    for (const member of MEMBERS) expect(value.lanes.map((lane) => lane.id)).toContain(member.id)
    for (const task of TASKS) expect(value.tasks.map((candidate) => candidate.id)).toContain(task.id)
    expect(value.notes.join('\n')).toMatch(/board state .* unavailable/i)
    // Readiness is recomputed from the logged blockers, not left to chance.
    for (const task of value.tasks) expect(typeof task.ready).toBe('boolean')
  })

  it('resolves the team root through parentSession when tryMembership knows nothing', async () => {
    const child = MEMBERS[0]?.id
    expect(child).toBeDefined()
    const value = await buildTimeline(
      host({ membership: 'none', parents: { [child as string]: ROOT_SESSION } }),
      child as string,
    )
    assertTimeline(value)
    expect(value.sessionId).toBe(child)
    expect(value.rootSessionId).toBe(ROOT_SESSION)
    expect(value.notes.join('\n')).toMatch(/parentSession chain|no root/i)
  })

  it('survives a throwing tryMembership and still finds the root', async () => {
    const child = MEMBERS[0]?.id
    const value = await buildTimeline(
      host({ membership: 'throw', parents: { [child as string]: ROOT_SESSION } }),
      child as string,
    )
    assertTimeline(value)
    expect(value.rootSessionId).toBe(ROOT_SESSION)
    expect(value.notes.join('\n')).toMatch(/tryMembership.*failed/i)
  })

  it('treats the session as its own root when nothing links it', async () => {
    const lonely = 'session-with-no-parent'
    const value = await buildTimeline(host({ teams: false, agents: false, persistence: false }), lonely)
    assertTimeline(value)
    expect(value.rootSessionId).toBe(lonely)
    expect(value.range.end).toBeNull()
  })
})
