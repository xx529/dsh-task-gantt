/**
 * Sub-agent compatibility: names, end state, and the dispatch marker.
 *
 * A plain sub-agent is not a teammate. It has no `team/member` row, no mailbox, and
 * no `team/message/*` pair — so three things broke at once in the panel and the user
 * saw them as one bug: every lane was named after its session id, every lane span
 * forever, and no lane showed who handed work to whom.
 *
 * The fixtures below carry the REAL values measured in the `HtDot` run
 * (`~/.dsh/sessions/--Users-lzx-Documents-GitHub-HtDot--`, parent
 * `session-25d8ef8e-…`): the six `subagent` calls, the six `subagent/catalog` rows
 * with their labels, and the six acknowledgements whose text is the only link
 * between a `callId` and a child session id. A unit test may not read those logs, so
 * the values are copied verbatim into the fixtures.
 */
import { describe, expect, it } from 'vitest'
import { foldSubagentDispatches, foldTeamEvents } from '../src/host/fold.ts'

/* ------------------------------------------------------------ real fixture */

/** The real labels, in the real order, as `subagent/catalog` carried them. */
const REAL = [
  { childId: '4b877229-d943-4cf3-91a9-227b2146be3b', label: 'Map codebase concerns', callId: 'call_03_hzgkinh9nj21zt7g9qbm1ppo', time: 1792035793730 },
  { childId: 'c8a1fcae-5c2b-44ef-8cbe-fe88e5738330', label: 'Map conventions and testing', callId: 'call_02_efkzoc93ks4qpdmai4sczmwq', time: 1792035793729 },
  { childId: 'a93f3624-2765-430b-8fad-ee95ae7b598d', label: 'Map architecture and structure', callId: 'call_01_2cq5iasr2jbzrohw7i3u4xsq', time: 1792035793726 },
  { childId: '27f5e98f-1b2f-4160-89ed-c5ad33d5c6a1', label: 'Map tech stack and integrations', callId: 'call_00_bznw97or1mbngxaf7xow4p4b', time: 1792035793723 },
] as const

/** A parent log exactly shaped like the real one: call → ack → catalog. */
function parentLog(options: { ack?: boolean; label?: boolean; description?: boolean } = {}): unknown[] {
  const { ack = true, label = true, description = true } = options
  const events: unknown[] = [{ type: 'session', seq: 0, id: 'session-parent', createdAt: 1000 }]
  let seq = 1
  for (const row of REAL) {
    events.push({
      type: 'tool/call',
      seq: seq++,
      time: row.time,
      data: { turn: 1, step: 4, callId: row.callId, name: 'subagent', arguments: JSON.stringify(description ? { description: row.label, prompt: 'You are a codebase mapper agent.' } : { prompt: 'x' }) },
    })
  }
  if (ack) {
    // The acknowledgement text, verbatim: this is the ONLY thing linking callId → child.
    for (const row of REAL) {
      events.push({
        type: 'tool/result',
        seq: seq++,
        time: row.time + 380,
        data: { turn: 1, step: 4, message: { role: 'tool', source: { kind: 'tool', callId: row.callId }, toolCallId: row.callId, content: [{ type: 'text', text: `started subagent ${row.childId}` }] } },
      })
    }
  }
  for (const row of REAL) {
    events.push({
      type: 'subagent/catalog',
      seq: seq++,
      time: row.time + 360,
      data: { version: 0, childId: row.childId, childCreatedAt: row.time + 29, mode: 'continuable', ...(label ? { label: row.label } : {}) },
    })
  }
  return events
}

/* ------------------------------------------------------------- ① the name */

