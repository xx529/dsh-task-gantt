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
export const BUILD_LABEL = 'v0.2.38' as const

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
  /**
   * What the span represents; drives the marker's glyph and shape.
   *
   * - `'turn'`, `'message'` and `'user-prompt'` are journalled by DSH itself.
   * - `'dispatch'` is OURS: a **directed hand-off inferred from the parent/child
   *   relationship**, NOT a journal message. See {@link SubagentDispatch}.
   * - `'question'` is a real journal event PAIR — an `ask_user_question` `tool/call`
   *   and its `tool/result` — narrowed into a message-shaped span so it lands on the
   *   exchange row. It is the one kind that carries a structured payload:
   *   {@link MessageSpan.question}.
   */
  kind: 'turn' | 'message' | 'user-prompt' | 'dispatch' | 'question'
  /** Epoch ms of the record that opened the span. */
  time: number
  /** Epoch ms the span closed; `null` while the turn is still open. */
  end: number | null
  /** Who produced it. */
  from: SpanSpeaker
  /**
   * Who received it. Present for `kind: 'message'` (the journal's `targetId`) and
   * for `kind: 'dispatch'` (the child session the parent handed work to); a turn
   * or a user prompt has no addressee and leaves this `undefined`.
   */
  to?: SpanSpeaker
  /**
   * The message's own text, whitespace-collapsed: the **full body**, not a
   * teaser. The marker shows a short prefix of it; clicking the marker shows
   * all of it.
   *
   * For `kind: 'dispatch'` this is the dispatch's `description` — the short task
   * name the parent gave the child, e.g. `Map codebase concerns`.
   */
  preview?: string
  /** The journal's message id, for correlating a queue with its delivery. For a dispatch it is the parent's `callId`. */
  messageId?: string
  /**
   * Present only for `kind: 'question'`: what was asked, the choices offered, where
   * it stands, and what the human picked. See {@link QuestionDetail}.
   */
  question?: QuestionDetail
  /** The owning session whose log carries the event. */
  sessionId: string
}

/** One choice a question offered the human. */
export interface QuestionOption {
  /** The option's own label, as shown and as returned in `selected`. */
  label: string
  /** Optional explanatory line under the label. */
  description?: string
}

/** One question inside one `ask_user_question` call, with its own outcome. */
export interface QuestionItem {
  /**
   * The question's id from the tool arguments (e.g. `which_sidebar`). Answers come
   * back keyed by this id, so it is what pairs a question with its selection.
   */
  id: string
  /** The short header above the question, when the model supplied one. */
  header?: string
  /** The question's full body, whitespace-collapsed. */
  prompt: string
  /** The choices offered. Observed non-empty in all 98 real questions. */
  options: QuestionOption[]
  /** Whether more than one choice could be selected (`multi_select: true`). */
  multiSelect: boolean
  /** The labels the human chose. EMPTY is a real outcome: they typed instead. */
  selected: string[]
  /** Free text the human typed instead of, or in addition to, choosing. */
  custom?: string
}

