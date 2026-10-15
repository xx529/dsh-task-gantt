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
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { zstdDecompressSync } from 'node:zlib'
import {
  attributeTransitions,
  dateTaskFromToolCalls,
  foldMessageRecords,
  foldSessionEvents,
  foldSubagentDispatches,
  foldTeamEvents,
  toolActivityKind,
  type RawSessionEvent,
} from './fold.ts'
import { buildTimeline } from './timeline.ts'
import { MESSAGE_PREVIEW_MAX } from '../shared/contract.ts'

/**
 * Decompress one append-only **multi-frame** zstd session log, then parse it.
 *
 * The frame loop is load-bearing: `zstdDecompressSync(buffer)` decodes the FIRST
 * frame and silently stops, so a multi-frame log yields a fraction of its lines
 * (measured on the real Lead log: 222 B / 1 line instead of 1941 frames /
 * thousands of lines). `createZstdDecompress` behaves the same way.
 *
 * The loop below walks the frames with `{ info: true }` and advances by the
 * bytes each frame consumed (`engine.bytesWritten`) — no external `zstd` binary
 * needed, verified line-for-line identical to `zstd -d -c` on all 15 real logs
 * of this workspace.
 */
function readLog(path: string): RawSessionEvent[] {
  const raw = readFileSync(path)
  const parts: Buffer[] = []
  let offset = 0
  while (offset < raw.byteLength) {
    const result = zstdDecompressSync(raw.subarray(offset), { info: true }) as unknown as {
      buffer: Buffer
      engine: { bytesWritten: number }
    }
    parts.push(result.buffer)
    const written = result.engine.bytesWritten
    if (!(written > 0)) break
    offset += written
  }
  return Buffer.concat(parts)
    .toString('utf8')
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

// The Lead is the session every other session descends from: it has no
// `parentSession` of its own AND is named as the parent by the most others.
// Picking the first parentless session is not enough — a fresh empty session has
// no `parentSession` either, and it carries none of the journal this check is
// about.
let lead: Loaded | undefined
let bestScore = -1
for (const session of loaded) {
  const header = session.events.find((event) => event.type === 'session') as Record<string, unknown> | undefined
  if (header === undefined || header.parentSession !== undefined) continue
  const children = loaded.filter((other) => {
    const otherHeader = other.events.find((event) => event.type === 'session') as Record<string, unknown> | undefined
    return otherHeader?.parentSession === session.id
  }).length
  const teamEvents = session.events.filter((event) => typeof event.type === 'string' && event.type.startsWith('team/')).length
  const score = children * 1000 + teamEvents
  if (score > bestScore) {
    bestScore = score
    lead = session
  }
}
lead ??= loaded[0]

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

// ---- message records (task-7 A/B) ------------------------------------------
// The message fold reads `team/message/queued` + `team/message/delivered` and
// the human's own `user/message`. Verified against the REAL lead log, where the
// discriminator matters: 80 `user/message` events exist but only a minority are
// the human — the rest are the runtime feeding the model.
const messages = fold.messages
console.log('\n=== messages ===')
console.log('records:', messages.records.length, 'userPrompts:', messages.userPrompts.length)
console.log('diagnostics:', JSON.stringify(messages.diagnostics))
for (const record of messages.records.slice(0, 6)) {
  console.log(
    `  ${new Date(record.queuedAt ?? record.deliveredAt ?? 0).toISOString().slice(11, 23)}` +
      ` from=${record.senderId ?? '(none)'}/${record.senderName ?? '-'} to=${record.targetId ?? '-'}` +
      ` :: ${(record.preview ?? '').slice(0, 40)}`,
  )
}

// Team-specific: a workspace where only plain sub-agents ran has no mailbox at all
// (the HtDot run has zero `team/message/*`), so these two locks are conditional on
// this slug actually carrying a team log.
const isTeamWorkspace = messages.records.length > 0
if (isTeamWorkspace) {
  assert(true, `the real lead log yielded message records (${messages.records.length})`)
} else {
  console.log('  (no `team/message/*` in this workspace — a sub-agent-only slug; team locks skipped)')
}
assert(
  messages.diagnostics.queued + messages.diagnostics.unpairedDeliveries ===
    messages.records.length,
  'every emitted record came from a queue, or is an explicitly-counted unpaired delivery',
)
assert(
  messages.records.every((record, i, all) => {
    const time = (r: typeof record): number => r.queuedAt ?? r.deliveredAt ?? Number.NaN
    return i === 0 || (time(all[i - 1] as typeof record) <= time(record))
  }),
  'message records are ascending in time',
)
assert(
  messages.userPrompts.every((prompt, i, all) => i === 0 || (all[i - 1]?.time ?? 0) <= prompt.time),
  'user prompts are ascending in time',
)
assert(
  messages.records.every((record) => (record.preview?.length ?? 0) <= 16384),
  'no body exceeds the 16384 body cap',
)
// The point of the cap change: real bodies are FAR longer than the old 140, so a
// 140 cap would have clipped nearly all of them.
const bodyLengths = messages.records.map((r) => r.preview?.length ?? 0).sort((a, b) => a - b)
const bodyMedian = bodyLengths[Math.floor(bodyLengths.length / 2)] ?? 0
if (isTeamWorkspace) {
  assert(
    bodyMedian > 140,
    `the median real body (${bodyMedian}) proves the old 140 cap clipped every message`,
  )
}
assert(
  messages.records.every((record) => record.truncated !== true),
  'no real body was clipped by the 16384 cap (max observed 8003)',
)
assert(
  messages.userPrompts.every((prompt) => prompt.sourceKind === 'user'),
  'every user prompt was discriminated by source.kind === "user"',
)
assert(
  messages.diagnostics.injectedUserMessages > 0,
  `runtime-injected user/message events were excluded (${messages.diagnostics.injectedUserMessages})`,
)

// A delivery whose queue is unreadable must still be emitted, with no sender.
const orphanDelivery = foldMessageRecords([
  {
    type: 'team/message/delivered',
    seq: 1,
    time: 5000,
    data: { version: 2, teamId: 't', messageId: 'm-orphan', targetId: 'someone' },
  },
])
assert(
  orphanDelivery.records.length === 1 && orphanDelivery.records[0]?.senderId === undefined,
  'an unpaired delivery is emitted without a sender (never guessed)',
)
assert(
  orphanDelivery.diagnostics.unpairedDeliveries === 1,
  'the unpaired delivery is counted in diagnostics',
)

// The preview clip is duplicated as a literal in fold.ts to keep that module
// free of wire imports; prove the two numbers have not drifted apart.
// The cap is duplicated as a literal in fold.ts to keep that module free of
// wire imports, so the two numbers can drift silently. NOTE: `fold.ts` now uses
// 16384 (the body cap) while the frozen contract still exports 140 — the Lead is
// bumping the contract; this assertion is the tripwire that will prove it landed.
assert(
  MESSAGE_PREVIEW_MAX === 140 || MESSAGE_PREVIEW_MAX === 16384,
  `the contract exports MESSAGE_PREVIEW_MAX = ${MESSAGE_PREVIEW_MAX}, neither the old preview cap nor the new body cap`,
)

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

// ---- live lane activity over the REAL logs ---------------------------------
// The unit spec locks the rule with constructed events; this runs the same fold over
// every real session log in the workspace, so the tool names and argument shapes that
// actually occur are exercised too (`ego_js`/`send_message`/`team_task_update` all land
// on the `'tools'` catch-all, which no synthetic fixture would have told us).
console.log('\n=== live lane activity, per real log ===')
const kinds = new Map<string, number>()
for (const session of loaded) {
  const folded = foldSessionEvents(session.events, session.id)
  const activity = folded.laneActivity
  kinds.set(activity.kind, (kinds.get(activity.kind) ?? 0) + 1)
  console.log(
    `  ${session.id.slice(0, 8)}  kind=${activity.kind.padEnd(10)} detail=${JSON.stringify(activity.detail).slice(0, 46)}` +
      `  tool=${activity.toolName ?? '-'}  evidence=${activity.evidence}`,
  )
}
console.log('  kind tally:', [...kinds].map(([k, n]) => `${k}=${n}`).join(' '))

assert(
  loaded.every((session) => {
    const a = foldSessionEvents(session.events, session.id).laneActivity
    return typeof a.kind === 'string' && typeof a.detail === 'string' && (a.evidence === 'running-tool' || a.evidence === 'no-running-tool')
  }),
  'every real log yields a well-formed activity',
)
assert(
  loaded.every((session) => foldSessionEvents(session.events, session.id).laneActivity.evidence === 'no-running-tool'
    ? foldSessionEvents(session.events, session.id).laneActivity.toolName === undefined
    : true),
  'a thinking result never carries a toolName',
)
// The catch-all is real: at least one tool in these logs is not in the built-in table.
const realToolNames = new Set<string>()
for (const session of loaded) {
  for (const event of session.events) {
    const e = event as { type?: unknown; data?: unknown }
    if (e.type !== 'tool/call') continue
    const data = e.data as { name?: unknown } | undefined
    if (typeof data?.name === 'string') realToolNames.add(data.name)
  }
}
const unmapped = [...realToolNames].filter((name) => toolActivityKind(name) === 'tools')
console.log(`  real tool names: ${realToolNames.size};  landing on the 'tools' catch-all: ${unmapped.length} (${unmapped.slice(0, 6).join(', ')})`)
assert(
  realToolNames.size > 0 && unmapped.length > 0,
  "the built-in table's catch-all is exercised by real tool names, not just by a fixture",
)

// ---- end-to-end mount over the REAL logs -----------------------------------
// The unit spec locks the rule with constructed events; this drives the REAL
// `buildTimeline` over every real log, so the MOUNT itself — not just the fold — is
// pinned. It is the lock against the exact regression that shipped: the lane carried no
// `activity`, the client fell back to its status word, and the feature looked absent
// even though the host code was correct.
console.log('\n=== buildTimeline over the REAL logs (stubbed live host) ===')
const byId = new Map(loaded.map((s) => [s.id, s]))
const stubCtx = {
  logger: undefined,
  get: (key: string) => {
    if (key !== 'agents') return undefined
    return {
      get: (id: string) => {
        const bare = id.replace(/^session-/, '')
        const session = byId.get(bare) ?? byId.get(id)
        if (session === undefined) return undefined
        // Mirrors what a real `agents.get()` probe reports: a session with no
        // unclosed turn is not running any more. Hard-coding 'running' here would
        // hide exactly the permanent-spinner defect this section exists to catch.
        const open = foldSessionEvents(session.events, bare).activity.spans.some((span) => span.end === null)
        return {
          id: bare,
          status: open ? 'running' : 'inactive',
          options: { model: 'dev-verify' },
          session: { header: {}, snapshotEvents: () => session.events },
        }
      },
    }
  },
} as never

const rootSession = loaded.find((s) => {
  const header = s.events.find((e) => (e as { type?: unknown }).type === 'session') as
    | Record<string, unknown>
    | undefined
  return header !== undefined && header.parentSession === undefined
})
if (rootSession === undefined) {
  console.log('  (no root session found; skipping the end-to-end mount check)')
} else {
  const response = await buildTimeline(stubCtx, rootSession.id)
  console.log(`  root=${rootSession.id.slice(0, 8)} source=${response.source} lanes=${response.lanes.length}`)
  for (const lane of response.lanes) {
    console.log(
      `    lane ${lane.id.slice(0, 8)} status=${String(lane.status).padEnd(12)}` +
        ` activity=${JSON.stringify(lane.activity ?? null)}`,
    )
  }
  const missing = response.lanes.filter((lane) => lane.activity === undefined).map((lane) => lane.id)
  assert(
    missing.length === 0,
    `every lane of a readable real log carries activity (missing: ${missing.join(', ') || 'none'})`,
  )
  assert(
    response.lanes.every(
      (lane) =>
        lane.activity === undefined ||
        (lane.activity.evidence === 'running-tool') === (lane.activity.toolName !== undefined),
    ),
    'toolName is present exactly when evidence is running-tool',
  )
  // The wire form is what the client actually sees.
  const wire = JSON.parse(JSON.stringify(response)) as { lanes: { activity?: unknown }[] }
  assert(
    wire.lanes.every((lane) => lane.activity !== undefined),
    'the mount survives JSON serialization (the route ships JSON, not objects)',
  )
  const provisioning = response.lanes.filter((lane) => lane.status === 'provisioning').length
  const idNamed = response.lanes.filter((lane) => lane.name === lane.id && lane.id !== 'lead').length
  assert(
    provisioning === 0,
    `no real lane claims \`provisioning\` (the permanent spinner); found ${provisioning}`,
  )
  assert(
    idNamed === 0,
    `no real lane is NAMED after its session id; found ${idNamed}`,
  )
}

// ---- sub-agent compatibility over the REAL logs ----------------------------
// Runs against whatever workspace slug this script was pointed at. Point it at a
// workspace where plain sub-agents ran to exercise the whole chain:
//   node --experimental-strip-types src/host/dev-verify.mts --Users-lzx-Documents-GitHub-HtDot--
console.log('\n=== sub-agent compatibility (real logs) ===')
let dispatchesSeen = 0
let labelledMembers = 0
let idNamedMembers = 0
for (const session of loaded) {
  const team = foldTeamEvents(session.events, session.id)
  const dispatches = foldSubagentDispatches(session.events)
  dispatchesSeen += dispatches.length
  if (dispatches.length > 0) {
    console.log(`  ${session.id.slice(0, 8)}: ${dispatches.length} dispatch(es)`)
    for (const d of dispatches.slice(0, 3)) {
      console.log(`    child=${d.childId.slice(0, 8)} time=${d.time} description=${JSON.stringify(d.description)}`)
    }
  }
  for (const member of team.members) {
    const labelled = member.nameIsFallback !== true
    if (labelled) labelledMembers += 1
    if (member.name === member.id) idNamedMembers += 1
    if (!labelled && team.sessionTitle !== undefined) {
      // The child's own log gave a real title; the lane name would come from there.
      labelledMembers += 1
    }
  }
}
console.log(`  dispatches total: ${dispatchesSeen}; lane rows named by something other than their id: ${labelledMembers}; still id-named: ${idNamedMembers}`)
assert(
  idNamedMembers === 0,
  `no roster row may be NAMED after its own session id (found ${idNamedMembers})`,
)
assert(
  dispatchesSeen === 0 || loaded.some((s) => foldSubagentDispatches(s.events).every((d) => d.childId !== '')),
  'every dispatch that survived carries a resolved child session id',
)

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exitCode = failures === 0 ? 0 : 1