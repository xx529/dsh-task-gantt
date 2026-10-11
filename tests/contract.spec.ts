/**
 * Contract guards for `src/shared/contract.ts` (FROZEN, owner: Lead).
 *
 * Two things are pinned here:
 *
 * 1. **Values** — `API_VERSION` / `TAB_TYPE_ID` / `ROUTE_PREFIX` are the wire
 *    contract between the two halves and the profile's route table. Changing
 *    one silently breaks the other half, so the exact literals are asserted.
 * 2. **The validator itself** — `assertTimeline` must reject malformed
 *    timelines. Every rule gets a negative control, so a validator that
 *    accepts anything cannot pass this suite.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { API_VERSION, BUILD_LABEL, MESSAGE_PREVIEW_MAX, ROUTE_PREFIX, TAB_TYPE_ID } from '../src/shared/contract.ts'
import { assertTimeline, validateTimeline, validTimeline, timelineErrors } from './helpers/timeline-assert.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTRACT = resolve(ROOT, 'src/shared/contract.ts')

/** Deep-clone the fixture so a mutation cannot leak into the next test. */
function fixture(): Record<string, unknown> {
  return JSON.parse(JSON.stringify(validTimeline())) as Record<string, unknown>
}

describe('frozen wire values', () => {
  it('API_VERSION is 1', () => {
    expect(API_VERSION).toBe(1)
  })

  it('TAB_TYPE_ID is the sidebar tab type id', () => {
    expect(TAB_TYPE_ID).toBe('dsh-task-gantt:board')
  })

  it('ROUTE_PREFIX is the absolute route prefix, no trailing slash', () => {
    expect(ROUTE_PREFIX).toBe('/dsh-task-gantt/api')
    expect(ROUTE_PREFIX.startsWith('/')).toBe(true)
    expect(ROUTE_PREFIX.endsWith('/')).toBe(false)
  })

  it('TAB_TYPE_ID stays namespaced under the package name', () => {
    // The tab id is global to the sidebar service; an un-namespaced id could
    // collide with a builtin tab (guide §4.4).
    expect(TAB_TYPE_ID.startsWith('dsh-task-gantt:')).toBe(true)
  })
})

describe('contract module hygiene', () => {
  it('imports nothing (it is compiled into the host bundle, the browser bundle and vitest alike)', () => {
    const source = readFileSync(CONTRACT, 'utf8')
    const imports = [...source.matchAll(/^\s*import\s[^\n]*/gm)].map((match) => match[0].trim())
    expect(imports, `contract.ts must stay dependency-free, found: ${imports.join(' | ')}`).toEqual([])
    expect(source).not.toMatch(/\brequire\s*\(/)
  })

  it('declares the frozen identifiers the rest of the repo imports', () => {
    const source = readFileSync(CONTRACT, 'utf8')
    for (const name of ['API_VERSION', 'TAB_TYPE_ID', 'ROUTE_PREFIX', 'TimelineResponse', 'TimelineLane', 'TimelineTask', 'ActivitySpan', 'TaskEvent', 'ApiEnvelope']) {
      expect(source, `${name} must stay exported`).toContain(name)
    }
  })
})

describe('the build label identifies which code is live', () => {
  it('is a non-empty string in the contract module', () => {
    // The user has twice been unable to tell whether a fix was live (a stale
    // lib/, an in-flight edit). A visible build label is the cheap answer, so the
    // label must stay a real, non-empty contract value.
    expect(typeof BUILD_LABEL).toBe('string')
    expect(BUILD_LABEL.length).toBeGreaterThan(0)
  })

  it('is rendered on every branch of the board, plus the footer', () => {
    // Source-level guard: BoardView has an early "loading/empty" return and the
    // normal return; a label on only one of them would be missing exactly when a
    // user is looking at a broken board.
    const source = readFileSync(resolve(ROOT, 'src/client/ui/BoardView.tsx'), 'utf8')
    // Assert the IMPORT SHAPE structurally, not verbatim: the import list grows
    // (`MESSAGE_PREVIEW_MAX`, `MessageSpan`, …) and an exact-substring check made
    // this guard red on a perfectly good refactor.
    expect(source).toMatch(/import\s*\{[^}]*\bBUILD_LABEL\b[^}]*\}\s*from\s*'\.\.\/\.\.\/shared\/contract\.ts'/)
    const rendered = [...source.matchAll(/data-build=\{BUILD_LABEL\}/g)].length
    expect(rendered, 'data-build must appear on both return branches and the footer').toBeGreaterThanOrEqual(3)
  })
})

