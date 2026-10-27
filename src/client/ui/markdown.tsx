/**
 * A small, dependency-free Markdown renderer for the DETAIL views.
 *
 * Why not a library: this plugin ships as a single browser bundle and declares no
 * runtime dependencies; the details only need the subset that chat transcripts
 * actually contain — paragraphs, line breaks, emphasis, inline code, fenced code,
 * lists, quotes, headings, rules and links. A 30 kB parser plus its DOM sanitizer
 * would outweigh the whole panel.
 *
 * Security: the parser produces a TREE, never an HTML string, and the React
 * renderer never uses `dangerouslySetInnerHTML`. Raw HTML in the source is plain
 * text (`<script>` shows as `<script>`), and link targets are allow-listed to
 * http/https/mailto — `javascript:` / `data:` links are rendered as text.
 *
 * The parser is exported and pure so the rules can be locked without a DOM; the
 * component is a thin projection onto React elements.
 */
import type { ReactNode } from 'react'

/* ------------------------------------------------------------------ types */

export type MdInline =
  | { type: 'text'; text: string }
  | { type: 'code'; text: string }
  | { type: 'strong'; text: string }
  | { type: 'em'; text: string }
  | { type: 'del'; text: string }
  | { type: 'link'; text: string; href: string }

export type MdBlock =
  | { type: 'heading'; level: number; inlines: MdInline[] }
  | { type: 'paragraph'; inlines: MdInline[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'list'; ordered: boolean; items: MdInline[][] }
  | { type: 'quote'; inlines: MdInline[] }
  | { type: 'hr' }

/* --------------------------------------------------------------- the URL rule */

/**
 * Resolve a Markdown link target to a safe href, or `null`.
 *
 * Allow-list, not block-list: only `http:`, `https:` and `mailto:` survive. A
 * block-list would have to enumerate every scheme a future browser invents;
 * `data:` and `javascript:` are the two that matter today and both are simply
 * not on the list. Relative targets are rejected too — inside a chat transcript a
 * relative link has no meaningful base.
 *
 * @param raw - the target exactly as written between the parentheses.
 * @returns the trimmed href when allowed, otherwise `null`.
 */
export function safeHref(raw: string): string | null {
  const value = raw.trim()
  if (value === '') return null
  if (!/^(https?:\/\/|mailto:)/i.test(value)) return null
  return value
}

/* --------------------------------------------------------------- inline parse */

/**
 * Parse inline spans. Recursive for emphasis, bounded to {@link MAX_INLINE_DEPTH}
 * so a pathological string (`**` repeated) cannot overflow the stack.
 *
 * @param source - one block's text, line breaks included.
 * @param depth - recursion guard (emphasis re-enters this function).
 */
export function parseInline(source: string, depth = 0): MdInline[] {
  if (depth > 4) return [{ type: 'text', text: source }]
  const out: MdInline[] = []
  let buffer = ''
  const flush = (): void => {
    if (buffer !== '') {
      out.push({ type: 'text', text: buffer })
      buffer = ''
    }
  }
  let index = 0
  while (index < source.length) {
    const char = source[index] as string
    // `code` first: its content is literal, so ** inside code must stay **.
    if (char === '`') {
      const end = source.indexOf('`', index + 1)
      if (end > index) {
        flush()
        out.push({ type: 'code', text: source.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }
    if (source.startsWith('**', index)) {
      const end = source.indexOf('**', index + 2)
      if (end > index + 2) {
        flush()
        out.push({ type: 'strong', text: source.slice(index + 2, end) })
        index = end + 2
        continue
      }
    }
    if (source.startsWith('~~', index)) {
      const end = source.indexOf('~~', index + 2)
      if (end > index + 2) {
        flush()
        out.push({ type: 'del', text: source.slice(index + 2, end) })
        index = end + 2
        continue
      }
    }
    if (char === '*' || char === '_') {
      const end = source.indexOf(char, index + 1)
      if (end > index + 1) {
        flush()
        out.push({ type: 'em', text: source.slice(index + 1, end) })
        index = end + 1
        continue
      }
    }
    if (char === '[') {
      const match = /^\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/.exec(source.slice(index))
      if (match !== null) {
        const label = match[1] ?? ''
        const href = safeHref(match[2] ?? '')
        flush()
        if (href === null) out.push({ type: 'text', text: match[0] })
        else out.push({ type: 'link', text: label, href })
        index += match[0].length
        continue
      }
    }
    buffer += char
    index += 1
  }
  flush()
  return out
}

/* ---------------------------------------------------------------- block parse */

const FENCE = /^```(.*)$/
const HEADING = /^(#{1,6})\s+(.*)$/
const RULE = /^(?:---|\*\*\*|___)\s*$/
const QUOTE = /^>\s?/
const UNORDERED = /^\s*[-*+]\s+(.*)$/
const ORDERED = /^\s*\d+[.)]\s+(.*)$/

/**
 * Parse a Markdown source into blocks.
 *
 * Deliberate deviations from CommonMark, because this renders CHAT MESSAGES:
 * - a single newline inside a paragraph is a hard line break (people press Enter
 *   to mean "new line"; CommonMark would join the lines and lose it);
 * - fenced code is verbatim, no language highlighting;
 * - nested block structures (a list inside a quote) are NOT modelled; the
 *   transcripts do not contain them and pretending otherwise would be untested
 *   complexity.
 *
 * @param source - the raw markdown.
 */
export function parseMarkdown(source: string): MdBlock[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n')
  const blocks: MdBlock[] = []
  let paragraph: string[] = []
  const flushParagraph = (): void => {
    if (paragraph.length === 0) return
    blocks.push({ type: 'paragraph', inlines: parseInline(paragraph.join('\n')) })
    paragraph = []
  }
  let index = 0
  while (index < lines.length) {
    const line = lines[index] ?? ''
    const fence = FENCE.exec(line)
    if (fence !== null) {
      flushParagraph()
      const lang = (fence[1] ?? '').trim()
      const code: string[] = []
      index += 1
      while (index < lines.length && FENCE.exec(lines[index] ?? '') === null) {
        code.push(lines[index] ?? '')
        index += 1
      }
      index += 1 // consume the closing fence (or run off the end)
      blocks.push({ type: 'code', lang, code: code.join('\n') })
      continue
    }
    if (/^\s*$/.test(line)) {
      flushParagraph()
      index += 1
      continue
    }
    const heading = HEADING.exec(line)
    if (heading !== null) {
      flushParagraph()
      blocks.push({ type: 'heading', level: (heading[1] ?? '#').length, inlines: parseInline(heading[2] ?? '') })
      index += 1
      continue
    }
    if (RULE.test(line)) {
      flushParagraph()
      blocks.push({ type: 'hr' })
      index += 1
      continue
    }
    if (QUOTE.test(line)) {
      flushParagraph()
      const quoted: string[] = []
      while (index < lines.length && QUOTE.test(lines[index] ?? '')) {
        quoted.push((lines[index] ?? '').replace(QUOTE, ''))
        index += 1
      }
      blocks.push({ type: 'quote', inlines: parseInline(quoted.join('\n')) })
      continue
    }
    const unordered = UNORDERED.exec(line)
    const ordered = unordered === null ? ORDERED.exec(line) : null
    if (unordered !== null || ordered !== null) {
      flushParagraph()
      const isOrdered = unordered === null
      const items: MdInline[][] = []
      while (index < lines.length) {
        const current = lines[index] ?? ''
        const match = isOrdered ? ORDERED.exec(current) : UNORDERED.exec(current)
        if (match === null) break
        items.push(parseInline(match[1] ?? ''))
        index += 1
        // A wrapped item's continuation lines are indented; keep them in the item.
        while (index < lines.length && /^\s{2,}\S/.test(lines[index] ?? '')) {
          const tail = (lines[index] ?? '').trim()
          const last = items[items.length - 1]
          if (last === undefined) break
          last.push({ type: 'text', text: `\n${tail}` })
          index += 1
        }
      }
      blocks.push({ type: 'list', ordered: isOrdered, items })
      continue
    }
    paragraph.push(line)
    index += 1
  }
  flushParagraph()
  return blocks
}

/* ----------------------------------------------------------------- rendering */

function renderInline(tokens: MdInline[], keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = []
  tokens.forEach((token, index) => {
    const key = `${keyPrefix}:${index}`
    switch (token.type) {
      case 'text': {
        // Hard line breaks inside a paragraph: split here so the DOM keeps them.
        const parts = token.text.split('\n')
        parts.forEach((part, partIndex) => {
          if (partIndex > 0) out.push(<br key={`${key}:br:${partIndex}`} />)
          if (part !== '') out.push(part)
        })
        break
      }
      case 'code':
        out.push(<code className="dtg-md-code" key={key}>{token.text}</code>)
        break
      case 'strong':
        out.push(<strong key={key}>{token.text}</strong>)
        break
      case 'em':
        out.push(<em key={key}>{token.text}</em>)
        break
      case 'del':
        out.push(<del key={key}>{token.text}</del>)
        break
      case 'link':
        out.push(
          <a className="dtg-md-link" href={token.href} target="_blank" rel="noreferrer noopener" key={key}>
            {token.text === '' ? token.href : token.text}
          </a>,
        )
        break
    }
  })
  return out
}

function renderBlock(block: MdBlock, index: number): ReactNode {
  const key = `b${index}`
  switch (block.type) {
    case 'heading': {
      const level = Math.min(6, Math.max(1, block.level))
      return (
        <div className={`dtg-md-heading dtg-md-h${level}`} role="heading" aria-level={level} key={key}>
          {renderInline(block.inlines, key)}
        </div>
      )
    }
    case 'paragraph':
      return <p className="dtg-md-p" key={key}>{renderInline(block.inlines, key)}</p>
    case 'code':
      return (
        <pre className="dtg-md-pre" key={key} data-lang={block.lang === '' ? undefined : block.lang}>
          <code>{block.code}</code>
        </pre>
      )
    case 'list': {
      const items = block.items.map((item, itemIndex) => <li key={`${key}:i${itemIndex}`}>{renderInline(item, `${key}:i${itemIndex}`)}</li>)
      return block.ordered ? <ol className="dtg-md-list" key={key}>{items}</ol> : <ul className="dtg-md-list" key={key}>{items}</ul>
    }
    case 'quote':
      return <blockquote className="dtg-md-quote" key={key}>{renderInline(block.inlines, key)}</blockquote>
    case 'hr':
      return <hr className="dtg-md-hr" key={key} />
  }
}

/**
 * Render a Markdown source as React elements.
 *
 * @param props.source - the raw text.
 */
export function Markdown({ source }: { source: string }): ReactNode {
  const blocks = parseMarkdown(source)
  return <div className="dtg-md">{blocks.map((block, index) => renderBlock(block, index))}</div>
}
