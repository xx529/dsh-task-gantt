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
 * The one-time reveal on the conversation's first teammate.
 *
 * WHAT THE READER ASKED FOR (2026-11-10): `dsh-trace-inspect` already pops the
 * right column out on a conversation's first turn; the task Gantt must follow
 * on that SAME conversation's first teammate — as one more tab in the column
 * that is already open, with the focus on it. A conversation that already had
 * a team keeps whatever layout the reader chose, and a teammate's own seat is
 * never mistaken for a team board.
 *
 * WHY THE PREVIOUS TRIGGER MISSED. Up to v0.3.3 this watched a GLOBAL 0 → N
 * crossing of every `origin: 'subagent'` row in the client session list and
 * latched once per page load. On a machine that keeps completed subagent
 * sessions in the list — the Agent Teams workflow does — the very first read
 * already counted N > 0, so the crossing could never happen again: the tab
 * stayed shut for the rest of the page load. When it did fire, the crossing
 * could belong to ANY conversation while the open was scoped to the session on
 * screen, whose board might show no team at all.
 *
 * THE RULE NOW, mirroring the built-in this project is compared against
 * (`detectNewDirectSubagent`, `dsh-better-sidebar/src/client/subagent-detect.ts`):
 *
 * - count only the DIRECT subagent children of the seat session on screen
 *   (`parentId === seat`), minus Side Chat threads — they ride the subagent
 *   origin with a `Side: ` title but are not teammates;
 * - arm the baseline PER CONVERSATION, and only once the list publishes that
 *   seat's own row: an unknown row is not "empty", it is not settled, so a
 *   hydrating list can never be armed at 0 and then "discover" old history;
 * - a settled baseline of 0 that later turns positive is the first teammate.
 *   The re-check is debounced 500 ms — a Side Chat thread's `Side: ` title
 *   lands one frame after its origin row, exactly the race the built-in
 *   documents (`AUTO_OPEN_DEBOUNCE_MS`, `sidebar/use-host-feeds.ts`).
 *
 * WHERE "the session on screen" COMES FROM. The session list carries no
 * `current` id. DSH's native right column publishes it as
 * `ctx.sidebarRight.mounted` — "the sanctioned feed for which session's seat is
 * on screen" (`dsh-better-sidebar/src/context-types.ts:545`); a host without
 * that face degrades to the better-sidebar store's `sessionId`. A PRESENT
 * `mounted` face is authoritative even while it reports "no session": falling
 * back to the store there would arm a conversation nobody is looking at.
 *
 * THE OPEN is better-sidebar's own targeted open, the same call its built-in
 * subagent page makes (`activateTasksPage`): `openTab({ type, title, reveal },
 * { sessionId })`. `reveal` focuses the page, `scope` lands it in THAT
 * conversation's layout, and our descriptor's `single: true` focuses an
 * already-open page instead of duplicating it. On a wide viewport the host
 * expands the column; on a NARROW one it draws the column fullscreen, so the
 * page is parked (`reveal: false`) instead of taking the conversation away.
 *
 * ONCE per conversation: the revealed session id is latched, so a later close
 * sticks and a reload of the same conversation stays quiet. The trigger rides
 * the session-list / mounted / store observables, with a 2 s heartbeat that
 * covers hosts publishing no subscription and a late-mounted right column.
 * ------------------------------------------------------------------------- */

/** The cordis service name of DSH's own client-side Sessions store. */
const SESSIONS_SERVICE = 'sessions'

/** The cordis service name of DSH's native right-column controller. */
const RIGHT_COLUMN_SERVICE = 'sidebarRight'

/** Effect label shown in cordis diagnostics. */
const FIRST_TEAM_EFFECT_LABEL = 'dsh-task-gantt: reveal on first teammate'

/** The 500 ms recheck the built-in uses (`sidebar/use-host-feeds.ts`). */
const AUTO_OPEN_DEBOUNCE_MS = 500

/** Narrow-viewport bracket shared with the sidebar ecosystem (`innerWidth < 768`). */
const AUTO_OPEN_MIN_WIDTH = 768

/** Heartbeat for hosts that publish no subscription (snapshot read only). */
const AUTO_OPEN_HEARTBEAT_MS = 2000

/** Side Chat threads ride the subagent origin but are not teammates. */
const SIDE_THREAD_TITLE_PREFIX = 'Side: '

/**
 * One row of `sessions.list.getSnapshot().byId`, structurally — only the fields
 * this module reads. Mirrors `SidebarSessionSummary` in better-sidebar's
 * `src/context-types.ts`: `origin` is the durable origin, `parentId` the
 * durable direct parent (both published on subagent children).
 */