describe('assertTimeline accepts the valid fixture', () => {
  it('has no problems at all', () => {
    expect(validateTimeline(validTimeline())).toEqual([])
  })

  it('accepts a range that is still open (end: null)', () => {
    const value = fixture()
    expect(value.range).toEqual({ start: 1_700_000_000_000, end: null })
    expect(timelineErrors(value)).toEqual([])
  })
})

describe('assertTimeline rejects malformed timelines (negative controls)', () => {
  const cases: ReadonlyArray<[string, (value: Record<string, unknown>) => void, string]> = [
    ['missing apiVersion', (value) => delete value.apiVersion, '$.apiVersion'],
    ['wrong apiVersion', (value) => void (value.apiVersion = 2), '$.apiVersion'],
    ['missing sessionId', (value) => delete value.sessionId, '$.sessionId'],
    ['empty rootSessionId', (value) => void (value.rootSessionId = ''), '$.rootSessionId'],
    ['non-numeric generatedAt', (value) => void (value.generatedAt = 'now'), '$.generatedAt'],
    ['missing range', (value) => delete value.range, '$.range'],
    ['range.end before range.start', (value) => void (value.range = { start: 100, end: 50 }), '$.range.end'],
    ['unknown source', (value) => void (value.source = 'partial-log'), '$.source'],
    ['notes not an array', (value) => void (value.notes = 'none'), '$.notes'],
    ['notes with a non-string', (value) => void (value.notes = [1]), '$.notes'],
    ['lanes not an array', (value) => void (value.lanes = {}), '$.lanes'],
    [
      'lane missing role',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        delete lane.role
      },
      '$.lanes[0].role',
    ],
    [
      'lane with an unknown role',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.role = 'owner'
      },
      '$.lanes[0].role',
    ],
    [
      'lane without hasHistory',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        delete lane.hasHistory
      },
      '$.lanes[0].hasHistory',
    ],
    [
      'span with a bad kind',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.spans = [{ kind: 'phase', start: 1, end: 2 }]
      },
      '$.lanes[0].spans[0].kind',
    ],
    [
      'span whose end precedes its start',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.spans = [{ kind: 'step', start: 100, end: 99 }]
      },
      '$.lanes[0].spans[0].end',
    ],
    [
      'spans out of order',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.spans = [
          { kind: 'step', start: 200, end: 210 },
          { kind: 'step', start: 100, end: 110 },
        ]
      },
      '$.lanes[0].spans[1]',
    ],
    [
      'task missing subject',
      (value) => {
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        delete task.subject
      },
      '$.tasks[0].subject',
    ],
    [
      'task with an unknown status',
      (value) => {
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        task.status = 'doing'
      },
      '$.tasks[0].status',
    ],
    [
      'deleted task present in the response',
      (value) => {
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        const laneTask = ((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).tasks as Record<string, unknown>[]
        task.status = 'deleted'
        ;(laneTask[0] as Record<string, unknown>).status = 'deleted'
      },
      '$.tasks[0].status',
    ],
    [
      'task with a non-boolean ready',
      (value) => {
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        task.ready = 'yes'
      },
      '$.tasks[0].ready',
    ],
    [
      'task with a non-array blockedBy',
      (value) => {
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        task.blockedBy = 'task-2'
      },
      '$.tasks[0].blockedBy',
    ],
    [
      'history out of order',
      (value) => {
        const events = [
          { time: 200, action: 'claimed', sessionId: 's' },
          { time: 100, action: 'created', sessionId: 's' },
        ]
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        task.history = events
        const laneTask = (((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        laneTask.history = events
      },
      '$.tasks[0].history[1]',
    ],
    [
      'history event with a bad action',
      (value) => {
        const events = [{ time: 100, action: 'started', sessionId: 's' }]
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        task.history = events
        const laneTask = (((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        laneTask.history = events
      },
      '$.tasks[0].history[0].action',
    ],
    [
      'history event without a sessionId',
      (value) => {
        const events = [{ time: 100, action: 'created' }]
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        task.history = events
        const laneTask = (((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        laneTask.history = events
      },
      '$.tasks[0].history[0].sessionId',
    ],
    [
      'duplicate lane ids',
      (value) => {
        const lanes = value.lanes as Record<string, unknown>[]
        lanes.push(JSON.parse(JSON.stringify(lanes[0])))
      },
      '$.lanes[1].id',
    ],
    [
      'task laneId names no lane',
      (value) => {
        const task = (value.tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        task.laneId = 'ghost'
      },
      '$.tasks[0].laneId',
    ],
    [
      'lane task not present in the top-level tasks',
      (value) => {
        const laneTask = (((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        laneTask.id = 'task-orphan'
      },
      '$.lanes',
    ],
    [
      'lane task with a laneId that disagrees with its lane',
      (value) => {
        const laneTask = (((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).tasks as Record<string, unknown>[])[0] as Record<string, unknown>
        laneTask.laneId = 'other'
      },
      '$.lanes[0].tasks[0].laneId',
    ],
    /* ---- contract v2: live, messages, lane colour tokens, navigation ---- */
    ['live missing', (value) => delete value.live, '$.live'],
    ['live not a boolean', (value) => void (value.live = 'yes'), '$.live'],
    [
      'live:false with end:null (the frozen pair is violated)',
      (value) => {
        value.live = false
        value.range = { start: 1_700_000_000_000, end: null }
      },
      '$.range.end',
    ],
    [
      'live:true with a real end (the frozen pair is violated)',
      (value) => void (value.range = { start: 1_700_000_000_000, end: 1_700_000_009_000 }),
      '$.range.end',
    ],
    [
      'lane without color',
      (value) => {
        delete ((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).color
      },
      '$.lanes[0].color',
    ],
    [
      'lane colour written as a literal hex (bypasses the theme scan)',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.color = { bar: '#ff0000', on: '--dsw-alias-label-primary-inverted' }
      },
      '$.lanes[0].color.bar',
    ],
    [
      'lane colour written as a named colour',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.color = { bar: 'red', on: '--dsw-alias-label-primary-inverted' }
      },
      '$.lanes[0].color.bar',
    ],
    [
      'lane colour written as a var() expression instead of a token name',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.color = { bar: 'var(--dsw-alias-brand-primary)', on: '--dsw-alias-label-primary-inverted' }
      },
      '$.lanes[0].color.bar',
    ],
    [
      'lane colour with a non-theme token name',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.color = { bar: '--brand-primary', on: '--dsw-alias-label-primary-inverted' }
      },
      '$.lanes[0].color.bar',
    ],
    [
      'lane without messages',
      (value) => {
        delete ((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).messages
      },
      '$.lanes[0].messages',
    ],
    [
      'message with an unknown kind',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        ;(lane.messages as Record<string, unknown>[]).push({ kind: 'notice', time: 1_700_000_000_100, end: null, from: { kind: 'lead', id: 'lead', name: 'lead' }, sessionId: 'session-1' })
      },
      '$.lanes[0].messages[2].kind',
    ],
    [
      'messages out of time order',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.messages = [...(lane.messages as unknown[])].reverse()
      },
      '$.lanes[0].messages[1]',
    ],
    [
      'message from a speaker with an empty id',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        ;(lane.messages as Record<string, unknown>[])[0]!.from = { kind: 'user', id: '', name: 'you' }
      },
      '$.lanes[0].messages[0].from.id',
    ],
    [
      'message from a speaker with an unknown kind',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        ;(lane.messages as Record<string, unknown>[])[0]!.from = { kind: 'robot', id: 'r', name: 'R' }
      },
      '$.lanes[0].messages[0].from.kind',
    ],
    [
      'message preview longer than MESSAGE_PREVIEW_MAX',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        ;(lane.messages as Record<string, unknown>[])[1]!.preview = 'x'.repeat(MESSAGE_PREVIEW_MAX + 1)
      },
      '$.lanes[0].messages[1].preview',
    ],
    [
      'message preview with a newline (not whitespace-collapsed)',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        ;(lane.messages as Record<string, unknown>[])[1]!.preview = 'first line\nsecond line'
      },
      '$.lanes[0].messages[1].preview',
    ],
    [
      'a turn that carries an addressee',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        ;(lane.messages as Record<string, unknown>[]).push({
          kind: 'turn',
          time: 1_700_000_000_200,
          end: null,
          from: { kind: 'lead', id: 'lead', name: 'lead' },
          to: { kind: 'teammate', id: 'session-2', name: 'ui' },
          sessionId: 'session-1',
        })
      },
      '$.lanes[0].messages[2].to',
    ],
    [
      'message end before its time',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        ;(lane.messages as Record<string, unknown>[])[1]!.end = 1_699_999_999_000
      },
      '$.lanes[0].messages[1].end',
    ],
    [
      'navigation with an unknown type',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.navigation = { type: 'url', value: 'https://example.com' }
      },
      '$.lanes[0].navigation.type',
    ],
    [
      'session navigation with an empty value',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.navigation = { type: 'session', value: '' }
      },
      '$.lanes[0].navigation.value',
    ],
    [
      'address navigation without a sessionId',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.navigation = { type: 'address', value: { agentId: 'a-1' } }
      },
      '$.lanes[0].navigation.value.sessionId',
    ],
    [
      'the unassigned sentinel lane offering navigation',
      (value) => {
        const lane = (value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>
        lane.id = 'unassigned'
        lane.navigation = { type: 'session', value: 'unassigned' }
        for (const task of value.tasks as Record<string, unknown>[]) task.laneId = 'unassigned'
        for (const task of (lane.tasks as Record<string, unknown>[])) task.laneId = 'unassigned'
      },
      '$.lanes[0].navigation',
    ],
  ]

  it.each(cases)('rejects: %s', (_label, mutate, expectedPath) => {
    const value = fixture()
    mutate(value)
    const problems = timelineErrors(value)
    expect(problems.map((problem) => problem.path), JSON.stringify(problems)).toContain(expectedPath)
    expect(() => assertTimeline(value)).toThrow(/invalid TimelineResponse/)
  })

  it('rejects a non-object outright', () => {
    for (const value of [null, undefined, 42, 'timeline', []]) {
      expect(() => assertTimeline(value), String(value)).toThrow()
    }
  })

  it('the negative controls actually cover the validator (no vacuous suite)', () => {
    // If `timelineErrors` ever returned [] for everything, every case above
    // would fail — but assert it explicitly so the intent survives edits.
    let rejected = 0
    for (const [, mutate] of cases) {
      const value = fixture()
      mutate(value)
      if (timelineErrors(value).length > 0) rejected += 1
    }
    expect(rejected).toBe(cases.length)
  })
})

