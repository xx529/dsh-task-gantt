/**
 * Per-lane message paint and direction (user request, via Lead).
 *
 * The user's words:
 *
 *   > A 发给 B，A 的泳道显示 收件人 B 的颜色并带有发出的标识，
 *   > 而 B 这显示 收件人 A 的颜色并带有接收的标记
 *
 * So the SAME exchange must be painted differently depending on which lane is
 * drawing it, and the direction must be readable without relying on colour.
 *
 * ── THE FIXTURE RULE THIS FILE EXISTS TO ENFORCE ─────────────────────────────
 * The first version of this file used lanes whose `id` EQUALLED the speaker's
 * `id` (`lane-a` / `lane-b`), so it stayed green while the shipped chart was
 * wrong: `resolveMessageDirection` compared the raw speaker id with the lane id,
 * and on the Lead's lane those differ (`lane.id === 'lead'`, speaker id
 * `session-…`), so every marker rendered `incoming` — measured live by the Lead
 * (8/8 incoming, `dtg-msg-out` hit 0, while the host data was correct).
 *
 * The lesson is the twin of "make your two read channels disagree on purpose":
 * **a fixture must make the id spaces that differ in real data actually differ.**
 * Here lane ids are `lead` / `lane-b`, speaker ids are `session-a` / `session-b`,
 * and `laneIdOf` is the only bridge between them, so a raw comparison can never
 * pass. The first test asserts that separation so it cannot silently rot.
 *
 * ── THE `undefined` SCARE, RECORDED HONESTLY ────────────────────────────────
 * An earlier diagnosis claimed `laneColors.get(marker.from.id)` returned
 * `undefined` and markers were colourless. It was DISPROVEN twice (85 real
 * markers offline, 7 live by the Lead). `.get()` returning `X | undefined` is a
 * RISK CLASS, not an instance; the non-empty-paint test below guards the class and
 * is deliberately NOT presented as the fix for a bug that existed.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { LaneColorTokens, MessageSpan, SpanSpeaker } from '../src/shared/contract.ts'
import { messageMarkerPaint, resolveMessageDirection } from '../src/client/ui/timeline-layout.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const TOKEN = /^--(?:dsw|ds)-[a-z0-9-]+$/

const USER_PAINT: LaneColorTokens = { bar: '--dsw-alias-label-primary', on: '--dsw-alias-label-primary-inverted' }
const SYSTEM_PAINT: LaneColorTokens = { bar: '--dsw-alias-label-dimmed', on: '--dsw-alias-label-primary-inverted' }

/** Two lanes whose ids are LANE ids — deliberately not session ids. */
const LANES: { id: string; color: LaneColorTokens }[] = [
  { id: 'lead', color: { bar: '--dsw-alias-state-business-primary', on: '--dsw-alias-label-primary-inverted' } },
  { id: 'lane-b', color: { bar: '--dsw-alias-state-warn-primary', on: '--dsw-alias-label-primary-inverted' } },
]

const LANE_IDS = new Set(LANES.map((lane) => lane.id))
/** Session id → lane id, for the speakers whose two ids differ (the Lead's). */
const LANE_OF_SESSION: Record<string, string> = { 'session-a': 'lead', 'session-b': 'lane-b' }

/**
 * TWO HOPS, exactly like the real client (`GanttChart.tsx` builds the same shape
 * from `lane.navigation`):
 *   1. a lane id resolves to itself — a teammate's lane id IS its session id, so
 *      more than a few real markers arrive with `from.id` already in LANE space
 *      (measured on the real board: 21 of 85);
 *   2. otherwise the session id is mapped through the lane's own navigation.
 * A one-hop version (session → lane only) silently mis-classifies every marker
 * whose id is already a lane id — the mirror image of the session-vs-lane bug.
 */
const laneIdOf = (speakerId: string): string | null =>
  LANE_IDS.has(speakerId) ? speakerId : (LANE_OF_SESSION[speakerId] ?? null)
const laneColors = new Map(LANES.map((lane) => [lane.id, lane.color]))

const LEAD_SPEAKER: SpanSpeaker = { kind: 'lead', id: 'session-a', name: 'lead' }
const PEER_SPEAKER: SpanSpeaker = { kind: 'teammate', id: 'session-b', name: 'packaging' }

/** A paired exchange from the Lead's session to lane-b's session. */
function exchange(overrides: Partial<MessageSpan> = {}): MessageSpan {
  return {
    kind: 'message',
    time: 1_000,
    end: null,
    from: LEAD_SPEAKER,
    to: PEER_SPEAKER,
    preview: 'take task-4',
    messageId: 'msg-1',
    sessionId: 'session-a',
    ...overrides,
  }
}

