/**
 * Where a fixed-positioned overlay is allowed to be.
 *
 * ── WHY THIS IS ITS OWN MODULE ───────────────────────────────────────────────
 * Two overlays need the same answer: the hover popover (task cards and message
 * markers) and the teammate filter's menu. Writing it twice would be two chances to
 * get the same trap wrong, and this trap has already cost this repository twice.
 *
 * ── THE TRAP ────────────────────────────────────────────────────────────────
 * `position: fixed` does NOT escape an ancestor's overflow clipping. Measured in the
 * demo: the popover was 280px wide at x=339 while the nearest clipping ancestor ended
 * at x=380, so 239px of it — every line of text — was invisible, and `elementFromPoint`
 * beyond that edge returned `BODY`. Clamping to the VIEWPORT silently allowed that,
 * because the viewport was much wider than the panel. Clamping to the nearest really
 * clipping ANCESTOR is what actually keeps an overlay on screen.
 */

/** A viewport-space rectangle. */
export interface OverlayBounds {
  left: number
  right: number
  top: number
  bottom: number
  width: number
}

/**
 * The rectangle an overlay anchored inside `anchor` must stay within.
 *
 * Walks outwards from the anchor to the nearest ancestor that clips (`overflow` other
 * than `visible`) and is wide enough to host an overlay; falls back to the viewport
 * when nothing clips.
 *
 * @param anchor - the element the overlay is attached to.
 * @param minWidth - the smallest ancestor that could host the overlay. A box narrower
 *   than this is skipped, because clamping into it would clip the overlay just as
 *   badly; widths below this are also why the walk keeps going outwards.
 */
/**
 * Options for {@link clipBounds}.
 *
 * There is no `scope` option any more. One was added for the teammate filter menu (to
 * reach the outermost clipper, the panel) and then made OBSOLETE: on a short docked panel
 * that bound squeezed the menu to nearly zero height, so the menu now measures against the
 * WINDOW instead — see `BoardView.tsx`. The hover popover never wanted the outer bound; it
 * wants the FIRST clipper (the scrolling lane area). With one caller left, the option and
 * the walk it enabled are gone rather than left as a knob nobody turns.
 */
export interface ClipBoundsOptions {
  /** Smallest ancestor width that could host the overlay. Narrower boxes are skipped. */
  minWidth?: number
}

export function clipBounds(anchor: HTMLElement, options: ClipBoundsOptions | number = {}): OverlayBounds {
  const opts: ClipBoundsOptions = typeof options === 'number' ? { minWidth: options } : options
  const minWidth = opts.minWidth ?? 160
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth
  const viewportHeight = typeof window === 'undefined' ? 768 : window.innerHeight
  const viewport: OverlayBounds = {
    left: 0,
    right: viewportWidth,
    top: 0,
    bottom: viewportHeight,
    width: viewportWidth,
  }
  if (typeof document === 'undefined') return viewport
  let el: Element | null = anchor.parentElement
  while (el !== null && el !== document.documentElement) {
    const cs = getComputedStyle(el)
    if (cs.overflow !== 'visible' || cs.overflowX !== 'visible' || cs.overflowY !== 'visible') {
      const r = el.getBoundingClientRect()
      // A box with no height cannot host an overlay; keep walking rather than clamping
      // into a zero-height sliver.
      if (r.width >= minWidth && r.height > 0) {
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }
      }
    }
    el = el.parentElement
  }
  return viewport
}

/**
 * The element that `position: fixed` descendants are resolved against, or `null` when
 * that is the viewport.
 *
 * Normally a fixed element IS resolved against the viewport, which is what every caller
 * here assumes. But an ancestor with `transform`, `filter`, `perspective`,
 * `contain: paint|layout|strict|content`, or `will-change: transform` becomes the
 * CONTAINING BLOCK instead. Measured on a synthesised case: a wrapper with
 * `transform: translate(0,0)` at viewport `left 600 / top 400` made a menu whose inline
 * style was `left:955` render at viewport `x=1555` — off by exactly the wrapper's own
 * position, i.e. the user's "菜单不在点击处的下方".
 *
 * @param element - the element whose fixed positioning is being computed.
 */
export function fixedContainingBlock(element: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = element.parentElement
  while (el !== null && el !== document.documentElement) {
    const cs = getComputedStyle(el)
    if (
      cs.transform !== 'none' ||
      cs.filter !== 'none' ||
      cs.perspective !== 'none' ||
      cs.willChange === 'transform' ||
      /paint|layout|strict|content|size/.test(cs.contain === 'none' ? '' : cs.contain)
    ) {
      return el
    }
    el = el.parentElement
  }
  return null
}

/**
 * How much to subtract from a VIEWPORT-space offset before writing it as `top`/`left`
 * on a fixed element, plus the coordinate space's own bounds.
 *
 * When a containing block exists, `top`/`left` are measured from that ancestor's padding
 * box rather than the viewport, so `viewportOffset - ancestorViewportOffset` is the value
 * that actually lands on screen where the viewport arithmetic said. With no such
 * ancestor both offsets are zero and nothing changes.
 *
 * The bounds are returned in the SAME space, so room/flip/clamp decisions stay correct
 * for a docked panel whose wrapper is smaller than the window.
 *
 * @param element - the fixed-positioned element being placed.
 */
export function overlaySpace(element: HTMLElement): { offsetX: number; offsetY: number; bounds: OverlayBounds } {
  const viewport: OverlayBounds = {
    left: 0,
    right: typeof window === 'undefined' ? 1024 : window.innerWidth,
    top: 0,
    bottom: typeof window === 'undefined' ? 768 : window.innerHeight,
    width: typeof window === 'undefined' ? 1024 : window.innerWidth,
  }
  if (typeof document === 'undefined') return { offsetX: 0, offsetY: 0, bounds: viewport }
  const cb = fixedContainingBlock(element)
  if (cb === null) return { offsetX: 0, offsetY: 0, bounds: viewport }
  const r = cb.getBoundingClientRect()
  return {
    offsetX: r.left,
    offsetY: r.top,
    bounds: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width },
  }
}
