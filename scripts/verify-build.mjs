/**
 * Artifact-shape verification for dsh-task-gantt — `node scripts/verify-build.mjs`.
 *
 * Why this exists: both halves of a DSH plugin fail **silently** when their
 * shape is wrong. A host half with a stray bare import dies with
 * `ERR_MODULE_NOT_FOUND` and takes the whole profile boot down with it; a client
 * half that is not wrapped in `window.__ModuleLoader__.load(...)` is simply never
 * materialized, and the sidebar tab just never appears. Neither failure names
 * this plugin. So the checks below are the executable version of the packaging
 * contract, and they run in CI right after the build (`pnpm run verify:build`).
 *
 * It checks the BUILT artifacts, not the sources — the sources can be perfect
 * while the bundler config quietly inlines React or drops the wrapper.
 *
 * Exit codes: 0 = all contract checks pass, 1 = a contract check failed,
 * 2 = an artifact is missing/unreadable (build not run yet).
 *
 * Contract sources:
 * - the client wrapper: `dsh-chat-tidy@0.4.0/lib/client.js` and
 *   `dsh-ego-browser@0.8.6/lib/client.js` (both installed, both byte-identical
 *   in shape) — see docs/TEAM-BRIEF.md §2.2;
 * - the host half: `dsh-better-sidebar@0.22.1/lib/index.js`, plus DSH's own
 *   docs (`deepseekdocs.com/en/docs/learn/core/plugin-anatomy` §2/§8: the load
 *   closure contains only `@deepseek-ai/*`, so the host bundle imports every SDK
 *   package instead of copying it).
 */
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, '')
const PACKAGE = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
const PACKAGE_NAME = PACKAGE.name

const failures = []
const notes = []
const fail = (message) => failures.push(message)
const note = (message) => notes.push(message)

/** Read an artifact, or exit 2 when the build has not run. */
function readArtifact(relative) {
  const path = resolve(root, relative)
  if (!existsSync(path)) {
    console.error(`[verify-build] ${relative} is missing — run \`pnpm run build\` first.`)
    process.exit(2)
  }
  return { path, text: readFileSync(path, 'utf8') }
}

// ---------------------------------------------------------------------------
// 1. Host half: a real ESM module that a Node loader can import.
// ---------------------------------------------------------------------------

/**
 * Static import specifiers of an ESM file, without a parser: the built host
 * bundle is esbuild output, so every import is a whole-line statement —
 * `import … from "x"`, `import "x"`, `export … from "x"` or `await import("x")`.
 *
 * The line anchor is load-bearing: an unanchored `from …` also matches ordinary
 * code and even template-literal bodies (first run of this script flagged the
 * generated text `imports the bare package "${sessionId}"`), which would make
 * the check useless noise.
 */
function importSpecifiers(text) {
  const found = new Set()
  const patterns = [
    /^\s*(?:import|export)\b[^;\n]*?\bfrom\s*["']([^"']+)["']/gm,
    /^\s*import\s*["']([^"']+)["']/gm,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
  ]
  for (const pattern of patterns) for (const match of text.matchAll(pattern)) found.add(match[1])
  return [...found]
}

const host = readArtifact('lib/index.js')

// Import the artifact the way DSH's loader does — this catches syntax errors and
// (below) any import the loader's `@deepseek-ai/*`-only closure cannot resolve.
let hostModule
try {
  hostModule = await import(pathToFileURL(host.path).href)
} catch (error) {
  fail(`lib/index.js does not load as an ES module: ${String(error)}`)
}

if (hostModule !== undefined) {
  if (hostModule.name !== PACKAGE_NAME) {
    fail(`lib/index.js exports name=${JSON.stringify(hostModule.name)}, expected ${JSON.stringify(PACKAGE_NAME)} — the Loader keys the row by it, a mismatch is only a warning and the row goes dead`)
  }
  if (!Array.isArray(hostModule.inject)) {
    fail(`lib/index.js exports inject=${JSON.stringify(hostModule.inject)}, expected an array of service names`)
  } else if (hostModule.inject.some((s) => typeof s !== 'string')) {
    fail('lib/index.js exports inject containing a non-string entry')
  } else {
    // The host half must never hard-require services: no webServer ⇒ it logs and
    // stays dormant (src/host/index.ts). Declaring one here would make cordis
    // refuse to activate the fiber in a profile without that service.
    if (hostModule.inject.length > 0) note(`host half declares inject=[${hostModule.inject.join(', ')}] — verify it degrades when the service is absent`)
  }
  if (typeof hostModule.apply !== 'function') {
    fail(`lib/index.js exports apply=${typeof hostModule.apply}, expected the cordis plugin function`)
  }
}

/**
 * Every SDK import must stay external. A bundle is only loadable in the DSH host
 * when its non-relative imports resolve out of the profile closure; `react` and
 * any other bare package that the closure does not carry would throw at load.
 */
