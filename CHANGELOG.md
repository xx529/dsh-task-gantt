# Changelog

## 0.2.9 — 2026-10-12

**Four defects the time-range filter exposed — and one it still hides**

All four were reported against the panel after 0.2.7 shipped the range filter. The first two
turned out to be ONE cause.

**1 + 2 — the phantom mark at the start of the timeline, and the "+n" that ballooned**

- The message layer was the only part of the layout that never asked `inWindow()` before
  drawing (`spanRect` and `taskCardRect` both do). A marker's x is
  `(clamp(time, win.start, win.end) - win.start) / msPerPx`, so a message OLDER than the selected
  range was never dropped — it was clamped onto the window's left edge and drawn there.
  Measured on a 4-lane / 3-hour fixture (180 messages per lane, 248px viewport):
  **8 markers with a left edge of exactly 0 at the 15-minute range, against 0 at 全部**.
- `droppedBefore` ran over the lane's WHOLE list too, so the badge counted the omission of
  messages the reader had explicitly filtered OUT: **"+163" at 15m against "+6" at 全部**.
- The fix scopes the CANDIDATE LIST (not the output) to `[win.start, win.end]` — which also
  makes the pixel budget honest, since `decimateMarkers` is handed the WINDOW's width. The
  density band is deliberately left at the lane's true extent and is only skipped when the
  window does not touch it at all: "this lane was talking from here to there" is the fact the
  strip carries, and its tooltip names the true endpoints.
- Verified after: 15m → 60 markers, **0 at the left edge**, **0 badges**; 全部 → byte-identical
  to before (160 markers, 76 badges all "+6"). Calibrated in reverse: putting the whole list
  back makes the three new tests fail with `marker at 1000000 is outside [4000000, 4600000]`,
  `expected 69 to be 19`, and one clamped stub back on the all-before lane.
- The legend now reads "…（当前时间段内）" because its denominator is the SELECTED RANGE —
  measured "12/60 条消息已绘制（当前时间段内）" where it used to divide by 720, the whole log.

**3 — a task caption that cannot be read is no longer drawn**

- At the coarsest zoom (600 s/px) over a 3-hour log the content is `3h / 600s = 18px` wide, and
  `taskCardRect`'s last-resort branch ("no side has room, so clamp inside the canvas") clamped
  all **12 captions into that same 18.1px column with 45–71px of text inside each** — twelve
  one-character fragments at one x.
- `TaskCardRect.labelPlacement` gained a fourth case, `'none'`, and `TaskLabelPlacement` is now
  exported as a named type: when the whole canvas is narrower than `TASK_CHIP_MIN_SIDE_WIDTH`,
  no label is emitted at all. The box, its `title`/`aria-label` and its click target are
  untouched (verified: at 600 s/px, 0 captions, 12 boxes still titled 长任务 0 …).
- A canvas that is narrow but still ≥ 48px keeps the old clamp, because that behaviour is what
  stopped a 148px caption from inflating `scrollWidth` from 248 to 399.

**4 — the 「实时」 badge is gone**

- The growing box already says "still elapsing" with a dashed right cap; the badge repeated it
  in words on every open task (measured: 4 of them). Removed, together with the
  `.dtg-task-flag` CSS rule and the now-unused `liveBadge` string in BOTH locales. The
  accessible name still says 实时态, so nothing is lost to a screen reader.

**Found while verifying, and NOT fixed: the last message of a frozen run is invisible**

- A message at exactly `win.end` passes `inWindow` (both ends are closed) but lands at
  `viewX === viewportWidth`, and `rectVisible` is strict on the right (`viewX < viewportWidth`),
  so with `cull: true` it is dropped — and it is neither drawn nor thinned, so neither the
  legend nor a badge mentions it. Measured on a frozen board filtered to 15m: 45 markers,
  minutes 165..179 present, **180 absent**, empty legend.
