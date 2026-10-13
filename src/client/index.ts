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
 * - `uiWorkspace` (session navigation) is probed **lazily, per click**, never at
 *   registration: it is a different plugin's service and may not be mounted yet.
 *   See {@link navigateToSession}.
 */
import { createElement, type ReactNode } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { TAB_TYPE_ID, type BetterSidebarTabService, type LaneNavigation } from '../shared/contract.ts'
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

/**
 * The cordis service name of the workspace shell — the only thing that can move
 * the main view to another conversation.
 */
const WORKSPACE_SERVICE = 'uiWorkspace'

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
    ctx.effect(() => watchForFirstTeam(ctx, mounted), FIRST_TEAM_EFFECT_LABEL)
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
    scoped.effect(() => watchForFirstTeam(scoped, service), FIRST_TEAM_EFFECT_LABEL)
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

/* ------------------------------------------------------------------------- *
 * The one-time reveal on the first sub-agent / team invocation.
 *
 * WHAT THE BUILT-IN DOES (the effect the user is asking us to copy), quoted
 * from the installed `dsh-better-sidebar@0.25.0`:
 *
 * - the signal is a **0 → N** transition in the count of DIRECT sub-agent
 *   sessions — `detectNewDirectSubagent` in `src/client/subagent-detect.ts:47-56`
 *   (`directSubagentCount(prev) === 0 && directSubagentCount(next) > 0`),
 *   where a direct sub-agent row is `origin === 'subagent'` (`:26-36`);
 * - it is armed from a session-list effect and re-checked after a
 *   **500 ms** debounce (`AUTO_OPEN_DEBOUNCE_MS`, `src/client/sidebar/use-host-feeds.ts:31`,
 *   used at `:258`), gated on the `autoOpenSubagent` pref, on a narrow-viewport
 *   opt-out, and on `isTabEnabled('subagent') !== false` (`:259-262`);
 * - the action is `activateTasksPage` (`:97`) →
 *   **`ctx.get('betterSidebar')` then `openTab({ type: 'subagent', title: … })`**
 *   (`:130`), or the same call with **`reveal: false`** (`:117`) when the reader
 *   is already looking at another page, so the open lands in the background.
 *
 * THE API WE USE is that same one. `BetterSidebarService.openTab(seed, scope?)`
 * is declared at `src/client/service.ts:639`; `OpenTabSeed` (`:447-492`) takes
 * `type` (the registered tab id), `title`, and **`reveal?: boolean`** —
 * "Whether the open may FOCUS what it opens (`target: 'right'` only) … Defaults
 * to true. A background activation passes `false` so the reader's page survives"
 * (`:483-491`). The service also publishes a monotonic capability list,
 * `features: readonly string[]` (`:651-657`, `'targetedOpen'` among them), and
 * states "Features are never removed — consumers gate new API usage on
 * membership" — so capability is detected by METHOD PRESENCE, never by version.
 *
 * WHY THIS IS NOT IN `src/host/**` (and could not be): `betterSidebar` is a
 * CLIENT service — `dsh-better-sidebar/src/client/index.tsx:171`
 * `ctx.provide('betterSidebar', service)`. The host half cannot see it; a host
 * Inspect query for that service key answers "no catalogued Service named
 * betterSidebar". The host's only outbound channel in this area is
 * better-sidebar's `agent-opens` WebSocket push, and that carries
 * `kind: 'file' | 'folder' | 'url'` only (`src/agent-opens.ts:135`), never "open
 * tab X". So the reveal has to be one client-side `openTab` call.
 * ------------------------------------------------------------------------- */

/** The cordis service name of DSH's own client-side Sessions store. */
const SESSIONS_SERVICE = 'sessions'

/**
 * How often the one-shot watch reads the session list.
 *
 * Far below the time a teammate takes to spawn, and a snapshot read is cheap.
 * The timer stops for good on the first reveal.
 */
const FIRST_TEAM_POLL_MS = 2000

/** Effect label shown in cordis diagnostics. */
const FIRST_TEAM_EFFECT_LABEL = 'dsh-task-gantt: reveal on first team'

/**
 * One row of `sessions.list.getSnapshot().byId`, structurally.
 *
 * Mirrors `SidebarSessionSummary` in better-sidebar's `src/context-types.ts:140-150`:
 * `origin?: 'subagent'` is the durable origin, `parentId?: string` the durable
 * parent. That is the exact feed better-sidebar's own auto-open reads.
 */