const paintIn = (message: MessageSpan, laneId: string) =>
  messageMarkerPaint(message, laneId, laneColors, laneIdOf, USER_PAINT, SYSTEM_PAINT)

describe('the id spaces are genuinely different (the escape path that hid the bug)', () => {
  it('no lane id equals any speaker session id, and both hops resolve', () => {
    // If the first assertion ever becomes false the rest of the file silently
    // stops testing the bug: the two spaces would coincide and a raw comparison
    // would pass again.
    for (const lane of LANES) expect(Object.keys(LANE_OF_SESSION), lane.id).not.toContain(lane.id)
    // Hop 2: a session id maps through the lane's navigation.
    expect(laneIdOf('session-a')).toBe('lead')
    // Hop 1: an id that is already a lane id resolves to itself. Getting this
    // wrong is the mirror of the bug the Lead measured: it would mis-classify
    // every marker that arrives in lane space (21 of 85 on the real board).
    expect(laneIdOf('lead')).toBe('lead')
    for (const lane of LANES) expect(laneIdOf(lane.id), lane.id).toBe(lane.id)
  })
})

describe('the same exchange is painted per lane, with the counterparty colour', () => {
  it("the LEAD's lane (lane.id 'lead', speaker id 'session-a') is OUTGOING", () => {
    // The exact shape the live chart got wrong: lane id ≠ speaker id.
    const result = paintIn(exchange(), 'lead')
    expect(result.direction, 'a raw id comparison makes this incoming').toBe('outgoing')
    expect(result.paint).toEqual(laneColors.get('lane-b')) // the RECIPIENT's colour
    expect(result.peerLaneId).toBe('lane-b')
    expect(result.peerName).toBe('packaging')
  })

  it('the recipient lane is incoming, in the SENDER colour', () => {
    const result = paintIn(exchange(), 'lane-b')
    expect(result.direction).toBe('incoming')
    expect(result.paint).toEqual(laneColors.get('lead'))
    expect(result.peerLaneId).toBe('lead')
  })

  it('the two lanes differ in both paint and direction', () => {
    const sender = paintIn(exchange(), 'lead')
    const recipient = paintIn(exchange(), 'lane-b')
    expect(sender.paint).not.toEqual(recipient.paint)
    expect(sender.direction).not.toBe(recipient.direction)
  })

  it('COUNT, not existence: one exchange yields exactly one outgoing and one incoming', () => {
    // Asserting only "the attribute exists" is what let an all-incoming
    // implementation ship. The count is the assertion with teeth.
    const directions = [paintIn(exchange(), 'lead').direction, paintIn(exchange(), 'lane-b').direction]
    expect(directions.filter((direction) => direction === 'outgoing')).toHaveLength(1)
    expect(directions.filter((direction) => direction === 'incoming')).toHaveLength(1)
  })

  it('a whole board has BOTH directions somewhere (the live symptom was 8/8 incoming)', () => {
    const board = LANES.map((lane) => paintIn(exchange(), lane.id).direction)
    expect(board.filter((direction) => direction === 'outgoing').length).toBeGreaterThan(0)
    expect(board.filter((direction) => direction === 'incoming').length).toBeGreaterThan(0)
    // The raw resolve() must agree with the paint wrapper.
    expect(resolveMessageDirection(exchange(), 'lead', laneIdOf).direction).toBe('outgoing')
    expect(resolveMessageDirection(exchange(), 'lane-b', laneIdOf).direction).toBe('incoming')
  })

  it('a note to self is INCOMING (the Lead-mandated single-expression rule)', () => {
    // `outgoing = selfIsSender && !selfIsReceiver` is a single expression, so a
    // lane that is both sender and receiver falls to incoming. The Lead specified
    // this priority explicitly, and ui-2 replaced the misleading old comment ("it
    // counts as outgoing, because the arrow should point away") with one that
    // matches the code. Verified here so a future edit of that expression is a
    // deliberate, visible change rather than a silent flip.
    const toSelf = exchange({ to: LEAD_SPEAKER })
    const result = resolveMessageDirection(toSelf, 'lead', laneIdOf)
    expect(result.direction).toBe('incoming')
    expect(result.peerLaneId).toBe('lead')
  })
})

