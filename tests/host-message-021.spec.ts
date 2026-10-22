/**
 * DSH 0.2.0 → 0.2.1 delivery drift: the exchange arrows vanished.
 *
 * ## What changed, and why it broke us
 *
 * 0.2.0 delivered a team message as a `team/message/queued` + `team/message/delivered`
 * journal pair. 0.2.1 **also** writes the same message into the RECEIVER's log as a
 * `user/message` whose `data.source.kind` is `team-message` (or `agent-message` for a
 * sub-agent relay). Our fold treated every non-human `user/message` as noise —
 * `injectedUserMessages += 1; continue` — so after the upgrade it counted the messages
 * and drew nothing, which is exactly "the send/receive icons are gone".
 *
 * Measured over 272 real logs: `team-message` 581, `agent-message` 56, while the 0.2.0
 * pair still exists (601 queued / 601 delivered). **581 + 601 → 262 of the injections are
 * duplicates of a queued record and 320 are only visible in the new form**, so both forms
 * must be read and merged by id.
 *
 * Every fixture below is a real payload, verbatim.
 */
import { describe, expect, it } from 'vitest'
import { foldMessageRecords } from '../src/host/fold.ts'

/* --------------------------------------------------------------- fixtures */

/** A real `team-message` injection (into the RECEIVER's log). */
const TEAM_MESSAGE = {
  type: 'user/message',
  seq: 76,
  time: 1791946764240,
  data: {
    content: [
      { type: 'text', text: 'Team message team-message-2fef1867-67ac-449a-8a7c-e5d56a77ec8b from lead:' },
      { type: 'text', text: '[Lead → verifier] 环境补充（影响你写脚本）：\n\n**`aiohttp==3.14.5` 已由 Lead 安装**。' },
    ],
    source: {
      kind: 'team-message',
      teamId: 'session-d7264f54-d4d5-437c-9172-cd5da16b0af6',
      messageId: 'team-message-2fef1867-67ac-449a-8a7c-e5d56a77ec8b',
      senderId: 'session-d7264f54-d4d5-437c-9172-cd5da16b0af6',
      senderName: 'lead',
    },
    role: 'user',
    id: 'b4d7257a-e1c4-4e63-a16b-245df3b06f67',
  },
}

/** A real `agent-message` relay whose header names the sender. */
const AGENT_MESSAGE_NAMED = {
  type: 'user/message',
  seq: 3821,
  time: 1792689991888,
  data: {
    content: [
      { type: 'text', text: 'Team message from greeter-alpha:' },
      { type: 'text', text: 'greeter-alpha 已就绪，随时可接活。' },
    ],
    source: { kind: 'agent-message', form: 'relay', senderSessionId: '5ac595ab-8cb7-4609-8e05-218e9b6cbb89' },
    role: 'user',
    id: 'e1b7c0f2-0a1c-4c5e-9f0a-1d2b3c4d5e6f',
  },
}

/** A real `agent-message` relay whose header carries only the session id. */
const AGENT_MESSAGE_BY_ID = {
  type: 'user/message',
  seq: 341,
  time: 1790671020666,
  data: {
    content: [
      { type: 'text', text: 'Agent b7c5876a-f060-4164-91c3-7c2befe01bfe sent a message: ' },
      { type: 'text', text: '# Western AI Shopping Landscape — research complete (report date 2026-09-29)' },
    ],
    source: { kind: 'agent-message', form: 'relay', senderSessionId: 'b7c5876a-f060-4164-91c3-7c2befe01bfe' },
    role: 'user',
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
  },
}

/** The 0.2.0 mailbox pair for a DIFFERENT message of the same team. */
const QUEUED = {
  type: 'team/message/queued',
  seq: 10,
  time: 1791900000000,
  data: {
    message: {
      id: 'team-message-aaaaaaaa-1111-2222-3333-444444444444',
      senderId: '66b9735d-8df4-44df-9d74-b4083057e02f',
      senderName: 'packaging',
      targetId: 'session-d7264f54-d4d5-437c-9172-cd5da16b0af6',
      content: [{ type: 'text', text: '老的 0.2.0 投递形态' }],
    },
  },
}
const DELIVERED = {
  type: 'team/message/delivered',
  seq: 12,
  time: 1791900001234,
  data: { messageId: 'team-message-aaaaaaaa-1111-2222-3333-444444444444', targetId: 'session-d7264f54-d4d5-437c-9172-cd5da16b0af6' },
}

