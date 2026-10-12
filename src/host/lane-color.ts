/**
 * Lane identity colours, expressed as **theme-token names** — never values.
 *
 * The theme contract forbids hard-coded paint in this plugin, so the host half
 * chooses *which* tokens a lane uses and the client half resolves them with
 * `var(...)`. That keeps the panel correct in every skin and mode without the
 * host knowing a single colour.
 *
 * ## Where these values come from
 *
 * Read out of the theme the running app actually ships
 * (`@deepseek-ai/dsh-client-ui-theme/lib/client.js` inside `App.asar`), by
 * extracting the `--token:value` declarations and resolving `var()` chains. The
 * npm copy on `~/.dsh/profiles/node_modules` is an older build with fewer
 * tokens, so it is NOT authoritative — that discrepancy is what made an earlier
 * revision believe {@link REJECTED_IDLE_TOKEN} did not exist.
 *
 * ## Why the palette looks like this
 *
 * **No achromatic entry may enter this list.** The previous palette ended with
 * `--dsw-alias-state-idle-primary`, which the theme defines as a pure grey
 * (`--dsw-static-neutral-300` = `#d4d4d4` in the light skin,
 * `--dsw-static-neutral-600` = `#545557` in the dark one; chroma 0 in both).
 * Every sixth lane was therefore drawn in black-and-white grey, which is the
 * user's complaint: "每个 agent 的颜色区分度要大，但是不要出现 黑白灰". A lane
 * colour is an *identity*, and an achromatic one is indistinguishable from the
 * panel chrome and from every other achromatic lane.
 *
 * **The theme's chromatic vocabulary is only four hue families.** Extracting
 * every `--dsw-static-*` value shows exactly:
 *
 * | family | hue | examples |
 * |---|---|---|
 * | red   | 0°       | `#f25a5a` `#ef4444` `#ec1313` |
 * | amber | 31-38°   | `#dd8629` `#f59e0b` `#f7ad31` |
 * | green | 142°     | `#4ed17e` `#22c55e` |
 * | blue  | 212-226° | `#93c5fd` `#60a5fa` `#5686fe` `#4176e6` `#2563eb` |
 *
 * There is no purple, magenta, cyan, teal, lime or pink token. So "eight
 * maximally distinct hues" is not achievable at any effort level: past four
 * lanes the palette MUST reuse a family, and the honest way to do that is to
 * separate the repeat by LIGHTNESS rather than by inventing a hue.
 *
 * {@link LANE_COLOR_TOKENS} therefore uses four hue families, each twice — once
 * as a deep fill and once as a light one — giving eight visually distinct slots
 * that are all chromatic. The Lead is pinned to the head.
 *
 * ## Legibility is per-lane, because one ink cannot serve every fill
 *
 * The theme publishes two inks and both flip with the skin:
 *
 * | token | light skin | dark skin |
 * |---|---|---|
 * | `--dsw-alias-label-primary-inverted` | `#ffffff` | `#353638` |
 * | `--dsw-alias-label-primary`          | `#0f1115` | `#f9fafb` |
 *
 * No single ink clears 3:1 against every fill above *in both skins*: measured,
 * only five chromatic statics in the whole theme manage that, all of them
 * either red or blue. So each entry carries BOTH inks — {@link LaneColorTokens.on}
 * for a dark fill and {@link LaneColorTokens.onLight} for a light one — and the
 * client carries both (see the palette comments below). Every fill below was
 * verified to reach >= 3.4:1 against at least one of the two in each skin, which
 * is what makes the pair worth shipping rather than a single ink.
 *
 * What the CLIENT actually paints today is the `bar` alone: a step bar, a lane
 * dot, a task card's left edge, and a message arrow (which is drawn in the
 * COUNTERPART's `bar`, per the user's colour rule). The two inks are carried for
 * text/icon-on-a-fill, which is what the palette's contract is for; they are not
 * consumed by the arrow, because an arrow on the panel is not sitting on the
 * fill whose ink would apply to it.
 *
 * The measurement also caught a live defect: the palette's previous
 * `state-success-primary` (#22c55e) and `state-warn-primary` (#f59e0b) carried
 * the light skin's white ink at 2.28:1 and 2.15:1 — both below the 3:1 graphical
 * minimum, so those lanes' arrows and card badges were not reliably readable.
 */
import type { LaneColorTokens } from '../shared/contract.ts'

/**
 * The ink for a DARK fill, i.e. the token the theme uses for text on a
 * saturated surface. Flips to `#353638` in the dark skin.
 */
const ON_DARK_FILL = '--dsw-alias-label-primary-inverted'

