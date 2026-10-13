# Changelog

## 0.2.28 — 2026-10-13

**A working spinner in the lane head for currently active agents**

"现在我先对正在活动的 agent 在这里显示一下工作的状态，就好像 任务管理那个插件一样". The reference
plugin was identified rather than guessed: `dsh-turn-outline`, installed in the same profile, whose
shipped bundle renders `<span className="ttl-spin">{spinnerIcon()}</span>` with `@keyframes ttl-spin`
plus a no-animation variant. Our own `.dtg-spin` reproduces that pattern (11x11 ring,
`@keyframes dtg-spin`, and `@media (prefers-reduced-motion: reduce) { animation: none }`) — the code
was not copied.

The working signal is an existing field, not a new heuristic:
`lane.status === 'running' || 'provisioning' || any turn span with end === null`. `status` is the
contract's own member status and matches "正在活动的 agent" exactly; the unclosed turn span covers the
tick before the host refreshes the status. Deliberately NOT "has any span" (a finished lane is full of
spans and is idle). A lane whose span is unclosed is treated as working even if its status says idle —
an unclosed turn is direct evidence of work, and closing it is the host's job rather than something to
guess at on the client. `unassigned` gets no special case.

MEASURED at 480 / 420 / 300px on a 9-lane fixture with a running and an idle lane: 4 spinners and 5
static glyphs at every width, per-lane `animation-name: dtg-spin` / `duration 0.8s` for exactly the
running lanes and none for the idle ones, head row height unchanged at 72px, meta height 13px,
`scrollWidth === clientWidth` and `ellipsisedCount 0/9` — nothing new is truncated and no lane grew.
With `prefers-reduced-motion: reduce` emulated: `animation-name: none`, `duration 0s`, and the ring
still 11x11 and visible (static, not gone). The ring is drawn with a border token plus
`currentColor`, so it follows the same ink as the static glyph in both skins.

Recorded honestly: this is backed by browser measurement only, with NO regression lock. The spinner's
presence and its animation are DOM-observable, while the repo's element-tree tests use a React stub
(`useState` returns only the initial value, no effects) and so cannot see a computed
`animation-name`; pulling GanttChart.tsx into a unit test would need React render facilities the
project does not have. The suggested fix — extracting `laneIsWorking(lane)` into its own pure module
so a truth table can cover running/idle/provisioning/failed/open-turn/closed-turn — was NOT done
unilaterally and is left as a decision.

Also not measured: the dark skin (no dark demo), a lane whose status is idle while its span is
unclosed (the fixture has no such lane, so the branch is reasoned rather than exercised), and the
visual rotation itself (only the computed animation properties and the reduced-motion zeroing were
verified, not frame-by-frame angles).

The footer build identity is now `v0.2.28 · working-spinner`.

## 0.2.27 — 2026-10-13

**The lane head drops the status word, which also un-truncates the message count**

"「空闲」这个状态文本我觉得没必要了". The one-line head no longer spells out the status; the status
glyph beside the name pill carries it, and the status is still in BOTH the accessible name
(`aria-label: "lead，状态空闲，3 个任务，18 段活动, 打开该会话"`) and the tooltip, so nothing is lost to a
screen reader or a hover.

It also fixed a truncation the user was living with: the line used to read `空闲 · 5 任务 · …` because
its content was 97px in a 108px column (reported as a known limit in 0.2.26). Dropping the status word
took it to **62px / 62px with `scrollWidth === clientWidth`** and `ellipsisedCount 0/9` at 480 / 420 /
300px, so the message count is fully visible. Measured per width: text `3 任务 · ✉ 5`, 13px line at
11px font (the theme shim proving the font token resolves), all 9 status glyphs present.

No locale key became unused, and this was checked rather than assumed: the status word comes from
shell-provided text functions (`memberStatusText` / `taskStatusText`), not from this plugin's
dictionary, and `statusText()` itself is still used by the aria and title paths — so `labels.ts` is
untouched and zh/en parity (99 keys each) is unaffected. A heuristic scan for keys that never appear
as quoted literals turned up 12 candidates, but it is unreliable (`taskStatus_${status}` is
template-composed) and unrelated to this change, so nothing was deleted on the strength of it.

Still true and worth repeating: the line has 62px of 108px, so a much longer task or message count
will eventually ellipsise again — removing that possibility needs a wider `LANE_HEAD_WIDTH`, which
costs the same width from the timeline. Not done without a decision.

The footer build identity is now `v0.2.27 · no-status-word`.

## 0.2.26 — 2026-10-13

**Compact lanes: the head metadata on one line, and the lane trimmed to what the tracks need**

"现在每个泳道的间距我觉得可以做得紧凑一些，「状态，任务数量，消息数量」是不是可以变成一行，这样泳道图下方
就会留有这么多的空位".

The head's three text rows (空闲 / 5 Tasks / ≈ 313) are now ONE node joined with ` · ` (empty parts are
filtered, so a lane with no tasks or messages shows no stray separators), with the name pill and the
status glyph untouched, `nowrap` + ellipsis and explicit `font: var(--dsw-font-xxxs-11)`. Measured at
480 / 420 / 300px: `fontSize 11px`, `textH 13px`, `clientW 97 === scrollW 97`, `ellipsisedCount 0/9`.

The lane height is now what the tracks actually require, MEASURED rather than guessed: the deepest
absolutely-positioned child sits 67px below the lane top (transition rail; the task card bottom is 50,
the wait/turn band 27, the message track 14), so `DEFAULT_LANE_HEIGHT` went **92 -> 72** (67 + 5px
margin). The old 92 was really being held up by the four-row head; the one-line head needs ~46px, so
the larger of the two decides and the head is not clipped to win pixels. Measured before/after at
420px with 9 lanes: lane height 92 -> 72, **canvas 856 -> 676 (-180px)**, lane tops 0/92/184 ->
0/72/144, deepest child 67 -> 62 with `clippedLanes: 0`, neighbour gaps still [0] (no overlap), and
every component height UNCHANGED (task 20, message 11, wait 10, step 8, turn 10) — this is a spacing
change, not a scale change.

Two things worth recording from this round. The harness under /tmp had been wiped by the OS, so it
was rebuilt from the loading contract in docs/VALIDATION.md; rebuilding it surfaced a real trap: an
independent page has no DSH theme tokens, and `var(--dsw-font-xxxs-11)` then falls back to **16px**
rather than to nothing — which made the meta text measure 141px and look like the message count was
being ellipsised away. That was a harness artefact, not a product defect, and it was fixed with a
theme shim whose values come from tests/fixtures/dsw-theme-tokens.json. Second: the new lane height
and the one-line head are backed by browser measurement only, with no regression lock in the repo
(no existing lock referenced 92, so nothing needed re-basing).

