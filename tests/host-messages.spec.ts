/**
 * Message-carrying records (contract v2) — owner: verify.
 *
 * `src/host/fold.ts` reads exactly three event types and pairs a delivery to its
 * queue **by `messageId`, never by adjacency or time**. That rule is the whole
 * point of the feature ("at this moment, who told whom what"), so most of this
 * file is about breaking the temptation to guess:
 *
 * - interleaved queues/deliveries must still pair correctly (adjacency would
 *   mis-pair them);
 * - a delivery with no readable queue is emitted with NO sender (a guess would
 *   be a fabrication);
 * - a `user/message` is the human only when `data.source.kind === 'user'` —
 *   every other kind is the runtime talking, and counting it would put invented
 *   prompts on the chart.
 *
 * The wire shape (`MessageSpan`) rules live in `tests/contract.spec.ts`; this
 * file tests the pure fold those spans are built from.
 */
import { describe, expect, it } from 'vitest'
import { MESSAGE_PREVIEW_MAX } from '../src/shared/contract.ts'
import { foldMessageRecords, type RawSessionEvent } from '../src/host/fold.ts'

const T = 1_791_648_800_000

/** `team/message/queued` as the journal writes it. */
function queued(options: {
  seq: number
  time?: number
  id: string
  senderId?: string
  senderName?: string
  targetId?: string
  text?: string
  content?: unknown
}): RawSessionEvent {
  const message: Record<string, unknown> = { id: options.id }
  if (options.senderId !== undefined) message.senderId = options.senderId
  if (options.senderName !== undefined) message.senderName = options.senderName
  if (options.targetId !== undefined) message.targetId = options.targetId
  if (options.content !== undefined) message.content = options.content
  else if (options.text !== undefined) message.content = [{ type: 'text', text: options.text }]
  return {
    type: 'team/message/queued',
    seq: options.seq,
    ...(options.time === undefined ? {} : { time: options.time }),
    data: { message },
  }
}

/** `team/message/delivered` carries only the id (+ target), never the sender. */
function delivered(options: { seq: number; time?: number; messageId: string; targetId?: string }): RawSessionEvent {
  return {
    type: 'team/message/delivered',
    seq: options.seq,
    ...(options.time === undefined ? {} : { time: options.time }),
    data: { messageId: options.messageId, ...(options.targetId === undefined ? {} : { targetId: options.targetId }) },
  }
}

/** `user/message` with the runtime's `source.kind` discriminator. */
function userMessage(options: { seq: number; time?: number; sourceKind?: string; text?: string }): RawSessionEvent {
  return {
    type: 'user/message',
    seq: options.seq,
    ...(options.time === undefined ? {} : { time: options.time }),
    data: {
      ...(options.sourceKind === undefined ? {} : { source: { kind: options.sourceKind } }),
      content: [{ type: 'text', text: options.text ?? 'hello' }],
    },
  }
}