describe('contract v2 semantics: live ⇔ range.end (frozen pair)', () => {
  it('accepts live:true with end:null (a running team)', () => {
    const value = fixture()
    value.live = true
    value.range = { start: 1_700_000_000_000, end: null }
    expect(timelineErrors(value)).toEqual([])
  })

  it('accepts live:false with a real end (every member stopped)', () => {
    const value = fixture()
    value.live = false
    value.range = { start: 1_700_000_000_000, end: 1_700_000_009_000 }
    expect(timelineErrors(value)).toEqual([])
  })

  it('documents the ruling for the malformed pair', () => {
    // RULING (communicated to host-data-2 / ui): an inconsistent pair is an
    // ERROR, not a degradation. A host that cannot tell whether the team is
    // alive must pick the CONSISTENT pair (`live: true`, `end: null`) and
    // explain itself in `notes`; it must never freeze the chart with
    // `live: false` while leaving `end: null` (the client would then have
    // nothing to freeze at) or claim `live: true` with a hard end (the right
    // edge would stop growing while the flag says it is alive).
    const frozenButNull = fixture()
    frozenButNull.live = false
    frozenButNull.range = { start: 1_700_000_000_000, end: null }
    expect(timelineErrors(frozenButNull).map((problem) => problem.path)).toContain('$.range.end')

    const liveButEnded = fixture()
    liveButEnded.live = true
    liveButEnded.range = { start: 1_700_000_000_000, end: 1_700_000_009_000 }
    expect(timelineErrors(liveButEnded).map((problem) => problem.path)).toContain('$.range.end')
  })
})

