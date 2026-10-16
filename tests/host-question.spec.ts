/**
 * The "the model asked a human" marker.
 *
 * Fixtures are the REAL payloads measured across 237 logs / 64 questions
 * (`~/.dsh/sessions/*`), because the shapes that matter are the ones a hand-written
 * fixture would never have invented:
 *
 * - **36 of the 64 calls had TWO `tool/result` events for one `callId`** — the answer,
 *   and a context-compaction replacement appended 28 minutes later whose text is
 *   `[dsh-jev-compaction] Historical tool output pruned from active model context.`
 *   Applying both produced a record that was `UNPARSED` *and* held a selection, with
 *   `end` 28 minutes late. That is the defect these locks exist for.
 * - one result really was a FAILURE (`isError: true`, `code: 'DELEGATED_CALLER'`),
 *   arriving 11 ms after the call — the question never reached a human.
 * - 29 calls asked 2–4 questions, 6 questions were multi-select, and 11 answers came
 *   back as free text (`custom`) with `selected: []`.
 */
import { describe, expect, it } from 'vitest'
import { foldQuestionRecords } from '../src/host/fold.ts'
import { sortMessageSpans } from '../src/host/timeline.ts'
import type { MessageSpan } from '../src/shared/contract.ts'

/* --------------------------------------------------------------- fixtures */

const ANSWER_CALL_ID = 'call_00_2f0BGiAY8NaRAPRZKqzA3713'
const ANSWER_TIME = 1791540551542
const ANSWER_LANDED = 1791540578598
/** 1 680 590 ms later — 28 minutes. */
const PLACEHOLDER_TIME = 1791542257132

/** The real compaction replacement, verbatim. */
const PLACEHOLDER_TEXT =
  '[dsh-jev-compaction]\nHistorical tool output pruned from active model context.\ntool=ask_user_question\noriginalChars=52\nreason=low semantic retention score\nThe original event remains available in the session log.'

/** The real 1-question call, options included. */
const ANSWER_CALL = {
  type: 'tool/call',
  seq: 711,
  time: ANSWER_TIME,
  data: {
    turn: 1,
    step: 3,
    callId: ANSWER_CALL_ID,
    name: 'ask_user_question',
    arguments: JSON.stringify({
      questions: [
        {
          id: 'repro',
          header: '实测新会话',
          question: '请在 DSH 桌面版里点一次「新会话」。从点击到界面可用,大概等了多久?(我这边正在录时间线)',
          options: [
            { label: '不到 3 秒', description: '基本无感' },
            { label: '3~10 秒', description: '能感觉到卡一下(和日志里 7.4s 吻合)' },
            { label: '10~30 秒', description: '明显等待' },
            { label: '超过 30 秒', description: '等很久,和 18:04 那次 +102s 前后吻合' },
          ],
        },
      ],
    }),
  },
}

/** One `tool/result` carrying a text body. */
function result(
  seq: number,
  time: number,
  text: string,
  callId: string = ANSWER_CALL_ID,
  extra: Record<string, unknown> = {},
): unknown {
  return {
    type: 'tool/result',
    seq,
    time,
    data: {
      turn: 1,
      step: 3,
      message: {
        role: 'tool',
        source: { kind: 'tool', callId },
        toolCallId: callId,
        content: [{ type: 'text', text }],
        ...extra,
      },
    },
  }
}

const THE_ANSWER = result(712, ANSWER_LANDED, '{"answers":[{"id":"repro","selected":["3~10 秒"]}]}')
const THE_PLACEHOLDER = result(966, PLACEHOLDER_TIME, PLACEHOLDER_TEXT)

/* ------------------------------------------------------ the duplicate trap */