describe('foldMessageRecords — queue/delivery pairing', () => {
  it('pairs a delivery to its queue by messageId', () => {
    const folded = foldMessageRecords([
      queued({ seq: 1, time: T, id: 'm-1', senderId: 'lead', senderName: 'lead', targetId: 'ui', text: 'take task-4' }),
      delivered({ seq: 2, time: T + 50, messageId: 'm-1', targetId: 'ui' }),
    ])
    expect(folded.records).toHaveLength(1)
    expect(folded.records[0]).toMatchObject({
      messageId: 'm-1',
      queuedAt: T,
      deliveredAt: T + 50,
      senderId: 'lead',
      senderName: 'lead',
      targetId: 'ui',
      preview: 'take task-4',
    })
    expect(folded.diagnostics).toMatchObject({ queued: 1, delivered: 1, unpairedDeliveries: 0 })
  })

  it('pairs by ID even when adjacency would mis-pair (the rule that matters)', () => {
    // Two exchanges interleaved so that the deliveries arrive in the OPPOSITE
    // order from their queues: a "pair each delivery with the nearest open
    // queue" implementation would swap the delivery times.
    const folded = foldMessageRecords([
      queued({ seq: 1, time: T, id: 'm-1', senderId: 'a', targetId: 'x', text: 'first' }),
      queued({ seq: 2, time: T + 10, id: 'm-2', senderId: 'b', targetId: 'y', text: 'second' }),
      delivered({ seq: 3, time: T + 20, messageId: 'm-2', targetId: 'y' }),
      delivered({ seq: 4, time: T + 30, messageId: 'm-1', targetId: 'x' }),
    ])
    const byId = new Map(folded.records.map((record) => [record.messageId, record]))
    expect(byId.get('m-1')?.deliveredAt).toBe(T + 30)
    expect(byId.get('m-2')?.deliveredAt).toBe(T + 20)
    expect(byId.get('m-1')?.preview).toBe('first')
    expect(byId.get('m-2')?.preview).toBe('second')
  })

  it('keeps an unmatched queue and leaves the delivery fields unset', () => {
    const folded = foldMessageRecords([queued({ seq: 1, time: T, id: 'm-9', senderId: 'lead', targetId: 'docs', text: 'never delivered' })])
    expect(folded.records).toHaveLength(1)
    expect(folded.records[0]?.deliveredAt).toBeUndefined()
    // `to` on the wire comes from `targetId`; with no delivery it stays as the
    // queue's own target (or absent when the queue never named one).
    expect(folded.records[0]?.targetId).toBe('docs')
    expect(folded.diagnostics.unpairedDeliveries).toBe(0)
  })

  it('emits a delivery whose queue is unreadable, with NO invented sender', () => {
    const folded = foldMessageRecords([delivered({ seq: 7, time: T + 5, messageId: 'm-orphan', targetId: 'ui' })])
    expect(folded.records).toHaveLength(1)
    expect(folded.records[0]).toMatchObject({ messageId: 'm-orphan', deliveredAt: T + 5, targetId: 'ui' })
    expect(folded.records[0]?.senderId, 'the journal does not say who sent it').toBeUndefined()
    expect(folded.records[0]?.queuedAt).toBeUndefined()
    expect(folded.diagnostics.unpairedDeliveries).toBe(1)
  })

  it('keeps the FIRST queue for a duplicated message id (a re-append is not a second message)', () => {
    const folded = foldMessageRecords([
      queued({ seq: 5, time: T + 100, id: 'm-1', senderId: 'late', text: 'later copy' }),
      queued({ seq: 1, time: T, id: 'm-1', senderId: 'early', text: 'first copy' }),
    ])
    // `inLogOrder` sorts by seq first, so seq 1 is seen first and wins.
    expect(folded.records).toHaveLength(1)
    expect(folded.records[0]?.queuedAt).toBe(T)
    expect(folded.records[0]?.senderId).toBe('early')
    expect(folded.diagnostics.queued).toBe(2)
  })

  it('takes the LAST delivery for a repeated id (logs are append-only)', () => {
    const folded = foldMessageRecords([
      queued({ seq: 1, time: T, id: 'm-1', senderId: 'lead' }),
      delivered({ seq: 2, time: T + 10, messageId: 'm-1' }),
      delivered({ seq: 3, time: T + 20, messageId: 'm-1' }),
    ])
    expect(folded.records[0]?.deliveredAt).toBe(T + 20)
    expect(folded.diagnostics.delivered).toBe(2)
  })

  it('fills a missing queue target from the delivery', () => {
    const folded = foldMessageRecords([
      queued({ seq: 1, time: T, id: 'm-1', senderId: 'lead' }),
      delivered({ seq: 2, time: T + 10, messageId: 'm-1', targetId: 'ui' }),
    ])
    expect(folded.records[0]?.targetId).toBe('ui')
  })
})

describe('foldMessageRecords — the human vs the runtime', () => {
  it('reads a user/message with source.kind "user" as a prompt', () => {
    const folded = foldMessageRecords([userMessage({ seq: 1, time: T, sourceKind: 'user', text: 'build the gantt panel' })])
    expect(folded.userPrompts).toHaveLength(1)
    expect(folded.userPrompts[0]).toMatchObject({ time: T, sourceKind: 'user', preview: 'build the gantt panel' })
    expect(folded.diagnostics.userPrompts).toBe(1)
    expect(folded.diagnostics.injectedUserMessages).toBe(0)
  })

  it('drops a runtime injection instead of inventing a prompt', () => {
    // The real log carries `time-context`, `tool-jobs`, `subagent-settled`,
    // `team-message`, `runtime-context`, `agent-instructions`, `schedule`.
    for (const kind of ['time-context', 'tool-jobs', 'subagent-settled', 'team-message', 'runtime-context', 'agent-instructions', 'schedule']) {
      const folded = foldMessageRecords([userMessage({ seq: 1, time: T, sourceKind: kind, text: 'system text' })])
      expect(folded.userPrompts, kind).toEqual([])
      expect(folded.diagnostics.injectedUserMessages, kind).toBe(1)
    }
  })

  it('ignores a user/message with no source.kind at all (no discriminator, no prompt)', () => {
    const folded = foldMessageRecords([userMessage({ seq: 1, time: T, text: 'no source' })])
    expect(folded.userPrompts).toEqual([])
    expect(folded.diagnostics.injectedUserMessages).toBe(0)
    expect(folded.diagnostics.userPrompts).toBe(0)
  })

  it('orders prompts ascending by time, then by seq', () => {
    const folded = foldMessageRecords([
      userMessage({ seq: 9, time: T + 10, sourceKind: 'user', text: 'second' }),
      userMessage({ seq: 3, time: T + 10, sourceKind: 'user', text: 'first-at-same-time' }),
      userMessage({ seq: 1, time: T, sourceKind: 'user', text: 'earliest' }),
    ])
    expect(folded.userPrompts.map((prompt) => prompt.preview)).toEqual(['earliest', 'first-at-same-time', 'second'])
  })
})

