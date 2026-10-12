/**
 * The teammate filter's pure layer.
 *
 * The user's request:
 *
 *   > 增加一个筛选 teammate 的功能，如果我筛选了某几个 teammate，甘特图里面内容就只显示
 *   > 这几个 agent 的内容，包括 agent 列只保留选择的，泳道里面的内容，收发标识也仅展示
 *   > 该 teammate，但是 lead 是不能筛选的，一定要显示的，默认情况下全选所有 teammate
 *
 * Why this file exists as its own lock: the filtering happens ONCE, in `BoardView`,
 * before the payload reaches the chart. Everything the user listed — the agent column,
 * the lane contents, the send/receive markers, the wait bands, the legend counts — is
 * derived by the chart from `data.lanes`, so this single function is the only place a
 * bug can hide. The two cases below that a naive implementation gets wrong are the
 * PINNED LEAD and the DEFAULT of "everything visible".
 */
import { describe, expect, it } from 'vitest'

import { filterTimelineLanes, isPinnedLane } from '../src/client/ui/lane-filter.ts'
import type { TimelineLane, TimelineTask } from '../src/shared/contract.ts'

const colour = { bar: '--dsw-alias-brand-primary', on: '--dsw-alias-label-primary-inverted' }

const lane = (id: string, role: TimelineLane['role'] = 'teammate'): TimelineLane => ({
  id,
  name: id,
  role,
  hasHistory: true,
  spans: [],
  messages: [],
  color: colour,
  tasks: [],
})

const task = (id: string, laneId: string): TimelineTask => ({
  id,
  revision: 1,
  subject: id,
  description: '',
  status: 'in_progress',
  blockedBy: [],
  writeScopes: [],
  ready: true,
  writeScopeWarnings: [],
  laneId,
  history: [],
})

/** The Lead row is `id: 'lead'` AND `role: 'lead'`; `unassigned` is a bucket, not a teammate. */
const fixture = () => ({
  lanes: [lane('lead', 'lead'), lane('alpha'), lane('bravo'), lane('unassigned', 'unknown')],
  tasks: [task('t-lead', 'lead'), task('t-alpha', 'alpha'), task('t-bravo', 'bravo'), task('t-none', 'unassigned')],
})

const ids = (data: { lanes: TimelineLane[] }): string[] => data.lanes.map((l) => l.id)
const taskIds = (data: { tasks: TimelineTask[] }): string[] => data.tasks.map((t) => t.id)

/**
 * The grey-marker case, at the data layer.
 *
 * A lane that is filtered out loses its ROW, but the messages it exchanged are
 * recorded on the other lane too. Those leftovers had no counterpart to borrow a
 * colour from, so they fell through to the neutral `SYSTEM_COLOR` — measured on the
 * demo as `rgb(225, 229, 238)`, i.e. `--dsw-alias-label-dimmed`. The user asked for
 * them to be hidden rather than greyed, so they are removed here.
 */
const speaker = (id: string, kind: 'user' | 'lead' | 'teammate' | 'system' = 'teammate') => ({
  kind,
  id,
  name: id,
})

const message = (to: string | null, kind: 'message' | 'turn' = 'message') => ({
  kind,
  time: 1,
  end: 2,
  from: speaker('lead', 'lead'),
  ...(to === null ? {} : { to: speaker(to) }),
  sessionId: 'lead',
})

/** `lead` talks to alpha, to bravo, and to a member that was never on this roster. */
const talkative = () => ({
  lanes: [
    { ...lane('lead', 'lead'), messages: [message('alpha'), message('bravo'), message('ghost-member')] },
    { ...lane('alpha'), messages: [message('lead', 'turn')] },
    lane('bravo'),
  ],
  tasks: [task('t-lead', 'lead'), task('t-alpha', 'alpha'), task('t-bravo', 'bravo')],
})

const peersOn = (data: { lanes: TimelineLane[] }, laneId: string): (string | null)[] =>
  (data.lanes.find((l) => l.id === laneId)?.messages ?? []).map((m) => m.to?.id ?? null)

