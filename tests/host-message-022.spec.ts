/**
 * DSH 0.2.2-rc.1 delivery drift: the mailbox is GONE, only the injection remains.
 *
 * ## What changed (and what did not)
 *
 * 0.2.1 wrote a team message twice: the `team/message/queued` + `team/message/delivered`
 * journal pair, and an injected `user/message` in the RECEIVER's log. 0.2.2-rc.1 writes
 * **only** the injection.
 *
 * Measured on this machine (2026-11-08) over 117 session logs written after the upgrade:
 * `team/message/queued` / `team/message/delivered` = **0 occurrences**; every team/agent
 * message is a `user/message` with `data.source.kind === 'agent-message'`,
 * `form: 'relay'`, and a `senderSessionId`. The last mailbox event in the whole store is
 * 2026-10-21 (DSH 0.2.1 era). The real 0.2.2 Lead log `session-d4d2e505…` of workspace
 * `dsh-htdot-bridge` yields 32 such injections, 0 mailbox records.
 *
 * The shipped fold already reads the injected form (added for 0.2.1), so the arrows are
 * NOT lost — but the accounting identity that `dev-verify` asserted
 * (`queued + unpairedDeliveries === records.length`) is false by construction on every
 * 0.2.2 log, because `queued` is 0 there. That is why this file locks the era-neutral
 * identity `queued + unpairedDeliveries + (injectedExchanges - injectedDuplicates) ===
 * records.length`, plus the two 0.2.2 payload quirks:
 *
 * 1. the sender of a Lead relay is spelled `session-<uuid>` (the Lead's session id with
 *    its prefix), while a teammate id is the bare uuid — the same message therefore has
 *    to resolve to the `lead` lane through the spelling-tolerant lookup;
 * 2. the Lead is a lane but never a `team/member` row, so a Lead-sent message must not
 *    degrade to the `system` speaker.
 *
 * 0.2.2 also added event types and injection kinds this fold must keep ignoring:
 * `system/message`, `developer/message`, `request/header`, `job/registered`,
 * `job/settled`, `llm/retry`, `command/run`, `todo/write`, `workspace/changes`, and
 * injected notices (`source.kind` `subagent-settled`, `tool-jobs`, `time-context`, …).
 *
 * Fixtures below are distilled from those real logs: the field sets are verbatim, the
 * bodies are shortened (the real ones carry whole reports).
 */
import { describe, expect, it } from 'vitest'
import { foldMessageRecords } from '../src/host/fold.ts'

/* --------------------------------------------------------------- fixtures */

/** 0.2.2 real shape: teammate → Lead, relay header names the sender. */
const TO_LEAD_FROM_DEVOPS = {
  type: 'user/message',
  seq: 306,
  time: 1793175433708,
  data: {
    content: [
      { type: 'text', text: 'Team message from devops:' },
      { type: 'text', text: 'task-7（devops）早期风险上报：plugin_manager 在本会话被拒，需要你决定。' },
    ],
    source: { kind: 'agent-message', form: 'relay', senderSessionId: 'b2cc76d9-b64c-4473-bd77-b5641648f10c' },
    role: 'user',
    id: '7ad73d49-c5a1-431a-8a15-f9caecbabecd',
  },
}

/** 0.2.2 real shape: Lead → teammate. Note the `session-` prefix on the Lead id. */
const TO_ALPHA_FROM_LEAD = {
  type: 'user/message',
  seq: 41,
  time: 1793175599000,
  data: {
    content: [
      { type: 'text', text: 'Team message from lead:' },
      { type: 'text', text: '你上一轮异常终止了，请继续：先 team_task_get，确认 owner 仍是你。' },
    ],
    source: { kind: 'agent-message', form: 'relay', senderSessionId: 'session-d4d2e505-5cc6-4322-8186-38f472fee03f' },
    role: 'user',
    id: 'ffcc6920-1111-4222-8333-944455556666',
  },
}

/** 0.2.2 real shape: a settlement NOTICE (a background subagent finished). */
const SUBAGENT_SETTLED = {
  type: 'user/message',
  seq: 812,
  time: 1793176000000,
  data: {
    content: [{ type: 'text', text: 'Background subagent 30808b6a-7d2e-4d28-938c-1f804d72ce27 finished and will do no further work unless you send it more.' }],
    source: {
      kind: 'subagent-settled',
      form: 'notice',
      senderSessionId: '30808b6a-7d2e-4d28-938c-1f804d72ce27',
      summary: 'finished',
    },
    role: 'user',
    id: '9a9a9a9a-0000-4000-8000-000000000001',
  },
}

/** A real human prompt in 0.2.2: same `source.kind === 'user'` discriminator as before. */
const HUMAN_PROMPT = {
  type: 'user/message',
  seq: 2,
  time: 1793175027880,
  data: {
    content: [{ type: 'text', text: '帮我看下这个插件在 0.2.2 下还适配吗？' }],
    source: { kind: 'user', rpcId: '59faa26d-7442-4bd3-9f53-6ae2d2214e99', clientTimeZone: 'Asia/Shanghai' },
    role: 'user',
    id: 'fe350b8b-e553-4850-8108-5945031ae2c3',
  },
}

