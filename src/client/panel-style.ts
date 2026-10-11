/**
 * The panel-level stylesheet of dsh-task-gantt, injected from the client half.
 *
 * Owner: teammate `shell`. The chart's own component styles belong to `ui`; what
 * lives here is only the surface contract of the tab body plus the class hooks
 * the board may reuse:
 *
 * - `[data-dsh-task-gantt]` / `.dsh-task-gantt-panel` — the tab body root;
 * - `.dsh-task-gantt-chrome` — interactive chrome row (toolbar, lane header);
 * - `.dsh-task-gantt-scroll` — the scrolling region;
 * - `.dsh-task-gantt-notice` / `-error` — loading / empty / failure text;
 * - `.dsh-task-gantt-button` — token-styled button;
 * - `.dsh-task-gantt-nodrag` — `-webkit-app-region: no-drag` for any chrome the
 *   host's window drag strip could otherwise swallow;
 * - `.dsh-task-gantt-lane-head-navigable` — a lane head that can jump to its
 *   session (hover / focus-visible affordance, `cursor: pointer` only when the
 *   host can actually navigate);
 * - `.dsh-task-gantt-mono` — monospace (time ticks).
 *
 * Theme rules (external-plugin-guide.md §12, TEAM-BRIEF §5): the panel surface
 * is `var(--dsw-alias-bg-layer-1)`; every colour comes from a `--dsw-alias-*` /
 * `--dsw-font-*` token, never a literal. `--dsw-specific-sidebar-fill` is the
 * host's left-navigation token and must not be consumed here.
 *
 * Token EXISTENCE is checked against the host theme's own definition list —
 * `tests/fixtures/dsw-theme-tokens.json` (408 names, snapshotted from
 * `@deepseek-ai/dsh-client-ui-theme` inside app.asar) — never against "some
 * other plugin writes this name". That weaker check is how `--dsw-font-mono`
 * survived review here: better-sidebar-shaped code writes plausible names that
 * the theme never defines, and a `var()` naming an undefined custom property is
 * legal CSS whose declaration is silently dropped at computed-value time (so
 * neither the type checker nor a colour scan sees it). Note also that
 * `--dsw-font-xxs-12` / `--dsw-font-xxxs-11` ARE complete `font:` shorthand
 * values (`12px/18px var(--dsw-font-family)`), which is why the `font:` shorthand
 * is correct for those and wrong for `.dsh-task-gantt-mono`, where only the
 * family should change.
 *
 * Injection rides the host's client module system: a bundle's factory body runs
 * at materialization, and `@deepseek-ai/dsh-client-modules` then calls
 * `claimStyles(ownerId)` — untagged `<style>` tags are claimed for the
 * materializing plugin and removed on HMR teardown (`removeOwnedStyles`). We
 * therefore tag our tag ourselves (`data-plugin` / `data-plugin-css`), exactly
 * like `dsh-code-nav` and better-sidebar's own bundles do. See
 * {@link injectPanelStyles}.
 */

/** This plugin's package name — the module-loader id and the style owner id. */
export const PLUGIN_ID = 'dsh-task-gantt'

/** Stable CSS identity of the injected stylesheet (mirrors `data-plugin-css`). */
export const STYLE_TAG_ID = `${PLUGIN_ID}/styles.css`

/** Attribute that marks the injected `<style>` tag and the panel root. */
export const STYLE_MARKER_ATTR = 'data-dsh-task-gantt'

/**
 * The panel stylesheet. Token-driven, zero colour literals (guide §12).
 */
