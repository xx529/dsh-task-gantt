/**
 * Regression guards for defect 3 — "点击信息收发的 icon 无法打开实际消息内容".
 *
 * WHAT IS AND IS NOT GUARDED HERE (read this before trusting the file):
 *
 * The measured root cause is a CSS cascade problem: `.dtg-layer` sets
 * `pointer-events: none` for its decorative children (lane background, gridlines,
 * bands, spans, the NOW line) and the marker inherited it, so
 * `getComputedStyle(marker).pointerEvents === 'none'` and `elementFromPoint` at
 * the marker centre returned the lane head instead of the marker. **A node/vitest
 * run cannot observe that** — there is no layout engine, `environment: 'node'`,
 * and `tests/stubs/react.ts` implements no rendering (hooks return inert values).
 * The behaviour itself was verified in a REAL BROWSER by the Lead (measured
 * before/after; task-12). Anything below that scans text is a PROXY, labelled as
 * such; the only TRUE locks here are the layout-data invariants (a click must be
 * able to address exactly one message).
 *
 * PRE-FIX BASELINE (`src/client/ui/styles.ts` @ HEAD): `pointer-events` appears
 * only as `none` (lines 201/324/472/510) — there is no re-enable for `.dtg-msg`,
 * so the proxy below fails on the old code.
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { LaneColorTokens, MessageSpan, TimelineResponse } from '../src/shared/contract.ts'
import { layoutTimeline } from '../src/client/ui/timeline-layout.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const VIEWPORT = { width: 600, laneHeight: 84, headerHeight: 28 }
const COLOR: LaneColorTokens = { bar: '--dsw-alias-state-idle-primary', on: '--dsw-alias-label-primary-inverted' }

function message(time: number, lane: string, peer: string, messageId: string): MessageSpan {
  return {
    kind: 'message',
    time,
    end: null,
    from: { kind: 'teammate', id: lane, name: lane },
    to: { kind: 'teammate', id: peer, name: peer },
    preview: `preview ${messageId}`,
    messageId,
    sessionId: lane,
  }
}

function lane(id: string, messages: MessageSpan[]) {
  return {
    id,
    name: id,
    role: 'teammate' as const,
    hasHistory: true,
    spans: [],
    color: COLOR,
    navigation: { type: 'session' as const, value: id },
    tasks: [],
    messages,
  }
}

/** A double-written exchange plus a second message, so keys must be unique too. */
function board(): TimelineResponse {
  const first = message(5_000, 'alpha', 'beta', 'm2')
  return {
    apiVersion: 1,
    sessionId: 'alpha',
    rootSessionId: 'alpha',
    generatedAt: 100_000,
    range: { start: 0, end: null },
    live: true,
    source: 'log',
    notes: [],
    tasks: [],
    lanes: [lane('alpha', [first, message(9_000, 'alpha', 'beta', 'm3')]), lane('beta', [first])],
  }
}

/** Strip `/* … *\/` comments so a commented-out rule cannot satisfy a scan. */
function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

/** Every `selector { body }` pair in a stylesheet string (bodies are brace-free). */
function cssRules(css: string): { selector: string; body: string }[] {
  const out: { selector: string; body: string }[] = []
  for (const match of stripCssComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    out.push({ selector: (match[1] as string).trim(), body: match[2] as string })
  }
  return out
}

const layout = layoutTimeline(board(), VIEWPORT, { now: 100_000, msPerPx: 100 })

describe('defect 3 (TRUE lock): a click can address exactly one message', () => {
  it('gives every drawn marker a non-empty, globally unique key', () => {
    const keys = layout.messages.map((marker) => marker.key)
    // Three (lane, message) pairs: alpha:m2, beta:m2, alpha:m3.
    expect(layout.messages.length).toBe(3)
    expect(keys.every((key) => typeof key === 'string' && key.length > 0), JSON.stringify(keys)).toBe(true)
    expect(new Set(keys).size, `data-msg-key collision in ${JSON.stringify(keys)}`).toBe(keys.length)
  })

  it('gives every marker a non-degenerate hit box (a 0px box cannot be clicked)', () => {
    for (const marker of layout.messages) {
      expect(marker.w, `${marker.key} width`).toBeGreaterThan(0)
      expect(marker.h, `${marker.key} height`).toBeGreaterThan(0)
    }
  })
})

describe('defect 3 (PROXY): the marker is rendered as an interactive button', () => {
  // Proxies: a text scan stands in for "the element tree contains a clickable
  // button". They fail on the pre-fix code only where noted; the real behaviour
  // is a browser measurement (see the file header).
  const source = readFileSync(resolve(ROOT, 'src/client/ui/GanttChart.tsx'), 'utf8')

  it('PROXY: the marker branch chooses a <button> when a click handler exists', () => {
    expect(source).toMatch(/const Tag = interactive \? 'button' : 'span'/)
    expect(source).toMatch(/type: 'button'/)
  })

  it('PROXY: the marker button carries an onClick that toggles selection', () => {
    expect(source).toMatch(/onClick:\s*\(\)\s*=>\s*onSelect\(selected \? null : marker\.key\)/)
    expect(source).toContain('aria-pressed')
  })

  it('PROXY: the marker carries the addressing attributes the click resolves to', () => {
    // `data-msg-key` is what the parent uses to identify the clicked message.
    expect(source).toContain('data-msg-key={marker.key}')
    expect(source).toContain('data-msg-kind={marker.kind}')
  })
})

describe('defect 3 (PROXY): the marker re-enables pointer events', () => {
  const css = readFileSync(resolve(ROOT, 'src/client/ui/styles.ts'), 'utf8')
  const rules = cssRules(css)

  it('PROXY: the decorative layer disables pointer events (the ancestor that caused it)', () => {
    const layer = rules.filter((rule) => rule.selector.endsWith('.dtg-layer'))
    expect(layer.length, 'no .dtg-layer rule found — the scan is stale').toBeGreaterThan(0)
    expect(layer.some((rule) => /pointer-events:\s*none/.test(rule.body))).toBe(true)
  })

  it('PROXY: the marker rule re-enables them (fails on the pre-fix stylesheet)', () => {
    // Pre-fix every `pointer-events` declaration was `none`; the marker never
    // re-enabled hit-testing, so clicking a "button" did nothing.
    const marker = rules.filter((rule) => rule.selector.endsWith('.dtg-msg'))
    expect(marker.length, 'no .dtg-msg rule found — the scan is stale').toBeGreaterThan(0)
    expect(
      marker.some((rule) => /pointer-events:\s*(auto|all)/.test(rule.body)),
      '.dtg-msg must re-enable pointer-events (the .dtg-layer sets none)',
    ).toBe(true)
  })

  it('PROXY: no rule sets the marker back to pointer-events: none', () => {
    const marker = rules.filter((rule) => rule.selector.endsWith('.dtg-msg'))
    for (const rule of marker) {
      expect(rule.body, `rule ${rule.selector}`).not.toMatch(/pointer-events:\s*none/)
    }
  })

  it('states the boundary of this file in the assertions themselves', () => {
    // A deliberate, always-true assertion so the limitation is visible in the
    // test list: node/vitest cannot observe pointer-events or hit-testing.
    expect(new Set(['no layout engine', 'no hit-testing', 'browser-verified elsewhere']).size).toBe(3)
  })
})
