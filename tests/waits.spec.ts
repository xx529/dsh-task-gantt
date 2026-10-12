/**
 * `wait_agent` blocks — the time an agent spent waiting on its peers, not working.
 *
 * The user's ask: "在信息收发这一行，要多展示 wait_agent 的标志，开始和结束，这样就知道这个
 * 时候 agent 不是在工作，而是在等待".
 *
 * The EVENT SHAPES here are the real ones, measured on this machine by decompressing an
 * actual session log: a `wait_agent` call is `tool/call` with `data.name` /
 * `data.callId` / `data.arguments`, and its result is `tool/result` carrying
 * `data.message.toolCallId` and a `content` list whose text is `{"timedOut":bool}`.
 * The pairing key lives in a DIFFERENT place on each side, which is the whole reason
 * this fold needs its own tests. In one real session: 24 calls, 24 of 24 paired,
 * durations 2.4s to 300s.
 */
import { describe, expect, it } from 'vitest'
import { foldWaitSpans, WAIT_TOOL_NAME } from '../src/host/fold.ts'

/** A `tool/call` exactly as the host writes one. */
function call(callId: string, time: number, args: unknown = { timeout_ms: 60_000 }) {
  return { type: 'tool/call', seq: time, time, data: { name: 'wait_agent', callId, arguments: JSON.stringify(args) } }
}

/** A `tool/result` that answers `callId`, with the real two-path linkage. */
function result(callId: string, time: number, body: unknown = { timedOut: false }) {
  return {
    type: 'tool/result',
    seq: time + 1,
    time,
    data: { message: { role: 'tool', toolCallId: callId, isError: false, content: [{ type: 'text', text: JSON.stringify(body) }] } },
  }
}

