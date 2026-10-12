/**
 * The lane palette contract: the Lead plus **sixteen** teammate colours.
 *
 * This spec owns the palette's measurable promises. It resolves the recipes to
 * real RGB through the theme fixture (the same values the running app ships),
 * because a token NAME existing says nothing about the colour it holds — that
 * mistake is exactly what let a grey lane ship once.
 *
 * What the user asked for, as testable facts:
 *
 * 1. **sixteen** teammate colours, none of them the Lead's;
 * 2. every one legible: **>= 4.5:1** against the lane ink in BOTH skins;
 * 3. every one chromatic — no black, white or grey lane;
 * 4. the sixteen tellable apart FROM EACH OTHER at small sizes, which is
 *    checked as a perceptual distance (OKLab), a hue spread and a lightness
 *    ladder rather than as "sixteen different hex strings";
 * 5. used in order, and only cycling once they run out: **no colour repeats
 *    before the eighteenth lane**, and a repeat never lands on the Lead's slot.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  LANE_COLOR_TOKENS,
  LEAD_COLOR_TOKENS,
  REJECTED_IDLE_TOKEN,
  TEAMMATE_COLOR_COUNT,
  UNASSIGNED_COLOR_TOKENS,
  laneColorTokens,
} from '../src/host/lane-color.ts'
import { laneColor as clientLaneColor } from '../src/client/ui/GanttChart.tsx'
import { LANE_COLOR_FALLBACKS } from '../src/client/ui/timeline-layout.ts'
import { resolveLaneColor } from './helpers/timeline-assert.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** Resolved values for the theme tokens this plugin chooses between. */
const TOKEN_VALUES = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/theme-token-values.json'), 'utf8')) as {
  inks: Record<string, { light: string; dark: string } | undefined>
  statics: Record<string, string | undefined>
}

/** Names of every custom property the host theme defines. */
function knownThemeTokens(): string[] {
  const snapshot = JSON.parse(readFileSync(resolve(ROOT, 'tests/fixtures/dsw-theme-tokens.json'), 'utf8')) as {
    tokens: string[]
  }
  return snapshot.tokens
}

const STATICS = TOKEN_VALUES.statics
const INKS = TOKEN_VALUES.inks

/** `#rrggbb` (or `#rgb`) to an RGB triple. */
function rgbOf(hex: string): readonly [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  return [0, 2, 4].map((i) => Number.parseInt(full.slice(i, i + 2), 16)) as unknown as readonly [number, number, number]
}

/** The token resolver `resolveLaneColor` needs: name -> RGB, or null. */
function valueOf(token: string): readonly [number, number, number] | null {
  const hex = STATICS[token]
  return hex === undefined ? null : rgbOf(hex)
}

/** Resolve a palette `bar` to RGB, failing loudly when a recipe is malformed. */
function resolved(bar: string): readonly [number, number, number] {
  const rgb = resolveLaneColor(bar, valueOf)
  expect(rgb, `${bar} must resolve to a colour (token name or color-mix of tokens)`).not.toBeNull()
  return rgb ?? [0, 0, 0]
}

/** sRGB channel to linear light. */
function linear(v: number): number {
  const x = v / 255
  return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
}

/** WCAG 2.1 relative luminance. */
function luminance(color: readonly [number, number, number]): number {
  return 0.2126 * linear(color[0]) + 0.7152 * linear(color[1]) + 0.0722 * linear(color[2])
}

/** WCAG 2.1 contrast ratio, >= 1. */
function contrast(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** sRGB to OKLab (Björn Ottosson's transform), for perceptual distances. */
function oklab(color: readonly [number, number, number]): readonly [number, number, number] {
  const r = linear(color[0])
  const g = linear(color[1])
  const b = linear(color[2])
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ]
}

/** Euclidean OKLab distance (`dE_ok`); ~0.02 is one JND for a large patch. */
function distance(a: readonly [number, number, number], b: readonly [number, number, number]): number {
  const x = oklab(a)
  const y = oklab(b)
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2])
}

