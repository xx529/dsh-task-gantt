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

/**
 * Human-readable build marker, shown at the end of the panel's footer.
 *
 * Exists because a stale client bundle is otherwise indistinguishable from a
 * fresh one: the browser half is served from `/plugins/<id>/client.js&rev=…`
 * where `rev` hashes mtime+ctime+size, so a rebuild that keeps those equal is
 * invisible, and a page that never re-materialised the module looks exactly
 * like a page running the new code. Bump this whenever the panel's appearance
 * or behaviour changes, and a tester can read the version off the screen
 * instead of guessing from a screenshot.
 */
export const BUILD_LABEL = 'build 2026-10-12 · tracks+peer-color' as const

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

/**
 * The speaker of a timeline span, as the team journal records it.
 *
 * `kind: 'user'` is the human at the keyboard — their own prompt to the lead —
 * and gets one fixed colour everywhere, so "I said this" is never confused with
 * "a teammate said this".
 */
export interface SpanSpeaker {
  kind: 'user' | 'lead' | 'teammate' | 'system'
  /** Session/roster id: a member session id, `'lead'`, or `'user'`. */
  id: string
  /** Display name from the journal (`senderName`), or the literal `'you'`. */
  name: string
}

/**
 * A message-carrying span: one turn, one delivery, or one user prompt.
 *
 * These are what make the chart answer "at this moment, who told whom what".
 * Every span is dated from a durable session-journal event (`turn/start`,
 * `team/message/queued` + its `delivered` twin, `user/message`); nothing here
 * is inferred from wall-clock arrival at the panel.
 */
export interface MessageSpan {
  /** What the span represents; drives the marker's glyph and shape. */
  kind: 'turn' | 'message' | 'user-prompt'
  /** Epoch ms of the record that opened the span. */
  time: number
  /** Epoch ms the span closed; `null` while the turn is still open. */
  end: number | null
  /** Who produced it. */
  from: SpanSpeaker
  /**
   * Who received it. Present for `kind: 'message'` (the journal's `targetId`);
   * a turn or a user prompt has no addressee and leaves this `undefined`.
   */
  to?: SpanSpeaker
  /**
   * The message's own first line of text, whitespace-collapsed and already
   * clipped to {@link MESSAGE_PREVIEW_MAX} — the panel shows it as-is.
   */
  preview?: string
  /** The journal's message id, for correlating a queue with its delivery. */
  messageId?: string
  /** The owning session whose log carries the event. */
  sessionId: string
}

/** Hard clip applied to {@link MessageSpan.preview} by the host half. */
export const MESSAGE_PREVIEW_MAX = 140

/**
 * The next hop for a lane head: a session this chart can navigate to.
 *
 * `type: 'session'` carries a bare session id. `type: 'address'` carries DSH's
 * structured subagent address for the same conversation — better-sidebar's
 * `uiWorkspace.openSession` accepts either, and passing the exact shape DSH
 * minted avoids re-deriving it here.
 */
export type LaneNavigation =
  | { type: 'session'; value: string }
  | { type: 'address'; value: { sessionId: string; [key: string]: unknown } }

/**
 * Theme tokens for one lane's identity colour.
 *
 * Deliberately a pair of design-token *names*, never literal colours: the
 * theme contract forbids hard-coded paint in this plugin, so each lane carries
 * the token references its bars and markers should resolve.
 */
export interface LaneColorTokens {
  /** Fill for the lane's step bars and the left edge of its markers. */
  bar: string
  /** Text/icon colour that sits on {@link bar}. */
  on: string
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
  /**
   * Ascending message-carrying spans (turns, deliveries, the human's prompts).
   * Rendered as coloured markers so a lane shows who said what, when.
   */
  messages: MessageSpan[]
  /**
   * This lane's identity colour, as theme-token names. Stable for a given
   * member id, so the same teammate keeps one colour across every panel.
   */
  color: LaneColorTokens
  /**
   * Where clicking this lane head should navigate. Absent when the lane has no
   * real session behind it (`unassigned`, or a roster row with no id yet).
   */
  navigation?: LaneNavigation
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
   * Chart bounds in epoch ms.
   *
   * `end` is `null` while the board is still live, which tells the client to
   * keep the right edge pinned to "now". When every member has stopped, `end`
   * is a real timestamp instead and {@link live} is `false`, so the chart stops
   * growing — the window no longer creeps forward on an idle team.
   */
  range: { start: number; end: number | null }
  /**
   * Whether the team is still doing something. `false` freezes the right edge
   * at {@link range}.`end`; the client must not advance it with its own clock.
   */
  live: boolean
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
