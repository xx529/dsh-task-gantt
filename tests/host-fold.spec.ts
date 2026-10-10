/**
 * Folding tests for `src/host/fold.ts` (owner: host-data).
 *
 * The fold is the plugin's whole data path: a session log in, spans and dated
 * task history out. It is pure, so it is tested directly — including the
 * tolerance cases the brief calls out as decisive (§3.2/§3.4): a missing
 * `turn/start`, a step with no `step/end` yet, out-of-order input, equal
 * `time` values, and events whose `time` is missing entirely.
 *
 * The fixtures in `helpers/session-fixtures.ts` are distilled copies of REAL
 * log lines, so the shapes under test are the shapes the host actually writes.
 */
import { describe, expect, it } from 'vitest'
import type { ActivitySpan, TaskEvent } from '../src/shared/contract.ts'
import {
  attributeTransitions,
  dateTaskFromToolCalls,
  deriveTaskAction,
  foldActivitySpans,
  foldSessionEvents,
  foldTeamEvents,
  foldToolCallTransitions,
  mergeDiagnostics,
  type RawSessionEvent,
  type TeamTaskSnapshot,
} from '../src/host/fold.ts'
import {
  leadJournal,
  teamMemberEvent,
  teamTaskEvent,
  teamTaskEventWithOwner,
  teammateSpans,
  toolCallEvent,
  subagentCatalogEvent,
  SESSION_HEADER,
} from './helpers/session-fixtures.ts'

const T = 1_791_648_800_000

/** Activity events with explicit times, easy to read. */
function stepStart(time: number, seq: number, step = 1): RawSessionEvent {
  return { type: 'step/start', seq, time, data: { turn: 1, step } }
}
function stepEnd(time: number, seq: number, step = 1): RawSessionEvent {
  return { type: 'step/end', seq, time, data: { turn: 1, step } }
}

/** Every invariant the span fold must never break, for any input. */
function expectSpanInvariants(spans: readonly ActivitySpan[]): void {
  for (const [index, span] of spans.entries()) {
    expect(['turn', 'step'], `span ${index} kind`).toContain(span.kind)
    expect(Number.isFinite(span.start), `span ${index} start`).toBe(true)
    if (span.end !== null) {
      expect(Number.isFinite(span.end), `span ${index} end`).toBe(true)
      // THE clamp: a close is never allowed to produce a negative length.
      expect(span.end, `span ${index} end >= start`).toBeGreaterThanOrEqual(span.start)
    }
    if (index > 0) {
      const previous = spans[index - 1] as ActivitySpan
      expect(span.start, `span ${index} ascending`).toBeGreaterThanOrEqual(previous.start)
    }
  }
}

describe('foldActivitySpans — real teammate log', () => {
  const { spans, diagnostics } = foldActivitySpans(teammateSpans())

  it('produces one turn band and one span per completed step', () => {
    const turns = spans.filter((span) => span.kind === 'turn')
    const steps = spans.filter((span) => span.kind === 'step')
    expect(turns).toHaveLength(1)
    // step/start seq 6→end 20, start 21→end 27, start 35 (open)
    expect(steps).toHaveLength(3)
    expect(steps.map((span) => span.step)).toEqual([1, 2, 4])
  })

  it('leaves the turn open when the log has no turn/end (the real case)', () => {
    const turn = spans.find((span) => span.kind === 'turn')
    expect(turn?.start).toBe(1_791_648_801_688)
    expect(turn?.end, 'a turn with no turn/end is still running').toBeNull()
    expect(diagnostics.openSpans).toBeGreaterThanOrEqual(1)
  })

  it('closes each completed step at its step/end time', () => {
    const steps = spans.filter((span) => span.kind === 'step')
    expect(steps[0]).toMatchObject({ start: 1_791_648_802_860, end: 1_791_648_810_093, turn: 1, step: 1 })
    expect(steps[1]).toMatchObject({ start: 1_791_648_810_642, end: 1_791_648_812_818, turn: 1, step: 2 })
    expect(steps[2]).toMatchObject({ start: 1_791_648_815_232, end: null, step: 4 })
  })

  it('keeps the spans ascending and within the contract', () => {
    expectSpanInvariants(spans)
  })

  it('counts the orphan-free log correctly', () => {
    expect(diagnostics.events).toBe(teammateSpans().length)
    expect(diagnostics.orphanCloses).toBe(0)
  })
})