/** The SAME message, injected (the 0.2.1 duplicate of the pair above). */
const INJECTED_DUPLICATE = {
  type: 'user/message',
  seq: 13,
  time: 1791900001234,
  data: {
    content: [
      { type: 'text', text: 'Team message team-message-aaaaaaaa-1111-2222-3333-444444444444 from packaging:' },
      { type: 'text', text: '老的 0.2.0 投递形态' },
    ],
    source: {
      kind: 'team-message',
      teamId: 'session-d7264f54-d4d5-437c-9172-cd5da16b0af6',
      messageId: 'team-message-aaaaaaaa-1111-2222-3333-444444444444',
      senderId: '66b9735d-8df4-44df-9d74-b4083057e02f',
      senderName: 'packaging',
    },
    role: 'user',
    id: 'ffffffff-0000-0000-0000-000000000001',
  },
}

/* ------------------------------------------------------ the injected form */

describe('0.2.1 injected messages become exchanges', () => {
  it('folds a `team-message` with the sender from `source.senderName`', () => {
    const fold = foldMessageRecords([TEAM_MESSAGE])
    expect(fold.records).toHaveLength(1)
    const record = fold.records[0]!
    expect(record.injected).toBe(true)
    expect(record.messageId).toBe('team-message-2fef1867-67ac-449a-8a7c-e5d56a77ec8b')
    expect(record.senderName).toBe('lead')
    expect(record.senderId).toBe('session-d7264f54-d4d5-437c-9172-cd5da16b0af6')
    // One observed instant: the injected message is handed over and delivered at once.
    expect(record.queuedAt).toBe(1791946764240)
    expect(record.deliveredAt).toBe(1791946764240)
    expect(fold.diagnostics.injectedExchanges).toBe(1)
  })

  it('does NOT treat the delivery header as the body', () => {
    const record = foldMessageRecords([TEAM_MESSAGE]).records[0]!
    expect(record.preview, 'the header is not the message').not.toContain('Team message')
    expect(record.preview).toContain('[Lead → verifier]')
    // The relay case, where the header is the ONLY place the sender is named.
    const relay = foldMessageRecords([AGENT_MESSAGE_NAMED]).records[0]!
    expect(relay.preview).toBe('greeter-alpha 已就绪，随时可接活。')
  })

  it('resolves an `agent-message` sender from the header name', () => {
    const record = foldMessageRecords([AGENT_MESSAGE_NAMED]).records[0]!
    expect(record.senderName, '`Team message from X:` names the sender').toBe('greeter-alpha')
    expect(record.senderId).toBe('5ac595ab-8cb7-4609-8e05-218e9b6cbb89')
  })

  it('resolves an `agent-message` sender from the ROSTER when the header has only an id', () => {
    // `Agent <sid> sent a message: `  — 47 of the 56 real relays look like this.
    const roster = {
      type: 'team/member',
      seq: 5,
      time: 1,
      data: { version: 2, teamId: 't', member: { id: 'b7c5876a-f060-4164-91c3-7c2befe01bfe', name: 'researcher', phase: 'active' } },
    }
    const record = foldMessageRecords([roster, AGENT_MESSAGE_BY_ID]).records[0]!
    expect(record.senderName, 'the roster supplies the name the header lacks').toBe('researcher')
    expect(record.senderId).toBe('b7c5876a-f060-4164-91c3-7c2befe01bfe')
  })

  it('falls back to the raw session id when neither the header nor the roster knows a name', () => {
    const record = foldMessageRecords([AGENT_MESSAGE_BY_ID]).records[0]!
    // Honest degradation: the id is what the log says; nothing is invented.
    expect(record.senderId).toBe('b7c5876a-f060-4164-91c3-7c2befe01bfe')
    expect(record.senderName, 'no name available — the caller falls back to the id').toBeUndefined()
  })
})

/* -------------------------------------------------------------- the merge */

