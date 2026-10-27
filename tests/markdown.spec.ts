/**
 * The detail views' Markdown renderer.
 *
 * The transcript bodies are authored in Markdown (headings, `code`, **bold**, lists,
 * fenced blocks). The renderer is a small in-repo parser — no dependency, no
 * `dangerouslySetInnerHTML` — and these tests lock the two things that matter:
 *
 * 1. the block/inline rules the details actually use, including a single newline
 *    inside a paragraph staying a line break (chat convention, not CommonMark);
 * 2. SAFETY: raw HTML is text, and only http/https/mailto links become anchors.
 *
 * The component is asserted through the test React stub (`{ type, props }`), the same
 * way the other client specs inspect a component tree; there is no DOM in this suite.
 */
import { describe, expect, it } from 'vitest'
import { Markdown, parseInline, parseMarkdown, safeHref } from '../src/client/ui/markdown.tsx'

type Node = { type: unknown; props: Record<string, unknown> }

/** Flatten a stub element tree into every element node (depth-first). */
function nodes(value: unknown, out: Node[] = []): Node[] {
  if (Array.isArray(value)) {
    for (const item of value) nodes(item, out)
    return out
  }
  if (value !== null && typeof value === 'object' && 'type' in (value as Record<string, unknown>)) {
    const node = value as Node
    out.push(node)
    nodes(node.props.children, out)
  }
  return out
}

/** All plain-text leaves of a stub tree, concatenated. */
function textOf(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map((item) => textOf(item)).join('')
  if (value !== null && typeof value === 'object' && 'type' in (value as Record<string, unknown>)) {
    return textOf((value as Node).props.children)
  }
  return ''
}

describe('safeHref', () => {
  it('allows http, https and mailto only', () => {
    expect(safeHref('https://example.com/a')).toBe('https://example.com/a')
    expect(safeHref('http://example.com')).toBe('http://example.com')
    expect(safeHref('mailto:a@b.c')).toBe('mailto:a@b.c')
  })

  it('rejects script/data/relative targets instead of sanitizing them', () => {
    for (const bad of ['javascript:alert(1)', 'data:text/html,x', 'vbscript:x', '/relative', '#frag', '   ']) {
      expect(safeHref(bad), bad).toBeNull()
    }
  })
})

describe('parseMarkdown blocks', () => {
  it('parses headings, paragraphs and rules', () => {
    const blocks = parseMarkdown('# Title\n\nbody\n\n---')
    expect(blocks.map((block) => block.type)).toEqual(['heading', 'paragraph', 'hr'])
    expect(blocks[0]).toMatchObject({ type: 'heading', level: 1 })
  })

  it('keeps a SINGLE newline inside a paragraph (chat line breaks)', () => {
    const blocks = parseMarkdown('first line\nsecond line')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ type: 'paragraph' })
    const inlines = blocks[0]?.type === 'paragraph' ? blocks[0].inlines : []
    expect(inlines.some((token) => token.type === 'text' && token.text.includes('\n'))).toBe(true)
  })

  it('parses fenced code verbatim, including blank lines and markup', () => {
    const blocks = parseMarkdown('```bash\nnpm run verify\n\n<script>x</script>\n```')
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toMatchObject({ type: 'code', lang: 'bash' })
    const code = blocks[0]?.type === 'code' ? blocks[0].code : ''
    expect(code).toContain('npm run verify')
    expect(code).toContain('<script>x</script>')
  })

  it('groups bullet and ordered lists separately', () => {
    const unordered = parseMarkdown('- one\n- two')
    expect(unordered[0]).toMatchObject({ type: 'list', ordered: false })
    expect(unordered[0]?.type === 'list' ? unordered[0].items.length : 0).toBe(2)
    const ordered = parseMarkdown('1. first\n2. second')
    expect(ordered[0]).toMatchObject({ type: 'list', ordered: true })
  })

  it('parses a quote block', () => {
    const blocks = parseMarkdown('> quoted\n> second')
    expect(blocks[0]).toMatchObject({ type: 'quote' })
  })
})

describe('parseInline', () => {
  it('parses strong, code, emphasis, strike and links', () => {
    const tokens = parseInline('**bold** `code` *em* ~~del~~ [site](https://example.com)')
    expect(tokens.map((token) => token.type)).toEqual(['strong', 'text', 'code', 'text', 'em', 'text', 'del', 'text', 'link'])
    expect(tokens.find((token) => token.type === 'link')).toMatchObject({ href: 'https://example.com', text: 'site' })
  })

  it('keeps ** inside inline code literal', () => {
    const tokens = parseInline('`a ** b`')
    expect(tokens).toHaveLength(1)
    expect(tokens[0]).toMatchObject({ type: 'code', text: 'a ** b' })
  })

  it('renders an unsafe link as plain text', () => {
    const tokens = parseInline('[click](javascript:alert(1))')
    expect(tokens.some((token) => token.type === 'link')).toBe(false)
    expect(tokens.map((token) => (token.type === 'text' ? token.text : '')).join('')).toContain('javascript:alert(1)')
  })
})

describe('Markdown rendering', () => {
  it('renders elements, not an HTML string', () => {
    const tree = Markdown({ source: '# Head\n\n**bold** and `code`\n\n- a\n- b' })
    const els = nodes(tree)
    expect(els.some((node) => String(node.props.className ?? '').includes('dtg-md-heading'))).toBe(true)
    expect(els.some((node) => node.type === 'strong' && textOf(node) === 'bold')).toBe(true)
    expect(els.some((node) => node.type === 'code' && node.props.className === 'dtg-md-code')).toBe(true)
    expect(els.some((node) => node.type === 'ul' && node.props.className === 'dtg-md-list')).toBe(true)
  })

  it('turns a paragraph newline into a <br>', () => {
    const els = nodes(Markdown({ source: 'one\ntwo' }))
    expect(els.some((node) => node.type === 'br')).toBe(true)
    expect(textOf(Markdown({ source: 'one\ntwo' }))).toBe('onetwo')
  })

  it('never emits raw HTML: a script tag stays text', () => {
    const tree = Markdown({ source: '<script>alert(1)</script>' })
    expect(nodes(tree).some((node) => node.type === 'script')).toBe(false)
    expect(textOf(tree)).toContain('<script>alert(1)</script>')
  })

  it('opens links in a new tab without leaking the opener', () => {
    const anchor = nodes(Markdown({ source: '[x](https://example.com)' })).find((node) => node.type === 'a')
    expect(anchor?.props.href).toBe('https://example.com')
    expect(anchor?.props.target).toBe('_blank')
    expect(anchor?.props.rel).toBe('noreferrer noopener')
  })
})