describe('① sub-agent lane names', () => {
  it('uses the catalog LABEL, not the child session id', () => {
    const team = foldTeamEvents(parentLog(), 'parent')
    expect(team.members).toHaveLength(REAL.length)
    for (const [index, row] of REAL.entries()) {
      const member = team.memberById.get(row.childId)
      expect(member, row.childId).toBeDefined()
      expect(member?.name, `lane ${index} must not read as a session id`).toBe(row.label)
      expect(member?.nameIsFallback, 'a labelled row is not a fallback').toBeUndefined()
    }
    // The regression itself: no lane may be named after its own session id.
    for (const member of team.members) expect(member.name).not.toBe(member.id)
  })

  it('falls back to the dispatching tool call description when the label is absent', () => {
    const team = foldTeamEvents(parentLog({ label: false }), 'parent')
    for (const row of REAL) expect(team.memberById.get(row.childId)?.name).toBe(row.label)
  })

  it('falls back to the id and FLAGS it when neither the label nor the description exists', () => {
    const team = foldTeamEvents(parentLog({ label: false, description: false }), 'parent')
    for (const row of REAL) {
      const member = team.memberById.get(row.childId)
      expect(member?.name).toBe(row.childId)
      expect(member?.nameIsFallback, 'the flag is what lets a caller upgrade from the child log').toBe(true)
    }
  })

  it('keeps a real session/title but rejects a fallback one', () => {
    const real = [...parentLog(), { type: 'session/title', seq: 90, time: 1500, data: { title: 'Map the HtDot codebase', messageSeqs: [1], source: { kind: 'model' } } }]
    expect(foldTeamEvents(real, 'p').sessionTitle).toBe('Map the HtDot codebase')
    // The real child logs carry `source.kind: 'fallback'` titles that are all the same
    // string ("You are a codebase mapper"), so using one would rename every lane to it.
    const fallback = [...parentLog(), { type: 'session/title', seq: 90, time: 1500, data: { title: 'You are a codebase mapper', messageSeqs: [8], source: { kind: 'fallback' } } }]
    expect(foldTeamEvents(fallback, 'p').sessionTitle).toBeUndefined()
  })

  it('lets a real `team/member` row take the name back over', () => {
    const events = [
      ...parentLog({ label: false, description: false }),
      { type: 'team/member', seq: 99, time: 1600, data: { version: 2, teamId: 'r', member: { id: REAL[0].childId, name: 'packaging', phase: 'active' } } },
    ]
    const team = foldTeamEvents(events, 'p')
    const member = team.memberById.get(REAL[0].childId)
    expect(member?.name).toBe('packaging')
    expect(member?.nameIsFallback, 'an authoritative name clears the fallback flag').toBeUndefined()
  })
})

/* ----------------------------------------------------------- ② the phase */

describe('② the catalog row carries no fabricated phase', () => {
  it('records no phase at all for a `subagent/catalog` row', () => {
    // A hard-coded `'provisioning'` here is what pinned every sub-agent lane's status
    // for the rest of the session — the permanent spinner.
    const team = foldTeamEvents(parentLog(), 'parent')
    for (const member of team.members) {
      expect(member.phase, `${member.name} must not claim a phase nobody stated`).toBeUndefined()
      expect(member.phases).toEqual([])
    }
    // …while a real `team/member` row still records its phase.
    const withMember = foldTeamEvents(
      [...parentLog(), { type: 'team/member', seq: 99, time: 1600, data: { version: 2, teamId: 'r', member: { id: REAL[1].childId, name: 'docs', phase: 'provisioning' } } }],
      'p',
    )
    expect(withMember.memberById.get(REAL[1].childId)?.phase).toBe('provisioning')
  })
})

/* ------------------------------------------------- ③ the dispatch marker */