Known limit, reported rather than silently accepted: the meta line fits with 97px of the head
column's 108px at 11px, so a longer status word or a much larger task count will start to ellipsise.
Widening `LANE_HEAD_WIDTH` would fix that by eating the same amount from the timeline — not done
without a decision.

The footer build identity is now `v0.2.26 · compact-lanes`.

## 0.2.25 — 2026-10-13

**Sixteen distinct agent colours, the filter menu clamped inside the panel, and honest task times**

**1 — palette: the Lead plus SIXTEEN teammate colours, cycling only after 16**

"现在 agent 的颜色有相同的，你起码要给出16种与 lead 不同颜色的预设色，超过了才能循环使用".
The palette was 7 composed hues, so the 8th lane repeated. Two independent sources of duplication were
found and both are fixed:
- the HOST palette was 7 entries (the cycle itself);
- the CLIENT had its own assignment rule — `1 + (hash(id) % (len - 2))` — which is not the host's rule
  at all. MEASURED before the fix on the real roster ids: **12 teammate lanes used only 4 distinct
  colours**, with collision groups `slot 3 = {host-data, shell, host-data-2, ui-2, synthetic-4}`,
  `slot 4 = {packaging, verify, docs, synthetic-2}`, `slot 1 = {ui, synthetic-3}` — and the structure,
  not luck, guaranteed it: the hash only ever covered `1..len-2`, so the LAST entry of the table was
  unreachable (a 17-entry table would have left `slot 16` spinning empty and only 15 colours for 16
  teammates). The client now uses the host's positional rule `slot = 1 + ((index - 1) % 16)`, measured
  after: lanes 0..16 are **17 distinct colours**, lane 17 == lane 1, and no lane 1..64 ever equals the
  Lead's colour.