/**
 * A `ask_user_question` round-trip: what the model asked a HUMAN, and what came back.
 *
 * ## Where every field comes from
 *
 * Both halves are durable, host-readable session events, so nothing here is inferred:
 *
 * 1. **the ask** — `tool/call` with `name: 'ask_user_question'` (the only name that
 *    occurs in the real logs; `request_user_input` is accepted too, because the
 *    built-in activity mapper knows both). `arguments` is JSON:
 *    `{"questions":[{"id","header","question","options":[{"label","description"}],"multi_select"}]}`.
 *    Measured over 63 real calls: `questions` held **1 to 4** entries (35 / 15 / 10 / 3),
 *    `header` was always present, `options` was always present AND non-empty, and
 *    `multi_select: true` appeared on 6 of 98 questions.
 * 2. **the answer** — `tool/result` for that `callId`, whose single text block is a
 *    JSON string: `{"answers":[{"id","selected":["…"],"custom":"…"}]}`. Parsed in
 *    62 of 63 real results. `selected` was EMPTY in 18 answers and `custom` was
 *    present in 12 — a human who types instead of clicking is normal, not an error.
 * 3. **the failure** — the 63rd result carried `message.isError: true` with
 *    `data.error: { name: 'UserQuestionError', code: 'DELEGATED_CALLER' }` and the
 *    text `"human interaction is unavailable while the calling agent is owned by
 *    another live agent…"`, arriving 11 ms after the call. So a question really can
 *    terminate WITHOUT ever reaching a human, and that is `'failed'`, not
 *    `'answered'`.
 *
 * ## The three states, and what is NOT observable
 *
 * | status | evidence |
 * |---|---|
 * | `'waiting'` | the `tool/call` exists and no `tool/result` does — a live question |
 * | `'answered'` | a result exists, `isError` is not true, its text parsed |
 * | `'failed'` | a result exists with `isError: true` (or a `data.error`) |
 *
 * There is **no timeout state and no cancel event** in the logs — those 63 calls
 * produced exactly three shapes and nothing else. A question that a human never
 * answers simply stays `'waiting'`, which is why {@link MessageSpan.end} is `null`
 * for it: the span is still open, exactly like an unfinished turn.
 */
export interface QuestionDetail {
  /** Where the ask stands right now. */
  status: 'waiting' | 'answered' | 'failed'
  /** Every question in the call, each with its own answer. */
  questions: QuestionItem[]
  /** The host's own error code when `status === 'failed'`, e.g. `DELEGATED_CALLER`. */
  errorCode?: string
  /** The host's human-readable failure line, when it gave one. */
  errorText?: string
  /**
   * True when a result existed but its text was NOT the documented JSON. The ask
   * still happened and was still answered as far as the journal shows, but we could
   * not structure the reply — so the client must show {@link QuestionDetail.raw}
   * rather than an empty selection, and must not imply the human chose nothing.
   */
  unparsed?: boolean
  /** The raw result text, present only when {@link QuestionDetail.unparsed}. */
  raw?: string
}

/**
 * A sub-agent hand-off observed in its **parent's** log.
 *
 * ## What it is
 *
 * A plain sub-agent has no mailbox: there is no `team/message/queued` /
 * `delivered` pair, and no tool that sends it anything. What the parent's log
 * DOES carry, and we can date exactly, is:
 *
 * 1. `tool/call` with `name: 'subagent'` — the dispatch itself, whose
 *    `arguments` JSON holds `description` (the short task name) and `prompt`
 *    (the full brief);
 * 2. `tool/result` for that `callId` whose text is
 *    `started subagent <childSessionId>` — which is what **links the call to the
 *    child session**, because the `subagent` tool returns an acknowledgement and
 *    the `subagent/catalog` event does not carry the `callId`.
 *
 * Verified on the real `HtDot` logs: 6 such calls, 6 acknowledgements, 6 catalogs,
 * and the ack text resolved every `callId` to its child id.
 *
 * ## What it is NOT
 *
 * - **Not a completion signal.** The acknowledgement lands ~400 ms after the
 *   call (call `1792035793723` → result `1792035796104`), while the child ran for
 *   minutes. Completion is the CHILD's own `turn/end`.
 * - **Not an exchange.** Nothing comes back: the parent never receives the
 *   child's output as a message, so there is no `child → parent` dispatch and we
 *   do not pretend otherwise.
 * - **Not journalled.** It is inferred from the parent/child relationship, which
 *   is why it gets its own {@link MessageSpan.kind} rather than wearing the
 *   journal-message one.
 */
export interface SubagentDispatch {
  /** Epoch ms of the parent's `tool/call` — when the work was handed over. */
  time: number
  /** The parent's `callId`, used to correlate the call with its acknowledgement. */
  callId: string
  /** The child session id resolved from the acknowledgement text. */
  childId: string
  /** The tool call's `arguments.description`, or `''` when absent. */
  description: string
}

