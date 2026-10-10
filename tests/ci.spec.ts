/**
 * CI workflow guard.
 *
 * The bug this exists to prevent is specific and was called out in the task:
 * `git diff --exit-code -- lib` must run **after** `pnpm run build`. Run before
 * the build, it compares the previous build's output against itself, always
 * passes, and a stale `lib/` ships green.
 *
 * A second, subtler version of the same false green was measured on 2026-10-11:
 * `git diff --exit-code -- lib` (no revision) compares the WORKING TREE against
 * the INDEX, so as soon as anyone runs `git add lib` it passes while HEAD still
 * holds the old artifact. Every freshness check must name `HEAD`.
 *
 * The gate is defined in two places — `.github/workflows/ci.yml` and
 * `package.json#scripts.check` — and BOTH are guarded here: the first from the
 * parsed YAML (comments stripped so prose cannot satisfy an assertion), the
 * second through `analyzeFreshnessScript`, which is itself unit-tested against
 * buggy scripts so this file cannot pass vacuously.
 */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const WORKFLOW = resolve(ROOT, '.github/workflows/ci.yml')

/** The workflow with comment lines removed, so prose cannot satisfy a check. */
const yaml = readFileSync(WORKFLOW, 'utf8')
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('#'))
  .join('\n')

/** Offset of the first line matching `pattern`, or -1. */
function offsetOf(pattern: RegExp): number {
  return yaml.search(pattern)
}