describe('foldActivitySpans — tolerance cases (brief §3.2)', () => {
  it('still yields step spans when turn/start is missing entirely', () => {
    const { spans } = foldActivitySpans([stepStart(T, 1), stepEnd(T + 100, 2)])
    expect(spans.filter((span) => span.kind === 'turn')).toHaveLength(0)
    expect(spans).toHaveLength(1)
    expect(spans[0]).toMatchObject({ kind: 'step', start: T, end: T + 100 })
  })

  it('leaves a step open (end: null) when step/end never arrives', () => {
    const { spans, diagnostics } = foldActivitySpans([stepStart(T, 1)])
    expect(spans).toHaveLength(1)
    expect(spans[0]).toMatchObject({ kind: 'step', start: T, end: null })
    expect(diagnostics.openSpans).toBe(1)
  })

  it('sorts out-of-order input into the same result as ordered input', () => {
    const ordered = [stepStart(T, 1), stepEnd(T + 50, 2), stepStart(T + 60, 3), stepEnd(T + 90, 4)]
    const shuffled = [stepEnd(T + 90, 4), stepStart(T + 60, 3), stepEnd(T + 50, 2), stepStart(T, 1)]
    expect(foldActivitySpans(shuffled).spans).toEqual(foldActivitySpans(ordered).spans)
    expect(foldActivitySpans(shuffled).diagnostics).toEqual(foldActivitySpans(ordered).diagnostics)
  })

  it('orders events with EQUAL time by seq, deterministically', () => {
    // Two starts at the same instant: the first closes at the second's start
    // (length 0 — never negative), and the order follows `seq`.
    const a: RawSessionEvent = { type: 'step/start', seq: 10, time: T, data: { turn: 1, step: 1 } }
    const b: RawSessionEvent = { type: 'step/start', seq: 11, time: T, data: { turn: 1, step: 2 } }
    const forward = foldActivitySpans([a, b]).spans
    const backward = foldActivitySpans([b, a]).spans
    expect(forward).toEqual(backward)
    expect(forward).toHaveLength(2)
    expect(forward.map((span) => span.end)).toEqual([T, null])
    expect(forward.map((span) => span.step)).toEqual([1, 2])
    expectSpanInvariants(forward)
  })

  it('falls back to the array index when seq is missing, still deterministically', () => {
    const a: RawSessionEvent = { type: 'step/start', time: T }
    const b: RawSessionEvent = { type: 'step/end', time: T + 10 }
    expect(foldActivitySpans([a, b]).spans).toEqual([{ kind: 'step', start: T, end: T + 10 }])
  })

  it('creates no span for an unpaired step/end (an orphan close proves nothing)', () => {
    const { spans, diagnostics } = foldActivitySpans([stepEnd(T, 1), stepEnd(T + 5, 2)])
    expect(spans).toEqual([])
    expect(diagnostics.orphanCloses).toBe(2)
  })

  it('creates no span for an unpaired turn/end', () => {
    const { spans, diagnostics } = foldActivitySpans([{ type: 'turn/end', seq: 1, time: T, data: { turn: 1 } }])
    expect(spans).toEqual([])
    expect(diagnostics.orphanCloses).toBe(1)
  })

  it('paints the turn band before the step bar at the same instant', () => {
    const events: RawSessionEvent[] = [
      { type: 'step/start', seq: 2, time: T, data: { turn: 1, step: 1 } },
      { type: 'turn/start', seq: 1, time: T, data: { turn: 1 } },
    ]
    const kinds = foldActivitySpans(events).spans.map((span) => span.kind)
    expect(kinds).toEqual(['turn', 'step'])
  })

  it('replaces a running step when a second step/start arrives (length 0, not negative)', () => {
    const { spans } = foldActivitySpans([stepStart(T, 1, 1), stepStart(T, 2, 2)])
    expect(spans).toHaveLength(2)
    expect(spans[0]).toMatchObject({ start: T, end: T, step: 1 })
    expect(spans[1]).toMatchObject({ start: T, end: null, step: 2 })
  })

  it('drops events without a usable time and counts them', () => {
    const events: RawSessionEvent[] = [
      { type: 'step/start', seq: 1 },
      { type: 'step/start', seq: 2, time: Number.NaN },
      { type: 'step/start', seq: 3, time: 'soon' },
      stepStart(T, 4),
    ]
    const { spans, diagnostics } = foldActivitySpans(events)
    expect(spans).toHaveLength(1)
    expect(diagnostics.undated).toBe(3)
    expect(diagnostics.malformed).toBe(0)
  })

  it('counts events with no usable type as malformed and ignores them', () => {
    // `unknown[]` on purpose: the fold promises totality for ANY input, so the
    // junk cases must not be narrowed into a shape that excludes them.
    const events: unknown[] = [{}, { type: 42, time: T }, { type: '', time: T }, null, undefined, stepStart(T, 1)]
    const { spans, diagnostics } = foldActivitySpans(events)
    expect(diagnostics.events).toBe(6)
    expect(diagnostics.malformed).toBe(5)
    expect(spans).toHaveLength(1)
  })

  it('ignores non-positive or non-integer turn/step numbers', () => {
    const events: RawSessionEvent[] = [
      { type: 'step/start', seq: 1, time: T, data: { turn: 0, step: -1 } },
      { type: 'step/start', seq: 2, time: T + 10, data: { turn: 1.5, step: 'x' } },
    ]
    const [first, second] = foldActivitySpans(events).spans
    expect(first?.turn).toBeUndefined()
    expect(first?.step).toBeUndefined()
    expect(second?.turn).toBeUndefined()
    expect(second?.step).toBeUndefined()
  })

  it('returns an empty fold for an empty log', () => {
    const folded = foldActivitySpans([])
    expect(folded.spans).toEqual([])
    expect(folded.diagnostics).toEqual({ events: 0, malformed: 0, undated: 0, orphanCloses: 0, openSpans: 0, rewoundTransitions: 0 })
  })
})

