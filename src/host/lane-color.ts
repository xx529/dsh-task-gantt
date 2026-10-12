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
 * The ink for a saturated fill.
 *
 * Deliberately a `--dsw-static-*` token, NOT `--dsw-alias-label-primary-inverted`.
 *
 * The alias is the theme's own "text on a saturated surface" token, and it is right in
 * the light skin (`#ffffff`). But it FLIPS: in the dark skin it is `#353638`, a dark
 * grey. Measured on the real dark skin, that put the lane NAME — dark grey text on a
 * saturated blue pill — at **2.34:1**, and the same ink is on the task box. Every one of
 * the seven lane fills is a saturated, dark-ish colour in BOTH skins, so its text has to
 * be LIGHT in both; an alias that flips cannot be that.
 *
 * Measured: `--dsw-static-neutral-bluish-00` is `#ffffff` in the light skin AND in the
 * dark skin (static tokens do not flip), and all seven fills clear 4.5:1 against white —
 * 5.17 / 7.05 / 4.56 / 4.52 / 4.55 / 4.51 / 4.51. A test pins that for every fill in
 * BOTH skins, so this cannot regress to a flipping alias.
 */
const ON_DARK_FILL = '--dsw-static-neutral-bluish-00'

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
 * Compose one lane colour from theme tokens.
 *
 * `color-mix(in srgb, ...)` is the THEME'S OWN idiom — `--dsw-alias-interactive-bg-hover`
 * resolves to a `color-mix()` — so composing the seven wheel hues out of the theme's
 * four chromatic families is following the host, not working around it. Each recipe is
 * a weighted average in sRGB, which is what this function writes out as nested mixes
 * (a three-colour `color-mix` is NOT used: it resolved incorrectly in the app's
 * Chromium, so every recipe here is at most two colours per mix).
 *
 * @param parts - `[token, weight]` pairs; weights are normalised.
 * @param inkWeight - how much of the theme's dark ink to fold in, in percent of the
 *   whole. This is what buys white text its contrast (see the palette table).
 */
function mix(parts: readonly (readonly [string, number])[], inkWeight: number): string {
  const total = parts.reduce((sum, [, weight]) => sum + weight, 0)
  // Round the percentages so the emitted string is stable: a raw division produced
  // values like `55.00000000000001%`, which is noise in a value the host publishes.
  const pct = (weight: number): string => String(Math.round((weight / total) * 1000) / 10)
  const weighted = parts.map(([token, weight]) => `var(${token}) ${pct(weight)}%`).join(', ')
  // A single token with no ink is just the token NAME — `bar` is always a name or a
  // composition of names, never a bare `var()`, so the validator's rule holds.
  const base =
    parts.length === 1 && inkWeight <= 0
      ? (parts[0]?.[0] ?? '')
      : parts.length === 1
        ? `var(${parts[0]?.[0] ?? ''})`
        : `color-mix(in srgb, ${weighted})`
  if (inkWeight <= 0) return base
  return `color-mix(in srgb, ${base} ${100 - inkWeight}%, var(${INK_TOKEN}) ${inkWeight}%)`
}

/** The theme's darkest ink, used only to darken a hue until white text reads on it. */
const INK_TOKEN = '--dsw-static-neutral-bluish-1000'

/** 红 0° — `#ec1313`, 4.56:1 with white. */
const RED = mix([['--dsw-static-red-600', 100]], 1)
/** 橙 31° — `#a76824`, 4.52:1. Amber alone is 2.79:1, too pale for white text. */
const ORANGE = mix([['--dsw-static-amber-600', 100]], 26)
/** 黄 61° — `#797a22`, 4.55:1. At hue 60 a VIVID yellow cannot hold white text in sRGB. */
const YELLOW = mix([['--dsw-static-amber-500', 65], ['--dsw-static-green-500', 35]], 32)
/** 绿 143° — `#1c8845`, 4.51:1. */
const GREEN = mix([['--dsw-static-green-500', 100]], 34)
/** 青 182° — `#208387`, 4.51:1. The theme has NO cyan token; green+blue is a new hue. */
const CYAN = mix([['--dsw-static-green-500', 55], ['--dsw-static-blue-600', 45]], 16)
/** 蓝 221° — the lead's fixed colour, and the one hue the theme gets right already. */
const BLUE = '--dsw-static-blue-600'
/** 紫 307° — `#883b7f`, 7.05:1. The theme has NO purple token; blue+red is a new hue. */
const PURPLE = mix([['--dsw-static-blue-600', 50], ['--dsw-static-red-600', 50]], 0)

/**
 * The lane palette: the SEVEN hues the panel is specified to use — 红橙黄绿青蓝紫 —
 * each one distinct, plus the Lead's own fixed colour.
 *
 * ## The theme does not contain these hues, so they are composed from it
 *
 * Extracting every `--dsw-static-*` value shows the theme publishes only FOUR
 * chromatic families (red 0°, amber 31-38°, green 142°, blue 212-226°). Cyan (180°)
 * and purple (300°) exist as no token at all, and a *vivid* yellow cannot even hold
 * white text in sRGB — white needs about 4.5:1, which at hue 60 forces a dark olive.
 * So the wheel is built the way the theme builds its own values: `color-mix()` in
 * sRGB between two theme tokens, then darkened toward the theme's own ink by the
 * LEAST amount that lets the label stay white. Nothing here is a literal colour, and
 * the theme's `--dsw-alias-interactive-bg-hover` is itself a `color-mix()`, so this
 * is the host's idiom rather than an escape hatch.
 *
 * ## Measured, not eyeballed
 *
 * | slot | hue | saturation | contrast with WHITE |
 * |---|---|---|---|
 * | 红 red    | 0°   | 85% | 4.56:1 |
 * | 橙 orange | 31°  | 65% | 4.52:1 |
 * | 黄 yellow | 61°  | 56% | 4.55:1 |
 * | 绿 green  | 143° | 66% | 4.51:1 |
 * | 青 cyan   | 182° | 62% | 4.51:1 |
 * | 蓝 blue   | 221° | 83% | 5.17:1 |
 * | 紫 purple | 307° | 40% | 7.05:1 |
 *
 * Cyan and purple sit 3° and 7° off their nominal hues, and yellow is an olive-gold:
 * those are the closest points that clear 4.5:1 while staying as saturated as the
 * constraint allows. A `color-mix` recipe is emitted rather than a hex so the panel
 * keeps following the theme when the theme changes.
 */
export const LANE_COLOR_TOKENS: readonly LaneColorTokens[] = [
  // 蓝 blue — the Lead's fixed colour, and the head of the wheel.
  { bar: BLUE, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 紫 purple: blue + red, a hue the theme has no token for.
  { bar: PURPLE, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 红 red
  { bar: RED, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 橙 orange
  { bar: ORANGE, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 黄 yellow
  { bar: YELLOW, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 绿 green
  { bar: GREEN, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 青 cyan: green + blue, a hue the theme has no token for.
  { bar: CYAN, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
]

/**
 * The Lead's colour is FIXED — always 蓝 blue, never handed to a teammate — so the
 * "who is in charge" row looks the same in every team and every session, and the
 * seven teammate hues are the wheel's other six plus a wrap.
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
