# Changelog

## 0.2.4 — 2026-10-12

**The sent and received arrows are now the same arrow, differing only in weight**

The report: "发送的标识只有一个小三角形明显，改成更接收一样的 icon 只是方向变了斜线上".

The received arrow was right and the sent one was wrong, because they used different
*paint* on a different *geometry*:

- The filled variant used the same centreline as the stroked one — a path of **open
  line segments**. Open lines enclose no area, so `fill` on them paints almost
  nothing; the sent marker was a 1px sliver with one visible nub. That is the "小三角形".
- It was then given a real closed polygon, and it came out wrong a second way: the
  head reached 10.8 of a 12-unit box, so the arrow was **silently clipped** by its own
  viewBox and read as a stub. Neither defect is visible from reading the numbers.

Both are replaced by ONE centreline drawn at two stroke weights:

| | aim | weight |
|---|---|---|
| sent | up-right | 3.4px — wide enough that the head's barbs fill, so it reads solid |
| received | down-left | 2px — the same shape read as an outline |

The centreline is derived, not eyeballed: a 2px stroke reaches 1px either side of its
path, so the line is inset one unit from the outer silhouette, which keeps the painted
arrow inside its box at both weights (a test now asserts that for every vertex).

The footer build identity is now `v0.2.4 · matched-arrow-weights`.

## 0.2.3 — 2026-10-12

Two follow-ups from looking at the panel on a real screen: the message icon still
had a square around it, and one lane colour was grey.

**The message icon is now the arrow, and nothing else**

- Every earlier revision wrapped the glyph — first an 11px disc, then a
  solid/hollow plate — and the report each time was the same: "外面还有个正方形的框
  会让里面的尖头显示不清晰". A frame competes with the arrow's own tip for the same
  few pixels in an 11px track. The marker now carries `background: none`,
  `border: 0` and `border-radius: 0`; the SVG path *is* the icon.
- The arrow is drawn as a path, not set as a text glyph. `↗` renders as a hairline
  whose weight depends on the font and never gets as legible as a 2px stroke with
  round caps — which is what the user's reference image shows.
- Direction is two independent cues from one geometry: the path is mirrored for a
  received message, and a sent message is FILLED while a received one is STROKED at
  2px. Both are equally heavy, so the two directions differ in shape rather than in
  strength.
- The arrow is painted in the **counterpart's lane colour** — the rule the user
  asked for ("A 发给 B，A 的泳道显示 收件人B 的颜色"). A hairline of the panel
  surface behind each marker keeps a pale lane colour readable as an edge without
  introducing a frame.

**No lane is grey any more, and the palette is built from measured values**

- `--dsw-alias-state-idle-primary`, the fifth palette entry, resolves to a pure
  grey: `--dsw-static-neutral-300` (`#d4d4d4`, chroma 0) in the light skin and
  `--dsw-static-neutral-600` (`#545557`, chroma 0) in the dark one. Every sixth lane
  was therefore drawn in black-and-white, which is the report "每个 agent 的颜色区分度
  要大，但是不要出现 黑白灰". It is gone, and a test forbids it from returning.
- The palette is now eight chromatic slots: four hue families, each used twice at a
  clearly different lightness. This is a real ceiling of the theme, not a choice —
  extracting every `--dsw-static-*` value shows the theme publishes only four
  chromatic families (red 0°, amber 31-38°, green 142°, blue 212-226°) and no
  purple, magenta, cyan, teal, lime or pink token at all. Past four lanes a palette
  *must* reuse a family, and separating the repeat by lightness is the honest way to
  do it.
- The values were read out of the theme the running app actually ships, not out of
  the npm copy on disk. That copy is an older build with fewer tokens, which is why
  an earlier scan appeared to show `state-idle-primary` did not exist. Both a
  name-only fixture and a new value fixture now pin the palette, so a colour can be
  checked for being chromatic and legible rather than merely for existing.
