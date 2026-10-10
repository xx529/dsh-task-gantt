/**
 * Manifest guards (calibrated against `dsh-better-sidebar/tests/market-manifest.spec.ts`
 * and the brief §2.1/§2.3 hard constraints).
 *
 * These rules are the difference between "the plugin loads" and "the profile
 * silently disables the row with one stderr line nobody reads":
 *
 * - a startup compatibility preflight evaluates `semver.satisfies(hostVersion, range)`
 *   for every peer named `@deepseek-ai/dsh` or `@deepseek-ai/dsh-*` and disables
 *   the WHOLE profile row on failure, `optional` granting no exemption;
 * - the community market hard-rejects `cordis` in any dependency field and any
 *   install lifecycle script;
 * - the host's client-module loader (`@deepseek-ai/dsh-client-modules`, read out
 *   of `app.asar`) requires `dsh.client.platform === 'web'` plus an
 *   `exports["./client"]` string **or** `{ default: string }`, and throws
 *   otherwise (`client-modules: <pkg> declares dsh.client but exports no
 *   "./client" bundle`).
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

interface Manifest {
  name?: string
  version?: string
  main?: string
  types?: string
  exports?: Record<string, unknown>
  files?: string[]
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  optionalDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, unknown>
  dsh?: {
    bundle?: { patch?: string }
    client?: { platform?: string; inject?: string[]; external?: string[]; immediately?: boolean }
  }
  repository?: { type?: string; url?: string }
  engines?: { node?: string }
}

const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as Manifest

/** The market's lifecycle-script reject list. */
const LIFECYCLE_SCRIPTS = ['preinstall', 'install', 'postinstall', 'prepare'] as const

/** Exact SemVer (prerelease allowed; no range, no tag). */
const EXACT_SEMVER = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/u

describe('market manifest compatibility', () => {
  it('declares no `cordis` entry in any dependency field', () => {
    for (const field of ['dependencies', 'peerDependencies', 'optionalDependencies'] as const) {
      const deps = pkg[field]
      if (deps === undefined) continue
      expect(Object.keys(deps), field).not.toContain('cordis')
    }
  })

  it('declares no install lifecycle scripts', () => {
    const scripts = pkg.scripts ?? {}
    for (const script of LIFECYCLE_SCRIPTS) {
      expect(scripts, script).not.toHaveProperty(script)
    }
  })

  it('keeps every DSH peer out of peerDependencies (the startup preflight disables the row on a range miss)', () => {
    // Brief §2.3: only the vendored @deepseek-ai/cordis may be a peer. Every
    // other @deepseek-ai/dsh-* name risks the preflight; `dsh-better-sidebar`
    // is reached structurally instead (src/shared/contract.ts).
    const peers = Object.keys(pkg.peerDependencies ?? {})
    const forbidden = peers.filter((name) => name === '@deepseek-ai/dsh' || name.startsWith('@deepseek-ai/dsh-'))
    expect(forbidden, `these peers would be semver-checked against the host and can disable the row: ${forbidden.join(', ')}`).toEqual([])
    for (const name of peers) {
      expect(name, `unexpected peer ${name}`).toBe('@deepseek-ai/cordis')
    }
  })

  it('pins the cordis peer to a range that admits the installed runtime', () => {
    const range = pkg.peerDependencies?.['@deepseek-ai/cordis']
    expect(range, 'the cordis peer is how the Context type resolves').toBeDefined()
    // The installed dev tree carries @deepseek-ai/cordis 4.0.4; a caret on 4.x
    // admits it. A pin would break on the next minor.
    expect(range).toMatch(/^\^4\./)
  })

  it('is named exactly dsh-task-gantt (the Loader row name must equal the package name)', () => {
    expect(pkg.name).toBe('dsh-task-gantt')
  })

  it('declares an exact SemVer version', () => {
    expect(pkg.version).toMatch(EXACT_SEMVER)
  })

  it('declares an https GitHub repository with owner/repo and no credentials', () => {
    const url = new URL(pkg.repository?.url ?? '')
    expect(url.protocol).toBe('https:')
    expect(url.hostname.toLowerCase()).toBe('github.com')
    expect(url.username).toBe('')
    expect(url.password).toBe('')
    expect(url.search).toBe('')
    expect(url.hash).toBe('')
    expect(url.pathname.split('/').filter(Boolean)).toHaveLength(2)
  })

  it('supports the node version CI runs', () => {
    expect(pkg.engines?.node).toBeDefined()
    const minimum = Number((pkg.engines?.node ?? '').replace(/[^\d]/g, ''))
    expect(minimum).toBeGreaterThanOrEqual(20)
  })
})

