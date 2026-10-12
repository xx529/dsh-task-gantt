import type { TimelineLane, TimelineTask } from '../../shared/contract.ts'

/**
 * The teammate filter: which lanes the board draws.
 *
 * ── THE ONE RULE THAT MATTERS ────────────────────────────────────────────────
 * There is exactly ONE filtering point, and it is here — applied in `BoardView`
 * BEFORE the payload reaches `GanttChart`. The chart derives the lane-head column,
 * the lane contents, the send/receive markers, the wait bands and the legend counts
 * from `data.lanes`, so removing a lane there removes it everywhere at once. A
 * second filter inside `GanttChart` would be a second source of truth, free to
 * disagree with this one.
 *
 * ── WHY THE HIDDEN SET, NOT THE SHOWN SET ───────────────────────────────────
 * The caller stores what is HIDDEN. An empty set therefore means "show everything",
 * so a teammate that joins the team later appears by default instead of being
 * silently excluded by a list that was written before it existed.
 *
 * ── WHY THE LEAD IS PINNED ──────────────────────────────────────────────────
 * The user: "但是 lead 是不能筛选的，一定要显示的". A pinned lane survives even if
 * its id somehow reaches the hidden set, so a stale saved selection (or a hostile
 * payload naming `lead`) cannot make the board lose its own root. `unassigned` is
 * deliberately NOT pinned: it is a bucket, not a teammate, and the user asked to be
 * able to filter the agents.
 *
 * @param data - the response as fetched, before any filtering.
 * @param hidden - lane ids the user has unticked. Order and contents are irrelevant.
 * @returns `data` ITSELF when nothing is hidden, so the identity case allocates
 *   nothing and keeps object identity (a caller may compare references); otherwise a
 *   shallow copy with the hidden lanes and their top-level tasks removed, in the
 *   original order.
 */
export function filterTimelineLanes<T extends { lanes: TimelineLane[]; tasks: TimelineTask[] }>(
  data: T,
  hidden: ReadonlySet<string>,
): T {
  if (hidden.size === 0) return data
  const lanes = data.lanes.filter((lane) => isPinnedLane(lane) || !hidden.has(lane.id))
  if (lanes.length === data.lanes.length) return data
  // A lane that is gone must not leave its tasks behind: they would be drawn with no
  // row to belong to, and the task count in the toolbar would still include them.
  const visible = new Set(lanes.map((lane) => lane.id))
  const tasks = data.tasks.filter((task) => visible.has(task.laneId))
  return { ...data, lanes, tasks }
}

/**
 * A lane that can never be hidden.
 *
 * Both tests are kept deliberately: `role` is the semantic answer and `id` is the
 * structural one, and the contract documents the Lead row as `id: 'lead'` with
 * `role: 'lead'`. Checking only one would break on a payload that sets the other,
 * and this is the one row whose disappearance would be a bug rather than a choice.
 *
 * @param lane - the lane to test.
 */
export function isPinnedLane(lane: Pick<TimelineLane, 'id' | 'role'>): boolean {
  return lane.role === 'lead' || lane.id === 'lead'
}