describe('foldActivitySpans — totality (never throws, invariants hold)', () => {
  it('survives junk payloads', () => {
    const junk: unknown[] = [
      null,
      undefined,
      42,
      'step/start',
      [],
      { type: 'step/start', time: T, data: 'nope' },
      { type: 'step/start', time: T, data: [] },
      { type: 'step/end', seq: Number.NaN, time: T + 1 },
      { type: 'turn/start', time: T, data: { turn: Number.POSITIVE_INFINITY } },
      { type: 'turn/end', time: T - 1 },
      { type: 'step/start', time: -5 },
    ]
    const folded = foldActivitySpans(junk)
    expectSpanInvariants(folded.spans)
  })

  it('holds every invariant over a deterministic pseudo-random corpus', () => {
    // A tiny LCG, so the corpus is reproducible without a dependency.
    let seed = 123456789
    const next = (): number => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    const types = ['step/start', 'step/end', 'turn/start', 'turn/end', 'assistant/message', '', 'nonsense']
    for (let round = 0; round < 40; round += 1) {
      const events: RawSessionEvent[] = []
      for (let index = 0; index < 30; index += 1) {
        const roll = next()
        const time = roll < 0.1 ? (next() < 0.5 ? Number.NaN : undefined) : T + Math.floor(next() * 1000)
        const type = types[Math.floor(next() * types.length)]
        events.push({ type, seq: Math.floor(next() * 50), time, data: { turn: Math.floor(next() * 4), step: Math.floor(next() * 4) } })
      }
      const folded = foldActivitySpans(events)
      expectSpanInvariants(folded.spans)
      // Determinism: the same input twice gives the same output.
      expect(foldActivitySpans(events)).toEqual(folded)
    }
  })
})