describe('markers whose speaker id is ALREADY a lane id (21 of 85 in real data)', () => {
  /** The host emits `from.id === 'lead'` for lead messages — lane space, not session space. */
  const laneSpaceExchange = (): MessageSpan =>
    exchange({ from: { kind: 'lead', id: 'lead', name: 'lead' } })

  it('lead lane is outgoing when from.id is the lane id itself', () => {
    const result = paintIn(laneSpaceExchange(), 'lead')
    expect(result.direction).toBe('outgoing')
    expect(result.paint).toEqual(laneColors.get('lane-b'))
    expect(result.peerLaneId).toBe('lane-b')
  })

  it('the recipient lane is incoming for the same message', () => {
    const result = paintIn(laneSpaceExchange(), 'lane-b')
    expect(result.direction).toBe('incoming')
    expect(result.paint).toEqual(laneColors.get('lead'))
  })

  it('a one-hop laneIdOf would fail this: the lane-id path must resolve', () => {
    // Guards the fixture itself: with a session-only mapping these two assertions
    // both collapse to 'incoming' and the file goes quietly green while the chart
    // mis-classifies a quarter of the real markers.
    const directions = [paintIn(laneSpaceExchange(), 'lead').direction, paintIn(laneSpaceExchange(), 'lane-b').direction]
    expect(directions).toEqual(['outgoing', 'incoming'])
  })
})

describe('a marker never comes out colourless (the `.get()` risk class)', () => {
  const shapes: [string, MessageSpan, string][] = [
    ['paired exchange, sender lane', exchange(), 'lead'],
    ['paired exchange, recipient lane', exchange(), 'lane-b'],
    ['queued with no delivery (no addressee)', exchange({ to: undefined, end: undefined }), 'lead'],
    ['human prompt', exchange({ kind: 'user-prompt', from: { kind: 'user', id: 'user', name: 'you' }, to: undefined }), 'lead'],
    ['system speaker', exchange({ from: { kind: 'system', id: 'watcher', name: 'watcher' }, to: undefined }), 'lead'],
    ['recipient off the roster', exchange({ to: { kind: 'teammate', id: 'gone', name: 'gone' } }), 'lead'],
    ['sender off the roster', exchange({ from: { kind: 'system', id: 'unknown', name: 'unknown' } }), 'lane-b'],
    ['turn span', exchange({ kind: 'turn', messageId: undefined, to: undefined }), 'lead'],
  ]

  it.each(shapes)('%s → paint.bar/on are real token names', (_label, message, laneId) => {
    const result = paintIn(message, laneId)
    expect(typeof result.paint.bar).toBe('string')
    expect(typeof result.paint.on).toBe('string')
    expect(result.paint.bar, 'bar must never be undefined').not.toBe('')
    expect(result.paint.on, 'on must never be undefined').not.toBe('')
    expect(result.paint.bar).toMatch(TOKEN)
    expect(result.paint.on).toMatch(TOKEN)
  })

  it('an off-roster peer falls back to the neutral paint instead of nothing', () => {
    const result = paintIn(exchange({ to: { kind: 'teammate', id: 'gone', name: 'gone' } }), 'lead')
    expect(result.peerMatched).toBe(false)
    expect(result.paint).toEqual(SYSTEM_PAINT)
  })
})

describe('the three forks a later reader is most likely to get wrong', () => {
  it('an unmatched queued message has no counterparty: sender colour, and OUTGOING', () => {
    // RULING (ui-2, 2026-10-12): the code was right and their prose was wrong.
    // A message with no recorded recipient still LEFT this lane, so it is
    // outgoing here and incoming in any other lane; the colour is this lane's own
    // because there is nobody to borrow from, and `peer` stays null (no guessing).
    const lonely = exchange({ to: undefined, end: undefined })
    const result = paintIn(lonely, 'lead')
    expect(result.paint).toEqual(laneColors.get('lead'))
    expect(result.direction).toBe('outgoing')
    expect(result.peerMatched).toBe(false)
  })

  it('a system speaker gets the NEUTRAL paint, not the drawing lane colour', () => {
    // This assertion caused a real code change: with `to` missing, the
    // `noAddressee` branch used to win over the peer fallback, so a `system`
    // sender inherited the colour of whichever lane happened to draw it — i.e. it
    // looked like that lane had sent it. ui-2 added an explicit `isSystem` guard
    // (`noAddressee && !isSystem`) and the neutral paint now wins.
    //
    // Reachability note: the host never draws such a span (a non-lane `from` is
    // placed on `from.id`, and `place()` drops it when no lane has that id), so
    // this is a defensive branch — but it is exactly the kind of branch that gets
    // copied into a reachable path later.
    const result = paintIn(exchange({ from: { kind: 'system', id: 'watcher', name: 'watcher' }, to: undefined }), 'lead')
    expect(result.paint).toEqual(SYSTEM_PAINT)
    expect(result.peerMatched).toBe(false)
  })

  it('a peer that already left the roster falls back to neutral and still names them', () => {
    const result = paintIn(exchange({ to: { kind: 'teammate', id: 'gone', name: 'gone-member' } }), 'lead')
    expect(result.paint).toEqual(SYSTEM_PAINT)
    expect(result.peerMatched).toBe(false)
    expect(result.peerName).toBe('gone-member')
  })
})

