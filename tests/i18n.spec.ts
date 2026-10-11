/**
 * i18n guards: the plugin ships its OWN zh/en dictionaries (brief §5) and
 * resolves the page language without any locale dependency.
 *
 * The key-set equality check is the one that matters: a key added to one
 * dictionary and forgotten in the other renders `undefined` in that language
 * (or, worse, silently falls back), and nothing else in the build catches it.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { dirname, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it, vi } from 'vitest'
import { dictionaries, locale as detectedLocale, messages, t } from '../src/client/i18n.ts'
import { uiLabel, uiMessages } from '../src/client/ui/labels.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

/** The board's own dictionary lives in `src/client/ui/labels.ts`. */
const boardMessages = uiMessages()
const boardKeysDeclared = Object.keys(boardMessages).sort()

const zhKeys = Object.keys(dictionaries.zh).sort()
const enKeys = Object.keys(dictionaries.en).sort()

/** Client sources that may call `t('…')`. */
function clientSources(): string[] {
  return readdirSync(resolve(ROOT, 'src/client'), { recursive: true, encoding: 'utf8' })
    .filter((name) => /\.(?:ts|tsx)$/.test(name))
    .map((name) => `src/client/${name.split(sep).join('/')}`)
}

/** Re-import the module with a freshly detected locale. */
async function withLocale(stub: { lang?: string; navigatorLanguage?: string }): Promise<typeof import('../src/client/i18n.ts')> {
  vi.resetModules()
  vi.stubGlobal('document', stub.lang === undefined ? undefined : { documentElement: { lang: stub.lang } })
  vi.stubGlobal('navigator', stub.navigatorLanguage === undefined ? undefined : { language: stub.navigatorLanguage })
  return import('../src/client/i18n.ts')
}

