/**
 * Theme contract: the plugin owns no color of its own (guide §12, brief §5).
 *
 * Two halves, and both matter:
 *
 * 1. **The repo scan** — every file under `src/client/` (the browser half, the
 *    only half that paints) is scanned; any finding fails.
 * 2. **The scanner's own calibration** — synthetic sources prove the scanner
 *    flags literals and does NOT flag the token-only spellings. Without this a
 *    silently-empty scan would look like a clean repo.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { scanThemeSource, stripComments } from './helpers/theme-scan.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The scanned surface: the client half. */
const SCANNABLE = /\.(?:ts|tsx|css|scss|less)$/

/** Repo-relative POSIX paths of every client source file. */
function clientSources(): string[] {
  return readdirSync(resolve(ROOT, 'src/client'), { recursive: true, encoding: 'utf8' })
    .filter((name) => SCANNABLE.test(name))
    .map((name) => `src/client/${name.split(sep).join('/')}`)
    .sort()
}

describe('theme contract (live repo scan)', () => {
  it('scans a non-empty set of client files (a no-op scan cannot pass)', () => {
    const files = clientSources()
    // Guard the glob itself: this suite is worthless if it matches nothing.
    expect(files.length, `scanned: ${files.join(', ')}`).toBeGreaterThan(0)
    for (const file of files) expect(file).toMatch(/^src\/client\//)
  })

  it('src/client/** carries zero hardcoded colors', () => {
    const files = clientSources()
    const findings = files.flatMap((file) => scanThemeSource(file, readFileSync(resolve(ROOT, file), 'utf8')))
    const report = findings.map((finding) => `${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`).join('\n')
    expect(findings, `hardcoded colors found (use var(--dsw-*) / var(--ds-*) tokens):\n${report}`).toEqual([])
  })

  it('the stylesheet the client injects is reachable and token-only', () => {
    // The plugin injects its CSS from a client module; if a stylesheet is added
    // it MUST live under src/client so the scan above sees it. This asserts the
    // scan surface itself stays honest as the plugin grows.
    const files = clientSources()
    const stylesheets = files.filter((file) => file.endsWith('.css'))
    for (const file of stylesheets) {
      const source = readFileSync(resolve(ROOT, file), 'utf8')
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
      expect(source, file).not.toMatch(/\brgba?\(/)
    }
  })
})

describe('theme scanner calibration (positive controls: these must be RED)', () => {
  const red: ReadonlyArray<[string, string, string]> = [
    ['hex 3', 'a { color: #fff; }', 'color-literal'],
    ['hex 6', 'a { background: #112233; }', 'color-literal'],
    ['hex 8', 'a { border-color: #11223344; }', 'color-literal'],
    ['rgb()', 'a { color: rgb(1, 2, 3); }', 'color-literal'],
    ['rgba()', 'a { box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.2); }', 'color-literal'],
    ['hsl()', 'a { color: hsl(200 50% 50%); }', 'color-literal'],
    ['oklch()', 'a { color: oklch(0.7 0.1 200); }', 'color-literal'],
    ['js hex string', "const style = { color: '#deadbe' }", 'color-literal'],
    ['jsx attribute', '<div fill="#abc" />', 'color-literal'],
    ['named color (css)', 'a { color: red; }', 'named-color'],
    ['named color (js)', "const style = { background: 'white' }", 'named-color'],
    ['named color in gradient', 'a { background: linear-gradient(red, blue); }', 'named-color'],
    ['non-theme var', 'a { color: var(--my-own-token); }', 'non-token-paint'],
    ['non-theme var mixed', 'a { background: linear-gradient(90deg, var(--dsw-alias-bg-layer-1), var(--brand-color)); }', 'non-token-paint'],
  ]
  it.each(red)('flags %s', (_label, source, kind) => {
    const findings = scanThemeSource('synthetic.ts', source)
    expect(findings.map((finding) => finding.kind), JSON.stringify(findings)).toContain(kind)
  })

  it('reports the literal itself, not a generic message', () => {
    const [finding] = scanThemeSource('synthetic.ts', 'a { color: #ff0000; }')
    expect(finding?.text).toContain('#ff0000')
    expect(finding?.line).toBe(1)
  })

  it('reports the correct line for a multi-line file', () => {
    const findings = scanThemeSource('synthetic.ts', ['a {', '  color: var(--dsw-alias-text-1);', '}', 'b { color: #000; }'].join('\n'))
    expect(findings).toHaveLength(1)
    expect(findings[0]?.line).toBe(4)
  })
})

describe('theme scanner calibration (negative controls: these must be GREEN)', () => {
  const green: ReadonlyArray<[string, string]> = [
    ['token color', 'a { color: var(--dsw-alias-text-1); }'],
    ['alias background', 'a { background: var(--dsw-alias-bg-layer-1); }'],
    ['host --ds- token', 'a { color: var(--ds-text-primary); }'],
    ['border token', 'a { border: 0.5px solid var(--dsw-alias-border-l4); }'],
    ['transparent', 'a { color: transparent; }'],
    ['currentColor', 'a { color: currentColor; }'],
    ['inherit', 'a { color: inherit; }'],
    ['none', 'a { background: none; }'],
    ['zero border', 'a { border: 0; outline: 0; }'],
    ['color-mix of tokens', 'a { color: color-mix(in srgb, var(--dsw-alias-text-1) 60%, transparent); }'],
    ['box-shadow token', 'a { box-shadow: 0 1px 2px var(--dsw-alias-shadow-1); }'],
    ['font stack', "a { font-family: var(--ds-font-family-code); font-size: 11px; }"],
    ['js style object with token', "const s = { color: 'var(--dsw-alias-text-1)', background: 'var(--dsw-alias-bg-layer-1)' }"],
    ['comment with literal', 'a { /* color: #fff */ }'],
    ['line comment with literal', '// color: #fff\na { color: var(--dsw-alias-text-1); }'],
    ['svg currentColor', '<svg stroke="currentColor" fill="none" />'],
    ['no paint at all', 'a { margin: 4px; padding: 8px; }'],
  ]
  it.each(green)('accepts %s', (_label, source) => {
    const findings = scanThemeSource('synthetic.ts', source)
    expect(findings, JSON.stringify(findings)).toEqual([])
  })

  it('stripComments preserves byte offsets and line numbers', () => {
    const source = 'a { color: #fff; } /* #000 */\n// #111\nb { color: #222; }'
    const stripped = stripComments(source)
    expect(stripped.length).toBe(source.length)
    expect(stripped.split('\n')).toHaveLength(source.split('\n').length)
    expect(stripped).toContain('a { color: #fff; }')
    expect(stripped).not.toContain('#000')
    expect(stripped).not.toContain('#111')
  })
})

/* ------------------------------------------------------------------------- */
/* The stylesheets are TEMPLATE LITERALS: a stray backtick breaks the file     */
/* ------------------------------------------------------------------------- */

/**
 * ui-2 hit this TWICE in `styles.ts`: writing a backtick-quoted word inside a
 * CSS comment (`` `markdown-citation` ``, `` `position: absolute` ``)
 * terminates the enclosing template literal. The failure mode is nasty because
 * the file is only imported indirectly: the whole importing spec fails to
 * transform and reads like a code regression rather than a typo in prose.
 *
 * WHAT THE OBVIOUS CHECK MISSES (measured, not assumed): the incidents used a
 * backtick PAIR, so the file has an even number of backticks and a parity test
 * passes it. What actually happens is that the single 17 430-char CSS body of
 * styles.ts is cut into two fragments, the first of which opens a block comment
 * that never closes. That is the signal asserted here, because it is robust: it
 * does not care how many template literals the file legitimately has
 * (panel-source has 3, see the measurement in docs/VALIDATION.md 1.6).
 *
 * NOTE (learned the hard way while writing this file): the literal delimiters of
 * a block comment must never appear inside this doc comment either — writing
 * them closed the comment early and broke this very file.
 */
function templateBodies(source: string): string[] {
  const bodies: string[] = []
  let index = 0
  let quote: string | null = null
  while (index < source.length) {
    const ch = source[index] as string
    if (quote !== null) {
      if (ch === '\\') {
        index += 2
        continue
      }
      if (ch === quote) quote = null
      index += 1
      continue
    }
    if (ch === '/' && source[index + 1] === '/') {
      const end = source.indexOf('\n', index)
      index = end === -1 ? source.length : end
      continue
    }
    if (ch === '/' && source[index + 1] === '*') {
      const end = source.indexOf('*/', index + 2)
      index = end === -1 ? source.length : end + 2
      continue
    }
    if (ch === '"' || ch === "'") {
      quote = ch
      index += 1
      continue
    }
    if (ch === '`') {
      let cursor = index + 1
      let depth = 0
      let body = ''
      while (cursor < source.length) {
        const inner = source[cursor] as string
        if (inner === '\\') {
          body += source.slice(cursor, cursor + 2)
          cursor += 2
          continue
        }
        if (inner === '$' && source[cursor + 1] === '{') {
          depth += 1
          body += '${'
          cursor += 2
          continue
        }
        if (depth > 0 && inner === '}') {
          depth -= 1
          body += inner
          cursor += 1
          continue
        }
        if (inner === '`' && depth === 0) break
        body += inner
        cursor += 1
      }
      if (cursor >= source.length) throw new Error(`unterminated template literal at offset ${index}`)
      bodies.push(body)
      index = cursor + 1
      continue
    }
    index += 1
  }
  return bodies
}

/**
 * Template bodies whose block comments do not close: the fingerprint of a
 * template literal cut in half by a stray backtick.
 */
function unbalancedCommentBodies(bodies: readonly string[]): string[] {
  return bodies.filter((body) => (body.match(/\/\*/g) ?? []).length !== (body.match(/\*\//g) ?? []).length)
}

describe('client stylesheets are intact template literals', () => {
  // The two stylesheets do not share a class prefix: the chart owns `.dtg-*`,
  // the panel surface owns `.dsh-task-gantt-*`. Measured: 115 brace pairs in
  // styles.ts (one 17 430-char template) and 15 in panel-style.ts (3 templates).
  const styles: { file: string; selector: RegExp; minSelectors: number }[] = [
    { file: 'src/client/ui/styles.ts', selector: /\.dtg-[a-z0-9-]+/g, minSelectors: 10 },
    { file: 'src/client/panel-style.ts', selector: /\.dsh-task-gantt[a-z-]*/g, minSelectors: 5 },
  ]

  it('never leaves a template body with an unterminated block comment', () => {
    for (const { file } of styles) {
      const bodies = templateBodies(readFileSync(resolve(ROOT, file), 'utf8'))
      expect(bodies.length, `${file} has no template literal`).toBeGreaterThan(0)
      const broken = unbalancedCommentBodies(bodies)
      expect(
        broken,
        `${file}: a template literal looks cut in half (a stray backtick, usually inside a CSS comment). ` +
          `Fragments: ${broken.map((body) => JSON.stringify(body.slice(-40))).join(' | ')}`,
      ).toEqual([])
    }
  })

  it('keeps the stylesheet vocabulary and balanced braces', () => {
    for (const { file, selector, minSelectors } of styles) {
      const css = templateBodies(readFileSync(resolve(ROOT, file), 'utf8')).join('\n')
      expect((css.match(selector) ?? []).length, `${file} selectors ${selector}`).toBeGreaterThan(minSelectors)
      const open = (css.match(/{/g) ?? []).length
      const close = (css.match(/}/g) ?? []).length
      expect(open, `${file}: ${open} '{' vs ${close} '}'`).toBe(close)
      expect(css, `${file} must not contain a JS line comment`).not.toMatch(/^\s*\/\//m)
    }
  })

  it('the check discriminates, including the exact shape ui-2 hit', () => {
    // The reported incident, reduced: a backtick PAIR inside a CSS comment.
    const incident = 'const css = `a { /* see `markdown-citation` here */ } b`;'
    const incidentBodies = templateBodies(incident)
    expect(incidentBodies.length, 'the pair splits one body into two').toBeGreaterThan(1)
    // BOTH fragments are unbalanced: the first opens a comment, the second
    // closes it. (My first version expected 1 and the test corrected me.)
    expect(unbalancedCommentBodies(incidentBodies).length, 'the pair unbalances two fragments').toBe(2)
    // A SINGLE stray backtick behaves differently: the literal never closes, so
    // the scanner throws with a message that names the cause (esbuild's own
    // message is "Expected \";\" but found …", which reads like a code bug).
    const single = 'const css = `a { /* see `position: absolute */ } b`;'
    expect(() => templateBodies(single)).toThrow(/unterminated template literal/)
    // A healthy file has nothing to report, and nested interpolation is not a break.
    expect(unbalancedCommentBodies(templateBodies('const css = `a { /* ok */ } b`;'))).toEqual([])
    expect(templateBodies('const a = `v${`inner`}w`;')).toEqual(['v${`inner`}w'])
  })
})
