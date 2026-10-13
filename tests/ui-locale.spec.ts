/**
 * The board must not freeze its language at import time.
 *
 * This is the lock for a real, user-visible bug: `labels.ts` used to do
 *
 *     import { locale } from '../i18n.ts'      // `const locale = detectLocale()` — a
 *                                             // snapshot taken when the module loaded
 *
 * The DSH shell injects this bundle and only THEN writes
 * `document.documentElement.lang`. So the snapshot was taken while `lang` was still
 * empty, and it froze to `en` whatever language the user was in. The reason it read as
 * garbage rather than merely English is that the en dictionary is a translation:
 *
 *     laneActThinking: zh '分析中' / en 'thinking'
 *
 * so every lane in a Chinese session was captioned `thinking` — the raw-looking word in
 * the user's screenshot. It was also a RACE: whichever of (set lang) / (run factory)
 * happened first decided the panel's language.
 *
 * The fix resolves the locale on every call (`currentLocale()`), which follows a live
 * switch and removes the race. These tests pin the SOURCE SHAPE, because the failure
 * mode is "someone helpfully reinstates the snapshot", and pin the observable behaviour
 * through `uiLabel()` (never a hard-coded rendered string — vitest runs in `en`).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { dictionaries } from '../src/client/i18n.ts'
import { uiLabel, uiMessages } from '../src/client/ui/labels.ts'

const LABELS_SOURCE = readFileSync(join(process.cwd(), 'src/client/ui/labels.ts'), 'utf8')

describe('the board locale is resolved per call, not snapshotted at import', () => {
  it('labels.ts imports currentLocale and NOT the deprecated `locale` snapshot', () => {
    // The structural guard. `locale` is exported by i18n.ts and marked @deprecated for
    // exactly this bug; importing it here re-freezes the language.
    expect(LABELS_SOURCE).toMatch(/import \{[^}]*currentLocale[^}]*\} from '\.\.\/i18n\.ts'/)
    expect(LABELS_SOURCE).not.toMatch(/import \{[^}]*\blocale\b[^}]*\} from '\.\.\/i18n\.ts'/)
    // ...and it must not index the dictionaries with a captured value either.
    expect(LABELS_SOURCE).not.toContain('dictionaries[locale]')
    expect(LABELS_SOURCE).toContain('dictionaries[currentLocale()]')
  })

  it('the deprecated snapshot still exists upstream, so this lock is about USE not existence', () => {
    // If `shell` ever deletes the export, this assertion tells whoever is reading why the
    // lock above is worded the way it is (and can be relaxed).
    const i18n = readFileSync(join(process.cwd(), 'src/client/i18n.ts'), 'utf8')
    expect(i18n).toContain('export const locale: Locale = detectLocale()')
    expect(i18n).toContain('@deprecated')
  })

  it('both locales are real, and the en values are what looked like raw kinds', () => {
    // The confusion in the bug report: en is a TRANSLATION whose values resemble the
    // host's raw `kind` strings, so an en-resolving panel looked like it printed the kind.
    const zh = uiMessagesIn('zh')
    const en = uiMessagesIn('en')
    expect(zh.laneActThinking).toBe('分析中')
    expect(en.laneActThinking).toBe('thinking')
    expect(zh.laneActCommands).toBe('运行命令')
    expect(en.laneActCommands).toBe('running')
  })

  it('both dictionaries define exactly the same keys (no silent English fallback)', () => {
    // A key missing from zh would render English in a Chinese session with no error; the
    // dictionaries are typed as full Records so typecheck catches it, and this catches it
    // at runtime for the keysthat are only reachable through uiLabel's `?? en` path.
    const zh = Object.keys(uiMessagesIn('zh')).sort()
    const en = Object.keys(uiMessagesIn('en')).sort()
    expect(zh).toEqual(en)
    expect(zh.length).toBeGreaterThan(120)
  })

  it('every activity key resolves in the ACTIVE locale (never to its own key)', () => {
    // The original symptom was a raw-looking word. Guard it from the other side too: a
    // key that fell through `?? en[key] ?? key` would come back as the key itself.
    const keys = ['laneActThinking', 'laneActRead', 'laneActSearch', 'laneActWrite', 'laneActEdit',
      'laneActCommands', 'laneActCode', 'laneActWebSearch', 'laneActWebFetch', 'laneActSubagents',
      'laneActPlan', 'laneActQuestions', 'laneActTools',
      'laneActThinkingFull', 'laneActCommandsFull', 'laneActCodeFull'] as const
    for (const key of keys) {
      expect(uiLabel(key), `uiLabel(${key})`).not.toBe(key)
      expect(uiLabel(key), `uiLabel(${key})`).toBeTruthy()
    }
  })
})

/**
 * The board's own dictionary for an explicit locale.
 *
 * `labels.ts` does not export its dictionaries, so read the source — this also keeps the
 * test honest about which file owns the strings (the `dictionaries` export in i18n.ts is
 * the TAB's catalog, not the board's).
 */
function uiMessagesIn(locale: 'zh' | 'en'): Record<string, string> {
  const source = LABELS_SOURCE
  const start = source.indexOf(locale === 'zh' ? 'const zh = {' : 'const en: Record')
  const end = locale === 'zh' ? source.indexOf('} as const', start) : source.indexOf('\n}', start)
  const body = source.slice(start, end)
  const out: Record<string, string> = {}
  for (const m of body.matchAll(/^\s{2}(\w+):\s*'((?:[^'\\]|\\.)*)'/gm)) {
    const key = m[1]
    const value = m[2]
    // The groups are non-optional in the pattern; the guards satisfy the typechecker.
    if (key !== undefined && value !== undefined) out[key] = value.replace(/\\'/g, "'")
  }
  return out
}