export const PANEL_CSS = `
/* Tab body root. The host wraps every tab body in a column-flex
   '[data-dsh-native-tab-host]' of height:100% (sidebar.module.css
   .nativeTabHost), so the root fills the pane with flex:1 + min-height:0.
   ':not(style)' keeps this rule off the injected <style> element itself, which
   carries the same marker attribute (a 'display' on a stylesheet tag renders its
   text when it is not parked in a 'display:none' head). */
[data-dsh-task-gantt]:not(style),
.dsh-task-gantt-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12);
  -webkit-app-region: no-drag;
}

/* Interactive chrome: toolbars, zoom buttons, lane headers. */
.dsh-task-gantt-chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 6px 10px;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  -webkit-app-region: no-drag;
}

/* The one scrolling region of the panel (chart canvas). */
.dsh-task-gantt-scroll {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* Loading / empty / degradation text. */
.dsh-task-gantt-notice {
  padding: 16px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxs-12);
  text-align: center;
}

.dsh-task-gantt-error {
  color: var(--dsw-alias-state-error-primary);
}

/* Token-styled button; the host draws the rest of the chrome. */
.dsh-task-gantt-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.dsh-task-gantt-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dsh-task-gantt-button:disabled {
  color: var(--dsw-alias-label-dimmed);
  cursor: default;
}

/* Drag-strip exit for ad-hoc chrome (guide §12.1). */
.dsh-task-gantt-nodrag {
  -webkit-app-region: no-drag;
}

/* A lane head the board can jump from to that lane's own session (task-9).
   The board applies this class only when a real navigation target exists
   (lane.navigation !== undefined), so cursor: pointer never promises a jump the
   host cannot make; a lane without a target keeps the plain arrow. The
   hover/focus tokens mirror the host's own affordances: hover uses the shared
   interactive surface, and the ring is byte-for-byte the host's focus treatment
   (dsh-better-sidebar/src/client/SideCardSection.module.css:145-148,274-277).
   NOTE: no backticks in these comments — this stylesheet is a JS template
   literal, so a stray backtick ends the string (learned the hard way). */
.dsh-task-gantt-lane-head-navigable {
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.dsh-task-gantt-lane-head-navigable:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-task-gantt-lane-head-navigable:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4);
  outline-offset: 2px;
}

/* Monospace (time ticks). Swaps ONLY the family, and deliberately uses
   font-family rather than the font: shorthand — a shorthand would reset the
   panel's inherited size/line-height. The family is --ds-font-family-code, the
   host's own code stack ("SF Mono", "JetBrains Mono", ... Menlo, monospace).
   Do NOT use --dsw-font-mono: it is not defined by the host theme (408 tokens in
   tests/fixtures/dsw-theme-tokens.json), and a var() naming an undefined custom
   property makes the WHOLE declaration invalid at computed-value time — the
   family would silently not apply AND the shorthand would additionally reset
   size/line-height. Legal-looking, invisible, and invisible to a colour scan. */
.dsh-task-gantt-mono {
  font-family: var(--ds-font-family-code);
  color: var(--dsw-alias-label-tertiary);
}
`

/** The `styles` sink some hosts may expose on the module loader (see below). */
interface ModuleLoaderStyles {
  insert(css: string): unknown
}

/** Set once per module materialization; the host removes the tag on teardown. */
let injected = false

/**
 * Inject {@link PANEL_CSS} once, preferring a module-loader style sink and
 * falling back to a self-tagged `<style>` element.
 *
 * Verified host behaviour (DSH 0.2.0-rc.2, `@deepseek-ai/dsh-client-modules` in
 * `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`): the loader
 * facade installed by `bootInjections()` carries only `mode` / `pendingQueue` /
 * `load` / `create` — there is **no** `styles` member, so in practice the
 * `<style data-dsh-task-gantt>` fallback is the path that runs. The probe stays
 * for forward compatibility with a host that does expose the documented sink;
 * if `insert` throws we degrade to the element path instead of failing
 * activation.
 *
 * @param css - stylesheet text; defaults to {@link PANEL_CSS}.
 * @returns a disposer that removes the tag this call created (a no-op when the
 * host owns the stylesheet or another call already injected it).
 */
export function injectPanelStyles(css: string = PANEL_CSS): () => void {
  if (injected) return NOOP
  try {
    return injectOnce(css)
  } catch {
    // Styling must never be able to break activation: a partial or foreign DOM
    // (no `querySelector`, no writable head, …) degrades to an unstyled but
    // working panel, and a later call can retry.
    return NOOP
  }
}

/** One injection attempt; throws are absorbed by {@link injectPanelStyles}. */
function injectOnce(css: string): () => void {
  const viaLoader = insertViaLoader(css)
  if (viaLoader !== null) {
    injected = true
    return NOOP
  }

  if (typeof document === 'undefined') return NOOP
  if (typeof document.createElement !== 'function' || typeof document.querySelector !== 'function') {
    return NOOP
  }

  const owned = `style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`
  if (document.querySelector(owned) !== null) {
    injected = true
    return NOOP
  }

  const tag = document.createElement('style')
  // `data-plugin` makes the loader treat the tag as already owned (its
  // claimStyles only adopts untagged tags) and remove it on HMR teardown;
  // `data-plugin-css` is the stable CSS identity better-sidebar's own bundles
  // and dsh-code-nav use.
  tag.setAttribute('data-plugin', PLUGIN_ID)
  tag.setAttribute('data-plugin-css', STYLE_TAG_ID)
  tag.setAttribute(STYLE_MARKER_ATTR, '')
  tag.textContent = css
  const parent = document.head ?? document.documentElement
  parent.appendChild(tag)
  injected = true

  return () => {
    if (tag.isConnected) tag.remove()
    injected = false
  }
}

/** Whether this module has already injected its stylesheet. */
export function stylesInjected(): boolean {
  return injected
}

function NOOP(): void {}

/**
 * Try the documented (but not shipped) module-loader style sink.
 *
 * @returns `true` when the host accepted the stylesheet, `null` when the sink
 * is absent or rejected it.
 */
function insertViaLoader(css: string): true | null {
  if (typeof window === 'undefined') return null
  const loader = window.__ModuleLoader__ as { styles?: Partial<ModuleLoaderStyles> } | undefined
  const styles = loader?.styles
  const insert = styles?.insert
  if (typeof insert !== 'function') return null
  try {
    insert.call(styles, css)
    return true
  } catch {
    return null
  }
}