/** OKLCh components of a colour. */
function oklch(color: readonly [number, number, number]): { L: number; C: number; h: number } {
  const [, a, b] = oklab(color)
  return { L: oklab(color)[0], C: Math.hypot(a, b), h: ((Math.atan2(b, a) * 180) / Math.PI + 360) % 360 }
}

/** Signed-free angular distance between two hues, in degrees (0..180). */
function hueGap(a: number, b: number): number {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}

/** Max minus min channel: 0 means a pure grey. */
function channelChroma(color: readonly [number, number, number]): number {
  return Math.max(...color) - Math.min(...color)
}

/** Count the top-level arguments of every `color-mix()` in a value. */
function colorMixArity(value: string): number[] {
  const arities: number[] = []
  for (let i = value.indexOf('color-mix('); i !== -1; i = value.indexOf('color-mix(', i + 1)) {
    let depth = 0
    let commas = 0
    for (let j = i + 'color-mix('.length; j < value.length; j += 1) {
      const ch = value[j]
      if (ch === '(') depth += 1
      else if (ch === ')') {
        if (depth === 0) break
        depth -= 1
      } else if (ch === ',' && depth === 0) commas += 1
    }
    // `in srgb, A, B` => two top-level commas => two colours.
    arities.push(commas)
  }
  return arities
}

const TEAMMATE_BARS = LANE_COLOR_TOKENS.slice(1).map((entry) => entry.bar)
const LEAD_RGB = resolved(LANE_COLOR_TOKENS[0]?.bar ?? '')
const LEAD_OKLCH = oklch(LEAD_RGB)

/* ------------------------------------------------------------ the palette */