describe('foldMessageRecords — previews', () => {
  it('collapses whitespace runs and trims', () => {
    const folded = foldMessageRecords([queued({ seq: 1, time: T, id: 'm-1', text: '  line one\n\n\tline two   ' })])
    expect(folded.records[0]?.preview).toBe('line one line two')
  })

  it('clips to MESSAGE_PREVIEW_MAX with an ellipsis, never longer', () => {
    const folded = foldMessageRecords([queued({ seq: 1, time: T, id: 'm-1', text: 'x'.repeat(400) })])
    const preview = folded.records[0]?.preview ?? ''
    expect(preview.length).toBeLessThanOrEqual(MESSAGE_PREVIEW_MAX)
    expect(preview.length).toBe(MESSAGE_PREVIEW_MAX)
    expect(preview.endsWith('\u2026')).toBe(true)
  })

  it('joins multiple content parts and drops non-text items', () => {
    const folded = foldMessageRecords([
      queued({
        seq: 1,
        time: T,
        id: 'm-1',
        content: [{ type: 'text', text: 'first' }, { type: 'image', url: 'x' }, { type: 'text', text: 'second' }],
      }),
    ])
    expect(folded.records[0]?.preview).toBe('first second')
  })

  it('leaves preview unset when there is no text (a preview is never fabricated)', () => {
    for (const content of [[], [{ type: 'image' }], 'not-an-array', [{ text: 42 }]]) {
      const folded = foldMessageRecords([queued({ seq: 1, time: T, id: 'm-1', content })])
      expect(folded.records[0]?.preview, JSON.stringify(content)).toBeUndefined()
    }
  })
})

describe('foldMessageRecords — ordering, tolerance and determinism', () => {
  it('orders records ascending by hand-over time, then seq', () => {
    const folded = foldMessageRecords([
      queued({ seq: 9, time: T + 100, id: 'late' }),
      queued({ seq: 2, time: T, id: 'early' }),
      delivered({ seq: 3, time: T + 5, messageId: 'orphan' }),
      queued({ seq: 4, time: T, id: 'early-tie' }),
    ])
    const order = folded.records.map((record) => record.queuedAt ?? record.deliveredAt)
    expect(order).toEqual([...order].sort((a, b) => (a as number) - (b as number)))
    expect(folded.records[0]?.messageId).toBe('early')
  })

  it('is deterministic under input permutation (seq keeps the order)', () => {
    const events = [
      queued({ seq: 1, time: T, id: 'm-1', senderId: 'a', text: 'one' }),
      queued({ seq: 2, time: T + 10, id: 'm-2', senderId: 'b', text: 'two' }),
      delivered({ seq: 3, time: T + 20, messageId: 'm-2' }),
      delivered({ seq: 4, time: T + 30, messageId: 'm-1' }),
      userMessage({ seq: 5, time: T + 40, sourceKind: 'user', text: 'prompt' }),
      delivered({ seq: 6, time: T + 50, messageId: 'm-orphan' }),
    ]
    const forward = foldMessageRecords(events)
    const backward = foldMessageRecords([...events].reverse())
    expect(backward.records).toEqual(forward.records)
    expect(backward.userPrompts).toEqual(forward.userPrompts)
    expect(backward.diagnostics).toEqual(forward.diagnostics)
  })

  it('never throws on malformed payloads and never counts a phantom event', () => {
    const junk: unknown[] = [
      null,
      42,
      'team/message/queued',
      { type: 'team/message/queued' },
      { type: 'team/message/queued', time: T, data: {} },
      { type: 'team/message/queued', time: T, data: { message: {} } },
      // No `time` on the event: the record is undated and must be skipped
      // rather than dated from the message body (which carries no clock).
      { type: 'team/message/queued', seq: 1, data: { message: { id: 'no-time' } } },
      { type: 'team/message/delivered', time: T, data: {} },
      { type: 'team/message/delivered', seq: 2, time: T, data: { messageId: 42 } },
      { type: 'user/message', seq: 3, time: T, data: { source: 'user' } },
      { type: 'user/message', seq: 4, data: { source: { kind: 'user' } } },
      [],
    ]
    const folded = foldMessageRecords(junk)
    expect(folded.records).toEqual([])
    expect(folded.userPrompts).toEqual([])
    expect(folded.diagnostics).toEqual({
      queued: 0,
      delivered: 0,
      unpairedDeliveries: 0,
      userPrompts: 0,
      injectedUserMessages: 0,
    })
  })

  it('returns an empty fold for an empty log', () => {
    expect(foldMessageRecords([])).toEqual({
      records: [],
      userPrompts: [],
      diagnostics: { queued: 0, delivered: 0, unpairedDeliveries: 0, userPrompts: 0, injectedUserMessages: 0 },
    })
  })

  it('the preview cap it enforces matches the frozen contract constant', () => {
    // `fold.ts` duplicates the number deliberately (it must not import the wire
    // contract); the duplication is only safe while they agree.
    const folded = foldMessageRecords([queued({ seq: 1, time: T, id: 'm-1', text: 'y'.repeat(MESSAGE_PREVIEW_MAX + 50) })])
    expect((folded.records[0]?.preview ?? '').length).toBe(MESSAGE_PREVIEW_MAX)
  })
})