describe('the two delivery forms merge without double-drawing', () => {
  it('keeps ONE exchange per message id, preferring the mailbox record', () => {
    const fold = foldMessageRecords([QUEUED, DELIVERED, INJECTED_DUPLICATE])
    expect(fold.records, 'one message, one arrow').toHaveLength(1)
    const record = fold.records[0]!
    expect(record.injected, 'the mailbox record wins').toBeUndefined()
    expect(record.queuedAt, 'it has the real hand-over time').toBe(1791900000000)
    expect(record.deliveredAt).toBe(1791900001234)
    expect(record.targetId).toBe('session-d7264f54-d4d5-437c-9172-cd5da16b0af6')
    expect(fold.diagnostics.injectedDuplicates, 'the dropped duplicate is counted, not silent').toBe(1)
  })

  it('keeps an injection that has NO mailbox counterpart', () => {
    // 320 of the 581 real injections are only visible in the new form; a blanket
    // "ignore the injected kind" would have lost every one of them.
    const fold = foldMessageRecords([QUEUED, DELIVERED, TEAM_MESSAGE])
    expect(fold.records).toHaveLength(2)
    expect(fold.records.filter((record) => record.injected === true)).toHaveLength(1)
    expect(fold.diagnostics.injectedDuplicates).toBe(0)
  })

  it('accepts the two pure forms side by side and orders by time', () => {
    const fold = foldMessageRecords([TEAM_MESSAGE, QUEUED, DELIVERED])
    expect(fold.records.map((record) => record.messageId)).toEqual([
      'team-message-aaaaaaaa-1111-2222-3333-444444444444',
      'team-message-2fef1867-67ac-449a-8a7c-e5d56a77ec8b',
    ])
  })

  it('never emits two records with the same id, whatever the input order', () => {
    for (const order of [
      [QUEUED, DELIVERED, INJECTED_DUPLICATE],
      [INJECTED_DUPLICATE, QUEUED, DELIVERED],
      [DELIVERED, INJECTED_DUPLICATE, QUEUED],
    ]) {
      const ids = foldMessageRecords(order).records.map((record) => record.messageId)
      expect(new Set(ids).size, `order ${order.length}`).toBe(ids.length)
    }
  })
})

/* -------------------------------------------------- not a second feed */

describe('`agent/inbox/spliced` is not a second source', () => {
  it('does not double-count an item that also appears as `user/message`', () => {
    // The splice record names exactly the items it inserted, and 1942/1943 of those ids
    // also occur as `user/message` events. Reading it as well would double every arrow.
    const spliced = {
      type: 'agent/inbox/spliced',
      seq: 2,
      time: 1790606263559,
      data: {
        target: 'next-turn',
        start: 0,
        inserted: [
          { content: [{ type: 'text', text: 'hi' }], source: { kind: 'team-message', messageId: 'team-message-2fef1867-67ac-449a-8a7c-e5d56a77ec8b', senderName: 'lead' }, role: 'user', id: 'x' },
        ],
      },
    }
    const fold = foldMessageRecords([spliced, TEAM_MESSAGE])
    expect(fold.records, 'one copy only').toHaveLength(1)
    expect(fold.diagnostics.injectedExchanges).toBe(1)
  })
})

/* --------------------------------------------------------------- totality */

describe('the injected path is total', () => {
  it('never throws on hostile injected payloads', () => {
    const hostile: readonly unknown[] = [
      { type: 'user/message', seq: 1, time: 1, data: { source: { kind: 'team-message' }, content: null } },
      { type: 'user/message', seq: 2, time: 2, data: { source: null, content: [] } },
      { type: 'user/message', seq: 3, time: 3, data: { source: { kind: 'team-message', messageId: 5 }, content: 'nope' } },
      { type: 'user/message', seq: 4, data: { source: { kind: 'agent-message' }, content: [] } },
      { type: 'user/message', seq: 5, time: 5, data: { source: { kind: 'agent-message' }, content: [{ type: 'text', text: 'Agent nope sent a message:' }, { type: 'text', text: 'body' }] } },
      null,
      'nope',
    ]
    expect(() => foldMessageRecords(hostile)).not.toThrow()
    const fold = foldMessageRecords(hostile)
    // seq 1, 3, 5 are placeable in time; seq 4 is undated, seq 2 is a human prompt.
    expect(fold.records).toHaveLength(3)
    // An unknown header is NOT stripped: the whole content is the body.
    expect(fold.records[2]?.preview).toContain('sent a message:')
  })

  it('keeps every other injection kind as a count only', () => {
    const fold = foldMessageRecords([
      { type: 'user/message', seq: 1, time: 1, data: { source: { kind: 'time-context' }, content: [] } },
      { type: 'user/message', seq: 2, time: 2, data: { source: { kind: 'subagent-settled' }, content: [] } },
    ])
    expect(fold.records).toHaveLength(0)
    expect(fold.diagnostics.injectedUserMessages).toBe(2)
  })
})