describe('contract v2 semantics: message spans', () => {
  /** The lead lane's message list. */
  function leadMessages(value: Record<string, unknown>): Record<string, unknown>[] {
    return ((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).messages as Record<string, unknown>[]
  }

  it('accepts an unmatched queued message with NO addressee (the host rule)', () => {
    const value = fixture()
    // "If no `delivered` twin matches, leave `to` empty" — this must validate.
    leadMessages(value)[1] = {
      kind: 'message',
      time: 1_700_000_000_030,
      end: null,
      from: { kind: 'teammate', id: 'session-9', name: 'ui' },
      preview: 'queued, never delivered',
      messageId: 'msg-2',
      sessionId: 'session-9',
    }
    expect(timelineErrors(value)).toEqual([])
  })

  it('accepts a paired delivery that carries its addressee', () => {
    const value = fixture()
    expect(leadMessages(value)[1]?.to).toBeDefined()
    expect(timelineErrors(value)).toEqual([])
  })

  it('accepts a user prompt whose speaker is the literal "user"', () => {
    const value = fixture()
    const prompt = leadMessages(value)[0] as { kind?: unknown; from?: { id?: unknown; kind?: unknown } }
    expect(prompt.kind).toBe('user-prompt')
    expect(prompt.from?.id).toBe('user')
    expect(prompt.from?.kind).toBe('user')
    expect(timelineErrors(value)).toEqual([])
  })

  it('the speaker rule discriminates (every speaker kind is accepted, junk is not)', () => {
    for (const kind of ['user', 'lead', 'teammate', 'system']) {
      const value = fixture()
      leadMessages(value)[0]!.from = { kind, id: 'x', name: 'X' }
      expect(timelineErrors(value), kind).toEqual([])
    }
    const value = fixture()
    leadMessages(value)[0]!.from = { kind: 'narrator', id: 'x', name: 'X' }
    expect(timelineErrors(value).map((problem) => problem.path)).toContain('$.lanes[0].messages[0].from.kind')
  })
})

describe('contract v2 semantics: lane colour tokens are NAMES, never values', () => {
  function setColor(value: Record<string, unknown>, color: unknown): void {
    ;((value.lanes as Record<string, unknown>[])[0] as Record<string, unknown>).color = color
  }

  it('accepts both token families', () => {
    for (const token of ['--dsw-alias-brand-primary', '--ds-text-primary', '--dsw-specific-sidebar-fill']) {
      const value = fixture()
      setColor(value, { bar: token, on: '--dsw-alias-label-primary-inverted' })
      expect(timelineErrors(value), token).toEqual([])
    }
  })

  it('rejects anything that is not a plain theme-token name', () => {
    const bad = ['#fff', '#ffffff', 'rgb(1,2,3)', 'red', 'var(--dsw-alias-brand-primary)', '--brand', 'dsw-alias-brand-primary', '--DSW-alias-brand-primary', '--dsw-']
    for (const token of bad) {
      const value = fixture()
      setColor(value, { bar: token, on: '--dsw-alias-label-primary-inverted' })
      expect(timelineErrors(value).map((problem) => problem.path), token).toContain('$.lanes[0].color.bar')
    }
  })

  it('the literal-colour message is distinguishable from a naming mistake', () => {
    const literal = fixture()
    setColor(literal, { bar: '#fff', on: '--dsw-alias-label-primary-inverted' })
    const literalProblem = timelineErrors(literal).find((problem) => problem.path === '$.lanes[0].color.bar')
    expect(literalProblem?.message).toMatch(/literal colour/i)

    const naming = fixture()
    setColor(naming, { bar: '--brand', on: '--dsw-alias-label-primary-inverted' })
    const namingProblem = timelineErrors(naming).find((problem) => problem.path === '$.lanes[0].color.bar')
    expect(namingProblem?.message).toMatch(/must match/i)
  })
})