describe('a question with a compaction duplicate resolves to ONE result', () => {
  it('keeps the real answer and its real end time', () => {
    const [record] = foldQuestionRecords([ANSWER_CALL, THE_ANSWER, THE_PLACEHOLDER])
    expect(record?.detail.status).toBe('answered')
    expect(record?.detail.questions[0]?.selected).toEqual(['3~10 秒'])
    expect(record?.detail.unparsed, 'the pruned rewrite must not mark the ask unparsed').toBeUndefined()
    expect(record?.detail.raw).toBeUndefined()
    expect(record?.end, 'end is when the question was ANSWERED').toBe(ANSWER_LANDED)
  })

  it('SELF-CALIBRATES: the naive "last result wins" rule fails this lock', () => {
    // Teeth. DSH's own projection semantics are last-write-wins, and a later compaction
    // rewrite is appended AFTER the answer — so the obvious implementation is wrong in
    // exactly the direction this lock forbids. Proving the naive answer differs is what
    // makes the assertion above meaningful rather than tautological.
    const naiveEnd = Math.max(ANSWER_LANDED, PLACEHOLDER_TIME)
    expect(naiveEnd, 'the placeholder really is later').toBe(PLACEHOLDER_TIME)
    const [record] = foldQuestionRecords([ANSWER_CALL, THE_ANSWER, THE_PLACEHOLDER])
    expect(record?.end).not.toBe(naiveEnd)
    // …and a naive "apply both" would have held a selection AND been unparsed.
    expect(record?.detail.unparsed).not.toBe(true)
  })

  it('a reversed log order (placeholder first) still finds the answer', () => {
    // Order-independent by construction: the choice is made over ALL facts, not by
    // overwriting as we walk.
    const [record] = foldQuestionRecords([ANSWER_CALL, THE_PLACEHOLDER, THE_ANSWER])
    expect(record?.detail.questions[0]?.selected).toEqual(['3~10 秒'])
    expect(record?.end).toBe(ANSWER_LANDED)
  })

  it('never reports `unparsed` and a selection at the same time', () => {
    // The invariant, over every shape at once.
    const records = foldQuestionRecords([
      ANSWER_CALL,
      THE_ANSWER,
      THE_PLACEHOLDER,
      { ...(ANSWER_CALL as object), seq: 800, time: 2, data: { ...(ANSWER_CALL as { data: object }).data, callId: 'c-none' } },
    ])
    for (const record of records) {
      const hasSelection = record.detail.questions.some((question) => question.selected.length > 0)
      if (record.detail.unparsed === true) {
        expect(hasSelection, `${record.callId}: unparsed must not carry a selection`).toBe(false)
      }
      if (hasSelection) expect(record.detail.unparsed).toBeUndefined()
    }
  })

  it('falls back to the raw text when ONLY the pruned rewrite survives', () => {
    // The original output was pruned before we ever read it: we know the ask completed,
    // we do NOT know the answer, and the raw line says exactly that.
    const [record] = foldQuestionRecords([ANSWER_CALL, THE_PLACEHOLDER])
    expect(record?.detail.status, 'a result exists, so the ask is not waiting').toBe('answered')
    expect(record?.detail.unparsed).toBe(true)
    expect(record?.detail.raw).toContain('[dsh-jev-compaction]')
    expect(record?.detail.questions[0]?.selected, 'not an empty CHOICE — an unknown one').toEqual([])
    expect(record?.end).toBe(PLACEHOLDER_TIME)
  })
})

/* ------------------------------------------------------------- the states */

