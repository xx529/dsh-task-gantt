/**
 * Live lane activity — "what is this agent doing right now".
 *
 * The user asked for the built-in's `正在分析请求` instead of a bare status word. This
 * spec locks the three things that decide whether we may claim it:
 *
 * 1. the **tool-name → category** table (a line-by-line mirror of the built-in's
 *    `activity()`, `@deepseek-ai/dsh-client-ui-chat/lib/client.js:10494-10517`);
 * 2. the **detail** extraction (mirror of `liveToolDetail` / `normalizeLiveToolDetail`,
 *    `:10545-10595`, with the same 22-key order and the same 160-character clip);
 * 3. the **truth table for the guard**, which is the part that can go wrong silently:
 *    without the open-turn requirement, an interrupted turn would leave a `tool/call`
 *    with no `tool/result` forever and the lane would claim to be running `bash` for
 *    the rest of the session.
 *
 * Every case below is constructed, because a unit test may not depend on a live log;
 * `src/host/dev-verify.mts` runs the same fold over the REAL session logs.
 */
import { describe, expect, it } from 'vitest'
import {
  foldLaneLiveActivity,
  foldSessionEvents,
  liveToolDetail,
  toolActivityKind,
  type RawSessionEvent,
} from '../src/host/fold.ts'
import type { LaneLiveActivityKind } from '../src/shared/contract.ts'

/* --------------------------------------------------------------- fixtures */

/** `turn/start` with no matching `turn/end`. */
const TURN_OPEN: RawSessionEvent = { type: 'turn/start', seq: 0, time: 1000, data: { turn: 1 } }
/** `turn/end`, i.e. the turn is CLOSED. */
const TURN_CLOSE: RawSessionEvent = { type: 'turn/end', seq: 9, time: 1900, data: { turn: 1 } }
/** An open step. */
const STEP_OPEN: RawSessionEvent = { type: 'step/start', seq: 1, time: 1010, data: { turn: 1, step: 1 } }

/** One `tool/call`. */
function call(seq: number, callId: string, name: string, args: unknown = {}): RawSessionEvent {
  return {
    type: 'tool/call',
    seq,
    time: 1000 + seq,
    data: { turn: 1, step: 1, callId, name, arguments: typeof args === 'string' ? args : JSON.stringify(args) },
  }
}

/** One `tool/result` settling `callId`, in the shape a real log carries. */
function result(seq: number, callId: string): RawSessionEvent {
  return {
    type: 'tool/result',
    seq,
    time: 1000 + seq,
    data: { turn: 1, step: 1, message: { role: 'tool', source: { kind: 'tool', callId }, toolCallId: callId } },
  }
}

/* ------------------------------------------------- the tool-name mapping */

describe('toolActivityKind mirrors the built-in activity() table', () => {
  it('maps every documented branch', () => {
    const cases: readonly (readonly [string, LaneLiveActivityKind])[] = [
      ['read', 'read'],
      ['read_image', 'readImage'],
      ['grep', 'search'],
      ['glob', 'search'],
      ['workflow_inspect', 'search'],
      // The rule is the SUFFIX `_inspect`, not the substring: this real DSH tool ends
      // with `_query`, so it falls through to the generic category. Locking this
      // prevents someone "fixing" the mapper into a substring match.
      ['cordis_inspect_query', 'tools'],
      ['write', 'write'],
      ['edit', 'edit'],
      ['apply_patch', 'edit'],
      ['bash', 'commands'],
      ['pwsh', 'commands'],
      ['exec_command', 'commands'],
      ['write_stdin', 'commands'],
      ['terminal_open', 'commands'],
      ['run_code', 'code'],
      ['web_search', 'webSearch'],
      ['web_fetch', 'webFetch'],
      ['subagent', 'subagents'],
      ['subagent_fork', 'subagents'],
      ['todo_write', 'plan'],
      ['create_goal', 'plan'],
      ['update_goal', 'plan'],
      ['get_goal', 'plan'],
      ['ask_user_question', 'questions'],
      ['request_user_input', 'questions'],
      // The catch-all. Real tools on this machine land here: `ego_js` (304 calls in
      // the Lead's log), `ego_navigate`, `send_message`, `team_task_update`.
      ['ego_js', 'tools'],
      ['send_message', 'tools'],
      ['team_task_update', 'tools'],
      ['', 'tools'],
    ]
    for (const [name, kind] of cases) expect(toolActivityKind(name), name).toBe(kind)
  })
})

