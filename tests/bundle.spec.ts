/**
 * Build-artifact guards for `lib/` (owner: packaging).
 *
 * `lib/` is INTENTIONALLY committed (`.gitignore`): the bundle channel installs
 * straight from GitHub with no build step, so the committed artifacts are what a
 * user actually runs. Their shape is a host contract, read first-hand from
 * `@deepseek-ai/dsh-client-modules` inside `app.asar`:
 *
 *   "Executing a plugin bundle only registers its factory; every module-body
 *    side effect (CSS injection included) lives in the factory closure and runs
 *    at materialization (`window.__ModuleLoader__.load({id, factory})`)."
 *
 * and from the two shipped third-party bundles
 * (`dsh-chat-tidy@0.4.0/lib/client.js`, `dsh-ego-browser@0.8.6/lib/client.js`),
 * which share the exact byte shape asserted below.
 *
 * `pnpm run build` must be run before this file is meaningful; CI runs it
 * before `verify:build` for exactly that reason (see `tests/ci.spec.ts`).
 */
import { readFileSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function read(relative: string): string {
  return readFileSync(resolve(ROOT, relative), 'utf8')
}

/** Non-empty lines with sourcemap trailers removed. */
function codeLines(source: string): string[] {
  return source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('//#'))
}

describe('lib/client.js — the browser half', () => {
  const client = read('lib/client.js')
  const lines = codeLines(client)

  it('registers a factory on the host module loader with this plugin id', () => {
    // Byte shape verified against dsh-chat-tidy / dsh-ego-browser bundles.
    expect(lines[0]).toMatch(/^window\.__ModuleLoader__\.load\(\{\s*id:\s*"dsh-task-gantt",\s*factory:\s*\(require\)\s*=>\s*\{/)
  })

  it('ends the factory by returning module.exports', () => {
    expect(lines.at(-1)).toBe('return module.exports; } });')
  })

  it('exposes the plugin id used by the Loader row', () => {
    expect(client).toContain('"dsh-task-gantt"')
  })

  it('resolves React from the host platform table instead of bundling it', () => {
    // The host seeds React into PLATFORM_MODULES; a second copy would break
    // hooks (two React instances) and bloat the bundle.
    expect(client).toContain('require("react")')
    expect(client).toContain('require("react/jsx-runtime")')
    expect(client, 'React must not be inlined').not.toMatch(/react\.production\.min\.js|react\.development\.js|ReactCurrentOwner/)
  })

  it('inlines no other DSH runtime (no stray value imports)', () => {
    const requires = [...client.matchAll(/require\(\s*"([^"]+)"\s*\)/g)].map((match) => match[1] as string)
    for (const specifier of requires) {
      expect(
        ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client'].includes(specifier) || specifier.startsWith('@deepseek-ai/'),
        `unexpected runtime require(${specifier}) — it must be external`,
      ).toBe(true)
    }
  })

  it('carries the tab registration and the frozen tab id', () => {
    expect(client).toContain('dsh-task-gantt:board')
    expect(client).toContain('registerTab')
  })

  it('is not empty or a stub', () => {
    expect(client.length).toBeGreaterThan(1000)
  })
})

describe('lib/index.js — the host half', () => {
  const index = read('lib/index.js')

  it('is ESM and exports exactly apply / inject / name', () => {
    const exportBlock = /export\s*\{([\s\S]*?)\}/.exec(index)?.[1] ?? ''
    const exported = exportBlock.split(',').map((name) => name.trim()).filter((name) => name !== '').sort()
    expect(exported).toEqual(['apply', 'inject', 'name'])
  })

  it('carries no CommonJS require (the host half is ESM only)', () => {
    expect(index).not.toMatch(/\brequire\s*\(/)
  })

  it('carries no browser module loader call (halves must not be swapped)', () => {
    expect(index).not.toContain('__ModuleLoader__')
  })

  it('registers the route prefix and the plugin name', () => {
    expect(index).toContain('/dsh-task-gantt/api')
    expect(index).toContain('dsh-task-gantt')
  })

  it('imports nothing at runtime (every @deepseek-ai/* import is type-only)', () => {
    // A value import of `@deepseek-ai/cordis` would make the host half depend on
    // a module the deployment resolves itself; the plugin only needs types.
    expect(index).not.toMatch(/^\s*import\s/m)
  })
})

describe('source maps', () => {
  it('ships a map for each bundle (HMR and stack traces use them)', () => {
    for (const map of ['lib/client.js.map', 'lib/index.js.map']) {
      const parsed = JSON.parse(read(map)) as { version?: number; sources?: unknown[] }
      expect(parsed.version, map).toBe(3)
      expect(Array.isArray(parsed.sources), map).toBe(true)
    }
  })
})

describe('on-demand chunk naming (host constraint)', () => {
  /**
   * Read first-hand out of the host bundle
   * (`@deepseek-ai/dsh-client-modules/lib/index.js` inside `app.asar`):
   *
   *   /** Published package-local client chunk names accepted by the on-demand
   *       route. *\/
   *   const CLIENT_CHUNK = /^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$/
   *   … if (registration.chunk !== void 0 && !CLIENT_CHUNK.test(registration.chunk)) throw …
   *
   * This plugin registers no `chunk` (one entry file, no `require.async`), so
   * the rule is not exercised today. It is pinned anyway because the failure
   * mode is a thrown registration the moment someone code-splits the client
   * half: `client-<hash>.js` or `client.js` would both be rejected.
   */
  const HOST_CLIENT_CHUNK = /^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$/

  it('ships the entry bundle as lib/client.js (the file exports["./client"] names)', () => {
    const entries = readdirSync(resolve(ROOT, 'lib')).filter((name) => name.endsWith('.js'))
    expect(entries).toContain('client.js')
    expect(entries).toContain('index.js')
  })

  it('names any additional client chunk the way the host accepts', () => {
    const chunks = readdirSync(resolve(ROOT, 'lib')).filter((name) => /^client\..*\.js$/.test(name))
    for (const name of chunks) {
      expect(name, `lib/${name} must match the host's CLIENT_CHUNK pattern`).toMatch(HOST_CLIENT_CHUNK)
    }
  })

  it('the host pattern itself rejects the shapes we must avoid', () => {
    // Non-vacuous: prove the regex discriminates, so the check above cannot
    // pass by accident.
    for (const bad of ['client-abc123.js', 'client.js', 'chunk.client.abc.js', 'client..js']) {
      expect(bad, bad).not.toMatch(HOST_CLIENT_CHUNK)
    }
    expect('client.abc123.js').toMatch(HOST_CLIENT_CHUNK)
  })
})