describe('the three question states', () => {
  it('is `waiting` with `end: null` while no result exists', () => {
    const [record] = foldQuestionRecords([ANSWER_CALL])
    expect(record?.detail.status).toBe('waiting')
    expect(record?.end).toBeNull()
    expect(record?.detail.questions[0]?.prompt).toContain('请在 DSH 桌面版里点一次')
    expect(record?.detail.questions[0]?.options).toHaveLength(4)
    expect(record?.detail.questions[0]?.options[1]?.description).toContain('7.4s')
  })

  it('is `failed` for the REAL UserQuestionError, not `answered`', () => {
    // The real failure: a delegated caller may not ask a human. It arrived 11 ms after
    // the call, so it is a terminal STATE, not a pending one.
    const failedCall = { ...(ANSWER_CALL as { data: Record<string, unknown> }), seq: 1398, time: 1791962503821 }
    const failedResult = {
      type: 'tool/result',
      seq: 1399,
      time: 1791962503832,
      data: {
        turn: 1,
        step: 3,
        error: { name: 'UserQuestionError', code: 'DELEGATED_CALLER' },
        message: {
          role: 'tool',
          source: { kind: 'tool', callId: ANSWER_CALL_ID },
          toolCallId: ANSWER_CALL_ID,
          isError: true,
          content: [
            {
              type: 'text',
              text: "Error: human interaction is unavailable while the calling agent is owned by another live agent; include the unresolved question or decision in the child agent's final result",
            },
          ],
        },
      },
    }
    const [record] = foldQuestionRecords([failedCall, failedResult])
    expect(record?.detail.status).toBe('failed')
    expect(record?.detail.errorCode).toBe('DELEGATED_CALLER')
    expect(record?.detail.errorText).toContain('human interaction is unavailable')
    expect(record?.detail.questions[0]?.selected, 'nobody chose anything').toEqual([])
    expect(record?.end).toBe(1791962503832)
  })

  it('pairs a multi-question call with per-question answers, by id', () => {
    const call = {
      type: 'tool/call',
      seq: 1,
      time: 1000,
      data: {
        callId: 'c-multi',
        name: 'ask_user_question',
        arguments: JSON.stringify({
          questions: [
            { id: 'approval_authority', header: '审批权归属', question: '副作用由谁把关?', options: [{ label: '只读起步' }, { label: '归 HtDot' }] },
            { id: 'integration_surface', header: '接入形态', question: 'DSH 以什么形态被调度?', options: [{ label: 'headless CLI' }] },
            { id: 'scope', header: '本轮范围', question: '这一步产出什么?', options: [{ label: '方案文档' }, { label: '直接实现' }], multi_select: true },
          ],
        }),
      },
    }
    // Answers arrive out of order AND only for two of the three questions.
    const answered = result(2, 1100, '{"answers":[{"id":"scope","selected":["方案文档"]},{"id":"approval_authority","selected":["只读起步"]}]}', 'c-multi')
    const [record] = foldQuestionRecords([call, answered])
    const detail = record?.detail
    expect(detail?.questions).toHaveLength(3)
    expect(detail?.questions[0]?.selected).toEqual(['只读起步'])
    expect(detail?.questions[1]?.selected, 'a question with no answer keeps an empty selection').toEqual([])
    expect(detail?.questions[2]?.selected).toEqual(['方案文档'])
    expect(detail?.questions[2]?.multiSelect).toBe(true)
    expect(detail?.questions[0]?.multiSelect).toBe(false)
  })

  it('carries a free-text answer, which is a normal outcome and not an error', () => {
    // Real: the human typed instead of clicking, so `selected` is EMPTY and `custom`
    // holds the reply. The client must not read this as "chose nothing".
    const call = {
      type: 'tool/call',
      seq: 1,
      time: 1000,
      data: {
        callId: 'c-custom',
        name: 'ask_user_question',
        arguments: JSON.stringify({
          questions: [{ id: 'which_sidebar', header: '确认是哪个侧边栏', question: '你要的是哪一个?', multi_select: false, options: [{ label: 'B 右侧边栏' }, { label: 'A 左侧边栏' }] }],
        }),
      },
    }
    const answered = {
      type: 'tool/result',
      seq: 2,
      time: 1100,
      data: {
        message: {
          source: { kind: 'tool', callId: 'c-custom' },
          content: [{ type: 'text', text: JSON.stringify({ answers: [{ id: 'which_sidebar', selected: [], custom: '左侧边栏，我现在用的是 deepseek harness desktop 的桌面客户端' }] }) }],
        },
      },
    }
    const [record] = foldQuestionRecords([call, answered])
    expect(record?.detail.status).toBe('answered')
    expect(record?.detail.questions[0]?.selected).toEqual([])
    expect(record?.detail.questions[0]?.custom).toContain('deepseek harness desktop')
  })
})

/* ------------------------------------------------------------------ total */

