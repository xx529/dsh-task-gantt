/**
 * CLIENT half of dsh-task-gantt — the sidebar tab.
 *
 * Owner of this file: teammate `shell` (see docs/TEAM-BRIEF.md §6). It registers
 * the "task Gantt" page with whatever `betterSidebar` service is present, hands
 * the chart its props, and injects the panel stylesheet. The chart itself lives
 * in `src/client/ui/**` (owner: `ui`).
 *
 * Coupling rules (TEAM-BRIEF §2.2, guide §10):
 *
 * - `inject` stays empty. `dsh.client.inject` naming a plain package
 *   (`dsh-better-sidebar`) is untested and a missing entry can disable the whole
 *   profile row, so the service is *probed* instead of declared. The module
 *   stays type-only decoupled from `dsh-better-sidebar`: no value import, no
 *   build-order coupling, and the plugin still loads when better-sidebar is
 *   absent.
 * - Registration is wrapped in `ctx.effect(...)` so the disposer is held by the
 *   fiber and HMR / plugin-disable revokes it (guide §9). Without that, the next
 *   activation throws `tab type "…" already registered`.
 */
import { createElement, type ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { TAB_TYPE_ID, type BetterSidebarTabService } from '../shared/contract.ts'
import { t } from './i18n.ts'
import { injectPanelStyles } from './panel-style.ts'
import { resolveHostRoute } from './transport.ts'
import { BoardView } from './ui/BoardView.tsx'

/** The plugin/Loader entry name (must equal the package name). */
export const name = 'dsh-task-gantt'

/**
 * No declared services — see the file header. `ctx.inject` below supplies the
 * "run when available" semantics without the profile-level pre-flight risk.
 */
export const inject: readonly string[] = []

/** The cordis service name of dsh-better-sidebar on the client side. */
const SERVICE_NAME = 'betterSidebar'

/** `+` menu rank: after the built-ins (`terminal-bottom` = 40), before the default 100. */
const TAB_ORDER = 50

/** Effect label shown in cordis diagnostics. */
const TAB_EFFECT_LABEL = 'dsh-task-gantt: sidebar tab'

// Runs inside the module-loader factory body, i.e. at materialization, which is
// when the host's `claimStyles()` bookkeeping settles. See panel-style.ts.
injectPanelStyles()

/**
 * Register the Gantt tab with the mounted better-sidebar service.
 *
 * The service is optional and may appear after this plugin activates, so the
 * registration is deferred through `ctx.inject` when the first probe misses
 * (TEAM-BRIEF §2.2: stay dormant, never fail the profile row).
 *
 * @param ctx - the client cordis context of this plugin fiber.
 */
export function apply(ctx: Context): void {
  injectPanelStyles()

  const mounted = readTabService(ctx)
  if (mounted !== undefined) {
    ctx.effect(() => registerTab(ctx, mounted), TAB_EFFECT_LABEL)
    return
  }

  // better-sidebar may simply not have applied yet (activation order between two
  // independent client plugins is not guaranteed), or may not be composed at
  // all. Waiting costs nothing and removes the ordering race; if it never shows
  // up, this fiber stays dormant and the tab is never registered.
  const canWait = typeof (ctx as { inject?: unknown }).inject === 'function'
  if (!canWait) {
    // A context without the dynamic-inject API cannot wait for a later service;
    // say so instead of throwing during activation.
    warn(
      ctx,
      'dsh-task-gantt: no betterSidebar service and no ctx.inject on this context; ' +
        'the task Gantt tab cannot be registered',
    )
    return
  }

  ctx.inject([SERVICE_NAME], (scoped: Context) => {
    const service = readTabService(scoped)
    if (service === undefined) return
    scoped.effect(() => registerTab(scoped, service), TAB_EFFECT_LABEL)
  })

  warn(
    ctx,
    'dsh-task-gantt: the betterSidebar service is not mounted; the task Gantt tab stays dormant ' +
      'until dsh-better-sidebar provides it',
  )
}

/**
 * Probe `ctx.betterSidebar` structurally.
 *
 * The frozen `BetterSidebarTabService` face in `src/shared/contract.ts` is
 * matched by duck-typing rather than by a value import, so a half-initialized or
 * foreign service can never crash activation.
 *
 * @param ctx - any cordis context (the plugin's own or the injected child).
 * @returns the service when it looks usable, otherwise `undefined`.
 */
function readTabService(ctx: Context): BetterSidebarTabService | undefined {
  const candidate: unknown = ctx.get(SERVICE_NAME)
  if (candidate === null || typeof candidate !== 'object') return undefined
  if (typeof (candidate as { registerTab?: unknown }).registerTab !== 'function') return undefined
  return candidate as BetterSidebarTabService
}

/**
 * Register the tab descriptor and return the service's disposer.
 *
 * @param ctx - context used for logging only.
 * @param service - the probed better-sidebar service.
 * @returns the registration disposer (a no-op when registration was refused).
 */
function registerTab(ctx: Context, service: BetterSidebarTabService): () => void {
  try {
    return service.registerTab({
      id: TAB_TYPE_ID,
      title: () => t('tabTitle'),
      description: () => t('tabDescription'),
      icon: (size: number) => createElement(GanttGlyph, { size }),
      order: TAB_ORDER,
      // One board per plugin: reopening from the + menu focuses the open tab.
      // `single: true` is the documented sugar for `dedupeKey: () => id`, and the
      // guide (§4.1) gives an explicit `dedupeKey` precedence over `single`; both
      // are declared so the identity the host dedupes on is unambiguous.
      single: true,
      dedupeKey: () => TAB_TYPE_ID,
      // The host route is registered ABSOLUTE but the page may sit behind a
      // reverse-proxy sub-path or be served from `dsh-app://`; handing the board
      // the page's real transport base (via the mounted sidebar service) keeps
      // its fetches on the same prefix the DSH client itself uses. See
      // transport.ts for the verified host rule and the fallback chain.
      component: ({ scope, visible }) =>
        createElement(BoardView, {
          sessionId: scope.sessionId,
          visible,
          routeBase: (path: string) => resolveHostRoute(path, service),
        }),
    })
  } catch (error) {
    // `registerTab` throws on a duplicate id (service.ts:706). A leftover
    // registration from a previous materialization must be reported, not allowed
    // to take the plugin fiber down.
    warn(ctx, `dsh-task-gantt: could not register the "${TAB_TYPE_ID}" tab: ${describe(error)}`)
    return () => {}
  }
}

/**
 * The `+` menu glyph: three staggered bars, i.e. a Gantt chart.
 *
 * Drawn with `currentColor` so every skin recolours it (guide §12: no colour
 * literals in plugin glyphs). The host calls a function icon with its own size
 * (`src/client/Sidebar.tsx`: `typeof descriptor.icon === 'function' ?
 * descriptor.icon(14) : descriptor.icon`).
 *
 * @param props.size - edge length in px, chosen by the host.
 */
function GanttGlyph({ size }: { size: number }): ReactNode {
  const bar = (key: string, x: number, y: number, width: number): ReactNode =>
    createElement('rect', {
      key,
      x,
      y,
      width,
      height: 2.4,
      rx: 1.2,
      fill: 'currentColor',
      stroke: 'none',
    })
  return createElement(
    'svg',
    {
      width: size,
      height: size,
      viewBox: '0 0 16 16',
      'aria-hidden': true,
      focusable: false,
    },
    bar('a', 1.8, 2.9, 6.4),
    bar('b', 4.4, 6.8, 9.4),
    bar('c', 6.4, 10.7, 5.4),
  )
}

/** Log a non-fatal warning, falling back to the console when there is no logger. */
function warn(ctx: Context, message: string): void {
  const logger = ctx.logger as { warn?: (message: string) => void } | undefined
  if (typeof logger?.warn === 'function') logger.warn(message)
  else if (typeof console !== 'undefined') console.warn(message)
}

/** Render a thrown value for a log line. */
function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
