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
import { MESSAGE_PREVIEW_MAX, type MessageSpan } from '../src/shared/contract.ts'
import { LANE_COLOR_TOKENS, UNASSIGNED_COLOR_TOKENS, laneColorTokens } from '../src/host/lane-color.ts'
import { buildTimeline } from '../src/host/timeline.ts'
import { clearSessionLogCache } from '../src/host/session-log.ts'
import { fakeContext } from './helpers/fake-http.ts'
import { assertTimeline, validTimeline } from './helpers/timeline-assert.ts'
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

/** A fixed clock for the isolated-roster tests (no journal timestamps involved). */
const T0 = 1_791_648_800_000

/**
 * Every CSS custom property the host theme package defines.
 *
 * Snapshot fixture (`tests/fixtures/dsw-theme-tokens.json`, provenance in its
 * `_source`). Reading the app bundle at test time is not an option: CI has no
 * `/Applications/DeepSeek Harness.app`.
 */
function knownThemeTokens(): string[] {
  const snapshot = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/dsw-theme-tokens.json'), 'utf8')) as { tokens: string[] }
  return snapshot.tokens
}

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
  /** Replace the roster derived from the journal (for colour-palette tests). */
  members?: { id: string; name: string }[]
  /** Replace the root session log (for isolated roster tests). */
  rootEvents?: unknown[]
  /**
   * Session ids whose LIVE read returns an empty array while the durable log
   * still holds events. This is the channel disagreement that the
   * empty-live-read regression lived in: with the same array on both sides the
   * bug is unreachable, which is why 403 tests missed it.
   */
  liveEmpty?: string[]
}

/** The roster a host run should present. */
function rosterOf(options: HostOptions): { id: string; name: string }[] {
  return options.members ?? MEMBERS
}