/**
 * Defensive ceiling applied to {@link MessageSpan.preview} by the host half.
 *
 * This is a guard against one pathological record, NOT a display budget. It was
 * 140 while the field was treated as a one-line teaser, which silently discarded
 * almost every message: across 177 real `team/message` records the collapsed
 * text runs 600-7135 characters (median 1839), so 177 of 177 were truncated and
 * the panel could never show what was actually sent. Anything still clipped at
 * this size is reported in the host's `notes`, never silently.
 */
export const MESSAGE_PREVIEW_MAX = 16384

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
  /** Text/icon colour that sits on {@link bar} when the fill is DARK. */
  on: string
  /**
   * Text/icon colour that sits on {@link bar} when the fill is LIGHT.
   *
   * Both inks are needed because the theme publishes exactly two, and each flips
   * with the skin (`--dsw-alias-label-primary-inverted` is `#ffffff` in the light
   * skin and `#353638` in the dark one), and because no single ink clears the 3:1
   * graphical minimum against every lane colour a four-hue theme can offer:
   * measured, only five chromatic statics in the whole theme manage that against
   * both skins' ink, and all five are red or blue. So a palette entry carries
   * both partners and the client picks per lane by luminance.
   *
   * Optional on the wire: a payload that predates it yields the same value as
   * {@link on}, i.e. exactly the previous behaviour.
   */
  onLight?: string
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
/**
 * The tool whose call/result pair defines a wait block.
 *
 * Lives in the SHARED contract, not in the host fold, because both halves need it and the
 * client bundle must never import `src/host/**` — doing so would pull the host code into
 * the browser. The host folds waits by this name; the client uses it for the legend.
 */
export const WAIT_TOOL_NAME = 'wait_agent'

/**
 * One `wait_agent` block: an agent that is NOT working, but blocked on its peers.
 *
 * This is a distinct kind of time from every other thing on the chart, which is why it
 * gets its own shape rather than being folded into `spans` (turn/step) or `messages`:
 *
 * - a `turn`/`step` span is time the agent spent WORKING;
 * - a message marker is an instant at which something was said;
 * - a wait is time the agent spent deliberately doing nothing, and it can be long —
 *   measured on this machine, 24 waits in one real log ran from 2.4s to 300s, several
 *   hitting their full timeout.
 *
 * The user's ask: "在信息收发这一行，要多展示 wait_agent 的标志，开始和结束，这样就知道这个
 * 时候 agent 不是在工作，而是在等待".
 */
export interface LaneWait {
  /** When `wait_agent` was called, epoch ms. */
  start: number
  /** When it returned, epoch ms — or `null` while it is still blocking. */
  end: number | null
  /** The timeout the caller asked for, ms (`arguments.timeout_ms`), when present. */
  timeoutMs?: number
  /**
   * `true` when the timeout elapsed with NOBODY arriving, `false` when a peer woke it.
   *
   * Worth carrying because it separates "waited productively" from "waited for nothing":
   * the tool's own result is `{"timedOut":true|false}`. An ABSENT value means the result
   * could not be read — never guess it, because a guess here becomes a false claim about
   * what an agent was doing.
   */
  timedOut?: boolean
  /** The session whose log this wait was read from. */
  sessionId: string
}

/**
 * What the lane's agent is doing RIGHT NOW, as a semantic category.
 *
 * Deliberately a category and not a sentence: the host publishes the same vocabulary
 * the built-in chat UI uses for its own process header
 * (`message.stepProcess.*` in `@deepseek-ai/dsh-client-ui-chat/lib/client.js:5366`),
 * and the CLIENT owns the wording through its own dictionary. The host never emits a
 * Chinese phrase.
 *
 * `'thinking'` is the built-in's own fallback for "no tool call is in flight"
 * (`live.activity = data?.summary.running ?? "thinking"`, same file `:2248`), i.e. the
 * `正在分析请求` the user asked for.
 */
