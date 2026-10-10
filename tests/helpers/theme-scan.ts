/**
 * Theme-contract scanner (guide §12 "皮肤兼容（令牌驱动）").
 *
 * The rule this enforces, verbatim from the brief §5:
 *
 *   > 文字/边框/分隔线只消费 `--dsw-alias-*` / `--dsw-font-*` / `--ds-*`
 *   > 令牌，**零硬编码颜色**；发现 `#rrggbb`、`rgb(`、颜色名都要红。
 *
 * Calibrated against the host's own guard,
 * `dsh-better-sidebar/tests/theme.spec.ts`:
 * - `#[0-9a-fA-F]{3,8}\b` and `\brgba?\(` are color literals, red;
 * - a `color:` declaration must dereference to `--dsw-*` / `--ds-*` tokens;
 * - `inherit` / `currentcolor` / `transparent` are *inert* (taking the
 *   surrounding paint, not painting one) and pass;
 * - `color-mix()` is fine as long as every `var()` in the expression is a
 *   theme token.
 *
 * The scanner is deliberately written to be **tested in both directions** (see
 * `tests/theme.spec.ts`): it must flag synthetic literals and must not flag the
 * token-only spellings, so a silent no-op scan cannot pass as a clean repo.
 *
 * Both raw CSS (`color: var(--dsw-alias-text-1);`) and JS style objects
 * (`color: 'var(--dsw-alias-text-1)'`, `style={{ background: … }}`) are read:
 * the plugin injects its stylesheet from a client module, so either spelling is
 * possible and both are held to the same contract.
 */

/** A paint-ish property whose value must resolve to a theme token. */
const PAINT_PROPERTIES = [
  'color',
  'background',
  'background-color',
  'background-image',
  'background-position',
  'border',
  'border-color',
  'border-top',
  'border-top-color',
  'border-right',
  'border-right-color',
  'border-bottom',
  'border-bottom-color',
  'border-left',
  'border-left-color',
  'outline',
  'outline-color',
  'fill',
  'stroke',
  'box-shadow',
  'text-shadow',
  'caret-color',
  'accent-color',
  'scrollbar-color',
  'text-decoration-color',
] as const

/** Values that name no paint of their own, so "no token" is fine. */
const INERT_VALUES = new Set(['transparent', 'currentcolor', 'inherit', 'unset', 'initial', 'revert', 'none', 'auto'])

/** `inherit`-like keywords that may appear inside a larger value. */
const INERT_KEYWORD = /^(?:transparent|currentcolor|inherit|unset|initial|revert)$/i