/* ------------------------------------------------ the detail extraction */

describe('liveToolDetail mirrors the built-in detail rules', () => {
  it('takes the FIRST present key in the documented order', () => {
    // `title` precedes `description` in LIVE_TOOL_DETAIL_KEYS.
    expect(liveToolDetail('bash', JSON.stringify({ description: 'D', title: 'T' }))).toBe('T')
    expect(liveToolDetail('bash', JSON.stringify({ description: 'D' }))).toBe('D')
    // A present-but-empty first key falls through to the next.
    expect(liveToolDetail('bash', JSON.stringify({ title: '', description: 'D' }))).toBe('D')
    // `command` beats `description`? No — description comes first, and that is the
    // built-in's order too, so a bash call with both shows the description.
    expect(liveToolDetail('bash', JSON.stringify({ command: 'ls', description: 'List' }))).toBe('List')
  })

  it('normalises strings, string arrays and whitespace', () => {
    expect(liveToolDetail('bash', JSON.stringify({ command: 'ls -la' }))).toBe('ls -la')
    expect(liveToolDetail('bash', JSON.stringify({ command: ['a', 'b'] }))).toBe('a, b')
    expect(liveToolDetail('bash', JSON.stringify({ description: 'a\n\n   b\t c' }))).toBe('a b c')
    // A non-string, non-string-array value is not a detail.
    expect(liveToolDetail('bash', JSON.stringify({ description: 42 }))).toBe('bash')
    expect(liveToolDetail('bash', JSON.stringify({ description: ['a', 2] }))).toBe('bash')
  })

  it('reads the first `question` for the questions key', () => {
    const args = JSON.stringify({ questions: [{ question: 'Q1' }, { question: 'Q2' }] })
    expect(liveToolDetail('ask_user_question', args)).toBe('Q1')
    // An unusable questions array falls through to the tool name.
    expect(liveToolDetail('ask_user_question', JSON.stringify({ questions: [{}, 'x'] }))).toBe('ask_user_question')
  })

  it('clips to 160 characters with an ellipsis', () => {
    const long = 'a'.repeat(200)
    const detail = liveToolDetail('bash', JSON.stringify({ description: long }))
    expect(Array.from(detail)).toHaveLength(160)
    expect(detail.endsWith('…')).toBe(true)
    expect(detail.slice(0, -1)).toBe('a'.repeat(159))
    // Exactly at the limit: untouched, no ellipsis.
    const exact = 'b'.repeat(160)
    expect(liveToolDetail('bash', JSON.stringify({ description: exact }))).toBe(exact)
    expect(liveToolDetail('bash', JSON.stringify({ description: 'c'.repeat(161) })).endsWith('…')).toBe(true)
  })

  it('falls back to the tool NAME and never invents a phrase', () => {
    expect(liveToolDetail('bash', '{not json')).toBe('bash')
    expect(liveToolDetail('bash', '"just a string"')).toBe('bash')
    expect(liveToolDetail('bash', 'null')).toBe('bash')
    expect(liveToolDetail('bash', undefined)).toBe('bash')
    expect(liveToolDetail('bash', JSON.stringify({}))).toBe('bash')
    expect(liveToolDetail('bash', JSON.stringify({ unrelated: 'x' }))).toBe('bash')
  })
})

/* --------------------------------------------- the guard's truth table */

