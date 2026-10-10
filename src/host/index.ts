/**
 * HOST half of dsh-task-gantt.
 *
 * The plugin's own read-only HTTP API lives here, because the timeline's
 * authoritative source (the durable session event logs of the Lead and every
 * teammate) is only reachable from the host process. The client half renders
 * what these routes return.
 *
 * Mounting is optional by construction: every service this plugin reads is
 * probed with `ctx.get(...)`, so the plugin loads — and simply reports an empty
 * board — in a deployment that does not compose the agent-team layer.
 */
import type { Context } from '@deepseek-ai/cordis'
import { ROUTE_PREFIX } from '../shared/contract.ts'
import { buildTimelineHandler } from './timeline-route.ts'

/** The plugin/Loader entry name (must equal the package name). */
export const name = 'dsh-task-gantt'

/** Soft dependencies: all of them are probed, none is required to activate. */
export const inject: readonly string[] = []

/**
 * Mount the plugin's routes.
 *
 * @param ctx - the plugin's host context (cordis creates one per Loader row).
 */
export function apply(ctx: Context): void {
  const logger = ctx.logger ?? console
  ctx.effect(
    () => {
      const webServer = ctx.get('webServer') as
        | { register(route: { kind: 'prefix'; path: string; handler: (req: never, res: never) => unknown }): () => void }
        | undefined
      if (webServer === undefined) {
        logger.warn?.('dsh-task-gantt: no webServer service; the Gantt panel will report an empty board')
        return () => {}
      }
      const handler = buildTimelineHandler(ctx)
      return webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler: handler as never })
    },
    'dsh-task-gantt: /dsh-task-gantt/api routes',
  )
}