The 16 teammate colours are composed with nested TWO-colour `color-mix` (never three: three-colour
mixes resolve incorrectly in the app's Chromium) over 8 deliberately UNEVENLY spaced hue anchors
(7.0 / 44.3 / 86.5 / 133.1 / 179.4 / 233.8 / 293.6 / 334.0 deg) because sRGB chroma collapses to
~0.09 in the yellow-green/cyan region and reaches ~0.22 in red, so an even 45-deg wheel cannot give
even perceptual spacing. Distinctness is established on three measured axes, not on "16 different
hexes": minimum pairwise OKLab dE **0.0714** (~3.5 JND), minimum adjacent dE in lane order **0.1832**
(~9 JND), minimum anchor hue gap **33.0 deg**, minimum within-anchor lightness step **0.0705**, and
every colour at least **27.2 deg / 0.147 dE** from the Lead. Contrast against the lane ink (static
white, which does not flip with the skin) is **>= 4.5:1 for all 17 in both skins**, worst **4.51** —
asserted 17 x 2 times, which is also what keeps the ink from regressing into a flipping alias (that
alias once measured 2.34:1).

The old `tests/host-integration.spec.ts` assertion `min(hue gaps) >= 25` was DELETED with an in-place
explanation rather than lowered: 17 entries cannot fit into 360 deg with a 25-deg gap (the ceiling is
~21.2 deg), and because the palette is 8 anchors x 2 lightness steps, two entries share a hue and the
measured gap is 0. Lowering it to 0 would have been a vacuous assertion; the distinctness claims now
live in tests/lane-color.spec.ts, which also permanently compares the client's fallback table against
the host palette element-by-element (order included) and asserts the two agreement on the same token
for indices 0..20.

Also fixed while there: `unassigned` used to pick `palette[length - 1]`, which in a 17-entry palette
is a TEAMMATE's colour; it now uses the reserved `--dsw-static-blue-800`, with a lock asserting it
matches no roster entry.

**2 — the Filter teammates menu is clamped inside the panel**

Screenshot showed the menu opened BELOW the toolbar and cut off by the panel's bottom edge. Root
cause measured: `clipBounds` walks up to the first clipping ancestor, and for the menu that is the
29px-tall toolbar, while the old positioning wrote the menu's `bottom` from the PANEL's bottom rather
than the TRIGGER's top (before: `menu top 672 / bottom 782`, `withinHost: false` on a 420px panel).
`clipBounds` gained a `scope: 'inner' | 'outer'` option (the menu takes the outermost clipping
ancestor = the panel; the popovers keep `inner`, and their behaviour was re-verified), flipping is
decided by real available space, and everything is positioned from `top` (a viewport-relative `bottom`
is what dragged the menu out of the panel). Measured at 900 / 600 / 420px panel heights: menu
`30/140/110`, `fullyVisibleInPanel: true` at all three, `.dtg-scroll` 311/248 unchanged while open.
Stated plainly: the menu can NEVER actually flip in this layout because the toolbar is the panel's
first row (above it there is no space); the correct behaviour there is clamping the height, which is
what ships. The flip branch was exercised only by injection and is NOT claimed as end-to-end verified.

**3 — the popover now shows created / started / ended and a LIVE duration**

"应该有创建，开始，结束三个时间，durations 如果不是在结束状态应该是开始时间到此时的时长，
如果是结束了，就是开始到结束的时长". The old popover labelled the last transition "finished" and
reported a fixed duration. Now, measured in the browser:
```
running : 创建 23:43:41 | 开始 23:48:41 | 结束 — 进行中（尚未结束） | 时长 11m 28s
finished: 创建 23:30:41 | 开始 23:32:41 | 结束 23:50:41 | 时长 18m 0s
```
with the end taken from the last `completed` (23:50:41, NOT the 23:38:21 `updated`), a duration that
genuinely grows with the clock (`11m 36s -> 11m 40s -> 11m 44s` over 8 real seconds), and a documented
fallback: a task that was never claimed uses `created` as its start and SAYS SO ("开始时间按创建计
（从未认领）") instead of silently picking a value or showing a dash that would leave it with no
duration at all. Ten new locks in tests/task-times.spec.ts; calibrated for teeth by re-installing the
old "last transition as the end, ignore status" defect, which turns five of them red.

The footer build identity is now `v0.2.25 · sixteen-hues`.

## 0.2.24 — 2026-10-12

**Regression fix: the time range was collapsing to 全部 — one clamp direction was reversed**

User report, right after 0.2.23: "现在筛选 tim range 页面没有任何变化". Reproduced with a SIX-HOUR
fixture (a session must be longer than the span for the range to be able to narrow anything — the
previous acceptance fixture was 30 minutes with a 1h span, so every range assertion passed for the
wrong reason):

| range | anchorMinAgo (0.2.23) | winStartMinAgo | durationMin |
|---|---|---|---|
| 1h | 60 | 360 | 361 |
| 30m | 30 | 360 | 361 |
| 15m | 15 | 360 | 361 |
| 全部 | null | 360 | 361 |

The anchor was computed correctly (60/30/15 minutes back) and then thrown away: 0.2.23 clamped it
with `Math.min(anchorStartMs, start)` — intended as "never later than the earliest datum", it
actually means "never LATER than the session start", so for any session longer than the span the
anchor was dragged back to the beginning and every range collapsed to 全部. The correct clamp is
`Math.max(anchorStartMs, start)`, the same direction the sliding-window path already used
(`Math.max(start, end - span)`).

After the fix, same 6h fixture: 1h -> 65min, 30m -> 35min, 15m -> 20min, 全部 -> 365min (each span
plus the grid allowance on the right). In the browser at range 1h / follow on / manual 1 s/px the
visible span is ~62min, 30m -> ~31min, 15m -> ~14.5min, 全部 -> ~397min, so the narrowing path is
genuinely exercised now.

The four criteria were re-measured in the user's state: the old task bar's screen x moves **0.00px**
across three ticks within a page (-2640.00 three times, then -2713.00 three times), `scrollLeft`
shows zero movement until the edge and then moves once by 73px = 0.294 viewport, and 全部 is
unaffected.

Two locks added to tests/layout.spec.ts on a SIX-HOUR fixture, with the fixture's own extent asserted
first (`dataExtent.start === 1000`) so that shortening it fails loudly rather than silently passing:
`1h`/`30m`/`15m` must each be narrower than the session and than each other, and the anchor must stay
pinned while `end` grows. Calibrated for teeth: restoring `Math.min` fails exactly two assertions
(`expected 21660000 to be less than 3720000`, `expected 1000 to be 18001000`).

The blind spot itself is now written down in the new describe's docblock — the earlier range tests
used fixtures shorter than any span, "so every assertion here passes for the wrong reason" — with an
instruction not to shorten it again. That is the process failure worth remembering: new locks were
added for the anchored window while the fixture that could have caught this was already too short.

The footer build identity is now `v0.2.24 · range-clamp-fix`.

## 0.2.23 — 2026-10-12

**The time range now anchors its left boundary (option A) — old content stops sliding**

The user's screenshots pinned the last unknown: footer `v0.2.22 · follow-latch` (so the client was
current), follow ON, zoom manual at 1 s/px, and **Time range = 1h**. The complaint survived 0.2.20 and
0.2.22 because those fixed the scroll policy and the scale — but with a range selected the window was
SLIDING (`[now - span, now]`), so its LEFT boundary advanced with the clock and every drawing was
pushed left on every tick. No scroll policy can fix a window that is itself moving.

Chosen by the user ("选 A"): selecting a range anchors the window's left boundary at that moment, and
from then on only the END grows with `now` — the range means "the width of the window when I chose
it", not "the last N hours". `全部` and follow-OFF are untouched. The anchor is re-taken when the range
changes, when follow is switched on, and when the viewport width changes; manual zoom does NOT
re-anchor (the window is in time, not pixels — re-anchoring on zoom would push the boundary the user
had just pinned).

MEASURED in the user's own state (range 1h, follow ON, manual 1 s/px):

| step | bar viewport x | nowViewX | scrollLeft |
|---|---|---|---|
| 0 | -487.03 | 186.88 | 1070 |
| 1 | -487.03 | 208.39 | 1070 |
| 2 | -487.03 | 208.39 | 1070 |
| 3 | -552.03 | 185.73 | **1135 (snap)** |
| 4 | -552.03 | 207.25 | 1135 |
| 5 | -552.03 | 228.77 | 1135 |
| 6 | -616.03 | 186.28 | **1199 (snap)** |

Within a page the bar's screen position moves **0.00px**, `scrollLeft` shows zero movement, and
`nowViewX` grows monotonically; at the edge the view moves ONCE by 65px / 64px = **0.262 / 0.258 of
the viewport** (~1/4), and the bar shifts by exactly that same amount — one discrete page step, which
is what the user asked for ("碰到边缘位置又再回到 3/4"). `全部` shows the same character with no
regression, and follow-OFF shows zero movement throughout.

STATED PLAINLY, because it is a real trade-off and not a defect: "old content never moves by a single
pixel" and "the window stays bounded" are mutually exclusive. The first implementation tried an
unbounded window with no gutter and the snap then fired on EVERY tick (`scrollLeft` advancing 21-22px
per step with `nowViewX` pinned at 247.6 of 248) — the failure was measured, not assumed. So the
window advances its anchor at the snap and drops the content that has left the view.

Also re-based, with data rather than a guess: `tests/waits-real-log.spec.ts` asserted every real wait
is under 600000ms as a "this must be a compaction re-append" heuristic, and this session's own log now
contains a **630789ms** wait — because a call that requested a 900000ms timeout waited 10.5 minutes.
Measured distribution: 48 closed waits from 2399ms to 630789ms, every one carrying its own
`timeoutMs`, and only 3 exceeding their own timeout — by 48 / 166 / 48ms of timer jitter. The rule is
now "a wait may not outlive its OWN requested timeout plus 60s slack" (falling back to a coarse 1-hour
bound only when no timeout is recorded), so the original intent — never let a compaction re-append be
mispaird into an over-long wait — is preserved. Calibrated for teeth: making the slack negative fails
immediately with `wait of 60982ms outlives its own 60000ms timeout`.

Not verified end to end: "still ±1px after re-selecting the range" (the re-anchor path is covered by
the anchor key and the truth table, but was not measured in the browser), and the continuous
second-scale animation (the clock was stepped and polled).

The footer build identity is now `v0.2.23 · anchored-window`.

## 0.2.22 — 2026-10-12

**Follow mode: the old content finally stays still — the scale was re-fitting every tick**

"现在还是时间推移向右时候，时间线一直停留在3/4 的位置，就是现在感觉的越新时间的内容覆盖了旧内容，但是我想要
的效果是，旧内容在时间线未去到最右边时候是不动的，时间线往右走".

0.2.20 fixed the SCROLL policy but the symptom persisted, and the running app was confirmed to be on
the new build (plugin installed 21:45:19, app started 21:46:46, hysteresis code present in the
installed client) — so the cause was elsewhere. The Lead's hypothesis, confirmed by measurement:

`effectiveMsPerPx = msPerPx ?? fitMsPerPx(win.durationMs, viewportWidth)` is recomputed on EVERY
render, and the window is `[earliest datum, now]`, so `durationMs` grows with the clock. In AUTO-FIT
mode the time scale therefore drifted upward on every tick and the whole drawing was RESCALED —
already-drawn content compressed leftwards while new time squeezed in. That is the "越新时间的内容
覆盖了旧内容" the user was describing.

MEASURED before, driving the clock forward 3 minutes per step, follow on, auto-fit:
`firstBarX 3.28 -> 3.16 -> 3.03 -> 3.03 -> 62.33 -> 60.25` (the old bar MOVED), `nowViewX` pinned at
186 with `scrollLeft` frozen at 62 — both symptoms reproduced. The same sweep with a MANUAL zoom
showed `firstBarX 75.30` constant and `nowViewX` advancing 186 -> 235 then snapping: manual zoom was
already correct, which is why the defect only ever appeared in the state the panel loads in.

FIX: latch the fitted scale while follow is on (`fitLatch`, keyed by viewport width + range filter).
The clock no longer re-fits; only turning follow on, resizing the viewport or changing the range
re-fits, and follow off clears the latch and restores per-render fitting.

MEASURED after, auto-fit, follow on: over 6 steps `firstBarX` stayed at **115.72 (drift 0.00px)**,
`nowViewX` advanced monotonically 186.09 -> 227.97, `scrollLeft` stayed at **435 with zero movement**,
and the canvas width grew linearly 683 -> 725. Run on to the edge, `scrollLeft` moved exactly once
(437 -> 504, i.e. **0.270 viewport**, the ~1/4 snap) and the bar never moved. Follow OFF still fits
every render (canvas width constant at 248 over five sample points), and a viewport-width change
re-fits as before.

TEST GAP, stated rather than hidden: the latch is React state + an effect, and the repository's locks
are pure-function locks (`layoutTimeline` / `shouldFollowScroll`), which cannot observe it — so this
correction is backed by browser measurement only, with no regression lock in the repo. Adding one
needs component-render test facilities the project does not currently have; worth deciding separately.

The footer build identity is now `v0.2.22 · follow-latch`.

## 0.2.21 — 2026-10-12

**The footer diagnostics block is gone from the UI**

"界面中这段内容不需要显示" — the 提示 line (unique message counts, per-lane copies, turn spans, runtime
injections) no longer renders at any width. The HOST contract is untouched: the payload still carries
`notes` (measured `notes.length === 3` with `noticeCount === 0`), this was a UI decision.

The block's only render site turned out to be BoardView.tsx, not GanttChart.tsx — the Lead's file list
was a guess and wrong, so the change had to land there; the task record says so rather than pretending
the scope held.

Two things the removal did NOT do, because measurement said they were not dead code: `.dtg-notice` is
still used by four other sites (error, failure, the message-truncated hint and an error sub-view) and
`notesLabel` is still used by the TaskDetails write-scope row. Deleting them would have broken three
other notices, so the count of CSS rules and label keys removed here is ZERO — reported as a deviation
from the task rather than done silently.

Measured in the same bundle, by re-inserting the removed block once and taking it out again:
`chart 767 / legend h46 / build bottom 813` after vs `chart 689 / notice h79` with it present — the
block was 79px, the legend's height is unchanged at 46, the build label still sits at the bottom, and
the chart GROWS into the freed space rather than being pushed. Same at 480 / 380 / 300px:
`noticeCount 0`, none of 提示 / unique message / runtime injections in the body, legend and build both
rendering, footer bottom constant.

No test needed changing: `grep -rn "dtg-notice" tests/` has no hits, so nothing ever asserted that the
block renders (the fixture's `notes: []` is data, not a render assertion).

The footer build identity is now `v0.2.21 · no-notice`.

## 0.2.20 — 2026-10-12

**Follow mode advances to the edge and then snaps back to 3/4 — it is a cycle, not a pin**

0.2.19 read the request as "keep `now` at 3/4 always" and pinned it there. The user corrected the
semantics: "他不是永远停在 3/4 位置，而是条到这个位置后，时间线往后推，推到边缘位置又再回到 3/4".
So: snap to 3/4, then do NOT scroll while time advances and let `now` drift right on its own, and only
when it REACHES the right edge snap it back to 3/4.

`shouldFollowScroll` is now a hysteresis rule — it returns a target ONLY once `now` has reached the
right edge (`nowViewX >= viewportWidth - 0.5`, the half-pixel tolerance being far smaller than the
~1/4-viewport jump it guards) and `null` (no scrolling at all) while `now` is inside the viewport. The
1/4 gutter is unchanged and still essential: without content beyond `now`, scrolling `now` back to 3/4
would lie beyond the scroll maximum.

MEASURED in the browser with the clock driven forward (the demo's own clock is too slow to watch): over
8 consecutive renders `scrollLeft` stayed at **693** with a per-render delta of 0 while `now`'s viewport
position drifted **185.63 → 220.98**, i.e. **0.7485 → 0.8910 of the viewport width** — the headroom being
eaten, which is exactly the behaviour 0.2.19 lacked. The snap then lands at the maximum scroll position
at both widths tested: viewport 348 → `nowViewX 261.02` against `3/4 x 348 = 261`, and viewport 168 →
`125.66` against `126`; the residual ≤0.34px is the browser rounding `scrollLeft` to an integer, since
the layout-level arithmetic `nowX - target` equals `3/4 x viewportWidth` exactly. The pure-function
truth table covers 0.60 / 0.99 vw → `null`, 1.00 vw / sub-pixel overflow / 2.00 vw → the snap target,
follow off → `null`, both clamps, and idempotence (a second call after the snap returns `null` instead
of re-writing the scroll).

The four 0.2.19 locks were RE-BASED, not deleted, and every one is reported old → new in the task
record; the ratio lock is untouched, and one stronger lock was added (follow off must not scroll even
in the state that would otherwise snap).

Recorded as not verified: the continuous animation at true second-scale time (the drift was sampled by
stepping a clock offset and polling), and the 适应窗口 button's interaction with follow, which does not
go through `shouldFollowScroll`.

The footer build identity is now `v0.2.20 · follow-snap`.

## 0.2.19 — 2026-10-12

**Follow mode keeps `now` at 3/4 of the viewport, with blank headroom to its right**

"跟随时间线情况下，如果时间线已经去到最右边了，应该自动延长空白部分，让时间线回到整屏的 3/4 位置（左边3
右边1）这样就不用一直贴着边往前".

`FOLLOW_GUTTER_RATIO = 1/4` adds a right gutter IN CONTENT PIXELS, produced by the layout (not a CSS
spacer, which the scroll arithmetic cannot see): `contentWidth = dataWidth + gutterPx`, with
`gutterPx = viewportWidth * RATIO` and ZERO when follow is off. `dataWidth` is never modified, so
`now` keeps its own x and an open task still ends exactly at the semantic end of data — the gutter is
pure headroom to the right.

MEASURED at 348 / 248 / 168 px viewports with follow on and the content scrolled fully right
(scrollLeft = contentWidth - viewportWidth):

| viewport | gutter | contentWidth | now's viewport x | viewport × 3/4 | task bars beyond now |
|---|---|---|---|---|---|
| 348 | 87 | 435 | **261** | **261** | 0 |
| 248 | 62 | 310 | **186** | **186** | 0 |
| 168 | 42 | 210 | **126** | **126** | 0 |

`now`'s x equals 3/4 of the viewport to the pixel, and every open task's right edge sits exactly
`0px` relative to `now` (closed tasks are negative) — so the headroom did not stretch any running
task into the future. The gutter is exactly `viewportWidth / 4` in all three cases.

The axis extends across the gutter (chosen over stopping at `now`: the headroom is future time, and a
label-free blank strip would be worse) — a right-side tick label now flips to the left of its line
with `.dtg-tick-label-flip`, because without it a label reached x=338 on a 310px canvas and was cut.

The gutter is deliberate scroll range now, so the numbers are stated rather than merely asserted: the
scroll maximum equals the gutter (87 / 62 / 42), and with follow OFF the content width returns to
`dataWidth` with no gutter at all. The lane background and gridlines still use `dataWidth` and draw
nothing inside it (measured lane background 248 == dataWidth, gridline max x 167).

The three new locks were ADDED to tests/layout.spec.ts; no existing assertion was modified
(`git diff tests/layout.spec.ts | grep '^-'` is empty), and all 86 previous locks still pass.

Recorded as not verified: the continuous behaviour of follow as `now` advances in real time — only
the static geometry at the end of the scroll range was measured; the scroll-target function itself
has a truth-table lock.

The footer build identity is now `v0.2.19 · follow-headroom`.

## 0.2.18 — 2026-10-12

**Toolbar labels stop wrapping when the panel is narrow**

"这里缩小后就文本换行了，修复一下" — at narrow widths `时间段` was breaking across two and then
three lines, so the toolbar row grew from 14px to 42px and the row looked broken.

MEASURED before the fix by sweeping `#host` width: the wrapping element was exactly one —
`.dtg-control-label` (时间段) with `white-space: normal` — at 480px it was 28px / 2 lines, and from
420px down it stayed 42px / 3 lines; every other label was already on one line but carried the same
`normal` value and the same latent risk, so all of them were fixed together. `.dtg-bar` is now a
horizontally scrollable row (`overflow-x: auto`, hidden scrollbar) whose children are
`flex: 0 0 auto`, and `.dtg-btn` / `.dtg-control-label` / `.dtg-select` are `nowrap`. No control is
hidden, no label is truncated, and no copy or behaviour changed (`git diff --stat labels.ts` empty).

MEASURED after: at 480 / 420 / 380 / 340 / 300px every label is ONE line (max 1), 时间段 went
42px → 14px, all 8 controls remain in the DOM, and at the narrowest width the toolbar scrolls
(508px of content) with the last control fully visible once scrolled. The toolbar's scroll range does
NOT leak into `.dtg-scroll` — checked as a control experiment at 300px with the bar hidden and shown:
`169/168` both ways, `barContributesToScrollContainer: false`.

Known trade-off, reported rather than papered over: the toolbar's intrinsic width is 508px, so at
panel widths below that it scrolls, which means the leftmost controls are not initially in view.
Tightening the padding/gaps would win ~20–30px and shortening the labels would need copy changes the
user has not asked for, so neither was done unilaterally.

The footer build identity is now `v0.2.18 · bar-nowrap`.

## 0.2.17 — 2026-10-12

**The hover popover shows the WHOLE title, plus start, end, status and duration**

"这个浮动的任务卡显示，就要完整显示标题，不能缩略了，显示完整标题，显示开始和结束时间、运行状态和运行
用时". The 0.2.15 single-line rules (`text-overflow: ellipsis` + `white-space: nowrap` on the
popover's title and meta) were exactly what the user was looking at, so they are gone: the title
WRAPS (`overflow-wrap: anywhere`) and the meta line is a wrapping flex row.

Measured on a deliberately long subject — the popover's title text is byte-equal to the first line
of the card's own `title` attribute (68 characters, `VERBATIM_EQUAL: true`, `text-overflow: clip`,
`white-space: normal`, 2 lines / 36px), and the meta carries all four facts as separate parts:
`创建 10-12 18:59:31` / `完成 10-12 19:20:31` / `已完成` / `时长 21m 0s`. The start/end/duration
values reuse the SAME `taskDurationLine(...)` the card's tooltip already used, so there is no second
formatting to drift; a live task with no end still reports `duration unknown` rather than inventing
one.

The popover keeps `max-height: 200px` and its clamp into the panel, but its overflow is now `auto`
so a title long enough to exceed the cap scrolls instead of being cut — measured `scrollHeight 98 ===
clientHeight 98`, i.e. the cap did not bite for a 2-line title. Description still does not appear
(`descriptionAbsent: true`) — the user asked for the title and the times, and the detail stays on
click. The label INSIDE the task box keeps its own truncation (measured `clientW 53 / scrollW 357`,
ellipsis) because that is a different surface and the user asked only about the popover.

The lock that asserted the old contract (title ellipsised, title + time only) was RE-BASED rather
than deleted, since it asserted the opposite of what is now required.

The footer build identity is now `v0.2.17 · popover-full`.

## 0.2.16 — 2026-10-12

**A filtered teammate's messages are hidden, not greyed — and the 活动+消息 toggle is gone**

**1 — "如果过滤掉的 teammate，收发信息的标识就不要打灰色了，直接隐藏就行了".** The grey turned out NOT
to be a `laneColorFor` fallback: measured `rgb(225,229,238)`, which is exactly
`--dsw-alias-label-dimmed`, reached through the "the peer resolves to no lane" branch
(`peerMatched === false` in `markerPaint`). Filtering is now done at the DATA layer instead: the pure
filter also drops each surviving lane's messages whose peer is a lane the user HID.

The distinction that had to survive: a peer that was NEVER in the roster (a finished member, another
team) is legitimate and stays drawn on the sender's lane — measured, after hiding all three
teammates, `markers 8 → 1` with `peers ["你"]` and `greys: 0`, while roster-outside peers are kept.

The first attempt at this was WRONG and the browser caught it: it only inspected `message.to`, so an
INCOMING reply whose sender was the hidden lane kept its grey marker. Both endpoints have to be
checked — a lane carries what it sends AND what it receives. Two regression locks were added for
exactly that (`drops a hidden peer even when its SESSION id differs from its LANE id`, and `drops a
message whose SENDER was hidden (an incoming reply)`), and they were calibrated for teeth: reverting
the implementation to compare only `message.to` makes precisely those two fail (13 passed / 2 failed),
and 15/15 pass restored.

**2 — "活动+消息这个开关感觉意义不大，取消这个功能吧".** The button, the `messageMode` state, its use in
the layout call and the three gated render sites are all gone; the activity track and the messages are
simply always drawn. The three labels (`messageModeBoth` / `messageModeMarkers` / `messageModeHint`)
were deleted from BOTH locales, leaving 95 keys in each. The old lock that asserted the gating was
REPLACED — not deleted — by one asserting the toggle and its labels can never come back, since a lock
written for a removed feature asserts the opposite of the code.

Leftover, deliberately not swept up here: `timeline-layout.ts` still accepts a `messageMode` option
and one verifier lock still exercises it, because that option is a property of the layout API and is
still true. Nothing in the UI passes it any more, so it is dead but not misleading — worth a small
cleanup round rather than a rushed one.

The footer build identity is now `v0.2.16 · filter-hides`.

## 0.2.15 — 2026-10-12

**A teammate filter, a toggle that finally does something, and a popover that fits**

**1 — "活动+消息" was doing nothing at all.** Reported as "点击这个，页面好像没有什么变化", and
the measurement agreed: the click changed NOTHING — `{step:3, turn:1, msg:8, wait:5}` before and
after. The code was consistent with that: `'both'` only excluded turn-kind entries from the
marker candidate set (folding them into a "+n"), while the turn/step ACTIVITY BARS never read
`messageMode` at all. So the label promised the activity bars and the code did nothing.

The toggle now hides the whole activity track: `{step:3, turn:1, msg:8, wait:5}` becomes
`{step:0, turn:0, msg:8, wait:0}`, restores exactly on the second click, and the label switches
between 活动+消息 and 只看消息. The message markers deliberately stay (that is what the label
says), and the wait band hides WITH the track because since 0.2.13 it shares that track and
coincides with the step bar — leaving it behind would draw a grey stripe in an empty row and make
the toggle look half-applied.

**2 — the hover popover now fits.** "悬停，看不完整，这里我觉得仅显示到标题和时间就够了，详细的点开来看".
`TaskPopoverBody` drops the description and keeps the title plus the time/status line
(measured: `156x17`, i.e. `设计面板布局 / 10-12 17:23:21 → 完成 10-12 17:40:21 · 已完成`). The full
detail is still one click away in the TaskDetails panel. A max height plus single-line ellipsis on
the title and meta means a long subject truncates instead of pushing the popover out of view.

**3 — the teammate filter.** "如果我筛选了某几个 teammate，甘特图里面内容就只显示这个几个 agent
的内容，包括 agent 列只保留选择的，泳道里面的内容，收发标识也仅展示该 teammate，但是 lead 是不能
筛选的，一定要显示的，默认情况下全选所有 teammate".

Implemented with ONE filtering point — `data.lanes` (and orphaned top-level tasks) are filtered in
BoardView before the chart sees them, so the lane-head column, the lane contents, the send/receive
markers, the waits and the legend counts all follow automatically and there is no second place to
keep in sync. The state is the HIDDEN set (empty = all shown), so a teammate who appears later is
visible by default. `lead` is pinned by `role === 'lead' || id === 'lead'` and cannot be hidden
even if its id reaches the hidden set; `unassigned` is deliberately filterable.

Measured with two teammates unchecked: lanes `["Lead","host-data","ui","verify"]` →
`["Lead","host-data"]`, messages 8 → 6, the button reads `筛选 teammate −2`, the lead row survives,
and `.dtg-scroll` stays 249/248 with the menu OPEN (the trap that has bitten this repo twice).

The pure filter lives in `src/client/ui/lane-filter.ts` with 9 locks (identity for an empty hidden
set, a hidden teammate disappearing with its tasks, a hidden LEAD still shown, `unassigned`
filterable, orphaned tasks dropped, unknown ids ignored, order preserved). `clipBounds` moved from
GanttChart into `src/client/ui/overlay-position.ts` so the new menu and both popovers share one
implementation instead of a second copy of a trap-prone helper.

The footer build identity is now `v0.2.15 · lane-filter`.

## 0.2.14 — 2026-10-12

**The grey wait band now paints ON TOP of the span it coincides with**

Reported immediately after 0.2.13 put the band on the activity track: "等待的灰色条应该在颜色条
的上层吧，现在这样看不清等待开始和结束在哪里". Coinciding was only half the request — the band
rendered BEFORE the span bars inside `.dtg-layer` and neither carried a z-index, so the span's
opaque fill covered the band entirely, caps included.

Fixed with a stacking order (`z-index: 2` on `.dtg-wait`) rather than by moving the JSX, so that
a future reorder of the layer's children cannot silently bury it again. It stays below the two
things it may never cover: the sticky axis (`z-index: 3`) and the lane heads (`z-index: 4`).

MEASURED, as a pixel A/B on the same page: a 17×10 crop of a band overlapping a span, with the
shipped CSS versus the same page with `z-index: auto` injected to reproduce the old order.

| sample | shipped (band on top) | simulated pre-fix (span on top) |
|---|---|---|
| centre | `(76,111,187)` washed | `(36,96,229)` raw span blue |
| left cap | `(26,60,135)` visible | `(36,96,229)` **invisible** |
| right cap | `(26,60,135)` visible | `(36,96,229)` **invisible** |

128 of 170 pixels differ, and both cap pixels read as the span's flat colour before the fix —
i.e. the start and end of the wait genuinely could not be seen. Two source locks now stand in
for that rendering property in `tests/wait-band.spec.ts` (the band's `z-index` with the axis and
heads above it, and the span bars carrying no `z-index` of their own).

A second stale comment was found and fixed here: the CSS block above `.dtg-wait` still said the
band was "drawn on the message row ... the opposite of the turn/step bars above it", which the
0.2.13 move had already made false (the `GanttChart.tsx` copy had been updated, the CSS one had
not).

Two process notes, because both cost time. The build guard rejected my first attempt at that
comment: I wrote element names in backticks inside the BOARD_CSS template, which is the exact
trap this repo has hit repeatedly; the guard printed the line and `deploy.sh` aborted before
writing a bundle, so no partial artifact was published. And `elementFromPoint` is NOT a valid
probe for paint order here — `.dtg-layer` is `pointer-events: none`, so hit-testing falls through
to the canvas and reports the wrong element regardless of which layer paints on top. Pixels
settle it; hit-testing does not.

The footer build identity is now `v0.2.14 · wait-above-span`.

## 0.2.13 — 2026-10-12

**1 — the message markers get the same hover popover as the task cards**

"鼠标悬停到发送和接收的 icon 也要像任务卡一样有悬浮框出现". The 0.2.12 popover was not copied:
`TaskPopover` became a shared `HoverPopover({ anchor, children })`, and the `title`-suspension
logic became a shared `useSuspendedTitle(element, open)` hook used by BOTH the cards and the
markers — so there is one popover implementation and one place that can forget to restore a
title (there is none: the restore lives in the effect cleanup).

The marker body reuses what the marker already knows (`messageSentTo` / `messageReceivedFrom`
for the route line, `preview` for the body) rather than re-deriving anything. Measured on the
built bundle: an outgoing marker reads `发出 → alpha · 10-12 14:27:21 · 消息内容 · lane 0 msg 10`
and an incoming one reads `收到 ← alpha · … · lane 0 msg 9`.

The invariants that cost this repo real time all still hold, re-measured with a marker popover
OPEN: `.dtg-scroll` stays 249/248 (identical to closed — the trap that twice inflated the scroll
box), the popover's parent is the chart and not the scroller, it is clamped into the panel, and
`title` follows rest -> absent -> restored-to-the-same-string across mouseleave AND focus->blur
with 160/160 markers carrying their title again afterwards.

**2 — the grey wait bar coincides with the span**

"我觉得等待的灰色条可以重合在 span，这样表达更清晰". `waitBandRects` moved from the message
track to the activity track: `y = laneY + ACTIVITY_TRACK_TOP`, `h = ACTIVITY_TRACK_HEIGHT`. The
band now covers the whole turn band with the 8px step bar centred inside it, so "this agent was
blocked right here" is drawn on the very interval it describes. Measured on a page with waits:
`wait {y: 96, h: 10}` against `step {y: 97, h: 8}` — a 1px offset, which is exactly
`(10 - 8) / 2`, on all five waits.

Only the vertical slice moved: the caps, the striped pattern, and the `open` / `timedOut` /
`unknown` classes are untouched, and the doc comment above the function — which argued the
OPPOSITE ("Deliberately not on the turn/step bars") — was rewritten to the new ruling instead of
being left contradicting the code.

**3 — the wait band's geometry is now guarded, which it never was**

`grep -rn 'waitBandRects\|MESSAGE_MARKER_TOP' tests/` used to return nothing: the band's
position had no test at all, which is how it could drift from the activity track to the message
track without anything going red. `tests/wait-band.spec.ts` adds 8 locks — the y and height for
several lane indices, coincidence with the same lane's turn band taken from `laneTracks()` (so
either side drifting fails), an explicit "NOT the message track" regression lock, the band
staying inside its own lane, and the unchanged window / clip / cull behaviour. Writing them
caught a real coordinate mistake in the test itself (`laneTracks()` returns absolute y, so adding
`laneY` again double-counted) — which is the point of a lock.

One label key was added for the popover body (`messagePopoverPreview`, zh + en, no existing key
touched).

The footer build identity is now `v0.2.13 · popover-everywhere`.

## 0.2.12 — 2026-10-12

Three requests from a screenshot of a real board, and one bug found while building them.

**1 — a box too narrow for text now shows "…"**

The user, pointing at a task card that rendered NO text at all: "对于这些一个文本都显示不出来的，
我觉得最少也要显示 「...」这样有内容". `TaskLabelPlacement` gained its third state, and the ladder
is now decided by one exported pure function, `taskLabelPlacement(anchor, w)`:

| box width | state | what is drawn |
|---|---|---|
| `w >= 36` (`TASK_LABEL_MIN_WIDTH`) | `'inside'` | the subject, CSS-truncated |
| `22 <= w < 36` (`TASK_LABEL_ELLIPSIS_MIN_WIDTH`) | `'ellipsis'` | a bare "…" |
| `w < 22` | `'none'` | nothing (a hairline cannot hold even the ellipsis) |

All three numbers are DERIVED from the card's padding in `styles.ts` (8px left + 6px right =
14px), so the text box is `w - 14` measured against an ~8px "…" and ~19px for one 11px glyph
plus it. Change the padding and the three numbers have to be re-derived; a live anchor (a 9px
marker with no duration) is always `'none'`.

