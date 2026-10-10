/**
 * Manual, REAL-DATA self-check for the host fold — NOT part of the test suite.
 *
 * The unit tests in `tests/` must not depend on this machine's session logs, so
 * the end-to-end proof that the fold works on actual DSH 0.2.0-rc.2 logs lives
 * here. It reads the live team's Lead/teammate logs straight off disk, runs the
 * real `foldSessionEvents`, and asserts the invariants the plugin promises
 * (real timestamps only, ascending history, no negative spans, exact actor
 * attribution through `expected_revision`).
 *
 * Run it with Node's type stripping (Node >= 22.6):
 *
 * ```bash
 * cd /Users/lzx/Documents/GitHub/dsh-task-gantt
 * node --experimental-strip-types src/host/dev-verify.mts
 * ```
 *
 * Pass a different workspace slug as argv[2] to point it at another team.
 *
 * Expected shape of the output: a table of folded tasks/members, then a list of
 * `ok : …` lines. Any `FAIL:` line sets a non-zero exit code.
 */
import { execFileSync } from 'node:child_process'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import {
  attributeTransitions,
  dateTaskFromToolCalls,
  foldSessionEvents,
  foldTeamEvents,
  type RawSessionEvent,
} from './fold.ts'

/** Decompress one multi-frame zstd session log and parse it as JSONL. */
function readLog(path: string): RawSessionEvent[] {
  // Node's zlib.zstdDecompressSync stops after the FIRST frame, and these logs
  // are append-only multi-frame streams — the `zstd` CLI is the only reader.
  const text = execFileSync('zstd', ['-d', '-c', path], { maxBuffer: 1 << 29 }).toString('utf8')
  return text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => JSON.parse(line) as RawSessionEvent)
}

let failures = 0

/** Record one assertion. */
function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log('ok  :', message)
  } else {
    console.error('FAIL:', message)
    failures += 1
  }
}

const slug = process.argv[2] ?? '--Users-lzx-Documents-GitHub-dsh-task-gantt--'
const root = join(homedir(), '.dsh', 'sessions', slug)
const dirs = readdirSync(root).filter((name) => statSync(join(root, name)).isDirectory())

interface Loaded {
  id: string
  path: string
  events: RawSessionEvent[]
}

const loaded: Loaded[] = []
for (const dir of dirs) {
  const path = join(root, dir, 'session.v4.jsonl.zstd')
  try {
    loaded.push({ id: dir.replace(/^session-/, ''), path, events: readLog(path) })
  } catch {
    console.warn('skip (unreadable):', path)
  }
}
console.log(`sessions in ${slug}: ${loaded.length}`)

// The Lead is the session with no parentSession in its header.
const lead =
  loaded.find((session) => {
    const header = session.events.find((event) => event.type === 'session') as Record<string, unknown> | undefined
    return header !== undefined && header.parentSession === undefined
  }) ?? loaded[0]

if (lead === undefined) {
  console.error('no session logs found; nothing to check')
  process.exit(0)
}

const fold = foldSessionEvents(lead.events, lead.id)
console.log(`\n=== lead ${lead.id}: ${lead.events.length} events`)
console.log('spans:', fold.activity.spans.length, JSON.stringify(fold.activity.diagnostics))
console.log('sessionCreatedAt:', fold.team.sessionCreatedAt, 'parent:', fold.team.sessionParentId)

for (const task of fold.team.tasks) {
  console.log(
    `  ${task.id} rev${task.snapshot.revision} ${task.snapshot.status}` +
      ` ownerId=${task.snapshot.ownerId ?? '-'}` +
      ` hist=${task.transitions.map((h) => `${h.action}@${h.time}`).join(' -> ')}`,
  )
}
for (const member of fold.team.members) {
  console.log(
    `  member ${member.name} id=${member.id} phase=${member.phase}` +
      ` createdAt=${member.childCreatedAt ?? '-'} firstSeen=${member.firstSeenAt}`,
  )
}

// ---- invariants -----------------------------------------------------------
assert(Number.isFinite(fold.team.sessionCreatedAt), 'lead header createdAt read from the FLAT header event')
assert(fold.team.sessionParentId === undefined, 'lead header has no parentSession')
assert(
  fold.team.tasks.every((task) => task.transitions.every((h) => Number.isFinite(h.time))),
  'every folded transition carries a real epoch-ms time',
)
assert(
  fold.team.tasks.every((task) =>
    task.transitions.every((h, i, all) => i === 0 || (all[i - 1]?.time ?? 0) <= h.time),
  ),
  'transitions are ascending in time',
)
assert(
  fold.activity.spans.every((span) => span.end === null || span.end >= span.start),
  'no span has a negative length',
)
assert(
  fold.activity.spans.every((span) => Number.isFinite(span.start)),
  'no span starts at an invented time',
)

