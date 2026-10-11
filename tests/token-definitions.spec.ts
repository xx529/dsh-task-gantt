/**
 * Token-definition guard (proposed by shell and ui-2; implemented by verify).
 *
 * WHY THIS EXISTS — two failure modes that are completely silent in this
 * codebase and that neither `tsc` nor `tests/theme.spec.ts` can see:
 *
 * 1. **A token that does not exist.** `font: var(--dsw-font-mono)` is legal CSS;
 *    an undefined custom property makes the declaration *invalid at
 *    computed-value time*, so the whole shorthand is dropped — no log, no error.
 *    Shell hit exactly this in `src/client/panel-style.ts` (fixed by switching
 *    to `font-family: var(--ds-font-family-code)`). Colour literals cannot catch
 *    it: the value is a token *name*.
 * 2. **A token that exists but is invisible on one theme.** The previous
 *    user-prompt marker used `--dsw-alias-markdown-citation`, which resolves to
 *    `#ebeef2` and scores **1.16:1** on a light panel (Lead's live measurement).
 *    Legal CSS, drawn, unreadable.
 *
 * SOURCE OF TRUTH: `tests/fixtures/dsw-theme-tokens.json` (`_count: 408`), a
 * snapshot of what `@deepseek-ai/dsh-client-ui-theme/lib/client.js` DEFINES
 * inside `app.asar` (DSH 0.2.0-rc.2). Not a consumer bundle: better-sidebar
 * never references `--dsw-alias-state-idle-primary`, yet it is defined — see
 * `docs/VALIDATION.md` §5 F8. Regenerate after a host upgrade (§7 of that doc).
 *
 * BOUNDARY (stated by ui-2, kept verbatim because it matters): the existence
 * half proves only that a referenced token EXISTS. It does NOT prove the token
 * is readable in either theme — only the five resolved values used in the
 * contrast half are covered, and every other token's contrast is unverified.
 *
 * PROVENANCE OF THE RESOLVED VALUES: Lead measured them live
 * (`label-primary = rgb(15,17,21)`, `label-primary-inverted = rgb(245,247,250)`,
 * `markdown-citation = rgb(235,238,242)`, light panel `rgb(255,255,255)`, dark
 * panel `rgb(32,33,36)`). ui-2 reproduced four ratios with the WCAG formula.
 * verify did NOT run a live `getComputedStyle`; instead verify resolved the
 * token CHAINS from the definition source (`--dsw-alias-label-primary` →
 * `--dsw-static-neutral-bluish-1000` `#0f1115` in one skin, `…-50` `#f9fafb` in
 * the other; `…-inverted` → `…-00` `#fff` / `…-800` `#353638`;
 * `--dsw-alias-markdown-citation` → `…-100` `#ebeef2`, which matches Lead's
 * `rgb(235,238,242)` exactly — a cross-check that the extraction is right).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { UR_MARKER_FILL_TOKEN, UR_MARKER_RING_TOKENS } from '../src/client/ui/GanttChart.tsx'
import { stripComments } from './helpers/theme-scan.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The host theme's defined token names. */
function knownTokens(): Set<string> {
  const snapshot = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/dsw-theme-tokens.json'), 'utf8')) as { tokens: string[] }
  return new Set(snapshot.tokens)
}

/** Every source file that can reference a token. */
function sourceFiles(): string[] {
  return readdirSync(resolve(ROOT, 'src'), { recursive: true, encoding: 'utf8' })
    .filter((name) => /\.(?:ts|tsx|css)$/.test(name))
    .map((name) => `src/${name.split(sep).join('/')}`)
    .sort()
}

/**
 * Token references in one source file: `var(--token)` plus quoted token names
 * (`'--dsw-…'`, used by `lane-color.ts` and by the exported marker constants).
 *
 * Comments are stripped FIRST — and the stripper is quote-aware, which is the
 * detail that keeps this honest in both directions: a `//` comment cannot
 * smuggle a reference in, and a URL (`https://…`) or a comment after `case 1:`
 * is not truncated as if it were a comment. shell's recipe suggested a
 * `(?<!:)` lookbehind for `//`; quote tracking already handles the URL case
 * without breaking `case 1: // note`, so the shared helper is used as-is.
 */
