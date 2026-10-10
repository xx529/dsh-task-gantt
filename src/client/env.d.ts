/**
 * The browser module loader DSH installs before any client bundle runs.
 *
 * The client half is bundled as `window.__ModuleLoader__.load({ id, factory })`
 * and the loader hands `factory` a `require` bound to the host's own module
 * table, so `react`, `react-dom` and `@deepseek-ai/*` are shared singletons
 * rather than a second copy inside the plugin bundle.
 *
 * Verified against the shipped host (DSH 0.2.0-rc.2,
 * `@deepseek-ai/dsh-client-modules` in
 * `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`): the facade
 * installed by `bootInjections()` is
 *
 * ```js
 * window.__ModuleLoader__ = { mode: "queue", pendingQueue, load(registration), create(options) }
 * ```
 *
 * and materialization memoizes `{ id, exports, styles, edges }` per package. The
 * `styles` member below is therefore declared **optional and unverified**: the
 * shipped facade has no such sink, and `panel-style.ts` probes for it only to
 * stay forward-compatible, falling back to a self-tagged `<style>` element.
 */
interface DshModuleLoaderStyleSink {
  /** Insert a stylesheet owned by the calling package. Signature: ❓ unverified. */
  insert(css: string): unknown
}

interface DshModuleLoader {
  /** Register a bundle factory; the host materializes it lazily, once. */
  load(entry: { id: string; factory: (require: (id: string) => unknown) => unknown }): void
  /** Optional style sink — absent on DSH 0.2.0-rc.2 (see the file header). */
  styles?: DshModuleLoaderStyleSink
}

interface Window {
  __ModuleLoader__: DshModuleLoader
}