/**
 * Event types that are new (or newly common) in 0.2.2 logs. None of them is an exchange
 * and none may become a prompt or a message record.
 */
const NEW_022_EVENTS: readonly unknown[] = [
  { type: 'session', seq: 0, id: 'session-abc', createdAt: 1 },
  { type: 'permission/preset', seq: 1, time: 2, data: { preset: 'workspace-write' } },
  { type: 'sandbox/mode', seq: 2, time: 3, data: { mode: 'workspace-write' } },
  { type: 'agent-preset/selected', seq: 3, time: 4, data: { preset: 'default' } },
  { type: 'system/message', seq: 4, time: 5, data: { turn: 1, step: 1, message: { role: 'system', content: [{ type: 'text', text: 'You are an AI agent…' }] } } },
  { type: 'developer/message', seq: 5, time: 6, data: { turn: 2, step: 38, message: { source: { kind: 'tool-registry' }, content: [{ type: 'tool-addition', toolName: 'rw_append' }] } } },
  { type: 'request/header', seq: 6, time: 7, data: { header: { config: { provider: 'x', model: 'm', maxTokens: 64000 }, tools: [] } } },
  { type: 'job/registered', seq: 7, time: 8, data: { jobId: 'job-1' } },
  { type: 'job/settled', seq: 8, time: 9, data: { jobId: 'job-1' } },
  { type: 'llm/retry', seq: 9, time: 10, data: {} },
  { type: 'llm/retry-started', seq: 10, time: 11, data: {} },
  { type: 'command/run', seq: 11, time: 12, data: { commandId: 'cmd-1', name: 'permission', args: ' danger-full-access', source: { kind: 'user' } } },
  { type: 'command/done', seq: 12, time: 13, data: { commandId: 'cmd-1' } },
  { type: 'todo/write', seq: 13, time: 14, data: { todos: [] } },
  { type: 'workspace/changes', seq: 14, time: 15, data: { files: [] } },
  { type: 'assistant/attempt', seq: 15, time: 16, data: {} },
  { type: 'session/title-llm-request', seq: 16, time: 17, data: {} },
  {
    type: 'agent/inbox/spliced',
    seq: 17,
    time: 18,
    data: {
      target: 'next-turn',
      start: 0,
      inserted: [
        {
          content: [{ type: 'text', text: '一段时间后我要你继续处理' }],
          source: { kind: 'user', rpcId: 'abc', clientTimeZone: 'Asia/Shanghai' },
          role: 'user',
          id: 'item-1',
        },
      ],
    },
  },
]

/* --------------------------------------------------- the injection-only era */

describe('0.2.2 injection-only logs (no mailbox events)', () => {
  it('folds the relay into an exchange and satisfies the era-neutral accounting', () => {
    const fold = foldMessageRecords([TO_LEAD_FROM_DEVOPS])
    expect(fold.records, 'the injected exchange survives').toHaveLength(1)
    const record = fold.records[0]!
    expect(record.injected).toBe(true)
    expect(record.messageId).toBe('7ad73d49-c5a1-431a-8a15-f9caecbabecd')
    // One observed instant: 0.2.2 hands the message over and delivers it at once.
    expect(record.queuedAt).toBe(1793175433708)
    expect(record.deliveredAt).toBe(1793175433708)

    expect(fold.diagnostics.queued, '0.2.2 writes no team/message/queued').toBe(0)
    expect(fold.diagnostics.unpairedDeliveries).toBe(0)
    expect(fold.diagnostics.injectedExchanges).toBe(1)
    expect(fold.diagnostics.injectedDuplicates).toBe(0)
    // The identity dev-verify now asserts. Before the 0.2.2 fix this was
    // `queued + unpairedDeliveries === records.length`, which is 0 === 1 here.
    const accounted =
      fold.diagnostics.queued +
      fold.diagnostics.unpairedDeliveries +
      fold.diagnostics.injectedExchanges -
      fold.diagnostics.injectedDuplicates
    expect(accounted).toBe(fold.records.length)
  })

  it('resolves the sender from the relay header (0.2.2 drops `source.senderName`)', () => {
    const record = foldMessageRecords([TO_LEAD_FROM_DEVOPS]).records[0]!
    // 0.2.2's relay source carries only `senderSessionId`; the name lives in the header.
    expect(record.senderId).toBe('b2cc76d9-b64c-4473-bd77-b5641648f10c')
    expect(record.senderName).toBe('devops')
    expect(record.preview ?? '', 'the delivery header is not the body').not.toContain('Team message')
    expect(record.preview ?? '').toContain('task-7（devops）')
  })

  it('keeps the Lead id spelling `session-<uuid>` verbatim and still resolves the name', () => {
    // The Lead never has a `team/member` row, so only the header names it; the id keeps
    // the spelling the log carries and timeline.ts resolves it across both spellings.
    const record = foldMessageRecords([TO_ALPHA_FROM_LEAD]).records[0]!
    expect(record.senderId, 'the log spelling is preserved, never rewritten').toBe(
      'session-d4d2e505-5cc6-4322-8186-38f472fee03f',
    )
    expect(record.senderName).toBe('lead')
    expect(record.targetId, '0.2.2 injections carry no recipient; timeline places the owner').toBeUndefined()
  })

  it('does NOT draw settlement notices as exchanges', () => {
    const fold = foldMessageRecords([SUBAGENT_SETTLED])
    expect(fold.records, 'a notice is not a message').toHaveLength(0)
    expect(fold.diagnostics.injectedUserMessages, 'still counted, so the notes stay honest').toBe(1)
    expect(fold.diagnostics.injectedExchanges).toBe(0)
  })

  it('keeps the human prompt and ignores every new 0.2.2 event type', () => {
    const fold = foldMessageRecords([HUMAN_PROMPT, ...NEW_022_EVENTS])
    expect(fold.userPrompts).toHaveLength(1)
    expect(fold.userPrompts[0]?.preview).toContain('插件在 0.2.2 下还适配吗')
    expect(fold.records).toHaveLength(0)
  })

  it('does not read `agent/inbox/spliced` as a second message feed', () => {
    // The spliced items are also written as `user/message` (or are context injections);
    // reading both would draw every arrow twice. Locks the 0.2.1 finding on 0.2.2 data.
    const fold = foldMessageRecords(NEW_022_EVENTS)
    expect(fold.records).toHaveLength(0)
    expect(fold.userPrompts).toHaveLength(0)
  })
})