describe('the question fold is total', () => {
  it('never throws on hostile payloads, and still marks the instant', () => {
    const hostile: readonly unknown[] = [
      null,
      'nope',
      { type: 'tool/call', seq: 1, time: 1, data: null },
      { type: 'tool/call', seq: 2, time: 2, data: { callId: 'c1', name: 'ask_user_question', arguments: '{not json' } },
      { type: 'tool/call', seq: 3, time: 3, data: { callId: 'c2', name: 'ask_user_question', arguments: '{"questions":"nope"}' } },
      { type: 'tool/call', seq: 4, time: 4, data: { callId: 'c3', name: 'ask_user_question', arguments: '{"questions":[null,{"question":42,"options":[{},"x"]}]}' } },
      { type: 'tool/call', seq: 5, time: 5, data: { callId: 'c4', name: 'bash', arguments: '{}' } },
      { type: 'tool/result', seq: 6, time: 6, data: { message: { source: { callId: 'c2' }, content: [{ type: 'text', text: 'not json at all' }] } } },
      { type: 'tool/result', seq: 7, time: 7, data: { message: { source: { callId: 'c3' }, content: [{ type: 'text', text: '{"answers":"nope"}' }] } } },
      { type: 'tool/result', seq: 8, data: { message: { source: { callId: 'c1' }, content: [{ type: 'text', text: '{}' }] } } },
    ]
    expect(() => foldQuestionRecords(hostile)).not.toThrow()
    const records = foldQuestionRecords(hostile)
    // Only the three `ask_user_question` calls become records; `bash` does not. The
    // marker's INSTANT is the point, so a call with unusable arguments still appears.
    expect(records).toHaveLength(3)
    // A call with unusable arguments still appears — the marker's position is the point.
    expect(records[0]?.detail.questions).toEqual([])
    expect(records[0]?.detail.status, 'an undated result cannot close the span').toBe('waiting')
    // An unparsable answer is reported as unparsed, with the raw line kept.
    expect(records[1]?.detail.unparsed).toBe(true)
    expect(records[1]?.detail.raw).toBe('not json at all')
    // `{"answers":"nope"}` is json but not the documented shape → also unparsed.
    expect(records[2]?.detail.unparsed).toBe(true)
    // A well-formed `{}` with no answers array is unparsed too, never a silent empty.
    expect(records[2]?.detail.questions[0]?.selected).toEqual([])
  })

  it('accepts `request_user_input` as the same tool', () => {
    const call = { type: 'tool/call', seq: 1, time: 1, data: { callId: 'c1', name: 'request_user_input', arguments: '{"questions":[{"id":"a","question":"q"}]}' } }
    expect(foldQuestionRecords([call])).toHaveLength(1)
  })

  it('returns nothing for a log without questions', () => {
    expect(foldQuestionRecords([])).toEqual([])
    expect(foldQuestionRecords([{ type: 'user/message', seq: 1, time: 1, data: {} }])).toEqual([])
  })
})

/* ------------------------------------------------------- end-to-end span */

