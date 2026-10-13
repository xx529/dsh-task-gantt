import type { TimelineLane, TimelineTask } from '../../shared/contract.ts'
import { laneActivity } from './lane-activity.ts'

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
 * ── THE SECOND FILTER: "working only" ──────────────────────────────────────
 * The user: "上面筛选 teammate 地方，多一个特殊的筛选就是筛选当前正在工作中的". It is a
 * SECOND, independent condition, combined with the hidden set by AND:
 *
 *   visible = isPinnedLane(lane)
 *          || ( !hidden.has(lane.id) && (!workingOnly || laneActivity(lane).working) )
 *
 * The predicate is `laneActivity` — the SAME pure function the head spinner uses, so
 * the filter can never disagree with the spinner about who is working.
 *
 * A PINNED lane survives BOTH filters, even when idle: "lead 是不能筛选的，一定要显示"
 * is an explicit user rule, and a special view must not silently overturn it. That is
 * also what makes the empty case sane — if nobody is working the board shows the pinned
 * row alone rather than nothing at all, so the panel never appears broken/blank.
 *
 * @param data - the response as fetched, before any filtering.
 * @param hidden - lane ids the user has unticked. Order and contents are irrelevant.
 * @param allLanes - the UNFILTERED lane list, so a hidden peer can be told from an
 *   off-roster one when dropping messages.
 * @param workingOnly - when `true`, keep only working lanes (plus pinned ones).
 * @returns `data` ITSELF when nothing is filtered out, so the identity case allocates
 *   nothing and keeps object identity (a caller may compare references); otherwise a
 *   shallow copy with the dropped lanes and their top-level tasks removed, in the
 *   original order.
 */
