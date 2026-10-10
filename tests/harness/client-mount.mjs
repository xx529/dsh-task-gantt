/**
 * Lead-side mount harness: load `lib/client.js` the way the browser will.
 *
 * This is NOT a vitest spec — it is the pre-flight the Lead runs before the real
 * profile install, and it is also what `tests/e2e` drives. It builds the exact
 * environment the DSH client module loader provides:
 *
 *   - `window.__ModuleLoader__.load({ id, factory })` captures the factory;
 *   - the factory's `require` resolves `react` / `react-dom` from THIS repo's
 *     node_modules (the real page resolves them from the host's module table);
 *   - a stub `ctx` exposes `get('betterSidebar')` returning a recording service,
 *     so we can assert the registered tab descriptor without a browser.
 *
 * Usage: node tests/harness/client-mount.mjs
 * Exit code 0 = the bundle loaded, exported `apply`, and registered exactly one
 * tab whose id is the frozen TAB_TYPE_ID. Any violation prints and exits 1.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const require = createRequire(import.meta.url)
const TAB_TYPE_ID = 'dsh-task-gantt:board'

/** Minimal DOM the client half may touch at module scope. */
function installDomStubs() {
  const style = { textContent: '', setAttribute() {}, appendChild() {} }
  globalThis.document = {
    documentElement: { lang: 'zh-CN' },
    baseURI: 'http://127.0.0.1:1/',
    head: { appendChild(node) { if (node?.textContent) style.textContent = node.textContent } },
    createElement: () => ({ ...style, textContent: '', setAttribute() {}, appendChild() {} }),
    querySelector: () => null,
    addEventListener() {},
    removeEventListener() {},
  }
  globalThis.navigator = { language: 'zh-CN' }
  globalThis.location = { href: 'http://127.0.0.1:1/' }
  globalThis.addEventListener = () => {}
  globalThis.removeEventListener = () => {}
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ ok: true, value: emptyTimeline() }) })
  globalThis.requestAnimationFrame = (fn) => setTimeout(() => fn(Date.now()), 0)
  globalThis.cancelAnimationFrame = (id) => clearTimeout(id)
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} })
}

/** The empty board the stub route returns when the panel fetches. */
function emptyTimeline() {
  return {
    apiVersion: 1,
    sessionId: 's',
    rootSessionId: 's',
    generatedAt: Date.now(),
    range: { start: Date.now(), end: null },
    lanes: [],
    tasks: [],
    source: 'live',
    notes: [],
  }
}

/** Load the bundle, returning the module exports the loader would have. */
function loadBundle() {
  const source = readFileSync(resolve(root, 'lib/client.js'), 'utf8')
  let factory
  const loader = {
    load({ id, factory: f }) {
      if (id !== 'dsh-task-gantt') throw new Error(`bundle registered unexpected id: ${id}`)
      factory = f
    },
  }
  globalThis.window = { __ModuleLoader__: loader, addEventListener() {}, removeEventListener() {} }
  // eslint-disable-next-line no-new-func
  new Function('window', 'document', 'navigator', source)(globalThis.window, globalThis.document, globalThis.navigator)
  if (factory === undefined) throw new Error('bundle never called window.__ModuleLoader__.load')
  return factory((id) => require(id))
}

/** A recording stand-in for `ctx.betterSidebar`. */
function recordingCtx() {
  const registered = []
  const effects = []
  const warnings = []
  const ctx = {
    get(name) {
      if (name === 'betterSidebar') return { registerTab: (d) => { registered.push(d); return () => {} } }
      return undefined
    },
    effect(fn) { effects.push(fn); const dispose = fn(); return () => dispose?.() },
    logger: { warn: (m) => warnings.push(String(m)), info() {}, error() {} },
  }
  return { ctx, registered, effects, warnings }
}

function fail(message) {
  console.error(`\u001b[31mFAIL\u001b[0m ${message}`)
  process.exitCode = 1
}

installDomStubs()
const mod = loadBundle()

if (typeof mod.apply !== 'function') fail('bundle exports no apply()')
if (mod.name !== 'dsh-task-gantt') fail(`bundle exports name=${String(mod.name)}`)
if (!Array.isArray(mod.inject)) fail('bundle exports no inject array')

const { ctx, registered, effects, warnings } = recordingCtx()
mod.apply(ctx)

if (effects.length === 0) fail('apply() registered no ctx.effect (HMR teardown missing)')
if (registered.length !== 1) fail(`expected exactly 1 registered tab, got ${registered.length}`)
const tab = registered[0]
if (tab?.id !== TAB_TYPE_ID) fail(`tab id is ${String(tab?.id)}, expected ${TAB_TYPE_ID}`)
if (typeof tab?.component !== 'function') fail('tab descriptor has no component')
for (const key of ['title', 'description']) {
  const value = typeof tab?.[key] === 'function' ? tab[key]() : tab?.[key]
  if (typeof value !== 'string' || value === '') fail(`tab.${key} does not resolve to a non-empty string`)
}
if (warnings.length > 0) console.log(`note: apply() logged ${warnings.length} warning(s): ${warnings.join(' | ')}`)

if (process.exitCode !== 1) {
  console.log(`\u001b[32mOK\u001b[0m lib/client.js loaded; tab id=${tab.id}, title=${typeof tab.title === 'function' ? tab.title() : tab.title}, inject=[${mod.inject.join(',')}]`)
}