function tokenReferences(source: string): string[] {
  const stripped = stripComments(source)
  const found = new Set<string>()
  for (const match of stripped.matchAll(/var\(\s*(--[a-z0-9-]+)/g)) found.add(match[1] as string)
  for (const match of stripped.matchAll(/['"](--(?:dsw|ds)-[a-z0-9-]+)['"]/g)) found.add(match[1] as string)
  return [...found]
}

/* --------------------------------------------------------------- contrast */

/** WCAG 2.1 relative luminance of an sRGB triple. */
function luminance(rgb: readonly [number, number, number]): number {
  const [r, g, b] = rgb.map((channel) => {
    const value = channel / 255
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** WCAG 2.1 contrast ratio, ≥ 1. */
function contrast(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}

const hex = (value: string): [number, number, number] => [
  parseInt(value.slice(1, 3), 16),
  parseInt(value.slice(3, 5), 16),
  parseInt(value.slice(5, 7), 16),
]

/** The two skins, resolved from the definition source (see the file header). */
const LIGHT_PANEL: [number, number, number] = [255, 255, 255] // Lead's measurement
const DARK_PANEL: [number, number, number] = [32, 33, 36] // Lead's measurement
const RING_RESOLVED: Record<'light' | 'dark', Record<string, [number, number, number]>> = {
  // Both ring tokens are DEFINED TWICE in the host theme file, i.e. they flip
  // with the skin (first block = light, second = dark):
  //   --dsw-alias-label-primary           -> bluish-1000 #0f1115 | bluish-50  #f9fafb
  //   --dsw-alias-label-primary-inverted  -> bluish-00   #ffffff | bluish-800 #353638
  light: { '--dsw-alias-label-primary': hex('#0f1115'), '--dsw-alias-label-primary-inverted': hex('#ffffff') },
  dark: { '--dsw-alias-label-primary': hex('#f9fafb'), '--dsw-alias-label-primary-inverted': hex('#353638') },
}

/** Resolve a ring token per skin, failing loudly if its value was never recorded. */
function resolved(token: string, skin: 'light' | 'dark'): [number, number, number] {
  const value = RING_RESOLVED[skin][token]
  if (value === undefined) {
    throw new Error(`no ${skin}-skin value recorded for ${token}; read it out of @deepseek-ai/dsh-client-ui-theme and record it here`)
  }
  return value
}

describe('every referenced token is defined by the host theme', () => {
  it('scans a non-empty surface (a no-op scan cannot pass)', () => {
    const files = sourceFiles()
    expect(files.length).toBeGreaterThanOrEqual(15)
    const references = new Set(files.flatMap((file) => tokenReferences(readFileSync(resolve(ROOT, file), 'utf8'))))
    // shell measured 36 distinct `var()` references before this guard existed;
    // the quoted-name form adds the palette and the marker constants.
    // Measured baseline (verify, 2026-10-12): 19 files, 25 DISTINCT references
    // (shell's "36" counts per-file occurrences — 12 in panel-style.ts + 24 in
    // ui/styles.ts). The floor is set below the measured value so adding a file
    // cannot make the guard vacuous, while a scan that silently stops matching
    // anything still fails.
    expect(references.size, `src has ${files.length} files and ${references.size} distinct token references`).toBeGreaterThanOrEqual(20)
  })

  it('has no reference to an undefined token', () => {
    const known = knownTokens()
    expect(known.size).toBeGreaterThan(300)
    const missing: string[] = []
    for (const file of sourceFiles()) {
      for (const token of tokenReferences(readFileSync(resolve(ROOT, file), 'utf8'))) {
        if (!known.has(token)) missing.push(`${file}: ${token}`)
      }
    }
    expect(missing, `undefined tokens (the declaration they sit in is dropped silently):\n${missing.join('\n')}`).toEqual([])
  })

  it('the scanner discriminates, and comments can neither hide nor invent a reference', () => {
    // The real regression: a `font:` shorthand whose token does not exist.
    expect(tokenReferences('a { font: 11px/16px var(--dsw-font-mono); }')).toEqual(['--dsw-font-mono'])
    // A reference that only exists in a comment is NOT a reference (this is the
    // false positive that would make the guard red on landing:
    // `GanttChart.tsx` documents `var(--x)` inside a `//` comment).
    expect(tokenReferences('// see var(--dsw-not-a-token) for the old marker')).toEqual([])
    expect(tokenReferences('/* the old marker used var(--dsw-alias-markdown-citation) */')).toEqual([])
    // Quoted token names count: that is how the palette and the marker
    // constants reference tokens.
    expect(tokenReferences("export const X = '--dsw-alias-bg-layer-1'")).toEqual(['--dsw-alias-bg-layer-1'])
    // The quote-aware stripper must not treat a URL as a line comment.
    expect(tokenReferences("const url = 'https://example.com/a' // var(--dsw-nope)")).toEqual([])
    expect(tokenReferences("const url = 'https://example.com/a'; const x = 'var(--dsw-alias-label-primary)'")).toEqual(['--dsw-alias-label-primary'])
  })
})

describe('the user-prompt marker stays readable on both skins', () => {
  it('is a two-layer ring (inner first) filled with the panel surface, all real tokens', () => {
    // Lead's ruling (2026-10-12), made after this assertion caught ui-2
    // collapsing the ring to a single `--dsw-alias-label-secondary`: keep TWO
    // layers. The reason is not that one layer is mathematically impossible; it
    // is that a single-layer scheme is only safe IF its token flips with the
    // skin, while two layers do not depend on that behaviour. See the rationale
    // test below.
    const known = knownTokens()
    expect(UR_MARKER_RING_TOKENS).toHaveLength(2)
    for (const token of UR_MARKER_RING_TOKENS) expect(known.has(token), token).toBe(true)
    expect(known.has(UR_MARKER_FILL_TOKEN)).toBe(true)
    // The fill is the panel surface, so the dot reads as a hole in the marker.
    expect(UR_MARKER_FILL_TOKEN).toBe('--dsw-alias-bg-layer-1')
  })

  it('has at least one ring layer ≥ 3:1 on each skin', () => {
    for (const [skin, panel] of [['light', LIGHT_PANEL], ['dark', DARK_PANEL]] as const) {
      const ratios = UR_MARKER_RING_TOKENS.map((token) => contrast(resolved(token, skin), panel))
      expect(
        Math.max(...ratios),
        `${skin} panel: ring ratios ${ratios.map((ratio) => ratio.toFixed(2)).join(', ')}`,
      ).toBeGreaterThanOrEqual(3)
    }
  })

  it('single-layer schemes rest on an unverified premise; two layers do not', () => {
    // WHAT IS MEASURED (light skin): `--dsw-alias-label-secondary` =
    // rgb(97,102,107) -> 5.80:1 on the light panel. That is Lead's live
    // measurement, and my definition-source value `#61666b` agrees exactly.
    //
    // WHAT IS NOT MEASURED: the LIVE dark-skin value of that token. Lead's
    // control figure — "if it does not flip" — is 2.78:1, i.e. below the 3:1
    // floor. For completeness: the token IS defined twice in the theme file
    // (bluish-700 | bluish-300), so by the same evidence used for every other
    // chain here it would resolve to `#cfd3d6` and reach 10.42:1 on the dark
    // panel — but that is a derivation, not an observation, and the whole point
    // of the ruling is that correctness must not hang on it.
    //
    // WHERE MY EARLIER "label-primary is 15.41:1 on dark" CAME FROM (Lead asked
    // for the provenance): it is a DEFINITION-SOURCE DERIVATION, not a live
    // measurement — `--dsw-alias-label-primary` -> `--dsw-static-neutral-bluish-50`
    // = `#f9fafb` (grep-verified in the theme bundle: `bluish-50:#f9fafb`), against
    // the dark panel Lead measured as rgb(32,33,36). With the theme's own dark
    // surface (`bluish-875` = `#232324`) the same pair gives 15.03:1. The
    // extraction path is cross-validated by `--dsw-alias-markdown-citation` ->
    // `bluish-100` = `#ebeef2`, which equals Lead's live rgb(235,238,242) exactly.
    // It is therefore evidence of the same KIND as the "label-secondary flips"
    // claim — which is precisely why the ruling keeps the structurally safe
    // design instead of adjudicating between two derivations.
    const secondaryLight = hex('#61666b')
    expect(contrast(secondaryLight, LIGHT_PANEL)).toBeCloseTo(5.8, 0)
    // Only verifiable properties are asserted: the floor holds on both skins for
    // the tokens actually exported, and a non-flipping token is shown to fail.
    for (const skin of ['light', 'dark'] as const) {
      const panel = skin === 'light' ? LIGHT_PANEL : DARK_PANEL
      const best = Math.max(...UR_MARKER_RING_TOKENS.map((token) => contrast(resolved(token, skin), panel)))
      expect(best, `${skin} skin`).toBeGreaterThanOrEqual(3)
    }
  })

  it('the rejected alternative was a token that does NOT flip with the skin', () => {
    // `--dsw-alias-markdown-citation` resolves to `#ebeef2` (bluish-100) in both
    // skins, which is why the old single-ring marker disappeared on a light
    // panel: 1.16:1. A non-flipping token can never be safe on both skins, so
    // this is the lock that keeps the marker from regressing to one.
    const citation = hex('#ebeef2')
    expect(contrast(citation, LIGHT_PANEL)).toBeLessThan(3)
    expect(contrast(citation, LIGHT_PANEL)).toBeCloseTo(1.16, 1)
  })

  it('reproduces the measured ratios, so the WCAG helper itself cannot be wrong', () => {
    // Calibration against Lead's live measurements + the definition chains.
    expect(contrast(hex('#0f1115'), LIGHT_PANEL)).toBeCloseTo(18.9, 0) // label-primary on light
    expect(contrast(hex('#0f1115'), DARK_PANEL)).toBeCloseTo(1.17, 1) // label-primary on dark
    expect(contrast(hex('#ebeef2'), LIGHT_PANEL)).toBeCloseTo(1.16, 1) // markdown-citation on light
    // OPEN DISCREPANCY (reported to ui-2/Lead, 2026-10-12): the quoted
    // measurement for `label-primary-inverted` on the dark panel is 13.83, but
    // `rgb(245,247,250)` against `rgb(32,33,36)` computes to **15.00**, and the
    // dark-skin chain (`…-inverted` → bluish-800 `#353638`) gives **1.33**. The
    // number 13.83 is reproducible from none of the three inputs I have, so it is
    // deliberately NOT encoded here; the threshold assertions above carry the
    // semantic guarantee without depending on it.
    expect(contrast(hex('#f5f7fa'), DARK_PANEL)).toBeCloseTo(15.0, 1)
  })
})