interface SessionSummaryLike {
  origin?: unknown
  parentId?: unknown
}

/** The slice of DSH's client `sessions` service this shell reads. */
interface SessionsFace {
  list?: {
    getSnapshot?: () => { byId?: Record<string, SessionSummaryLike | undefined> } | undefined
  }
}

/**
 * The `betterSidebar` slice the reveal needs, declared structurally — the same
 * treatment {@link WorkspaceNavigation} gets, so no value import of
 * dsh-better-sidebar is required.
 */
interface TabRevealFace {
  openTab?(seed: { type: string; title?: string; reveal?: boolean }, scope?: { sessionId: string }): void
  isTabEnabled?(id: string): boolean
  /** Monotonic capability list (service.ts:651-657); `'targetedOpen'` since v0.12.0. */
  features?: readonly string[]
}

/**
 * Count the sub-agent sessions in one session-list snapshot.
 *
 * Total: `undefined`, `null`, a missing `byId`, foreign rows and non-object rows
 * all read as whatever they contain, never as an exception.
 *
 * @param snapshot - `sessions.list.getSnapshot()`, or anything else.
 * @returns the number of rows whose `origin` is `'subagent'`.
 */
export function countSubagentSessions(snapshot: unknown): number {
  if (snapshot === null || typeof snapshot !== 'object') return 0
  const byId = (snapshot as { byId?: unknown }).byId
  if (byId === null || typeof byId !== 'object') return 0
  let count = 0
  for (const summary of Object.values(byId as Record<string, unknown>)) {
    if (summary !== null && typeof summary === 'object' && (summary as SessionSummaryLike).origin === 'subagent') {
      count += 1
    }
  }
  return count
}

/**
 * The built-in's signal, as a pure predicate: a **0 → N** crossing.
 *
 * A page that already has sub-agents when the plugin loads must not reveal (its
 * baseline is armed at the current count), and growing from N to N+1 is a later
 * invocation, not the first one. Mirrors `detectNewDirectSubagent`
 * (`dsh-better-sidebar/src/client/subagent-detect.ts:47-56`).
 *
 * @param previous - the count observed on the previous read.
 * @param next - the count observed now.
 * @returns `true` only for the 0 → positive transition.
 */
export function isFirstSubagentTransition(previous: number, next: number): boolean {
  return previous === 0 && next > 0
}

/**
 * Reveal our tab exactly ONCE, on the first sub-agent / team invocation.
 *
 * Idempotent by construction: the watch stops itself on the first reveal, and
 * the 0 → N predicate can only be satisfied once per armed baseline. A second
 * invocation therefore never re-opens the tab and never moves focus again.
 *
 * Silent when the capability is absent — an older runtime with no `openTab`, a
 * missing `sessions` service, a foreign service shape, or a throwing
 * implementation all leave the tab registered and reachable from the + menu,
 * with nothing logged.
 *
 * @param ctx - the client cordis context; read lazily on every poll.
 * @param service - the probed better-sidebar service.
 * @returns a disposer that stops the watch (bound to the fiber by `ctx.effect`).
 */
export function watchForFirstTeam(ctx: Context, service: BetterSidebarTabService): () => void {
  const reveal = service as TabRevealFace
  // Capability, not version: the method's PRESENCE is the capability, and the
  // documented rule is that `features` only ever grows. No version is compared
  // anywhere in this file. Bound to a local so the narrowing survives into the
  // timer closure.
  const openTab = reveal.openTab
  if (typeof openTab !== 'function') return () => {}

  let timer: ReturnType<typeof setInterval> | undefined
  const stop = (): void => {
    if (timer !== undefined) clearInterval(timer)
    timer = undefined
  }

  let previous: number | undefined
  let done = false
  const tick = (): void => {
    if (done) return
    let next: number
    try {
      const sessions = ctx.get(SESSIONS_SERVICE) as SessionsFace | undefined
      next = countSubagentSessions(sessions?.list?.getSnapshot?.())
    } catch {
      // A foreign service that throws on read must not break the fiber.
      return
    }
    if (previous === undefined) {
      // Arm the baseline on the first read: a page load that already has a team
      // is not "the first invocation" and must not steal the view.
      previous = next
      return
    }
    const first = isFirstSubagentTransition(previous, next)
    previous = next
    if (!first) return

    done = true
    stop()
    // The user's own side-card prefs win. `openTab` refuses a disabled type
    // anyway, so asking first keeps this from being a silent disappointment.
    if (reveal.isTabEnabled?.(TAB_TYPE_ID) === false) return
    try {
      openTab.call(service, { type: TAB_TYPE_ID, title: t('tabTitle'), reveal: true })
    } catch {
      // Never let a foreign implementation take the plugin down; the tab stays
      // reachable from the + menu.
    }
  }

  timer = setInterval(tick, FIRST_TEAM_POLL_MS)
  return stop
}