/* --------------------------------------------------------- end to end */

describe('both directions reach the wire with real speakers', () => {
  const ROOT = 'session-root1'
  const ALPHA = 'alpha1'

  /** A root log: the roster row plus a relay FROM the teammate. */
  const ROOT_LOG: readonly unknown[] = [
    { type: 'session', seq: 0, id: ROOT, createdAt: 1 },
    { type: 'team/member', seq: 1, time: 2, data: { version: 2, teamId: ROOT, member: { id: ALPHA, name: 'greeter-alpha', phase: 'active' } } },
    AGENT_MESSAGE_NAMED,
  ]
  /** The teammate's log: a mailbox injection FROM the Lead TO this teammate. */
  const ALPHA_LOG: readonly unknown[] = [
    { type: 'session', seq: 0, id: ALPHA, createdAt: 1, parentSession: ROOT },
    { ...TEAM_MESSAGE, time: 1791946000000, data: { ...TEAM_MESSAGE.data, source: { ...TEAM_MESSAGE.data.source, senderId: ROOT, senderName: 'lead' } } },
  ]

  /** A host context whose only service is `agents`, backed by both logs. */
  function stubCtx(): never {
    const logs = new Map<string, readonly unknown[]>([
      [ROOT, ROOT_LOG],
      [ROOT.replace(/^session-/, ''), ROOT_LOG],
      [ALPHA, ALPHA_LOG],
    ])
    return {
      logger: undefined,
      get: (key: string) =>
        key === 'agents'
          ? {
              get: (id: string) => {
                const events = logs.get(id)
                if (events === undefined) return undefined
                return { id, status: 'inactive', options: {}, session: { header: {}, snapshotEvents: () => events } }
              },
            }
          : undefined,
    } as never
  }

  it('draws teammate→Lead and Lead→teammate with the right speakers', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    const response = await buildTimeline(stubCtx(), ROOT)
    const lead = response.lanes.find((lane) => lane.id === 'lead')
    const alpha = response.lanes.find((lane) => lane.id === ALPHA)
    expect(lead, 'the Lead lane exists').toBeDefined()
    expect(alpha, 'the teammate lane exists').toBeDefined()

    // The Lead lane carries BOTH directions (an exchange is drawn on each side), so the
    // spans are selected by direction rather than by position.
    expect(
      (lead?.messages ?? []).filter((span) => span.kind === 'message'),
      'both arrows on the Lead lane',
    ).toHaveLength(2)
    const inbound = (lead?.messages ?? []).find((span) => span.kind === 'message' && span.from.kind === 'teammate')
    expect(inbound, 'the teammate→Lead arrow is back').toBeDefined()
    expect(inbound?.from.kind).toBe('teammate')
    expect(inbound?.from.name).toBe('greeter-alpha')
    expect(inbound?.to?.id).toBe('lead')
    // The `to` speaker used to render the Lead's raw session id — the reverse roster
    // index never contained the Lead, who is a lane but not a `team/member` row.
    expect(inbound?.to?.name, 'the Lead is displayed as `lead`, not as a session id').toBe('lead')

    const outbound = (alpha?.messages ?? []).find((span) => span.kind === 'message' && span.from.kind === 'lead')
    expect(outbound, 'the Lead→teammate arrow is back').toBeDefined()
    expect(outbound?.from.kind, 'a message from the Lead is NOT `system`').toBe('lead')
    expect(outbound?.from.name).toBe('lead')
    expect(outbound?.to?.name).toBe('greeter-alpha')

    // Both survive the JSON the route ships.
    const wire = JSON.parse(JSON.stringify(response)) as typeof response
    const wireLead = wire.lanes.find((lane) => lane.id === 'lead')
    expect((wireLead?.messages ?? []).filter((span) => span.kind === 'message')).toHaveLength(2)
  })
})
