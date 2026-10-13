/**
 * Which lanes get a status word, and what that word is.
 *
 * The user, after 0.2.28 shipped a bare spinner:
 *
 *   > 你现在只有转圈圈的东西没有像这个 有简单状态文本的展示
 *
 * pointing at another panel whose row reads `运行中  正在分析请求` — a state word plus a
 * description. PART 1 of the task asked what text our data can actually supply; the
 * answer (evidence in `lane-activity.ts`) is that a turn span carries no summary, tool
 * name or activity text, so the state word IS the honest maximum. These tests pin that
 * decision, including the deliberate "no description" part.
 */
import { describe, expect, it } from 'vitest'

import { laneActivity } from '../src/client/ui/lane-activity.ts'
import type { ActivitySpan, MemberStatus, TimelineLane } from '../src/shared/contract.ts'

/** A lane with only the fields `laneActivity` reads. */
function makeLane(status: MemberStatus | undefined, spans: TimelineLane['spans']): TimelineLane {
  return {
    id: 'l',
    name: 'l',
    role: 'teammate',
    status,
    hasHistory: true,
    color: { bar: 'x', on: 'y' },
    spans,
    messages: [],
    tasks: [],
  }
}

const turn = (end: number | null): ActivitySpan => ({ kind: 'turn', start: 1_000, end })

describe('laneActivity', () => {
  it('a RUNNING lane works, and says 运行中', () => {
    expect(laneActivity(makeLane('running', []))).toEqual({
      working: true,
      statusKey: 'laneWorking',
      reason: 'status',
    })
  })

  it('a PROVISIONING lane works, and says 启动中', () => {
    // Wording differs because "starting up" is not "working" — but both are live.
    expect(laneActivity(makeLane('provisioning', []))).toEqual({
      working: true,
      statusKey: 'laneProvisioning',
      reason: 'status',
    })
  })

  it('an IDLE lane gets NO text at all', () => {
    // The user deleted 「空闲」 one round earlier as redundant, so re-adding it would
    // undo an explicit decision. Text appears only where it adds information.
    expect(laneActivity(makeLane('idle', []))).toEqual({ working: false, statusKey: null, reason: 'none' })
  })

  it('a FAILED lane does not work and gets no spinner or text', () => {
    expect(laneActivity(makeLane('failed', []))).toEqual({ working: false, statusKey: null, reason: 'none' })
  })

  it('an unclosed turn span is evidence of work even with no status', () => {
    // Covers a board whose reported status has not caught up with its own activity track.
    expect(laneActivity(makeLane(undefined, [turn(null)]))).toEqual({
      working: true,
      statusKey: 'laneWorking',
      reason: 'open-turn',
    })
  })

  it('a closed turn span is NOT work', () => {
    // The load-bearing negative: an idle lane is full of finished spans, and treating
    // "has spans" as "is working" would spin every lane on a busy board.
    expect(laneActivity(makeLane(undefined, [turn(2_000), turn(3_000)]))).toEqual({
      working: false,
      statusKey: null,
      reason: 'none',
    })
    expect(laneActivity(makeLane('idle', [turn(2_000)]))).toEqual({
      working: false,
      statusKey: null,
      reason: 'none',
    })
  })

  it('an explicit status WINS over the span fallback, in both directions', () => {
    // The span check is a FALLBACK for a MISSING status, not an override:
    //   - a lane explicitly marked idle does not spin just because a span was left open
    //     (the reported status is the operator's answer, and a frozen session would
    //     otherwise look permanently busy);
    //   - a lane explicitly marked running spins even with no spans at all.
    expect(laneActivity(makeLane('idle', [turn(null)]))).toEqual({
      working: false,
      statusKey: null,
      reason: 'none',
    })
    expect(laneActivity(makeLane('running', [])).working).toBe(true)
  })

  it('an OPEN span object (layout SpanRect shape) also counts as work', () => {
    // The client can receive either the wire shape (`end: null`) or the layout's richer
    // one (`open: true`); both must be understood.
    const layoutSpan = { kind: 'turn', open: true, start: 1_000, end: 500 } as unknown as ActivitySpan
    expect(laneActivity(makeLane(undefined, [layoutSpan])).working).toBe(true)
  })

  it('non-turn and malformed spans never count as work', () => {
    const step = { kind: 'step', start: 1, end: null } as unknown as ActivitySpan
    const message = { kind: 'message', start: 1, end: null } as unknown as ActivitySpan
    expect(laneActivity(makeLane(undefined, [step, message])).working).toBe(false)
    const junk = [null as unknown as ActivitySpan]
    expect(() => laneActivity(makeLane(undefined, junk))).not.toThrow()
    expect(laneActivity(makeLane(undefined, junk)).working).toBe(false)
  })
})