describe('③ the dispatch marker (parent → child)', () => {
  it('links each `subagent` call to its child through the acknowledgement text', () => {
    const dispatches = foldSubagentDispatches(parentLog())
    expect(dispatches).toHaveLength(REAL.length)
    const byChild = new Map(dispatches.map((d) => [d.childId, d]))
    for (const row of REAL) {
      const dispatch = byChild.get(row.childId)
      expect(dispatch, row.childId).toBeDefined()
      // `time` is the parent's `tool/call`, i.e. the moment work was handed over —
      // NOT the ack, which lands ~380 ms later and is not a completion signal.
      expect(dispatch?.time).toBe(row.time)
      expect(dispatch?.callId).toBe(row.callId)
      expect(dispatch?.description).toBe(row.label)
    }
  })

  it('drops a call whose acknowledgement never arrived instead of guessing a target', () => {
    // The catalog labels are ambiguous on the real data (two dispatches shared
    // `Map conventions and testing`), so label-matching would mispair arrows.
    expect(foldSubagentDispatches(parentLog({ ack: false }))).toEqual([])
    // A partial acknowledgement resolves only the child it names.
    const partial = parentLog().filter((event) => {
      const e = event as { type?: string; data?: { message?: { source?: { callId?: string } } } }
      return e.type !== 'tool/result' || e.data?.message?.source?.callId === REAL[0].callId
    })
    const dispatches = foldSubagentDispatches(partial)
    expect(dispatches).toHaveLength(1)
    expect(dispatches[0]?.childId).toBe(REAL[0].childId)
  })

  it('ignores non-subagent tools and survives hostile input', () => {
    const noise: unknown[] = [
      { type: 'tool/call', seq: 1, time: 1, data: { callId: 'c1', name: 'bash', arguments: '{"description":"x"}' } },
      { type: 'tool/result', seq: 2, time: 2, data: { message: { source: { callId: 'c1' }, content: [{ type: 'text', text: 'started subagent deadbeef-0000-0000-0000-000000000000' }] } } },
      { type: 'tool/call', seq: 3, time: 3, data: { callId: 'c2', name: 'subagent', arguments: '{not json' } },
      null,
      'nope',
      { type: 'tool/result', seq: 4, time: 4, data: { message: 'x' } },
    ]
    expect(() => foldSubagentDispatches(noise)).not.toThrow()
    // `c1` is a bash call, so its ack is not a dispatch; `c2` has no ack.
    expect(foldSubagentDispatches(noise)).toEqual([])
    expect(foldSubagentDispatches([])).toEqual([])
  })

  it('reads a description of `""` when the arguments are unusable, and still links the child', () => {
    const events = parentLog().map((event) => {
      const e = event as { type?: string; data?: Record<string, unknown> }
      if (e.type === 'tool/call') e.data = { ...e.data, arguments: 'not json' }
      return e
    })
    const dispatches = foldSubagentDispatches(events)
    expect(dispatches).toHaveLength(REAL.length)
    expect(dispatches.every((d) => d.description === '')).toBe(true)
    expect(dispatches.every((d) => d.childId !== '')).toBe(true)
  })
})

/* ------------------------------------------------- end-to-end lane locks */

