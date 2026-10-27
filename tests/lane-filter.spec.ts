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
 *
 * ADDED 2026-10-27 (v1 shell): the toolbar now reports the hidden count as a `-N`
 * badge and nothing else, so the last block ties that number to the lanes this
 * module actually removes (a hidden LEAD must never inflate it).
 */
import { describe, expect, it } from 'vitest'

import { filterTimelineLanes, isPinnedLane } from '../src/client/ui/lane-filter.ts'
import type { TimelineLane, TimelineTask } from '../src/shared/contract.ts'

const colour = { bar: '--dsw-alias-brand-primary', on: '--dsw-alias-label-primary-inverted' }

const lane = (
  id: string,
  role: TimelineLane['role'] = 'teammate',
  status?: TimelineLane['status'],
): TimelineLane => ({
  id,
  name: id,
  role,
  status,
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

/**
 * The SPECIAL "working only" view, and how it composes with the per-teammate hidden set.
 *
 * The user: "上面筛选 teammate 地方，多一个特殊的筛选就是筛选当前正在工作中的". The two
 * conditions are ANDed, and both are applied at the single filtering point, so nothing
 * downstream can disagree.
 *
 * The predicate itself is `laneActivity` — the SAME pure function the lane-head spinner
 * uses. Its own full truth table lives in `tests/lane-activity.spec.ts`; this block locks
 * what the FILTER does with it, which is where the composition and the pinned rule live.
 */
describe('the working-only view', () => {
  /** lead pinned + idle, alpha running, bravo idle, unassigned idle. */
  const board = () => ({
    lanes: [lane('lead', 'lead', 'idle'), lane('alpha', 'teammate', 'running'), lane('bravo', 'teammate', 'idle'), lane('unassigned', 'unknown', 'idle')],
    tasks: [task('t-lead', 'lead'), task('t-alpha', 'alpha'), task('t-bravo', 'bravo'), task('t-none', 'unassigned')],
  })

  it('keeps only working lanes, plus the pinned one', () => {
    const out = filterTimelineLanes(board(), new Set(), board().lanes, true)
    // alpha works; lead is pinned even though it is idle; bravo and unassigned drop.
    expect(ids(out)).toEqual(['lead', 'alpha'])
  })

  it('the pinned lane survives the working filter even when IDLE', () => {
    // "lead 是不能筛选的，一定要显示" is an explicit user rule. A special view must not
    // silently overturn it, so an idle pinned lane stays on the board.
    const out = filterTimelineLanes(board(), new Set(), board().lanes, true)
    expect(ids(out)).toContain('lead')
    expect(taskIds(out)).toContain('t-lead')
  })

  it('when nobody is working the board shows the pinned lane alone, not nothing', () => {
    // The empty case for this view. Returning nothing at all would make the panel look
    // broken; the pinned row is always a sane, honest result.
    const idle = {
      lanes: [lane('lead', 'lead', 'idle'), lane('bravo', 'teammate', 'idle')],
      tasks: [task('t-lead', 'lead'), task('t-bravo', 'bravo')],
    }
    const out = filterTimelineLanes(idle, new Set(), idle.lanes, true)
    expect(ids(out)).toEqual(['lead'])
    expect(taskIds(out)).toEqual(['t-lead'])
  })

  it('ANDs with the hidden set: a hidden working lane stays hidden', () => {
    // BOTH set: hiding alpha while alpha works must still remove it — the hidden set is
    // the more specific statement about that lane.
    const data = board()
    const out = filterTimelineLanes(data, new Set(['alpha']), data.lanes, true)
    expect(ids(out)).toEqual(['lead'])
  })

  it('ANDs the other way too: working-only removes an unticked idle lane', () => {
    const data = board()
    const out = filterTimelineLanes(data, new Set(), data.lanes, true)
    expect(ids(out)).not.toContain('bravo')
    expect(ids(out)).not.toContain('unassigned')
  })

  it('unassigned is NOT pinned, so the working view can drop it', () => {
    // It is a bucket, not a teammate — the same rule the hidden set already follows.
    const data = board()
    const out = filterTimelineLanes(data, new Set(), data.lanes, true)
    expect(ids(out)).not.toContain('unassigned')
  })

  it('an unclosed turn span makes a lane count as working for the filter too', () => {
    // The filter must agree with the spinner, which treats an open turn as work when the
    // reported status is missing.
    const open = lane('delta', 'teammate')
    open.spans = [{ kind: 'turn', start: 1, end: null }]
    const data = { lanes: [lane('lead', 'lead', 'idle'), open], tasks: [] }
    expect(ids(filterTimelineLanes(data, new Set(), data.lanes, true))).toEqual(['lead', 'delta'])
  })

  it('a lane whose turns all CLOSED does not count as working', () => {
    // The load-bearing negative: a busy board is full of finished spans.
    const done = lane('delta', 'teammate', 'idle')
    done.spans = [{ kind: 'turn', start: 1, end: 2 }]
    const data = { lanes: [lane('lead', 'lead', 'idle'), done], tasks: [] }
    expect(ids(filterTimelineLanes(data, new Set(), data.lanes, true))).toEqual(['lead'])
  })

  it('working-only off is byte-for-byte the old behaviour', () => {
    const data = board()
    expect(filterTimelineLanes(data, new Set(), data.lanes, false)).toBe(data)
    // ...and so is the default when the argument is omitted.
    expect(filterTimelineLanes(data, new Set())).toBe(data)
  })

  it('drops a surviving lane\'s messages whose peer the working view removed', () => {
    // Same reasoning as the hidden set: a counterpart with no lane on the board has no
    // colour to borrow and would be drawn in the neutral grey. Measured before this
    // sweep existed the markers lingered as "peer not on this board".
    const lead = lane('lead', 'lead', 'running')
    lead.messages = [
      { kind: 'message', time: 1, end: 1, from: { kind: 'lead', id: 'lead', name: 'lead' }, to: { kind: 'teammate', id: 'alpha', name: 'alpha' }, sessionId: 'lead' },
      { kind: 'message', time: 2, end: 2, from: { kind: 'lead', id: 'lead', name: 'lead' }, to: { kind: 'teammate', id: 'outsider', name: 'outsider' }, sessionId: 'lead' },
    ]
    const data = { lanes: [lead, lane('alpha', 'teammate', 'idle')], tasks: [] }
    const out = filterTimelineLanes(data, new Set(), data.lanes, true)
    const surviving = out.lanes.find((l) => l.id === 'lead')
    // alpha is filtered out by the working view, so that message goes; the off-roster
    // peer was never on the board and therefore stays.
    expect((surviving?.messages ?? []).map((m) => m.to?.id)).toEqual(['outsider'])
  })
})

/**
 * The toolbar's filter badge (`−N`) is the only number the shell shows for this
 * feature. Its pure-layer half: N must equal the lanes the filter ACTUALLY
 * removes. The trap is the pinned Lead — a hidden set may carry its id (a stale
 * saved selection, or "hide everything"), and the filter deliberately keeps it,
 * so the badge must not claim a lane was hidden when it is still on the board.
 */
describe('the toolbar badge count matches what the filter removes', () => {
  it('N equals the lanes actually removed, and a hidden Lead never inflates it', () => {
    const data = fixture()
    const cases: string[][] = [['alpha'], ['bravo', 'unassigned'], ['lead'], ['ghost']]
    for (const ids of cases) {
      const hidden = new Set(ids)
      const removed = data.lanes.length - filterTimelineLanes(data, hidden, data.lanes, false).lanes.length
      const effective = ids.filter((id) => {
        const lane = data.lanes.find((entry) => entry.id === id)
        return lane !== undefined && !isPinnedLane(lane)
      }).length
      expect(removed, `hidden=${ids.join(',')}`).toBe(effective)
    }
    // The measured extremes: hiding every filterable lane leaves the pinned row
    // and reports 3, while hiding only the Lead reports 0.
    expect(filterTimelineLanes(fixture(), new Set(['alpha', 'bravo', 'unassigned'])).lanes).toHaveLength(1)
    expect(filterTimelineLanes(fixture(), new Set(['lead'])).lanes).toHaveLength(4)
  })
})