describe('CI workflow', () => {
  it('exists and is a GitHub Actions workflow', () => {
    expect(existsSync(WORKFLOW)).toBe(true)
    expect(yaml).toMatch(/^name:\s*CI/m)
    expect(yaml).toMatch(/^on:/m)
    expect(yaml).toMatch(/^\s*jobs:/m)
  })

  it('runs on ubuntu-latest', () => {
    expect(yaml).toContain('runs-on: ubuntu-latest')
  })

  it('tests node 20 and node 22', () => {
    expect(yaml).toMatch(/node:\s*\[[^\]]*['"]?20['"]?/)
    expect(yaml).toMatch(/node:\s*\[[^\]]*['"]?22['"]?/)
    expect(yaml).toContain('node-version:')
  })

  it('installs with a frozen lockfile', () => {
    expect(yaml).toContain('pnpm install --frozen-lockfile')
  })

  it('runs typecheck, test and build', () => {
    expect(yaml).toContain('pnpm run typecheck')
    expect(yaml).toContain('pnpm run test')
    expect(yaml).toContain('pnpm run build')
  })

  it('verifies the committed lib/ AFTER the build (never before)', () => {
    const build = offsetOf(/run:\s*pnpm run build/)
    const verify = offsetOf(/run:\s*pnpm run verify:build[^\n]*git diff --exit-code HEAD -- lib/)
    expect(build, 'the build step must exist').toBeGreaterThan(-1)
    expect(verify, 'the post-build step must run verify:build and diff lib/ against HEAD').toBeGreaterThan(-1)
    expect(verify, 'the lib/ freshness check must come after `pnpm run build`').toBeGreaterThan(build)
  })

  it('never uses the INDEX-based diff as the freshness check (a false green after `git add lib`)', () => {
    // Measured 2026-10-11 with lib/ staged but not committed:
    //   git diff --exit-code -- lib       → 0   (worktree vs INDEX: staged == worktree)
    //   git diff --exit-code HEAD -- lib  → 1   (HEAD still holds the stale scaffold)
    // The first spelling turns the stale-artifact gate green precisely when
    // someone stages a build, so every lib/ freshness check must name HEAD.
    expect(yaml, 'bare `git diff --exit-code -- lib` compares against the index').not.toMatch(/git diff --exit-code -- lib/)
    const diffs = [...yaml.matchAll(/git diff --exit-code[^\n]*/g)].map((match) => match[0].trim())
    expect(diffs.length, 'the workflow must actually diff lib/').toBeGreaterThan(0)
    for (const command of diffs) {
      expect(command, command).toMatch(/\bHEAD\b/)
      expect(command, command).toMatch(/--\s*lib/)
    }
  })

  it('never diffs lib/ before building', () => {
    const build = offsetOf(/run:\s*pnpm run build/)
    const beforeBuild = yaml.slice(0, build)
    expect(beforeBuild, 'a lib/-freshness diff before the build always passes').not.toMatch(/git diff --exit-code[^\n]*--\s*lib/)
  })

  it('runs the test suite before the build (a failing guard must fail the run early)', () => {
    expect(offsetOf(/run:\s*pnpm run test/)).toBeLessThan(offsetOf(/run:\s*pnpm run build/))
    expect(offsetOf(/run:\s*pnpm run typecheck/)).toBeLessThan(offsetOf(/run:\s*pnpm run test/))
  })

  it('checks out the repository and sets up pnpm before installing', () => {
    expect(offsetOf(/actions\/checkout@v\d/)).toBeLessThan(offsetOf(/pnpm install/))
    expect(offsetOf(/pnpm\/action-setup@v\d/)).toBeLessThan(offsetOf(/pnpm install/))
  })
})

/* ------------------------------------------------------------------------- */
/* `pnpm run check` — the same gate, one file over                            */
/* ------------------------------------------------------------------------- */

/**
 * The gate command lives in two places: this workflow and
 * `package.json#scripts.check`. The workflow was guarded above; the script was
 * NOT, so a regression there would only have been caught by
 * `scripts/verify-build.mjs` (packaging's verifier) and never by the suite.
 * Packaging asked for both nets; this is the suite's half.
 *
 * `analyzeFreshnessScript` is factored out so the guard can be proved to
 * discriminate (negative controls below) WITHOUT editing `package.json` —
 * mutating another owner's file just to watch a test go red is not worth the
 * concurrency risk.
 */
interface ScriptProblem {
  code: string
  message: string
}

/** Every problem that makes a freshness-check command unsound or mis-ordered. */
function analyzeFreshnessScript(script: string): ScriptProblem[] {
  const problems: ScriptProblem[] = []
  const diffs = [...script.matchAll(/git diff[^&|;\n]*--\s*lib/g)].map((match) => match[0].trim())
  if (diffs.length === 0) {
    problems.push({ code: 'missing', message: 'no lib/ freshness diff in the script' })
    return problems
  }
  for (const command of diffs) {
    // worktree-vs-INDEX (`git diff -- lib`) reports clean as soon as someone
    // stages a build, while HEAD may still hold the old artifact.
    if (!/\bHEAD\b/.test(command)) {
      problems.push({ code: 'index-based', message: `${command} compares against the index, not the commit` })
    }
  }
  const build = script.search(/pnpm run build/)
  const freshness = script.search(/git diff[^&|;\n]*--\s*lib/)
  if (build === -1 || freshness === -1 || freshness < build) {
    problems.push({ code: 'ordering', message: 'the freshness diff must run after `pnpm run build`' })
  }
  for (const step of ['pnpm run typecheck', 'pnpm run test', 'pnpm run build', 'pnpm run verify:build', 'pnpm run verify:meta']) {
    if (!script.includes(step)) problems.push({ code: 'missing-step', message: `${step} is not part of the gate` })
  }
  return problems
}

describe('package.json#scripts.check (the local equivalent of CI)', () => {
  const pkg = JSON.parse(readFileSync(resolve(ROOT, 'package.json'), 'utf8')) as { scripts?: Record<string, string> }
  const check = pkg.scripts?.check ?? ''

  it('exists', () => {
    expect(check, 'scripts.check is the documented pre-commit gate').not.toBe('')
  })

  it('verifies lib/ freshness against HEAD, after the build', () => {
    const problems = analyzeFreshnessScript(check)
    expect(problems.map((problem) => `${problem.code}: ${problem.message}`), check).toEqual([])
  })

  it('runs the whole pipeline in the CI order', () => {
    const order = ['pnpm run typecheck', 'pnpm run test', 'pnpm run build', 'pnpm run verify:build', 'pnpm run verify:meta']
      .map((step) => check.indexOf(step))
    for (const [index, position] of order.entries()) {
      expect(position, `${order[index]} must be present`).toBeGreaterThan(-1)
      if (index > 0) expect(position, `${order[index]} must follow ${order[index - 1]}`).toBeGreaterThan(order[index - 1] as number)
    }
  })

  it('the analyzer discriminates (otherwise the check above is vacuous)', () => {
    const codes = (script: string): string[] => analyzeFreshnessScript(script).map((problem) => problem.code)
    // The exact bug F7 was: worktree-vs-index looks clean once lib/ is staged.
    expect(codes('pnpm run build && git diff --exit-code -- lib')).toContain('index-based')
    // The original trap: diffing before the build compares the old build to itself.
    expect(codes('git diff --exit-code HEAD -- lib && pnpm run build')).toContain('ordering')
    expect(codes('pnpm run build')).toEqual(['missing'])
    // The HEAD form alone is still an incomplete gate.
    expect(codes('pnpm run build && git diff --exit-code HEAD -- lib')).toEqual([
      'missing-step',
      'missing-step',
      'missing-step',
      'missing-step',
    ])
    // The real script passes every rule.
    expect(analyzeFreshnessScript(check)).toEqual([])
  })
})
