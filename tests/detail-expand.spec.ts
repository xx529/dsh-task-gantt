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
    // One content source: the modal body is the variable, never a second JSX tree.
    expect(BOARD).toContain('<div className="dtg-modal-body">{drawerBody}</div>')
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
    expect(BOARD).toMatch(/useEffect\(\(\) => \{\s*setDetailExpanded\(false\)\s*\}, \[selection\]\)/)
  })

  it('is styled with theme tokens and sits above the drawer, below nothing interactive', () => {
    expect(CSS).toContain('.dtg-modal {')
    expect(CSS).toContain('z-index: 45')
    expect(CSS).toContain('background: var(--dsw-alias-bg-mask-1)')
    expect(CSS).toContain('box-shadow: var(--dsw-shadow-lv3)')
    // The message body may use the whole dialog height; the BODY scrolls, not the pre.
    expect(CSS).toContain('.dtg-modal-body .dtg-drawer-pre { max-height: none; }')
  })

  it('names the action in both dictionaries', () => {
    expect(LABELS).toContain("expandDetails: '查看完整详情'")
    expect(LABELS).toContain("expandDetails: 'Open full details'")
  })
})