const hostSpecifiers = importSpecifiers(host.text)
for (const specifier of hostSpecifiers) {
  if (specifier.startsWith('.') || specifier.startsWith('node:')) continue
  if (specifier.startsWith('@deepseek-ai/')) continue
  fail(`lib/index.js imports the bare package ${JSON.stringify(specifier)} — the host load closure only carries @deepseek-ai/* (plugin-anatomy §8); keep it external or drop it`)
}

// ---------------------------------------------------------------------------
// 2. Client half: the module-loader wrapper, and a factory that really runs.
// ---------------------------------------------------------------------------

const client = readArtifact('lib/client.js')

/**
 * The browser half contract, verbatim from the two installed manifests:
 *
 *   window.__ModuleLoader__.load({ id: '<package>', factory: (require) => { … return module.exports; } });
 *
 * Matched on the whole file (the wrapper spans lines) rather than on a prefix.
 */
const wrapper = new RegExp(
  `window\\.__ModuleLoader__\\.load\\(\\s*\\{\\s*id:\\s*["']${PACKAGE_NAME.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["']\\s*,\\s*factory:\\s*`,
).exec(client.text)
if (wrapper === null) {
  fail(`lib/client.js is not wrapped in \`window.__ModuleLoader__.load({ id: "${PACKAGE_NAME}", factory: … })\` — the host client loader would never materialize it (TEAM-BRIEF §2.2)`)
}
const loadCalls = client.text.match(/__ModuleLoader__\.load\(/g)?.length ?? 0
if (loadCalls !== 1) fail(`lib/client.js calls __ModuleLoader__.load ${loadCalls} times, expected exactly 1`)
if (!/return module\.exports;\s*\}\s*\}\s*\)\s*;?\s*(?:\/\/# sourceMappingURL=[^\n]*)?\s*$/.test(client.text.trimEnd())) {
  fail('lib/client.js does not end with `return module.exports; } });` — the factory must hand its exports back to the loader')
}

/**
 * Execute the wrapper against a stub loader so the factory is actually invoked:
 * a bundle can carry the right first line and still throw on materialization.
 * React is stubbed because it is external by design (the host supplies the real
 * singleton); no stub is expected to be complete — only to prove the factory
 * runs to completion inside the module table.
 */
const loaded = []
function stubReact() {
  const create = () => null
  return { createElement: create, Fragment: Symbol('Fragment'), useEffect: () => {}, useState: (v) => [v, () => {}], useMemo: (f) => f(), useRef: (v) => ({ current: v }), useCallback: (f) => f, jsx: create, jsxs: create, jsxDEV: create }
}
const globalScope = globalThis
const previousWindow = globalScope.window
const previousDocument = globalScope.document
const stubDocument = { documentElement: { lang: 'en' }, head: { appendChild: () => {} }, createElement: () => ({ setAttribute: () => {}, appendChild: () => {}, style: {}, dataset: {} }), querySelector: () => null, addEventListener: () => {}, removeEventListener: () => {} }
globalScope.window = globalScope
globalScope.document = previousDocument ?? stubDocument
globalScope.__ModuleLoader__ = { load: (spec) => loaded.push(spec) }
try {
  // eslint-disable-next-line no-new-func -- deliberately evaluating the artifact under test
  new Function(client.text)()
} catch (error) {
  fail(`lib/client.js threw while being materialized: ${String(error)}`)
}
globalScope.window = previousWindow
if (previousDocument === undefined) delete globalScope.document
delete globalScope.__ModuleLoader__

if (loaded.length === 1) {
  const spec = loaded[0]
  if (spec.id !== PACKAGE_NAME) fail(`__ModuleLoader__.load was called with id=${JSON.stringify(spec.id)}, expected ${JSON.stringify(PACKAGE_NAME)}`)
  if (typeof spec.factory !== 'function') {
    fail('__ModuleLoader__.load was called without a factory function')
  } else {
    const requireShim = (name) => {
      if (name === 'react' || name === 'react/jsx-runtime' || name === 'react/jsx-dev-runtime') return stubReact()
      if (name === 'react-dom' || name === 'react-dom/client') return { createRoot: () => ({ render: () => {}, unmount: () => {} }) }
      throw new Error(`unexpected require(${JSON.stringify(name)}) — the client bundle must keep react/react-dom/@deepseek-ai/* external, a copied dependency breaks the host's singleton`)
    }
    let exports
    try {
      exports = spec.factory(requireShim)
    } catch (error) {
      fail(`the client factory threw when invoked: ${String(error)}`)
    }
    if (exports !== undefined) {
      if (exports.name !== PACKAGE_NAME) fail(`the client half exports name=${JSON.stringify(exports.name)}, expected ${JSON.stringify(PACKAGE_NAME)}`)
      if (typeof exports.apply !== 'function') fail(`the client half exports apply=${typeof exports.apply}, expected the cordis plugin function`)
    } else {
      /**
       * A factory that returns `undefined` means the wrapper's body called
       * `return` at IIFE level (esbuild `format: 'iife'` + `globalName` on a CJS
       * module returns early, because the injected `module` object exists) and
       * the loader would receive nothing to materialize.
       */
      fail('the client factory returned undefined — the bundle body returns before `module.exports` is filled (esbuild iife+globalName wrapping a CJS module); use `format: \'cjs\'` so the runner emits the `return module.exports` epilogue')
    }
  }
}

