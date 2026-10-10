# dsh-task-gantt — Design

> Every claim about host / dsh-better-sidebar / market behaviour in this document
> carries a source: a path on this machine (with line numbers) or a public URL.
> Claims we could not verify are marked **❓unverified** instead of being stated
> as fact.

## 1. What it is, and for whom

`dsh-task-gantt` is a DSH plugin that adds one sidebar tab to
[dsh-better-sidebar](https://github.com/ChuanTianML/dsh-better-sidebar): an
**agent-team task Gantt chart**.

- **y-axis** — one swimlane per roster member (the Lead, then every teammate);
- **x-axis** — real wall-clock time (epoch ms), read from the durable session
  event log;
- **bar content** — the shared task's `subject` plus a one-line `description`,
  with status, owner, `blockedBy`, `writeScopes` and readiness in the detail
  view.

### User stories

| # | As a… | I want… | So that… |
|---|---|---|---|
| U1 | the human running a team | to see **who worked when** | I can tell a stalled teammate from a busy one without reading three transcripts |
| U2 | the human running a team | to see **which task each teammate held, and when it moved** | I can reconstruct the plan-vs-actual without replaying the chat |
| U3 | the human running a team | the chart to be **honest when it cannot date something** | I never mistake a guessed timestamp for a recorded one |
| U4 | a plugin author | a **read-only** surface | looking at the board can never mutate the shared task board |

## 2. Why the data has to come from two places

The plugin deliberately reads **two** sources and merges them. Neither alone is
sufficient.

### 2.1 Source A — the `agentTeam` session projection (state, no time)

The sidebar client already receives the Lead session's team state as a
projection: `SessionListState.projectionsBySession[leadSessionId].values.agentTeam`.

The published shape is:

```ts
// ~/.dsh/profiles/web/node_modules/dsh-better-sidebar/src/context-types.ts:404-412
export interface SidebarTeamMemberProjection {
  id: string                                  // the teammate's child session id
  name: string
  role: 'lead' | 'teammate'
  phase: 'provisioning' | 'active' | 'failed'
  error?: string
}

// ~/.dsh/profiles/web/node_modules/dsh-better-sidebar/src/context-types.ts:420-438
export interface SidebarTeamProjection {
  members: readonly SidebarTeamMemberProjection[]
  tasks: readonly SidebarTeamTaskView[]       // id/revision/subject/description/
  failure?: string                            // status/ownerName/blockedBy/
}                                             // writeScopes/ready/writeScopeWarnings
```

**The projection carries no timestamps at all.** There is no `createdAt`, no
`startedAt`, no `completedAt` on either `SidebarTeamMemberProjection` or
`SidebarTeamTaskView` (source: the two interfaces above, read in full). It is a
*current-state* projection: it can tell you a task is `completed`, never *when*
it became completed.

So the projection is authoritative for **what exists and what state it is in
right now**, and useless for the x-axis.

### 2.2 Source B — the durable session event log (time)

Every session — the Lead and each teammate — has an append-only event log whose
events carry `time` (epoch ms) and `seq`. The host half reads it through
`ctx.sessionPersistence` (`open(id, 'read') → handle.read() → handle.close()`):

```ts
// ~/.dsh/profiles/web/node_modules/dsh-better-sidebar/src/context-types.ts:482-500
export interface SidebarSessionPersistenceService {
  open(sessionId: string, access: 'read' | 'write'): Promise<SidebarSessionHandle>
}
export interface SidebarSessionHandle {
  readonly header: { cwd?: string; agentPreset?: string } & Record<string, unknown>
  readonly inheritedEventCount?: number
  read(offset?: number, length?: number): Promise<{ events: readonly SidebarSessionEvent[] }>
  close(): Promise<void>
}
```

The log is the **only authoritative clock** in this design. It is also the
reasoning behind the `note` in the frozen contract:

> Every span is derived from the durable session event log (`turn/start` …
> settlement, `step/start` … `step/end`), never invented.
> — `src/shared/contract.ts:41-43`

Measured on this machine, every event in a real session log carries `time`,
`seq` and `data`; the observed `type` values included `turn/start`,
`step/start`, `step/end`, `tool/call`, `tool/result`, `assistant/message`
(source: measured event-type census recorded in `docs/TEAM-BRIEF.md` §3.2).
Re-measured directly on the Lead session log for this project
(`docs/FINDINGS-host.md` §1: 618 lines) the same shape holds, and the log also
contains `team/task` and `team/member` events — see §3.1 below.

> ⚠️ **Pairing is not guaranteed.** In the measured session, `turn/start`
> appeared **once** while `step/start` appeared **20** times
> (`docs/TEAM-BRIEF.md` §3.2); on the Lead log, `turn/start` appeared once and
> `turn/end` **zero** times (`docs/FINDINGS-host.md` §7.6). Any folding logic
> therefore has to tolerate a missing opener or a missing closer, and the
> contract models exactly that: `ActivitySpan.end` is `number | null`, where
> `null` means *still open* (`src/shared/contract.ts:45-55`). A turn that never
> closes is drawn open-ended toward "now"; that is an accurate reflection of a
> session that has not finished, not a defect.

### 2.3 Why not just poll the service?

`ctx.agentTeams` exists as a host service (`membership`, `listMembers`,
`listTasks`, `getTask`, `waitForChange` — `docs/TEAM-BRIEF.md` §3.3), but it
publishes the same **timeless** views. Reading it would not produce a single
x-coordinate. It is therefore used only as a *state* cross-check, never as a
clock.

## 3. Time-anchor precedence (the three tiers)

Task status transitions are hosted service calls (`agentTeams.createTask` /
`updateTask`), so they may or may not leave a trace in the session log. The
implementation must therefore try three tiers **in order**, and must stop at the
first tier that yields data:

| Tier | Source of the anchor | Result |
|---|---|---|
| **1** | a task-related event in the session log (`team/task`, `team/*`) | use its `time` verbatim — most authoritative |
| **2** | a `tool/call` in the log whose tool is the shared-task-board tool (`team_task_create` / `team_task_update` / `team_task_get` / `team_task_list`) | use `tool/call.time` as the anchor, and use `expected_revision` to attribute the change to the teammate that made it |
| **3** | nothing found | `history: []` — the UI draws only the *current* state and labels it as live |

Sources: `docs/TEAM-BRIEF.md` §3.4 (the tier list), and the measured fact that
**no `team/*` event appeared at all** in the reference session log
(`docs/TEAM-BRIEF.md` §3.2) — which is why tier 2 exists.

### 3.1 Which tier actually fires (measured)

The brief's "no `team/*` events" observation was made on a **teammate** log.
Re-measured on the **Lead** log, the events are there: `team/task` × 11 and
`team/member` × 12 in 618 lines, while the six teammate logs held zero each
(`docs/FINDINGS-host.md` §1, §4.1; independently re-counted by the verification
teammate, same numbers).

Consequences that shape the design:

- **Tier 1 is the normal path**, not a rare bonus. Task anchors come from
  `team/task` events, which `TeamJournal.appendAndFlush` writes into the **Lead's
  own session log** and flushes immediately — so a cold read right after a board
  change already sees it (`docs/FINDINGS-host.md` §4.2).
- **Tier 2 is a fallback and an attribution channel.** `team/task` carries no
  `action` field, only the full task snapshot; the action is derived from
  revision continuity plus status transitions (`docs/FINDINGS-host.md` §4.4),
  and `expected_revision` in a `team_task_update` call identifies *which*
  teammate performed revision R (`docs/FINDINGS-host.md` §4.6).
- **This is why the brief and this document disagree in one place.** The brief
  text is the Lead's contract document; `docs/FINDINGS-host.md` §8 lists the
  three lines that measurement superseded. Where they conflict, the measurement
  wins for behaviour, and the brief is expected to be updated.
- `team/member` carries `member.id`, which **is** the teammate's child session id
  (`docs/FINDINGS-host.md` §4.3) — so the lane ↔ log mapping needs no guessing.

### 3.1 The hard rule

> **Never invent a timestamp.** A missing date is reported as missing
> (`history: []`), never replaced by "now".

This is encoded in the contract by giving every `TaskEvent.action` an explicit
`'observed'` value, documented as *"a status change the plugin could only date by
first observation (used solely in `source: 'live'` degradation)"*
(`src/shared/contract.ts:64-74`). The `'observed'` action is how the UI can tell
a *recorded* transition from a *first-seen* one.

## 4. The contract

`src/shared/contract.ts` is frozen and owned by the Lead. It is environment
neutral on purpose — it imports nothing (`node:*`, `react`, `@deepseek-ai/*`),
so it compiles into the host bundle, the browser bundle and the vitest run alike
(`src/shared/contract.ts:12-15`).

Frozen constants (`src/shared/contract.ts:18-24`):

| Constant | Value |
|---|---|
| `API_VERSION` | `1` |
| `TAB_TYPE_ID` | `dsh-task-gantt:board` |
| `ROUTE_PREFIX` | `/dsh-task-gantt/api` |

Key types:

| Type | Role | Source |
|---|---|---|
| `ActivitySpan` | one turn/step stretch; `end === null` = still open | `src/shared/contract.ts:45-55` |
| `TaskEvent` | one dated task transition | `src/shared/contract.ts:61-79` |
| `TimelineTask` | a board task + its dated `history` + its `laneId` | `src/shared/contract.ts:82-101` |
| `TimelineLane` | one roster member = one y-axis lane | `src/shared/contract.ts:104-125` |
| `TimelineResponse` | one rendering pass; carries `source` + `notes` | `src/shared/contract.ts:128-160` |
| `BetterSidebarTabService` | the *structural* face of `ctx.betterSidebar` we consume | `src/shared/contract.ts:185-208` |

The wire envelope is `ApiEnvelope<T> = ApiOk<T> | ApiError`
(`src/shared/contract.ts:162-175`), and every route of this plugin uses it.

## 5. Data flow

```
                      ┌────────────────────────── host process ─────────────────────────┐
  browser             │                                                                │
┌───────────┐  POST   │  /dsh-task-gantt/api/timeline  { sessionId }                    │
│ BoardView │ ──────► │        │                                                       │
│ (client)  │         │        ▼                                                       │
└───────────┘         │   buildTimeline(ctx, sessionId)                                │
      ▲               │        ├── ctx.get('agentTeams')    → roster + task *state*     │
      │               │        ├── ctx.get('sessionPersistence') → per-session event logs│
      │               │        │      └── fold: turn/step spans, task transitions       │
      │               │        └── → TimelineResponse { lanes, tasks, range, source }   │
      └───────────────┴────────────────────────────────────────────────────────────────┘
```

- The host half registers its routes with
  `ctx.webServer.register({ kind: 'prefix', path: ROUTE_PREFIX, handler })`
  (`src/host/index.ts:30-43`).
- The route table is `POST {timeline, ping}` under `ROUTE_PREFIX`, same-origin,
  JSON in / JSON out (`src/host/timeline-route.ts:1-14`).
- **Failure is never a crash**: an unavailable agent-team layer is a legitimate
  empty board, not a 500 (`src/host/timeline-route.ts:12-14`).

### 5.1 Why the browser half talks HTTP instead of reading the projection

The projection is reachable from the browser and the event log is not: the
durable log lives in the host process. Rather than have the browser read logs
directly (it cannot) or have the host push a websocket (more surface than this
panel needs), the client asks the host for one already-folded
`TimelineResponse`.

> The route resolves **relative** to the page's transport base, never with a
> leading slash: a leading slash pins the request to the origin root and breaks
> under a reverse-proxy sub-path
> (`/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md:625-634`).

**⚠️ Documented divergence, to be verified on the mounted profile.** The client
here resolves the path against the **page origin**, not `document.baseURI`
(`src/client/api.ts:17-23`), with the rationale recorded in that file's header
(`src/client/api.ts:6-12`): this plugin's route is registered as an *absolute*
prefix on the host's own server (`ctx.webServer.register({ kind: 'prefix', path:
'/dsh-task-gantt/api' })`), so a page served from a sub-path must **not** prefix
the route with that sub-path.

That reasoning is the inverse of the guide's rule for better-sidebar's own
`/sidebar/api/*` routes, and the guide's rule is written for exactly this
hazard (`guide:634`: a reverse proxy at `https://host/dataops/proxy/3080/`
turns a wrong base into `404` / WebSocket `1006`). The two are reconcilable only
if the host's route prefix is mounted at the origin root regardless of the page
base — which is what `kind: 'prefix'` implies but is **not** something this
document has measured. Treat sub-path deployment as unverified
(`docs/VALIDATION.md` records what was actually run), and prefer
`ctx.betterSidebar.hostRouteUrl(path)` when the service advertises it in
`features` (guide `:796-799`).

## 6. Degradation matrix

The plugin is designed to **load and explain itself** in every partial
deployment, never to disappear or throw. `TimelineResponse.source` has exactly
three values, documented in the contract itself
(`src/shared/contract.ts:151-157`):

| `source` | Meaning |
|---|---|
| `log` | spans came from readable durable session logs (authoritative) |
| `partial` | some lanes' logs were unreadable; those lanes degrade |
| `live` | no log was readable; the board is projection-only |

Per-condition behaviour:

| Missing / failing piece | Plugin behaviour | UI shows |
|---|---|---|
| `ctx.betterSidebar` (dsh-better-sidebar absent) | client half registers nothing, logs one warning, stays dormant | *(no tab at all)* — the tab is only reachable when better-sidebar exists |
| `ctx.webServer` (host) | host half registers no routes, logs one warning | the panel reports an empty board rather than a broken chart |
| `ctx.agentTeams` (deployment has no agent-team layer) | roster/tasks are empty | empty state: "No agent team in this session" |
| `ctx.sessionPersistence` absent, or a log read fails | the service **is** composed on this machine — `dsh-base` inserts its JSONL backend unconditionally and the already-installed `dsh-better-sidebar` reads it at runtime (`docs/FINDINGS-host.md` §2). The `undefined` branch is still implemented, because other compositions (e.g. a minimal profile) may omit it and better-sidebar itself defends the same way (`src/session-store.ts:58` in that package) | `source: 'live'` (or `'partial'` when only some lanes failed) with a non-empty `notes[]` |
| `TimelineTask.history` empty for a task | the task is still drawn — at its *current* position, explicitly labelled as live, never as a fake interval | live-labelled task chip |
| The whole team board failed | `TimelineResponse.failure` carries the Lead's durable failure string (`src/shared/contract.ts:145-146`) | failure banner |

`notes[]` is `string[]` and is documented as *"human-readable, non-fatal
degradations (never throw for these)"* (`src/shared/contract.ts:158-159`) — so a
degraded panel is expected to say *why*, not just look empty.

## 7. Theme & i18n

### 7.1 Theme: token-driven, zero hard-coded colour

better-sidebar's own skin contract
(`/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md` §12, lines
1094-1123) requires every visual value to come from DSH's `--dsw-alias-*` /
`--dsw-font-*` / `--ds-*` tokens:

- **panel surface** = `var(--dsw-alias-bg-layer-1)`;
- **never** consume `--dsw-specific-sidebar-fill` — that token belongs to the
  host's left navigation, and skins override it with left-nav semantics, so a
  panel that consumes it loses its fill (guide line 1107);
- interactive chrome carries `-webkit-app-region: no-drag` (guide line 1115) —
  on a borderless shell the drag band otherwise swallows clicks.

This plugin follows the same rule and mirrors better-sidebar's guard: the test
suite scans the plugin's own style strings and `.tsx` sources for colour
literals.

### 7.2 i18n: self-contained

The panel ships its own zh-CN / en dictionary and picks one by page language
(`document.documentElement.lang || navigator.language`, `zh*` → Chinese, else
English — `src/client/i18n.ts:97-112`). It deliberately does **not** depend on
`@deepseek-ai/dsh-client-locale`, so the plugin can load on a profile that
composes nothing but better-sidebar.

Observable consequence, and the reason the README can name the menu entry: the
tab title is data, not a literal — zh `任务甘特图`, en `Task Gantt`
(`src/client/i18n.ts:26,63`).

## 8. Coupling to dsh-better-sidebar

The plugin depends on better-sidebar **only structurally**:

- it declares `BetterSidebarTabService` itself, as a plain interface, instead of
  value-importing `dsh-better-sidebar` (`src/shared/contract.ts:185-208`);
- it probes the service structurally with `ctx.get('betterSidebar')` and
  duck-types `registerTab` rather than trusting the service identity, so a
  half-initialized or foreign service can never crash activation
  (`src/client/index.ts:95-100`);
- if the first probe misses, it defers registration through
  `ctx.inject(['betterSidebar'], …)` — activation order between two independent
  client plugins is not guaranteed — and logs a warning; if the service never
  appears, the fiber stays dormant and no tab exists
  (`src/client/index.ts:59-83`);
- the tab registration lives inside `ctx.effect(...)`, so unloading (HMR or
  disabling the plugin) retracts it — the guide requires this, because an
  un-retracted registration throws `"already registered"` on the next
  activation (`/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md:160`
  and line 1055);
- registration failures are caught and reported instead of taking the fiber down
  (`src/client/index.ts:122-128`).

What this buys: no build-order coupling, no runtime hard dependency, and the
plugin still loads on a profile with no sidebar plugin at all.

### 8.1 What we do *not* declare

`dsh.client.inject` is left an empty array. The guide notes that a
client-context service such as `ctx.desktopWindow` must never be put into
`dsh.client.inject`, because a plain browser does not have it and injecting a
missing service leaves the plugin pending forever
(`/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md:1113`). Rather than
take that risk for a *soft* dependency, the plugin probes at apply time.

**Documented deviation.** The guide's own lifecycle section recommends the
*module-level* `export const inject = ['betterSidebar']` so that Cordis only
activates the plugin once the service exists
(`/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md:1056`). This plugin
keeps that export **empty** and instead calls `ctx.inject(['betterSidebar'], …)`
at apply time, for the same "run when available" effect without the
profile-level pre-flight risk: the host half must load on deployments without any
sidebar plugin at all, and a declared-but-absent service would keep the *whole*
plugin row pending, including the host routes. The deferred form scopes the wait
to the client half and keeps the failure mode to "one warning, no tab"
(`src/client/index.ts:11-17`, `:68-82`).

## 9. Known limitations

1. **`complete` / `reopen` have no real event sample yet.** Every task in the
   reference team only ever moved `pending → in_progress`, so the `team/task`
   events for completion and reopening have not been observed on this machine.
   Their shape is guaranteed by the same `appendAndFlush(root, 'team/task', …)`
   call site with a different `status`, and the derivation rules cover it — but
   it is **❓unverified by observation**, and the verification suite has to cover
   it with constructed fixtures (`docs/FINDINGS-host.md` §4.5, §7.1).
2. **Tier 3 is still reachable.** If no session log is readable at all, every
   task degrades to a live-labelled chip and `history` stays empty. That is the
   designed outcome, not a failure.
3. **`turn/end` is rare.** On the Lead log, `turn/start` appeared once and
   `turn/end` zero times (`docs/FINDINGS-host.md` §7.6). Open turn bands
   therefore stretch toward "now" for a long time; that is an accurate
   reflection of a session that has not finished. Step bars are unaffected.
4. **Polling cost scales with team size.** One request reads 1 + N session logs
   (N ≤ 8). A short result cache limits the amplification, but the end-to-end
   latency has **not** been measured yet — that needs a mounted profile
   (`docs/FINDINGS-host.md` §7.5).
5. **No writes.** The plugin never calls `agentTeams.createTask` /
   `updateTask`; the board is read-only by design.
6. **❓unverified**: whether the host's `clientModules` service requires the
   `"default"` key inside `exports["./client"]`
   (`docs/TEAM-BRIEF.md` §2.2) — the repo ships `{"default": "./lib/client.js"}`,
   matching another third-party plugin, and this is verified at mount time, not
   by this document.

## 10. Sources

| Kind | Source |
|---|---|
| Frozen contract | `/Users/lzx/Documents/GitHub/dsh-task-gantt/src/shared/contract.ts` |
| Cross-half SDK facts | `/Users/lzx/Documents/GitHub/dsh-task-gantt/docs/TEAM-BRIEF.md` |
| Measured host behaviour (services, `team/*` events, reader shapes) | `/Users/lzx/Documents/GitHub/dsh-task-gantt/docs/FINDINGS-host.md` |
| Install / activate / uninstall commands | `/Users/lzx/Documents/GitHub/dsh-task-gantt/docs/INSTALL.md` |
| Installed better-sidebar (0.22.1) types | `/Users/lzx/.dsh/profiles/web/node_modules/dsh-better-sidebar/src/context-types.ts` |
| Official consumer guide (v0.24.0) | `/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md` |
| better-sidebar repo rules | `/tmp/dsh-better-sidebar-src/AGENTS.md` |
| Market catalog submission rules | <https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md> |
| Community Market install/uninstall boundary | <https://github.com/anywhere-labs/deepseek-harness-desktop/blob/master/dsh-community-market/docs/install-and-uninstall.zh.md> |