export type LaneLiveActivityKind =
  | 'thinking'
  | 'read'
  | 'readImage'
  | 'search'
  | 'write'
  | 'edit'
  | 'commands'
  | 'code'
  | 'webSearch'
  | 'webFetch'
  | 'subagents'
  | 'plan'
  | 'questions'
  | 'tools'

/**
 * One lane's live activity, derived from that lane's own session log.
 *
 * ## What it is
 *
 * The lane's last `tool/call` that has NO matching `tool/result` yet, while the lane's
 * turn/step is still open. Both halves are durable, host-readable session events
 * (`tool/call` / `tool/result` are first-class members of the host's `SessionEventMap`),
 * so this is derived, never guessed.
 *
 * ## What it is NOT — read this before rendering
 *
 * 1. **`preparing` is NOT reproducible.** The built-in's `prepare.*` wording
 *    (`准备读取文件`) comes from the client-synthetic event `assistant/live-chunk`
 *    (`tool-call-delta`), which is **not a session event type at all** — it is absent
 *    from `known-event-types.js` and appears in **zero** durable logs. A host that only
 *    sees committed events cannot know the model is still streaming tool arguments, so
 *    this field never reports that sub-state. It is a declared gap, not an oversight.
 * 2. **The `已完成 …` summary is out of scope.** That needs the built-in's client-side
 *    process-group segmentation (`conversation-nodes/process-groups.js`), which is
 *    separate work.
 * 3. **Only render this for a lane you already present as active.** `kind: 'thinking'`
 *    means "no tool in flight" — for an idle lane that is also true, and painting
 *    `正在分析请求` on a finished agent would be wrong. Gate on `status === 'running'`
 *    (or `'provisioning'`), exactly as the existing status word is gated.
 *
 * ## Why an unsettled `tool/call` and not just `turn/start`
 *
 * Measured over the Lead's real session log: 2580 `tool/call` events, and the interval
 * to the matching `tool/result` is a median of **175 ms** but with a long tail —
 * **796** calls over 1 s, **385** over 5 s, **128** over 30 s, longest **900 s**. So
 * "a turn is open" would claim work for the whole turn, while "a `tool/call` has no
 * result yet" is precisely the window in which a tool is executing — and it is wide
 * enough for a human reading the panel to see it. The host reads the LIVE channel
 * (`agents.get(id).session.snapshotEvents()`), so an unflushed `tool/call` is visible
 * immediately.
 */
export interface LaneLiveActivity {
  /** The category the running tool maps to, or `'thinking'` when none is in flight. */
  kind: LaneLiveActivityKind
  /**
   * A short human-readable detail taken from the running tool's JSON arguments
   * (`title` / `description` / `task` / …, first non-empty wins), collapsed to one
   * line and clipped to 160 characters. Empty string when there is nothing to show.
   */
  detail: string
  /** The running tool's own name; absent when nothing is in flight. */
  toolName?: string
  /** Which half of the rule decided the answer — so the value is auditable. */
  evidence: 'running-tool' | 'no-running-tool'
}

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
   * Ascending blocks in which this agent was WAITING on its peers, not working.
   *
   * Drawn on the same row as the messages, because that row is where "this agent is
   * interacting with others" already lives: a message is an instant of contact and a
   * wait is the stretch of time spent hoping for one.
   */
  waits?: LaneWait[]
  /**
   * What this lane's agent is doing right now.
   *
   * OPTIONAL by contract: absent when the lane has no readable session log, or is the
   * `unassigned` bucket. A payload without it must render byte-for-byte as before —
   * that is what makes this a progressive enhancement. See {@link LaneLiveActivity} for
   * the two things it deliberately cannot report, and the rendering precondition.
   *
   * `null` is accepted as well as absent: JSON has no `undefined`, the client already
   * treats an explicit `null` as "no activity", and the contract uses `| null` elsewhere
   * (`range.end`). The host itself omits the key rather than sending `null`.
   */
  activity?: LaneLiveActivity | null
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
