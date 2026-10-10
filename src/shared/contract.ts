/**
 * FROZEN wire + domain contract of dsh-task-gantt.
 *
 * This file is the single source of truth shared by BOTH halves:
 *   - the host half (`src/host/*`) builds {@link TimelineResponse} values;
 *   - the client half (`src/client/*`) renders them;
 *   - the tests (`tests/*`) assert against them.
 *
 * CHANGING THIS FILE IS A CROSS-HALF BREAKING CHANGE. Do not edit it without
 * the owner of the other half agreeing first (the Lead arbitrates).
 *
 * Environment neutrality: this module must not import anything (`node:*`,
 * `react`, `@deepseek-ai/*`). It is compiled into the host bundle, the browser
 * bundle and the vitest run alike.
 */

/** Wire/API version. Bump on every incompatible change of this contract. */
export const API_VERSION = 1 as const

/** The sidebar tab type id registered through `ctx.betterSidebar.registerTab`. */
export const TAB_TYPE_ID = 'dsh-task-gantt:board' as const

/** The host route prefix owned by this plugin (absolute, no trailing slash). */
export const ROUTE_PREFIX = '/dsh-task-gantt/api' as const

/** Roster lifecycle phase, as the durable `agentTeam` projection publishes it. */
export type MemberPhase = 'provisioning' | 'active' | 'failed'

/** Derived runtime status: durable phase first, live activity second. */
export type MemberStatus = 'running' | 'idle' | 'provisioning' | 'failed'

/** Shared-task-board status, as the durable projection publishes it. */
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'deleted'

/**
 * One continuous stretch of activity on a lane.
 *
 * `turn` is the session-lifecycle bound (a whole prompt/response turn) and is
 * rendered as a faint band; `step` is one model step inside a turn and is
 * rendered as the solid bar. Every span is derived from the durable session
 * event log (`turn/start` … settlement, `step/start` … `step/end`), never
 * invented: a step without a matching `step/end` yet is still open and gets
 * `end === null`.
 */
export interface ActivitySpan {
  kind: 'turn' | 'step'
  /** Epoch ms of the opening event. */
  start: number
  /** Epoch ms of the closing event; `null` while the span is still open. */
  end: number | null
  /** Turn number, when the source session records one. */
  turn?: number
  /** Step number inside its turn, when the source session records one. */
  step?: number
}

/**
 * One task status transition observed in a session event log — the x-axis
 * anchors of the task overlay on a lane.
 */
export interface TaskEvent {
  /** Epoch ms of the event that moved the task. */
  time: number
  /**
   * What the event did:
   * - `created`  – `team_task_create` resolved on the Lead;
   * - `claimed`  – `team_task_update` with action `claim` (start of work);
   * - `completed`– `team_task_update` with action `complete`;
   * - `reopened` – `team_task_update` with action `reopen`;
   * - `updated`  – any other mutation (`edit` / `set_dependencies` / …);
   * - `observed` – a status change the plugin could only date by first
   *   observation (used solely in `source: 'live'` degradation).
   */
  action: 'created' | 'claimed' | 'completed' | 'reopened' | 'updated' | 'observed'
  /** The task revision the event produced, when the log records one. */
  revision?: number
  /** Session whose log carries the event (the teammate that performed it). */
  sessionId: string
}

/** One shared task, as the durable board publishes it plus its dated history. */
export interface TimelineTask {
  id: string
  revision: number
  subject: string
  description: string
  status: TaskStatus
  /** `ownerName` from the board; absent when the task is unowned. */
  owner?: string
  blockedBy: string[]
  writeScopes: string[]
  ready: boolean
  writeScopeWarnings: string[]
  /**
   * The lane this task is drawn on. `owner` when the board names one, else the
   * session that last moved it, else `'unassigned'`.
   */
  laneId: string
  /** Dated transitions, ascending by `time`. May be empty for a cold board. */
  history: TaskEvent[]
}

/** One roster member: the y-axis lane of the chart. */
export interface TimelineLane {
  /** The member's session id, or `'lead'` for the Lead row, or `'unassigned'`. */
  id: string
  name: string
  role: 'lead' | 'teammate' | 'unknown'
  /** Durable phase from the projection (absent for `unassigned`). */
  phase?: MemberPhase
  /** Derived status (absent for `unassigned`). */
  status?: MemberStatus
  /** Child-session creation time (projection/catalog), when known. */
  createdAt?: number
  /** Model label, when the deployment exposes one. Display-only. */
  model?: string
  /** Durable provisioning error, when the roster records one. */
  error?: string
  /** True when spans were read from the session log; false = live/empty. */
  hasHistory: boolean
  /** Ascending activity spans. */
  spans: ActivitySpan[]
  /** Tasks drawn on this lane, ascending by first history time. */
  tasks: TimelineTask[]
}

/** Everything the panel needs for one rendering pass. */
export interface TimelineResponse {
  apiVersion: typeof API_VERSION
  /**
   * The session the panel was opened in.
   */
  sessionId: string
  /**
   * The team's root session id (the Lead) this board was read from.
   */
  rootSessionId: string
  /** Epoch ms the host built this response. */
  generatedAt: number
  /**
   * Chart bounds in epoch ms. `end` is `null` while the board is still live,
   * which tells the client to keep the right edge pinned to "now".
   */
  range: { start: number; end: number | null }
  /** The Lead's durable team failure string, when the board stopped early. */
  failure?: string
  /** Lanes, Lead first, then teammates in roster order, then `unassigned`. */
  lanes: TimelineLane[]
  /** Every non-deleted task, ascending by first history time then subject. */
  tasks: TimelineTask[]
  /**
   * How the timeline was assembled, so the UI can be honest about it:
   * - `log`     – spans came from readable durable session logs (authoritative);
   * - `partial` – some lanes' logs were unreadable, those lanes degrade;
   * - `live`    – no log was readable; the board is projection-only.
   */
  source: 'log' | 'partial' | 'live'
  /** Human-readable, non-fatal degradations (never throw for these). */
  notes: string[]
}

/** Failure envelope body used by every route of this plugin. */
export interface ApiError {
  ok: false
  error: { code: string; message: string }
}

/** Success envelope body used by every route of this plugin. */
export interface ApiOk<T> {
  ok: true
  value: T
}

/** The plugin's own wire envelope. */
export type ApiEnvelope<T> = ApiOk<T> | ApiError

/**
 * The minimal face of `ctx.betterSidebar` this plugin consumes.
 *
 * Declared structurally on purpose: the client half stays value-decoupled from
 * `dsh-better-sidebar` (no value import → no build-order coupling, and the
 * plugin still loads, dormant, when better-sidebar is absent). The real
 * service structurally satisfies this interface.
 */
export interface BetterSidebarTabService {
  registerTab(descriptor: {
    id: string
    title: string | (() => string)
    description?: string | (() => string)
    icon?: unknown
    order?: number
    hidden?: boolean
    single?: boolean
    dedupeKey?: (tab: { id: string; type: string }) => string | undefined
    available?: (...args: unknown[]) => boolean
    component: (props: {
      ctx: unknown
      store: unknown
      scope: { sessionId: string; cwd?: string }
      tab: { id: string; type: string; title: string; path?: string; meta?: Record<string, unknown> }
      visible: boolean
    }) => unknown
  }): () => void
  /** Resolve one of better-sidebar's routes against the page's transport base. */
  hostRouteUrl?(path: string): string
  /** Feature probe (e.g. `'hostRouteUrl'`); absent service ⇒ absent features. */
  features?: readonly string[]
}