describe('§18.7 (host-data-2): a human prompt is RECEIVED, with a fixed colour', () => {
  /** A prompt from the human, which has no lane of its own. */
  const prompt = (overrides: Partial<MessageSpan> = {}): MessageSpan =>
    exchange({ kind: 'user-prompt', from: { kind: 'user', id: 'user', name: 'you' }, to: undefined, messageId: undefined, ...overrides })

  it('keeps the fixed user colour on the lane that shows it', () => {
    // The user asked for their own utterances to use a FIXED colour; that part is
    // independent of direction.
    const result = paintIn(prompt(), 'lead')
    expect(result.paint).toEqual(USER_PAINT)
    expect(result.isUser).toBe(true)
    expect(result.peerMatched).toBe(true)
  })

  it("reads as INCOMING, because 'user' is not a lane (rule 4)", () => {
    // §18.7 rule 4: `from.id` is the literal 'user' and the human has no lane, so
    // the lane that displays the prompt is the RECEIVER ("I received your words").
    // Measured on the real log: all 11 prompts carry no addressee and are drawn on
    // the lane whose log carried them — that lane is also a receiver.
    expect(paintIn(prompt(), 'lead').direction).toBe('incoming')
  })

  it('names the HUMAN as the counterparty, never the lane that carries it', () => {
    // REGRESSION LOCK for a bug ui-2 found and fixed (2026-10-12): with `to`
    // missing, the old peer inference read `message.from` unconditionally, so a
    // prompt drawn on the Lead's lane produced `aria="收到 ← Lead"` — the lane
    // naming ITSELF as the other party. The counterparty must always be the other
    // side, and a human prompt's other side is the human.
    const carriedOnLead = paintIn(prompt(), 'lead')
    expect(carriedOnLead.peerName).toBe('you')
    expect(carriedOnLead.peerName).not.toBe('lead')
    // Same rule for the shape the host will produce once it records the target:
    // `to` pointing at the carrying lane must still not make the lane the peer.
    const addressed = prompt({ to: { kind: 'teammate', id: 'lane-b', name: 'packaging' } })
    expect(paintIn(addressed, 'lane-b').peerName).toBe('you')
    expect(paintIn(addressed, 'lane-b').peerName).not.toBe('lane-b')
  })

  it('stays incoming even when a future host records the addressed lane', () => {
    // The host does not set `to` on prompts today (measured: 11/11 have none), so
    // this is the shape to keep correct when it does.
    const addressed = prompt({ to: { kind: 'teammate', id: 'lane-b', name: 'packaging' } })
    expect(paintIn(addressed, 'lane-b').direction).toBe('incoming')
    expect(paintIn(addressed, 'lane-b').paint).toEqual(USER_PAINT)
  })

  it('a self-addressed span is INCOMING — DECIDED: the client is authoritative', () => {
    // SETTLED (Lead, 2026-10-12): the client's `selfIsSender && !selfIsReceiver`
    // wins; host-data-2 aligns its FINDINGS wording with this. Rationale recorded
    // by the Lead: (a) measured reachability on the real log is **0 self-addressed
    // spans**, so it is a defensive branch; (b) that expression is the Lead's own
    // explicit priority and ui-2 kept it deliberately; (c) "arrived" is as
    // defensible as "sent" for a span aimed at its own lane; (d) changing live
    // client code for an unreachable branch is a no-yield edit at freeze time.
    // Both owner-authored descriptions must now agree with this assertion.
    const toSelf = exchange({ to: LEAD_SPEAKER })
    expect(paintIn(toSelf, 'lead').direction).toBe('incoming')
  })
})

describe('the direction cue does not depend on colour', () => {
  it('outgoing and incoming map to different class names and glyphs in the chart', () => {
    const source = readFileSync(resolve(ROOT, 'src/client/ui/GanttChart.tsx'), 'utf8')
    expect(source).toContain("outgoing ? 'dtg-msg-out' : 'dtg-msg-in'")
    expect(source).toMatch(/outgoing \? '↗' : '↙'/)
    expect(source).toMatch(/aria-label=\{label\}/)
    expect(source).toContain('messageSentTo')
    expect(source).toContain('messageReceivedFrom')
  })
})