**2 — the message row moved ABOVE the span row**

"信息收发显示的泳道放在 span 的泳道上面". `laneTracks()` now returns message -> activity -> task
instead of activity -> message -> task, with `MESSAGE_TRACK_TOP` and `ACTIVITY_TRACK_TOP` named
constants behind it. `TASK_CARD_TOP` is still 30 and every lane height is unchanged, because the
same terms are summed either way — the swap moves the two thin rows and nothing else. Measured
in the browser: message row y=82 < step span y=97 < task box y=109, in one lane.

**3 — sent and received arrows are one icon**

"发送和接收的箭头 icon 样式应该一致，现在发送略粗，接收比较细，统一一下". `ARROW_STROKE_SENT`
(3.4) and `ARROW_STROKE_RECEIVED` (2) are gone, replaced by a single `ARROW_STROKE = 2`, and
`ArrowIcon` no longer takes a `filled` prop at all — so the difference cannot be quietly added
back. Only the diagonal's aim distinguishes the directions now. The lock in
tests/message-paint.spec.ts was re-based to assert exactly that (it still guards the original
property: the direction cue does not depend on colour) and now fails if either old constant or
`filled={outgoing}` reappears. Measured: both arrows report `strokeWidth: 2px`, `fill: none`.

**4 — a hover popover with the whole title**