describe('deriveTaskAction', () => {
  const snapshot = (revision: number, status: TeamTaskSnapshot['status']): TeamTaskSnapshot => ({
    id: 'task-1',
    revision,
    subject: 's',
    description: 'd',
    status,
    blockedBy: [],
    writeScopes: [],
  })

  it('classifies revision 1 as created', () => {
    expect(deriveTaskAction(undefined, snapshot(1, 'pending'))).toBe('created')
  })

  it('classifies a mid-stream first snapshot by its status', () => {
    expect(deriveTaskAction(undefined, snapshot(4, 'in_progress'))).toBe('claimed')
    expect(deriveTaskAction(undefined, snapshot(4, 'completed'))).toBe('completed')
    expect(deriveTaskAction(undefined, snapshot(4, 'pending'))).toBe('updated')
  })

  it('maps the status deltas', () => {
    expect(deriveTaskAction(snapshot(1, 'pending'), snapshot(2, 'in_progress'))).toBe('claimed')
    expect(deriveTaskAction(snapshot(2, 'in_progress'), snapshot(3, 'completed'))).toBe('completed')
    expect(deriveTaskAction(snapshot(3, 'completed'), snapshot(4, 'in_progress'))).toBe('reopened')
    expect(deriveTaskAction(snapshot(1, 'pending'), snapshot(2, 'pending'))).toBe('updated')
  })
})

