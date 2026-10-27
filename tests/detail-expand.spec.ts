/**
 * The expanded detail dialog ("查看完整详情").
 *
 * The reported need: the bottom drawer is fine for a glance, but a long message or a
 * 4-question call is cramped in 62% of a 480px panel. The expand button opens the SAME
 * content in a modal that covers the panel and scrolls its body instead of a nested
 * 34vh box.
 *
 * These are structural assertions on the source and stylesheet: there is no DOM in this
 * suite, so the observable contract is "the modal exists, reuses the drawer body node,
 * closes outermost-first, and is styled with tokens".
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const ROOT = resolve(process.cwd())
const BOARD = readFileSync(resolve(ROOT, 'src/client/ui/BoardView.tsx'), 'utf8')
const CSS = readFileSync(resolve(ROOT, 'src/client/ui/styles-shell.ts'), 'utf8')
const LABELS = readFileSync(resolve(ROOT, 'src/client/ui/labels.ts'), 'utf8')

describe('expanded detail modal', () => {
  it('the drawer offers an explicit expand control, not a hidden gesture', () => {
    expect(BOARD).toContain('dtg-drawer-expand')
    expect(BOARD).toContain('expandDetails')
    expect(BOARD).toContain('<ExpandIcon />')
  })

  it('the modal renders the SAME `drawerBody` node, so the two views cannot disagree', () => {
    expect(BOARD).toContain('dtg-modal')
    expect(BOARD).toContain('role="dialog"')
    expect(BOARD).toContain('aria-modal="true"')
    // One content source: the dialog receives the drawer body as children, never a
    // second JSX tree.
    expect(BOARD).toContain('<div className="dtg-modal-body">{children}</div>')
    expect(BOARD).toMatch(/<DetailModal[\s\S]*?>\s*\{drawerBody\}\s*<\/DetailModal>/)
  })

  it('Escape closes the modal BEFORE the drawer', () => {
    // The handler must test `detailExpanded` first; otherwise one Esc throws away the
    // detail the reader just enlarged.
    const esc = BOARD.slice(BOARD.indexOf("if (event.key !== 'Escape') return"))
    const block = esc.slice(0, esc.indexOf('}\n    }'))
    expect(block.indexOf('detailExpanded')).toBeGreaterThanOrEqual(0)
    expect(block.indexOf('detailExpanded')).toBeLessThan(block.indexOf('setSelection(null)'))
  })

  it('a selection change resets the modal, so another item never opens already-expanded', () => {
    expect(BOARD).toMatch(
      /useEffect\(\(\) => \{\s*setDetailExpanded\(false\)\s*setRawText\(false\)\s*\}, \[selection\]\)/,
    )
  })

  it('centers on the WHOLE app: fixed overlay, measured, without a react-dom dependency', () => {
    // The reported defect: the dialog was centered inside the 480px panel. The bundle's
    // external contract permits only `react` / `react-jsx-runtime`, so `createPortal`
    // is not available — instead the overlay is fixed AND measures its own viewport box,
    // compensating when an ancestor creates a containing block (transform / contain).
    expect(BOARD).toContain('function DetailModal')
    expect(BOARD).toContain('getBoundingClientRect()')
    expect(BOARD).toContain('window.innerWidth')
    expect(BOARD).toContain('setViewportFix')
    expect(BOARD).not.toContain("from 'react-dom'")
    expect(CSS).toMatch(/\.dtg-modal \{[^}]*position: fixed;/)
    expect(CSS).toMatch(/\.dtg-modal \{[^}]*z-index: 1000;/)
  })

  it('is sized to the app and may fill the dialog height', () => {
    expect(CSS).toContain('width: min(760px, 92vw)')
    expect(CSS).toContain('max-height: min(88vh, 760px)')
    expect(CSS).toContain('background: var(--dsw-alias-bg-mask-1)')
    expect(CSS).toContain('box-shadow: var(--dsw-shadow-lv3)')
    // The message body may use the whole dialog height; the BODY scrolls, not the pre.
    expect(CSS).toContain('.dtg-modal-body .dtg-drawer-pre { max-height: none; }')
  })

  it('defaults to rendered Markdown and offers an explicit raw toggle', () => {
    // The transcript bodies are Markdown; the drawer renders them, and "原文/渲染"
    // reveals the exact text instead of forcing one view.
    expect(BOARD).toContain("import { Markdown } from './markdown.tsx'")
    expect(BOARD).toContain('<Markdown source={detail.body} />')
    expect(BOARD).toContain('dtg-raw-toggle')
    expect(BOARD).toContain('rawText')
    expect(BOARD).toContain("uiLabel('renderedText')")
    expect(BOARD).toContain("uiLabel('rawText')")
    expect(CSS).toContain('.dtg-md {')
  })

  it('names both actions in both dictionaries', () => {
    expect(LABELS).toContain("expandDetails: '查看完整详情'")
    expect(LABELS).toContain("expandDetails: 'Open full details'")
    expect(LABELS).toContain("rawText: '原文'")
    expect(LABELS).toContain("renderedText: '渲染'")
    expect(LABELS).toContain("rawText: 'Raw'")
    expect(LABELS).toContain("renderedText: 'Rendered'")
  })
})
