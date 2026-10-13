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

import { ACTIVITY_DETAIL_MAX, activityTooltip, laneActivity } from '../src/client/ui/lane-activity.ts'
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
      tooltipKey: 'laneWorking',
      tooltipDetail: null,
    })
  })

  it('a PROVISIONING lane works, and says 启动中', () => {
    // Wording differs because "starting up" is not "working" — but both are live.
    expect(laneActivity(makeLane('provisioning', []))).toEqual({
      working: true,
      statusKey: 'laneProvisioning',
      reason: 'status',
      tooltipKey: 'laneProvisioning',
      tooltipDetail: null,
    })
  })

  it('an IDLE lane gets NO text at all', () => {
    // The user deleted 「空闲」 one round earlier as redundant, so re-adding it would
    // undo an explicit decision. Text appears only where it adds information.
    expect(laneActivity(makeLane('idle', []))).toEqual({
      working: false, statusKey: null, reason: 'none', tooltipKey: null, tooltipDetail: null,
    })
  })

  it('a FAILED lane does not work and gets no spinner or text', () => {
    expect(laneActivity(makeLane('failed', []))).toEqual({
      working: false, statusKey: null, reason: 'none', tooltipKey: null, tooltipDetail: null,
    })
  })

  it('an unclosed turn span is evidence of work even with no status', () => {
    // Covers a board whose reported status has not caught up with its own activity track.
    expect(laneActivity(makeLane(undefined, [turn(null)]))).toEqual({
      working: true,
      statusKey: 'laneWorking',
      reason: 'open-turn',
      tooltipKey: 'laneWorking',
      tooltipDetail: null,
    })
  })

  it('a closed turn span is NOT work', () => {
    // The load-bearing negative: an idle lane is full of finished spans, and treating
    // "has spans" as "is working" would spin every lane on a busy board.
    expect(laneActivity(makeLane(undefined, [turn(2_000), turn(3_000)]))).toEqual({
      working: false,
      statusKey: null,
      reason: 'none',
      tooltipKey: null,
      tooltipDetail: null,
    })
    expect(laneActivity(makeLane('idle', [turn(2_000)]))).toEqual({
      working: false,
      statusKey: null,
      reason: 'none',
      tooltipKey: null,
      tooltipDetail: null,
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
      tooltipKey: null,
      tooltipDetail: null,
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

/**
 * The ACTIVITY descriptor: the host's answer to "what is the agent DOING".
 *
 * The user's reference row is `运行中  正在分析请求` and they asked for that sentence. The
 * head column is too narrow for it (measured: ~78px against a ~45px budget), so the head
 * shows a 2-4 character word from `labels.ts` and the tooltip carries the full phrase plus
 * the host's `detail`.
 *
 * THE HARD REQUIREMENT: `lane.activity` is optional, and with it absent the head must be
 * byte-for-byte what it was before this feature existed. The last test in this block pins
 * exactly that.
 */
describe('laneActivity with a host activity descriptor', () => {
  /** Attach an activity descriptor the way the host's new field will arrive. */
  const withActivity = (status: MemberStatus | undefined, activity: unknown): TimelineLane => {
    const lane = makeLane(status, [])
    return { ...lane, activity } as TimelineLane
  }

  it.each([
    ['thinking', 'laneActThinking'],
    ['read', 'laneActRead'],
    ['readImage', 'laneActRead'],
    ['search', 'laneActSearch'],
    ['write', 'laneActWrite'],
    ['edit', 'laneActEdit'],
    ['commands', 'laneActCommands'],
    ['code', 'laneActCode'],
    ['webSearch', 'laneActWebSearch'],
    ['webFetch', 'laneActWebFetch'],
    ['subagents', 'laneActSubagents'],
    ['plan', 'laneActPlan'],
    ['questions', 'laneActQuestions'],
    ['tools', 'laneActTools'],
  ])('kind %s shows the short word %s', (kind, key) => {
    const out = laneActivity(withActivity('running', { kind, detail: '', evidence: 'running-tool' }))
    expect(out).toEqual({
      working: true,
      statusKey: key,
      reason: 'activity',
      tooltipKey: key,
      tooltipDetail: null,
    })
  })

  it('the descriptor OUTRANKS the status word (it says WHAT, not just that it is busy)', () => {
    // A lane reported running with a descriptor must say 分析中, not 运行中: the descriptor
    // is strictly more informative.
    const out = laneActivity(withActivity('running', { kind: 'thinking', detail: 'x', evidence: 'no-running-tool' }))
    expect(out.reason).toBe('activity')
    expect(out.statusKey).toBe('laneActThinking')
  })

  it('carries detail into the tooltip, bounded', () => {
    const long = 'p'.repeat(500)
    const out = laneActivity(withActivity('running', { kind: 'commands', detail: long, evidence: 'running-tool' }))
    expect(out.tooltipKey).toBe('laneActCommands')
    expect(out.tooltipDetail).toHaveLength(ACTIVITY_DETAIL_MAX)
  })

  it('maps each short word to a full phrase for the tooltip', () => {
    const out = laneActivity(withActivity('running', { kind: 'commands', detail: 'pnpm vitest run', evidence: 'running-tool' }))
    expect(activityTooltip(out)).toEqual({ fullKey: 'laneActCommandsFull', detail: 'pnpm vitest run' })
  })

  it('falls back to the status word when activity is ABSENT (older host)', () => {
    const out = laneActivity(makeLane('running', []))
    expect(out.reason).toBe('status')
    expect(out.statusKey).toBe('laneWorking')
    expect(activityTooltip(out)).toEqual({ fullKey: 'laneWorking', detail: null })
  })

  it('an UNKNOWN kind falls back rather than rendering nothing', () => {
    // Forward compatibility: a future host kind must not blank the word.
    const out = laneActivity(withActivity('running', { kind: 'teleport', detail: '', evidence: 'running-tool' }))
    expect(out.statusKey).toBe('laneWorking')
    expect(out.reason).toBe('status')
  })

  it('THE GATE: an IDLE lane stays wordless even WITH a descriptor', () => {
    // The bug the user photographed: all nine lanes, including the plainly idle ones,
    // captioned `thinking`. `lane.activity` is NOT evidence of work — the host clears it
    // to `thinking` for any lane that merely has an agent, and its own contract says the
    // word is only for a lane already shown as active.
    const out = laneActivity(withActivity('idle', { kind: 'thinking', detail: '', evidence: 'no-running-tool' }))
    expect(out).toEqual({ working: false, statusKey: null, reason: 'none', tooltipKey: null, tooltipDetail: null })
    // ...and no tooltip either, or the idle lane would still be captioned in a hover.
    expect(activityTooltip(out)).toBeNull()
  })

  it('THE GATE: a FAILED lane stays wordless with a descriptor', () => {
    const out = laneActivity(withActivity('failed', { kind: 'commands', detail: 'x', evidence: 'running-tool' }))
    expect(out.statusKey).toBeNull()
    expect(activityTooltip(out)).toBeNull()
  })

  it('THE GATE: a descriptor on an idle lane does not make it work', () => {
    // The state must not flip to working just because a word is available — that is what
    // produced a spinner on idle lanes too.
    expect(laneActivity(withActivity('idle', { kind: 'thinking', detail: '', evidence: 'no-running-tool' })).working).toBe(false)
  })

  it('a descriptor on a lane with NO status but an OPEN turn does render', () => {
    // The gate passes via the span fallback, so the richer word is still used.
    const lane = { ...makeLane(undefined, [turn(null)]), activity: { kind: 'webFetch', detail: '', evidence: 'running-tool' } } as unknown as TimelineLane
    const out = laneActivity(lane)
    expect(out).toEqual({ working: true, statusKey: 'laneActWebFetch', reason: 'activity', tooltipKey: 'laneActWebFetch', tooltipDetail: null })
  })

  it('a descriptor on an IDLE lane with a stale open turn still does not render', () => {
    // Explicit status wins over the span, so the gate stays shut.
    const lane = { ...makeLane('idle', [turn(null)]), activity: { kind: 'thinking', detail: '', evidence: 'running-tool' } } as unknown as TimelineLane
    expect(laneActivity(lane).statusKey).toBeNull()
  })

  it('NO activity ⇒ byte-for-byte the old result (the progressive-enhancement lock)', () => {
    // This is the requirement that makes the host change safe to ship on its own. Compare
    // the whole object, so a stray extra field cannot sneak in either.
    const legacy = laneActivity(makeLane('running', []))
    expect(Object.keys(legacy).sort()).toEqual(['reason', 'statusKey', 'tooltipDetail', 'tooltipKey', 'working'])
    expect(laneActivity({ ...makeLane('running', []), activity: undefined } as TimelineLane)).toEqual(legacy)
    // An explicitly null field behaves exactly like a missing one.
    expect(laneActivity({ ...makeLane('running', []), activity: null } as unknown as TimelineLane)).toEqual(legacy)
  })
})
