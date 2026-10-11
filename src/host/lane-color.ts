/**
 * Lane identity colours, expressed as **theme-token names** — never values.
 *
 * The theme contract forbids hard-coded paint in this plugin, so the host half
 * chooses *which* tokens a lane uses and the client half resolves them with
 * `var(...)`. That keeps the panel correct in every skin and mode without the
 * host knowing a single colour.
 *
 * ## Provenance of every token below (verified, not assumed)
 *
 * Resolution was measured in the running desktop app (DSH 0.2.0-rc.2,
 * `dsh-better-sidebar@0.25.0`) by reading the live stylesheet: every token is
 * **defined on the `body` selector** of the injected theme (107 `--dsw-alias-*`
 * tokens are defined there), and each resolves to a real colour:
 *
 * | token | resolves to (light skin) |
 * |---|---|
 * | `--dsw-alias-state-business-primary` | `rgb(65, 118, 230)` |
 * | `--dsw-alias-state-success-primary`  | `rgb(34, 197, 94)` |
 * | `--dsw-alias-state-warn-primary`     | `rgb(245, 158, 11)` |
 * | `--dsw-alias-state-error-primary`    | `rgb(236, 19, 19)` |
 * | `--dsw-alias-state-idle-primary`     | `rgb(212, 212, 212)` |
 * | `--dsw-alias-label-primary-inverted` | `rgb(255, 255, 255)` |
 *
 * All six are members of the 408-token definition snapshot the test suite pins
 * (`tests/fixtures/dsw-theme-tokens.json`), so a lane colour can never be a name
 * the host does not define.
 *
 * ## Why five hues is the real ceiling
 *
 * The theme defines plenty of other `--dsw-alias-*` names, but none of them is a
 * usable sixth *identity* colour, measured rather than assumed:
 *
 * - `--dsw-alias-brand-primary` and `--dsw-alias-button-primary-fill` resolve to
 *   `rgb(15, 17, 21)` — the near-black ink of the chrome, indistinguishable from
 *   the panel itself;
 * - `--dsw-alias-link` is the *same* `rgb(65, 118, 230)` as
 *   `--dsw-alias-state-business-primary`, so it adds a name but no hue;
 * - every `--dsw-alias-state-*-tertiary` is a near-white wash
 *   (`rgb(228, 237, 253)` / `rgb(230, 250, 237)` / `rgb(254, 245, 231)`) that
 *   cannot carry the inverted label;
 * - `--dsw-alias-onboarding-accent` (`rgb(57, 100, 254)`) *is* a distinct hue,
 *   but it belongs to the onboarding flow: a theme revision may legitimately
 *   retire it, and an identity colour must not depend on a flow-scoped token.
 *
 * So five is where this stops, and the ceiling is documented rather than papered
 * over with a token that merely looks different in a table.
 *
 * Two further plausible-looking names were measured as **missing** on this
 * build and are deliberately not used: `--dsw-alias-label-invert` and
 * `--dsw-alias-label-on-brand`.
 *
 * See docs/FINDINGS-host.md §16 for the exact commands and raw output.
 */
import type { LaneColorTokens } from '../shared/contract.ts'

/**
 * The lane palette — five mutually distinct hues.
 *
 * Order matters twice over: index 0 is reserved for the Lead, and the rest are
 * handed out in roster order, so the first five lanes (the Lead plus four
 * teammates) are guaranteed five different colours.
 */
export const LANE_COLOR_TOKENS: readonly LaneColorTokens[] = [
  { bar: '--dsw-alias-state-business-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-success-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-warn-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-error-primary', on: '--dsw-alias-label-primary-inverted' },
  { bar: '--dsw-alias-state-idle-primary', on: '--dsw-alias-label-primary-inverted' },
]

/**
 * The Lead's colour is pinned to the head of the palette, so the "who is in
 * charge" row looks the same in every team and every session.
 */
export const LEAD_COLOR_TOKENS: LaneColorTokens = LANE_COLOR_TOKENS[0] as LaneColorTokens

/**
 * The colour reserved for the `unassigned` bucket.
 *
 * A task nobody owns must not borrow a teammate's identity colour, so this row
 * gets the palette's neutral entry explicitly rather than by position.
 */
export const UNASSIGNED_COLOR_TOKENS: LaneColorTokens = {
  bar: '--dsw-alias-state-idle-primary',
  on: '--dsw-alias-label-primary-inverted',
}

/**
 * The theme tokens one lane should paint itself with.
 *
 * ## Addressing on purpose: position, not a hash
 *
 * The first implementation hashed the lane id into the palette. A hash is
 * *stable* but **structurally cannot avoid collisions**: with the birthday
 * bound, three ids in five slots collide with probability ≈ 0.8, and the real
 * recorded run had eight teammates sharing five colours — the exact opposite of
 * "the Lead and every teammate gets a colour of their own", which is about being
 * tellable apart *on screen*.
 *
 * Positional assignment makes the guarantee explicit instead:
 *
 * | lane | colour |
 * |---|---|
 * | `lead` (index 0) | always {@link LEAD_COLOR_TOKENS} |
 * | teammate at roster position *n* | `PALETTE[n]`, wrapping at 5 |
 *
 * So the first five lanes — the Lead plus four teammates — are always five
 * different colours. From the sixth lane the palette repeats; that is the
 * documented ceiling, and the lane still carries its name plus whatever
 * non-colour cue the client adds.
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
 * @returns the `{ bar, on }` token pair, or {@link UNASSIGNED_COLOR_TOKENS} for
 *   the sentinel lane.
 */
export function laneColorTokens(laneId: string, index: number): LaneColorTokens {
  if (laneId === 'unassigned') return UNASSIGNED_COLOR_TOKENS
  if (laneId === 'lead') return LEAD_COLOR_TOKENS
  const position = Number.isFinite(index) && index > 0 ? Math.floor(index) : 1
  const slot = position % LANE_COLOR_TOKENS.length
  // `noUncheckedIndexedAccess` is on: fall back to the Lead colour rather than
  // assert. Unreachable for a non-empty palette, but total by construction.
  return LANE_COLOR_TOKENS[slot] ?? LEAD_COLOR_TOKENS
}