describe('the question reaches the wire as a message-row span', () => {
  /** A host context whose only service is `agents`, backed by the fixture log. */
  function stubCtx(events: readonly unknown[]): never {
    return {
      logger: undefined,
      get: (key: string) =>
        key === 'agents'
          ? {
              get: (id: string) => ({
                id,
                status: 'running',
                options: {},
                session: { header: {}, snapshotEvents: () => events },
              }),
            }
          : undefined,
    } as never
  }

  it('is `kind: question`, addressed to the human, with `end` at the real answer', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    const response = await buildTimeline(
      stubCtx([{ type: 'session', seq: 0, id: 'lead', createdAt: 900 }, ANSWER_CALL, THE_ANSWER, THE_PLACEHOLDER]),
      'lead',
    )
    const lead = response.lanes.find((lane) => lane.role === 'lead')
    const span = (lead?.messages ?? []).find((message) => message.kind === 'question')
    expect(span, 'the marker must land on the exchange row').toBeDefined()
    expect(span?.from.kind).toBe('lead')
    expect(span?.to, 'the addressee is the human').toEqual({ kind: 'user', id: 'user', name: 'you' })
    expect(span?.time, 'dated at the ask').toBe(ANSWER_TIME)
    expect(span?.end, 'closed when the human answered — not at the pruned rewrite').toBe(ANSWER_LANDED)
    expect(span?.preview).toContain('请在 DSH 桌面版里点一次')
    expect(span?.question?.status).toBe('answered')
    expect(span?.question?.questions[0]?.selected).toEqual(['3~10 秒'])

    // Everything the client needs must survive the JSON the route ships.
    const wire = JSON.parse(JSON.stringify(response)) as typeof response
    const wireSpan = (wire.lanes.find((lane) => lane.role === 'lead')?.messages ?? []).find(
      (message) => message.kind === 'question',
    )
    expect(wireSpan?.question).toEqual(span?.question)
    expect(wireSpan?.question?.questions[0]?.options).toHaveLength(4)
    expect(wireSpan?.question?.questions[0]?.options[1]?.description).toContain('7.4s')
  })

  it('stays open (`end: null`) while the human has not answered', async () => {
    const { buildTimeline } = await import('../src/host/timeline.ts')
    const { clearSessionLogCache } = await import('../src/host/session-log.ts')
    clearSessionLogCache()
    const response = await buildTimeline(
      stubCtx([{ type: 'session', seq: 0, id: 'lead', createdAt: 900 }, ANSWER_CALL]),
      'lead',
    )
    const span = (response.lanes[0]?.messages ?? []).find((message) => message.kind === 'question')
    expect(span?.end, 'a question can sit unanswered, so the span is a live duration').toBeNull()
    expect(span?.question?.status).toBe('waiting')
  })
})

/* ------------------------------------------------- the marker-thinning rank */