"鼠标悬停到任务卡时候，可以有个浮窗来完整显示任务的标题". The native `title` attribute is still
there at rest (it carries the status and the measured time range), but it cannot be styled and
has an OS delay, so a real popover now opens on hover AND on keyboard focus, showing the full
subject and description.

It was built wrong first and the measurement caught it: rendered inside `.dtg-canvas`, the
popover measured `right 618` against a `380` clipper and `elementFromPoint` on the overhang
returned `BODY` — **`position: fixed` does not escape an ancestor's `overflow: hidden`**. It now
renders as a SIBLING of `.dtg-scroll` (so it cannot join the scroll box's overflow, the trap that
once inflated `scrollWidth` from 248 to 399 and broke the follow toggle) and clamps itself into
the first really-clipping ancestor, found by walking up from the card. Re-measured with it open:
`scrollWidth 249 / clientWidth 248`, unchanged from closed; `clippedByClipper: 0`.

The native tooltip and the popover then overlapped each other, so while the popover is open the
`title` is temporarily removed and restored on every close path (mouseleave, blur, unmount),
while `aria-label` — which already carries subject and description — is present throughout.

**Recorded, still open**

- ❓25(a): a history task card that crosses the viewport's right edge disappeared entirely at a
  finer-than-fit zoom; unattributed, no code change, needs `scrollLeft` recorded alongside.
