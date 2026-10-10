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
import { API_VERSION, ROUTE_PREFIX, TAB_TYPE_ID } from '../src/shared/contract.ts'
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
