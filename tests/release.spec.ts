/**
 * Release-consistency guards.
 *
 * Owner: Lead. These cross two files that belong to different owners — the wire
 * contract (`BUILD_LABEL`) and `package.json` (`version`) — so neither owner's
 * own spec is the right place for them.
 *
 * Why this exists: the panel identifies its build by the string the tester can
 * read off the footer (`BUILD_LABEL`). That string is only useful if it tracks
 * the release the repository actually published, and the two are edited in
 * different files at different times. A mismatch is invisible at runtime — the
 * panel happily renders "v0.1.0" on a 0.2.0 build — which is the same
 * silent-failure shape this project keeps removing.
 */
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { BUILD_LABEL } from '../src/shared/contract.ts'

function read(relative: string): string {
  return readFileSync(new URL(relative, new URL('..', import.meta.url)), 'utf8')
}

interface Manifest {
  version?: unknown
}

describe('release consistency', () => {
  const manifest = JSON.parse(read('package.json')) as Manifest

  it('declares a semver version', () => {
    expect(typeof manifest.version).toBe('string')
    expect(manifest.version as string).toMatch(/^\d+\.\d+\.\d+$/)
  })

  it('names that exact version in BUILD_LABEL, so the footer cannot lie', () => {
    // The panel's build identity must contain the published version. Kept as a
    // containment check, not equality: the label deliberately also carries what
    // the build contains ("tracks+peer-colour+message-body").
    expect(BUILD_LABEL).toContain(manifest.version as string)
  })

  it('records that version in CHANGELOG.md', () => {
    // A release with no changelog entry is one nobody can date. The heading
    // form is fixed so the check cannot be satisfied by an incidental mention.
    const changelog = read('CHANGELOG.md')
    expect(changelog).toMatch(new RegExp(`^## ${manifest.version}\\b`, 'm'))
  })

  it('keeps the version prefix adjacent to the number', () => {
    // Guards the check above from passing on a coincidence: the version must
    // appear immediately after a `v` at the start of the label, which is what a
    // reader scanning the footer actually sees.
    expect(BUILD_LABEL.startsWith(`v${manifest.version as string}`)).toBe(true)
  })

  it('does not let the label go stale against a changelog-only bump', () => {
    // Cheap canary for the real mistake: bumping package.json and forgetting
    // the contract (or vice versa). Both files must mention the same version.
    const contract = read('src/shared/contract.ts')
    const version = manifest.version as string
    expect(contract).toContain(version)
  })
})