/** Unambiguous color literals. `color-mix(` is intentionally NOT here. */
const COLOR_LITERAL_PATTERNS: ReadonlyArray<{ kind: string; re: RegExp }> = [
  { kind: 'hex', re: /#[0-9a-fA-F]{3,8}\b/g },
  { kind: 'rgb()', re: /\brgba?\s*\(/g },
  { kind: 'hsl()', re: /\bhsla?\s*\(/g },
  { kind: 'oklch()', re: /\bokl(?:ch|ab)\s*\(/g },
  { kind: 'lab()/lch()', re: /\b(?:lab|lch)\s*\(/g },
  { kind: 'color()', re: /\bcolor\s*\(\s*(?:srgb|srgb-linear|display-p3|a98-rgb|prophoto-rgb|rec2020|xyz)/g },
  { kind: 'device-cmyk()', re: /\bdevice-cmyk\s*\(/g },
]

/**
 * CSS named colors (CSS Color Module Level 4, the 148 keyword colors).
 * `transparent` / `currentcolor` are keywords, not named colors, and are
 * handled as inert values instead.
 */
const NAMED_COLORS = `aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen`
  .split(' ')
  .map((name) => name.trim())
  .filter((name) => name !== '')

/** Word-boundary alternation of every named color (longest first so
 *  `lightgoldenrodyellow` cannot be half-matched as `light` + junk). */
const NAMED_COLOR_RE = new RegExp(`\\b(?:${[...NAMED_COLORS].sort((a, b) => b.length - a.length).join('|')})\\b`, 'i')

/** One theme-contract violation. */
export interface ThemeFinding {
  /** Repo-relative POSIX path (or the synthetic label, in unit tests). */
  file: string
  /** 1-based line number. */
  line: number
  kind: 'color-literal' | 'named-color' | 'non-token-paint'
  /** The offending fragment, whitespace-collapsed. */
  text: string
}

/** A paint declaration found in a source file. */
export interface Declaration {
  line: number
  property: string
  value: string
  text: string
}

/**
 * Replace comments with spaces, preserving every byte position and line break,
 * so offsets from the stripped text still index the original source.
 */
export function stripComments(source: string): string {
  let out = ''
  let quote: string | null = null
  let index = 0
  const blank = (from: number, to: number): string => source.slice(from, to).replace(/[^\n]/g, ' ')
  while (index < source.length) {
    const ch = source[index] as string
    const next = source[index + 1]
    if (quote !== null) {
      if (ch === '\\') {
        out += source.slice(index, index + 2)
        index += 2
        continue
      }
      if (ch === quote) quote = null
      out += ch
      index += 1
      continue
    }
    if (ch === '"' || ch === "'" || ch === '`') {
      quote = ch
      out += ch
      index += 1
      continue
    }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2)
      const stop = end === -1 ? source.length : end + 2
      out += blank(index, stop)
      index = stop
      continue
    }
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', index)
      const stop = end === -1 ? source.length : end
      out += blank(index, stop)
      index = stop
      continue
    }
    out += ch
    index += 1
  }
  return out
}

/** 1-based line number of a string offset. */
function lineOf(source: string, offset: number): number {
  let line = 1
  for (let index = 0; index < offset && index < source.length; index += 1) {
    if (source[index] === '\n') line += 1
  }
  return line
}

/** Normalize a declaration value: drop wrapping quotes and a trailing comma. */
function cleanValue(raw: string): string {
  let value = raw.trim()
  if ((value.startsWith("'") && value.endsWith("'")) || (value.startsWith('"') && value.endsWith('"'))) {
    value = value.slice(1, -1)
  }
  return value.replace(/,+$/, '').trim()
}

/** Every paint declaration in a source file, both CSS and JS object spelling. */
export function extractDeclarations(source: string): Declaration[] {
  const stripped = stripComments(source)
  const properties = [...PAINT_PROPERTIES].sort((a, b) => b.length - a.length).join('|')
  const re = new RegExp(`(?:^|[;{,(\\s])(${properties})\\s*[:=]\\s*([^;}\\n]*)`, 'g')
  const found: Declaration[] = []
  for (const match of stripped.matchAll(re)) {
    const property = match[1] as string
    const raw = match[2] ?? ''
    // A JSX prop (`fill="…"`) or a quoted JS string uses `=`; skip a bare
    // `=` that is really a comparison (`color === x`) or an arrow body.
    const value = cleanValue(raw.replace(/^=\s*/, ''))
    const at = (match.index ?? 0) + (match[0]?.indexOf(property) ?? 0)
    found.push({ line: lineOf(stripped, at), property, value, text: `${property}: ${value}`.trim() })
  }
  return found
}

/** Non-theme `var()` names inside a value. */
function nonThemeVars(value: string): string[] {
  const names = [...value.matchAll(/var\(\s*(--[a-z0-9-]+)/gi)].map((match) => (match[1] as string).slice(2).toLowerCase())
  return names.filter((name) => !(name.startsWith('dsw-') || name.startsWith('ds-')))
}

/** Does this value actually paint a color (literal or named)? */
function valuePaintsColor(value: string): boolean {
  for (const { re } of COLOR_LITERAL_PATTERNS) {
    re.lastIndex = 0
    if (re.test(value)) return true
  }
  NAMED_COLOR_RE.lastIndex = 0
  return NAMED_COLOR_RE.test(value)
}

/**
 * Scan one source file for theme-contract violations.
 *
 * @param file - label used in findings (repo-relative path).
 * @param source - the file's text.
 * @returns findings, in line order.
 */
export function scanThemeSource(file: string, source: string): ThemeFinding[] {
  const stripped = stripComments(source)
  const findings: ThemeFinding[] = []
  const seen = new Set<string>()
  const push = (line: number, kind: ThemeFinding['kind'], text: string): void => {
    // One finding per (line, kind): the two passes below overlap on purpose
    // (the declaration pass sees values, the first-token pass survives a value
    // broken across lines), and duplicated rows only add noise.
    const key = `${line}:${kind}`
    if (seen.has(key)) return
    seen.add(key)
    findings.push({ file, line, kind, text: text.replace(/\s+/g, ' ').trim() })
  }

  // 1. Any color literal anywhere in the module is red — the plugin owns no
  //    color of its own, wherever the value is written.
  for (const { kind, re } of COLOR_LITERAL_PATTERNS) {
    for (const match of stripped.matchAll(re)) {
      push(lineOf(stripped, match.index ?? 0), 'color-literal', `${kind}: ${match[0]}`)
    }
  }

  // 2. Paint declarations: named colors are red, and any var() chain must
  //    bottom out in a theme token.
  for (const declaration of extractDeclarations(source)) {
    const value = declaration.value
    if (value === '') continue
    const lower = value.toLowerCase()
    if (INERT_VALUES.has(lower) || INERT_KEYWORD.test(lower)) continue
    if (valuePaintsColor(value)) {
      NAMED_COLOR_RE.lastIndex = 0
      const named = NAMED_COLOR_RE.exec(value)
      const isLiteral = COLOR_LITERAL_PATTERNS.some(({ re }) => {
        re.lastIndex = 0
        return re.test(value)
      })
      if (!isLiteral && named !== null) push(declaration.line, 'named-color', declaration.text)
      continue
    }
    const offenders = nonThemeVars(value)
    if (offenders.length > 0) {
      push(declaration.line, 'non-token-paint', `${declaration.text} → non-theme var(--${offenders.join('), var(--')})`)
    }
  }

  // 3. Named colors whose value broke across a line boundary: the declaration
  //    pass stops at the newline, so its first value token is checked again
  //    here (`color:\n  white;` must still be red).
  const properties = [...PAINT_PROPERTIES].sort((a, b) => b.length - a.length).join('|')
  const firstToken = new RegExp(`(?:^|[;{(\\s])(?:${properties})\\s*[:=]\\s*['"\`]?([A-Za-z][A-Za-z-]*)`, 'g')
  for (const match of stripped.matchAll(firstToken)) {
    const token = (match[2] ?? '').toLowerCase()
    if (token === '' || INERT_KEYWORD.test(token)) continue
    if (!NAMED_COLORS.includes(token)) continue
    const at = (match.index ?? 0) + (match[0]?.indexOf(match[2] as string) ?? 0)
    push(lineOf(stripped, at), 'named-color', `named color: ${token}`)
  }

  return findings.sort((a, b) => a.line - b.line || a.kind.localeCompare(b.kind))
}

/** Is this a value the contract allows as-is (no token needed)? */
export function isAllowedValue(value: string): boolean {
  const trimmed = value.trim()
  if (trimmed === '') return true
  if (INERT_VALUES.has(trimmed.toLowerCase())) return true
  if (valuePaintsColor(trimmed)) return false
  return nonThemeVars(trimmed).length === 0
}