/* --------------------------------------------------------- end to end wire */

describe('0.2.2 exchanges reach the wire with real speakers', () => {
  const ROOT = 'session-root1'
  const ALPHA = 'alpha1'

  /** Root log: the roster row plus the teammate→Lead injection. */
  const ROOT_LOG: readonly unknown[] = [
    { type: 'session', seq: 0, id: ROOT, createdAt: 1 },
    {
      type: 'team/member',
      seq: 1,
      time: 2,
      data: { version: 2, teamId: ROOT, member: { id: ALPHA, name: 'greeter-alpha', phase: 'active' } },
    },
    {
      ...TO_LEAD_FROM_DEVOPS,
      data: {
        ...TO_LEAD_FROM_DEVOPS.data,
        content: [
          { type: 'text', text: 'Team message from greeter-alpha:' },
          { type: 'text', text: 'greeter-alpha 已就绪，随时可接活。' },
        ],
        source: { kind: 'agent-message', form: 'relay', senderSessionId: ALPHA },
      },
    },
  ]
  /** Teammate log: the Lead→teammate injection, sender spelled `session-<uuid>`. */
  const ALPHA_LOG: readonly unknown[] = [
    { type: 'session', seq: 0, id: ALPHA, createdAt: 1, parentSession: ROOT },
    { ...TO_ALPHA_FROM_LEAD, data: { ...TO_ALPHA_FROM_LEAD.data, source: { ...TO_ALPHA_FROM_LEAD.data.source, senderSessionId: ROOT } } },
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

  it('draws both directions and never degrades a roster sender to `system`', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    const response = await buildTimeline(stubCtx(), ROOT)
    const lead = response.lanes.find((lane) => lane.id === 'lead')
    const alpha = response.lanes.find((lane) => lane.id === ALPHA)
    expect(lead).toBeDefined()
    expect(alpha).toBeDefined()

    // Each exchange is drawn on BOTH lanes (the row is the perspective).
    expect((lead?.messages ?? []).filter((span) => span.kind === 'message')).toHaveLength(2)
    expect((alpha?.messages ?? []).filter((span) => span.kind === 'message')).toHaveLength(2)

    const inbound = (lead?.messages ?? []).find((span) => span.kind === 'message' && span.from.kind === 'teammate')
    expect(inbound?.from.name).toBe('greeter-alpha')
    expect(inbound?.to?.name, 'the Lead is displayed as `lead`, not as a session id').toBe('lead')

    const outbound = (alpha?.messages ?? []).find((span) => span.kind === 'message' && span.from.kind === 'lead')
    expect(outbound, 'a Lead relay resolves through the `session-` spelling').toBeDefined()
    expect(outbound?.from.kind, 'a message from the Lead is NOT `system`').toBe('lead')
    expect(outbound?.from.name).toBe('lead')
    expect(outbound?.to?.name).toBe('greeter-alpha')

    // Both survive the JSON the route ships.
    const wire = JSON.parse(JSON.stringify(response)) as typeof response
    const wireLead = wire.lanes.find((lane) => lane.id === 'lead')
    expect((wireLead?.messages ?? []).filter((span) => span.kind === 'message')).toHaveLength(2)
  })
})
