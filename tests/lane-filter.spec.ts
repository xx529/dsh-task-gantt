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