- ❓25(b): the axis tick labels DO create a ~24px horizontal scroll range at fit zoom, which
  contradicts two older claims in the ledger that they are clipped harmlessly.

The footer build identity is now `v0.2.12 · popover-ellipsis`.

## 0.2.11 — 2026-10-12

Four more real-screen requests, and the label finally stops leaving the box.

**1 — the finest manual zoom is 1 s/px**

"最小时间粒度改成 1s 吧" moved `MIN_ZOOM_MS_PER_PX` from 5 s to 1 s. The structure that made the
number safe to move is unchanged and is what the tests lock: two separate floors
(`MIN_MS_PER_PX = 50` is only the sanity clamp), the fit path exempt in BOTH directions, and
`clampZoomMsPerPx(value, current)` never letting a zoom-IN click from a sub-floor fit jump
backwards. The number has now moved twice, so the tests assert the relationships rather than
the constant.

**2 — the label lives inside the box, or not at all**

"还是出现图中文字在任务条外的情况", then, asked how far to go: "只在条内画，装不下就较少显示的
文本". So the outside caption is GONE — `TaskLabelPlacement` is now `'inside' | 'none'`, and
`TASK_CHIP_GAP` / `TASK_CHIP_WIDTH` / `TASK_CHIP_INSIDE_MIN_WIDTH` / `TASK_CHIP_MIN_SIDE_WIDTH`
are deleted with it. A history-anchored box at least `TASK_LABEL_MIN_WIDTH = 36` px wide draws
its subject inside and the renderer truncates with CSS ellipsis; below that the layout emits
`'none'` (`labelW === 0`) because there is not room for the ellipsis itself, and `title` /
`aria-label` still carry subject and description.