- Measured defect found while doing this: the previous palette's
  `state-success-primary` (`#22c55e`) and `state-warn-primary` (`#f59e0b`) carried the
  light skin's white ink at **2.28:1** and **2.15:1**, both below the 3:1 graphical
  minimum. Those lanes' arrows and card badges were not reliably readable.
- The footer build identity is now `v0.2.3 · box-free-arrows+chromatic-lanes`.

## 0.2.2 — 2026-10-12

Five defects reported from live use of the panel. Each one was reproduced and
measured in a real browser before it was fixed; the measurements are quoted
below because three of the five had a root cause that did not look like the
symptom.

**Clicking a message icon did nothing (the body never opened)**

- The marker `<button>` computed to `pointer-events: none`: it inherited the
  value from the decorative `.dtg-layer`, which disables hit-testing for its
  children so the lane background, gridlines and bands never swallow a click.
  The marker is the one interactive child of that layer and had no re-enable, so
  **0 of 11 markers were hit-testable** — `elementFromPoint` at a marker's centre
  returned the lane-head button underneath it. Not a React problem, and not
  fixable in the marker's own handler: a CSS cascade defect that made a real
  `<button>` inert while it still looked and focused like a button.
- The marker now re-enables `pointer-events` and grows a transparent `::before`
  hit area outward, so the arrow's own centre still marks the exact instant the
  message happened (the layout positions it from the message's real time).
  Measured after: `8/8` markers hit-testable and clickable.

**Message markers froze in place and stacked up after zooming**

- A message is folded onto BOTH its sender's and its recipient's lane and keeps
  its `messageId`, but the marker key was the bare `messageId`. The same key
  therefore occurred twice in one `layout.messages` array; React logged
  `Encountered two children with the same key, msg:m2` and reconciled against a
  duplicate, leaving markers from an earlier layout pass on screen. The key is
  now lane-qualified (`<laneId>:<messageId>`) — the lane is part of a marker's
  identity regardless, since the same message paints and points differently per
  lane. The details view resolves the same key, and prefers the LAST lane that
  carries a message, matching the layout's own order.
- `visible` was computed in CONTENT space (`x + w >= 0 && x <= viewportWidth`)
  for message markers and density bands — contradicting the contract documented
  at the top of the module. Everything inside the first `viewportWidth` pixels of
  the canvas was therefore reported visible wherever the user had scrolled, and
  markers reappeared only once the scroll passed the viewport width. All four
  rect families (spans, task cards, markers, bands) now share one exported
  `rectVisible(viewX, …)` helper, so they cannot drift apart again.

**A task's bar was floored at a minimum width**

- The bar's width floor was `MIN_SPAN_PX` (2px), so at a coarse zoom a 1ms task
  and a 1.9s task both drew 2px: the chart told the reader they lasted the same.
  The floor is now a single device pixel with no other job than keeping a
  zero-width rect renderable, so the bar's length is its real duration and its
  left edge is always the task's real start. The activity spans keep their 2px
  floor: a span is an instant, a bar is a duration that a floor can distort.

**Hovering a task drew a colour bar across its middle**

- The duration bar sits at exactly the card's own position and is drawn under it,
  so an opaque card hides it completely. `:hover` replaced that opaque card
  background with `--dsw-alias-interactive-bg-hover`, which is **translucent**,
  and the bar showed straight through. Measured: with the pointer off the card
  the card region contained **zero** saturated pixels; with the pointer on it,
  rows 100–109 across the card's full width became solid `rgb(135,82,225)`.
  The hover tint is now painted as an inset shadow, which composes over the
  element's own background instead of replacing it, so the card stays opaque in
  both states. Measured after: hover changes the card to a uniform tint and the
  saturated rows are gone.

**Message markers redesigned**

- The disc is gone. Each marker is now the diagonal arrow itself: solid for a
  message this lane sent, hollow for one it received, so direction is carried by
  shape as well as by the counterpart's colour. The circle, and the plate around
  the glyph that made the two directions differ mainly by hue, were the visual
  noise the report called out.
- The footer build identity is now
  `v0.2.2 · arrow-icons+exact-bars+clickable`; read it to confirm which build is
  actually loaded.

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