describe('foldTeamEvents — durable journal replay', () => {
  const folded = foldTeamEvents(leadJournal(), 'session-lead')

  it('reads the flat session header (id / createdAt / parent)', () => {
    expect(folded.sessionId).toBe('session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99')
    expect(folded.sessionCreatedAt).toBe(1_791_647_755_015)
    expect(folded.sessionParentId).toBeUndefined()
  })

  it('builds one dated transition per accepted snapshot, ascending by time', () => {
    const task1 = folded.taskById.get('task-1')
    expect(task1?.createdAt).toBe(1_791_648_711_980)
    expect(task1?.snapshot).toMatchObject({ revision: 2, status: 'in_progress' })
    const history = task1?.transitions ?? []
    expect(history.map((event) => event.action)).toEqual(['created', 'claimed'])
    expect(history.map((event) => event.revision)).toEqual([1, 2])
    for (let index = 1; index < history.length; index += 1) {
      expect((history[index] as TaskEvent).time).toBeGreaterThanOrEqual((history[index - 1] as TaskEvent).time)
    }
  })

  it('keeps every transition attributable to a session id', () => {
    for (const task of folded.tasks) {
      for (const event of task.transitions) expect(event.sessionId).toBe('session-lead')
    }
  })

  it('records the real event shape: no ownerId exists, so no owner leaks in', () => {
    // Verified on the real Lead log: `data.task` has exactly seven keys and no
    // owner field. A defensive reader must therefore report undefined.
    expect(folded.taskById.get('task-1')?.snapshot.ownerId).toBeUndefined()
  })

  it('reads ownerId when a log happens to carry it', () => {
    const events = [
      teamTaskEventWithOwner({ seq: 1, time: T, id: 'task-9', revision: 1, status: 'pending', ownerId: 'member-1' }),
      teamTaskEventWithOwner({ seq: 2, time: T + 5, id: 'task-9', revision: 2, status: 'in_progress', ownerId: 'member-2' }),
    ]
    const team = foldTeamEvents(events, 'session-lead')
    expect(team.taskById.get('task-9')?.snapshot.ownerId).toBe('member-2')
  })

  it('folds the roster: last phase wins, phases in log order, name → session id', () => {
    const member = folded.memberById.get('66b9735d-0000-0000-0000-000000000001')
    expect(member?.name).toBe('packaging')
    expect(member?.phase).toBe('active')
    expect(member?.phases.map((entry) => entry.phase)).toEqual(['provisioning', 'active'])
    expect(member?.firstSeenAt).toBe(1_791_648_739_342)
    expect(member?.lastSeenAt).toBe(1_791_648_745_015)
    expect(member?.childCreatedAt).toBe(1_791_648_739_342)
    expect(folded.memberIdByName.get('packaging')).toBe('66b9735d-0000-0000-0000-000000000001')
  })

  it('preserves the child session id: the lane ↔ log mapping', () => {
    // The member id IS the teammate's session id, so this map is what lets the
    // host open each lane's own log.
    for (const member of folded.members) expect(member.id).toMatch(/^[0-9a-f-]{36}$/)
  })

  it('records a member phase history that includes a failure error when present', () => {
    const events = [
      teamMemberEvent({ seq: 1, time: T, id: 'm-1', name: 'ui', phase: 'provisioning' }),
      teamMemberEvent({ seq: 2, time: T + 10, id: 'm-1', name: 'ui', phase: 'failed', error: 'spawn failed' }),
    ]
    const team = foldTeamEvents(events, 'session-lead')
    const member = team.memberById.get('m-1')
    expect(member?.phase).toBe('failed')
    expect(member?.error).toBe('spawn failed')
  })

  it('ignores a snapshot whose revision does not advance', () => {
    const events = [
      teamTaskEvent({ seq: 1, time: T, id: 'task-x', revision: 1, status: 'pending' }),
      teamTaskEvent({ seq: 2, time: T + 5, id: 'task-x', revision: 2, status: 'in_progress' }),
      teamTaskEvent({ seq: 3, time: T + 10, id: 'task-x', revision: 2, status: 'completed' }),
      teamTaskEvent({ seq: 4, time: T + 15, id: 'task-x', revision: 1, status: 'pending' }),
    ]
    const team = foldTeamEvents(events, 'session-lead')
    const record = team.taskById.get('task-x')
    expect(record?.snapshot).toMatchObject({ revision: 2, status: 'in_progress' })
    expect(record?.transitions.map((event) => event.action)).toEqual(['created', 'claimed'])
    expect(team.diagnostics.rewoundTransitions).toBe(2)
  })

  it('orders transitions by time even when the log order disagrees', () => {
    const events = [
      teamTaskEvent({ seq: 5, time: T + 100, id: 'task-y', revision: 2, status: 'in_progress' }),
      teamTaskEvent({ seq: 1, time: T, id: 'task-y', revision: 1, status: 'pending' }),
    ]
    const record = foldTeamEvents(events, 'session-lead').taskById.get('task-y')
    // Log order (seq) drives acceptance: rev 2 first, so rev 1 is a rewind.
    expect(record?.snapshot.revision).toBe(2)
    for (let index = 1; index < (record?.transitions.length ?? 0); index += 1) {
      const previous = record?.transitions[index - 1] as TaskEvent
      const current = record?.transitions[index] as TaskEvent
      expect(current.time).toBeGreaterThanOrEqual(previous.time)
    }
  })

  it('refuses a payload with an unknown status (never invents a state)', () => {
    const bad = teamTaskEvent({ seq: 1, time: T, id: 'task-z', revision: 1, status: 'pending' })
    ;((bad.data as { task: Record<string, unknown> }).task).status = 'archived'
    const team = foldTeamEvents([bad], 'session-lead')
    expect(team.tasks).toEqual([])
  })

  it('refuses revision 0 (revision is a positive integer)', () => {
    const team = foldTeamEvents([teamTaskEvent({ seq: 1, time: T, id: 'task-0', revision: 0, status: 'pending' })], 's')
    expect(team.tasks).toEqual([])
  })

  it('reads a child session header parent link', () => {
    const team = foldTeamEvents([{ type: 'session', id: 'child', createdAt: T, parentSession: 'session-lead' }], 'child')
    expect(team.sessionId).toBe('child')
    expect(team.sessionParentId).toBe('session-lead')
  })

  it('is deterministic under input permutation (seq keeps the order)', () => {
    const journal = leadJournal()
    const shuffled = [...journal].reverse()
    const forward = foldTeamEvents(journal, 'session-lead')
    const backward = foldTeamEvents(shuffled, 'session-lead')
    expect(backward.tasks.map((task) => task.id).sort()).toEqual(forward.tasks.map((task) => task.id).sort())
    for (const [id, record] of forward.taskById) {
      const other = backward.taskById.get(id)
      expect(other?.snapshot).toEqual(record.snapshot)
      expect(other?.transitions).toEqual(record.transitions)
    }
  })

  it('never throws on junk', () => {
    const junk: unknown[] = [null, 7, 'team/task', { type: 'team/task' }, { type: 'team/task', time: T, data: {} }, { type: 'team/member', time: T, data: { member: 3 } }, []]
    expect(() => foldTeamEvents(junk, 's')).not.toThrow()
    expect(foldTeamEvents(junk, 's').tasks).toEqual([])
  })

  it('handles an empty log', () => {
    const team = foldTeamEvents([], 's')
    expect(team.tasks).toEqual([])
    expect(team.members).toEqual([])
    expect(team.sessionId).toBeUndefined()
  })
})

