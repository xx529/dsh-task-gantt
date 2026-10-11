/**
 * Session navigation chain (task-9) — proposed by shell, implemented by verify.
 *
 * Nothing in `tests/` covered this path before (`grep -rn "uiWorkspace" tests/*.spec.ts`
 * was empty), yet it is the kind of code whose failures are quiet:
 *
 * - reading `uiWorkspace` at ACTIVATION time instead of per click is invisible to
 *   tsc and to every other test, and permanently disables the lane heads whenever
 *   the host mounts that service after this plugin (it lives in a different client
 *   plugin row);
 * - `navigate()` throwing inside a click handler would surface as an unhandled
 *   error in the panel, not as a test failure;
 * - unwrapping `LaneNavigation` wrongly (re-deriving the address instead of
 *   passing it through) breaks only the sub-agent arm of a click.
 *
 * The fake context mirrors cordis faithfully where it matters: `ctx.effect(fn)`
 * runs `fn` IMMEDIATELY and keeps its returned disposer (better-sidebar's own
 * `ctx.effect(() => ctx.webServer.register(…))` depends on that), and services
 * live in a mutable map so a test can mount one *after* activation.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { TAB_TYPE_ID, type LaneNavigation } from '../src/shared/contract.ts'

/** The structured value the `address` arm carries. */
type AddressValue = Extract<LaneNavigation, { type: 'address' }>['value']
import { apply } from '../src/client/index.ts'

interface Harness {
  ctx: Context
  /** Every `ctx.get(name)` in order. */
  reads: string[]
  /** Services requested through `ctx.inject(names, cb)`. */
  injects: string[][]
  /** The descriptor handed to `betterSidebar.registerTab`. */
  descriptor: Record<string, unknown>
  /** Mount or replace a service after activation. */
  mount: (name: string, value: unknown) => void
  /** Make every later `ctx.get` throw (the click-time path must still be safe). */
  breakRegistry: () => void
  /** The `openSession` spy of the currently mounted `uiWorkspace`, if any. */
  openSession: () => { calls: unknown[] }
}

/** Build a context, run the real `apply`, and capture the descriptor. */
function activated(options: { sidebar?: boolean; workspace?: boolean; failGet?: boolean } = {}): Harness {
  const services = new Map<string, unknown>()
  const state = { broken: options.failGet === true }
  const reads: string[] = []
  const injects: string[][] = []
  const openSessions: unknown[] = []

  const workspace = {
    openSession: (target: unknown) => {
      openSessions.push(target)
    },
  }
  const sidebar = {
    registerTab: (descriptor: Record<string, unknown>) => {
      captured.descriptor = descriptor
      return () => undefined
    },
  }
  const captured: { descriptor: Record<string, unknown> } = { descriptor: {} }
  if (options.sidebar !== false) services.set('betterSidebar', sidebar)
  if (options.workspace === true) services.set('uiWorkspace', workspace)

  const ctx = {
    logger: { warn: () => undefined, info: () => undefined, error: () => undefined, debug: () => undefined },
    get: (name: string) => {
      reads.push(name)
      if (state.broken) throw new Error(`service registry exploded: ${name}`)
      return services.get(name)
    },
    effect: (callback: () => unknown) => {
      callback()
      return () => undefined
    },
    inject: (names: readonly string[], callback: (scoped: Context) => void) => {
      injects.push([...names])
      // A host that mounts the service later calls the callback.
      if (services.has(names[0] as string)) callback(ctx as unknown as Context)
      return () => undefined
    },
    on: () => () => undefined,
  } as unknown as Context

  apply(ctx)
  return {
    ctx,
    reads,
    injects,
    descriptor: captured.descriptor,
    mount: (name, value) => void services.set(name, value),
    breakRegistry: () => {
      state.broken = true
    },
    openSession: () => ({ calls: openSessions }),
  }
}

/** The `navigate` the board receives. */
function navigateOf(harness: Harness): (target: LaneNavigation) => boolean {
  const element = (harness.descriptor.component as (props: unknown) => { props: Record<string, unknown> })({
    scope: { sessionId: 'session-abc' },
    visible: true,
  })
  return element.props.navigate as (target: LaneNavigation) => boolean
}

describe('activation never touches uiWorkspace', () => {
  it('reads only betterSidebar while applying, and waits through ctx.inject', () => {
    // THE regression this file exists for: hoisting `ctx.get('uiWorkspace')`
    // into the activation closure compiles, typechecks and passes every other
    // test, but pins the lane heads to a service that may not be mounted yet.
    const harness = activated({ sidebar: true })
    expect(harness.reads).toEqual(['betterSidebar'])
    expect(harness.injects).toEqual([])
  })

  it('still reads only betterSidebar when better-sidebar is not mounted yet', () => {
    const harness = activated({ sidebar: false })
    expect(harness.reads).toEqual(['betterSidebar'])
    expect(harness.injects).toEqual([['betterSidebar']])
  })
})

