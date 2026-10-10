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
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
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
 */
const clientOptions = {
  entryPoints: [resolve(root, 'src/client/index.ts')],
  outfile: resolve(root, 'lib/client.js'),
  bundle: true,
  format: 'iife',
  globalName: '__dshTaskGanttModule',
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

async function run() {
  rmSync(resolve(root, 'lib'), { recursive: true, force: true })
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
