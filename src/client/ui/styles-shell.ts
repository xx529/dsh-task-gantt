/**
 * Shell stylesheet of the Gantt board: the toolbar and the bottom detail drawer.
 *
 * Owner: teammate `shell-ui`. The chart's own styles stay in `styles.ts`
 * (owner: Lead) and are never edited here; this file carries ONLY the classes
 * the panel shell introduced in the v1 redesign:
 *
 * - `.dtg-topbar*`  the 40px toolbar (session-log dot + word, clickable NOW
 *                   pill, range picker, follow switch, filter icon+badge,
 *                   refresh icon);
 * - `.dtg-iconbtn`  a 26x26 borderless icon button (filter / refresh / close);
 * - `.dtg-switch*`  the follow toggle (painted track + knob, not a checkbox);
 * - `.dtg-badge`    the hidden-lane count on the filter button;
 * - `.dtg-state*`   the reachable loading / empty / error states, plus the
 *                   inline error bar shown under the toolbar;
 * - `.dtg-drawer*`  the ONE bottom drawer (task / message / question), which
 *                   overlays the chart instead of squeezing it, and the small
 *                   status dot + word used inside it.
 *
 * Injection: `BoardView`'s `useBoardStyles()` appends this string to the SAME
 * `<style>` element as `BOARD_CSS`, so the mount refcount and the HMR cleanup
 * path stay exactly as they were (one element, one owner).
 *
 * Theme contract (guide §12): every colour resolves to a `--dsw-alias-*` /
 * `--dsw-font-*` / `--ds-*` token — never a literal, never a colour name. A
 * translucent tint is expressed with `opacity` on a token background instead of
 * an alpha literal, so a skin swap repaints everything.
 */
import { assertNoBackticksInCss } from './styles.ts'