describe('navigate() unwraps the frozen LaneNavigation', () => {
  it('passes a session target through as a bare string', () => {
    const harness = activated({ sidebar: true, workspace: true })
    const navigate = navigateOf(harness)
    expect(navigate({ type: 'session', value: 'session-abc' })).toBe(true)
    const [target] = harness.openSession().calls
    expect(typeof target).toBe('string')
    expect(target).toBe('session-abc')
  })

  it('passes an address target through as the SAME object (identity, not a copy)', () => {
    // The host splits on exactly this shape:
    // `typeof target === 'string' ? sessions.subagentAddress(…) : target`.
    // Re-deriving the address here would break the sub-agent arm of a click.
    const harness = activated({ sidebar: true, workspace: true })
    const address: AddressValue = { sessionId: 'session-abc', agentId: 'a-1', threadId: 't-1' }
    const navigate = navigateOf(harness)
    expect(navigate({ type: 'address', value: address })).toBe(true)
    expect(harness.openSession().calls[0]).toBe(address)
  })
})

describe('navigate() never throws — a dead service is a silent no-op', () => {
  const target: LaneNavigation = { type: 'session', value: 'session-abc' }

  it('returns false when uiWorkspace is not mounted', () => {
    const harness = activated({ sidebar: true })
    expect(navigateOf(harness)(target)).toBe(false)
    expect(harness.openSession().calls).toEqual([])
  })

  it('returns false when openSession is not a function', () => {
    const harness = activated({ sidebar: true })
    harness.mount('uiWorkspace', { openSession: 'nope' })
    expect(navigateOf(harness)(target)).toBe(false)
  })

  it('returns false when openSession throws (aborted signal, retain failure)', () => {
    const harness = activated({ sidebar: true })
    harness.mount('uiWorkspace', {
      openSession: () => {
        throw new Error('signal is aborted')
      },
    })
    expect(() => navigateOf(harness)(target)).not.toThrow()
    expect(navigateOf(harness)(target)).toBe(false)
  })

  it('returns false, and does not bubble, when ctx.get itself throws at CLICK time', () => {
    const harness = activated({ sidebar: true, workspace: true })
    const navigate = navigateOf(harness)
    expect(navigate({ type: 'session', value: 'session-abc' })).toBe(true)
    // A service registry that starts throwing (a row unloading, a disposed
    // fiber) must turn the lane head into a silent no-op, not an unhandled
    // error inside a click handler.
    harness.breakRegistry()
    expect(() => navigate({ type: 'session', value: 'session-abc' })).not.toThrow()
    expect(navigate({ type: 'session', value: 'session-abc' })).toBe(false)
  })

  it('activation failures stay LOUD (the loader must see them), unlike clicks', () => {
    // Deliberate asymmetry: `navigateToSession` catches everything because it
    // runs inside a user click, while `readTabService` does not, because an
    // activation that cannot read the registry is a broken row and the cordis
    // loader should report it. Same rule as the host half's route registration
    // (tests/host-mount.spec.ts).
    expect(() => activated({ sidebar: true, failGet: true })).toThrow(/service registry exploded/)
  })
})

describe('late mounting is why the lookup is lazy', () => {
  it('the SAME navigate closure starts working once uiWorkspace appears', () => {
    const harness = activated({ sidebar: true })
    const navigate = navigateOf(harness)
    expect(navigate({ type: 'session', value: 'session-abc' }), 'not mounted yet').toBe(false)
    harness.mount('uiWorkspace', {
      openSession: (value: unknown) => void harness.openSession().calls.push(value),
    })
    // Reference-stable callback, resolved per call: the click that happens after
    // the service appears must succeed.
    expect(navigate({ type: 'session', value: 'session-abc' })).toBe(true)
    expect(harness.openSession().calls).toEqual(['session-abc'])
  })
})

describe('descriptor and props contract', () => {
  it('declares the frozen tab identity and order', () => {
    const descriptor = activated({ sidebar: true }).descriptor
    expect(descriptor.id).toBe(TAB_TYPE_ID)
    expect(descriptor.order).toBe(50)
    expect(descriptor.single).toBe(true)
    expect((descriptor.dedupeKey as () => string)()).toBe(TAB_TYPE_ID)
  })

  it('hands the board exactly four props, with reference-stable callbacks', () => {
    // Extra props are noise for the board; re-created callbacks would restart the
    // board's effects on every render. Both are invisible to the type system.
    const harness = activated({ sidebar: true })
    const component = harness.descriptor.component as (props: unknown) => { props: Record<string, unknown> }
    const first = component({ scope: { sessionId: 'session-abc' }, visible: true })
    const second = component({ scope: { sessionId: 'session-abc' }, visible: false })
    expect(Object.keys(first.props).sort()).toEqual(['navigate', 'routeBase', 'sessionId', 'visible'])
    expect(second.props.navigate).toBe(first.props.navigate)
    expect(second.props.routeBase).toBe(first.props.routeBase)
    expect(first.props.sessionId).toBe('session-abc')
    expect(first.props.visible).toBe(true)
    expect(second.props.visible).toBe(false)
  })

  it('routeBase resolves through the mounted sidebar service (with the page prefix intact)', () => {
    const harness = activated({ sidebar: true, workspace: true })
    const routeBase = (harness.descriptor.component as (props: unknown) => { props: Record<string, unknown> })({
      scope: { sessionId: 'session-abc' },
      visible: true,
    }).props.routeBase as (path: string) => string
    // With no hostRouteUrl and no document base in this environment, the
    // document-relative fallback must still name the plugin route.
    expect(routeBase('/dsh-task-gantt/api/timeline')).toContain('dsh-task-gantt/api/timeline')
  })
})
