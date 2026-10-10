/**
 * Minimal React stub used ONLY by the test run (wired through
 * `vitest.config.ts` → `resolve.alias`).
 *
 * The browser half `require`s React from the host's frozen platform module
 * table, so React is intentionally not a dependency of this package. These
 * stubs are enough to *call* a component function and inspect what it returns;
 * they implement no rendering, no re-rendering and no hook state.
 *
 * Hooks return inert values so a single synchronous call of a component body
 * succeeds:
 * - `useState(initial)` → `[initial, noop]`,
 * - `useEffect` / `useLayoutEffect` / `useMemo` / `useCallback` → no-op /
 *   identity-ish, without running effects (they cannot run in a stub anyway).
 */
export interface StubElement {
  type: unknown
  props: Record<string, unknown>
}

/** Hook state: the initial value plus a no-op setter. */
export function useState<T>(initial: T | (() => T)): [T, (next: T) => void] {
  const value = typeof initial === 'function' ? (initial as () => T)() : initial
  return [value, () => undefined]
}

export function useEffect(): void {}
export function useLayoutEffect(): void {}
export function useRef<T>(initial: T): { current: T } {
  return { current: initial }
}
export function useMemo<T>(factory: () => T): T {
  return factory()
}
export function useCallback<T>(callback: T): T {
  return callback
}

/** Enough of `createElement` to inspect a tree: `{ type, props }`. */
export function createElement(type: unknown, props?: Record<string, unknown> | null, ...children: unknown[]): StubElement {
  const next: Record<string, unknown> = { ...(props ?? {}) }
  if (children.length > 0) next.children = children.length === 1 ? children[0] : children
  return { type, props: next }
}

export const Fragment = Symbol.for('dsh-task-gantt.test.fragment')