describe('the marker rank: a question wins its thinning bucket', () => {
  /**
   * Two spans of the SAME direction on one lane, so the client's decimation really
   * makes them compete. Both are outgoing, which is the direction a question has
   * (`to` is the human, and the human has no lane).
   */
  function pair(questionTime: number): { message: MessageSpan; question: MessageSpan } {
    return {
      message: {
        kind: 'message',
        time: questionTime,
        end: null,
        from: { kind: 'lead', id: 'lead', name: 'lead' },
        to: { kind: 'teammate', id: 'm1', name: 'm1' },
        sessionId: 'lead',
      },
      question: {
        kind: 'question',
        time: questionTime,
        end: null,
        from: { kind: 'lead', id: 'lead', name: 'lead' },
        to: { kind: 'user', id: 'user', name: 'you' },
        sessionId: 'lead',
        question: { status: 'waiting', questions: [] },
      },
    }
  }

  /** One bucket wide enough to cover every fixture instant, so they must compete. */
  const BUCKET_MS = 1_000_000_000

  /** ui-2's decimation, driven exactly as the chart drives it. */
  async function keepDetailed(
    ordered: readonly MessageSpan[],
  ): Promise<{ kept: string[]; droppedTotal: number; candidates: number }> {
    const { decimateMarkers } = await import('../src/client/ui/timeline-layout.ts')
    const laneIdOf = (id: string): string | null => (id === 'user' ? null : id)
    const result = decimateMarkers(ordered, {
      windowStart: 0,
      // One bucket covers the whole test span, so the markers must fight.
      msPerPx: 1,
      widthPx: 40,
      mode: 'both',
      gapPx: 9,
      maxPerLane: 40,
      laneId: 'lead',
      laneIdOf,
    })
    return {
      kept: result.indices.map((index) => ordered[index]!.kind),
      droppedTotal: result.droppedTotal,
      candidates: result.candidates,
    }
  }

  /** The kept kinds only. */
  async function keep(ordered: readonly MessageSpan[]): Promise<string[]> {
    return (await keepDetailed(ordered)).kept
  }

  it('keeps the QUESTION, and drops the message instead', async () => {
    const { message, question } = pair(1_000_000)
    // The PRODUCTION comparator, not a copy of its table.
    const ordered = sortMessageSpans([message, question])
    expect(ordered.map((span) => span.kind), 'the host ordering puts the question first').toEqual([
      'question',
      'message',
    ])
    expect(await keep(ordered), 'the ? survives; the routine message is what gets summarised').toEqual(['question'])
  })

  /**
   * The algorithm the client used before this round, kept here as the CONTRAST.
   *
   * It sorted by time and took the earliest span of each bucket, so whichever marker
   * merely happened to be earlier won — and a question asked two minutes after a message
   * lost. It is reproduced rather than described so the contrast below is executable:
   * this function must keep the MESSAGE while the production path keeps the QUESTION.
   */
  function naiveEarliestWins(list: readonly MessageSpan[]): string[] {
    const used = new Set<number>()
    const kept: string[] = []
    for (const span of [...list].sort((a, b) => a.time - b.time)) {
      const bucket = Math.floor(span.time / BUCKET_MS) // one bucket covers the fixture
      if (used.has(bucket)) continue
      used.add(bucket)
      kept.push(span.kind)
    }
    return kept
  }

  it('CONTRAST: the old earliest-wins rule still loses the question — production does not', async () => {
    // Two things are asserted at once, and both are needed:
    //   1. the naive rule (what shipped before) drops the `?` — so this is not a
    //      tautology, and reverting the client's comparator makes the second half fail;
    //   2. the production path keeps it.
    const { message, question } = pair(1_000_000)
    const later: MessageSpan = { ...question, time: 1_000_000 + 120_000 }
    const ordered = sortMessageSpans([message, later])
    // The host still sorts the earlier message first — that is correct and unchanged;
    // ORDER alone was never the fix (0 exact ties exist in 2308 real pairs).
    expect(ordered.map((span) => span.kind)).toEqual(['message', 'question'])
    expect(naiveEarliestWins(ordered), 'the removed rule kept the message').toEqual(['message'])
    expect(await keep(ordered), 'the production path keeps the question').toEqual(['question'])
  })

  it('a question two minutes AFTER a message survives thinning, and the message is counted', async () => {
    // The user's case, as the reverse of the pin this test used to be. A question is
    // drawn whenever one exists in the bucket, and nothing vanishes silently: the
    // dropped message is part of `droppedTotal`, which is what the `+N` badge shows.
    const { message, question } = pair(1_000_000)
    const later: MessageSpan = { ...question, time: 1_000_000 + 120_000 }
    const ordered = sortMessageSpans([message, later])
    const outcome = await keepDetailed(ordered)
    expect(outcome.kept, 'the ? must be drawn even though the message is earlier').toEqual(['question'])
    expect(outcome.droppedTotal, 'the message is counted, not silently gone').toBe(1)
    expect(outcome.candidates).toBe(2)
  })

  it('agrees with the client on precedence: `question` outranks message and dispatch', async () => {
    // Parity lock against the client's own `messageKindRank()`, which cannot import the
    // host table. All three kinds here are OUTGOING on the lead lane — the direction a
    // question has — so they share one bucket set and really compete: exactly one can
    // survive, and both sides must pick the same one. This asserts the BEHAVIOUR rather
    // than restating either table, so it stays meaningful if the numbers change.
    //
    // A `user-prompt` is deliberately absent: it arrives FROM the human, so it is a
    // different direction and lands in a different bucket set. The two never compete,
    // which is also why the parity that matters is question-vs-message.
    const base = pair(1_000_000)
    const three: MessageSpan[] = [
      { ...base.message, kind: 'message' },
      { ...base.message, kind: 'dispatch', to: { kind: 'teammate', id: 'm2', name: 'm2' } },
      { ...base.question, kind: 'question' },
    ]
    expect(await keep(sortMessageSpans(three)), 'the most informative kind takes the slot').toEqual(['question'])
  })
})

/* ------------------------------------------------------ real-data survival */