describe('the built lanes: names, end state and dispatch placement', () => {
  const RUNNING = REAL[0].childId
  const FINISHED = REAL[1].childId
  const GHOST = REAL[2].childId

  /** A child log that is still mid-turn. */
  function openTurnLog(): unknown[] {
    return [
      { type: 'session', seq: 0, id: RUNNING, createdAt: 1000 },
      { type: 'turn/start', seq: 1, time: 1001, data: { turn: 1 } },
      { type: 'step/start', seq: 2, time: 1002, data: { turn: 1, step: 1 } },
    ]
  }
  /** A child log whose turn closed: the sub-agent is no longer working. */
  function closedTurnLog(): unknown[] {
    return [
      { type: 'session', seq: 0, id: FINISHED, createdAt: 1000 },
      { type: 'turn/start', seq: 1, time: 1001, data: { turn: 1 } },
      { type: 'step/start', seq: 2, time: 1002, data: { turn: 1, step: 1 } },
      { type: 'step/end', seq: 3, time: 1003, data: { turn: 1, step: 1 } },
      { type: 'turn/end', seq: 4, time: 1004, data: { turn: 1 } },
    ]
  }

  /**
   * A host context whose `agents` probe answers for the sessions it is given.
   *
   * `status` is what the LIVE probe reports — the same field `liveAgentRunning`
   * reads. A session absent from the map is one the probe cannot answer for.
   */
  function stubCtx(statusById: Map<string, string>, logs: Map<string, readonly unknown[]>): never {
    return {
      logger: undefined,
      get: (key: string) => {
        if (key !== 'agents') return undefined
        return {
          get: (id: string) => {
            const bare = id.replace(/^session-/, '')
            const events = logs.get(bare)
            if (events === undefined) return undefined
            return { id: bare, status: statusById.get(bare) ?? 'inactive', options: {}, session: { header: {}, snapshotEvents: () => events } }
          },
        }
      },
    } as never
  }

  it('marks a still-working sub-agent running and a finished one idle', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    const logs = new Map<string, readonly unknown[]>([
      [RUNNING, openTurnLog()],
      [FINISHED, closedTurnLog()],
    ])
    // The live probe agrees with each child's own log, which is the real-world case.
    const status = new Map([
      [RUNNING, 'running'],
      [FINISHED, 'inactive'],
    ])
    const root = parentLog()
    logs.set('parent', root)
    const response = await buildTimeline(stubCtx(status, logs), 'parent')

    const running = response.lanes.find((lane) => lane.id.startsWith(RUNNING.slice(0, 8)))
    const finished = response.lanes.find((lane) => lane.id.startsWith(FINISHED.slice(0, 8)))
    expect(running?.status, 'an unclosed turn is work in progress').toBe('running')
    expect(finished?.status, 'a closed turn is NOT provisioning — the permanent spinner').toBe('idle')
    // And the whole point: nothing claims `provisioning` any more.
    expect(response.lanes.map((lane) => lane.status)).not.toContain('provisioning')
  })

  it('omits `status` entirely when neither the log nor a live probe can answer', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    // Only the parent log is readable; GHOST is on the roster but has no log and no agent.
    const response = await buildTimeline(stubCtx(new Map(), new Map([['parent', parentLog()]])), 'parent')
    const ghost = response.lanes.find((lane) => lane.id.startsWith(GHOST.slice(0, 8)))
    expect(ghost, 'the roster row still exists — the panel shows the lane').toBeDefined()
    expect(Object.keys(ghost ?? {}), 'but it must not claim a state it cannot see').not.toContain('status')
    // Its name is still the good one, because the name came from the PARENT's log.
    expect(ghost?.name).toBe('Map architecture and structure')
  })

  it('names every sub-agent lane from the catalog label, never from the session id', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    const response = await buildTimeline(stubCtx(new Map(), new Map([['parent', parentLog()]])), 'parent')
    for (const row of REAL) {
      const lane = response.lanes.find((l) => l.id.replace(/^session-/, '').startsWith(row.childId.slice(0, 8)))
      expect(lane?.name, `${row.childId} must be named, not numbered`).toBe(row.label)
      expect(lane?.name).not.toBe(row.childId)
    }
  })

  it('places the dispatch on BOTH lanes with a real from/to/time/preview', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    const logs = new Map<string, readonly unknown[]>([['parent', parentLog()]])
    const response = await buildTimeline(stubCtx(new Map(), logs), 'parent')
    const wire = JSON.parse(JSON.stringify(response)) as typeof response

    const parentLane = wire.lanes.find((lane) => lane.role === 'lead')
    const dispatches = (parentLane?.messages ?? []).filter((message) => message.kind === 'dispatch')
    expect(dispatches, 'the parent shows one dispatch per hand-off').toHaveLength(REAL.length)

    for (const row of REAL) {
      const span = dispatches.find((message) => message.to?.id.startsWith(row.childId.slice(0, 8)))
      expect(span, row.label).toBeDefined()
      expect(span?.from.kind, 'the parent is the sender').toBe('lead')
      expect(span?.to?.kind).toBe('teammate')
      expect(span?.time, 'dated at the tool/call, not at the ack').toBe(row.time)
      expect(span?.preview).toBe(row.label)
      // The CHILD lane carries the same span, so its row can show "received from".
      const childLane = wire.lanes.find((lane) => lane.id.startsWith(row.childId.slice(0, 8)))
      const mine = (childLane?.messages ?? []).filter((message) => message.kind === 'dispatch' && message.messageId === span?.messageId)
      expect(mine, `${row.label}: the child row must carry it too`).toHaveLength(1)
      expect(mine[0]?.from.kind).toBe('lead')
    }
    // No child → parent marker exists, because no such event is observable.
    expect(dispatches.every((message) => message.from.kind === 'lead')).toBe(true)
  })
})
