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
.dtg-head-name {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxs-strong-12);
  color: var(--dsw-alias-label-primary);
}
.dtg-head-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-head-meta-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtg-head-role {
  flex: 0 0 auto;
  padding: 0 3px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 3px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}

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
.dtg-task-wrap { position: absolute; left: 0; top: 0; width: 0; height: 0; }
/* The duration bar. Its width is set inline from the real elapsed time; it gets
   no padding and no text, so nothing about a label can stretch it. */
.dtg-task-bar {
  position: absolute;
  /* A Gantt bar: 10px tall (TASK_BAR_HEIGHT), rounded, so it reads as duration
     rather than as a colour chip in front of the label. */
  border-radius: 3px;
  background: var(--dsw-alias-label-tertiary);
  opacity: 0.85;
}
/* A task with no dated history has no knowable duration: a marker, not a bar. */
.dtg-task-bar-live {
  border-radius: 50%;
  opacity: 1;
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1);
}
/* Hairline from the bar's end to a chip that had to hang outside it. */
.dtg-task-anchor {
  position: absolute;
  height: 0;
  border-top: 1px dashed var(--dsw-alias-label-dimmed);
}
/* The chip sits at the geometry the layout computed (inside the bar, or to its
   right); position:absolute keeps it out of normal flow so it can never
   influence the bar. */
.dtg-task {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
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
/* The hover tint is painted as an INSET SHADOW, never by replacing the
   background.
   Why it matters: the duration bar (.dtg-task-bar) is tinted at opacity .85 and
   sits EARLIER in the DOM than its card, so an opaque card hides it — which is
   the intended reading. --dsw-alias-interactive-bg-hover is SEMI-TRANSPARENT
   (measured in a real browser as a black tint at six percent alpha; the very
   existence of a separate
   --dsw-alias-interactive-bg-hover-solid token in the host's palette is the
   contract telling us the normal one is not opaque). Replacing the background
   with it punched a hole through the card and let the bar show through, which is
   the "hovering a task puts a colour bar across its middle" defect.
   An inset shadow paints ABOVE the element's own background and BELOW its
   content, so a translucent token still tints (same look as before) while an
   opaque one simply covers — and in neither case does anything show through.
   It also leaves the box model and text contrast untouched. */
.dtg-task:hover { box-shadow: inset 0 0 0 999px var(--dsw-alias-interactive-bg-hover); }
.dtg-task:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-task[aria-pressed='true'] { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dtg-task-outside {
  /* An outside chip is anchored to the bar by a connector, not by overlap. */
  border-left-width: 2px;
}
.dtg-task-live {
  border-style: dashed;
  border-left-style: solid;
  background: var(--dsw-alias-bg-layer-1);
}
/* Room for the live flag inside the subject line. */
.dtg-task-live .dtg-task-subject { padding-right: 22px; }
.dtg-task-subject {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxs-strong-12);
}
.dtg-task-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-task-flag {
  position: absolute;
  top: 1px;
  right: 3px;
  padding: 0 3px;
  border-radius: 3px;
  border: 1px solid currentColor;
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1.3;
  pointer-events: none;
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
.dtg-lane-mark .dtg-dot { background: var(--dsw-alias-label-dimmed); }
.dtg-head-name { color: var(--dsw-alias-label-primary); }
.dtg-head-row { border-left: 2px solid transparent; }

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

/* --- message markers --------------------------------------------------- */

/* The lane's true message extent: a hairline rhythm strip, never a timeline. */
.dtg-msg-band {
  position: absolute;
  border-radius: 1px;
  background: var(--dsw-alias-label-dimmed);
  opacity: 0.35;
}
/* The marker is an ARROW ICON, not a disc.
   A filled/hollow plate around a 9px glyph was visual noise (the user's words:
   "圆圈+箭头不干净"), and it made the two directions differ mainly by hue. Now the
   arrow itself carries the direction twice over — pointing ↗ or ↙ AND filled or
   hollow — and the counterpart's colour is the ink, so it stays legible on any
   lane colour under either skin. */
.dtg-msg {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  /* The decorative layer above is pointer-events: none so the lane background,
     gridlines, bands and spans never swallow a click. The marker is the one
     INTERACTIVE child, so it re-enables hit-testing here. Without this line the
     computed style inherits none, elementFromPoint never returns the marker,
     and clicking a "button" silently does nothing. */
  pointer-events: auto;
}
/* A comfortable hit target that does NOT move the arrow: the layout positions
   this box from the message's real time, so an offset would lie about when the
   message happened. An absolutely-positioned, transparent pseudo-element grows
   the clickable area outward without taking part in layout. */
.dtg-msg[type='button']::before {
  content: '';
  position: absolute;
  top: -5px;
  right: -5px;
  bottom: -5px;
  left: -5px;
}
/* Outgoing: SOLID — the plate is the counterpart's colour, the arrow is cut out
   of it in the inverted ink. */
.dtg-msg-out { background: var(--dsw-alias-label-tertiary); }
/* Incoming: HOLLOW — no plate at all, the counterpart's colour becomes an
   outline plus the arrow's own ink. */
.dtg-msg-in { background: transparent; }
/* The human's own prompt: a punched-out dot with a TWO-TONE ring, never a hue.
   Single tokens are invisible on one theme or the other (measured: the
   previously-used markdown-citation token scored 1.16:1 on a light panel), and
   the app switches themes without any attribute we could read. So the ring paints
   BOTH ends of the ink pair: whichever skin is active, one of the two layers
   contrasts with the surface. Do not collapse this to one token — a single
   candidate measures below the 3:1 graphical minimum on one skin or the other,
   and "it flips with the skin" is an assumption, not a measurement. The fill
   stays the panel surface so the dot reads as a punched-out hole. */
.dtg-msg-user {
  background: var(--dsw-alias-bg-layer-1);
  box-shadow:
    0 0 0 2px var(--dsw-alias-label-primary),
    0 0 0 3.5px var(--dsw-alias-label-primary-inverted);
}
/* Turn markers are a context tick, not a message: keep them a quiet solid plate
   so they are not mistaken for a human prompt. */
.dtg-msg-turn { background: var(--dsw-alias-label-dimmed); }
.dtg-msg .dtg-msg-glyph { font-size: 10px; line-height: 1; }
.dtg-legend-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 11px;
  height: 11px;
  border-radius: 1px;
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
}
/* Solid = outgoing, hollow = incoming: the same shape contrast the markers use. */
.dtg-legend-arrow-solid {
  background: var(--dsw-alias-label-tertiary);
  color: var(--dsw-alias-label-primary-inverted);
}
.dtg-legend-arrow-hollow {
  border: 1px solid var(--dsw-alias-label-tertiary);
  color: var(--dsw-alias-label-tertiary);
}

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
