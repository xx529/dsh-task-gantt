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
 * ## The request this palette answers
 *
 * The user looked at a board where several agents shared a colour and asked for
 * **at least 16 preset colours that are not the Lead's**, used in order, and
 * only cycled once they run out. So the roster cycle is **16 entries wide**, and
 * the Lead keeps the one colour it never shares.
 *
 * | lane index | lane | entry |
 * |---|---|---|
 * | 0            | `lead`        | `LANE_COLOR_TOKENS[0]` (always the same blue) |
 * | 1 … 16       | teammate *n*  | `LANE_COLOR_TOKENS[n]` — sixteen distinct colours |
 * | 17           | teammate 17   | `LANE_COLOR_TOKENS[1]` — the cycle restarts |
 * | 18, 19, …    | teammate 18+  | `LANE_COLOR_TOKENS[2]`, `[3]`, … |
 * | any          | `unassigned`  | {@link UNASSIGNED_COLOR_TOKENS}, never a roster slot |
 *
 * **The first seventeen lanes are therefore seventeen different colours**: the
 * Lead plus sixteen teammates, no repeat. Only the eighteenth lane reuses
 * `[1]`. A test asserts exactly that.
 *
 * ## No achromatic entry may enter this list
 *
 * The previous palette ended with `--dsw-alias-state-idle-primary`, which the
 * theme defines as a pure grey (`--dsw-static-neutral-300` = `#d4d4d4` in the
 * light skin, `--dsw-static-neutral-600` = `#545557` in the dark one; chroma 0
 * in both). Every sixth lane was drawn in black-and-white grey, which is part
 * of the user's complaint. A lane colour is an *identity*, and an achromatic one
 * is indistinguishable from the panel chrome and from every other achromatic
 * lane.
 *
 * ## The theme's chromatic vocabulary is four hue families — so hues are composed
 *
 * Extracting every `--dsw-static-*` value shows exactly four chromatic families:
 *
 * | family | HSL hue | examples |
 * |---|---|---|
 * | red   | 0°       | `#f25a5a` `#ef4444` `#ec1313` |
 * | amber | 31-38°   | `#dd8629` `#f59e0b` `#f7ad31` |
 * | green | 142°     | `#4ed17e` `#22c55e` |
 * | blue  | 212-226° | `#93c5fd` `#60a5fa` `#5686fe` `#4176e6` `#2563eb` |
 *
 * There is no purple, magenta, cyan, teal, lime or pink token. `color-mix()` is
 * the THEME'S OWN idiom — `--dsw-alias-interactive-bg-hover` resolves to a
 * `color-mix()` — so composing the missing hues out of the four families is
 * following the host, not working around it. Every recipe below is **at most two
 * colours per mix**, nested at most one deep: a three-colour `color-mix` is NOT
 * used, because it resolved incorrectly in the app's Chromium.
 *
 * ## How the sixteen were chosen (measured, not eyeballed)
 *
 * Mixing two families gives intermediate hues, so the achievable ring is larger
 * than four: red → orange → olive → green → teal → azure → violet → magenta.
 * The sixteen entries are **eight non-uniform hue anchors × two lightness
 * rungs**, and both axes were searched numerically (the search maximised the
 * minimum pairwise OKLab distance subject to the constraints below; every number
 * here is re-measured by `tests/lane-color.spec.ts`, which prints each entry's
 * recipe, resolved hex and both-skin contrast ratio):
 *
 * | property | measured |
 * |---|---|
 * | entries | 16 (`TEAMMATE_COLOR_COUNT`), all chromatic |
 * | hue anchors (OKLCh) | 7.0° · 44.3° · 86.5° · 133.1° · 179.4° · 233.8° · 293.6° · 334.0° |
 * | minimum hue gap between adjacent anchors | **33.0°** |
 * | lightness rungs (OKLab L) | **0.483** / **0.566** — a fixed two-step ladder (min in-anchor step **0.0705**) |
 * | minimum pairwise OKLab ΔE (all 120 pairs) | **0.0714** |
 * | minimum adjacent OKLab ΔE in roster order | **0.1832** |
 * | contrast vs static white, worst entry | **4.51:1** (all 17 ≥ 4.5:1) |
 * | every entry, distance from the Lead's blue | ≥ **27.2°** in OKLCh hue and ≥ **0.147** in OKLab ΔE |
 *
 * The anchors are **deliberately not evenly spaced**: an even 45° ring cannot
 * work, because sRGB chroma collapses in the yellow-green and cyan regions (max
 * OKLCh C ≈ 0.09 there versus ≈ 0.22 in the reds). Giving the weak regions more
 * angular room is what keeps the *perceptual* chord between neighbours even,
 * which is what "tellable apart at 3px" actually depends on.
 *
 * Every entry keeps each of these:
 *
 * 1. **≥ 4.5:1 against the lane ink** — the lane name sits on this colour as its
 *    background, so the fill must carry white text;
 * 2. **a two-step lightness ladder** (≥ 0.0705 OKLab L) *within* each anchor, so
 *    two lanes in the same hue family still differ by a clear lightness step;
 * 3. **≥ 27.2° of OKLCh hue and ≥ 0.147 OKLab ΔE away from the Lead's blue**, so
 *    no teammate can be mistaken for the Lead — which is the complaint that
 *    started this.
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
 * A flipping alias cannot serve a saturated fill, so each entry carries BOTH
 * inks — {@link LaneColorTokens.on} for a dark fill and
 * {@link LaneColorTokens.onLight} for a light one.
 *
 * What the CLIENT actually paints today is the `bar` alone: a step bar, a lane
 * dot, a task card's left edge, and a message arrow (which is drawn in the
 * COUNTERPART's `bar`, per the user's colour rule). The two inks are carried for
 * text/icon-on-a-fill, which is what the palette's contract is for; they are not
 * consumed by the arrow, because an arrow on the panel is not sitting on the
 * fill whose ink would apply to it.
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
 * the sixteen lane fills is a saturated, dark-ish colour in BOTH skins, so its text has
 * to be LIGHT in both; an alias that flips cannot be that.
 *
 * Measured: `--dsw-static-neutral-bluish-00` is `#ffffff` in the light skin AND in the
 * dark skin (static tokens do not flip), and all sixteen fills clear 4.5:1 against white
 * (worst 4.51:1). A test pins that for every fill in BOTH skins, so this cannot regress
 * to a flipping alias.
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
 * Each recipe is a weighted average in sRGB, written out as **nested two-colour
 * mixes** (a three-colour `color-mix` is NOT used: it resolved incorrectly in
 * the app's Chromium, so every recipe here is at most two colours per mix).
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

/* ------------------------------------------------------------------------- *
 * The Lead's colour — the one entry no teammate is ever handed.
 * ------------------------------------------------------------------------- */

/** 蓝 blue — `#2563eb`, OKLCh H 262.9°, 5.17:1 with white. The theme gets this hue right already. */
const BLUE_LEAD = '--dsw-static-blue-600'

/* ------------------------------------------------------------------------- *
 * The sixteen teammate colours, in ROSTER ORDER.
 *
 * The order is not cosmetic: it is chosen so that each entry is as far as
 * possible from the one before it (minimum adjacent OKLab ΔE = 0.1838 against a
 * minimum pairwise ΔE of 0.0723 over all 120 pairs). A teammate's colour is
 * therefore maximally unlike its neighbour's, whichever pair of consecutive
 * lanes the user happens to be looking at.
 *
 * Every recipe is at most two colours per mix. The trailing `%` on the ink is
 * the least darkening that clears 4.5:1 against white.
 * ------------------------------------------------------------------------- */

/** 红 Crimson Deep — OKLCh 7.0°, `#a3294f`, 7.03:1 with white. */
const CRIMSON_DEEP = mix([['--dsw-static-red-600', 70], ['--dsw-static-blue-600', 30]], 8)
/** 绿 Green Light — OKLCh 133.1°, `#558130`, 4.60:1 with white. */
const GREEN_LIGHT = mix([['--dsw-static-green-500', 60], ['--dsw-static-amber-500', 40]], 32)
/** 紫 Violet Light — OKLCh 293.6°, `#786ba5`, 4.72:1 with white. */
const VIOLET_LIGHT = mix([['--dsw-static-red-500', 35], ['--dsw-static-blue-450', 65]], 12)
/** 橄榄 Olive Deep — OKLCh 86.5°, `#765c19`, 6.33:1 with white. */
const OLIVE_DEEP = mix([['--dsw-static-green-400', 15], ['--dsw-static-amber-500', 85]], 50)
/** 品红 Magenta Light — OKLCh 334.0°, `#9d5c91`, 4.80:1 with white. */
const MAGENTA_LIGHT = mix([['--dsw-static-blue-600', 40], ['--dsw-static-red-400', 60]], 2)
/** 青 Teal Light — OKLCh 179.4°, `#368375`, 4.51:1 with white. */
const TEAL_LIGHT = mix([['--dsw-static-blue-500', 30], ['--dsw-static-green-400', 70]], 32)
/** 品红 Magenta Deep — OKLCh 334.8°, `#87427a`, 6.80:1 with white. */
const MAGENTA_DEEP = mix([['--dsw-static-red-500', 50], ['--dsw-static-blue-800', 50]], 0)
/** 绿 Green Deep — OKLCh 133.2°, `#476a2b`, 6.24:1 with white. */
const GREEN_DEEP = mix([['--dsw-static-green-500', 60], ['--dsw-static-amber-500', 40]], 46)
/** 玫红 Rose Light — OKLCh 4.5°, `#ba4b6c`, 4.87:1 with white. */
const ROSE_LIGHT = mix([['--dsw-static-red-500', 75], ['--dsw-static-blue-600', 25]], 2)
/** 青 Teal Deep — OKLCh 178.0°, `#176e5f`, 6.12:1 with white. */
const TEAL_DEEP = mix([['--dsw-static-green-500', 50], ['--dsw-static-blue-900', 50]], 12)
/** 橙 Orange Deep — OKLCh 44.3°, `#974011`, 6.87:1 with white. */
const ORANGE_DEEP = mix([['--dsw-static-red-600', 45], ['--dsw-static-amber-500', 55]], 40)
/** 天蓝 Azure Deep — OKLCh 233.8°, `#2e6683`, 6.28:1 with white. The closest any teammate comes to the Lead: 29.0° away. */
const AZURE_DEEP = mix([['--dsw-static-green-400', 35], ['--dsw-static-blue-500', 65]], 40)
/** 橙 Orange Light — OKLCh 46.0°, `#bb5210`, 4.85:1 with white. */
const ORANGE_LIGHT = mix([['--dsw-static-red-600', 40], ['--dsw-static-amber-500', 60]], 24)
/** 紫 Violet Deep — OKLCh 292.5°, `#60558a`, 6.64:1 with white. */
const VIOLET_DEEP = mix([['--dsw-static-blue-450', 70], ['--dsw-static-red-600', 30]], 26)
/** 橄榄 Olive Light — OKLCh 87.5°, `#927216`, 4.53:1 with white. */
const OLIVE_LIGHT = mix([['--dsw-static-green-500', 15], ['--dsw-static-amber-500', 85]], 34)
/** 天蓝 Azure Light — OKLCh 235.7°, `#3f7da0`, 4.51:1 with white. 27.2° from the Lead — the closest teammate entry. */
const AZURE_LIGHT = mix([['--dsw-static-green-500', 20], ['--dsw-static-blue-400', 80]], 30)

/**
 * The lane palette: the Lead's fixed blue at the head, then the **sixteen**
 * teammate colours in roster order.
 *
 * The Lead is pinned to index 0 and is never handed to a teammate, so the
 * "who is in charge" row looks the same in every team and every session.
 */
export const LANE_COLOR_TOKENS: readonly LaneColorTokens[] = [
  // 蓝 blue — the Lead's fixed colour, and the head of the wheel.
  { bar: BLUE_LEAD, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // ---- the sixteen teammate colours, in roster order ----
  { bar: CRIMSON_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: GREEN_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: VIOLET_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: OLIVE_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: MAGENTA_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: TEAL_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: MAGENTA_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: GREEN_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: ROSE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: TEAL_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: ORANGE_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: AZURE_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: ORANGE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: VIOLET_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: OLIVE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: AZURE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
]

/**
 * How many DIFFERENT colours a teammate can get before any repeats.
 *
 * This is the user's "16 种与 lead 不同的颜色，超过了才能循环使用" as a constant:
 * entries `1 … 16` of {@link LANE_COLOR_TOKENS} are the sixteen teammate slots,
 * and the roster cycle is exactly this wide. Lane index 17 is the first lane
 * that repeats (it lands back on slot 1 — never on the Lead's slot 0).
 */
export const TEAMMATE_COLOR_COUNT = LANE_COLOR_TOKENS.length - 1

/**
 * The Lead's colour is FIXED — always 蓝 blue, never handed to a teammate — so the
 * "who is in charge" row looks the same in every team and every session.
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
 * gets the deepest blue — a slot that is NEVER handed out by the roster cycle,
 * because that cycle runs over entries 1..16 only — so it is stable, chromatic,
 * and legible.
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
 * | teammate at roster position *n* (1-based) | `LANE_COLOR_TOKENS[1 + ((n - 1) % 16)]` |
 * | `unassigned` | always {@link UNASSIGNED_COLOR_TOKENS} |
 *
 * So the first **seventeen** lanes — the Lead plus sixteen teammates — are
 * seventeen different colours, and the Lead's slot is never recycled into the
 * teammate cycle. From the eighteenth lane the sixteen teammate colours repeat;
 * that is the documented ceiling of a theme with four chromatic token families,
 * and the lane still carries its name plus whatever non-colour cue the client
 * adds.
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
  // The teammate cycle runs over entries 1..16 and WRAPS BACK TO 1 — never to 0,
  // which is the Lead's slot. `% TEAMMATE_COLOR_COUNT` (not `% length`) is what
  // keeps the Lead's colour out of the roster for every roster size.
  const slotIndex = 1 + ((position - 1) % TEAMMATE_COLOR_COUNT)
  // `noUncheckedIndexedAccess` is on: fall back to the Lead colour rather than
  // assert. Unreachable for a non-empty palette, but total by construction.
  return LANE_COLOR_TOKENS[slotIndex] ?? LEAD_COLOR_TOKENS
}