/** The shell CSS, tokens only. */
export const SHELL_CSS = `
/* --- toolbar (480px panel: the row must fit inside 448px) --------------- */
.dtg-topbar {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 0 0 auto;
  height: 40px;
  min-width: 0;
  padding: 0 8px;
  /* Its own horizontal scroller: at 400px and below the fixed controls must
     scroll sideways instead of wrapping or clipping. The overflow lives HERE,
     never on the chart's scroll container. */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  -webkit-app-region: no-drag;
}
.dtg-topbar::-webkit-scrollbar { display: none; }
.dtg-topbar > * { flex: 0 0 auto; }
/* The one child that absorbs slack: everything else sizes to its content, so no
   control can be squeezed into a second line. */
.dtg-topbar-spacer { flex: 1 1 auto; min-width: 0; }

.dtg-topbar-source {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
  white-space: nowrap;
}
/* The honesty dot: colour is a secondary cue only, the word always carries the
   meaning, so a monochrome skin loses nothing. */
.dtg-topbar-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
}
.dtg-topbar-source[data-source='partial'] { color: var(--dsw-alias-state-warn-primary); }
.dtg-topbar-source[data-source='live'] { color: var(--dsw-alias-state-warn-primary); }
.dtg-topbar-source[data-source='log'] { color: var(--dsw-alias-label-secondary); }
.dtg-topbar-word {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* The clickable NOW pill. When the board is frozen it degrades to a static
   ended-time readout (same geometry, no pointer affordance). */
.dtg-topbar-now {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 9px;
  border: 1px solid var(--dsw-alias-brand-primary);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.dtg-topbar-now:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dtg-topbar-now:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-topbar-now-label { color: var(--dsw-alias-label-secondary); }
.dtg-topbar-now-time { color: var(--dsw-alias-brand-primary); font: var(--dsw-font-xxxs-strong-11); }
.dtg-topbar-now[data-live='false'] { border-color: var(--dsw-alias-border-l2); cursor: default; }
.dtg-topbar-now[data-live='false']:hover { background: transparent; }
.dtg-topbar-now[data-live='false'] .dtg-topbar-now-time { color: var(--dsw-alias-label-secondary); }

/* The range picker. A native select is kept on purpose: it is the one control
   in this row that must remain keyboard- and screen-reader-native. */
.dtg-topbar-select {
  max-width: 112px;
  height: 26px;
  padding: 0 4px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
  -webkit-app-region: no-drag;
}
.dtg-topbar-select:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }

/* --- follow switch ------------------------------------------------------ */
.dtg-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 26px;
  padding: 0 2px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.dtg-switch:hover { color: var(--dsw-alias-label-primary); }
.dtg-switch:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-switch-track {
  position: relative;
  display: inline-block;
  flex: 0 0 auto;
  width: 26px;
  height: 14px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 7px;
  background: var(--dsw-alias-bg-layer-2);
  transition: background var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}
.dtg-switch-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
  transition: left var(--ds-transition-duration-fast) var(--ds-ease-in-out);
}
.dtg-switch[aria-checked='true'] { color: var(--dsw-alias-label-primary); }
.dtg-switch[aria-checked='true'] .dtg-switch-track {
  border-color: var(--dsw-alias-brand-primary);
  background: var(--dsw-alias-brand-primary);
}
.dtg-switch[aria-checked='true'] .dtg-switch-knob {
  left: 13px;
  background: var(--dsw-alias-bg-layer-1);
}
.dtg-switch-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .dtg-switch-track, .dtg-switch-knob { transition: none; }
}

/* --- 26x26 icon button + badge ------------------------------------------ */
.dtg-iconbtn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.dtg-iconbtn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dtg-iconbtn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-iconbtn[aria-pressed='true'], .dtg-iconbtn-on {
  border-color: var(--dsw-alias-border-l2);
  color: var(--dsw-alias-label-primary);
}
.dtg-iconbtn svg { display: block; }

.dtg-badge {
  position: absolute;
  top: -3px;
  right: -3px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-inverted);
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
  white-space: nowrap;
  pointer-events: none;
}

/* --- reachable loading / empty / error states --------------------------- */
.dtg-state {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 0;
  padding: 24px 20px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
}
.dtg-state-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 50%;
  color: var(--dsw-alias-label-tertiary);
}
.dtg-state-title { color: var(--dsw-alias-label-primary); font: var(--dsw-font-s-14); }
.dtg-state-body {
  max-width: 340px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxs-12);
  overflow-wrap: anywhere;
}
/* The loading skeleton: three rows, so the panel is visibly "not empty yet"
   instead of the old blank frame (the loading branch used to be unreachable). */
.dtg-state-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(320px, 80%);
}
.dtg-state-skeleton-row {
  height: 10px;
  border-radius: 5px;
  background: var(--dsw-alias-bg-layer-3);
  opacity: 0.6;
  animation: dtg-shell-pulse 1.6s ease-in-out infinite;
}
.dtg-state-skeleton-row:nth-child(2) { width: 82%; }
.dtg-state-skeleton-row:nth-child(3) { width: 64%; }
@keyframes dtg-shell-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.85; }
}
@media (prefers-reduced-motion: reduce) {
  .dtg-state-skeleton-row { animation: none; }
}
.dtg-state-retry {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 26px;
  padding: 0 12px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.dtg-state-retry:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dtg-state-retry:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }

/* The inline error bar directly under the toolbar. The chart itself is NOT
   unmounted when data already exists: the reader keeps the last frame and the
   bar says why it stopped updating. */
.dtg-state-errorbar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 0 0 auto;
  margin: 6px 8px 0;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-state-error-primary);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
  -webkit-app-region: no-drag;
}
.dtg-state-errorbar-icon {
  flex: 0 0 auto;
  color: var(--dsw-alias-state-error-primary);
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1.3;
}
.dtg-state-errorbar-body { flex: 1 1 auto; min-width: 0; overflow-wrap: anywhere; }
.dtg-state-errorbar-title {
  color: var(--dsw-alias-state-error-primary);
  font: var(--dsw-font-xxxs-strong-11);
}
.dtg-state-errorbar-detail {
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-state-errorbar .dtg-state-retry { flex: 0 0 auto; }

/* --- the ONE bottom drawer (task / message / question) ------------------ */
/* The positioning context of the drawer. It wraps ONLY the chart, so the
   drawer overlays the drawing area and never covers the toolbar or the build
   line; the chart is not squeezed because the drawer is absolutely placed. */
.dtg-drawer-host {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
  min-width: 0;
}
.dtg-drawer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  /* Above the chart's own overlays (axis 3, heads 4, legend popover 30) and below
     the fixed hover popover (40): a hovered task may still explain itself above
     the drawer, but the drawer owns everything that lives inside the chart. */
  z-index: 35;
  display: flex;
  flex-direction: column;
  max-height: 62%;
  border-top: 1px solid var(--dsw-alias-border-l2);
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-shadow-lv3);
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12);
  -webkit-app-region: no-drag;
}
.dtg-drawer-grip {
  flex: 0 0 auto;
  width: 32px;
  height: 3px;
  margin: 6px auto 0;
  border-radius: 2px;
  background: var(--dsw-alias-border-l3);
}
.dtg-drawer-head {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 0 0 auto;
  padding: 6px 8px 6px 12px;
}
.dtg-drawer-heading {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 auto;
  min-width: 0;
}
.dtg-drawer-title {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-s-strong-14);
}
.dtg-drawer-status {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
}
.dtg-drawer-close { margin-left: auto; }
.dtg-drawer-body {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-height: 0;
  padding: 2px 12px 12px;
  overflow: auto;
  overscroll-behavior: contain;
}
.dtg-drawer-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 3px 10px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  overflow-wrap: anywhere;
}
.dtg-drawer-meta-key { color: var(--dsw-alias-label-tertiary); }
.dtg-drawer-meta-val { color: var(--dsw-alias-label-secondary); }

/* Status is a 6px dot + a WORD: never colour alone, and never a bordered chip. */
.dtg-state-dot {
  flex: 0 0 auto;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.dtg-state-dot-brand { background: var(--dsw-alias-brand-primary); }
.dtg-state-dot-business { background: var(--dsw-alias-state-business-primary); }
.dtg-state-dot-success { background: var(--dsw-alias-state-success-primary); }
.dtg-state-dot-warn { background: var(--dsw-alias-state-warn-primary); }
.dtg-state-dot-error { background: var(--dsw-alias-state-error-primary); }

/* Three-instant timeline: created / claimed / ended, one real clock each. */
.dtg-drawer-times {
  position: relative;
  display: flex;
  gap: 10px;
  padding-bottom: 14px;
}
.dtg-drawer-times::after {
  content: '';
  position: absolute;
  left: 3px;
  right: 3px;
  bottom: 7px;
  height: 1px;
  background: var(--dsw-alias-border-l2);
}
.dtg-drawer-time {
  position: relative;
  display: flex;
  flex: 1 1 0;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  padding-bottom: 10px;
}
.dtg-drawer-time-label {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dtg-drawer-time-value {
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxxs-strong-11);
  font-family: var(--ds-font-family-code);
  white-space: nowrap;
}
.dtg-drawer-time-value-muted { color: var(--dsw-alias-label-tertiary); }
.dtg-drawer-time-dot {
  position: absolute;
  left: 0;
  bottom: 3px;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-2);
}
.dtg-drawer-time-dot-brand { background: var(--dsw-alias-state-business-primary); }
.dtg-drawer-time-dot-success { background: var(--dsw-alias-state-success-primary); }

/* Two-column KV block (owner / blockedBy / lane / scopes / revision / run). */
.dtg-drawer-kv {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 5px 12px;
  margin: 0;
}
.dtg-drawer-kv-item { display: flex; gap: 8px; min-width: 0; }
.dtg-drawer-kv dt, .dtg-drawer-kv dd { margin: 0; }
.dtg-drawer-kv-key {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-drawer-kv-val {
  min-width: 0;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  overflow-wrap: anywhere;
}
.dtg-drawer-section { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.dtg-drawer-section-title {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-drawer-desc {
  margin: 0;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dtg-drawer-note {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  overflow-wrap: anywhere;
}
.dtg-drawer-pre {
  margin: 0;
  max-height: 34vh;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxs-12);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow: auto;
}
.dtg-drawer-code {
  display: block;
  padding: 4px 6px;
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-state-error-primary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.dtg-drawer-hist {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.dtg-drawer-hist li {
  display: flex;
  gap: 8px;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  overflow-wrap: anywhere;
}
.dtg-drawer-hist-time {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code);
}

/* Question blocks: one per question, 1-4 per call, rendered in order. */
.dtg-drawer-question {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding-top: 8px;
  border-top: 1px solid var(--dsw-alias-border-l1);
}
.dtg-drawer-question-first { padding-top: 0; border-top: 0; }
.dtg-drawer-question-head {
  display: flex;
  align-items: baseline;
  gap: 6px;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxxs-strong-11);
  overflow-wrap: anywhere;
}
.dtg-drawer-question-index {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
  font-family: var(--ds-font-family-code);
}
.dtg-drawer-question-prompt {
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.dtg-drawer-answer { display: flex; flex-direction: column; gap: 3px; }
.dtg-drawer-answer-label {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-drawer-choice {
  display: flex;
  align-items: flex-start;
  gap: 5px;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxxs-strong-11);
  overflow-wrap: anywhere;
}
.dtg-drawer-choice-mark {
  flex: 0 0 auto;
  color: var(--dsw-alias-state-success-primary);
}
.dtg-drawer-custom {
  display: flex;
  gap: 6px;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

/* --- expanded detail (modal) ------------------------------------------- */
/* The drawer's "查看完整详情" step: the SAME body node, in a dialog that covers the
   whole panel. 45 sits above the drawer (35) and the legend popover (30) but below
   the chart's hover popover (40 is below 45, so the popover cannot paint over a
   modal — it is dismissed by the selection anyway). */
.dtg-modal {
  position: absolute;
  inset: 0;
  z-index: 45;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  background: var(--dsw-alias-bg-mask-1);
  -webkit-app-region: no-drag;
}
.dtg-modal-card {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-1);
  box-shadow: var(--dsw-shadow-lv3);
}
.dtg-modal-head {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  flex: 0 0 auto;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dtg-modal-head .dtg-drawer-heading { flex: 1 1 auto; min-width: 0; }
.dtg-modal-close { margin-left: auto; }
.dtg-modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 10px 12px 12px;
  overscroll-behavior: contain;
}
/* In the dialog the text is the point: let it use the whole height and scroll the
   BODY, not a nested 34vh box. */
.dtg-modal-body .dtg-drawer-pre { max-height: none; }
`

assertNoBackticksInCss(SHELL_CSS, 'styles-shell.ts SHELL_CSS')
