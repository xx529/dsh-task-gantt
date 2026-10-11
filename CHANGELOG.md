# Changelog

## 0.2.1 — 2026-10-12

Follow-up to 0.2.0 from the first pass of live testing of the message details.

- A message whose recipient was not recorded no longer reads `unknown peer`.
  A human prompt carries no addressee in the journal, but its recipient is
  knowable: the prompt lives in the log of whoever it was addressed to. The
  details view now derives that from the lane it is drawn on (`you -> lead`),
  and falls back to `(recipient not recorded)` when even that is unavailable.
  The `unknown peer` dictionary entry is deleted, and the tests forbid the
  wording from returning.
- The details view shows seconds. `formatClock` had only ever formatted to the
  minute while a self-check claimed otherwise: the asserted value had been
  written into the log by hand rather than read back from the function, so the
  assertion never ran. The formatter now defaults to seconds (axis labels keep
  minutes) and the check reads the real return value.
- `data-message-route` carries `data-message-direction`, `-from` and `-to` on
  the same node, so a live check can read the whole routing in one query.

## 0.2.0 — 2026-10-12

The panel's first release with a build identity, so a tester can tell from the
screen which build they are looking at (`BUILD_LABEL` in the footer and on the
panel root's `data-build`).

**Lanes**

- Lane height is a fixed 84px across three non-overlapping tracks — activity
  (3–13), messages (16–27), tasks (30–66). Previously a 56px lane held the
  message markers (12–23) and the 36px task card (17–53) on top of each other.
- An idle team's timeline stops moving. `live` is derived from event evidence
  only (a registered agent that is running, or the requested session's own open
  span/turn), and a frozen chart is labelled `ended` rather than hidden or
  mislabelled `now`.

**Tasks**

- Bar length is the task's duration. The old width was
  `clamp(duration/msPerPx, 148, 260)`, and 148px is about 740s at the panel's
  zoom, so every task shorter than ~12 minutes drew the same length and the bar
  you saw was mostly the label's background.
- Bar height is 10px, independent of the 36px chip. It previously reused the
  card height, which rendered as a coloured block rather than a bar.
- The label is a separate chip (inside the bar when it fits, otherwise to its
  right) so text width can no longer influence geometry; swapping a 1-character
  subject for a 4000-character one leaves the bar's x and width unchanged.
- The details view and the card tooltip print `created 23:11 → finished 23:11
  (14s)` from one shared helper.

**Messages**

- Every exchange is drawn on both lanes (the host mirrors it), and a marker is
  coloured by the *counterparty*: `sent to B` on A's lane takes B's colour,
  `received from A` on B's lane takes A's colour, with a non-colour arrow. The
  colour previously always came from the sender, so a lane's own colour carried
  no information.
- Clicking a marker shows both names, the local time with seconds, the kind,
  and the **full message body**. Long text stays out of `title` — a browser
  tooltip truncates and cannot scroll, so it would look complete while showing
  only a prefix.
- `MESSAGE_PREVIEW_MAX` 140 → 16384, and the field's meaning changed from
  "one-line teaser" to "the whole collapsed body". Across 177 real
  `team/message` records the bodies run 600–7135 characters (median 1839), so
  **all 177** were truncated before this. The ceiling is now only a guard
  against a pathological record; clipping is reported in the host's notes
  rather than happening silently.

**Fixes found by cross-checking rather than by the suite**

- An empty live log shadowed the disk log, so a registered-but-not-yet-replayed
  session drew an empty chart while claiming `source: 'log'`.
- A 1.5s cross-request log cache could serve a stale snapshot exactly when a
  new prompt arrived, pinning the panel in the frozen state.
- Decimation shared one pixel-gap cursor and one bucket set across both message
  directions, and a reply lands a few pixels after the message it answers, so
  every lane's outgoing markers lost the gap contest and that whole direction
  vanished silently.
- A human prompt was drawn three times: it appears in the lead's log and in
  every teammate's, and deduplication keyed on the carrying session.
- `--dsw-font-mono` and `--dsw-alias-label-quaternary` do not exist in the
  host's 408 theme tokens, making those declarations invalid at
  computed-value time — invisible to typecheck and to the colour scan.
- `laneIdOf` needed two hops: a lane's id is the session id for a teammate, but
  the lead's lane id is the literal `lead`, so `lead` never resolved.

## 0.1.0

First working version: a sidebar Gantt of an agent team's shared tasks, with
teammates on the y-axis and time taken from the durable session event log.