36 is derived, not chosen: the card's padding is 8px + 6px, so the text box is `w - 14`; one
11px glyph plus an ~8px ellipsis needs 19px, i.e. `w >= 33`. Below that the browser clips a
glyph in half — the exact artefact the user had now reported twice.

The deleted machinery was not stupid: the outside caption existed so a SHORT task could still be
named, and two measured defects came with it (a caption at the canvas edge reached 151px past it
and inflated `scrollWidth` 248 → 399, and at a coarse zoom all twelve captions collapsed into one
18.1px column). Removing the placement deletes both failure modes instead of constraining them.

Measured on the built bundle (12 task boxes at 44 s/px): `.dtg-task-caption` 0,
`.dtg-task-outside` 0, placements only `['inside','none']`, every `'none'` box has no subject
child (8/8), and an `'inside'` box measured `subClient 22` vs `subScroll 65` — the ellipsis path
is genuinely engaged. `.dtg-scroll` scrollWidth 249 vs clientWidth 248: the phantom horizontal
scroll has not come back.

**3 — the task box is no longer filled with the agent colour**

"任务条背景颜色不要用跟 agent 的颜色，用回之前那种看图2". `00e58a6` had replaced the earlier
"thin agent-coloured bar + neutral label card with a 3px agent-coloured left edge" with ONE box
filled solid in the lane identity colour. The one-box geometry (length = duration) is what the
user asked for and it stays; the PAINT goes back to the pre-`00e58a6` card: fill
`var(--dsw-alias-bg-layer-2)`, 1px `var(--dsw-alias-border-l2)` border, `border-left-width: 3px`
coloured by the agent, radius 4px, ink `var(--dsw-alias-label-primary)`, padding
`2px 6px 2px 8px`.