describe('foldToolCallTransitions — the dated call index', () => {
  it('maps the create call and every supported update action', () => {
    const events = [
      toolCallEvent({ seq: 1, time: T, name: 'team_task_create', args: { subject: 's1', description: 'd' } }),
      toolCallEvent({ seq: 2, time: T + 1, name: 'team_task_update', args: { task_id: 'task-1', expected_revision: 1, action: 'claim' } }),
      toolCallEvent({ seq: 3, time: T + 2, name: 'team_task_update', args: { task_id: 'task-1', expected_revision: 2, action: 'complete' } }),
      toolCallEvent({ seq: 4, time: T + 3, name: 'team_task_update', args: { task_id: 'task-1', expected_revision: 3, action: 'reopen' } }),
      toolCallEvent({ seq: 5, time: T + 4, name: 'team_task_update', args: { task_id: 'task-1', expected_revision: 4, action: 'edit' } }),
    ]
    const rows = foldToolCallTransitions(events, 'session-x')
    expect(rows.map((row) => row.action)).toEqual(['created', 'claimed', 'completed', 'reopened', 'updated'])
    expect(rows[0]?.subject).toBe('s1')
    expect(rows[1]).toMatchObject({ taskId: 'task-1', expectedRevision: 1 })
    for (const row of rows) expect(row.sessionId).toBe('session-x')
  })

  it('drops unknown actions, unknown tools, undated calls and unparseable arguments', () => {
    const events: RawSessionEvent[] = [
      toolCallEvent({ seq: 1, time: T, name: 'team_task_update', args: { task_id: 't', action: 'explode' } }),
      toolCallEvent({ seq: 2, time: T, name: 'bash', args: { command: 'ls' } }),
      toolCallEvent({ seq: 3, time: T, name: 'team_task_update', args: '{not json' }),
      toolCallEvent({ seq: 4, time: T, name: 'team_task_update', args: '[1,2]' }),
      toolCallEvent({ seq: 5, name: 'team_task_update', args: { task_id: 't', action: 'claim' } }),
      { type: 'tool/call', seq: 6, time: T, data: { name: 'team_task_update' } },
    ]
    expect(foldToolCallTransitions(events, 's')).toEqual([])
  })

  it('keeps a call with an action but no task id (best-effort rows stay)', () => {
    const rows = foldToolCallTransitions([toolCallEvent({ seq: 1, time: T, name: 'team_task_update', args: { action: 'claim' } })], 's')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.taskId).toBeUndefined()
  })

  it('is deterministic and ascending by time', () => {
    const journal = leadJournal()
    const rows = foldToolCallTransitions([...journal].reverse(), 'session-lead')
    expect(rows.map((row) => row.time)).toEqual([...rows.map((row) => row.time)].sort((a, b) => a - b))
    expect(rows.map((row) => row.tool)).toEqual(['team_task_create', 'team_task_create'])
  })
})

