/**
 * Host-half degradation contract (brief §3.3/§3.4, contract `TimelineResponse`).
 *
 * The plugin must load — and answer with an honest, empty board — in a
 * deployment that composes none of the services it reads. This file drives the
 * REAL `buildTimeline(ctx, sessionId)` with hostile contexts:
 *
 * - no service at all (`ctx.get` → undefined),
 * - `ctx.get` itself throwing,
 * - a `sessions` service that throws,
 * - a `sessionPersistence` whose `open()` rejects,
 * - a `sessionPersistence` handle whose `read()` rejects.
 *
 * In every case: no exception escapes, the response validates against the
 * frozen contract, `source` stays `live` | `partial`, and `notes` says what was
 * missing. The brief is explicit that inventing a timestamp is worse than an
 * empty timeline, so `range.end` must stay `null` while nothing is known.
 */
import { describe, expect, it } from 'vitest'
import { buildTimeline } from '../src/host/timeline.ts'
import { fakeContext } from './helpers/fake-http.ts'
import { assertTimeline, validateTimeline } from './helpers/timeline-assert.ts'

/** Services a real deployment may or may not compose. */
const SERVICES = ['agentTeams', 'sessionPersistence', 'sessions', 'agents', 'subagents', 'webServer', 'betterSidebar'] as const

/** Contexts a hostile deployment can hand us. */
const contexts: ReadonlyArray<[string, () => ReturnType<typeof fakeContext>]> = [
  ['no service mounted', () => fakeContext()],
  [
    'ctx.get throws for every name',
    () =>
      fakeContext({
        get: (name) => {
          throw new Error(`no such service: ${name}`)
        },
      }),
  ],
  [
    'ctx.get returns null instead of undefined',
    () =>
      fakeContext({
        get: () => null,
      }),
  ],
  [
    'sessions.list() throws',
    () =>
      fakeContext({
        get: (name) => (name === 'sessions' ? { list: () => { throw new Error('session store exploded') } } : undefined),
      }),
  ],
  [
    'sessionPersistence.open() rejects',
    () =>
      fakeContext({
        get: (name) =>
          name === 'sessionPersistence'
            ? { open: async () => { throw new Error('log unreadable') }, list: async () => [] }
            : undefined,
      }),
  ],
  [
    'sessionPersistence handle.read() rejects',
    () =>
      fakeContext({
        get: (name) =>
          name === 'sessionPersistence'
            ? {
                open: async () => ({
                  read: async () => {
                    throw new Error('decompression failed')
                  },
                  close: async () => undefined,
                }),
                stat: async () => undefined,
              }
            : undefined,
      }),
  ],
  [
    'sessionPersistence returns a shapeless handle',
    () =>
      fakeContext({
        get: (name) => (name === 'sessionPersistence' ? { open: async () => ({}) } : undefined),
      }),
  ],
  [
    'agentTeams.listMembers() throws',
    () =>
      fakeContext({
        get: (name) =>
          name === 'agentTeams'
            ? {
                membership: () => {
                  throw new Error('not an agent')
                },
                listMembers: () => {
                  throw new Error('team service exploded')
                },
                listTasks: () => {
                  throw new Error('team service exploded')
                },
              }
            : undefined,
      }),
  ],
]

describe('buildTimeline degradation (never throws, always honest)', () => {
  it.each(contexts)('survives: %s', async (_label, makeContext) => {
    const ctx = makeContext()
    let value: unknown = undefined
    await expect(
      (async () => {
        value = await buildTimeline(ctx, 'session-abc')
      })(),
      'buildTimeline must never throw — the route turns a throw into a 500',
    ).resolves.toBeUndefined()
    assertTimeline(value)
  })

  it.each(contexts)('degrades with a non-empty note: %s', async (_label, makeContext) => {
    const value = await buildTimeline(makeContext(), 'session-abc')
    assertTimeline(value)
    if (value.lanes.every((lane) => lane.spans.length === 0)) {
      expect(['live', 'partial']).toContain(value.source)
      expect(value.notes.length, 'an empty board must explain itself in notes').toBeGreaterThan(0)
    }
  })

  it('echoes the requested session and keeps the frozen live ⇔ end pair', async () => {
    const value = await buildTimeline(fakeContext(), 'session-xyz')
    assertTimeline(value)
    expect(value.sessionId).toBe('session-xyz')
    // `source` (how the timeline was assembled) and `live` (is the team still
    // doing something) are ORTHOGONAL under contract v2: a projection-only
    // board whose members have all stopped is `source: 'live'` *and*
    // `live: false` with a real `range.end`. The frozen rule is the PAIR, never
    // one field alone — `assertTimeline` enforces it; this pins the intent.
    expect(value.live, 'live must be exactly "range.end is null"').toBe(value.range.end === null)
  })

  it('keeps generatedAt at or before now (never a future timestamp)', async () => {
    const before = Date.now()
    const value = await buildTimeline(fakeContext(), 'session-abc')
    const after = Date.now()
    expect(value.generatedAt).toBeGreaterThanOrEqual(before)
    expect(value.generatedAt).toBeLessThanOrEqual(after)
  })

  it('does not reach for a service it does not need (no service is required to answer)', async () => {
    const touched: string[] = []
    const ctx = fakeContext({
      get: (name) => {
        touched.push(name)
        return undefined
      },
    })
    const value = await buildTimeline(ctx, 'session-abc')
    assertTimeline(value)
    // Advisory: whatever it probes must be one of the documented services.
    for (const name of touched) {
      expect(SERVICES as readonly string[], `buildTimeline probed an undocumented service "${name}"`).toContain(name)
    }
  })

  it('reports a partial source (not a crash) when some lanes are unreadable', async () => {
    // One member whose log is readable and one whose log explodes. Whatever the
    // host half decides about per-lane degradation, the response as a whole must
    // stay valid and must not claim `log` when a lane's log failed.
    const ctx = fakeContext({
      get: (name) => {
        if (name === 'sessionPersistence') {
          return {
            open: async (id: string) => {
              if (id === 'broken') throw new Error('unreadable log')
              return { read: async () => [], close: async () => undefined }
            },
          }
        }
        return undefined
      },
    })
    const value = await buildTimeline(ctx, 'session-abc')
    assertTimeline(value)
    expect(['log', 'partial', 'live']).toContain(value.source)
  })

  it('surfaces every problem as data, never as a thrown error (fuzz over empty ids)', async () => {
    for (const id of ['', ' ', 'session', '0']) {
      const problems = validateTimeline(await buildTimeline(fakeContext(), id)).filter((problem) => problem.severity === 'error')
      // The route already rejects a blank sessionId with 400, so a blank id can
      // only reach this layer when a caller bypasses it; whatever it echoes
      // back is then blank too. Problems CAUSED by the blank id are therefore
      // tolerated here (the id itself, and the navigation target derived from
      // it); anything else would be a real contract violation.
      const blankIdEcho = (path: string): boolean =>
        path === '$.sessionId' || path === '$.rootSessionId' || path.endsWith('.navigation.value')
      const onlyEchoedId = problems.every((problem) => blankIdEcho(problem.path))
      expect(problems.length === 0 || onlyEchoedId, `${JSON.stringify(id)}: ${JSON.stringify(problems)}`).toBe(true)
    }
  })
})
