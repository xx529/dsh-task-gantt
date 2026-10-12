/**
 * Component stylesheet of the Gantt board, kept as a TS string because the
 * client bundle emits no CSS file (see `scripts/build.mjs`) — the board injects
 * it once into `<head>` under `STYLE_ELEMENT_ID`.
 *
 * Skin contract (/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md §12):
 * every colour resolves to a `--dsw-alias-*` token, a `currentColor`, or
 * `transparent`; type resolves to `--dsw-font-*`; the panel surface is
 * `--dsw-alias-bg-layer-1` (never `--dsw-specific-sidebar-fill`); interactive
 * chrome declares `-webkit-app-region: no-drag`. No literal colour appears in
 * this string — a translucent tint is expressed with `opacity` on a token
 * background instead of an alpha literal, so a skin swap repaints everything.
 */

export const STYLE_ELEMENT_ID = 'dsh-task-gantt-ui-style'

/** The board's CSS, tokens only. */
export const BOARD_CSS = `
.dtg-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12);
  -webkit-app-region: no-drag;
}
.dtg-root *, .dtg-root *::before, .dtg-root *::after { box-sizing: border-box; }

/* --- control bar ------------------------------------------------------- */
.dtg-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  min-width: 0;
  padding: 4px 6px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  -webkit-app-region: no-drag;
}
.dtg-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dtg-chip-live {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-brand-primary);
}
.dtg-chip-warn { color: var(--dsw-alias-state-warn-primary); border-color: var(--dsw-alias-state-warn-primary); }
.dtg-chip-error { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dtg-spacer { flex: 1 1 auto; min-width: 0; }
.dtg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.dtg-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dtg-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-btn[aria-pressed='true'] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); }
.dtg-zoom-readout { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); white-space: nowrap; }

/* --- chart frame ------------------------------------------------------- */
.dtg-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  position: relative;
}
.dtg-heads {
  flex: 0 0 auto;
  overflow: hidden;
  border-right: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  z-index: 4;
}
.dtg-heads-inner { will-change: transform; }
.dtg-head-corner {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dtg-head-row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 3px 6px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  overflow: hidden;
}
.dtg-head-row-idle { opacity: 0.72; }
.dtg-head-top { display: flex; align-items: center; gap: 4px; min-width: 0; }
/* The agent's identity is a PILL around the name, not a hairline stripe: a 2px
   left border was too easy to miss (the user's words: "a very narrow stripe, not
   obvious"). The background is supplied INLINE by the renderer from the lane's
   own colour token, so this rule only owns the SHAPE and the ink — never a
   colour value, which would break the theme contract. */
.dtg-head-name {
  min-width: 0;
  flex: 1 1 auto;
  display: inline-block;
  max-width: 100%;
  padding: 1px 6px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxs-strong-12);
  /* A FALLBACK only — the real ink arrives INLINE from LaneColorTokens.on.
     A saturated lane fill needs the same light ink in both skins, and every theme alias
     that means "text on a fill" flips with the theme: the label-primary-inverted token is
     white in the light skin and a dark grey (fifty-three, fifty-four, fifty-six) in the
     dark one, which measured 2.34:1 on the blue fill — dark grey on blue. The static white
     does not flip, so it is both the ink the host sends and this default. */
  color: var(--dsw-static-neutral-bluish-00);
}
/* One fact per line. As a single flex row, role + status + task count + message
   count were squeezed into one line and then cut with an ellipsis, so the user
   could not read their own agent's state. Stacking them is the fix; the lane's
   height budget is accounted for in the geometry notes. */
.dtg-head-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 1px;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
/* Deliberately NOT ellipsised: wrapping a short state word onto a second line
   keeps it readable, whereas an ellipsis hides information the user asked for.
   overflow-wrap keeps a long unbroken token (a model name) inside the lane. */
.dtg-head-meta-text { white-space: normal; overflow-wrap: anywhere; }
/* NOTE: there is deliberately no .dtg-head-role rule. The role badge was removed —
   for the Lead it printed the same word as the name pill directly beneath it (the
   user's "下面多了一个白色框+ agent名称，这个已经是多余的了"), and removing it also
   returned 16px to a head column that had zero margin. The role still reaches the
   user through the row's tooltip and accessible name. */

/* Status ink: the dot and the glyph take currentColor, so the colour rule
 * below is the single source of the status colour (never colour alone — the
 * row always carries the status WORD next to the dot too). */
.dtg-ink { color: var(--dsw-alias-label-tertiary); }
.dtg-ink-running { color: var(--dsw-alias-state-success-primary); }
.dtg-ink-idle { color: var(--dsw-alias-label-tertiary); }
.dtg-ink-provisioning { color: var(--dsw-alias-state-warn-primary); }
.dtg-ink-failed { color: var(--dsw-alias-state-error-primary); }
.dtg-ink-pending { color: var(--dsw-alias-label-tertiary); }
.dtg-ink-in_progress { color: var(--dsw-alias-brand-primary); }
.dtg-ink-completed { color: var(--dsw-alias-state-success-primary); }
.dtg-ink-deleted { color: var(--dsw-alias-label-dimmed); }
.dtg-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.dtg-dot-ring { box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1); }
.dtg-glyph { flex: 0 0 auto; font: var(--dsw-font-xxxs-strong-11); }

/* --- timeline scroller ------------------------------------------------- */
.dtg-scroll {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: auto;
  overscroll-behavior: contain;
}
.dtg-canvas { position: relative; }
.dtg-axis {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  overflow: hidden;
}
.dtg-tick { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; }
.dtg-tick-label {
  padding: 0 3px;
  transform: translateX(1px);
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
}
.dtg-tick-major .dtg-tick-label { color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxxs-strong-11); }
.dtg-chart { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0; }
.dtg-layer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none; }
.dtg-lane-bg { position: absolute; left: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.dtg-lane-bg-alt { background: var(--dsw-alias-bg-layer-2); opacity: 0.5; }
.dtg-gridline { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--dsw-alias-border-l1); opacity: 0.6; }
.dtg-gridline-major { background: var(--dsw-alias-border-l2); opacity: 0.9; }

/* --- activity bars ----------------------------------------------------- */
.dtg-turn {
  position: absolute;
  border-radius: 3px;
  /* The renderer paints the lane colour inline (a token reference); this is the
     neutral default for a payload that carries no lane colour. */
  background: var(--dsw-alias-bg-layer-3);
  opacity: 0.75;
}
.dtg-step {
  position: absolute;
  border-radius: 2px;
  background: var(--dsw-alias-label-tertiary);
}
.dtg-step-open {
  background: var(--dsw-alias-brand-primary);
  background-image: repeating-linear-gradient(
    135deg,
    var(--dsw-alias-label-primary-inverted) 0 2px,
    transparent 2px 5px
  );
  animation: dtg-pulse 1.4s ease-in-out infinite;
}
.dtg-step-open.dtg-no-anim { animation: none; }
.dtg-span-open { outline: 1px dashed var(--dsw-alias-brand-primary); outline-offset: 1px; }
@keyframes dtg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* --- task cards -------------------------------------------------------- */

/* One absolutely-positioned wrapper per task, so the BAR and its LABEL chip are
   laid out independently: bar length = duration, chip = readable text. The
   wrapper has no size of its own; both children carry their own geometry. */
/* The task WRAP is a zero-sized positioning context for one task: its box and the
   transition rail. */
.dtg-task-wrap { position: absolute; left: 0; top: 0; width: 0; height: 0; }

/* THE box. Its width is set inline from the real elapsed time and it has NO padding
   floor and NO minimum, so nothing about a label can stretch it.

   There used to be two objects here: a thin duration bar whose length was the elapsed
   time, and a label card at a FIXED 148px. The user read the fixed one as the task:
   "任务框的长度应该是按实际时间线来，而不是有个最小固定长度大小".
   A fixed width carries no information and contradicted the bar beside it, so there is
   now ONE box whose LENGTH is the duration.

   Its PAINT went back to the pre-00e58a6 card at the user's request ("任务条背景颜色
   不要用跟 agent 的颜色，用回之前那种"): a neutral surface whose only agent-coloured
   element is the 3px left edge. In between it was filled solid with the lane identity
   colour, which read as an identity swatch rather than as a task. */
.dtg-task {
  position: absolute;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  padding: 2px 6px 2px 8px;
  margin: 0;
  text-align: left;
  border: 1px solid var(--dsw-alias-border-l2);
  border-left-width: 3px;
  border-left-color: currentColor;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  overflow: hidden;
  font: var(--dsw-font-xxxs-11);
  -webkit-app-region: no-drag;
}
/* The hover tint is painted as an INSET SHADOW, never by replacing the background.
   --dsw-alias-interactive-bg-hover is SEMI-TRANSPARENT (measured in a real browser at a
   black tint of six percent alpha), so replacing the background punched a hole through
   the box and let whatever sat behind show through — the "hovering a task puts a colour
   bar across its middle" defect. An inset shadow paints above the element's own
   background and below its content, so a translucent token tints and an opaque one
   covers, with no hole in either case. */
.dtg-task:hover { box-shadow: inset 0 0 0 999px var(--dsw-alias-interactive-bg-hover); }
.dtg-task:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-task[aria-pressed='true'] { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }

/* An OPEN task: its right edge is not a fact yet, so the box is squared off there and
   the edge is dashed. The fill stays the lane colour — a live task is still that lane's
   task — and the dash is what says "this end is still moving". */
.dtg-task-live {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: 2px dashed currentColor;
}
/* A task with no dated history has no duration at all: a small solid marker, fixed
   width, so it is visible and clickable without pretending to be a span of time. */
.dtg-task[data-task-anchor='live'] {
  border-radius: 3px;
  justify-content: center;
  padding: 0;
}

/* The only label: drawn inside the box, truncated with a real ellipsis when the box
   is too narrow (the user: show less text rather than render it outside). The flex
   parent needs a zero min-width on the child to be allowed to shrink at all, and the
   container must not wrap, or the text would push the box's own layout around. */
.dtg-task-subject {
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxxs-strong-11);
}

/* The middle label tier: wide enough to admit text, too narrow to show any. A literal
   ellipsis, so the box never reads as empty/broken. */
.dtg-task-ellipsis {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
}

/* The hover/focus popover.
   Fixed positioning, and rendered OUTSIDE the scroll container: an absolutely-positioned
   descendant contributes to its ancestor's scrollable overflow, which is how a 148px
   caption once inflated the scroll container from 248 to 399 and broke the follow toggle.
   A none pointer-events value keeps it from stealing the hover that opened it, and the
   stacking order puts it above the chart without touching the layout. */
.dtg-popover {
  position: fixed;
  z-index: 40;
  pointer-events: none;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-shadow-lv2);
  font: var(--dsw-font-xxxs-11);
}
.dtg-popover {
  /* A hard ceiling so long text can never push the popover out of the panel. The
     title clips on ONE line (that plus the time is all the user asked to see) and the
     body scrolls instead of growing without bound. */
  max-height: 200px;
  overflow: hidden;
}
.dtg-popover-title {
  /* Single line, ellipsised: a title long enough to wrap would defeat the point of a
     tooltip. The full text is one click away in the details panel. */
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxs-strong-12);
}
.dtg-popover-meta {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dtg-popover-desc {
  margin-top: 2px;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary);
}
.dtg-popover-meta {
  margin-top: 4px;
  color: var(--dsw-alias-label-tertiary);
}
/* A message preview can be long, so the popover caps its height instead of growing
   past the panel; the overflow scrolls (a tooltip that cannot be read is worse than
   one that scrolls). */
.dtg-popover-body {
  margin-top: 2px;
  max-height: 160px;
  overflow: auto;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  color: var(--dsw-alias-label-secondary);
}

/* --- lane head navigation (requirement: click a teammate -> their chat) - */

/* The host class carries hover/focus/cursor; this only lays the button out so
   the row looks identical to the non-clickable variant. */
.dtg-head-btn {
  display: block;
  width: 100%;
  margin: 0;
  padding: 3px 6px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  -webkit-app-region: no-drag;
}
.dtg-head-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4);
  outline-offset: -2px;
}
/* The identity colour now rides on the name pill (inline) and on the dot; the
   row itself draws no stripe. */
.dtg-lane-mark .dtg-dot { background: var(--dsw-alias-label-dimmed); }

/* The marker is a BUTTON now (its body opens in the detail view), so it has to
   stay visually a dot: strip every button affordance the platform would add. */
.dtg-msg[type='button'] {
  padding: 0;
  border: 0;
  font: inherit;
  cursor: pointer;
  -webkit-app-region: no-drag;
}
/* Selected state gets a non-colour cue: a second ring, so it reads on any lane
   colour and under any theme. */
.dtg-msg-active {
  box-shadow:
    0 0 0 1px var(--dsw-alias-bg-layer-1),
    0 0 0 3px var(--dsw-alias-label-secondary);
}
.dtg-msg[type='button']:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4);
  outline-offset: 1px;
}

/* --- teammate filter menu ----------------------------------------------- */

/* Fixed-positioned and OUTSIDE the toolbar: an absolutely positioned descendant adds
   to its ancestor's scrollable overflow, and this panel would clip a child menu. The
   measured invariant is that the scroll container's scrollWidth/clientWidth are identical
   with the menu open and closed. */
.dtg-menu {
  position: fixed;
  z-index: 50;
  max-height: 240px;
  overflow: auto;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-shadow-lv2);
  font: var(--dsw-font-xxxs-11);
}
.dtg-menu-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 4px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.dtg-menu-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dtg-menu-row-pinned { cursor: default; color: var(--dsw-alias-label-secondary); }
.dtg-menu-row-pinned:hover { background: transparent; }
.dtg-menu-name {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dtg-menu-note {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
}
.dtg-menu input { margin: 0; flex: 0 0 auto; }

/* --- wait blocks (wait_agent) ------------------------------------------- */

/* A wait is a PERIOD: it means "blocked, waiting for a teammate", which is the
   opposite of the turn/step bars it is now drawn ON ("working"). Distinguished from
   a message marker by TEXTURE, not by a new hue: the band is a faint wash with
   diagonal stripes cut out of it by a mask, so the stripe gradient carries no colour
   of its own.

   It shares the ACTIVITY track with the turn band and the step bar, at the user's
   request ("等待的灰色条可以重合在 span，这样表达更清晰"), so WHICH ONE IS ON TOP
   matters. It has to be the band: the span's fill is opaque, and while the band
   painted under it the user could not see where the wait STARTED and ENDED at all.
   It used to paint under simply because the WaitBand element is rendered BEFORE the
   span bars inside dtg-layer and neither carried a z-index. Fixed with a stacking
   order rather than by moving the JSX, so that reordering the layer's children for
   some other reason cannot silently bury the band again. Kept below the axis (3) and
   the lane heads (4), which are the two things it may never cover. */
.dtg-wait {
  position: absolute;
  z-index: 2;
  border-radius: 2px;
  background: var(--dsw-alias-label-tertiary);
  opacity: 0.45;
}
.dtg-wait::after {
  content: '';
  position: absolute;
  inset: 0;
  /* The mask is what makes the stripes: repeating diagonal bands of transparent
     and opaque. No colour value is involved, so it survives every skin. */
  -webkit-mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
  mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
}
/* Outcome is carried by the END cap plus the band's texture, never by hue:
   - still blocking: no end cap, and the band fades out because that end has not
     happened yet;
   - timed out: the end cap is a tall bar ("the clock ran out");
   - a peer arrived: the end cap is a compact tick. */
.dtg-wait-open::after {
  -webkit-mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
  mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
}
.dtg-wait-open {
  -webkit-mask-image: linear-gradient(to right, var(--dsw-alias-bg-layer-1) 55%, transparent 100%);
  mask-image: linear-gradient(to right, var(--dsw-alias-bg-layer-1) 55%, transparent 100%);
}
.dtg-wait-timeout { opacity: 0.6; }
.dtg-wait-unknown { opacity: 0.3; }
/* The two ends the user asked to see. */
.dtg-wait-cap {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: var(--dsw-alias-label-primary);
  border-radius: 1px;
}
.dtg-wait-cap-start { left: 0; }
.dtg-wait-cap-end { right: 0; }
/* A timed-out wait gets a taller end bar, so "nobody came" is visible at a
   glance and not only in the tooltip. */
.dtg-wait-timeout .dtg-wait-cap-end { top: -3px; bottom: -3px; width: 3px; }
.dtg-wait-woken .dtg-wait-cap-end { width: 2px; }

/* Legend swatch for a wait block: the same striped band the chart draws, with
   its start cap visible so the legend explains both ends. */
.dtg-legend-wait {
  display: inline-block;
  width: 16px;
  height: 8px;
  border-radius: 2px;
  background: var(--dsw-alias-label-tertiary);
  opacity: 0.55;
  position: relative;
}
.dtg-legend-wait::before {
  content: '';
  position: absolute;
  left: 0;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--dsw-alias-label-primary);
}
/* Controls in the toolbar: the range picker and the follow toggle. */
.dtg-control { display: inline-flex; align-items: center; gap: 3px; min-width: 0; }
.dtg-control-label { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.dtg-select {
  max-width: 72px;
  padding: 1px 2px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  -webkit-app-region: no-drag;
}
/* Follow ON reads as active by SHAPE weight, not only by hue. */
.dtg-btn-on {
  font: var(--dsw-font-xxs-strong-12);
  color: var(--dsw-alias-label-primary);
}

/* --- message detail view ------------------------------------------------ */

.dtg-message-details { max-height: 60%; }
.dtg-message-route {
  font: var(--dsw-font-xxs-strong-12);
  word-break: break-all;
}
.dtg-details-kind {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
/* The FULL body lives here (never in a tooltip): wraps, and scrolls once it
   outgrows the panel. Real bodies run to several thousand characters. */
.dtg-message-body {
  margin: 4px 8px 6px;
  max-height: 40vh;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: var(--dsw-font-xxxs-11);
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 4px;
  padding: 6px 8px;
}
.dtg-muted { color: var(--dsw-alias-label-tertiary); }

/* The key for the transition rail. It is a legend ITEM that holds sub-items, so it
   wraps; the glyphs are printed in ordinary ink, not a lane colour, because the key
   explains the SHAPE (the colour is per-lane and means nothing in a key). */
.dtg-legend-events {
  flex-wrap: wrap;
  gap: 6px;
  color: var(--dsw-alias-label-secondary);
}
.dtg-legend-event {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.dtg-legend-event > span:first-child {
  font: var(--dsw-font-xxxs-strong-11);
  color: var(--dsw-alias-label-primary);
}

/* --- task transition marks --------------------------------------------- */

/* One small glyph per dated transition, on a rail just under the bar.
   It is positioned from the event's OWN time (scaled by the same msPerPx as the bar),
   so it can be read against the bar's length. The rail is under the bar rather than on
   it because TASK_BAR_HEIGHT is the one measurement on this chart that must stay
   exactly proportional — overlaying glyphs on a 10px bar would cover it or force it
   taller, and either would undo the "bar length IS duration" rule. */
.dtg-task-event {
  position: absolute;
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
  pointer-events: none;
  /* Above the label chip. A task's LAST transition is by definition at the bar's right
     edge, which is exactly where an outside label chip begins — so without this the
     completed mark is painted under the chip and vanishes, which is the "挤在一起"
     defect in a new place. Raised with a hairline of the chip's own surface behind it,
     so where a mark overlaps the card it reads as a badge on the card rather than as a
     glyph cut in half. */
  z-index: 1;
  box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-layer-2);
}

/* --- message markers --------------------------------------------------- */

/* The lane's true message extent: a hairline rhythm strip, never a timeline. */
.dtg-msg-band {
  position: absolute;
  border-radius: 1px;
  background: var(--dsw-alias-label-dimmed);
  opacity: 0.35;
}
/* The human's own prompt is a speech BUBBLE, not an arrow.
   It used to draw the lane arrow inside the punched-out disc, which the user read as
   "变成一个白色框黑心的东西": a dark glyph in a white ring says nothing about who spoke.
   A filled bubble is the shape everyone already reads as "a person typed this", and it
   cannot be confused with the arrows that mean "this lane sent / received". */
.dtg-msg-bubble {
  display: block;
  flex: 0 0 auto;
  color: inherit;
}

/* The marker is an ARROW, and ONLY an arrow.
   Every earlier revision wrapped the glyph in something — first a 11px disc, then
   a solid/hollow plate — and the user's complaint was always the same: "外面还有个
   正方形的框会让里面的尖头显示不清晰". A frame competes with the tip of the arrow
   for the same few pixels. So the button keeps NO background, NO border and NO
   outline; the SVG path is the entire icon, which is what lets its 2px stroke and
   round caps stay crisp in the 11px track the layout reserves.
   Direction is carried by the arrow itself: it points ↗ or ↙, it is filled when
   this lane SENT the message and outlined when it received it, and it is painted
   in the counterpart's lane colour. */
.dtg-msg {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 0;
  border-radius: 0;
  padding: 0;
  /* The decorative layer above is pointer-events: none so the lane background,
     gridlines, bands and spans never swallow a click. The marker is the one
     INTERACTIVE child, so it re-enables hit-testing here. Without this line the
     computed style inherits none, elementFromPoint never returns the marker,
     and clicking a "button" silently does nothing. */
  pointer-events: auto;
}
/* The arrow is INK-ONLY: no plate, no disc, no ring. currentColor is set per
   marker from the counterpart's lane FILL, so the icon carries the other lane's
   identity colour. A hairline of the panel surface behind it (set inline) keeps the
   arrow's edge readable even for a fill that is low-contrast on the panel. */
.dtg-msg-arrow {
  display: block;
  flex: 0 0 auto;
  color: inherit;
}
/* A comfortable hit target that does NOT move the arrow: the layout positions
   this box from the message's real time, so an offset would lie about when the
   message happened. An absolutely-positioned, transparent pseudo-element grows
   the clickable area outward without taking part in layout or paint. */
.dtg-msg[type='button']::before {
  content: '';
  position: absolute;
  top: -5px;
  right: -5px;
  bottom: -5px;
  left: -5px;
}
/* The human's own prompt keeps NO disc and NO ring: the bubble IS the marker.
   It used to be a punched-out white disc with a two-tone ring and an arrow inside, which
   the user described as "变成一个白色框黑心的东西" — three shapes competing at 11px, and
   the dark glyph in the white ring said nothing about who spoke. The bubble's own outline
   supplies the contrast, and the shared surface halo (set inline, like every other
   marker) keeps it readable over any lane colour. */
.dtg-msg-user {
  background: none;
  border-radius: 0;
  box-shadow: none;
}
/* A turn marker is a context tick, not a message: it keeps the small flat glyph
   so it is never mistaken for a person's arrow. */
.dtg-msg-turn { background: none; }
.dtg-msg .dtg-msg-glyph { font-size: 10px; line-height: 1; }
/* The legend arrows use the SAME SVG geometry as the markers, so the key cannot
   drift from the thing it explains. */
.dtg-legend-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
}
.dtg-legend-arrow .dtg-msg-arrow { color: var(--dsw-alias-label-secondary); }

.dtg-msg-glyph {
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
  /* The glyph is the non-colour signal: ✎ = the human's own prompt,
     ✉ = a delivery, ▸ = a turn marker. It sits on the lane's saturated fill,
     so the inverted ink is the readable one there. */
  color: var(--dsw-alias-label-primary-inverted);
}
/* ...except inside the human's punched-out dot, whose fill is the PANEL colour:
   the inverted ink would be white-on-white in a light theme, so this one glyph
   takes the primary ink instead (and the two-tone ring carries the outline). */
.dtg-msg-user .dtg-msg-glyph {
  color: var(--dsw-alias-label-primary);
}
.dtg-msg-count {
  position: absolute;
  left: 12px;
  top: 0;
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}
.dtg-legend-msg {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.dtg-legend-msg-user {
  background: var(--dsw-alias-bg-layer-1);
  box-shadow:
    0 0 0 2px var(--dsw-alias-label-primary),
    0 0 0 3.5px var(--dsw-alias-label-primary-inverted);
}

/* Frozen board: no pulse, so nothing on screen implies ongoing work. */
.dtg-paused .dtg-step-open { animation: none; }
.dtg-frozen .dtg-step-open { animation: none; }

/* --- now marker -------------------------------------------------------- */
.dtg-now { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--dsw-alias-brand-primary); }
/* Frozen board: the same line, but unmistakably not a live clock. */
.dtg-now-ended {
  background: var(--dsw-alias-label-dimmed);
  border-left: 1px dashed var(--dsw-alias-label-dimmed);
  width: 0;
}
.dtg-now-head {
  position: absolute;
  top: 0;
  padding: 0 3px;
  transform: translateX(-50%);
  border-radius: 0 0 3px 3px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-inverted);
  font: var(--dsw-font-xxxs-strong-11);
  white-space: nowrap;
  pointer-events: none;
}

/* --- details / notices ------------------------------------------------- */
.dtg-details {
  flex: 0 0 auto;
  max-height: 45%;
  overflow: auto;
  padding: 6px 8px 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
}
.dtg-details-head { display: flex; align-items: flex-start; gap: 6px; }
.dtg-details-title { flex: 1 1 auto; min-width: 0; font: var(--dsw-font-s-strong-14); overflow-wrap: anywhere; }
.dtg-details-body { margin-top: 4px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; white-space: pre-wrap; }
.dtg-kv { display: flex; gap: 6px; margin-top: 3px; }
.dtg-kv-key { flex: 0 0 auto; color: var(--dsw-alias-label-tertiary); }
.dtg-kv-val { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dtg-code {
  display: block;
  margin: 2px 0 0;
  padding: 2px 4px;
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.dtg-hist { margin: 4px 0 0; padding: 0; list-style: none; }
.dtg-hist li { display: flex; gap: 6px; color: var(--dsw-alias-label-secondary); }
.dtg-hist-time { flex: 0 0 auto; color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code); }
.dtg-notice {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-notice-error { color: var(--dsw-alias-state-error-primary); }
.dtg-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 16px 12px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
}
.dtg-center-title { color: var(--dsw-alias-label-primary); font: var(--dsw-font-s-14); }
.dtg-empty-lane { position: absolute; color: var(--dsw-alias-label-dimmed); font: var(--dsw-font-xxxs-11); white-space: nowrap; }
.dtg-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 3px 6px; color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.dtg-legend-item { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.dtg-legend-turn { width: 14px; height: 8px; border-radius: 2px; background: var(--dsw-alias-bg-layer-3); opacity: 0.75; }
.dtg-legend-step { width: 14px; height: 6px; border-radius: 2px; background: var(--dsw-alias-label-tertiary); }
.dtg-legend-card { width: 14px; height: 9px; border: 1px dashed var(--dsw-alias-border-l2); border-left: 3px solid var(--dsw-alias-label-tertiary); border-radius: 3px; }
/* Build identity: quiet, monospaced, never a call to action. */
.dtg-build {
  padding: 1px 8px 3px;
  font: var(--dsw-font-xxxs-11);
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dtg-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .dtg-step-open { animation: none; }
}
/* A hidden tab keeps the last frame but stops animating. */
.dtg-paused .dtg-step-open { animation: none; }
`