describe('filterTimelineLanes drops messages whose peer was hidden', () => {
  it('removes the hidden peer\'s messages from a surviving lane', () => {
    const out = filterTimelineLanes(talkative(), new Set(['alpha']))
    // alpha's own row is gone, and so is the lead→alpha message.
    expect(ids(out)).toEqual(['lead', 'bravo'])
    expect(peersOn(out, 'lead')).toEqual(['bravo', 'ghost-member'])
  })

  it('KEEPS a peer that was never on the roster', () => {
    // The host's rule: an off-roster counterpart (a finished or failed member,
    // another team) is drawn on the sender's lane alone, and no lane is invented for
    // it. Hiding somebody else must not remove it — this is the distinction that a
    // naive "peer has no lane, drop it" implementation gets wrong.
    const out = filterTimelineLanes(talkative(), new Set(['alpha']))
    expect(peersOn(out, 'lead')).toContain('ghost-member')
    const onlyBravo = filterTimelineLanes(talkative(), new Set(['alpha', 'bravo']))
    expect(peersOn(onlyBravo, 'lead')).toEqual(['ghost-member'])
  })

  it('ignores hidden ids that match no lane, so off-roster peers still survive', () => {
    // `hidden` may carry a stale id. Because "hidden" is only meaningful for ids that
    // ARE lanes, a ghost id in the set must not start deleting off-roster messages.
    const data = talkative()
    const out = filterTimelineLanes(data, new Set(['ghost-member']))
    // No lane matched, so this is the identity branch: same object, same messages.
    expect(out).toBe(data)
    expect(peersOn(out, 'lead')).toEqual(['alpha', 'bravo', 'ghost-member'])
    const withReal = filterTimelineLanes(talkative(), new Set(['bravo', 'ghost-member']))
    expect(peersOn(withReal, 'lead')).toEqual(['alpha', 'ghost-member'])
  })

  it('empty hidden set still returns the very same objects', () => {
    const data = talkative()
    const out = filterTimelineLanes(data, new Set())
    expect(out).toBe(data)
    expect(out.lanes[0]).toBe(data.lanes[0])
    expect(out.lanes[0]?.messages).toBe(data.lanes[0]?.messages)
  })

  it('drops a hidden peer even when its SESSION id differs from its LANE id', () => {
    // THE CASE THAT SLIPPED THROUGH. The first version of this fix compared the
    // message's peer id against the lanes' own ids, and the fixture used the same id
    // for both spaces (`alpha` / `alpha`), so it passed while the shipped chart still
    // left grey markers behind: on the live board a peer's id is a SESSION id, and the
    // lead's lane id is the literal `lead` while its session id is `lead-session`.
    // Measured live after the first attempt: hiding all three teammates still left one
    // grey marker (`rgb(225, 229, 238)`) whose peer was `host-data`.
    //
    // So the two id spaces are made to DIFFER here on purpose: a raw-id comparison can
    // never pass this test, which is the only way to keep the bug from returning.
    const lanes: TimelineLane[] = [
      { ...lane('lead', 'lead'), navigation: { type: 'session', value: 's-lead' }, messages: [message('s-alpha'), message('s-bravo'), message('outsider')] },
      { ...lane('alpha'), navigation: { type: 'session', value: 's-alpha' } },
      { ...lane('bravo'), navigation: { type: 'session', value: 's-bravo' } },
    ]
    const out = filterTimelineLanes({ lanes, tasks: [] }, new Set(['alpha']))
    // `s-alpha` resolves to the hidden lane `alpha`, so the message goes...
    expect(peersOn(out, 'lead')).toEqual(['s-bravo', 'outsider'])
    // ...while `outsider` maps to no lane at all and therefore stays.
    const both = filterTimelineLanes({ lanes, tasks: [] }, new Set(['alpha', 'bravo']))
    expect(peersOn(both, 'lead')).toEqual(['outsider'])
  })

  it('drops a message whose SENDER was hidden (an incoming reply)', () => {
    // The case that survived the first fix. A lane carries the messages it sent AND
    // the ones it received, so the hidden teammate can be either end. Measured live
    // after hiding every teammate: the surviving Lead lane still showed one grey
    // marker whose `to` was the Lead and whose `from` was the hidden lane, with the
    // tooltip "对端不在本看板（中性色）" — filtering only `to` left it behind.
    const lanes: TimelineLane[] = [
      {
        ...lane('lead', 'lead'),
        navigation: { type: 'session', value: 'lead-session' },
        messages: [
          { ...message(null), from: speaker('lead', 'lead'), to: undefined },   // prompt out
          { ...message('lead-session'), from: speaker('s-alpha') },             // reply in
          { ...message('lead-session'), from: speaker('outsider') },            // off-roster reply in
        ],
      },
      { ...lane('alpha'), navigation: { type: 'session', value: 's-alpha' } },
    ]
    const out = filterTimelineLanes({ lanes, tasks: [] }, new Set(['alpha']))
    // The prompt (no addressee) and the off-roster reply stay; the hidden lane's reply goes.
    expect(out.lanes.find((l) => l.id === 'lead')?.messages.map((m) => m.from.id)).toEqual(['lead', 'outsider'])
  })

  it('leaves a lane object untouched when none of its peers were hidden', () => {
    // The filter only allocates for lanes it actually edits, so a lane whose messages
    // are all still valid keeps its identity.
    const data = talkative()
    const out = filterTimelineLanes(data, new Set(['bravo']))
    const alpha = out.lanes.find((l) => l.id === 'alpha')
    expect(alpha).toBe(data.lanes.find((l) => l.id === 'alpha'))
  })
})