describe('attributeTransitions — who did it', () => {
  const transitions: TaskEvent[] = [
    { time: T, action: 'created', revision: 1, sessionId: 'session-lead' },
    { time: T + 100, action: 'claimed', revision: 2, sessionId: 'session-lead' },
    { time: T + 200, action: 'completed', revision: 3, sessionId: 'session-lead' },
  ]

  it('matches an update to the caller through the CAS revision', () => {
    const calls = [
      { tool: 'team_task_create', action: 'created' as const, time: T, sessionId: 'session-lead', subject: 'subject of task-1', seq: 1 },
      { tool: 'team_task_update', action: 'claimed' as const, time: T + 100, sessionId: 'session-packaging', taskId: 'task-1', expectedRevision: 1, seq: 2 },
      { tool: 'team_task_update', action: 'completed' as const, time: T + 200, sessionId: 'session-packaging', taskId: 'task-1', expectedRevision: 2, seq: 3 },
    ]
    const attributed = attributeTransitions('task-1', transitions, calls, 'subject of task-1', 'session-lead')
    expect(attributed.map((event) => event.sessionId)).toEqual(['session-lead', 'session-packaging', 'session-packaging'])
  })

  it('refuses an ambiguous create-subject match and keeps the fallback', () => {
    const calls = [
      { tool: 'team_task_create', action: 'created' as const, time: T, sessionId: 'a', subject: 'same', seq: 1 },
      { tool: 'team_task_create', action: 'created' as const, time: T + 1, sessionId: 'b', subject: 'same', seq: 2 },
    ]
    const attributed = attributeTransitions('task-1', [transitions[0] as TaskEvent], calls, 'same', 'session-lead')
    expect(attributed[0]?.sessionId).toBe('session-lead')
  })

  it('keeps every other field of the transition', () => {
    const [first] = attributeTransitions('task-1', transitions, [], 'subject of task-1', 'session-lead')
    expect(first).toEqual({ time: T, action: 'created', revision: 1, sessionId: 'session-lead' })
  })
})

describe('dateTaskFromToolCalls — level-2 dating', () => {
  const calls = [
    { tool: 'team_task_create', action: 'created' as const, time: T, sessionId: 'session-lead', subject: 'only-one', seq: 1 },
    { tool: 'team_task_update', action: 'claimed' as const, time: T + 10, sessionId: 'session-a', taskId: 'task-1', expectedRevision: 1, seq: 2 },
    { tool: 'team_task_update', action: 'completed' as const, time: T + 20, sessionId: 'session-a', taskId: 'task-1', expectedRevision: 2, seq: 3 },
  ]

  it('dates a task from its own update calls, with revision = expected + 1', () => {
    const history = dateTaskFromToolCalls('task-1', 'task one', calls, 'session-lead')
    expect(history.map((event) => event.action)).toEqual(['claimed', 'completed'])
    expect(history.map((event) => event.revision)).toEqual([2, 3])
    expect(history.map((event) => event.sessionId)).toEqual(['session-a', 'session-a'])
  })

  it('accepts an unambiguous create matched by subject and stamps revision 1', () => {
    const history = dateTaskFromToolCalls('task-new', 'only-one', calls, 'session-lead')
    expect(history).toHaveLength(1)
    expect(history[0]).toMatchObject({ action: 'created', revision: 1, sessionId: 'session-lead' })
  })

  it('refuses an ambiguous create-subject match', () => {
    const ambiguous = [
      ...calls,
      { tool: 'team_task_create', action: 'created' as const, time: T + 1, sessionId: 'session-b', subject: 'only-one', seq: 4 },
    ]
    expect(dateTaskFromToolCalls('task-new', 'only-one', ambiguous, 'session-lead')).toEqual([])
  })

  it('returns [] when nothing can be dated (never invents a timestamp)', () => {
    expect(dateTaskFromToolCalls('task-unknown', 'nope', calls, 'session-lead')).toEqual([])
  })

  it('returns history ascending by time', () => {
    const history = dateTaskFromToolCalls('task-1', 'task one', [...calls].reverse(), 'session-lead')
    expect(history.map((event) => event.time)).toEqual([T + 10, T + 20])
  })
})

