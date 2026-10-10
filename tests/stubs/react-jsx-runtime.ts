/**
 * Minimal `react/jsx-runtime` stub (see `tests/stubs/react.ts` for the why).
 *
 * `tsconfig.json` sets `"jsx": "react-jsx"`, so a `.tsx` module compiles to
 * `jsx` / `jsxs` calls against this module. The stub produces the same
 * `{ type, props }` shape as the `createElement` stub, so tests can walk a
 * component's returned tree with one code path.
 */
export interface StubElement {
  type: unknown
  props: Record<string, unknown>
}

export function jsx(type: unknown, props: Record<string, unknown> | null, key?: unknown): StubElement {
  const next: Record<string, unknown> = { ...(props ?? {}) }
  if (key !== undefined) next.key = key
  return { type, props: next }
}

export const jsxs = jsx

export const Fragment = Symbol.for('dsh-task-gantt.test.fragment')