/**
 * The ink for a LIGHT fill. `--dsw-alias-label-primary` is the ink the theme
 * uses on its own surface: `#0f1115` light / `#f9fafb` dark. It is the correct
 * partner for a pale fill in either skin, and it is why a pale lane colour is
 * safe to use at all.
 */
const ON_LIGHT_FILL = '--dsw-alias-label-primary'

/** Build one palette entry from the two token names it needs. */
function slot(bar: string): LaneColorTokens {
  return { bar, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL }
}

/**
 * The lane palette — eight chromatic slots, ordered deep-then-light per family.
 *
 * Order matters: index 0 is reserved for the Lead, and the rest are handed out
 * in roster order. The first four lanes get four different hue families; lanes
 * five to eight get the same four families at a clearly different lightness.
 */
export const LANE_COLOR_TOKENS: readonly LaneColorTokens[] = [
  slot('--dsw-static-blue-600'), // blue
  slot('--dsw-static-red-600'), // red
  slot('--dsw-static-amber-600'), // amber
  slot('--dsw-static-green-500'), // green
  slot('--dsw-static-blue-300'), // blue, light
  slot('--dsw-static-red-400'), // red, light
  slot('--dsw-static-amber-400'), // amber, light
  slot('--dsw-static-green-400'), // green, light
]

/**
 * The Lead's colour is pinned to the head of the palette, so the "who is in
 * charge" row looks the same in every team and every session.
 */
export const LEAD_COLOR_TOKENS: LaneColorTokens = LANE_COLOR_TOKENS[0] as LaneColorTokens

/**
 * The token the previous palette used for its fifth entry, kept only so the
 * rejection is greppable and testable.
 *
 * It is a real theme token (the app bundle defines it), but it resolves to a
 * chroma-0 grey in both skins, and this palette must never contain one. A test
 * asserts that neither this palette nor the client's fallback table names it.
 */
export const REJECTED_IDLE_TOKEN = '--dsw-alias-state-idle-primary'

/**
 * The colour reserved for the `unassigned` bucket.
 *
 * A task nobody owns must not borrow a teammate's identity colour, and it must
 * not be grey either (an achromatic bucket reads as a rendering failure). It
 * gets the deepest blue — the one slot that is never handed out, because the
 * roster cycle starts at index 1 — so it is stable, chromatic, and legible.
 */
export const UNASSIGNED_COLOR_TOKENS: LaneColorTokens = slot('--dsw-static-blue-800')

/**
 * The theme tokens one lane should paint itself with.
 *
 * ## Addressing on purpose: position, not a hash
 *
 * The first implementation hashed the lane id into the palette. A hash is
 * *stable* but **structurally cannot avoid collisions**: with the birthday
 * bound, three ids in five slots collide with probability ~0.8, and the real
 * recorded run had eight teammates sharing five colours — the exact opposite of
 * "the Lead and every teammate gets a colour of their own", which is about being
 * tellable apart *on screen*.
 *
 * Positional assignment makes the guarantee explicit instead:
 *
 * | lane | colour |
 * |---|---|
 * | `lead` (index 0) | always {@link LEAD_COLOR_TOKENS} |
 * | teammate at roster position *n* | `PALETTE[n]`, wrapping at 8 |
 *
 * So the first eight lanes — the Lead plus seven teammates — are always eight
 * different colours. From the ninth lane the palette repeats; that is the
 * documented ceiling of a theme with four hue families, and the lane still
 * carries its name plus whatever non-colour cue the client adds.
 *
 * ## Stability, stated precisely
 *
 * - the **Lead** is the same colour in every team and every session;
 * - a teammate keeps its colour while the roster order is unchanged;
 * - **a teammate's colour can change between sessions when the roster order
 *   changes** — that is the price paid for "no two lanes on this screen look
 *   alike", and it is deliberate: being able to tell teammates apart right now
 *   matters more than a per-id colour that collides with its neighbour.
 *
 * @param laneId - the lane's id (`'lead'`, a member session id, `'unassigned'`).
 * @param index - the lane's index in the final `lanes` array (the Lead is 0).
 * @returns the `{ bar, on, onLight }` token triple, or
 *   {@link UNASSIGNED_COLOR_TOKENS} for the sentinel lane.
 */
export function laneColorTokens(laneId: string, index: number): LaneColorTokens {
  if (laneId === 'unassigned') return UNASSIGNED_COLOR_TOKENS
  if (laneId === 'lead') return LEAD_COLOR_TOKENS
  const position = Number.isFinite(index) && index > 0 ? Math.floor(index) : 1
  const slotIndex = position % LANE_COLOR_TOKENS.length
  // `noUncheckedIndexedAccess` is on: fall back to the Lead colour rather than
  // assert. Unreachable for a non-empty palette, but total by construction.
  return LANE_COLOR_TOKENS[slotIndex] ?? LEAD_COLOR_TOKENS
}
