/**
 * The browser module loader DSH installs before any client bundle runs.
 *
 * The client half is bundled as `window.__ModuleLoader__.load({ id, factory })`
 * and the loader hands `factory` a `require` bound to the host's own module
 * table, so `react`, `react-dom` and `@deepseek-ai/*` are shared singletons
 * rather than a second copy inside the plugin bundle.
 */
interface DshModuleLoader {
  load(entry: { id: string; factory: (require: (id: string) => unknown) => unknown }): void
}

interface Window {
  __ModuleLoader__: DshModuleLoader
}