describe('foldWaitSpans — pairing a wait with its end', () => {
  it('pairs a call with its result and reports both ends', () => {
    const waits = foldWaitSpans([call('c1', 1_000), result('c1', 4_000, { timedOut: false })], 's1')
    expect(waits).toHaveLength(1)
    expect(waits[0]).toMatchObject({ start: 1_000, end: 4_000, timedOut: false, sessionId: 's1' })
    expect(waits[0]?.timeoutMs).toBe(60_000)
  })

  it('reads the result linkage from EITHER spelling the host uses', () => {
    // `toolCallId` directly, or nested under `source.callId`. Reading only one would
    // silently drop half the waits, with no error anywhere.
    const direct = foldWaitSpans([call('c1', 1_000), result('c1', 2_000)], 's1')
    expect(direct[0]?.end).toBe(2_000)
    const nested = foldWaitSpans(
      [
        call('c2', 1_000),
        { type: 'tool/result', seq: 9, time: 3_000, data: { message: { source: { kind: 'tool', callId: 'c2' }, content: [{ text: '{"timedOut":true}' }] } } },
      ],
      's1',
    )
    expect(nested[0]).toMatchObject({ end: 3_000, timedOut: true })
  })

  it('an UNPAIRED call is still open: `end: null`, never an invented end', () => {
    // The agent is still blocked. Filling in `end = start` would say the wait lasted no
    // time; filling in `end = now` would claim it stopped. Both are inventions.
    const waits = foldWaitSpans([call('c1', 1_000)], 's1')
    expect(waits).toHaveLength(1)
    expect(waits[0]?.end).toBeNull()
    expect(waits[0]?.timedOut).toBeUndefined()
  })

  it('keeps `timedOut` as three states — true, false, and UNKNOWN', () => {
    // The distinction the user needs is "waited for nothing" vs "a peer came". An
    // unreadable body must NOT collapse to `false`, because that is the positive claim
    // "someone arrived".
    const good = foldWaitSpans([call('a', 1_000), result('a', 2_000, { timedOut: true })], 's1')
    expect(good[0]?.timedOut).toBe(true)
    const woken = foldWaitSpans([call('b', 1_000), result('b', 2_000, { timedOut: false })], 's1')
    expect(woken[0]?.timedOut).toBe(false)
    for (const body of ['not json', '', '{}', '{"timedOut":"yes"}', '{"other":1}']) {
      const unknown = foldWaitSpans([call('c', 1_000), result('c', 2_000, body)], 's1')
      expect(unknown[0]?.timedOut, `body ${JSON.stringify(body)} must leave timedOut ABSENT`).toBeUndefined()
      // ...and the END is still known, so the wait is still drawn — only its outcome is not.
      expect(unknown[0]?.end).toBe(2_000)
    }
  })

  it('drops a call with no callId rather than pairing by position', () => {
    // Two waits can overlap, so "the next result" is not "its result". A wait matched by
    // position would attach one agent's end to another's start.
    const noId = { type: 'tool/call', seq: 1, time: 1_000, data: { name: 'wait_agent', arguments: '{}' } }
    expect(foldWaitSpans([noId, result('c1', 2_000)], 's1')).toEqual([])
  })

  it('ignores every other tool', () => {
    const other = { type: 'tool/call', seq: 1, time: 1_000, data: { name: 'read_file', callId: 'x', arguments: '{}' } }
    expect(foldWaitSpans([other, result('x', 2_000)], 's1')).toEqual([])
    expect(WAIT_TOOL_NAME).toBe('wait_agent')
  })

  it('handles overlapping waits, out-of-order input, and a bad timeout', () => {
    const waits = foldWaitSpans(
      [
        result('c2', 9_000, { timedOut: true }),
        call('c1', 1_000),
        call('c2', 2_000, { timeout_ms: 'nope' }),
        result('c1', 5_000, { timedOut: false }),
      ],
      's1',
    )
    expect(waits.map((w) => [w.start, w.end])).toEqual([
      [1_000, 5_000],
      [2_000, 9_000],
    ])
    // An unusable timeout is omitted, not turned into 0 or NaN.
    expect(waits[1]?.timeoutMs).toBeUndefined()
  })

  it('ignores a LATER duplicate result (the compaction re-append)', () => {
    // A real defect, found by running this fold against an actual session log: every
    // wait carried TWO results — the real one, and then a re-append from the compaction
    // machinery whose body is "[dsh-jev-compaction] Historical tool output pruned…",
    // landing up to 51 minutes later. Keeping the LAST gave every wait a wildly wrong
    // duration and lost every outcome. The earliest result is when the call returned.
    const compaction = (id: string, time: number) => ({
      type: 'tool/result',
      seq: 9999,
      time,
      data: { message: { role: 'tool', toolCallId: id, content: [{ type: 'text', text: '[dsh-jev-compaction] Historical tool output pruned from active model context.' }] } },
    })
    const waits = foldWaitSpans(
      [
        call('c1', 1_000),
        result('c1', 61_000, { timedOut: true }), // the real one
        compaction('c1', 3_000_000), // the bookkeeping re-append, ~49 min later
      ],
      's1',
    )
    expect(waits).toHaveLength(1)
    expect(waits[0]?.end, 'the FIRST result is when the call returned').toBe(61_000)
    expect(waits[0]?.timedOut, 'the real outcome must survive the re-append').toBe(true)
  })

  it('keeps the earliest result even when the log is in a different order', () => {
    // The choice is by time, not by position, so a reordered log cannot change it.
    const waits = foldWaitSpans(
      [result('c1', 3_000_000), call('c1', 1_000), result('c1', 61_000, { timedOut: false })],
      's1',
    )
    expect(waits[0]?.end).toBe(61_000)
    expect(waits[0]?.timedOut).toBe(false)
  })

  it('is empty for a log with no waits, and never throws on junk', () => {
    expect(foldWaitSpans([], 's1')).toEqual([])
    expect(() => foldWaitSpans([null, 42, 'x', { type: 'tool/call' }, { type: 'tool/result', data: null }], 's1')).not.toThrow()
    expect(foldWaitSpans([null, 42, 'x'], 's1')).toEqual([])
  })
})