interface SessionSummaryLike {
  origin?: unknown
  parentId?: unknown
  displayTitle?: unknown
  /** Whether this session's agent is running (better-sidebar's summary hint). */
  running?: unknown
}

/** The client `sessions` service face this module needs. */
interface SessionsFace {
  list?: {
    getSnapshot?: () => { byId?: Record<string, SessionSummaryLike | undefined> } | undefined
    subscribe?: (listener: () => void) => () => void
  }
}

/** The DSH native right-column controller (`ctx.get('sidebarRight')`). */
interface RightColumnFace {
  mounted?: {
    getSnapshot?: () => unknown
    subscribe?: (listener: () => void) => () => void
  }
  /** The native column's active tab (kind is the tab type). */
  active?: () => { kind?: unknown } | undefined
  isExpanded?: () => boolean
  toggleExpanded?: () => void
}

/**
 * The `betterSidebar` slice the reveal needs, declared structurally — the same
 * treatment {@link WorkspaceNavigation} gets, so no value import of
 * dsh-better-sidebar is required.
 */
interface TabRevealFace {
  openTab?(seed: { type: string; title?: string; reveal?: boolean }, scope?: { sessionId: string }): void
  isTabEnabled?(id: string): boolean
  getSnapshot?(): { sessionId?: string | undefined } | undefined
  subscribeState?(listener: () => void): () => void
}

/**
 * The rows of one session-list snapshot, or `undefined` when the list is not
 * published yet. Total: any foreign value reads as "unknown", never throws.
 *
 * @param snapshot - `sessions.list.getSnapshot()`, or anything else.
 * @returns the `byId` record, or `undefined` when it is not one.
 */
export function sessionRowsOf(snapshot: unknown): Record<string, SessionSummaryLike | undefined> | undefined {
  if (snapshot === null || typeof snapshot !== 'object') return undefined
  const byId = (snapshot as { byId?: unknown }).byId
  if (byId === null || typeof byId !== 'object' || Array.isArray(byId)) return undefined
  return byId as Record<string, SessionSummaryLike | undefined>
}

/**
 * Whether one list row is a teammate session: a durable subagent child that is
 * not a Side Chat thread (better-sidebar's `isSideThreadSummary`, inverted).
 *
 * @param row - one `byId` value.
 */
export function isTeammateRow(row: SessionSummaryLike | undefined): boolean {
  if (row === undefined || row === null || typeof row !== 'object') return false
  if (row.origin !== 'subagent') return false
  return typeof row.displayTitle !== 'string' || !row.displayTitle.startsWith(SIDE_THREAD_TITLE_PREFIX)
}

/**
 * Count the seat session's DIRECT teammate sessions in one list snapshot — the
 * per-conversation counterpart of the built-in's `directSubagentCount`.
 *
 * @param rows - {@link sessionRowsOf}'s result, or `undefined`.
 * @param sessionId - the seat session whose direct children are counted.
 * @returns the count (0 for an unknown list).
 */
export function countDirectTeammates(
  rows: Record<string, SessionSummaryLike | undefined> | undefined,
  sessionId: string,
): number {
  if (rows === undefined || rows === null || typeof rows !== 'object') return 0
  let count = 0
  for (const row of Object.values(rows)) {
    if (row === undefined || row === null || typeof row !== 'object') continue
    if (row.parentId !== sessionId) continue
    if (!isTeammateRow(row)) continue
    count += 1
  }
  return count
}

/**
 * Whether any direct teammate of one conversation is running right now.
 *
 * Used only on the FIRST settled read of a conversation: a conversation first
 * seen while a teammate is already running is one where the team is appearing
 * now (the watcher mounted late, or the reader just switched to an active
 * team), so the reveal is still welcome. An old conversation whose teammates
 * are all idle stays quiet.
 *
 * @param rows - the session-list `byId` record, or `undefined`.
 * @param sessionId - the seat session.
 * @returns `true` when at least one direct teammate row reports running.
 */
export function anyDirectTeammateRunning(
  rows: Record<string, SessionSummaryLike | undefined> | undefined,
  sessionId: string,
): boolean {
  if (rows === undefined || rows === null || typeof rows !== 'object') return false
  for (const row of Object.values(rows)) {
    if (row === undefined || row === null || typeof row !== 'object') continue
    if (row.parentId !== sessionId) continue
    if (!isTeammateRow(row)) continue
    if (row.running === true) return true
  }
  return false
}

/**
 * The trigger, as a pure predicate: a settled baseline of 0 that has become
 * positive is the conversation's first teammate. A baseline that started above
 * 0 never fires — the conversation already had a team when the reader arrived.
 *
 * @param baseline - the seat's direct-teammate count when it was armed.
 * @param live - the seat's direct-teammate count now.
 * @returns `true` only for the 0 → positive crossing of a settled baseline.
 */
