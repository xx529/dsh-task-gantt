/**
 * Host-half mount tests (`src/host/index.ts`).
 *
 * The unit tests cover the route handler in isolation; this file covers the
 * cordis wiring around it — the layer where a plugin silently stops answering:
 *
 * - the row must register a `prefix` route at the FROZEN `ROUTE_PREFIX` (a typo
 *   here 404s every request while the plugin still "loads");
 * - registration must be owned by an effect (or a reload leaves a duplicate
 *   route and the loader fails the row);
 * - **the `webServer` service is not mounted yet when `apply()` runs**
 *   (measured on a live composition — `src/host/index.ts` header), so the route
 *   must be registered on demand through `ctx.inject(['webServer'], …)` rather
 *   than by a single up-front probe; the same "run when available" mechanism
 *   the client half uses for better-sidebar.
 * - a non-web profile must stay dormant and must never throw during activation.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { ROUTE_PREFIX } from '../src/shared/contract.ts'
import { apply, inject, name } from '../src/host/index.ts'
import { invoke } from './helpers/fake-http.ts'

interface RegisteredRoute {
  kind: string
  path: string
  handler: (req: any, res: any) => unknown
}

/** A fake host context with optional services and a recording `inject`. */
function mountContext(options: { webServer?: boolean; dynamicInject?: boolean; warnings?: string[] } = {}) {
  const routes: RegisteredRoute[] = []
  const injectRequests: { names: string[]; callback: (scoped: Context) => void }[] = []
  const effectValues: unknown[] = []
  const warnings = options.warnings ?? []
  const webServer = {
    register(route: RegisteredRoute): () => void {
      routes.push(route)
      return () => undefined
    },
  }

  const build = (withServer: boolean): Context => {
    const base: Record<string, unknown> = {
      logger: {
        warn: (message: string) => void warnings.push(message),
        info: () => undefined,
        error: () => undefined,
        debug: () => undefined,
      },
      get: (serviceName: string) => (withServer && serviceName === 'webServer' ? webServer : undefined),
      effect: (callback: () => unknown) => {
        effectValues.push(callback())
        return () => undefined
      },
      on: () => () => undefined,
    }
    if (options.dynamicInject !== false) {
      base.inject = (names: readonly string[], callback: (scoped: Context) => void) => {
        injectRequests.push({ names: [...names], callback })
        return () => undefined
      }
    }
    return base as unknown as Context
  }

  return { routes, injectRequests, effectValues, warnings, ctx: build(options.webServer === true), withServer: () => build(true) }
}

describe('host half module shape', () => {
  it('exports the Loader row name equal to the package name', () => {
    expect(name).toBe('dsh-task-gantt')
  })

  it('declares no required service (the plugin must activate in any profile)', () => {
    expect(inject).toEqual([])
  })
})

describe('webServer mounted before activation', () => {
  it('registers one prefix route at the frozen ROUTE_PREFIX', () => {
    const host = mountContext({ webServer: true })
    apply(host.ctx)
    expect(host.routes).toHaveLength(1)
    expect(host.routes[0]?.kind).toBe('prefix')
    expect(host.routes[0]?.path).toBe(ROUTE_PREFIX)
    expect(host.effectValues[0], 'the effect callback must return the disposer').toBeTypeOf('function')
    expect(host.injectRequests).toHaveLength(0)
  })

  it('the registered handler really answers the plugin API', async () => {
    const host = mountContext({ webServer: true })
    apply(host.ctx)
    const route = host.routes[0]
    expect(route).toBeDefined()
    const res = await invoke(route!.handler, { url: `${ROUTE_PREFIX}/ping`, jsonBody: {} })
    expect(res.statusCode).toBe(200)
    expect(res.json).toMatchObject({ ok: true, value: { apiVersion: 1, host: 'dsh-task-gantt' } })
  })
})

describe('webServer not mounted yet (the live-composition case)', () => {
  it('waits for the service instead of registering nothing', () => {
    const host = mountContext()
    apply(host.ctx)
    expect(host.routes, 'nothing can be registered before the service exists').toHaveLength(0)
    expect(host.injectRequests).toHaveLength(1)
    expect(host.injectRequests[0]?.names).toEqual(['webServer'])
    expect(typeof host.injectRequests[0]?.callback).toBe('function')
  })

  it('registers the route when the service arrives, and answers requests', async () => {
    const host = mountContext()
    apply(host.ctx)
    const request = host.injectRequests[0]
    expect(request).toBeDefined()
    request?.callback(host.withServer())
    expect(host.routes).toHaveLength(1)
    expect(host.routes[0]?.path).toBe(ROUTE_PREFIX)
    const res = await invoke(host.routes[0]!.handler, { url: `${ROUTE_PREFIX}/ping`, jsonBody: {} })
    expect(res.statusCode).toBe(200)
  })

  it('warns instead of throwing when the context has no dynamic inject at all', () => {
    const host = mountContext({ dynamicInject: false })
    expect(() => apply(host.ctx)).not.toThrow()
    expect(host.routes).toHaveLength(0)
    expect(host.warnings.join('\n')).toMatch(/webServer/i)
  })

  it('does not swallow a registration failure (the loader must see it)', () => {
    // `apply` deliberately has no try/catch around `webServer.register`: a
    // duplicate prefix route has to surface as a failed row with a diagnostic,
    // not as a silently route-less plugin.
    const warnings: string[] = []
    const ctx = {
      logger: { warn: (message: string) => void warnings.push(message), info: () => undefined, error: () => undefined },
      get: (serviceName: string) =>
        serviceName === 'webServer'
          ? {
              register: () => {
                throw new Error('duplicate prefix route')
              },
            }
          : undefined,
      effect: (callback: () => unknown) => {
        callback()
        return () => undefined
      },
      on: () => () => undefined,
    } as unknown as Context
    expect(() => apply(ctx)).toThrow(/duplicate prefix route/)
  })
})