describe('host discovery surface', () => {
  it('points main at the host half and keeps it inside the package', () => {
    expect(pkg.main).toBe('./lib/index.js')
    expect(existsSync(resolve(ROOT, 'lib/index.js')), 'lib/index.js must be committed (the bundle channel installs with no build step)').toBe(true)
  })

  it('exposes ./client as a string or an object with a string default', () => {
    // Read verbatim from the host's client-modules bundle:
    //   clientExportOf(): accepts a string, or { default: string }, else throws.
    const client = pkg.exports?.['./client']
    const resolved = typeof client === 'string' ? client : (client as { default?: unknown } | undefined)?.default
    expect(typeof resolved, 'exports["./client"] must resolve to a string path').toBe('string')
    expect(resolved).toBe('./lib/client.js')
    expect(existsSync(resolve(ROOT, (resolved as string).replace(/^\.\//, '')))).toBe(true)
  })

  it('declares dsh.client.platform === "web" (any other value silently drops the browser half)', () => {
    expect(pkg.dsh?.client?.platform).toBe('web')
  })

  it('keeps dsh.client.inject empty (a name with no client row is skipped, but an empty list is the safe default)', () => {
    // Host behaviour, read from the client-modules bundle:
    //   parseDshClient(): optional string array, validated, else throws;
    //   arriveGraphRow(): `for (const packageName of row.inject) { const
    //   dependency = this.graphRows.get(packageName); if (dependency !== void 0) … }`
    //   → an unknown name is ignored, never an error. The plugin therefore
    //   resolves better-sidebar structurally instead of ordering on it.
    const inject = pkg.dsh?.client?.inject
    if (inject === undefined) return
    expect(Array.isArray(inject)).toBe(true)
    for (const name of inject) expect(typeof name).toBe('string')
  })

  it('declares a safe bundle patch that exists in the package', () => {
    const patch = pkg.dsh?.bundle?.patch
    expect(patch).toBe('./cordis.patch.yml')
    const relative = (patch as string).slice(2)
    expect(relative.startsWith('/')).toBe(false)
    expect(relative.includes('\\')).toBe(false)
    expect(relative.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..')).toBe(true)
    expect(existsSync(resolve(ROOT, relative))).toBe(true)
  })

  it('the bundle patch inserts exactly this package name', () => {
    const patch = readFileSync(resolve(ROOT, 'cordis.patch.yml'), 'utf8')
    expect(patch).toMatch(/- insert:/)
    expect(patch).toMatch(/name:\s*'dsh-task-gantt'/)
    expect(patch).toMatch(/id:\s*dsh-task-gantt/)
  })

  it('ships lib, the bundle patch and the icon in `files`', () => {
    for (const entry of ['lib', 'cordis.patch.yml', 'icon.svg', 'LICENSE']) {
      expect(pkg.files, `${entry} must be published`).toContain(entry)
    }
  })

  it('keeps every file referenced by `files` present in the repo', () => {
    for (const entry of pkg.files ?? []) {
      if (entry.includes('*')) continue
      expect(existsSync(resolve(ROOT, entry)), `${entry} is declared in files[] but missing`).toBe(true)
    }
  })

  it('exposes every script the quality gate and CI rely on', () => {
    for (const script of ['typecheck', 'test', 'build']) {
      expect(pkg.scripts?.[script], `scripts.${script} is required`).toBeTruthy()
    }
  })
})
