/**
 * Build of dsh-task-gantt.
 *
 * Two artifacts, matching what a DSH web-profile plugin is:
 *
 * - `lib/index.js`  — the HOST half: ESM, every SDK import left external
 *   (`@deepseek-ai/*` is provided by the DSH runtime at load time).
 * - `lib/client.js` — the CLIENT half: the browser bundle format the DSH client
 *   module loader expects, i.e. `window.__ModuleLoader__.load({ id, factory })`
 *   where `factory(require)` returns the module exports and `require` resolves
 *   `react` / `react-dom` / `@deepseek-ai/*` from the host's own module table.
 *
 * No CSS file is emitted: the client's stylesheet is a TS string constant that
 * the client half inserts through the module loader's `styles` API (with a
 * `<style>` fallback), so the panel keeps working when the page's transport
 * base is a sub-path.
 */
import { build, context } from 'esbuild'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, '')
const watch = process.argv.includes('--watch')

/**
 * A shared resolver config: this repo uses Node-style explicit `.ts` /
 * `.tsx` import specifiers (so `node --experimental-strip-types` and vitest
 * can run the sources directly), which esbuild does not try by default.
 */
const resolveExtensions = ['.ts', '.tsx', '.mjs', '.js', '.json']

/** Every dependency the DSH runtime (host) or module loader (browser) provides. */
const DSH_EXTERNAL = ['@deepseek-ai/*']

/** The plugin's own package name — the loader id the client bundle registers. */
const PACKAGE_NAME = 'dsh-task-gantt'

/** Host half: plain ESM, SDK external. */
const hostOptions = {
  entryPoints: [resolve(root, 'src/host/index.ts')],
  outfile: resolve(root, 'lib/index.js'),
  bundle: true,
  format: 'esm',
  platform: 'node',
  target: 'node20',
  sourcemap: true,
  external: DSH_EXTERNAL,
  resolveExtensions,
  logLevel: 'info',
}

/**
 * Client half: the module-loader wrapper is prepended, the bundle body carries
 * the factory's `require` verbatim, and the loader assigns `module.exports`.
 *
 * `format: 'cjs'` is load-bearing, not cosmetic. The wrapper pre-declares
 * `var module`/`var exports` inside the factory (that is the format the host's
 * `__ModuleLoader__` expects), so esbuild's *iife* runner detects CommonJS in
 * the scope and SKIPS its `return __toCommonJS(index_exports)` epilogue: the
 * bundle's real exports are written to the injected `module` object and the
 * factory hands `undefined` back to the loader — the tab silently never
 * appears. `cjs` emits that epilogue and is otherwise the same wrapper.
 *
 * Evidence (`node scripts/verify-build.mjs`, which asserts the factory's return
 * value; the run is recorded in docs/INSTALL.md §6):
 *   - `format: 'iife'` + `globalName` → FAIL "the client factory returned
 *     undefined";
 *   - `format: 'cjs'` → OK, factory returned exports (name/apply present).
 * Reproduced against a pristine `git archive HEAD` tree, so it is independent
 * of the work-in-progress sources.
 */
const clientOptions = {
  entryPoints: [resolve(root, 'src/client/index.ts')],
  outfile: resolve(root, 'lib/client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'es2020',
  sourcemap: true,
  external: ['react', 'react-dom', 'react/jsx-runtime', ...DSH_EXTERNAL],
  resolveExtensions,
  banner: {
    js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(PACKAGE_NAME)}, factory: (require) => { var module = { exports: {} }; var exports = module.exports;\n`,
  },
  footer: {
    js: '\nreturn module.exports; } });',
  },
  logLevel: 'info',
}

/** Type declarations for the host half (the client half is untyped by design). */
function writeTypes() {
  mkdirSync(resolve(root, 'lib'), { recursive: true })
  writeFileSync(
    resolve(root, 'lib/index.d.ts'),
    [
      "import type { Context } from '@deepseek-ai/cordis'",
      '',
      `export declare const name: ${JSON.stringify(PACKAGE_NAME)}`,
      'export declare const inject: readonly string[]',
      'export declare function apply(ctx: Context): void',
      '',
    ].join('\n'),
  )
}

/**
 * Pre-build guard: the stylesheet's CSS lives in a template literal, so a stray
 * character of the wrong kind inside it terminates the literal early and the file
 * stops being valid TypeScript.
 *
 * Why this exists as a BUILD step rather than only a runtime assertion: the
 * module-level `assertNoBackticksInCss` in `styles.ts` can only fire once the
 * module is LOADED, so the mistake is otherwise discovered by `tsc` — whose error
 * points at the truncation, not at the character that caused it. This repository
 * has paid for that lesson four times, so it is checked here, before anything is
 * emitted.
 *
 * The same applies to a `${` sequence, which would start an interpolation inside
 * the literal.
 *
 * On failure the process exits non-zero BEFORE `lib/` is created, so a broken
 * source can never leave a stale-looking artifact behind.
 *
 * @param file - path of the stylesheet module, relative to the repo root.
 */
function assertCssTemplateIsLiteral(file) {
  const absolute = resolve(root, file)
  const source = readFileSync(absolute, 'utf8')
  const marker = 'export const BOARD_CSS = `'
  const start = source.indexOf(marker)
  if (start === -1) {
    console.error(`[dsh-task-gantt] build guard: could not find BOARD_CSS in ${file}`)
    process.exit(1)
  }
  const bodyStart = start + marker.length
  // The literal ends at the first closing marker on its own line.
  const end = source.indexOf('\n`\n', bodyStart)
  if (end === -1) {
    console.error(`[dsh-task-gantt] build guard: BOARD_CSS template literal is unterminated in ${file}`)
    process.exit(1)
  }
  const body = source.slice(bodyStart, end)
  const lineOffset = source.slice(0, bodyStart).split('\n').length - 1
  const offences = []
  for (const [index, line] of body.split('\n').entries()) {
    for (const [label, needle] of [['a backtick', '`'], ['an interpolation start', '${']]) {
      if (line.includes(needle)) {
        offences.push({ line: lineOffset + index + 1, label, text: line })
      }
    }
  }
  if (offences.length === 0) return
  console.error(`[dsh-task-gantt] build guard FAILED in ${file}:`)
  for (const offence of offences) {
    console.error(`  line ${offence.line}: ${offence.label} inside the CSS template literal`)
    console.error(`    ${offence.text.trim()}`)
  }
  console.error(
    '  A backtick (or "${") closes the template literal early, which makes the whole\n' +
      '  module invalid — and the module-load assertion cannot catch it because the file\n' +
      '  never finishes loading. Describe the character in words instead of writing it.',
  )
  process.exit(1)
}

async function run() {
  // A broken stylesheet must not produce artifacts — and must not leave a
  // previous build sitting there looking like a good one either. So the stale
  // output is removed FIRST, then the source is validated, then the directory is
  // recreated for the compilers. A failure therefore exits with no `lib/` at all,
  // which is what makes "the tree has a bundle" mean "the sources were valid".
  rmSync(resolve(root, 'lib'), { recursive: true, force: true })
  assertCssTemplateIsLiteral('src/client/ui/styles.ts')
  mkdirSync(resolve(root, 'lib'), { recursive: true })
  if (watch) {
    const host = await context(hostOptions)
    const client = await context(clientOptions)
    await Promise.all([host.watch(), client.watch()])
    writeTypes()
    console.log('[dsh-task-gantt] watching…')
    return
  }
  await Promise.all([build(hostOptions), build(clientOptions)])
  writeTypes()
  console.log('[dsh-task-gantt] built lib/index.js + lib/client.js')
}

await run()