describe('dictionaries', () => {
  it('zh and en declare exactly the same keys', () => {
    expect(enKeys, `only in zh: ${zhKeys.filter((key) => !enKeys.includes(key)).join(', ')}`).toEqual(zhKeys)
  })

  it('every message is a non-empty string', () => {
    for (const [key, value] of Object.entries({ ...dictionaries.zh, ...dictionaries.en })) {
      expect(typeof value, key).toBe('string')
      expect(value.length, `${key} must not be empty`).toBeGreaterThan(0)
    }
  })

  it('carries the vocabulary the UI needs for the three degradation states', () => {
    for (const key of ['sourceLog', 'sourcePartial', 'sourceLive', 'emptyTitle', 'errorTitle', 'retry']) {
      expect(Object.keys(dictionaries.zh), key).toContain(key)
      expect(Object.keys(dictionaries.en), key).toContain(key)
    }
  })

  it('is non-trivial (a one-key dictionary would pass every other check)', () => {
    expect(zhKeys.length).toBeGreaterThanOrEqual(20)
  })

  it('has no placeholder-looking values left behind', () => {
    for (const [key, value] of Object.entries(dictionaries.en)) {
      expect(value, key).not.toMatch(/TODO|FIXME|XXX|\{\{/)
    }
  })
})

describe('message keys used by the client half', () => {
  it('every t("…") and uiLabel("…") call site names a declared key', () => {
    const tabKeys = new Set<string>()
    const boardKeys = new Set<string>()
    for (const file of clientSources()) {
      const source = readFileSync(resolve(ROOT, file), 'utf8')
      for (const match of source.matchAll(/\bt\(\s*['"]([A-Za-z0-9_.-]+)['"]\s*\)/g)) tabKeys.add(match[1] as string)
      // `src/client/ui/labels.ts` is a SECOND dictionary (the board needs more
      // strings than the tab declares). It was invisible here until a `t('close')`
      // call was replaced by `uiLabel('close')`: the tab guard cannot see that
      // accessor, so this scan has to cover both.
      for (const match of source.matchAll(/\buiLabel\(\s*['"]([A-Za-z0-9_.-]+)['"]/g)) boardKeys.add(match[1] as string)
    }
    expect(tabKeys.size, 'no t("…") call sites found — the scan is stale').toBeGreaterThan(0)
    expect(boardKeys.size, 'no uiLabel("…") call sites found — the scan is stale').toBeGreaterThan(0)
    const unknownTab = [...tabKeys].filter((key) => !zhKeys.includes(key))
    const unknownBoard = [...boardKeys].filter((key) => !boardKeysDeclared.includes(key))
    expect(unknownTab, `these t() keys are called but not declared in i18n.ts: ${unknownTab.join(', ')}`).toEqual([])
    expect(unknownBoard, `these uiLabel() keys are called but not declared in labels.ts: ${unknownBoard.join(', ')}`).toEqual([])
  })
})

describe('plugin display locales (locale/*.json)', () => {
  /**
   * The host reads `locale/<lang>.json` through Node's ESM resolver for the
   * plugin's display row (`scripts/verify-meta.mjs` documents the resolution
   * path). A key present in one language and missing in the other degrades that
   * row silently, so parity is asserted here too — the client dictionary and the
   * display locale are two different surfaces with the same failure mode.
   */
  function localeFile(lang: string): Record<string, unknown> {
    return JSON.parse(readFileSync(resolve(ROOT, `locale/${lang}.json`), 'utf8')) as Record<string, unknown>
  }

  /** Flatten nested keys into dotted paths. */
  function paths(value: unknown, prefix = ''): string[] {
    if (typeof value !== 'object' || value === null) return [prefix]
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
      paths(child, prefix === '' ? key : `${prefix}.${key}`),
    )
  }

  it('ships both languages', () => {
    for (const lang of ['en', 'zh']) expect(localeFile(lang), lang).toBeTruthy()
  })

  it('declares exactly the same keys in every language', () => {
    const en = paths(localeFile('en')).sort()
    const zh = paths(localeFile('zh')).sort()
    expect(zh).toEqual(en)
    expect(en).toContain('meta.title')
    expect(en).toContain('meta.description')
  })

  it('gives every declared string a non-empty value in both languages', () => {
    for (const lang of ['en', 'zh']) {
      const walk = (value: unknown, path: string): void => {
        if (typeof value === 'string') {
          expect(value.length, `${lang}:${path}`).toBeGreaterThan(0)
          return
        }
        if (typeof value === 'object' && value !== null) {
          for (const [key, child] of Object.entries(value as Record<string, unknown>)) walk(child, `${path}.${key}`)
        }
      }
      walk(localeFile(lang), lang)
    }
  })

  it('actually translates the long description (a copied English string is a bug)', () => {
    const en = localeFile('en') as { meta: { description: string; title: string } }
    const zh = localeFile('zh') as { meta: { description: string; title: string } }
    expect(zh.meta.description).not.toBe(en.meta.description)
    expect(zh.meta.title).not.toBe(en.meta.title)
  })
})

describe('the board\'s own dictionary (src/client/ui/labels.ts)', () => {
  it('declares a non-trivial set of keys', () => {
    expect(boardKeysDeclared.length).toBeGreaterThanOrEqual(20)
  })

  it('has no empty message', () => {
    for (const [key, value] of Object.entries(boardMessages)) {
      expect(typeof value, key).toBe('string')
      expect(value.length, key).toBeGreaterThan(0)
    }
  })

  it('en keeps its `Record<UiMessageKey, string>` annotation (parity is a TSC error, not a hope)', () => {
    // The zh dictionary is `as const` and `UiMessageKey = keyof typeof zh`, while
    // `en` is annotated `Record<UiMessageKey, string>`. That annotation is what
    // makes "a key added to one language only" a COMPILE error. If someone relaxes
    // it to `Record<string, string>` the parity guarantee silently disappears, so
    // the mechanism itself is asserted here.
    const source = readFileSync(resolve(ROOT, 'src/client/ui/labels.ts'), 'utf8')
    expect(source).toMatch(/const en:\s*Record<UiMessageKey,\s*string>/)
    expect(source).toMatch(/export type UiMessageKey = keyof typeof zh/)
  })

  it('uiLabel resolves through the SAME locale detection as the tab', () => {
    expect(uiLabel('close')).toBe(boardMessages.close)
    expect(uiLabel('close').length).toBeGreaterThan(0)
  })
})

describe('locale detection', () => {
  it('picks zh for document lang zh-CN', async () => {
    const mod = await withLocale({ lang: 'zh-CN' })
    expect(mod.locale).toBe('zh')
    expect(mod.t('lead')).toBe('Lead')
    expect(mod.t('sourceLive')).toBe('仅实时状态（无日志）')
  })

  it('picks zh for a bare zh document lang', async () => {
    const mod = await withLocale({ lang: 'zh' })
    expect(mod.locale).toBe('zh')
  })

  it('picks en for document lang en-US', async () => {
    const mod = await withLocale({ lang: 'en-US' })
    expect(mod.locale).toBe('en')
    expect(mod.t('sourceLive')).toBe('Live state only (no log)')
  })

  it('falls back to navigator.language when document lang is empty', async () => {
    const mod = await withLocale({ lang: '', navigatorLanguage: 'zh-TW' })
    expect(mod.locale).toBe('zh')
  })

  it('defaults to en when neither document nor navigator exists', async () => {
    const mod = await withLocale({})
    expect(mod.locale).toBe('en')
  })

  it('t() returns a declared key value in the detected locale', async () => {
    const mod = await withLocale({ lang: 'en' })
    expect(mod.t('tabTitle')).toBe(dictionaries.en.tabTitle)
  })

  it('messages() returns the whole dictionary of the detected locale', async () => {
    const mod = await withLocale({ lang: 'zh' })
    expect(Object.keys(mod.messages()).sort()).toEqual(zhKeys)
  })
})

describe('module-scope locale under the default environment', () => {
  it('exposes a locale consistent with the dictionaries', () => {
    expect(['zh', 'en']).toContain(detectedLocale)
    expect(t('lead')).toBe(detectedLocale === 'zh' ? dictionaries.zh.lead : dictionaries.en.lead)
  })

  it('messages() is a copy, not the live dictionary', () => {
    const copy = messages()
    const key = Object.keys(copy)[0] as keyof typeof copy
    const original = copy[key]
    copy[key] = 'mutated'
    expect(dictionaries[detectedLocale][key]).toBe(original)
  })
})