describe('foldLaneLiveActivity: the open-turn + unsettled-call truth table', () => {
  it('reports the running tool when the turn is OPEN and a call is unsettled', () => {
    const activity = foldLaneLiveActivity([
      TURN_OPEN,
      STEP_OPEN,
      call(2, 'c1', 'bash', { command: 'pwd' }),
    ])
    expect(activity).toEqual({ kind: 'commands', detail: 'pwd', toolName: 'bash', evidence: 'running-tool' })
  })

  it('falls back to thinking when the turn is CLOSED, even with an unsettled call', () => {
    // The interrupted-turn case: without this guard the lane would claim to be
    // running `bash` for the rest of the session.
    const activity = foldLaneLiveActivity([
      TURN_OPEN,
      STEP_OPEN,
      call(2, 'c1', 'bash', { command: 'pwd' }),
      TURN_CLOSE,
    ])
    expect(activity).toEqual({ kind: 'thinking', detail: '', evidence: 'no-running-tool' })
  })

  it('falls back to thinking when the call was SETTLED by a tool/result', () => {
    const activity = foldLaneLiveActivity([
      TURN_OPEN,
      STEP_OPEN,
      call(2, 'c1', 'bash', { command: 'pwd' }),
      result(3, 'c1'),
    ])
    expect(activity).toEqual({ kind: 'thinking', detail: '', evidence: 'no-running-tool' })
  })

  it('falls back to thinking when NO tool was ever called', () => {
    expect(foldLaneLiveActivity([TURN_OPEN, STEP_OPEN])).toEqual({
      kind: 'thinking',
      detail: '',
      evidence: 'no-running-tool',
    })
    expect(foldLaneLiveActivity([])).toEqual({ kind: 'thinking', detail: '', evidence: 'no-running-tool' })
  })

  it('reports the NEWEST unsettled call, ignoring settled ones', () => {
    const activity = foldLaneLiveActivity([
      TURN_OPEN,
      STEP_OPEN,
      call(2, 'c1', 'read', { file_path: '/a' }),
      result(3, 'c1'),
      call(4, 'c2', 'grep', { pattern: 'needle' }),
    ])
    expect(activity.kind).toBe('search')
    expect(activity.toolName).toBe('grep')
    expect(activity.detail).toBe('needle')
  })

  it('prefers the later of two unsettled calls', () => {
    const activity = foldLaneLiveActivity([
      TURN_OPEN,
      STEP_OPEN,
      call(2, 'c1', 'read'),
      call(4, 'c2', 'write'),
    ])
    expect(activity.toolName).toBe('write')
    expect(activity.kind).toBe('write')
  })

  it('treats an open STEP as enough, so a missing turn/end cannot hide real work', () => {
    // A log with no turn events at all but an open step: the built-in's rule is
    // "turn/start without turn/end OR step/start without step/end".
    const activity = foldLaneLiveActivity([STEP_OPEN, call(2, 'c1', 'web_search', { query: 'q' })])
    expect(activity.kind).toBe('webSearch')
    expect(activity.evidence).toBe('running-tool')
  })

  it('stays running when a result carries no readable callId (the safe direction)', () => {
    // It may keep a finished call visible for one poll; it can never invent a
    // running one.
    const blindResult: RawSessionEvent = { type: 'tool/result', seq: 3, time: 1003, data: { turn: 1, step: 1, message: {} } }
    const activity = foldLaneLiveActivity([TURN_OPEN, STEP_OPEN, call(2, 'c1', 'bash'), blindResult])
    expect(activity.evidence).toBe('running-tool')
  })

  it('is total over hostile and partial input', () => {
    const hostile: readonly unknown[] = [
      null,
      undefined,
      'nope',
      { type: 'tool/call', seq: 0, time: 1, data: null },
      { type: 'tool/call', seq: 1, time: 2, data: { callId: 5, name: 6 } },
      { type: 'turn/start', seq: 2, data: { turn: 1 } }, // undated
      { type: 'tool/result', seq: 3, time: 4, data: { message: 'x' } },
    ]
    expect(() => foldLaneLiveActivity(hostile)).not.toThrow()
    expect(foldLaneLiveActivity(hostile).kind).toBe('thinking')
  })
})

/* --------------------------------------------------------- the fold wiring */

describe('foldSessionEvents carries the live activity', () => {
  it('exposes it on the combined fold', () => {
    const fold = foldSessionEvents([TURN_OPEN, STEP_OPEN, call(2, 'c1', 'edit', { file_path: '/x.ts' })], 's1')
    expect(fold.laneActivity).toEqual({ kind: 'edit', detail: '/x.ts', toolName: 'edit', evidence: 'running-tool' })
  })

  it('is independent of the historical folds', () => {
    // The spans fold still sees the history; only `laneActivity` describes NOW.
    const fold = foldSessionEvents([TURN_OPEN, STEP_OPEN], 's1')
    expect(fold.activity.spans.length).toBeGreaterThan(0)
    expect(fold.laneActivity.kind).toBe('thinking')
  })
})