/** Per-session live logs. */
function sessionEvents(options: HostOptions): Map<string, unknown[]> {
  const events = new Map<string, unknown[]>()
  events.set(ROOT_SESSION, options.rootEvents ?? journal.events)
  rosterOf(options).forEach((member, index) => {
    const extra = index === 0 ? claimCalls() : index === 1 ? level2Calls() : []
    events.set(member.id, [...teammateSpans(), ...extra])
  })
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
            const liveIsEmpty = (options.liveEmpty ?? []).includes(id)
            return {
              id,
              status: id === ROOT_SESSION ? 'running' : 'idle',
              options: { model: 'deepseek-flash' },
              session: {
                header: { id, ...(parents[id] === undefined ? {} : { parentSession: parents[id] }) },
                // An empty live array means "registered, history not replayed
                // yet" — NOT "this session has no activity".
                snapshotEvents: () => (liveIsEmpty ? [] : events.get(id) ?? []),
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
            ...rosterOf(options).map((member, index) => ({
              id: member.id,
              name: member.name,
              role: 'teammate',
              status: index === 0 ? 'inactive' : 'running',
              model: 'deepseek-flash',
            })),
          ],
          listTasks: () => {
            const roster = rosterOf(options)
            const rows: Record<string, unknown>[] = TASKS.map((task, index) => ({
              id: task.id,
              revision: task.revision,
              subject: task.subject,
              description: `description of ${task.id}`,
              status: task.status,
              ownerName: roster[index % Math.max(1, roster.length)]?.name,
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
                ownerName: rosterOf(options)[1]?.name,
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
                ownerName: rosterOf(options)[0]?.name,
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
  // `session-log.ts` no longer caches across calls (host-data-2 removed the
  // 1.5s memo because it served stale logs); the call is kept as a documented
  // no-op so a future cache cannot silently leak between tests.
  clearSessionLogCache()
})

describe('buildTimeline over the real Lead journal', () => {
  it('produces a contract-valid board with one lane per roster member', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    expect(value.source).toBe('log')
    expect(value.sessionId).toBe(ROOT_SESSION)
    expect(value.rootSessionId).toBe(ROOT_SESSION)
    // The fake root agent is 'running', so the team is alive: the frozen pair
    // is (live: true, end: null), i.e. the client keeps the right edge on now.
    expect(value.live).toBe(true)
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

  it('does not let an empty LIVE read shadow the durable log', async () => {
    // REGRESSION (found by host-data-2 while reconciling the two read channels,
    // 2026-10-12): `readLive` used to treat an empty array as success, so a
    // session that was registered but whose history had not been replayed into
    // memory never fell back to `sessionPersistence`: the panel drew nothing
    // and still claimed `source: 'log'` — silent data loss plus a false
    // provenance claim. Every other test in this file (and every probe before
    // it) hands BOTH channels the same array, so the branch was unreachable and
    // 403 green tests could not see it. This one disagrees on purpose.
    const value = await buildTimeline(host({ liveEmpty: [ROOT_SESSION] }), ROOT_SESSION)
    assertTimeline(value)
    expect(value.source).toBe('log')
    const lead = value.lanes.find((lane) => lane.id === 'lead')
    expect(lead?.spans.length, 'the durable log must still be read').toBeGreaterThan(0)
    expect(lead?.messages.length, 'messages come from the same log').toBeGreaterThan(0)
    expect(value.range.end === null || typeof value.range.end === 'number').toBe(true)
  })

  it('treats a brand-new session (both channels readable but empty) as a successful empty read', async () => {
    // Deliberate ruling from the same fix: "no events yet" is not a failure, so
    // a fresh session must NOT be reported as `partial`/degraded. `hasHistory:
    // false` is what tells the panel "nothing happened yet" (contract:
    // "false = live/empty").
    const value = await buildTimeline(host({ rootEvents: [] }), 'session-brand-new')
    assertTimeline(value)
    expect(value.source).toBe('log')
    expect(value.lanes.every((lane) => lane.spans.length === 0)).toBe(true)
  })

  it('is deterministic apart from the build timestamp', async () => {
    const first = await buildTimeline(host(), ROOT_SESSION)
    clearSessionLogCache()
    const second = await buildTimeline(host(), ROOT_SESSION)
    expect({ ...second, generatedAt: 0 }).toEqual({ ...first, generatedAt: 0 })
  })

  it('wires lane colour tokens and navigation into the roster', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    for (const lane of value.lanes) {
      // Token NAMES, never values (the validator enforces the shape; this pins
      // that the host actually fills them instead of sending empty strings).
      expect(lane.color.bar, lane.id).toMatch(/^--(?:dsw|ds)-/)
      expect(lane.color.on, lane.id).toMatch(/^--(?:dsw|ds)-/)
      // POSITIONAL stability (was "stable by member id" before the palette
      // fix): with the roster unchanged, the same lane index gets the same
      // colour pair. A roster reshuffle may legitimately recolour teammates —
      // see the distinctness test below for the guarantee that replaced it.
      const again = await buildTimeline(host(), ROOT_SESSION).then((other) => other.lanes.find((candidate) => candidate.id === lane.id))
      expect(again?.color, lane.id).toEqual(lane.color)
      if (lane.id === 'unassigned') expect(lane.navigation, 'the sentinel lane is not a session').toBeUndefined()
    }
    const lead = value.lanes.find((lane) => lane.id === 'lead')
    expect(lead?.navigation, 'the Lead lane head must be clickable').toBeDefined()
    // The Lead is pinned to the head of the palette, in every team and session.
    expect(lead?.color).toEqual(LANE_COLOR_TOKENS[0])
  })

  it('gives the first five lanes five different colours (the Lead\'s criterion)', async () => {
    // REJECTION POWER: the first implementation hashed the lane id into the
    // palette, and the real run had 8 teammates sharing 5 tokens (lead, ui and
    // docs all rendered `state-success-primary`). This test fails on that
    // implementation and passes only on positional assignment.
    //
    // The roster is isolated from the journal fixture on purpose: the fixture's
    // own `team/member` rows would add lanes and blur the index maths.
    const members = Array.from({ length: 6 }, (_, index) => ({ id: `member-${index + 1}`, name: `member-${index + 1}` }))
    const value = await buildTimeline(
      host({ members, rootEvents: [{ type: 'session', id: ROOT_SESSION, createdAt: T0 }] }),
      ROOT_SESSION,
    )
    assertTimeline(value)

    const rosterLanes = value.lanes.filter((lane) => lane.id !== 'unassigned')
    expect(rosterLanes).toHaveLength(7) // the Lead plus six teammates
    expect(rosterLanes[0]?.id).toBe('lead')
    expect(rosterLanes[0]?.color).toEqual(LANE_COLOR_TOKENS[0])

    // The Lead's stated criterion, expressed against the palette size so it
    // keeps working if the palette grows: the first N lanes are pairwise
    // distinct, N = the number of distinct hues available.
    const firstN = rosterLanes.slice(0, LANE_COLOR_TOKENS.length).map((lane) => lane.color.bar)
    expect(firstN).toHaveLength(LANE_COLOR_TOKENS.length)
    expect(new Set(firstN).size, `first ${LANE_COLOR_TOKENS.length} lane colours: ${firstN.join(', ')}`).toBe(LANE_COLOR_TOKENS.length)
    expect(firstN[0]).toBe(LANE_COLOR_TOKENS[0]?.bar)

    // No lane may invent a colour outside the palette, and the palette itself is
    // the documented ceiling: lanes past it repeat (see the next test).
    const palette = new Set(LANE_COLOR_TOKENS.map((entry) => entry.bar))
    expect(palette.size).toBe(LANE_COLOR_TOKENS.length)
    for (const lane of value.lanes) expect(palette.has(lane.color.bar), `${lane.id} → ${lane.color.bar}`).toBe(true)
    expect(new Set(rosterLanes.map((lane) => lane.color.bar)).size).toBeLessThanOrEqual(palette.size)
  })

  it('assigns by position, pins the Lead, and wraps at the palette ceiling', () => {
    // Direct check of the assignment rule (the exported pure function), which
    // is what makes the palette ceiling explicit instead of implied.
    expect(laneColorTokens('lead', 0)).toEqual(LANE_COLOR_TOKENS[0])
    expect(laneColorTokens('lead', 3), 'the Lead ignores its index').toEqual(LANE_COLOR_TOKENS[0])
    // Teammates take everything except the Lead's slot, in roster order: with
    // (palette - 1) teammates every remaining hue is used exactly once.
    const teammateCount = LANE_COLOR_TOKENS.length - 1
    const teammateBars = Array.from({ length: teammateCount }, (_, index) => laneColorTokens(`member-${index}`, index + 1).bar)
    expect(new Set(teammateBars).size, teammateBars.join(', ')).toBe(teammateCount)
    expect(teammateBars).not.toContain(LANE_COLOR_TOKENS[0]?.bar)
    // The documented ceiling: lane index == palette length wraps onto slot 0.
    expect(laneColorTokens('member-wrap', LANE_COLOR_TOKENS.length)).toEqual(LANE_COLOR_TOKENS[0])
    // The sentinel bucket never borrows a roster slot.
    expect(laneColorTokens('unassigned', 7)).toEqual(UNASSIGNED_COLOR_TOKENS)
  })

  it('the palette is a set of distinct, host-defined hues with the Lead pinned to its head', () => {
    // Non-vacuity for the test above: the palette must actually have enough
    // distinct entries to satisfy "five different colours", and every name must
    // exist in the host theme (a typo renders the lane transparent silently).
    const known = new Set(knownThemeTokens())
    const bars = LANE_COLOR_TOKENS.map((entry) => entry.bar)
    expect(bars.length, 'the palette must cover the first five lanes').toBeGreaterThanOrEqual(5)
    expect(new Set(bars).size, bars.join(', ')).toBe(bars.length)
    for (const entry of LANE_COLOR_TOKENS) {
      expect(known.has(entry.bar), entry.bar).toBe(true)
      expect(known.has(entry.on), entry.on).toBe(true)
    }
    // The five status hues the plan named are all present; the Lead's colour is
    // the head of this same list, so the two can never drift apart.
    for (const hue of [
      '--dsw-alias-state-business-primary',
      '--dsw-alias-state-success-primary',
      '--dsw-alias-state-warn-primary',
      '--dsw-alias-state-error-primary',
      '--dsw-alias-state-idle-primary',
    ]) {
      expect(bars, hue).toContain(hue)
    }
  })

  it('turns the real log\'s 80 user/message events into exactly the human prompts', async () => {
    // The fixture is the real Lead log: 80 `user/message` events of which only
    // the ones with `data.source.kind === 'user'` are the human typing; the rest
    // are the runtime (time-context, tool-jobs, team-message, …). Folding all 80
    // as prompts would put invented prompts on the chart, so this is an exact
    // end-to-end count rather than a smoke assertion.
    const expected = journal.events.filter((event) => {
      if (event.type !== 'user/message') return false
      const source = event.data?.source
      return typeof source === 'object' && source !== null && (source as { kind?: unknown }).kind === 'user'
    }).length
    expect(expected, 'the fixture must still contain human prompts').toBeGreaterThan(0)

    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    const prompts = value.lanes.flatMap((lane) => lane.messages).filter((message) => message.kind === 'user-prompt')
    expect(prompts.map((prompt) => prompt.from.id).every((id) => id === 'user')).toBe(true)
    expect(prompts.length, 'injected user/message events must not become prompts').toBe(expected)
  })

  it('pairs real queue/delivery events so at least one message carries an addressee', async () => {
    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    const messages = value.lanes.flatMap((lane) => lane.messages).filter((message) => message.kind === 'message')
    expect(messages.length, 'the real log carries 56 queued/delivered pairs').toBeGreaterThan(0)
    expect(messages.some((message) => message.to !== undefined), 'a paired delivery must name its target').toBe(true)
    for (const message of messages) {
      if (message.to === undefined) continue
      expect(message.to.kind, 'an addressee is never the human sender').not.toBe('user')
    }
  })

  it('emits only theme tokens the host theme actually DEFINES', async () => {
    // A name that merely matches `--dsw-*` can still be a typo: the browser
    // resolves it to nothing and the bar renders transparent with no error
    // anywhere. The token list is a snapshot of what
    // `@deepseek-ai/dsh-client-ui-theme/lib/client.js` defines (see the
    // fixture's `_source`), so this catches invented names that the shape
    // regex in `tests/contract.spec.ts` cannot.
    //
    // METHOD NOTE: check the DEFINITION source, never a consumer bundle —
    // better-sidebar never references `--dsw-alias-state-idle-primary` or
    // `--dsw-alias-label-primary-inverted`, yet both are defined and were
    // nearly reported as missing.
    const known = new Set(knownThemeTokens())
    expect(known.size, 'the theme snapshot must be populated').toBeGreaterThan(300)

    const value = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(value)
    const emitted = value.lanes.flatMap((lane) => [lane.color.bar, lane.color.on])
    expect(emitted.length).toBeGreaterThan(0)
    const unknown = [...new Set(emitted)].filter((token) => !known.has(token))
    expect(unknown, `these lane colour tokens are not defined by the host theme: ${unknown.join(', ')}`).toEqual([])
  })

  it('the theme-token check discriminates, and the repo fixtures use real tokens', () => {
    const known = new Set(knownThemeTokens())
    // Positive: the tokens the host half emits today.
    for (const token of ['--dsw-alias-state-idle-primary', '--dsw-alias-state-success-primary', '--dsw-alias-label-primary-inverted']) {
      expect(known.has(token), token).toBe(true)
    }
    // Negative: plausible-looking names that are NOT defined. `--dsw-alias-label-inverse`
    // is the trap this file itself fell into before the snapshot existed.
    for (const token of ['--dsw-alias-label-inverse', '--dsw-alias-state-idle-primaryy', '--dsw-alias-brand-primaryy', '--dsw-alias-label-inverted']) {
      expect(known.has(token), token).toBe(false)
    }
    // Keep the repo's own fixtures honest: a fixture that uses an undefined
    // token teaches the wrong example even when no assertion depends on it.
    for (const lane of validTimeline().lanes) {
      expect(known.has(lane.color.bar), `${lane.id} bar`).toBe(true)
      expect(known.has(lane.color.on), `${lane.id} on`).toBe(true)
    }
  })
})

describe('an exchange is drawn on both lanes (task-11)', () => {
  /** Every message span, tagged with the lane it was drawn on. */
  function copies(data: { lanes: { id: string; messages: MessageSpan[] }[] }, kind: MessageSpan['kind']) {
    return data.lanes.flatMap((lane) => lane.messages.filter((message) => message.kind === kind).map((message) => ({ laneId: lane.id, message })))
  }

  /** Group copies by their exchange identity (messageId, or time for prompts). */
  function groups(rows: { laneId: string; message: MessageSpan }[], keyOf: (message: MessageSpan) => string) {
    const map = new Map<string, { laneId: string; message: MessageSpan }[]>()
    for (const row of rows) {
      const key = keyOf(row.message)
      const list = map.get(key)
      if (list === undefined) map.set(key, [row])
      else list.push(row)
    }
    return map
  }

  it('draws a paired exchange exactly twice: sender lane and recipient lane', async () => {
    const data = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(data)
    const byId = groups(copies(data, 'message'), (message) => message.messageId ?? `t${message.time}`)
    expect(byId.size, 'the real log carries exchanges').toBeGreaterThan(0)

    let doubled = 0
    for (const [id, rows] of byId) {
      // Not 1 (the pre-task-11 behaviour: sender lane only), not 3 (a third copy).
      expect(rows.length, `${id} was drawn ${rows.length} time(s)`).toBeLessThanOrEqual(2)
      if (rows.length === 2) {
        doubled += 1
        const lanes = new Set(rows.map((row) => row.laneId))
        expect(lanes.size, `${id} drawn twice in ONE lane (the dedupe key must include laneId)`).toBe(2)
        const { from, to } = rows[0]!.message
        expect(to, `${id} has two copies but no addressee`).toBeDefined()
        expect(lanes).toEqual(new Set([from.id, to?.id]))
      }
    }
    expect(doubled, 'at least one exchange must be double-written (otherwise the feature is off)').toBeGreaterThan(0)
  })

  it('draws a turn exactly once (a turn is "this agent worked", not an exchange)', async () => {
    const data = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(data)
    const turns = groups(copies(data, 'turn'), (message) => message.messageId ?? `t${message.time}`)
    expect(turns.size, 'the real log has turns').toBeGreaterThan(0)
    for (const [key, rows] of turns) expect(rows.length, `turn ${key}`).toBe(1)
  })

  it('draws an orphan delivery once, on the sender lane', async () => {
    const data = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(data)
    const orphans = copies(data, 'message').filter((row) => row.message.to === undefined)
    for (const [key, rows] of groups(orphans, (message) => message.messageId ?? `t${message.time}`)) {
      expect(rows.length, `orphan ${key} must have exactly one copy (no recipient to mirror onto)`).toBe(1)
      expect(rows[0]?.laneId).toBe(rows[0]?.message.from.id)
    }
  })

  it('reports three separate populations: unique exchanges, their copies, and turns', async () => {
    const data = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(data)
    const messageGroups = groups(copies(data, 'message'), (message) => message.messageId ?? `t${message.time}`)
    const promptGroups = groups(copies(data, 'user-prompt'), (message) => `p${message.time}:${message.preview ?? ''}`)
    const unique = messageGroups.size + promptGroups.size
    const messageOrPromptCopies = copies(data, 'message').length + copies(data, 'user-prompt').length
    const turnCopies = copies(data, 'turn').length
    const mirrored = [...messageGroups.values(), ...promptGroups.values()].filter((rows) => rows.length === 2).length

    const note = data.notes.find((line) => /unique message\(s\):/.test(line))
    expect(note, 'the note explaining the copy counts must appear when exchanges are mirrored').toBeDefined()
    // Structural match, not the whole sentence: the wording may be reworded, but
    // the three POPULATIONS and their order are the contract this guard defends.
    const parsed = /(\d+) unique message\(s\): (\d+) message\/prompt copies drawn across lanes[\s\S]*?plus (\d+) turn span\(s\)/.exec(note as string)
    expect(parsed, `unparseable note: ${note}`).not.toBeNull()
    const describedUnique = Number((parsed as RegExpExecArray)[1])
    const describedCopies = Number((parsed as RegExpExecArray)[2])
    const describedTurns = Number((parsed as RegExpExecArray)[3])

    // Each number must equal what a reader can count on the wire for ITS population.
    expect(describedUnique, 'unique = distinct messages + distinct prompts').toBe(unique)
    // F11 REGRESSION LOCK: the copy count is messages + prompts ONLY. It used to
    // include turn placements (141 where only 123 were message/prompt copies),
    // which made the note compare two different populations.
    expect(describedCopies, 'copies must NOT include turns').toBe(messageOrPromptCopies)
    expect(describedTurns, 'turns are reported as their own population').toBe(turnCopies)
    // The three assertions above are RECOUNTS from the lanes, which host-data-2
    // rightly calls the only authoritative check ("do not assert a parity or a
    // decomposition identity"). This last one IS a decomposition, so it is gated
    // on its precondition first: every exchange has at most two copies, therefore
    // `copies - unique` is exactly the number of mirrored exchanges. Parity/
    // doubling formulas were tried and failed on the real 9-lane data (the diff
    // there is 140, not a clean multiple of anything) — so if this ever disagrees,
    // trust the recount, not the identity.
    for (const rows of [...messageGroups.values(), ...promptGroups.values()]) {
      expect(rows.length, 'each exchange is drawn on at most two lanes').toBeLessThanOrEqual(2)
    }
    expect(describedCopies - describedUnique).toBe(mirrored)
    expect(describedCopies).toBeGreaterThan(describedUnique)
  })
})

describe('host invariants published in FINDINGS §18.8', () => {
  const SPEAKER_KINDS = new Set(['user', 'lead', 'teammate', 'system'])
  const MESSAGE_KINDS = new Set(['turn', 'message', 'user-prompt'])

  it('holds all 13 numbered rules on the real board', async () => {
    // host-data-2 published these as the host's contract (verified on 446 real
    // spans) so the renderer does not have to re-derive them. They are asserted
    // here BY NUMBER so a future drift names the rule it broke. Rules 1–12 were
    // already enforced field-by-field by `assertTimeline`; consolidating them
    // here makes the cross-owner contract traceable, and rule 13 was a real gap
    // in this suite until this test existed.
    const data = await buildTimeline(host(), ROOT_SESSION)
    assertTimeline(data)

    const violations: string[] = []
    const messageLanes = new Map<string, Set<string>>()
    for (const lane of data.lanes) {
      // 13: the sentinel lane carries no messages — a CONSTRUCTIVE guarantee, not
      // an observation (verified against the host code, 2026-10-12):
      //   timeline.ts:871  `laneById = new Map(lanes.map(...))`  ← the message pass
      //                    indexes only the ROSTER lanes;
      //   timeline.ts:894/908 every `place()` looks the lane up and returns early
      //                    when it is missing;
      //   timeline.ts:1026-1039 the `unassigned` lane is pushed AFTER that pass and
      //                    never enters `laneById`.
      // So this can only start failing if someone moves the sentinel lane into
      // `laneById` or reorders the two passes — which is exactly the edit this
      // assertion should stop. Keyed on the stable sentinel `id`, never the
      // display `name`.
      if (lane.id === 'unassigned' && lane.messages.length > 0) violations.push('13: unassigned lane carries messages')
      let previousTime = Number.NEGATIVE_INFINITY
      for (const message of lane.messages) {
        if (message.time < previousTime) violations.push(`1: ${message.kind} out of time order in ${lane.id}`) // 1
        previousTime = message.time
        if (message.end !== null && message.end < message.time) violations.push('2: end < time') // 2
        if (!Number.isFinite(message.time)) violations.push('3: non-finite time') // 3
        if (!SPEAKER_KINDS.has(message.from.kind)) violations.push(`4: bad from.kind ${message.from.kind}`) // 4
        if (message.from.id === '' || message.from.name === '') violations.push('5: empty from id/name') // 5
        if (!MESSAGE_KINDS.has(message.kind)) violations.push(`6: bad kind ${message.kind}`) // 6
        if (message.kind === 'turn' && message.to !== undefined) violations.push('7: turn carries to') // 7
        if (message.kind === 'user-prompt' && message.from.id !== 'user') violations.push('8: prompt from.id is not "user"') // 8
        if (message.preview !== undefined && (message.preview.length > MESSAGE_PREVIEW_MAX || /[\r\n]/.test(message.preview))) {
          violations.push('9: preview over-long or multiline') // 9
        }
        if (message.sessionId === '') violations.push('12: empty sessionId') // 12
        if (message.messageId !== undefined) {
          const key = `${message.kind}:${message.messageId}`
          const lanes = messageLanes.get(key) ?? new Set<string>()
          lanes.add(lane.id)
          messageLanes.set(key, lanes)
        }
      }
    }
    for (const [key, lanes] of messageLanes) {
      const kind = key.slice(0, key.indexOf(':'))
      // 10 / 11: a turn is a single-lane fact; an exchange is one or two lanes
      // (ONE is normal: an orphan delivery, or a recipient off the roster).
      if (kind === 'turn' && lanes.size !== 1) violations.push(`10: turn ${key} appears on ${lanes.size} lanes`)
      if (kind === 'message' && (lanes.size < 1 || lanes.size > 2)) violations.push(`11: message ${key} appears on ${lanes.size} lanes`)
    }

    expect(messageLanes.size, 'the real board carries messages to check').toBeGreaterThan(0)
    expect(violations, violations.join('\n')).toEqual([])
  })
})

describe('whole message bodies survive the host path (full-body fixture)', () => {
  // WHY A SECOND FIXTURE: `lead-team-journal.json` clips every content[].text to
  // 90 characters to stay small, so all of its previews are ~91 long and it
  // cannot say anything about the 140-character cap that used to stub every real
  // message. `message-bodies.json` keeps REAL, unclipped bodies (24 of them,
  // spanning the real 600–7135 character range and including the longest one).
  // Asserting the new contract on the clipped fixture would have been a vacuous
  // test — the same lesson as the id-space and channel fixtures.
  const bodies = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/message-bodies.json'), 'utf8')) as {
    events: { type?: string; data?: Record<string, unknown> }[]
  }

  /** The whitespace-collapsed length of every queued body, as the fold computes it. */
  function realBodyLengths(): number[] {
    return bodies.events
      .filter((event) => event.type === 'team/message/queued')
      .map((event) => {
        const content = (event.data?.message as { content?: { text?: string }[] } | undefined)?.content ?? []
        const text = content.map((part) => part.text ?? '').join(' ')
        return text.replace(/\s+/g, ' ').trim().length
      })
  }

  it('reports whole bodies, not 140-character stubs', async () => {
    // The roster MUST stay intact even though the bodies live in the root log:
    // a message is placed on its SENDER's lane, so with `members: []` every
    // teammate-sent message finds no lane and is dropped (my first version of
    // this test saw only the 11 lead-sent bodies and blamed the fixture).
    const data = await buildTimeline(host({ rootEvents: bodies.events }), ROOT_SESSION)
    assertTimeline(data)
    const lengths = data.lanes
      .flatMap((lane) => lane.messages)
      .map((message) => message.preview)
      .filter((preview): preview is string => typeof preview === 'string')
      .map((preview) => preview.length)
      .sort((a, b) => a - b)
    expect(lengths.length, 'the fixture must deliver its bodies').toBeGreaterThanOrEqual(20)

    const median = lengths[Math.floor(lengths.length / 2)] as number
    // RED under the old contract: a 140-character cap made every preview ≤ 140.
    expect(median, `median preview length ${median}`).toBeGreaterThan(140)
    expect(Math.max(...lengths)).toBeGreaterThan(1_000)
    expect(Math.max(...lengths)).toBeLessThanOrEqual(MESSAGE_PREVIEW_MAX)
    // The strongest form, against the fixture's own text rather than a magic
    // number: the longest REAL body arrives complete (whitespace collapsed).
    expect(Math.max(...lengths)).toBe(Math.max(...realBodyLengths()))
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
    // OBSERVED host choice (not a contract requirement, so only the PAIR is
    // asserted): with nothing observable at all it freezes the board at now —
    // `live: false` with a real `range.end` — rather than leaving it live
    // forever. Either choice is legal as long as the pair stays consistent.
    expect(value.live).toBe(value.range.end === null)
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
    // Same ruling as above: only the frozen pair is contractual.
    expect(value.live).toBe(value.range.end === null)
  })
})