// ---- cross-session actor attribution --------------------------------------
const allCalls = loaded.flatMap((session) => foldSessionEvents(session.events, session.id).toolCalls)
console.log(`\ntool-call rows across all sessions: ${allCalls.length}`)
let attributed = 0
for (const task of fold.team.tasks) {
  const history = attributeTransitions(task.id, task.transitions, allCalls, task.snapshot.subject, lead.id)
  const unique = new Set(history.map((h) => h.sessionId))
  if (unique.size > 1) attributed += 1
  console.log(`  ${task.id}: ${history.map((h) => `${h.action}@${h.sessionId}`).join(' -> ')}`)
}
assert(
  attributed > 0 || fold.team.tasks.length === 0,
  'at least one task was attributed to the teammate that actually moved it',
)

// ---- tolerance scenarios (synthetic, must match the documented rules) ------
const tolerant = foldSessionEvents(
  [
    { type: 'step/start', seq: 0, time: 1000, data: { turn: 1, step: 1 } },
    { type: 'step/start', seq: 1, time: 1000, data: { turn: 1, step: 2 } },
    { type: 'step/end', seq: 2, time: 1000, data: {} },
    { type: 'step/end', seq: 3, time: 5000, data: {} },
    { type: 'turn/end', seq: 4, time: 6000, data: {} },
    { type: 'step/start', seq: 5, time: 7000, data: {} },
  ],
  'synthetic',
)
assert(tolerant.activity.spans.length === 3, 'equal timestamps + orphans + an unclosed step yield 3 spans')
assert(tolerant.activity.diagnostics.orphanCloses === 2, 'two orphan closes counted')
assert(
  tolerant.activity.spans.filter((span) => span.end === null).length === 1,
  'the unclosed step stays open (end: null)',
)

const undated = foldSessionEvents([{ type: 'step/start', seq: 0, data: {} }], 'synthetic')
assert(undated.activity.spans.length === 0, 'an undated event produces no span (a time is never invented)')
assert(undated.activity.diagnostics.undated === 1, 'the undated event is counted')

const empty = foldSessionEvents([], 'synthetic')
assert(empty.activity.spans.length === 0 && empty.team.tasks.length === 0, 'empty input is total, not a throw')

// ---- permutation stability (the fold must not depend on array order) -------
const seqful = lead.events.filter((event) => typeof (event as { seq?: unknown }).seq === 'number')
const shuffled = [...seqful].sort(() => Math.random() - 0.5)
const base = foldSessionEvents(seqful, lead.id)
const permuted = foldSessionEvents(shuffled, lead.id)
assert(
  JSON.stringify(base.activity.spans) === JSON.stringify(permuted.activity.spans),
  'spans are identical after a random permutation of the input',
)
assert(
  JSON.stringify(base.team.tasks.map((task) => task.transitions)) ===
    JSON.stringify(permuted.team.tasks.map((task) => task.transitions)),
  'task history is identical after a random permutation of the input',
)

// ---- full lifecycle through the REAL fold path (no live sample exists yet) --
const snapshot = (
  seq: number,
  time: number,
  revision: number,
  status: 'pending' | 'in_progress' | 'completed',
): RawSessionEvent => ({
  type: 'team/task',
  seq,
  time,
  data: { version: 2, teamId: 'x', task: { id: 'task-9', revision, subject: 's', description: 'd', status, blockedBy: [], writeScopes: [] } },
})
const lifecycle = foldSessionEvents(
  [
    snapshot(0, 10, 1, 'pending'),
    snapshot(1, 20, 2, 'in_progress'),
    snapshot(2, 30, 3, 'completed'),
    snapshot(3, 40, 4, 'pending'),
    // a duplicated tail and a rewound tail must never rewind the state
    snapshot(4, 30, 3, 'completed'),
    snapshot(5, 50, 3, 'pending'),
  ],
  'log-session',
)
const record = lifecycle.team.taskById.get('task-9')
assert(
  record?.transitions.map((h) => h.action).join(',') === 'created,claimed,completed,reopened',
  'the complete/reopen lifecycle folds from raw team/task events',
)
assert(
  record?.snapshot.revision === 4 && record?.snapshot.status === 'pending',
  'a duplicated/rewound tail never rewinds the latest snapshot',
)
assert(lifecycle.team.diagnostics.rewoundTransitions === 2, 'both the duplicate and the rewound snapshot are counted')