describe('foldSessionEvents / mergeDiagnostics', () => {
  it('runs all three folds over one log', () => {
    const folded = foldSessionEvents(teammateSpans(), 'session-verify')
    expect(folded.sessionId).toBe('session-verify')
    expect(folded.activity.spans.length).toBeGreaterThan(0)
    expect(folded.toolCalls).toHaveLength(1)
    expect(folded.team.sessionId).toBe('f828dda6-e91d-4dcc-bbf0-9a9d73d9555e')
  })

  it('sums diagnostics across sessions', () => {
    const merged = mergeDiagnostics([foldActivitySpans([]).diagnostics, foldActivitySpans([{ type: 'step/start', seq: 1 }]).diagnostics])
    expect(merged.events).toBe(1)
    expect(merged.undated).toBe(1)
    expect(mergeDiagnostics([])).toEqual({ events: 0, malformed: 0, undated: 0, orphanCloses: 0, openSpans: 0, rewoundTransitions: 0 })
  })

  it('uses only the frozen contract types (an ActivitySpan from the fold validates)', () => {
    const spans: ActivitySpan[] = foldActivitySpans(teammateSpans()).spans
    for (const span of spans) {
      expect(Object.keys(span).every((key) => ['kind', 'start', 'end', 'turn', 'step'].includes(key))).toBe(true)
    }
  })
})

describe('fixture reality check', () => {
  it('the session header is flat, not wrapped in data (as the real log writes it)', () => {
    expect(SESSION_HEADER.type).toBe('session')
    expect('data' in SESSION_HEADER).toBe(false)
    expect((SESSION_HEADER as { createdAt?: unknown }).createdAt).toBe(1_791_647_755_015)
  })

  it('a team/task snapshot carries exactly the seven real keys', () => {
    const event = teamTaskEvent({ seq: 1, time: T, id: 'task-1', revision: 1, status: 'pending' })
    const task = (event.data as { task: Record<string, unknown> }).task
    expect(Object.keys(task).sort()).toEqual(['blockedBy', 'description', 'id', 'revision', 'status', 'subject', 'writeScopes'])
  })

  it('a team/member event maps name → the child session id', () => {
    const event = teamMemberEvent({ seq: 1, time: T, id: 'ab12', name: 'ui', phase: 'active' })
    const member = (event.data as { member: Record<string, unknown> }).member
    expect(Object.keys(member).sort()).toEqual(['context', 'description', 'id', 'name', 'phase', 'provider'])
  })

  it('a subagent/catalog event carries childId + childCreatedAt', () => {
    const event = subagentCatalogEvent({ seq: 1, time: T, childId: 'ab12', childCreatedAt: T - 5 })
    expect(event.data).toMatchObject({ childId: 'ab12', childCreatedAt: T - 5 })
  })
})

describe('KNOWN DEFECT (reported to host-data, not enforced)', () => {
  /**
   * FINDING (verified by experiment, 2026-10-11): if a member's
   * `subagent/catalog` event is written BEFORE its `team/member` event, the
   * catalog branch creates the member record and pushes it into `members`, and
   * the later `team/member` branch then skips the
   * `if (record === undefined)` block that is the ONLY place
   * `memberIdByName.set(name, id)` happens. Result: `memberById` is correct but
   * `memberIdByName` stays empty for that member.
   *
   * Impact: `timeline.ts` maps a board `ownerName` to a lane through
   * `memberIdByName`, so with `agentTeams` unavailable (the board-less path) a
   * task owned by that member is drawn on the `unassigned` lane instead of the
   * teammate's lane. In the ONE real log measured on this machine every
   * `team/member` row precedes its `subagent/catalog` row, and the live
   * projection independently fills `memberIdByName`, so the defect was latent —
   * not observable live, but real.
   *
   * FIXED by host-data (fold.ts): the `memberIdByName` write moved out of the
   * `record === undefined` branch, so the index is filled whenever the name is
   * known and not already mapped. Un-skipped at host-data's request.
   */
  it('indexes a member name when subagent/catalog precedes team/member', () => {
    const events = [
      subagentCatalogEvent({ seq: 1, time: T, childId: 'm-1', childCreatedAt: T }),
      teamMemberEvent({ seq: 2, time: T + 5, id: 'm-1', name: 'ui', phase: 'active' }),
    ]
    const team = foldTeamEvents(events, 'session-lead')
    expect(team.memberById.get('m-1')?.name).toBe('ui')
    expect(team.memberIdByName.get('ui')).toBe('m-1')
  })
})