describe('filterTimelineLanes', () => {
  it('an empty hidden set is the identity, object included', () => {
    const data = fixture()
    const out = filterTimelineLanes(data, new Set())
    // Same reference, not merely deep-equal: the caller may compare identity, and
    // "nothing is hidden" must not allocate a new payload on every render.
    expect(out).toBe(data)
    expect(ids(out)).toEqual(['lead', 'alpha', 'bravo', 'unassigned'])
    expect(taskIds(out)).toEqual(['t-lead', 't-alpha', 't-bravo', 't-none'])
  })

  it('a hidden teammate disappears from the lanes and its tasks go with it', () => {
    const out = filterTimelineLanes(fixture(), new Set(['alpha']))
    expect(ids(out)).toEqual(['lead', 'bravo', 'unassigned'])
    expect(taskIds(out)).toEqual(['t-lead', 't-bravo', 't-none'])
  })

  it('a hidden LEAD is still shown', () => {
    // The user: "但是 lead 是不能筛选的，一定要显示的". Even with the lead's id in the
    // hidden set — a stale saved selection, or a hostile payload — it must survive.
    const out = filterTimelineLanes(fixture(), new Set(['lead']))
    expect(ids(out)).toContain('lead')
    expect(ids(out)).toEqual(['lead', 'alpha', 'bravo', 'unassigned'])
    // ...and its tasks survive with it.
    expect(taskIds(out)).toContain('t-lead')
  })

  it('pins the lead by role as well as by id', () => {
    // Both halves of the pin, because the contract carries both and either alone
    // would break on a payload that sets only the other.
    expect(isPinnedLane({ id: 'lead', role: 'teammate' })).toBe(true)
    expect(isPinnedLane({ id: 'session-xyz', role: 'lead' })).toBe(true)
    // `unassigned` is NOT pinned: the user asked to be able to filter the agents, and
    // an unowned task bucket is not one.
    expect(isPinnedLane({ id: 'unassigned', role: 'unknown' })).toBe(false)
  })

  it('unassigned lanes are filterable', () => {
    const out = filterTimelineLanes(fixture(), new Set(['unassigned']))
    expect(ids(out)).toEqual(['lead', 'alpha', 'bravo'])
    expect(taskIds(out)).not.toContain('t-none')
  })

  it('a hidden lane loses its top-level tasks while the pinned lane keeps its own', () => {
    const out = filterTimelineLanes(fixture(), new Set(['bravo', 'unassigned']))
    expect(taskIds(out)).toEqual(['t-lead', 't-alpha'])
    // The specific pairing the user described: filtering teammates trims the board's
    // tasks, and the lead's work is never the thing that disappears.
    expect(taskIds(out)).toContain('t-lead')
  })

  it('ignores hidden ids that match no lane', () => {
    const data = fixture()
    const out = filterTimelineLanes(data, new Set(['ghost', 'nobody']))
    // Nothing actually matched, so this is the identity case again.
    expect(out).toBe(data)
    expect(ids(out)).toEqual(['lead', 'alpha', 'bravo', 'unassigned'])
  })

  it('preserves the original lane order', () => {
    // Order is the board's own (the host sorts it); filtering must not resort.
    const out = filterTimelineLanes(fixture(), new Set(['bravo']))
    expect(ids(out)).toEqual(['lead', 'alpha', 'unassigned'])
    const reordered = { ...fixture(), lanes: [lane('zeta'), lane('lead', 'lead'), lane('alpha')] }
    expect(ids(filterTimelineLanes(reordered, new Set(['alpha'])))).toEqual(['zeta', 'lead'])
  })

  it('hiding every filterable lane leaves exactly the pinned row', () => {
    const out = filterTimelineLanes(fixture(), new Set(['alpha', 'bravo', 'unassigned']))
    expect(ids(out)).toEqual(['lead'])
    expect(taskIds(out)).toEqual(['t-lead'])
  })
})