Measured: all 12 boxes share ONE background (`rgb(255,255,255)` in the Light skin, i.e. the
theme's `bg-layer-2` — no lane colour among them) while the left edges resolve to four different
lane colours (`rgb(37,99,235)` / `rgb(236,19,19)` / `rgb(221,134,41)` / `rgb(34,197,94)`), all at
exactly 3px. Every box measured 20px tall — `.dtg-root *` is `box-sizing: border-box`, so the new
1px border and the padding stay inside the bar height instead of overflowing their track.

**4 — a better README feature image**

`docs/screenshots/panel-v3.png` is replaced by a high-DPI capture of the real panel with the
recent rounds of fixes visible.

**Recorded, not fixed**

- The zoom readout prints whole seconds at >= 1 s/px (`toFixed(msPerPx < 1000 ? 2 : 0)`), so two
  DIFFERENT zooms can read the same text: measured "2 秒/像素" at both 1614 and 2421 ms/px. That
  makes "click until the readout stops changing" an unsound acceptance method — the verifier
  caught it while checking the new floor and switched to fixed click counts plus a scrollWidth
  cross-check. Worth a look next round: the readout is not lying about the layout, only about
  its own precision.
- ❓24 (a message at exactly `range.end` is culled on a frozen board, silently) is still open.

The footer build identity is now `v0.2.11 · label-in-box`.

## 0.2.10 — 2026-10-12

**The manual zoom stops at 5 s/px, and 适应窗口 is deliberately left free**

The user's rule: "时间粒度，最少的只需要去到 5 秒就行". Asked which of the panel's two
granularities that meant, they chose the manual zoom floor, and chose that it constrains
the manual zoom ONLY.

- `MIN_ZOOM_MS_PER_PX = 5 * SECOND_MS` is a new constant, and `clampZoomMsPerPx(value,
  current)` is the new clamp on the manual-zoom path (`applyZoom`, reached by both zoom
  buttons and ctrl+wheel). Zooming in now stops at 5 秒/像素; before this it went to
  `MIN_MS_PER_PX = 50` (0.05 秒/像素).
- It is a SEPARATE constant from `MIN_MS_PER_PX` on purpose, because `clampMsPerPx` — the
  function that used to serve the manual zoom — is shared by `fitMsPerPx` AND
  `layoutTimeline`'s own input sanitisation. Raising that single floor would have clamped
  适应窗口 as well, and the measured consequence is not subtle: a 5-minute range on a 248px
  canvas fits at ~1.2 s/px, so a clamped fit would draw 300s ÷ 5s = **60px of content
  inside a 248px canvas**, stranding the chart in the left quarter. Locked by test:
  `fitMsPerPx(5 * MINUTE_MS, 248)` must stay below the manual floor and `layoutTimeline`
  must keep it, with `dataWidth ≈ 248`.
- The floor is the FINER of the 5 s/px limit and the zoom currently on screen. Without
  that, a zoom-in click from a fitted 1.2 s/px (a 5m range) would snap to 5 s/px — the
  reader asks to move closer and the chart jumps 4x AWAY. With it, that click clamps onto
  the current value and `applyZoom`'s `next === effectiveMsPerPx` guard makes it a no-op;
  zooming out from there is unaffected.

The footer build identity is now `v0.2.10 · zoom-floor-5s`.

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