/**
 * Register the tab descriptor and return the service's disposer.
 *
 * @param ctx - context used for logging only.
 * @param service - the probed better-sidebar service.
 * @returns the registration disposer (a no-op when registration was refused).
 */function registerTab(ctx: Context, service: BetterSidebarTabService): () => void {
  // Built ONCE per registration, outside the `component` lambda (which React
  // calls on every render): the board must see a stable function identity, or a
  // callback in a dependency array would re-run its effects on every render.
  const routeBase = (path: string): string => resolveHostRoute(path, service)
  const navigate = (target: LaneNavigation): boolean => navigateToSession(ctx, target)

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
          routeBase,
          navigate,
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
 * The slice of `uiWorkspace` this shell uses.
 *
 * Declared structurally (like {@link BetterSidebarTabService}) so no value import
 * of the host package is needed. better-sidebar declares the same face as
 * `ConversationNavigation` (`SubagentView.tsx:83-85`):
 * `openSession?(target: SidebarSubagentAddress | string): void`.
 */
interface WorkspaceNavigation {
  openSession?(target: unknown): void
}

/**
 * Move the editor's main view to one lane's session.
 *
 * `uiWorkspace` belongs to a DIFFERENT client plugin row
 * (`@deepseek-ai/dsh-client-ui-workspace` provides `UiWorkspaceService` through
 * `super(ctx, 'uiWorkspace')`), so it is not guaranteed to be mounted when this
 * plugin applies — the same activation-order hazard as `webServer`, which the
 * Lead measured as `undefined` at apply time on a scratch composition. Nobody in
 * the shipped client assumes otherwise: the chat, conversation and workflow-run
 * bundles all list `uiWorkspace` in their `inject` arrays, and better-sidebar
 * resolves it *inside* its click callback rather than at mount
 * (`dsh-better-sidebar/src/client/SubagentView.tsx:277-280`).
 *
 * Hence this reads `ctx.get('uiWorkspace')` on **every** call instead of closing
 * over one instance at registration time. Two things fall out of that:
 *
 * - the tab never has to wait for a service the panel does not strictly need, so
 *   a profile without the workspace shell still gets the board; and
 * - a service that mounts late, or is replaced on HMR, is picked up without
 *   re-registering the tab.
 *
 * Never throws — a missing service, a non-callable `openSession` or a failing
 * call all report `false`, which the board renders as "silently not clickable".
 *
 * @param ctx - the client cordis context; read lazily, per call.
 * @param target - the lane's navigation target (frozen in `src/shared/contract.ts`).
 * @returns `true` when the workspace shell accepted the navigation.
 */
function navigateToSession(ctx: Context, target: LaneNavigation): boolean {
  try {
    const workspace = ctx.get(WORKSPACE_SERVICE) as WorkspaceNavigation | undefined | null
    const openSession = workspace?.openSession
    if (typeof openSession !== 'function') return false
    // `LaneNavigation.value` is already the host-native form in BOTH arms, so
    // nothing is re-derived here: a bare session id for `type: 'session'`, and
    // DSH's own structured subagent address for `type: 'address'`. The host
    // splits on exactly that shape itself — `UiWorkspaceService.replaceMain`:
    // `const subagentAddress = typeof target === 'string'
    //    ? this.sessions.subagentAddress(reference.sessionId) : target`.
    // `openSession` is synchronous but may throw (`signal.throwIfAborted()`,
    // `sessions.retain()`), which the catch below absorbs.
    openSession.call(workspace, target.value)
    return true
  } catch {
    return false
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
