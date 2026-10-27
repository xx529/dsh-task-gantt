/**
 * Client-half tab registration (`src/client/index.ts`, owner: shell).
 *
 * This is the test that proves the tab actually reaches better-sidebar: the
 * real `apply()` is called with a recording fake service, and the descriptor
 * handed to `registerTab` is inspected field by field. Then the component is
 * *called* with the `TabComponentProps` shape the guide documents (§4.2) and
 * must return an element instead of throwing.
 *
 * The activation-order race is covered explicitly: better-sidebar may apply
 * after this plugin, so `ctx.inject(['betterSidebar'], cb)` is the "run when
 * available" hook, and the late-arrival path must register the tab too.
 *
 * React is resolved from the host's frozen platform table at runtime, so the
 * test run aliases it to `tests/stubs/react.ts` (see `vitest.config.ts`).
 *
 * ADDED 2026-10-27 (v1 shell): the tab body's FIRST frame is now a real element
 * (toolbar + loading skeleton) rather than the old `return null`; the last
 * describe block locks that, because a blank first frame and an unreachable retry
 * were the P0 defects of the redesign.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { TAB_TYPE_ID } from '../src/shared/contract.ts'
import { apply, inject, name } from '../src/client/index.ts'
import { dictionaries } from '../src/client/i18n.ts'

/** A recording stand-in for better-sidebar's tab service. */
function recordingSidebar() {
  const registerCalls: Record<string, unknown>[] = []
  return {
    registerCalls,
    registerTab(descriptor: Record<string, unknown>): () => void {
      registerCalls.push(descriptor)
      return () => undefined
    },
  }
}

type Sidebar = ReturnType<typeof recordingSidebar>

/**
 * Recursively invoke function components in a stub element tree, so the
 * rendered output (not just the component reference) can be inspected.
 */
function renderTree(node: unknown, depth = 0): unknown {
  if (depth > 8 || node === null || typeof node !== 'object') return node
  const element = node as { type?: unknown; props?: Record<string, unknown> }
  if (typeof element.type === 'function') {
    return renderTree((element.type as (props: unknown) => unknown)(element.props ?? {}), depth + 1)
  }
  const props: Record<string, unknown> = { ...(element.props ?? {}) }
  if (Array.isArray(props.children)) props.children = props.children.map((child) => renderTree(child, depth + 1))
  else if (props.children !== undefined) props.children = renderTree(props.children, depth + 1)
  return { type: element.type, props }
}

interface AppliedContext {
  sidebar: Sidebar
  warnings: string[]
  /** Values returned by each `ctx.effect(...)` callback (the disposers). */
  effectReturns: unknown[]
  /** Services requested through `ctx.inject(names, cb)`. */
  injectRequests: { names: string[]; callback: (scoped: Context) => void }[]
  /** Build a context where the service IS mounted (for the late-arrival path). */
  scopedWithService: () => Context
}

/** Call the real `apply()` against a fake context. */
function applied(options: { withSidebar: boolean }): AppliedContext {
  const sidebar = recordingSidebar()
  const warnings: string[] = []
  const effectReturns: unknown[] = []
  const injectRequests: { names: string[]; callback: (scoped: Context) => void }[] = []

  const makeContext = (mounted: boolean): Context => {
    const base = {
      logger: {
        warn: (message: string) => void warnings.push(message),
        info: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      },
      get: (serviceName: string) => (mounted && serviceName === 'betterSidebar' ? sidebar : undefined),
      effect: (callback: () => unknown) => {
        effectReturns.push(callback())
        return () => undefined
      },
      inject: (names: string[], callback: (scoped: Context) => void) => {
        injectRequests.push({ names, callback })
        return () => undefined
      },
      on: () => () => undefined,
    }
    return base as unknown as Context
  }

  const ctx = makeContext(options.withSidebar)
  apply(ctx)
  return { sidebar, warnings, effectReturns, injectRequests, scopedWithService: () => makeContext(true) }
}

describe('client half module shape', () => {
  it('exports the loader row name equal to the package name', () => {
    expect(name).toBe('dsh-task-gantt')
  })

  it('declares a string-array inject list', () => {
    expect(Array.isArray(inject)).toBe(true)
    for (const entry of inject) expect(typeof entry).toBe('string')
  })

  it.skip('[KNOWN RISK — reported, not enforced] declares betterSidebar in the cordis inject export', () => {
    // verify measured that the shipped third-party plugin `dsh-code-nav`
    // (lib/client.js) declares `const inject = ["betterSidebar", "locale"]`, and
    // the official guide §3 says `export const inject = ['betterSidebar']` makes
    // "注册时机无忧（顺序无关）". This repo instead keeps `inject` empty and
    // defers through `ctx.inject([...], cb)` — which removes the same race, so
    // the risk is considered addressed; this line documents the alternative
    // spelling and would only be un-skipped if the Lead flips that decision.
    expect(inject).toContain('betterSidebar')
  })
})