export function firstTeammateDue(baseline: number | undefined, live: number): boolean {
  return baseline === 0 && live > 0
}

/**
 * Reveal our tab exactly ONCE, on the conversation's first teammate.
 *
 * Idempotent by construction: the revealed conversation is latched, the
 * baseline can only cross 0 → N once per session, and a session switch re-arms
 * the baseline for the conversation the reader moved to.
 *
 * Silent when the capability is absent: an older runtime with no `openTab`, a
 * foreign service shape, a throwing feed or a throwing implementation all leave
 * the tab registered and reachable from the + menu, with nothing logged and
 * nothing escaping a timer.
 *
 * @param ctx - the client cordis context; services are read lazily per signal.
 * @param service - the probed better-sidebar service.
 * @returns a disposer that detaches every subscription and pending timer.
 */
export function watchForFirstTeam(ctx: Context, service: BetterSidebarTabService): () => void {
  const reveal = service as TabRevealFace
  // Capability, not version: the method's PRESENCE is the capability, and the
  // documented rule (service.ts:651-657) is that `features` only ever grows.
  // Bound to a local so the narrowing survives into the timer closures.
  const openTab = reveal.openTab
  if (typeof openTab !== 'function') return () => {}

  let disposed = false
  /** The seat session this watch is currently about. */
  let watched: string | undefined
  /** The seat's direct-teammate count at arm time (`undefined` = not settled). */
  let baseline: number | undefined
  /** Debounce of the first-teammate re-check. */
  let timer: ReturnType<typeof setTimeout> | undefined
  /** Second focus pass, after another plugin's auto-open may have won the seat. */
  let focusTimer: ReturnType<typeof setTimeout> | undefined
  /** Conversations already revealed in this page load (the once-per-session latch). */
  const revealed = new Set<string>()

  /** The right-column controller, read lazily so a late mount is picked up. */
  const readRight = (): RightColumnFace | undefined => {
    try {
      const value = ctx.get(RIGHT_COLUMN_SERVICE)
      return value !== null && typeof value === 'object' ? (value as RightColumnFace) : undefined
    } catch {
      return undefined
    }
  }

  /** The seat session: the native column's mounted seat, else the store's. */
  const onScreenSession = (): string | undefined => {
    const mountedFace = readRight()?.mounted
    if (mountedFace !== undefined && typeof mountedFace.getSnapshot === 'function') {
      try {
        const mounted = mountedFace.getSnapshot()
        return typeof mounted === 'string' && mounted.length > 0 ? mounted : undefined
      } catch {
        return undefined
      }
    }
    try {
      const id = reveal.getSnapshot?.()?.sessionId
      return typeof id === 'string' && id.length > 0 ? id : undefined
    } catch {
      return undefined
    }
  }

  /** The published session rows, or `undefined` when the list is not readable. */
  const readRows = (): Record<string, SessionSummaryLike | undefined> | undefined => {
    try {
      const sessions = ctx.get(SESSIONS_SERVICE) as SessionsFace | undefined
      return sessionRowsOf(sessions?.list?.getSnapshot?.())
    } catch {
      return undefined
    }
  }

  const clearPending = (): void => {
    if (timer !== undefined) clearTimeout(timer)
    timer = undefined
    if (focusTimer !== undefined) clearTimeout(focusTimer)
    focusTimer = undefined
  }

  /** Open the page in `sessionId`'s right column and focus it (once). */
  const revealNow = (sessionId: string): void => {
    if (disposed || revealed.has(sessionId)) return
    revealed.add(sessionId)
    clearPending()
    // The user's own side-card prefs win: a disabled tab type is never opened
    // behind their back (`openTab` would refuse it anyway, silently).
    try {
      if (reveal.isTabEnabled?.(TAB_TYPE_ID) === false) return
    } catch {
      // a foreign isTabEnabled must not block the reveal
    }
    // A narrow host draws that column fullscreen: park the page so the
    // conversation stays on screen.
    const wide = typeof window === 'undefined' ? true : window.innerWidth >= AUTO_OPEN_MIN_WIDTH
    const seed = { type: TAB_TYPE_ID, title: t('tabTitle'), reveal: wide }
    const open = (request: { type: string; title: string; reveal: boolean }): void => {
      openTab.call(service, request, { sessionId })
    }
    try {
      open(seed)
    } catch {
      // Never let a foreign implementation take the plugin down; the tab stays
      // reachable from the + menu.
      return
    }
    // Another plugin that reacts to the same teammate (better-sidebar's own
    // task page, trace-inspect) can open its tab right after ours and take the
    // focus. Once the burst settles, re-open ONLY when the native column's
    // active tab is not ours: openTab on an already-open tab focuses it instead
    // of duplicating it (`single: true`). Skipped on a narrow host (taking the
    // focus there is unwanted) and on hosts without an `active` probe.
    const rightFace = readRight()
    if (wide && typeof rightFace?.active === 'function') {
      focusTimer = setTimeout(() => {
        focusTimer = undefined
        if (disposed || !revealed.has(sessionId)) return
        let activeKind: unknown
        try {
          activeKind = readRight()?.active?.()?.kind
        } catch {
          activeKind = undefined
        }
        if (activeKind === TAB_TYPE_ID) return
        try {
          open({ ...seed, reveal: true })
        } catch {
          // best-effort
        }
      }, 800)
    }
    // Fallback for a host whose open did not expand the column itself: read
    // then toggle, so an already-expanded column is never closed. A narrow
    // viewport is left alone on purpose (see above).
    try {
      const right = readRight()
      if (wide && right?.isExpanded?.() === false) right.toggleExpanded?.()
    } catch {
      // an absent/unknown column face is fine — the native open already asked
    }
  }

  /** The debounced re-check: only a settled baseline of 0 may reveal. */
  const confirm = (sessionId: string): void => {
    timer = undefined
    if (disposed || watched !== sessionId || revealed.has(sessionId)) return
    const rows = readRows()
    if (rows === undefined) return
    if (firstTeammateDue(baseline, countDirectTeammates(rows, sessionId))) revealNow(sessionId)
  }

  /** One evaluation pass over the current seat and the latest list snapshot. */
  const reconcile = (): void => {
    if (disposed) return
    const sessionId = onScreenSession()
    // A transient gap (the column remounting, a list refresh) is not a session
    // switch: keeping the armed baseline is what stops a teammate that appears
    // during that gap from being mistaken for the conversation's baseline.
    if (sessionId === undefined) return
    if (sessionId !== watched) {
      // A real session switch voids the previous conversation's baseline.
      watched = sessionId
      baseline = undefined
      clearPending()
    }
    if (revealed.has(sessionId)) return
    const rows = readRows()
    if (rows === undefined) return
    const seat = rows[sessionId]
    // The list has not published this conversation's own row yet: not settled.
    if (seat === undefined || seat === null || typeof seat !== 'object') return
    // A teammate's OWN seat is not a team board: only a root conversation is.
    if (seat.origin === 'subagent') return
    const live = countDirectTeammates(rows, sessionId)
    if (baseline === undefined) {
      // First settled read for this conversation: this is its baseline. A team
      // that is already RUNNING at that instant is appearing now (late mount /
      // just-switched active team), so open once; an idle historical team stays
      // quiet and keeps the reader's layout.
      baseline = live
      if (live > 0 && anyDirectTeammateRunning(rows, sessionId)) revealNow(sessionId)
      return
    }
    if (!firstTeammateDue(baseline, live)) return
    if (timer !== undefined) return
    timer = setTimeout(() => confirm(sessionId), AUTO_OPEN_DEBOUNCE_MS)
  }

  // Follow every signal that can change the answer. Each subscription is
  // best-effort (`this` preserved): a face without one is covered by the
  // heartbeat below.
  const disposers: Array<() => void> = []
  const track = (owner: unknown, method: string): void => {
    if (owner === null || typeof owner !== 'object') return
    const candidate = (owner as Record<string, unknown>)[method]
    if (typeof candidate !== 'function') return
    try {
      const release = (candidate as (listener: () => void) => () => void).call(owner, () => reconcile())
      if (typeof release === 'function') disposers.push(release)
    } catch {
      // a foreign observable that refuses a listener: the heartbeat covers it
    }
  }
  track(readRight()?.mounted, 'subscribe')
  try {
    const sessions = ctx.get(SESSIONS_SERVICE) as SessionsFace | undefined
    track(sessions?.list, 'subscribe')
  } catch {
    // a sessions service that throws on read: the heartbeat covers it
  }
  track(reveal, 'subscribeState')

  // Also picks up a right column / sessions store that mounts after this
  // effect ran, and a host that publishes no subscription at all.
  const heartbeat = setInterval(reconcile, AUTO_OPEN_HEARTBEAT_MS)
  // A Node-hosted run (the mount harness) must still be able to exit; browser
  // timers are numbers and skip this.
  if (heartbeat !== null && typeof heartbeat === 'object' && typeof (heartbeat as { unref?: unknown }).unref === 'function') {
    try {
      (heartbeat as { unref(): void }).unref()
    } catch {
      // not a Node timer
    }
  }

  // First pass: a page can load with the conversation already on screen.
  reconcile()

  return () => {
    disposed = true
    clearPending()
    clearInterval(heartbeat)
    for (const release of disposers) {
      try {
        release()
      } catch {
        // disposers are best-effort
      }
    }
  }
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
