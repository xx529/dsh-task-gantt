/**
 * Subagent DISPATCH markers.
 *
 * The host added `MessageSpan['kind']: 'dispatch'` — a directed hand-off inferred from the
 * parent/child session link, placed on BOTH ends (the parent lane reads it as "handed to
 * X", the child lane as "received from Y"). The user's complaint was that the board showed
 * "没有收发标识"; the kind must therefore be RENDERED, not merely present in the payload.
 *
 * The risk this file exists for: `kind` is an open union that grew after the renderer was
 * written, and there is no exhaustive switch anywhere, so an unhandled member degrades to
 * "looks exactly like a teammate's directed message" with no error. These tests pin both
 * the wording mapping and the fact that the renderer treats the kind distinctly.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { messageRouteKey, uiLabel } from '../src/client/ui/labels.ts'

const GANTT_SOURCE = readFileSync(join(process.cwd(), 'src/client/ui/GanttChart.tsx'), 'utf8')
const STYLES_SOURCE = readFileSync(join(process.cwd(), 'src/client/ui/styles.ts'), 'utf8')

describe('messageRouteKey', () => {
  it('a DISPATCH is worded as a hand-off, not as a teammate message', () => {
    // "sent to" would describe it in the vocabulary of the thing it is not: it would read
    // as if a teammate had addressed a message to the subagent.
    expect(messageRouteKey('dispatch', true)).toBe('messageDispatchedTo')
    expect(messageRouteKey('dispatch', false)).toBe('messageDispatchedFrom')
  })

  it('an ordinary message keeps the existing wording', () => {
    expect(messageRouteKey('message', true)).toBe('messageSentTo')
    expect(messageRouteKey('message', false)).toBe('messageReceivedFrom')
  })

  it('an UNKNOWN kind falls back to the message wording rather than crashing', () => {
    // Forward compatibility: the union has already grown once.
    expect(messageRouteKey('whatever', true)).toBe('messageSentTo')
    expect(messageRouteKey('', false)).toBe('messageReceivedFrom')
  })

  it('all four keys resolve to distinct, non-empty strings in the active locale', () => {
    const keys = ['messageSentTo', 'messageReceivedFrom', 'messageDispatchedTo', 'messageDispatchedFrom'] as const
    const values = keys.map((k) => uiLabel(k))
    for (const v of values) expect(v).toBeTruthy()
    expect(new Set(values).size, 'dispatch wording must differ from message wording').toBe(4)
  })

  it('the dispatch wording is NOT the message wording in either locale', () => {
    // Read the source so this holds whatever locale the test process resolves to.
    const zh = /messageDispatchedTo: '([^']+)'/.exec(STYLES_SOURCE + GANTT_SOURCE) // (not in these files)
    expect(zh).toBeNull() // the strings live in labels.ts; asserted there below
    const labels = readFileSync(join(process.cwd(), 'src/client/ui/labels.ts'), 'utf8')
    const zhTo = /messageDispatchedTo: '([^']+)'/.exec(labels)?.[1]
    const enTo = /messageDispatchedTo: '([^']+)'/.exec(labels.slice(labels.indexOf('const en: Record')))?.[1]
    expect(zhTo).toBe('派发给')
    expect(enTo).toBe('dispatched to')
  })
})

describe('the renderer treats a dispatch distinctly', () => {
  it('the marker gains a dispatch class', () => {
    // Without this the kind renders as an ordinary teammate arrow — the exact silent
    // degradation this file guards.
    expect(GANTT_SOURCE).toContain("if (marker.kind === 'dispatch') classes.push('dtg-msg-dispatch')")
  })

  it('the class is what carries the dashed stroke, and the stylesheet defines it', () => {
    expect(STYLES_SOURCE).toContain('.dtg-msg-dispatch .dtg-msg-arrow path')
    // The cap must be BUTT: with the arrow's own round caps and stroke-width 2, the caps
    // bleed across a sub-2-unit gap and the arrow renders SOLID (measured — the first
    // attempt looked identical to a message). This is the line that keeps it visible.
    expect(STYLES_SOURCE).toMatch(/\.dtg-msg-dispatch[\s\S]*?stroke-linecap:\s*butt/)
    // The declaration may carry a comment inside the block (it explains why the gap must
    // exceed the stroke width), so match across it rather than requiring it first.
    expect(STYLES_SOURCE).toMatch(/\.dtg-msg-dispatch \.dtg-msg-arrow path \{[\s\S]*?stroke-dasharray:\s*\S+\s+\S+/)
  })

  it('the popover route goes through the tested helper, not an inline ternary', () => {
    // An inline `direction === 'outgoing' ? messageSentTo : messageReceivedFrom` would
    // silently caption a dispatch as a message.
    expect(GANTT_SOURCE).toContain('uiLabel(messageRouteKey(marker.kind,')
    expect(GANTT_SOURCE).not.toContain("${uiLabel('messageSentTo')} ${resolved.peerName}")
  })

  it('the dispatch arrow still uses the SAME glyph as a message (shape not swapped)', () => {
    // The distinction is the STROKE treatment, not a second icon: dispatch and ordinary
    // messages must keep one geometry, so the marker block renders exactly one ArrowIcon
    // and no dispatch-specific component of its own.
    expect(GANTT_SOURCE).toContain('function ArrowIcon')
    // The marker chooses its arrow by DIRECTION only — never by kind — so a dispatch and a
    // message share the one element. (The other two `<ArrowIcon` uses are the legend's
    // outgoing/incoming swatches.)
    const markerArrows = GANTT_SOURCE.match(/<ArrowIcon className="dtg-msg-arrow" direction=\{outgoing/g) ?? []
    expect(markerArrows, 'one shared marker arrow for every kind').toHaveLength(1)
    // ...and no arrow usage anywhere is chosen by `kind`.
    for (const line of GANTT_SOURCE.split('\n')) {
      if (line.includes('<ArrowIcon')) expect(line).not.toContain('dispatch')
    }
    expect(GANTT_SOURCE).not.toMatch(/dtg-msg-dispatch[\s\S]{0,80}<[A-Z]\w+[A-Za-z]*Icon/)
  })

  it('the popover explains why a dispatch looks different', () => {
    expect(GANTT_SOURCE).toContain("kind === 'dispatch' ? (")
    expect(GANTT_SOURCE).toContain("uiLabel('messageDispatchedHint')")
  })

  it('the preview label is kind-aware: a dispatch body is a brief, not "message content"', () => {
    // The preview is the dispatch DESCRIPTION; labelling it 消息内容 / "message content"
    // would describe it in the vocabulary of the thing it is not.
    const labels = readFileSync(join(process.cwd(), 'src/client/ui/labels.ts'), 'utf8')
    expect(GANTT_SOURCE).toContain("uiLabel(kind === 'dispatch' ? 'messageDispatchedPreview' : 'messagePopoverPreview')")
    const zh = /messageDispatchedPreview: '([^']+)'/.exec(labels)?.[1]
    const enSection = labels.slice(labels.indexOf('const en: Record'))
    const en = /messageDispatchedPreview: '([^']+)'/.exec(enSection)?.[1]
    expect(zh).toBe('派发说明')
    expect(en).toBe('dispatch brief')
    // ...and it must differ from the ordinary label in both locales.
    expect(zh).not.toBe(/messagePopoverPreview: '([^']+)'/.exec(labels)?.[1])
    expect(en).not.toBe(/messagePopoverPreview: '([^']+)'/.exec(enSection)?.[1])
  })

  it('both locales carry every dispatch key (no silent English fallback)', () => {
    const labels = readFileSync(join(process.cwd(), 'src/client/ui/labels.ts'), 'utf8')
    const enSection = labels.slice(labels.indexOf('const en: Record'))
    for (const key of ['messageDispatchedTo', 'messageDispatchedFrom', 'messageDispatchedHint', 'messageDispatchedPreview']) {
      const zh = new RegExp(key + ": '([^']+)'").exec(labels)?.[1]
      const en = new RegExp(key + ": '([^']+)'").exec(enSection)?.[1]
      expect(zh, 'zh ' + key).toBeTruthy()
      expect(en, 'en ' + key).toBeTruthy()
    }
  })
})