describe('tab registration (service already mounted)', () => {
  it('registers exactly one tab', () => {
    const { sidebar, effectReturns } = applied({ withSidebar: true })
    expect(sidebar.registerCalls).toHaveLength(1)
    // The disposer must be the value the effect callback returns, otherwise
    // cordis cannot undo the registration on unload/HMR (guide §3/§9).
    expect(effectReturns[0]).toBeTypeOf('function')
  })

  it('does not fall back to the deferred path when the service is present', () => {
    const { injectRequests } = applied({ withSidebar: true })
    expect(injectRequests).toHaveLength(0)
  })

  it('uses the frozen TAB_TYPE_ID as the tab id', () => {
    const { sidebar } = applied({ withSidebar: true })
    expect(sidebar.registerCalls[0]?.id).toBe(TAB_TYPE_ID)
  })

  it('gives the tab a title and a description in the detected locale', () => {
    const { sidebar } = applied({ withSidebar: true })
    const descriptor = sidebar.registerCalls[0] as { title?: unknown; description?: unknown }
    const title = typeof descriptor.title === 'function' ? (descriptor.title as () => string)() : descriptor.title
    const description = typeof descriptor.description === 'function' ? (descriptor.description as () => string)() : descriptor.description
    expect(typeof title).toBe('string')
    expect(String(title).length).toBeGreaterThan(0)
    expect(typeof description).toBe('string')
    expect(String(description).length).toBeGreaterThan(0)
    // The title is one of the two declared dictionary values (no literal).
    expect([dictionaries.zh.tabTitle, dictionaries.en.tabTitle]).toContain(title)
  })

  it('is a single-instance tab (single:true ≡ dedupeKey: () => id, guide §4.1)', () => {
    const descriptor = applied({ withSidebar: true }).sidebar.registerCalls[0] as {
      single?: unknown
      dedupeKey?: unknown
      order?: unknown
    }
    const singleOrDeduped =
      descriptor.single === true ||
      (typeof descriptor.dedupeKey === 'function' &&
        (descriptor.dedupeKey as (tab: { id: string; type: string }) => string)({ id: 't', type: TAB_TYPE_ID }) === TAB_TYPE_ID)
    expect(singleOrDeduped, 'the + menu must focus an open board instead of opening a second one').toBe(true)
    expect(typeof descriptor.order).toBe('number')
  })

  it('ships a token-only icon (currentColor, never a literal)', () => {
    const descriptor = applied({ withSidebar: true }).sidebar.registerCalls[0] as { icon?: unknown }
    expect(descriptor.icon, 'the + menu entry needs a glyph (guide §4.1)').toBeTruthy()
    const icon = descriptor.icon as (size: number) => { props?: Record<string, unknown> } | null
    const element = typeof icon === 'function' ? icon(14) : (descriptor.icon as { props?: Record<string, unknown> })
    expect(element, 'the icon must render').toBeTruthy()
    const serialized = JSON.stringify(renderTree(element))
    expect(serialized, 'the icon must not carry a colour literal').not.toMatch(/#[0-9a-fA-F]{3,8}\b|\brgba?\(/)
    expect(serialized).toContain('currentColor')
  })

  it('is a component function that renders without throwing', () => {
    const { sidebar, scopedWithService } = applied({ withSidebar: true })
    const descriptor = sidebar.registerCalls[0] as { component: (props: unknown) => unknown }
    expect(typeof descriptor.component).toBe('function')
    // The exact props shape from the guide §4.2.
    const element = descriptor.component({
      ctx: scopedWithService(),
      store: {},
      scope: { sessionId: 'session-abc', cwd: '/tmp' },
      tab: { id: 'tab-1', type: TAB_TYPE_ID, title: 'Task Gantt' },
      visible: true,
    })
    expect(element, 'the tab component must return an element').toBeTruthy()
  })

  it('renders while hidden (a background tab must not throw)', () => {
    const { sidebar, scopedWithService } = applied({ withSidebar: true })
    const descriptor = sidebar.registerCalls[0] as { component: (props: unknown) => unknown }
    const element = descriptor.component({
      ctx: scopedWithService(),
      store: {},
      scope: { sessionId: 'session-abc' },
      tab: { id: 'tab-1', type: TAB_TYPE_ID, title: 'Task Gantt' },
      visible: false,
    })
    expect(element, 'a hidden tab must still return an element').toBeTruthy()
  })
})

describe('the tab body reaches its loading state (P0)', () => {
  it('renders the shell toolbar plus a loading skeleton on the very first frame, never null', () => {
    // The reported defect: `if (shownData === null) return null` sat ABOVE the
    // loading/error branches, so the first frame was blank and a failed fetch had
    // no retry. The fix is only real if the component's first render is an
    // element carrying the shell state — so this invokes it exactly the way the
    // tab host does and inspects the tree.
    const descriptor = applied({ withSidebar: true }).sidebar.registerCalls[0] as {
      component: (props: unknown) => unknown
    }
    const element = descriptor.component({
      ctx: applied({ withSidebar: true }).scopedWithService(),
      store: {},
      scope: { sessionId: 'session-abc', cwd: '/tmp' },
      tab: { id: 'tab-1', type: TAB_TYPE_ID, title: 'Task Gantt' },
      visible: true,
    })
    expect(element, 'the tab component must return an element').toBeTruthy()
    const rendered = renderTree(element)
    expect(rendered, 'the first frame must be a real tree, not null').not.toBeNull()
    const serialized = JSON.stringify(rendered)
    // The shell, not a bare frame: toolbar + centered state + the skeleton.
    expect(serialized).toContain('dtg-topbar')
    expect(serialized).toContain('dtg-state')
    expect(serialized).toContain('dtg-state-skeleton')
    expect(serialized, 'the old bare root had no state block').toContain('dtg-state-title')
  })
})

describe('degradation and late arrival', () => {
  it('stays dormant, warns, and defers on the service when better-sidebar is absent', () => {
    const { sidebar, warnings, injectRequests } = applied({ withSidebar: false })
    expect(sidebar.registerCalls).toHaveLength(0)
    expect(warnings.length, 'a dormant plugin must say why in the log').toBeGreaterThan(0)
    expect(warnings.join('\n')).toMatch(/better-sidebar|betterSidebar/i)
    // The deferred path is what removes the activation-order race.
    expect(injectRequests).toHaveLength(1)
    expect(injectRequests[0]?.names).toContain('betterSidebar')
    expect(typeof injectRequests[0]?.callback).toBe('function')
  })

  it('registers the tab when better-sidebar arrives later', () => {
    const { sidebar, injectRequests, scopedWithService } = applied({ withSidebar: false })
    expect(sidebar.registerCalls).toHaveLength(0)
    const request = injectRequests[0]
    expect(request).toBeDefined()
    // Simulate the service becoming available: cordis calls the callback with a
    // scoped context where the injected service resolves.
    request?.callback(scopedWithService())
    expect(sidebar.registerCalls, 'the late-arriving service must still get the tab').toHaveLength(1)
    expect(sidebar.registerCalls[0]?.id).toBe(TAB_TYPE_ID)
  })

  it('survives a service that refuses the registration (duplicate id from a stale materialization)', () => {
    const warnings: string[] = []
    const throwingSidebar = {
      registerTab: () => {
        throw new Error('tab type "dsh-task-gantt:board" already registered')
      },
    }
    const ctx = {
      logger: { warn: (message: string) => void warnings.push(message), info: () => undefined, error: () => undefined },
      get: (serviceName: string) => (serviceName === 'betterSidebar' ? throwingSidebar : undefined),
      effect: (callback: () => unknown) => {
        callback()
        return () => undefined
      },
      inject: () => () => undefined,
      on: () => () => undefined,
    } as unknown as Context
    expect(() => apply(ctx), 'a duplicate registration must not take the plugin fiber down').not.toThrow()
    expect(warnings.join('\n')).toMatch(/already registered|could not register/i)
  })

  it('survives a context with no ctx.inject (an older cordis must not be a crash)', () => {
    // The deferred `ctx.inject(['betterSidebar'], …)` path is what removes the
    // activation-order race, but a host that lacks it must degrade to the warn
    // branch instead of throwing `ctx.inject is not a function`.
    const warnings: string[] = []
    const ctx = {
      logger: { warn: (message: string) => void warnings.push(message), info: () => undefined, error: () => undefined },
      get: () => undefined,
      effect: (callback: () => unknown) => {
        callback()
        return () => undefined
      },
      on: () => () => undefined,
    } as unknown as Context
    expect(() => apply(ctx), 'a missing ctx.inject must not throw').not.toThrow()
    expect(warnings.length, 'the dormant path must still be explained').toBeGreaterThan(0)
  })
})