export function filterTimelineLanes<T extends { lanes: TimelineLane[]; tasks: TimelineTask[] }>(
  data: T,
  hidden: ReadonlySet<string>,
  allLanes: readonly TimelineLane[] = data.lanes,
  workingOnly = false,
): T {
  /**
   * A lane the working-only view re-inserts. Computed up front so the two conditions
   * can be applied in one pass and the message sweep can treat both kinds of removal
   * identically.
   */
  const working = new Map<string, boolean>()
  const isWorking = (lane: TimelineLane): boolean => {
    const cached = working.get(lane.id)
    if (cached !== undefined) return cached
    const value = laneActivity(lane).working
    working.set(lane.id, value)
    return value
  }
  const lanes = data.lanes.filter((lane) => {
    if (isPinnedLane(lane)) return true
    if (hidden.has(lane.id)) return false
    if (workingOnly && !isWorking(lane)) return false
    return true
  })
  if (lanes.length === data.lanes.length) return data
  // A lane that is gone must not leave its tasks behind: they would be drawn with no
  // row to belong to, and the task count in the toolbar would still include them.
  const visible = new Set(lanes.map((lane) => lane.id))
  const tasks = data.tasks.filter((task) => visible.has(task.laneId))
  // Peer ids in messages are SESSION ids while lanes are keyed by LANE id, and on the
  // Lead's lane those differ (lane `lead`, session `session-…`). So the resolver walks
  // the same two hops the chart uses; matching the raw ids would silently miss the
  // Lead — and, as measured, every peer whose session id is not its lane id.
  const laneBySpeaker = new Map<string, string>()
  for (const candidate of allLanes) {
    laneBySpeaker.set(candidate.id, candidate.id)
    for (const key of speakerKeysOf(candidate)) laneBySpeaker.set(key, candidate.id)
  }
  const laneIdOf = (speakerId: string): string | null => laneBySpeaker.get(speakerId) ?? null
  /**
   * Lanes that are gone from THIS render, whatever removed them. The working-only view
   * has to feed this too: a message whose counterpart is filtered out has no lane to
   * borrow a colour from, and would otherwise be drawn in the neutral "peer not on this
   * board" grey — the exact artefact the hidden-set sweep exists to prevent. The sweep
   * fixes it at the data layer instead of inventing a colour.
   */
  const gone = new Set<string>()
  for (const lane of data.lanes) {
    if (!lanes.includes(lane)) gone.add(lane.id)
  }
  const dropFrom = hidden.size === 0 ? gone : new Set([...hidden, ...gone])
  return { ...data, lanes: lanes.map((lane) => dropHiddenPeerMessages(lane, dropFrom, laneIdOf)), tasks }
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

/**
 * Remove a surviving lane's messages whose counterpart the user hid.
 *
 * ── WHY (measured, not assumed) ─────────────────────────────────────────────
 * Filtering a lane out of `data.lanes` removes that lane's ROW, but the messages it
 * exchanged are recorded on the OTHER lane too. Those left behind had no counterpart
 * to borrow a colour from, so `messageMarkerPaint` fell through to the neutral
 * `SYSTEM_COLOR` — measured on the demo as `rgb(225, 229, 238)`, exactly
 * `--dsw-alias-label-dimmed`. The user saw those grey markers on the surviving lanes
 * and asked for them to be HIDDEN instead ("就不要打灰色了，直接隐藏就行了"). Fixing
 * that by re-colouring would have left a marker for a teammate who is not on screen,
 * so it is fixed here, at the data layer.
 *
 * ── THE DISTINCTION THAT MUST NOT BREAK ─────────────────────────────────────
 * A peer that was NEVER in the roster — a finished or failed member, a member of
 * another team — is legitimate, and the host draws it on the sender's lane alone
 * ("no lane was invented for them"). So a message is dropped ONLY when its peer is a
 * lane id the user actually HID. `allLanes` (the UNFILTERED list) is what makes that
 * test possible: "is in the hidden set" is not enough, because `hidden` may carry
 * stale ids that match no lane at all.
 *
 * @param lane - a lane that survived the filter.
 * @param hidden - the hidden lane ids.
 * @param allLanes - the lane list BEFORE filtering, to tell a hidden peer from an
 *   off-roster one.
 */
function dropHiddenPeerMessages(
  lane: TimelineLane,
  hidden: ReadonlySet<string>,
  laneIdOf: (speakerId: string) => string | null,
): TimelineLane {
  if (hidden.size === 0 || lane.messages.length === 0) return lane
  const messages = lane.messages.filter((message) => {
    // ── BOTH ENDS, not just the recipient ─────────────────────────────────────
    // A lane carries the messages it SENT and the ones it RECEIVED, so the hidden
    // teammate can be either end. Measured live: after hiding every teammate, the
    // surviving Lead lane still showed a grey marker whose `to` was the Lead and whose
    // `from` was the hidden `lane-a` — an incoming reply. Filtering only `to` is what
    // left it behind on the first attempt.
    for (const endpoint of [message.to, message.from]) {
      if (endpoint === undefined || endpoint === null || endpoint.id === '') continue
      // Resolve into LANE space first, then ask whether that lane is hidden.
      //
      // This is the distinction that must not break: an endpoint with NO lane
      // (`laneIdOf` returns null) was never on the roster — the human, a finished or
      // failed member, another team — and the host draws those on the sender's lane
      // alone, so they are KEPT. Only an endpoint resolving to a lane the user HID is
      // dropped.
      const endpointLane = laneIdOf(endpoint.id)
      if (endpointLane !== null && hidden.has(endpointLane)) return false
    }
    return true
  })
  if (messages.length === lane.messages.length) return lane
  return { ...lane, messages }
}

/**
 * Every SPEAKER id that maps to this lane.
 *
 * A message records its addressee as a session id, while a lane is keyed by its lane
 * id — and on the Lead's lane those differ (measured earlier this project:
 * `lane.id === 'lead'` but its speaker id is `session-…`). So BOTH must be treated as
 * the lane's identity: matching on only one would let a hidden teammate's messages
 * survive whenever the two id spaces disagree, which is the normal case for the Lead.
 *
 * @param lane - the lane to describe.
 */
function speakerKeysOf(lane: TimelineLane): string[] {
  const keys = [lane.id]
  const navigation = lane.navigation
  if (navigation !== undefined && navigation !== null) {
    if (navigation.type === 'session' && typeof navigation.value === 'string') keys.push(navigation.value)
    else if (navigation.type === 'address' && typeof navigation.value.sessionId === 'string') keys.push(navigation.value.sessionId)
  }
  return keys
}
