/**
 * Vitest configuration for the verification suite (owner: teammate `verify`).
 *
 * Design decisions, and why:
 *
 * - `environment: 'node'` — the contract, the host half's folding, the route
 *   handler and the client half's pure layout/i18n functions are all plain
 *   JavaScript and need no DOM. NOTHING in this repo needs jsdom: the client
 *   half is exercised with a stubbed React (see `resolve.alias` below) and the
 *   route is exercised with fake `req`/`res` objects. Keeping jsdom out keeps
 *   CI hermetic and the dependency surface small (a real 3rd-party plugin,
 *   `dsh-chat-tidy`, tests with jsdom only because it drives real DOM APIs).
 *
 * - `resolve.alias` — `react` / `react/jsx-runtime` are *host-provided* modules
 *   in the browser (`@deepseek-ai/dsh-client-modules` seeds React into
 *   `PLATFORM_MODULES` and the plugin bundle `require`s it). React is not a
 *   dependency of this package, so a test that imports a `.tsx` module would
 *   fail to resolve. The stubs in `tests/stubs/` are deliberately trivial: they
 *   let a component function be **called** and its element tree inspected
 *   without pulling React into the package or depending on a renderer.
 */
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const ROOT = dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: [
      { find: /^react$/, replacement: resolve(ROOT, 'tests/stubs/react.ts') },
      { find: /^react\/jsx-runtime$/, replacement: resolve(ROOT, 'tests/stubs/react-jsx-runtime.ts') },
    ],
  },
  test: {
    environment: 'node',
    include: ['tests/**/*.spec.ts'],
    restoreMocks: true,
    // i18n detection is tested by stubbing `document` / `navigator`; those
    // globals must not leak into the next test (or into another spec file
    // sharing the worker).
    unstubGlobals: true,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
})