// Fail loudly at module load if that character ever creeps into the literal
// above (twice already: a token name, and a CSS position declaration inside a
// comment). See assertNoBackticksInCss for why it is not spelled out here.
assertNoBackticksInCss(BOARD_CSS, 'styles.ts BOARD_CSS')

/* ------------------------------------------------------- development guard */

/**
 * Assert a CSS template literal never contains a stray backtick.
 *
 * This exists because the SAME mistake was made twice in this file: a backtick
 * inside a CSS comment (documenting a token, then documenting
 * position:absolute) terminates the enclosing template literal early, and the
 * symptom is not a CSS problem at all — the whole module fails to transform, so
 * every test that imports it dies at load. A one-line runtime check turns a
 * 30-minute debugging detour into an immediate, named error.
 *
 * A CSS payload should never legitimately contain a backtick, so this is exact
 * rather than heuristic.
 *
 * @param css - the template literal body to check.
 * @param label - module name used in the thrown message.
 * @throws when the payload contains a backtick.
 */
export function assertNoBackticksInCss(css: string, label: string): void {
  // The character is built from its code point on purpose: writing a literal
  // backtick here (even escaped) makes naive template scanners see an extra
  // quote and mis-split the module's literals. Never spell it out in this file.
  const TICK = String.fromCharCode(96)
  const index = css.indexOf(TICK)
  if (index !== -1) {
    const line = css.slice(0, index).split('\n').length
    throw new Error(
      `${label}: stray ${TICK} in a CSS template literal at line ${line}. ` +
        'Such a character inside a CSS comment terminates the template early and breaks the module transform.',
    )
  }
}
