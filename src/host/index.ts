/**
 * HOST half of dsh-task-gantt.
 *
 * The plugin's own read-only HTTP API lives here, because the timeline's
 * authoritative source (the durable session event logs of the Lead and every
 * teammate) is only reachable from the host process. The client half renders
 * what these routes return.
 *
 * SERVICE TIMING (verified on a live composition — see {@link apply}): the
 * `webServer` service is NOT mounted yet when this plugin's `apply()` runs, so
 * probing `ctx.get('webServer')` exactly once at activation registers nothing
 * and every request falls through to the SPA fallback (a bare `405` on POST,
 * indistinguishable from "no route"). Registration therefore waits for the
 * service with `ctx.inject(['webServer'], …)`, which cordis re-runs when the
 * service appears.
 *
 * Mounting stays optional by construction: nothing here throws when the
 * service never appears (a non-web profile gets a dormant host half), and every
 * other host service this plugin reads is probed with `ctx.get(...)`.
 */
import type { Context } from '@deepseek-ai/cordis'
import { ROUTE_PREFIX } from '../shared/contract.ts'
import { buildTimelineHandler } from './timeline-route.ts'

/** The plugin/Loader entry name (must equal the package name). */
export const name = 'dsh-task-gantt'

/**
 * No hard service dependencies.
 *
 * `webServer` is deliberately NOT listed here: an `inject` entry makes the
 * cordis fiber wait for that service, so a profile without a web server (the
 * `tui` / `headless` shapes) would leave this plugin row pending forever instead
 * of loading harmlessly. `ctx.inject(...)` below has the same "run when
 * available" semantics without the boot-time coupling.
 */
export const inject: readonly string[] = []

/** The host service key this half registers its routes on. */
const WEB_SERVER_SERVICE = 'webServer'

/** Minimal structural face of `ctx.webServer` (the SDK types are host-internal). */
interface RouteRegistrar {
  register(route: { kind: 'prefix'; path: string; handler: (req: never, res: never) => unknown }): () => void
}

/** The dynamic-inject API cordis mixes into a context (absent on stubs). */
interface DynamicInject {
  inject?: (names: readonly string[], callback: (scoped: Context) => void) => unknown
}

/**
 * Mount the plugin's routes.
 *
 * @param ctx - the plugin's host context (cordis creates one per Loader row).
 */
export function apply(ctx: Context): void {
  const install = (target: Context): (() => void) => {
    const webServer = target.get(WEB_SERVER_SERVICE) as RouteRegistrar | undefined
    if (webServer === undefined) {
      // `ctx.inject` calls this again once the service is provided; reaching
      // here without it means the deployment has no web server at all.
      return () => {}
    }
    const handler = buildTimelineHandler(target)
    return webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler: handler as never })
  }

  // Already mounted (hot reload, or a composition that activates the web server
  // first): register synchronously and own the disposer.
  if (ctx.get(WEB_SERVER_SERVICE) !== undefined) {
    ctx.effect(() => install(ctx), 'dsh-task-gantt: /dsh-task-gantt/api routes')
    return
  }

  const dynamic = ctx as unknown as DynamicInject
  if (typeof dynamic.inject !== 'function') {
    // No dynamic-inject API on this context and no service yet. Staying dormant
    // beats throwing during activation: the client half then shows its
    // empty-board presentation.
    ctx.logger?.warn?.(
      'dsh-task-gantt: no webServer service and no ctx.inject on this context; ' +
        'the timeline API stays unmounted',
    )
    return
  }

  dynamic.inject([WEB_SERVER_SERVICE], (scoped) => {
    // Runs each time the service is provided; the effect is bound to the scoped
    // fiber, so the route is removed together with the service.
    scoped.effect(() => install(scoped), 'dsh-task-gantt: /dsh-task-gantt/api routes')
  })
}