- This is PRE-EXISTING, and narrower than the two above: a live board heals itself as the clock
  advances, so only a frozen board puts the last event out of reach permanently. It is recorded
  as a standing `❓` in docs/VALIDATION.md rather than papered over, because every candidate fix
  trades against a stronger invariant (`contentWidth` slack would move the phantom-scroll and
  follow behaviour; shifting the edge marker would break "a marker is never moved off its own
  time").

The footer build identity is now `v0.2.9 · range-scoped-messages`.

## 0.2.8 — 2026-10-12

**A dark-skin defect that had been invisible because there was no dark demo**

- Found while closing the standing ❓ "the dark-skin token values were never measured on a
  live page". The way in was already in the tree: the demo's theme sheet carries BOTH skins
  (`:root` from the shipped theme plus a `[data-ds-dark-theme]` override), so setting that
  attribute renders with the theme's REAL dark values rather than an approximation. The
  measured values confirm every value the verification track had DERIVED
  (`label-secondary` #cfd3d6, `label-primary` #f9fafb, `label-primary-inverted` #353638,
  `bg-layer-1` #232324).
- **The defect**: the lane NAME pill and the task box used
  `--dsw-alias-label-primary-inverted` as their ink. That alias FLIPS with the skin — white
  in the light one, `#353638` in the dark one — and all seven lane fills are saturated and
  dark-ish in BOTH skins, so their text has to be light in both. Measured: `#353638` on
  `--dsw-static-blue-600` is **2.34:1**, i.e. dark grey on blue, on the two elements that
  identify a lane and its task.
- **The fix**: the ink on a saturated fill is now `--dsw-static-neutral-bluish-00`, a
  STATIC white that does not flip. All seven fills clear 4.5:1 against white in both skins
  (5.17 / 7.05 / 4.56 / 4.52 / 4.55 / 4.51 / 4.51). Two places had also hardcoded an ink
  and are fixed: `styles.ts`'s `.dtg-head-name` wrote the flipping alias directly (so it
  never used the payload's `on` at all), and `LaneHead` inlined only `background` and not
  `color`. Fill and ink now both come from the payload.
- **Why the existing test missed it**: the palette test asserted each fill against a literal
  `#ffffff`. The FILLS were fine; the INK was not, so that assertion stayed green through
  the whole thing. It now resolves the CONFIGURED ink in BOTH skins and asserts 4.5:1.
  Calibrated in reverse: restoring the old alias makes it fail with
  `is only 2.34:1 in the dark skin`, and restoring the fix makes it pass.
- Verified in a real browser on the dark skin: name pill `rgb(37,99,235)` with
  `rgb(255,255,255)` text, task box likewise, wait band `rgb(173,178,184)`, arrows red.

Also: the standing `❓` ledger in docs/VALIDATION.md had two entries that had gone STALE
against the code — the palette was described as five tokens with a wrap-around (it is now
seven composed hues) and the label placement as two cases (it now has three, plus a
side-width floor). Both are marked as superseded with a pointer to the section that
replaced them, rather than quietly rewritten.

The footer build identity is now `v0.2.8 · skin-safe-lane-ink`.

## 0.2.7 — 2026-10-12

Three additions, and the two defects that measuring them turned up.

**A time-range filter: 全部 / 5m / 15m / 30m / 1h / 3h**

- Expressed as ONE number on the window (`windowSpanMs`), not as a pass over the rects
  in the renderer: every downstream position is already relative to the window's start,
  so the axis, the bars, the markers, the waits and the ticks are filtered by the same
  decision and cannot disagree about what is in range.
- The window's END is deliberately untouched. For a live board it is still `now`, which
  is what lets the follow toggle keep working while a range is selected; for a frozen
  board it is still the last datum, so filtering cannot make a stopped chart creep.
- A range WIDER than the log is clamped to the log's own start, so "3 hours" on a
  two-minute session shows those two minutes rather than an hour of empty axis.
- Selecting a range re-fits the zoom, so the chosen span fills the panel instead of
  becoming a 41px sliver of it (measured before the fix: 5 minutes drawn 41px wide on a
  248px canvas).

**A follow toggle: does the view keep up with the clock**

- On, the scroller is moved so the NOW line stays at the viewport's right edge; off, it
  is never touched. Verified end-to-end on a LIVE page: with it on, `scrollLeft` went
  0 → 317 = maxScroll; with it off, it stayed at exactly 100 across seven seconds while
  the clock advanced and the content grew.
- Manual scrolling never flips the toggle: the callback does not write back, so there is
  no "parent writes, child reports, parent writes again" loop.

**`wait_agent` blocks, drawn on the message row**

- A wait is time an agent spent blocked on its peers rather than working, so it is its
  own fold (`foldWaitSpans`) rather than being folded into the activity spans or the
  messages. Both ends are drawn, with a distinct cap at each: a start tick and an end
  tick, and an end that is absent for a wait that is still blocking.
- Three outcomes are kept apart, because they mean different things: `timedOut: true`
  (waited out the timeout, nobody came), `false` (a peer woke it), and ABSENT (the result
  could not be read — never collapsed to `false`, which would be the positive claim
  "someone arrived").
- Measured on a real session log: 24 `wait_agent` calls, 24 paired, 2.4s to 300s, 3
  timeouts and 21 wakes.

**Two defects found by measuring the above**

- **A wait was paired with the wrong result.** On real data every `wait_agent` call
  carries TWO results: the real one, and a much later re-append from the compaction
  machinery whose body is `[dsh-jev-compaction] Historical tool output pruned…`. Keeping
  the LAST gave all 24 waits a duration of 15 minutes to 21 hours and lost every
  outcome — and looked perfectly reasonable against hand-built fixtures. The earliest
  result is when the call actually returned. There is now a test that runs against a real
  log when the machine has one, and skips VISIBLY when it does not.
- **A task label could overflow the canvas by 151px.** The borderless caption added in
  0.2.6 started just past its box, so for a task at the right edge it reached past the
  canvas. An absolutely-positioned descendant contributes to its scroll container's
  scrollable overflow, so this did not merely look wrong: `scrollWidth` went 248 → 399,
  giving the panel a phantom horizontal scroll range that also defeated the follow
  toggle. Labels now flip to the OTHER SIDE of the box when there is no room, and their
  width is clamped to the room that side has, so no label can leave the canvas.
- Related, and the same class of defect: a task or activity span that lay WHOLLY outside
  the selected range was still drawn, because clamping an out-of-range rect into the
  window produces a plausible stub at x=0 rather than something obviously wrong. With a
  5-minute filter over a 30-minute log, a task that had ended 14 minutes earlier was
  still a 10px box on the left edge. Out-of-range rects are now dropped; a rect that
  merely STARTS before the window is kept and flagged `clippedLeft`.

The footer build identity is now `v0.2.7 · range+follow+waits`.

## 0.2.6 — 2026-10-12

Four issues from the first look at the panel in the real app.

**A task's box is now exactly its duration, with no fixed minimum**

- There were TWO objects per task: a thin bar whose length was the real elapsed time, and
  a 36px card at a FIXED 148px that held the label. The user read the fixed one as "the
  task" and reported the consequence: "任务框的长度应该是按实际时间线来，而不是有个最小固定长度
  大小（这样意义上不合理）". They were right — a 5-second task and a 5-minute task drew the
  same 148px box, so the box carried no information and directly contradicted the bar
  beside it.
- There is now ONE element per task: a box whose LENGTH is the duration and which holds
  the label. Its fill is the lane's identity colour with the lane's own `on` ink — the
  same treatment the lane NAME gets, so "the coloured box is the task" is one idea instead
  of two.
- When the box is too narrow to hold its label, the label hangs outside as plain
  TEXT — no background, no border — so the only bordered rectangle on a task row is the
  one whose length means something.
- A task with no dated history has no duration at all, so it draws a small fixed marker
  rather than a width that would misrepresent nothing: there is nothing to be honest
  about, and a 1px marker was invisible.

**An unfinished task keeps growing, to NOW**

- A task that is `pending` or `in_progress` has a duration that is still elapsing, so its
  box runs from its creation to `now` and grows on every render. Its right edge is drawn
  dashed, because that end is not a fact yet.
- It used to draw `max(history.time)` — and for a task whose only event so far IS the
  creation, that is the creation itself, so an open task was a 1px mark and the chart said
  it had lasted no time. The user: "当任务未完成时候，应该是跟随时间线不停拖动拉长任务框，
  这样才代表任务进行中".
- `win.end` is `now` for a live window, so the layout still reads no clock of its own and
  a frozen window never grows. Verified in a real browser: the open box's right edge is
  exactly the NOW line (measured offset 0px) and the completed boxes keep their measured
  lengths (140px and 91px for different durations).

**The lane's role badge is gone**

- It was a bordered chip printing the role, and for the Lead it printed "Lead" directly
  under a name pill that already said the same word: "下面多了一个白色框+ agent名称，这个已经
  是多余的了". Removing it also returned 16px to a head column that had zero margin. The
  role still reaches the user through the row's tooltip and accessible name.

**The human's prompt is a speech bubble**

- It was a punched-out white disc with a two-tone ring and an arrow inside — which the
  user described exactly: "变成一个白色框黑心的东西". Three shapes competing in 11px, and
  the dark glyph in the white ring said nothing about who spoke.
- It is now a single outlined bubble, in the panel's own primary ink with the same surface
  halo every other marker carries, so it is readable over any lane colour in either skin
  and cannot be confused with the arrows that mean "this lane sent / received".

The footer build identity is now `v0.2.6 · duration-box+growing-tasks`.

## 0.2.5 — 2026-10-12

Four requests from using the panel on a real screen: mark each task's state changes,
give every agent a distinct colour, make the agent NAME carry that colour, and stop
truncating the lane's facts.

**Each task now marks its own transitions (创建 / 认领 / 完成, and the rest)**

- The task's `history` already carried every dated transition; the chart simply was not
  drawing them, so this needed no new host data. Each event is drawn at its OWN time
  scaled by the same `msPerPx` as the bar, so a mark reads against the bar's length —
  "claimed a third of the way in" is a fact, not an impression.
- The rail hangs UNDER the bar rather than on it: `TASK_BAR_HEIGHT` is the one
  measurement on this chart that must stay exactly proportional, and glyphs over a 10px
  bar would either cover it or force it taller.
- Glyphs reuse the vocabulary the panel already teaches (`▶` is "in progress", `✓` is
  "completed"), and the words come from `historyActionText` — the SAME vocabulary the
  details panel prints, so the legend cannot drift from the marks it explains.
- Two events at the same instant get a 1px stagger, so a create-then-immediately-claim
  burst shows as two marks instead of one hiding the other.
- The marks carry an `aria-label` (through the shared `taskEventAria` template) rather
  than `aria-hidden`: they are information, not decoration.
- A task's LAST transition is by definition at the bar's right edge, which is exactly
  where an outside label chip begins — so the completed mark was painted under the chip
  and vanished. Lifted above it with a hairline of the chip's own surface behind it.

**Every agent has its own colour: 红橙黄绿青蓝紫, with the Lead fixed to blue**

- The theme publishes only FOUR chromatic families (red 0°, amber 31-38°, green 142°,
  blue 212-226°) and no cyan or purple token at all — so the seven requested hues are
  composed from it with `color-mix()`, which is the theme's own idiom
  (`--dsw-alias-interactive-bg-hover` is itself a `color-mix()`). Nothing here is a
  literal colour.
- A vivid yellow cannot carry white text in sRGB (white needs ~4.5:1, which at hue 60
  forces a dark olive), and neither can the theme's green or amber. Each hue is darkened
  by the LEAST amount that lets white text clear 4.5:1. Measured result: hues
  0° / 31° / 61° / 143° / 182° / 221° / 307°, all between 4.51:1 and 7.05:1 with white.
- The Lead is pinned to blue and is never handed to a teammate; the other six hues plus a
  wrap cover the roster.

**The agent's NAME carries the colour, not a hairline**

- The identity colour was a 2px border on the row's left edge, which read as a hairline.
  It is now the name's own background with white text, set inline because the stylesheet
  must stay free of literal paint (the theme scan enforces that).

**The lane's facts are one per line, and nothing is truncating them**

- They were four items in one flex row, so `text-overflow: ellipsis` ate the tail —
  the user's "状态显示不完整 … 后面就 ... 省略号了". The meta block is now a column, and
  the ellipsis is gone: text wraps instead of being silently cut.
- That needed more vertical room: measured, the head column needs 90px, and at the old
  `DEFAULT_LANE_HEIGHT = 84` the last row was clipped (`clientHeight 83` vs
  `scrollHeight 86`). Raised to 92, and the role row's `border` became a non-layout
  inset ring so its row is 14px instead of 16px. Now 91px of content in 91px of room.

The footer build identity is now `v0.2.5 · seven-hues+event-marks`.

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