// ---- hostile input must degrade, never throw ------------------------------
const hostile = foldSessionEvents(
  [
    { type: 'team/task', seq: 0, time: 1, data: null },
    { type: 'team/task', seq: 1, time: 2, data: { task: 'nope' } },
    { type: 'team/member', seq: 2, time: 3, data: { member: { id: 5 } } },
    { type: 'tool/call', seq: 3, time: 4, data: { name: 'team_task_update', arguments: '{not json' } },
    { type: 'tool/call', seq: 4, time: 5, data: { name: 'team_task_update', arguments: '{"task_id":"x","expected_revision":0,"action":"explode"}' } },
    null as unknown as RawSessionEvent,
  ],
  'hostile',
)
assert(
  hostile.team.tasks.length === 0 && hostile.toolCalls.length === 0 && hostile.activity.spans.length === 0,
  'hostile payloads yield nothing instead of an exception',
)

// ---- brief §3.4 level-2 anchor: date a task from tool calls alone ----------
const level2Calls = [
  { tool: 'team_task_create', action: 'created' as const, time: 100, sessionId: 'lead', seq: 0, subject: 'orphan task' },
  { tool: 'team_task_update', action: 'claimed' as const, time: 200, sessionId: 'm1', seq: 1, taskId: 'task-7', expectedRevision: 1 },
  { tool: 'team_task_update', action: 'completed' as const, time: 300, sessionId: 'm1', seq: 2, taskId: 'task-7', expectedRevision: 2 },
]
const level2 = dateTaskFromToolCalls('task-7', 'orphan task', level2Calls, 'lead')
console.log('level-2 history:', JSON.stringify(level2))
assert(
  level2.map((h) => `${h.action}@${h.time}/rev${h.revision ?? '-'}`).join(' -> ') ===
    'created@100/rev1 -> claimed@200/rev2 -> completed@300/rev3',
  'a task with no journal event is dated from its tool calls (brief §3.4 level 2)',
)
assert(
  dateTaskFromToolCalls('task-404', 'nope', level2Calls, 'lead').length === 0,
  'an unmatched task gets an empty history, never an invented timestamp',
)

// ---- F2 regression (reported by verify, fixed in fold.ts) ------------------
// `subagent/catalog` can create a member row BEFORE its `team/member` row. The
// name index must still be filled, or a board ownerName stops resolving to its
// lane and the task is drawn on `unassigned`.
const catalogFirst = foldTeamEvents(
  [
    { type: 'subagent/catalog', seq: 1, time: 1000, data: { version: 0, childId: 'm-1', childCreatedAt: 1000, mode: 'continuable', label: 'x' } },
    { type: 'team/member', seq: 2, time: 1005, data: { version: 2, teamId: 'r', member: { id: 'm-1', name: 'ui', phase: 'active' } } },
  ],
  'session-lead',
)
assert(catalogFirst.memberIdByName.get('ui') === 'm-1', 'F2: a name is indexed even when subagent/catalog precedes team/member')
assert(catalogFirst.memberById.get('m-1')?.name === 'ui', 'F2: the placeholder row takes the real name from the later team/member event')
assert(catalogFirst.memberById.get('m-1')?.childCreatedAt === 1000, 'F2: the catalog childCreatedAt survives')

const memberFirst = foldTeamEvents(
  [
    { type: 'team/member', seq: 2, time: 1005, data: { version: 2, teamId: 'r', member: { id: 'm-1', name: 'ui', phase: 'active' } } },
    { type: 'subagent/catalog', seq: 1, time: 1000, data: { version: 0, childId: 'm-1', childCreatedAt: 1000, mode: 'continuable', label: 'x' } },
  ],
  'session-lead',
)
assert(memberFirst.memberIdByName.get('ui') === 'm-1', 'F2: the normal ordering still indexes the name')
assert(memberFirst.memberById.get('m-1')?.childCreatedAt === 1000, 'F2: the normal ordering still picks up childCreatedAt')

const catalogOnly = foldTeamEvents(
  [{ type: 'subagent/catalog', seq: 1, time: 1000, data: { version: 0, childId: 'm-1', childCreatedAt: 1000, mode: 'continuable', label: 'x' } }],
  'session-lead',
)
assert(
  catalogOnly.memberById.get('m-1') !== undefined && catalogOnly.memberIdByName.size === 0,
  'F2: a catalog-only member yields a row but contributes no name (its name is genuinely unknown)',
)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1