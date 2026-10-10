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
 *   `PLATFORM_MODULES`, and the built `lib/client.js` therefore only
 *   `require`s them). React **is** a devDependency here (for `.tsx`
 *   typechecking), but the alias is still deliberate, for correctness rather
 *   than resolution: measured with the installed react 18.3.1, invoking a
 *   component that calls `useState` outside a renderer throws React's
 *   "Invalid hook call". The stubs in `tests/stubs/` return inert hook values
 *   so a component function can be **called** and its element tree inspected
 *   with no renderer and no jsdom. Rendering is not covered here — the
 *   real-machine smoke does that (docs/VALIDATION.md §1.2, §3.3).
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