// ---------------------------------------------------------------------------
// 3. Skin contract: no hardcoded colour reaches the browser bundle.
// ---------------------------------------------------------------------------

/**
 * Colours must ride the host's design tokens (`var(--dsw-alias-*)`, `var(--ds-*)`)
 * — guide §12 / TEAM-BRIEF §5. Scanned over the built bundle's string literals so
 * the check does not depend on how the sources are organised. Test assertions and
 * tests are not in the bundle, so they cannot mask a violation here.
 */
const stringLiterals = [...client.text.matchAll(/(["'`])((?:\\.|(?!\1)[^\\])*)\1/g)].map((m) => m[2])
const HEX = /#[0-9a-fA-F]{3,8}\b/
const FUNCTIONAL = /\b(?:rgba?|hsla?)\s*\(/i
const NAMED = /(?:^|[^\w-])(?:white|black|red|green|blue|gray|grey|silver|maroon|navy|teal|olive|purple|fuchsia|aqua|lime|yellow|orange)(?:$|[^\w-])/i
const ALLOWED_STRING = new Set(['currentColor', 'transparent', 'inherit'])
for (const literal of stringLiterals) {
  if (literal.length > 400) continue // CSS blobs are checked piecewise below
  if (ALLOWED_STRING.has(literal.trim())) continue
  if (HEX.test(literal) || FUNCTIONAL.test(literal) || NAMED.test(literal)) {
    const sample = literal.length > 90 ? `${literal.slice(0, 90)}…` : literal
    note(`possible hardcoded colour in a bundle string: ${JSON.stringify(sample)}`)
  }
}
// The stylesheet is injected as a larger string constant; scan it whole too.
for (const literal of stringLiterals) {
  if (literal.length <= 400) continue
  for (const match of literal.matchAll(new RegExp(`${HEX.source}|${FUNCTIONAL.source}`, 'gi'))) {
    note(`possible hardcoded colour in the injected stylesheet: ${JSON.stringify(match[0])}`)
  }
}

// ---------------------------------------------------------------------------
// 4. Report.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 4. The freshness guard in package.json must name HEAD.
// ---------------------------------------------------------------------------

/**
 * `pnpm run check` ends with a `lib/` freshness diff. Without a revision that
 * diff compares the WORKTREE against the INDEX, so it goes green the moment
 * `lib/` is staged — while `HEAD` still holds the stale bundles that the release
 * and the CI checkout actually contain. Measured with `lib/` staged:
 *
 *   git diff --exit-code -- lib       → 0   (false green)
 *   git diff --exit-code HEAD -- lib  → 1   (correct)
 *
 * That is a local-pass/CI-fail disagreement, i.e. exactly the kind of failure
 * that gets misread as a CI environment problem. Guarded here rather than only
 * in a test so it also fails in environments that run the verifier alone.
 */
const checkScript = PACKAGE.scripts?.check
if (typeof checkScript !== 'string' || checkScript.trim() === '') {
  fail('package.json#scripts.check is missing — the release gate has no freshness step')
} else {
  if (!/git diff --exit-code HEAD -- lib/.test(checkScript)) {
    fail('package.json#scripts.check must verify lib/ freshness with `git diff --exit-code HEAD -- lib` (a revision-less diff compares against the index and turns green once lib/ is staged)')
  }
  if (/(^|[^A-Za-z])git diff --exit-code -- lib/.test(checkScript)) {
    fail('package.json#scripts.check contains an index-based `git diff --exit-code -- lib` — it is green whenever lib/ is merely staged')
  }
}

// ---------------------------------------------------------------------------
// 5. Report.
// ---------------------------------------------------------------------------

const summarize = (list) => list.map((line) => `  - ${line}`).join('\n')
if (failures.length > 0) {
  console.error(`[verify-build] FAIL (${failures.length}):\n${summarize(failures)}`)
  if (notes.length > 0) console.error(`[verify-build] notes (${notes.length}):\n${summarize(notes)}`)
  process.exit(1)
}

console.log('[verify-build] OK')
console.log(`  host half   lib/index.js  — ESM, exports name/inject/apply (${hostSpecifiers.length} specifier(s), all @deepseek-ai/* or relative)`)
console.log(`  client half lib/client.js — window.__ModuleLoader__.load({ id: "${PACKAGE_NAME}", factory }) invoked once, factory returned exports`)
if (notes.length > 0) {
  console.log(`  notes (${notes.length}):`)
  console.log(summarize(notes))
}