describe('real data: every question in the bucket gets its ?', () => {
  /**
   * The lead lane of the real team session `4d51254b-…`, reduced to the markers within
   * two thinning buckets of each question — the exact neighbourhoods where a `?` could
   * lose its slot. These are REAL timings, not constructed ones; four of the five
   * questions have a `user-prompt` 30 s / 54.7 s / 200 s before them, which is the
   * adversarial shape at a real scale (9 px is about 3.8 minutes here).
   *
   * The full lane has 233 markers; the rest are far away and cannot compete for these
   * buckets, so they are omitted to keep the fixture readable. `droppedTotal` is
   * therefore asserted only against this fixture's own candidate count.
   */
  const REAL_LANE: readonly (readonly [MessageSpan['kind'], number, 'out' | 'in'])[] = [
    ['user-prompt', 1791648140882, 'in'],
    ['question', 1791648238592, 'out'],
    ['question', 1791651644405, 'out'],
    ['user-prompt', 1791736899747, 'in'],
    ['question', 1791736929825, 'out'],
    ['user-prompt', 1791788623185, 'in'],
    ['question', 1791788677858, 'out'],
    ['user-prompt', 1791791358342, 'in'],
    ['question', 1791791558548, 'out'],
  ]

  /** The same pixel scale the panel used: 9 px ≈ 3.8 minutes. */
  const MS_PER_PX = (3.8 * 60 * 1000) / 9
  const WINDOW_START = 1791648000000
  /**
   * An exact multiple of 9 px, so `bucketSizePx` is exactly `gapPx` and a span's bucket
   * is simply `floor(x / 9)` — no re-derivation of the client's arithmetic needed.
   */
  const WIDTH_PX = Math.ceil(((1791791558548 - WINDOW_START) / MS_PER_PX + 9) / 9) * 9

  /** The fixture as spans, with each one's direction made explicit. */
  function realLane(): MessageSpan[] {
    return REAL_LANE.map(([kind, time, direction]) => {
      const span: MessageSpan = {
        kind,
        time,
        end: null,
        from:
          direction === 'out'
            ? { kind: 'lead', id: 'lead', name: 'lead' }
            : { kind: 'user', id: 'user', name: 'you' },
        sessionId: 'lead',
      }
      if (direction === 'out') {
        span.to =
          kind === 'question'
            ? { kind: 'user', id: 'user', name: 'you' }
            : { kind: 'teammate', id: 'm1', name: 'm1' }
      }
      return span
    })
  }

  const bucketOf = (time: number): number => Math.max(0, Math.floor((time - WINDOW_START) / MS_PER_PX / 9))

  it('keeps ALL five real questions, and never drops a bucket that holds one', async () => {
    const { decimateMarkers } = await import('../src/client/ui/timeline-layout.ts')
    const ordered = sortMessageSpans(realLane())
    const result = decimateMarkers(ordered, {
      windowStart: WINDOW_START,
      msPerPx: MS_PER_PX,
      widthPx: WIDTH_PX,
      mode: 'both',
      gapPx: 9,
      maxPerLane: 40,
      laneId: 'lead',
      laneIdOf: (id: string) => (id === 'user' ? null : id),
    })
    const kept = result.indices.map((index) => ordered[index]!)
    const keptQuestions = kept.filter((span) => span.kind === 'question')
    const realQuestionTimes = REAL_LANE.filter(([kind]) => kind === 'question')
      .map(([, time]) => time)
      .sort((a, b) => a - b)
    expect(
      keptQuestions.map((span) => span.time).sort((a, b) => a - b),
      'every real question must be drawn',
    ).toEqual(realQuestionTimes)
    // The invariant that actually encodes the user's request: no bucket containing a
    // question may end up showing something else (or nothing).
    const questionBuckets = new Set(realQuestionTimes.map((time) => bucketOf(time)))
    const keptQuestionBuckets = new Set(keptQuestions.map((span) => bucketOf(span.time)))
    expect([...questionBuckets].filter((bucket) => !keptQuestionBuckets.has(bucket))).toEqual([])
    // Nothing vanished silently: everything thinned is counted for the `+N` badge.
    expect(result.droppedTotal).toBe(result.candidates - kept.length)
  })
})