describe('lane palette: the Lead plus sixteen teammate colours', () => {
  it('carries the Lead at the head and exactly sixteen teammate entries', () => {
    expect(LANE_COLOR_TOKENS.length, 'the Lead + 16 teammates').toBe(17)
    expect(TEAMMATE_COLOR_COUNT, 'sixteen colours before any repeat').toBe(16)
    expect(LEAD_COLOR_TOKENS).toEqual(LANE_COLOR_TOKENS[0])
    expect(new Set(LANE_COLOR_TOKENS.map((entry) => entry.bar)).size, 'no two entries may share a recipe').toBe(17)
    expect(TEAMMATE_BARS.every((bar) => bar !== LANE_COLOR_TOKENS[0]?.bar), 'the Lead colour is not a teammate slot').toBe(
      true,
    )
  })

  it('names no rejected grey token anywhere in the palette', () => {
    for (const entry of LANE_COLOR_TOKENS) {
      expect(entry.bar).not.toContain(REJECTED_IDLE_TOKEN)
      expect(entry.on).not.toBe(REJECTED_IDLE_TOKEN)
    }
  })

  it('composes every entry from tokens the theme actually defines', () => {
    const known = new Set(knownThemeTokens())
    for (const entry of LANE_COLOR_TOKENS) {
      for (const field of [entry.bar, entry.on, entry.onLight ?? '']) {
        for (const ref of [...field.matchAll(/var\((--[a-z0-9-]+)\)/g)].map((m) => m[1] as string)) {
          expect(known.has(ref), `${ref} (inside ${field}) must be a defined theme token`).toBe(true)
        }
        if (/^--/.test(field)) expect(known.has(field), `${field} must be a defined theme token`).toBe(true)
      }
    }
  })

  it('never puts three colours in one color-mix (it mis-resolves in the app Chromium)', () => {
    for (const entry of LANE_COLOR_TOKENS) {
      for (const commas of colorMixArity(entry.bar)) {
        // `color-mix(in srgb, A, B)` -> exactly two top-level commas, i.e. two
        // colours. A third colour would make it three, which is the form that
        // mis-resolves in the app's Chromium.
        expect(commas, `${entry.bar} must be exactly two colours per mix`).toBe(2)
      }
    }
  })

  it('keeps every entry chromatic — no black, white or grey lane', () => {
    for (const entry of LANE_COLOR_TOKENS) {
      const rgb = resolved(entry.bar)
      expect(
        channelChroma(rgb),
        `${entry.bar} = rgb(${rgb.join(',')}) is achromatic — a grey lane identifies nobody`,
      ).toBeGreaterThan(40)
      expect(oklch(rgb).C, `${entry.bar} must have real OKLCh chroma`).toBeGreaterThan(0.05)
    }
  })

  /* -------------------------------------------------- legibility, 16 + 1 */

  it('clears 4.5:1 against the lane ink in BOTH skins, for all seventeen entries', () => {
    // The regression lock for a real defect found on the dark skin: the name pill
    // and the task box used `--dsw-alias-label-primary-inverted`, which is white in
    // the light skin but `#353638` in the dark one — 2.34:1 on the Lead's blue.
    // Testing a literal `#ffffff` would have stayed green through the whole thing,
    // because the FILL was fine and only the INK was not.
    const rows: string[] = []
    for (const entry of LANE_COLOR_TOKENS) {
      const fill = resolved(entry.bar)
      for (const skin of ['light', 'dark'] as const) {
        const ink = INKS[entry.on]
        const inkHex = ink !== undefined ? ink[skin] : STATICS[entry.on]
        expect(inkHex, `the ink ${entry.on} must be a documented alias or a static token`).toBeDefined()
        if (inkHex === undefined) continue
        const ratio = contrast(fill, rgbOf(inkHex))
        rows.push(`${entry.bar} ${skin} ${ratio.toFixed(2)}`)
        expect(
          ratio,
          `the ink ${entry.on} on ${entry.bar} is only ${ratio.toFixed(2)}:1 in the ${skin} skin — the lane NAME and the task box would be unreadable`,
        ).toBeGreaterThanOrEqual(4.5)
      }
    }
    // The evidence table the task asks for: recipe -> hex -> ratio, both skins.
    for (const entry of LANE_COLOR_TOKENS) {
      const rgb = resolved(entry.bar)
      const light = INKS[entry.on]?.light ?? STATICS[entry.on] ?? ''
      const dark = INKS[entry.on]?.dark ?? STATICS[entry.on] ?? ''
      console.log(
        `lane colour ${entry.bar}\n` +
          `    hex #${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}  ` +
          `light ${contrast(rgb, rgbOf(light)).toFixed(2)}:1  dark ${contrast(rgb, rgbOf(dark)).toFixed(2)}:1`,
      )
    }
    expect(rows.length, 'every entry must be measured in both skins').toBe(LANE_COLOR_TOKENS.length * 2)
  })

  it('uses a white ink for a saturated fill, in both skins', () => {
    for (const entry of LANE_COLOR_TOKENS) {
      expect(entry.on, 'static white does not flip with the skin').toBe('--dsw-static-neutral-bluish-00')
      const ink = INKS[entry.on]
      if (ink === undefined) {
        expect(rgbOf(STATICS[entry.on] ?? ''), `${entry.on} must be white`).toEqual(rgbOf('#ffffff'))
      }
    }
  })

  /* ------------------------------------------- the sixteen are NOT the Lead */

  it('keeps every teammate colour perceptually clear of the Lead', () => {
    // The complaint that started this: lanes that looked like the Lead's blue.
    // Two measurable forms of "not the Lead's colour": a different HUE (so it is
    // not a shade of the same colour) and a real perceptual DISTANCE.
    const report: string[] = []
    for (const bar of TEAMMATE_BARS) {
      const rgb = resolved(bar)
      const leadDE = distance(rgb, LEAD_RGB)
      const gap = hueGap(oklch(rgb).h, LEAD_OKLCH.h)
      report.push(`${bar} dhue=${gap.toFixed(1)} dE=${leadDE.toFixed(3)}`)
      expect(gap, `${bar} is only ${gap.toFixed(1)} deg from the Lead's hue: ${report.join(', ')}`).toBeGreaterThanOrEqual(
        27,
      )
      expect(leadDE, `${bar} is only ${leadDE.toFixed(3)} OKLab from the Lead's blue`).toBeGreaterThanOrEqual(0.14)
    }
  })

  /* ---------------------------------------- the sixteen differ from EACH OTHER */

  it('is tellable apart at 3px: a hue spread AND a lightness ladder, not just 16 hex strings', () => {
    const colours = TEAMMATE_BARS.map(resolved)
    const lchs = colours.map(oklch)

    // 1. Every pair is a real perceptual distance apart. OKLab dE ~0.02 is one
    //    JND for a large patch, so 0.07 is a strong margin for a 3px edge.
    let worstPair = Number.POSITIVE_INFINITY
    let worstLabel = ''
    for (let i = 0; i < colours.length; i += 1) {
      for (let j = i + 1; j < colours.length; j += 1) {
        const d = distance(colours[i] as readonly [number, number, number], colours[j] as readonly [number, number, number])
        if (d < worstPair) {
          worstPair = d
          worstLabel = `${TEAMMATE_BARS[i]} vs ${TEAMMATE_BARS[j]}`
        }
      }
    }
    console.log(`min pairwise dE_ok over 120 pairs = ${worstPair.toFixed(4)} (${worstLabel})`)
    expect(worstPair, `two teammate colours are nearly identical: ${worstLabel}`).toBeGreaterThanOrEqual(0.07)

    // 2. The eight hue anchors are spread around the wheel. Repeats are allowed
    //    (there are only four chromatic token families and eight anchors), but
    //    two entries may never share a hue AND a lightness.
    const anchors: number[] = []
    for (const { h } of lchs) {
      // Two rungs of one anchor can sit up to ~7 deg apart; 8 deg merges them.
      if (!anchors.some((a) => hueGap(a, h) < 8)) anchors.push(h)
    }
    anchors.sort((a, b) => a - b)
    expect(anchors.length, 'eight hue anchors').toBe(8)
    const gaps = anchors.map((h, i) => (i === 0 ? h + 360 - (anchors[anchors.length - 1] ?? 0) : h - (anchors[i - 1] ?? 0)))
    console.log(`hue anchors ${anchors.map((h) => h.toFixed(1)).join(', ')} (min gap ${Math.min(...gaps).toFixed(1)} deg)`)
    expect(Math.min(...gaps), `hues ${anchors.join(', ')} — two anchors are too close`).toBeGreaterThanOrEqual(28)

    // 3. Same-hue entries must be separated by a real lightness step. This is the
    //    ladder that makes "eight hues, sixteen colours" honest rather than
    //    fourteen near-duplicates.
    let worstLadder = Number.POSITIVE_INFINITY
    for (let i = 0; i < lchs.length; i += 1) {
      for (let j = i + 1; j < lchs.length; j += 1) {
        const a = lchs[i]
        const b = lchs[j]
        if (a === undefined || b === undefined) continue
        if (hueGap(a.h, b.h) > 8) continue
        worstLadder = Math.min(worstLadder, Math.abs(a.L - b.L))
      }
    }
    console.log(`min lightness step inside a hue anchor (OKLab L) = ${worstLadder.toFixed(4)}`)
    expect(worstLadder, 'two same-hue entries are not separated by lightness').toBeGreaterThanOrEqual(0.06)

    // 4. In ROSTER ORDER neighbours must be maximally unlike each other, which is
    //    what the user actually looks at.
    let worstAdjacent = Number.POSITIVE_INFINITY
    for (let i = 1; i < colours.length; i += 1) {
      worstAdjacent = Math.min(
        worstAdjacent,
        distance(colours[i - 1] as readonly [number, number, number], colours[i] as readonly [number, number, number]),
      )
    }
    console.log(`min adjacent dE_ok in roster order = ${worstAdjacent.toFixed(4)}`)
    expect(worstAdjacent, 'two consecutive roster colours look alike').toBeGreaterThanOrEqual(0.15)
  })

  /* ----------------------------------------------------------- assignment */

  it('hands agents 1..17 a distinct entry and only repeats on the eighteenth lane', () => {
    // The user's "16 种与 lead 不同，超过了才能循环使用", as an exact table.
    const laneIds = ['lead', ...Array.from({ length: 20 }, (_, i) => `member-${i + 1}`)]
    const bars = laneIds.map((id, index) => laneColorTokens(id, index).bar)

    expect(bars[0], 'lane 0 is the Lead').toBe(LANE_COLOR_TOKENS[0]?.bar)
    for (let n = 1; n <= 16; n += 1) {
      expect(bars[n], `agent ${n} takes palette entry ${n}`).toBe(LANE_COLOR_TOKENS[n]?.bar)
    }
    // Lane 17 is the first lane that shares a colour with an earlier lane...
    expect(bars[17], 'lane 17 wraps to entry 1, never to the Lead').toBe(LANE_COLOR_TOKENS[1]?.bar)
    // ...and it must be lane 17: lanes 0..16 are seventeen different colours.
    const firstSeventeen = bars.slice(0, 17)
    expect(new Set(firstSeventeen).size, `repeats before lane 17: ${firstSeventeen.join(', ')}`).toBe(17)
    expect(new Set(bars).size, 'the cycle is 17 wide: Lead + 16 teammates').toBe(17)
    // A teammate must NEVER be painted in the Lead's colour, at any index.
    for (let index = 1; index <= 64; index += 1) {
      expect(laneColorTokens(`member-${index}`, index).bar, `member at index ${index}`).not.toBe(LANE_COLOR_TOKENS[0]?.bar)
    }
  })

  it('pins the Lead and keeps the unassigned bucket out of the roster cycle', () => {
    expect(laneColorTokens('lead', 0)).toEqual(LANE_COLOR_TOKENS[0])
    expect(laneColorTokens('lead', 3), 'the Lead ignores its index').toEqual(LANE_COLOR_TOKENS[0])
    expect(laneColorTokens('lead', 99), 'the Lead ignores its index').toEqual(LANE_COLOR_TOKENS[0])
    expect(laneColorTokens('unassigned', 7)).toEqual(UNASSIGNED_COLOR_TOKENS)
    expect(UNASSIGNED_COLOR_TOKENS.bar, 'the unassigned bucket must not reuse a roster colour').not.toBe(
      LANE_COLOR_TOKENS[0]?.bar,
    )
    // It also must not be reachable from the roster cycle, at any index.
    for (let index = 1; index <= 64; index += 1) {
      expect(laneColorTokens(`member-${index}`, index).bar).not.toBe(UNASSIGNED_COLOR_TOKENS.bar)
    }
  })

  it('falls back to the first teammate colour for a non-finite or non-positive index', () => {
    // `index` comes from the assembled lane array; a NaN must not yield `undefined`.
    expect(laneColorTokens('member-x', Number.NaN).bar).toBe(LANE_COLOR_TOKENS[1]?.bar)
    expect(laneColorTokens('member-x', 0).bar).toBe(LANE_COLOR_TOKENS[1]?.bar)
    expect(laneColorTokens('member-x', -5).bar).toBe(LANE_COLOR_TOKENS[1]?.bar)
    // A fractional index is floored, not interpolated.
    expect(laneColorTokens('member-x', 2.9).bar).toBe(LANE_COLOR_TOKENS[2]?.bar)
  })

  /* ------------------------------------------------- the client's own copy */

  it('keeps the client fallback table identical to the host palette, element by element', () => {
    // The fallback exists for a payload that predates `lane.color`, and a fallback
    // that drifts from the real palette is a palette with two meanings: the last time
    // this happened, one copy kept a chroma-0 grey after the other was fixed. So this
    // compares the two arrays directly — same length, same order, same recipe STRING
    // (not merely "both resolve to some colour").
    expect(LANE_COLOR_FALLBACKS.length, 'the client copy must carry all 17 entries').toBe(LANE_COLOR_TOKENS.length)
    const clientBars = LANE_COLOR_FALLBACKS.map((entry) => entry.bar)
    const hostBars = LANE_COLOR_TOKENS.map((entry) => entry.bar)
    expect(clientBars).toEqual(hostBars)
    // And the ink pair must match too, or a lane would flip to a different text colour
    // depending on which table painted it.
    expect(LANE_COLOR_FALLBACKS.map((entry) => entry.on)).toEqual(LANE_COLOR_TOKENS.map((entry) => entry.on))
    expect(LANE_COLOR_FALLBACKS.map((entry) => entry.onLight)).toEqual(LANE_COLOR_TOKENS.map((entry) => entry.onLight))
  })

  it('gives the client the same index→colour answer as the host, and repeats only at lane 17', () => {
    // The REAL allocation path (`laneColor` in `GanttChart.tsx`), driven over a roster
    // long enough to cross the cycle, asserted against the host's own pure function.
    // Before this change the client hashed the lane id: over a 12-teammate roster that
    // produced FOUR distinct colours, because the hash only reaches slots `1..len-2`
    // and is not a permutation.
    const lane = (id: string, role: 'lead' | 'teammate'): Parameters<typeof clientLaneColor>[0] =>
      ({ id, role }) as Parameters<typeof clientLaneColor>[0]

    const rows: string[] = []
    for (let index = 0; index <= 20; index += 1) {
      const isLead = index === 0
      const id = isLead ? 'lead' : `member-${index}`
      const role = isLead ? 'lead' : 'teammate'
      const client = clientLaneColor(lane(id, role), index)
      const host = laneColorTokens(id, index)
      // The client wraps token names in `var(...)`; the host publishes bare names.
      // Compare the UNDERLYING token so the assertion is about identity, not spelling.
      const bare = (paint: string): string =>
        paint.startsWith('var(') && paint.endsWith(')') ? paint.slice(4, -1) : paint
      expect(bare(client.bar), `lane ${index} (${id})`).toBe(host.bar)
      expect(bare(client.on), `lane ${index} (${id}) ink`).toBe(host.on)
      rows.push(`${index}→${host.bar.slice(0, 26)}`)
    }
    console.log(`client index→colour (0..20):\n  ${rows.join('\n  ')}`)

    // The guarantee, stated on the client path: lanes 0..16 are 17 different colours,
    // and lane 17 is the first repeat — landing on TEAMMATE slot 1, never the Lead's.
    const bars = Array.from({ length: 21 }, (_, index) =>
      clientLaneColor(lane(index === 0 ? 'lead' : `member-${index}`, index === 0 ? 'lead' : 'teammate'), index).bar,
    )
    expect(new Set(bars.slice(0, 17)).size, 'no repeat before lane 17').toBe(17)
    expect(bars[17], 'lane 17 wraps to teammate slot 1').toBe(bars[1])
    expect(bars[17]).not.toBe(bars[0])
    // And a teammate is never painted the Lead's colour, at any index.
    for (let index = 1; index <= 64; index += 1) {
      expect(
        clientLaneColor(lane(`member-${index}`, 'teammate'), index).bar,
        `teammate at lane ${index}`,
      ).not.toBe(bars[0])
    }
  })

  it('paints the client unassigned bucket with the host reserved token, not a roster slot', () => {
    const unassigned = clientLaneColor(
      { id: 'unassigned', role: 'unknown' } as Parameters<typeof clientLaneColor>[0],
      3,
    )
    expect(unassigned.bar).toBe(`var(${UNASSIGNED_COLOR_TOKENS.bar})`)
    // It must not be any roster entry — the old client code used the LAST palette
    // entry, which after the palette grew became a teammate's colour.
    for (const entry of LANE_COLOR_TOKENS) {
      expect(unassigned.bar).not.toBe(`var(${entry.bar})`)
    }
  })
})
