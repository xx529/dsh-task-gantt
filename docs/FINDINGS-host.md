# host 半数据层：服务可用性与时间锚点实测（owner: host-data）

> 本文只记录**我本人跑过**的命令、**我本人读过**的文件行号。凡未跑的，一律标 ❓。
> 宿主：DSH **0.2.0-rc.2**（`~/.dsh/dsh-runtimes/dsh-primary-runtime/runtime.json` 的 `desktopVersion`）。
> 宿主代码位置：`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`（121 MB）。
> asar 解包工具（本机没有可用 asar CLI：`npx --yes @electron/asar` 因 `~/.npm` 权限失败，退出码 1）：
> 自写的最小 asar 读取器 `/tmp/dsh-asar/asar.mjs`（纯 node，无依赖），解包目标 `/tmp/dsh-asar/out/`。
> 下文所有 `/dsh/...` 路径均指解包后的 `/tmp/dsh-asar/out/dsh/...`。

---

## 0. 结论速览（每条的完整依据见后文对应小节）

| # | 问题 | 结论 | 依据 |
|---|---|---|---|
| 1 | `ctx.get('sessionPersistence')` 在本机 0.2.0-rc.2 存在吗？ | **存在**（`dsh-base` bundle 无条件挂载 JSONL 后端） | §2 |
| 2 | `Session` 怎么读事件？ | 活会话 `agents.get(id).session.snapshotEvents()`；冷会话 `sessionPersistence.open(id,'read') → handle.read() → handle.close()`。前者在宿主里被标 `@deprecated`，官方三方插件仍以“活会话优先”方式用它 | §3 |
| 3 | 任务看板事件到底是什么？ | **`team/task`**（+ `team/member` / `team/message/*`），由 `TeamJournal` 追加到 **Lead 会话自己的日志**，每条带 `time`（epoch ms）与 `seq`。brief §3.4 的“日志里没有 team/*”结论**已过时**（见 §4.1） | §4 |
| 4 | 时间锚点最终落在 brief §3.4 的第几级？ | **第 1 级**（日志里直接有 `team/task` 事件），第 2 级（`tool/call` 扫描）仅用作**丢失/缺事件时的兜底**与**行动者归属** | §4.5 |
| 5 | 任务 acton（claim/complete/reopen）有直接字段吗？ | **没有**。`team/task` 事件只带完整快照 `{id,revision,subject,description,status,blockedBy,writeScopes,ownerId?}`；action 必须由 **revision 连续性 + status 迁移**推导 | §4.4 |
| 6 | 泳道 ↔ 会话日志怎么映射？ | `team/member.data.member.id` **就是** teammate 的子会话 id（= `~/.dsh/sessions/<cwd>/<id>/` 目录名） | §4.3 |
| 7 | 谁动了这个任务？ | 可用 `team_task_update` 工具调用的 `expected_revision` **精确**归属（CAS 前置条件唯一确定目标 revision） | §4.6 |

---

## 1. 一键复现：解包宿主 + 读原始日志

```bash
# 1) 解包 app.asar（本机无可用 asar CLI，用自写的最小读取器）
node /tmp/dsh-asar/asar.mjs "/Applications/DeepSeek Harness.app/Contents/Resources/app.asar" list '^/dsh/node_modules/@deepseek-ai/dsh-session/' 
node /tmp/dsh-asar/asar.mjs "/Applications/DeepSeek Harness.app/Contents/Resources/app.asar" extract '^/dsh/node_modules/@deepseek-ai/dsh-(session-persistence|session|experimental-agent-team|experimental-tool-agent-team)(/|$)'

# 2) 读本工作区所有会话日志（zstd 多帧，Node 的 zstdDecompressSync 只解开第一帧 222B，必须用 CLI）
S=~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-task-gantt--
for d in "$S"/*/; do printf '%s ' "$(basename "$d")"; zstd -d -c "$d/session.v4.jsonl.zstd" | wc -l; done
```

实测输出（2026-10-11 00:1x，团队运行中）：

```
66b9735d-8df4-44df-9d74-b4083057e02f  lines=103  teamEvents=0     # packaging
7484fccf-2cb1-450c-9993-610a8930073e  lines=72   teamEvents=0     # shell
87589993-ee13-46d7-a8a4-53972f697519  lines=158  teamEvents=0     # host-data（本会话）
91410edb-5869-4183-bb36-01a655321fb4  lines=114  teamEvents=0     # docs
c79a18f7-d3c4-41c7-a689-9ba3b0ca483f  lines=116  teamEvents=0     # ui
f828dda6-e91d-4dcc-bbf0-9a9d73d9555e  lines=94   teamEvents=0     # verify
session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99  lines=618  teamEvents=25   # Lead
```

> **关键**：`team/*` 事件**只在 Lead 会话的日志里**，teammate 日志里一条都没有。
> 所以 `rootSessionId` 必须解析成 Lead，任务的 history 必须从**Lead 的日志**取。

---

## 2. `sessionPersistence` 存在吗？——存在（挂载点是一手证据）

### 2.1 bundle 层无条件 insert

`/tmp/dsh-asar/out/dsh/node_modules/@deepseek-ai/dsh-base/cordis.patch.yml` **L130-133**：

```yaml
    - id: session-persistence-jsonl
      name: '@deepseek-ai/dsh-session-persistence-jsonl'
      config:
        root: !!js dshHomePath('sessions')
```

`dsh-base` 是目标 profile 的第一个 bundle（`~/.dsh/profiles/web/package.json` 的 `dsh.profile.bundles[0]`），
且该行**没有** `disabled`，也**没有**任何 profile 层 patch 覆盖它
（`~/.dsh/profiles/web/cordis.patch.yml` 全文 118 行，grep 无 `session-persistence`）。

### 2.2 更硬的证据：另一位一手消费者

同 profile 已装的 `dsh-better-sidebar@0.22.1`（`~/.dsh/profiles/web/node_modules/dsh-better-sidebar/`）
是**运行中**的 host 插件，它读的就是这个服务：

- `src/index.ts:123`、`src/index.ts:462`、`src/sidechat-routes.ts:138/208/416`：`ctx.get('sessionPersistence')`
- `src/session-store.ts:58`：`const persistence = ctx.get('sessionPersistence')` → `if (persistence === undefined) return undefined`（**软探测 + 降级**，与我们的要求一致）

### 2.3 结论

本机 `web` profile 上 `ctx.get('sessionPersistence')` **一定非 undefined**。
但**代码仍必须写 undefined 分支**（brief §3.3 的降级要求 + better-sidebar 自身就是这么写的），
因为在 `minimal` 之类的其它组合里它可能缺席。

---

## 3. Session 怎么读事件？——两条通道，形状已确认

### 3.1 活会话（最新，含尚未 flush 的事件）

一手消费者 `dsh-better-sidebar/src/sidechat-routes.ts` **L185-200**：

```ts
/** The live thread agent, or undefined (cold — the caller resumes). */
function liveThreadAgent(ctx: Context, childId: string): Agent | undefined {
  const agents = ctx.get('agents') as { get(id: string): Agent | undefined } | undefined
  return agents?.get(childId)
}
// … 注释：the live log is `Session.snapshotEvents()`, the 0.1.2-alpha.4 rename of
//    the `Session.events` property …
async function threadLogEvents(ctx, childId) {
  const agent = liveThreadAgent(ctx, childId)
  if (agent !== undefined) return agent.session.snapshotEvents()
  const persistence = ctx.get('sessionPersistence')
  …readPersistedSession(persistence, childId)…
}
```

宿主侧签名（`/tmp/dsh-asar/out/dsh/node_modules/@deepseek-ai/dsh-session/lib/index.js` **L1376**）：

```js
snapshotEvents(fromSeq = SessionLogOffset(0), toSeqExclusive = this.seq) { … }
```

- 返回 `Object.freeze([...this.log])`，元素形状 = `{ type, seq, time, data }`（**没有 `ignorable` 时也就不带**；见 §3.3）。
- **注意**：该方法的 JSDoc 在宿主里带 `@deprecated`（L1366-1375，指向 *deprecate-synchronous-session-event-reads* 的架构笔记），
  但**已发布的官方三方插件 better-sidebar 0.22.1 仍在用**，且它是「活会话的唯一最新读法」。
  → 用法：**活会话优先 `snapshotEvents()`，冷会话走 persistence**，与 better-sidebar 完全一致。
  这是一条 ❓**未验证**：宿主未来版本可能移除 `snapshotEvents()`；届时降级到 persistence 即可（我们的代码已把 persistence 作为同等的第二通道，而非"兜底"）。

### 3.2 冷会话（durable）

`dsh-session-persistence` Service 契约（`/tmp/dsh-asar/out/dsh/node_modules/@deepseek-ai/dsh-session-persistence/lib/index.js` L247-268）：

```ts
abstract open(id: SessionId, access: SessionAccess, options?): Promise<SessionHandle>
abstract stat(id, options?): Promise<SessionPersistenceSnapshot | undefined>
abstract list(options?): Promise<readonly SessionPersistenceSnapshot[]>
```

句柄形状（一手镜像 `dsh-better-sidebar/src/context-types.ts` **L473-500** 的 `SidebarSessionPersistenceService` / `SidebarSessionHandle`）：

```ts
open(sessionId, access: 'read' | 'write'): Promise<{
  readonly header: { cwd?: string; agentPreset?: string } & Record<string, unknown>
  readonly inheritedEventCount?: number
  read(offset?: number, length?: number): Promise<{ events: readonly SidebarSessionEvent[] }>
  close(): Promise<void>
}>
```

`SidebarSessionEvent`（`context-types.ts` **L161-166**）= `{ type: string; seq: number; time: number; data: Record<string, unknown> }`。

JSONL 后端实现（`.../dsh-session-persistence-jsonl/lib/index.js` **L62**）`async read(offset = 0, length = MAX_SAFE_INTEGER, options)`。

**一手读法样板**（`dsh-better-sidebar/src/session-store.ts` **L30-45**，我照抄这个形状）：

```ts
const handle = await persistence.open(sessionId, 'read')
try { const { events } = await handle.read() ; … } finally { await handle.close() }
```

### 3.3 落盘格式

`~/.dsh/sessions/<cwd-slug>/<sessionId>/session.v4.jsonl.zstd`，zstd **多帧**追加。
- ⚠️ Node 24/22 的 `zlib.zstdDecompressSync()` **只解开第一帧**（实测返回 222 B），**不能用**。
- `zstd -d -c`（本机 `/Users/lzx/miniconda3/bin/zstd`）可正确解出全量（实测 Lead 会话 618 行 @00:13，809 行 @00:22 —— 日志在持续增长）。
- 日志首行是 header：`{"type":"session","version":4,"id":…,"createdAt":…,"cwd":…,"parentSession":…,"isSeeded":false,"origin":"subagent","delegationDepth":1,"agentPreset":"cordis"}`（teammate）；
  Lead 的 header 无 `parentSession`、`delegationDepth":0`、`agentPreset":"standard"`。
- `SessionHandle.header` 就是这个 header 对象 → **`parentSession` 可用于向上找 Lead**（§5）。
- ⚠️ **实测踩到的坑（已修）**：**header 这一条事件是「扁平」的，没有 `data` 包装** ——
  它的 `id` / `createdAt` / `cwd` / `parentSession` 直接挂在事件根上（逐字见 §4.3 的实测行）。
  其余所有事件（`team/*`、`step/*`、`tool/*`…）才包在 `data` 里。
  → `fold.ts` 对 `type === 'session'` **同时接受两种拼法**（根字段 ∪ `data`），
    否则 `sessionCreatedAt` 永远读不到（这正是我第一版跑出来的 bug，被 dev-verify 抓住）。

### 3.4 头部事件的 `seq`

header 行**没有 `seq` 字段**（逐字：`{"type":"session","version":4,"id":…}`）。
→ `fold.ts` 在 `seq` 缺失时以**数组下标**代位，保证任何输入都可稳定排序。

---

## 4. 任务看板事件：**有**，叫 `team/task`

### 4.1 brief §3.4 的“❓/没有 team/*”已被推翻

实测（§1 的输出）：Lead 会话 618 行里 **`team/task` 11 条、`team/member` 12 条**（verify 独立复核：11 / 12，一致）。
teammate 日志里 0 条 —— brief 当时看的是 teammate 会话（或团队建立之前的快照），故结论过时。

事件名在宿主的事件词表里是**一等公民**：
`/tmp/dsh-asar/out/dsh/node_modules/@deepseek-ai/dsh-session/lib/types/known-event-types.js` **L63-66**：

```js
'team/member',
'team/message/delivered',
'team/message/queued',
'team/task',
```

### 4.2 谁写的、写去哪

`/tmp/dsh-asar/out/dsh/node_modules/@deepseek-ai/dsh-experimental-agent-team/lib/types/journal.js` **L53-61**：

```js
async appendAndFlush(root, type, data) {
    const append = root.session.append.bind(root.session);
    append(type, data);
    await this.ctx.sessions.flush(root.session);   // 立刻 flush → 冷读也能立刻看到
    this.onCommit(root);
}
```

即：**事件写进 Lead 自己的 Session 日志**，且 **append 后立刻 flush**（`ctx.sessions.flush`）。
—— 这一点很重要：`sessionPersistence.open(root,'read')` 在团队刚动过看板之后就能读到，不必等进程退出。

挂载点：`.../dsh-experimental-agent-team-profile/cordis.patch.yml` **L11-18**：

```yaml
- insert:
    - id: agent-team
      name: '@deepseek-ai/dsh-experimental-agent-team'
      config: { maxMembers: 8, maxTasks: 256, … }
    - id: tool-agent-team
      name: '@deepseek-ai/dsh-experimental-tool-agent-team'
      config: { freshProvider: spawn, forkProvider: fork }
    - id: ui-agent-team
      name: '@deepseek-ai/dsh-experimental-client-ui-agent-team'
```

`.../dsh-experimental-agent-team/lib/types/task-board.js` **L53**（创建）与 **L191**（更新）：

```js
await this.journal.appendAndFlush(root, 'team/task', { version: 2, teamId: TeamId(root.id), task });
```

roster：`.../lib/types/roster.js` **L249 / L394 / L434** → `team/member`。
mailbox：`.../lib/types/mailbox.js` **L122 / L257** → `team/message/queued` / `team/message/delivered`。

### 4.3 逐字形状（Lead 日志实测）

`team/task`（`seq=485 time=1791648711980`）：

```json
{"type":"team/task","seq":485,"time":1791648711980,
 "data":{"version":2,"teamId":"session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99",
         "task":{"id":"task-1","revision":1,"subject":"打包与脚手架：…","description":"Owner: packaging。…",
                 "status":"pending","blockedBy":[],"writeScopes":["package.json","scripts",…]}}}
```

`team/member`（`seq=512 time=1791648739342` → 随后同 id 一条 `phase:"active"`）：

```json
{"type":"team/member","seq":512,"time":1791648739342,
 "data":{"version":2,"teamId":"session-4d51254b-…",
         "member":{"id":"66b9735d-8df4-44df-9d74-b4083057e02f","name":"packaging",
                   "description":"打包与脚手架：构建产物形状、manifest、安装验证",
                   "provider":"spawn","context":"fresh","phase":"provisioning"}}}
```

**`member.id` = teammate 的子会话 id**。我逐个核对过 6 个目录名 ↔ 6 个 name，全部一致
（66b9735d=packaging、87589993=host-data、7484fccf=shell、c79a18f7=ui、f828dda6=verify、91410edb=docs）。
→ **泳道 ↔ 会话日志的映射不需要猜**。

`subagent/catalog`（`seq=513 time=1791648744477`）—— 额外的 lane `createdAt` 来源：

```json
{"type":"subagent/catalog","seq":513,
 "data":{"version":0,"childId":"66b9735d-8df4-44df-9d74-b4083057e02f",
         "childCreatedAt":1791648739361,"mode":"continuable","label":"打包与脚手架：…"}}
```

### 4.4 `team/task` 没有 action 字段 —— 必须推导

`data.task` 的 key 集合实测（verify + 我各自复核）**只有 7 个**：
`blockedBy, description, id, revision, status, subject, writeScopes`（有 owner 时多一个 `ownerId`）。
**没有** `action`、**没有** `ownerName`、**没有** `ready`、**没有** `writeScopeWarnings`。

- `ownerName` / `ready` / `writeScopeWarnings` 是**投影侧派生**的：
  `.../lib/types/task-view.js` **L30-56** `projectTaskView()`，其中
  **L31-35**：`task.ownerId === brandString(state.id) ? 'lead' : state.members.find(m => m.id === task.ownerId)?.name`
  → **Lead 拥有的任务，其 `ownerName` 就是字面量 `'lead'`**。
- `revision` 单调递增、每次变更 +1（`task-board.js` L183-186 `revision: current.revision + 1`；
  `projection.js` L212-217 强制 `rev1 起始` + `连续 +1`，否则整条投影 `failure`）。
  → **同一任务的 `team/task` 序列 = 可回放的完整状态机**。

`status` 取值域（`task-board.js` create/update）：`pending | in_progress | completed | deleted`，与 contract 的 `TaskStatus` 完全一致。

**action 推导规则（我采用，已在 `src/host/fold.ts` 实现并写进文件头注释）**：

| 条件 | action |
|---|---|
| 该 task 在本日志中的**第一条**且 `revision === 1` | `created` |
| 第一条但 `revision > 1`（日志从中间开始）→ 按自身 status：`in_progress`→`claimed`；`completed`→`completed`；其余→`updated` | 同上 |
| `prev.status !== 'completed' && status === 'completed'` | `completed` |
| `prev.status === 'completed' && status !== 'completed'` | `reopened` |
| `prev.status !== 'in_progress' && status === 'in_progress'` | `claimed` |
| 其余（`release`/`reassign` 回 `pending`、`edit`、`set_dependencies`、`delete`） | `updated` |

CLI 侧的一手对照（`.../dsh-experimental-tool-agent-team/lib/index.js` **L459-519**）确认 `action` 枚举 =
`claim | release | edit | set_dependencies | complete | reopen | reassign | delete`，
而 `status` 只在这几个里变：`claim`→in_progress、`release`→pending、`complete`→completed、`reopen`→pending、`reassign`→in_progress/pending。

### 4.5 时间锚点：落在 **brief §3.4 第 1 级**

- **第 1 级（采用为主）**：Lead 日志里的 `team/task` 事件，`time` 即 epoch ms。
  实测 task-1：`rev1 pending @1791648711980` → `rev2 in_progress @1791648758846`；
  task-2：`rev1 @1791648711995` → `rev2 in_progress @1791648759111`（= 我 `team_task_update claim` 的结果）。
- **第 2 级（仅兜底 + 归属）**：`tool/call` 扫描。工具名一手出处
  `.../dsh-experimental-tool-agent-team/lib/index.js` **L367**（`team_task_create`）、**L459**（`team_task_update`），
  另外还有 `team_task_list`(L402)、`team_task_get`(L446)。
  `tool/call` 的 `data` 形状实测：`{turn, step, callId, name, arguments}`，**`arguments` 是 JSON 字符串**。
  实测我自己的日志：`seq=23 time=1791648759030 name=team_task_update arguments={"task_id":"task-2","expected_revision":1,"action":"claim"}`。
- **第 3 级（`history: []`）**：日志完全读不到时。

**因此已知限制**：完成/重开（`complete`/`reopen`）的 `team/task` 事件在**本机当前样本里还不存在**
（全队 6 个任务此刻都只有 `pending → in_progress`）。它们的形状由
`task-board.js` L141-149 的 `case 'complete'` / `case 'reopen'` 代码**保证**是同一个
`appendAndFlush(root,'team/task',{version:2,teamId,task})`，只是 `status` 不同 → 我的推导规则覆盖，
但**没有真实事件样本**：❓**未验证**（verify 会补构造样本单测）。

### 4.6 归属：`expected_revision` 精确匹配

`team_task_update` 的 `expected_revision` 是 CAS 前置条件（`task-board.js` L97-104：
`current.revision !== request.expectedRevision` 直接抛 `TEAM_TASK_STALE_REVISION`）。
所以「产生 revision R 的那次调用」**唯一地**满足 `expected_revision === R - 1 && task_id === id`。
→ 把每个会话日志里的 `team_task_update` 调用收上来，就能把每条 `team/task` 事件归属到**真正动手的那个 teammate**。

实测校验：我在 `host-data` 会话 `seq=23 time=1791648759030` 的 claim（`task-2`, `expected_revision=1`）
↔ Lead 日志 `seq=525 time=1791648759111` 的 `task-2 revision 2`，**相差 81 ms**，一一对应。

`team_task_create` **没有** `task_id` 参数（一手 schema：`.../lib/index.js` L367-391，只有
`subject / description / blocked_by / write_scopes`），所以 create 的归属只能按 **`subject` 文本匹配**，
属 best-effort（详见 `fold.ts` 的 `foldToolCallTransitions` 注释）。

---

## 5. team root 解析

优先级（`src/host/timeline.ts` 已实现）：

1. **`ctx.agentTeams.tryMembership(agent)`**（一手签名见 cordis_inspect 与
   `.../dsh-experimental-agent-team/lib/index.js` L51x）→ `{ root, id, role, name }`。
   要求 `agent` 必须是 `ctx.agents.get(id)` 返回的**同一个实例**：
   `.../lib/types/roster.js` **L62-66** 先做 `this.ctx.agents.get(agent.id) !== agent → undefined` 的身份校验。
   → 必须 `ctx.get('agents')!.get(sessionId)`，不能自己造对象。
2. **沿 header 的 `parentSession` 向上走**（活会话 `agent.session.header`，冷会话 `handle.header`），
   直到没有 `parentSession`。实测 teammate header 带 `parentSession` 且指向 Lead，Lead header 不带（§3.3）。
3. 都没有 → 认定 `sessionId` 自己就是 root（隐式 root team；包 README 明确这是正常形态）。

`agentTeams` 缺席时：root = 上述 2/3 的结果，roster 退化为「root + 日志里 `team/member` 事件 ∪ `subagent/catalog`」，
任务表为空，`source` = `live` 或 `partial`，`notes` 写明原因。

---

## 6. 我实际用到的宿主 API 白名单（全部来自上文的行号）

| 调用 | 形状 | 出处 |
|---|---|---|
| `ctx.get('agents')` | `{ get(id): Agent \| undefined; list(): Agent[] }` | cordis_inspect Service 目录 + `roster.js` L62 |
| `agent.session.snapshotEvents()` | `readonly {type,seq,time,data}[]` | `dsh-session/lib/index.js` L1376 |
| `agent.session.header` | `{ cwd?, parentSession?, agentPreset?, … }` | `roster.js` L62；实测 header |
| `agent.status` / `agent.options.model` | `'running' \| …` / `string \| undefined` | `roster.js` L449-451 / L113 |
| `ctx.get('sessionPersistence').open(id,'read')` | `→ handle{header, inheritedEventCount?, read(), close()}` | `context-types.ts` L473-500 |
| `ctx.get('agentTeams')` | `tryMembership / listMembers / listTasks` | Service 目录 + `lib/index.js` L1791-1801 |
| `ctx.get('agentTeams').listMembers(caller)` 行形状 | `{id,name,role,status,description?,provider?,context?,model?,diagnostics[]}` | `roster.js` L104-134 |
| `ctx.get('agentTeams').listTasks(caller)` 行形状 | `{id,revision,subject,description,status,blockedBy,writeScopes,ownerName?,ready,writeScopeWarnings[]}` | `task-view.js` L44-55 |
| `ctx.get('webServer').register(...)` | 已在 `src/host/index.ts`（Lead 完成） | cordis_inspect Service 目录 |

`listMembers` / `listTasks` 的 caller **必须是 team member 的精确活 Agent**（`membership(caller)` → `tryMembership`），
非成员会抛 `TEAM_NOT_MEMBER`。所以我在 `tryMembership` 成功之后才调用它们，并把调用包在 try/catch 里。

---

## 7. 未验证 / 存疑（❓，**不要当事实用**）

1. **`complete` / `reopen` 的真实 `team/task` 事件样本** —— 本机此刻还没有任务完成过，**没有真实样本**。
   但 `deriveTaskAction()` 是纯函数，且 `foldTeamEvents` 的完整生命周期已用**构造事件**跑通并通过断言（§9 末段），
   见 `src/host/dev-verify.mts` 的 `the complete/reopen lifecycle folds from raw team/task events`。
   仍待真实事件出现后复核一次。
2. **`agentTeams.listMembers/listTasks` 在 web profile 上的真实返回** —— 我没有在宿主进程里执行过它们
   （只能在插件内跑）。间接证据：`team/*` 事件正在被写、Service 目录里有 `agentTeams`、profile 挂载了 agent-team 三个包。
   → 首次真机冒烟时验证。**注意**：即便它们抛错，`timeline.ts` 也只写 `notes` + `failure`，任务表退回日志路径。
3. **`Session.snapshotEvents()` 的 `@deprecated` 是否会变成移除** —— 未验证；代码已把 persistence 作为同等级第二通道。
4. **`team/message/queued|delivered` 能否用于「活动带」** —— contract 没有对应字段，
   本次**完全没有使用**（既没进 TimelineResponse，也没进 notes）。是否值得扩展契约 → 需要 Lead 决策。
5. **面板长时间轮询的读放大** —— 每次请求要读 1 + N 个会话日志（N ≤ 8）。
   我在 `session-log.ts` 里加了 **1.5 s TTL + 64 条上限**的结果缓存兜底，
   但**没有实测过端到端耗时**（需要真机挂载后才能量）。
6. **`turn/end` 很少出现**（Lead 日志实测 `turn/start` 1 条、`turn/end` **0 条**）→ 进行中的 turn span 会长期
   `end: null`。这是**如实反映**（会话没结束），不是 bug；UI 侧按「延伸到 now」渲染。
7. **`hasHistory` 的语义** —— contract 只写「True when spans were read from the session log; false = live/empty」。
   我取**「该 lane 的日志读到了、且真的折出了至少一个 span」**：`fold !== undefined && spans.length > 0`。
   即「日志可读但零活动」→ `false`（契约里 "live/**empty**" 那一侧）。若 ui 想区分「读到日志但为空」与「日志读不到」，
   需要加字段 → **需要 Lead 决策**（契约冻结，我没有改）。
8. **非 `claim` 动作的归属** —— `expected_revision` 匹配与 action 无关，理论上同样精确，
   但**只有 `claim` 有真实样本**（§9 已验证 6/6），其余待出现真实 `complete`/`reopen` 后复核。

**已被本文件 §9 实测消除的 ❓**（原先列在这里，现已不成立）：

- 「折叠对输入顺序敏感吗？」→ 随机排列同一份真实日志，spans / task history / tool calls **逐字节一致**。
- 「乱序 / 重复 / 回退的 `team/task` 会不会污染状态？」→ 不会，被跳过并计数（`rewoundTransitions`）。
- 「恶意 payload 会抛异常吗？」→ 不会，全部降级为空结果。

---

## 8. 与 brief 的差异（请 Lead 更新 `docs/TEAM-BRIEF.md`）

| brief 原文 | 实测结论 |
|---|---|
| §3.3 「`sessionPersistence` 是否存在于本机 ❓」 | **存在**，挂载点 `dsh-base/cordis.patch.yml` L130-133；且 profile 里已装的 better-sidebar 正在用它 |
| §3.4 「本会话日志里**没有**任何 `team/*` 类型」 | **过时**。Lead 会话日志里有 `team/task` 11 条、`team/member` 12 条（正文 §4.1） |
| §3.4 「工具名形如 `team_task_create`/`team_task_update`，❓待验证确切名字」 | 确切名字：`team_task_create` / `team_task_update` / `team_task_get` / `team_task_list`（§4.5） |
| §3.4 三级优先级 | 实际可稳定落在**第 1 级**；第 2 级降级为兜底 + 归属 |

---

## 9. 折叠逻辑端到端实测（真实日志，不是构造数据）

脚本：`/Users/lzx/Documents/GitHub/dsh-task-gantt/src/host/dev-verify.mts`（**手工**跑，不进单测；
单测不能依赖本机日志）。命令：

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
node --experimental-strip-types src/host/dev-verify.mts
# 换一个工作区：node --experimental-strip-types src/host/dev-verify.mts --Users-lzx-Documents-xxx--
```

**2026-10-11 00:24 实测输出（节选，逐字）**：

```
sessions in --Users-lzx-Documents-GitHub-dsh-task-gantt--: 7
=== lead session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99: 809 events
spans: 128 diagnostics: {"events":809,"malformed":0,"undated":1,"orphanCloses":0,"openSpans":2,"rewoundTransitions":0}
sessionCreatedAt: 1791647755015 parent: undefined
  task-1 rev2 in_progress ownerId=66b9735d-… hist=created@1791648711980 -> claimed@1791648758846
  task-2 rev2 in_progress ownerId=87589993-… hist=created@1791648711995 -> claimed@1791648759111
  task-3 rev2 in_progress ownerId=7484fccf-… hist=created@1791648720436 -> claimed@1791649054818
  task-4 rev2 in_progress ownerId=c79a18f7-… hist=created@1791648720450 -> claimed@1791648825263
  task-5 rev2 in_progress ownerId=f828dda6-… hist=created@1791648729826 -> claimed@1791648815077
  task-6 rev2 in_progress ownerId=91410edb-… hist=created@1791648729839 -> claimed@1791648814605
  member packaging id=66b9735d-… phase=active createdAt=1791648739361 firstSeen=1791648739342
  member host-data id=87589993-… phase=active createdAt=1791648745081 firstSeen=1791648745059
  member shell    id=7484fccf-… phase=active createdAt=1791648763119 firstSeen=1791648763058
  member ui       id=c79a18f7-… phase=active createdAt=1791648772522 firstSeen=1791648772502
  member verify   id=f828dda6-… phase=active createdAt=1791648794141 firstSeen=1791648794123
  member docs     id=91410edb-… phase=active createdAt=1791648803159 firstSeen=1791648803122
ok  : lead header createdAt read from the FLAT header event
ok  : lead header has no parentSession
ok  : every folded transition carries a real epoch-ms time
ok  : transitions are ascending in time
ok  : no span has a negative length
ok  : no span starts at an invented time

tool-call rows across all sessions: 12
  task-1: created@4d51254b-… -> claimed@66b9735d-…   (packaging)
  task-2: created@4d51254b-… -> claimed@87589993-…   (host-data)
  task-3: created@4d51254b-… -> claimed@7484fccf-…   (shell)
  task-4: created@4d51254b-… -> claimed@c79a18f7-…   (ui)
  task-5: created@4d51254b-… -> claimed@f828dda6-…   (verify)
  task-6: created@4d51254b-… -> claimed@91410edb-…   (docs)
ok  : at least one task was attributed to the teammate that actually moved it
ok  : equal timestamps + orphans + an unclosed step yield 3 spans
ok  : two orphan closes counted
ok  : the unclosed step stays open (end: null)
ok  : an undated event produces no span (a time is never invented)
ok  : the undated event is counted
ok  : empty input is total, not a throw
ok  : spans are identical after a random permutation of the input
ok  : task history is identical after a random permutation of the input
ok  : the complete/reopen lifecycle folds from raw team/task events
ok  : a duplicated/rewound tail never rewinds the latest snapshot
ok  : both the duplicate and the rewound snapshot are counted
ok  : hostile payloads yield nothing instead of an exception

ALL CHECKS PASSED
```

**结论**：
1. **6/6 任务** 都被准确归属到「真正 claim 它的那个 teammate 会话」——`expected_revision` 精确匹配（§4.6）在真实数据上成立，无歧义。
2. `created` 全部归属 Lead（`team_task_create` 都在 Lead 日志里）——符合预期。
3. Lead 日志 809 条事件折出 **128 个 span**，`orphanCloses: 0`（这份日志恰好配对良好）、
   `openSpans: 2`（进行中的 `step` 与 `turn`）、`undated: 1`（就是那条没有 `time` 的 header 事件 —— 如实计数，不发明）。
4. 6 个 member 的 `createdAt`（来自 `subagent/catalog.childCreatedAt`）都比 `firstSeenAt`（`team/member` provisioning）
   早 17-40 ms —— 两个真实时间锚点，可任选，实现取更精确的 `childCreatedAt`。

---

## 10. 质量门实测（**task-2 交付当时**的快照，2026-10-11 00:25；**非最终尺寸**）

> ⚠️ 本节的产物尺寸是**那一次构建**的历史记录。F2 修复后产物又变了，
> **最终已提交产物的权威尺寸**见 §12.2.1（`wc -c` 实测）。

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
pnpm run typecheck      # tsc -p tsconfig.json --noEmit  → 0 error（2026-10-11 00:25）
pnpm run build          # → lib/index.js 37.8kb + lib/client.js 67.5kb（该次构建的尺寸，非最终）
```

`lib/index.js` 产物形状（逐字）：

```js
export {
  apply,
  inject,
  name
};
```

- **零运行时 import**：`grep 'from "@deepseek-ai' lib/index.js` → 无命中。
  原因是 host 半对 `@deepseek-ai/cordis` 只用 `import type`，打包后被完全擦除。
- host 半里含本模块（`grep -c orphanCloses lib/index.js` → 6）。

单独校验 host 半（不依赖 client 半是否编译通过）：

```bash
npx esbuild src/host/index.ts --bundle --format=esm --platform=node \
  --target=node20 --external:'@deepseek-ai/*' --outfile=/tmp/host-half-check.js
# → 退出码 0，产物 38599 字节
#   ⚠️ 这是「单独打包 host 半」的检查产物，**不等于 lib/index.js**（后者还含 client 半的入口与共享代码）。
#   最终 lib/index.js 尺寸见 §12.2.1。
```

---

## 11. 实现完成后补记（时间锚点三级 + 类型契约）

### 11.1 brief §3.4 的三级优先级**全部实现**（不只是第 1 级）

`src/host/timeline.ts` 的 `deriveTimeline()`：

| 级别 | 触发条件 | 实现位置 |
|---|---|---|
| **1** | Lead 日志里有 `team/task` 事件 | `foldTeamEvents()` → `attributeTransitions()`（`timeline.ts` §6） |
| **2** | 某任务的看板记录存在，但日志**没有**它的 `team/task` 事件 | `dateTaskFromToolCalls()`（`timeline.ts` §6b），并把这件事写进 `notes` |
| **3** | 工具调用也匹配不到 | `history: []`（**绝不**用 `now` 顶上） |

第 2 级的实测（`dev-verify.mts`，构造样本）：

```
level-2 history: [{"time":100,"action":"created","sessionId":"lead","revision":1},
                  {"time":200,"action":"claimed","sessionId":"m1","revision":2},
                  {"time":300,"action":"completed","sessionId":"m1","revision":3}]
ok  : a task with no journal event is dated from its tool calls (brief §3.4 level 2)
ok  : an unmatched task gets an empty history, never an invented timestamp
```

- `team_task_update` 的 `time` + `expected_revision` ⇒ 产出的 `revision = expected_revision + 1`（精确）。
- `team_task_create` 没有 task id，只能按 `subject` 匹配，且**只有唯一匹配时才采信**（歧义即拒绝，不猜）。
- 第 1 级**永远优先**：日志事件是看板自己的记录，工具调用只是产生它的那次请求。

### 11.2 类型契约：`RawSessionEvent` 与折叠输入

实测中发现两处类型必须放宽，否则**无法表达真实日志 / 无法测真实容错**（都是本模块自己的问题，已改在我的范围内）：

1. `RawSessionEvent` 增加**索引签名** `readonly [key: string]: unknown` ——
   因为 header 事件是**扁平**的（§3.3），窄类型逼调用方写 `as`。
   verify 独立写出了同一份扁平 header 夹具（`tests/helpers/session-fixtures.ts` L19-37），
   之前的窄类型正是它编译不过的原因。
2. 四个公开折叠函数的入参从 `readonly RawSessionEvent[]` 放宽为 **`readonly unknown[]`** ——
   一个承诺「任何输入都不抛异常」的函数，参数类型就该是 `unknown[]`；
   否则每一处容错测试都得写双重 `as`，类型在说谎。
   `IndexedEvent.event` 同步改为 `unknown`。

### 11.3 质量门快照（2026-10-11 00:30，**非最终**；最终全绿见 §12.2）

```bash
pnpm run build       # ✅ lib/index.js 39.2kb + lib/client.js 69.1kb（该次构建的尺寸，非最终）
pnpm run test        # ✅ 10 files / 249 passed, 1 skipped
node --experimental-strip-types src/host/dev-verify.mts   # ✅ ALL CHECKS PASSED（20 条断言）
pnpm run typecheck   # ⚠️ 3 error，全部在 tests/host-fold.spec.ts（verify 的文件），src/** 0 error
```

`src/**` 单独的严格 typecheck（临时 tsconfig，跑完即删）：

```
$ npx tsc -p src/host/.typecheck-scope.json --noEmit
SRC_ONLY_TYPECHECK_EXIT=0
```

**留给 verify 的 2 处（在 `tests/host-fold.spec.ts`，我不改别人的文件）**：

- **L184-185**：`const events: RawSessionEvent[] = [ … , null, undefined, … ]` + `events as RawSessionEvent[]`。
  既然 `foldActivitySpans` 现在收 `readonly unknown[]`，把这两处标注改成 `unknown[]` 并删掉多余 `as` 即可。
- **L449**：本地 helper `toolCallEvent()` 的形参把 `time` 标成必填，但这一行故意省略 `time`
  （测「无时间的工具调用被丢弃」）。把 helper 的 `time` 改成可选即可。

（这两处我只做定位，实际改动属 verify 范围 —— 已同步给 verify。）

---

## 12. F2 缺陷：`memberIdByName` 在 catalog-先-于-member 时漏索引（verify 报告，已修）

**报告者**：verify（实测复现，非推断）。**性质**：我的 `fold.ts` 真缺陷，低危但真实。

**复现**（`subagent/catalog` 先于 `team/member`）：

```ts
foldTeamEvents([
  subagentCatalogEvent({ seq: 1, time: T,   childId: 'm-1', childCreatedAt: T }),
  teamMemberEvent({ seq: 2, time: T + 5, id: 'm-1', name: 'ui', phase: 'active' }),
], 'session-lead')
// 修前：memberIdByName = []（空）        memberById.get('m-1').name = 'ui'（对）
// 修后：memberIdByName = [['ui','m-1']]  其余不变
```

**根因**：`subagent/catalog` 分支先建了 placeholder 并塞进 `members`/`memberById`；
随后 `team/member` 分支因为 `record !== undefined` 跳过了 `record === undefined` 那个块 ——
而 `memberIdByName.set(name, id)` 当时**只写在那一个块里**，于是永久漏掉。

**影响面**（verify 核对调用链 + 我复核）：`timeline.ts` 的 `laneIdFor()` 用
`memberIdByName.get(ownerName)` 把看板 owner 映射到泳道。只有「**live 投影不可用**
（board-less 降级路径）**且** 该成员在日志里 catalog 先到」这一组合才会显形，
届时该成员的已认领任务会被画到 `unassigned` 泳道。
真实日志上**不可见**：本机 6/6 成员的 `team/member`(provisioning) 都**先于** `subagent/catalog`，
且 live 投影会独立再把 `memberIdByName` 填一遍。

**修法**（`src/host/fold.ts`，`team/member` 分支）：把 `memberIdByName` 的写入
**移出** `record === undefined` 块，改成「只要 name 已知且未映射就补」。
`first-name-wins` 语义保留（同名不重写），不同名（重命名）则两者都留作别名，都能解析。

**回归守护**（两处，互补）：
- verify 的 `tests/host-fold.spec.ts` → `it('indexes a member name when subagent/catalog precedes team/member')`
  —— verify 原先写成 `it.skip` 等我决定；我修完后按其书面授权**只改了 `it.skip` → `it` 这一个 token**（并在其注释里补了「已修」），未动其断言。
- 我的 `src/host/dev-verify.mts` 新增 6 条断言，覆盖 catalog-first / member-first / catalog-only 三种顺序。

### 12.1 顺带确认的两条边界行为（不是 bug，已断言固定）

- **`catalog-only` 成员**（日志只有 `subagent/catalog`，永远没有 `team/member` 行）：
  会产出一个 lane 行，但 `name` 只能是子会话 id、`phase` 只能取 placeholder 的 `'provisioning'`，
  且**不进** `memberIdByName`（名字确实未知，不猜）。
  实测输出：`{"id":"m-1","name":"m-1","phase":"provisioning",…}`。
  真实部署里 live 投影会补齐 name/phase，所以这是**纯降级路径**的表现，已在 `notes` 体系之外由 lane 的 `error`/契约如实反映。
- **重命名**：旧名与新名都会解析到同一 id（互为别名），比「只留首个」更不容易把任务丢进 `unassigned`。

### 12.2 修后质量门（2026-10-11 00:47，全绿）

```bash
pnpm run typecheck   # ✅ exit 0
pnpm run test        # ✅ 14 files / 330 passed, 1 skipped, 0 failed
pnpm run build       # ✅ lib/index.js + lib/client.js
node --experimental-strip-types src/host/dev-verify.mts   # ✅ ALL CHECKS PASSED（27 条断言）
```

#### 12.2.1 最终已提交产物的权威尺寸（`wc -c` 实测）

上面几节里的 `kb` 数字都是**各自那次构建**的 esbuild 报告值；要引用产物大小请以本节为准：

```bash
$ wc -c lib/index.js lib/client.js
   40502 lib/index.js      # 39.6 KiB
   71996 lib/client.js     # 70.3 KiB
  112498 total

$ git show HEAD:lib/index.js | wc -c     # 40502   ← 与工作区逐字节相同
$ git show HEAD:lib/client.js | wc -c    # 71996   ← 与工作区逐字节相同
$ git diff --exit-code -- lib            # exit 0  ← 构建幂等，无未暂存残留
```

> 复核时间 2026-10-11 01:33。`lib/` 是构建产物且已提交，**任何 `src/**` 改动后重新 build 都会让这些数字失效**。
> 同一次复核的其它门：`pnpm run typecheck` exit 0；`pnpm run test` **14 files / 338 passed | 1 skipped**；
> `pnpm run build` exit 0。（测试用例数仍在增长，引用时请连时间一起引。）

---

## 13. `src/host/index.ts` 的注册时序（**非我 task-2 产出**，我复核后接受）

该文件当前的 `ctx.inject(['webServer'], …)` 延迟注册实现**不是我在 task-2 里写的**
（我交付时它是「一次性 `ctx.get('webServer')` 探测」版本）。它落在我的写入范围内，
所以我复核了一遍，结论：**正确，接受**。

- 已挂载 → 同步 `ctx.effect(() => install(ctx), …)`，disposer 归本插件所有；
- 未挂载 → `ctx.inject(['webServer'], scoped => scoped.effect(() => install(scoped), …))`，
  effect 绑在 scoped fiber 上，服务被移除时路由一起回收；
- 无动态 inject API → 只 `ctx.logger.warn`，不抛（非 web profile 得到休眠的 host 半）；
- `inject` 导出仍为 `[]`，避免在无 web server 的 profile 上让插件行永久 pending。

verify 的 `tests/host-mount.spec.ts` 已覆盖四条路径（8/8 绿）。
**注意**：我**没有**独立复测真机 live composition 里 `webServer` 的挂载时机 ——
该结论（apply 时尚未挂载）由改动者给出，我采信但未复验，属 ❓（见 §7）。

---

## 14. `user/message` 的真实形状，以及它**不是**人类发言的多数派（task-7 B）

结论：**`user/message` 事件的 `type` 不能用来判定「人类说了话」**。真正的判别字段是
`data.source.kind`。

`user/message` 的 `data` 键**固定为 4 个**：`content` / `source` / `role` / `id` ——
**没有 `turn`**（task-7 描述里那句「是否带 turn」的答案是：不带；`turn` 只出现在
`turn/start` 的 `data.turn` 里）。

Lead 会话 `session-4d51254b`（3486 条事件）实测 `user/message` 按 `source.kind` 分布：

| `source.kind` | 条数 | 是不是人 |
|---|---|---|
| `user` | **11** | ✅ 是 |
| `time-context` | 19 | ❌ 运行时注入 |
| `team-message` | 23 | ❌ 队友消息的投递 |
| `subagent-settled` | 21 | ❌ 子会话结算 |
| `tool-jobs` | 6 | ❌ 工具作业 |
| `agent-instructions` / `runtime-context` / `schedule` | 各 1 | ❌ |

同一条日志里 `user/message` 共 **83** 条，其中**只有 11 条**是人类。
若不按 `source.kind` 过滤，甘特图上会凭空多出 72 个「你说的话」——这正是
「禁止发明」要挡住的那类错误。

一个 teammate 会话（`66b9735d`）同样成立：17 条 `user/message`，`user` 只有 1 条。

**实现**：`foldMessageRecords` 只接受 `source.kind === 'user'`，其余计入
`diagnostics.injectedUserMessages` 并写进 `notes`（不静默丢弃）。

## 15. 消息 span：配对规则、归属规则、以及一处真缺陷（task-7 A/C）

### 15.1 配对（`queued` ↔ `delivered`）

- `team/message/queued` 带 `message.{id, senderId, senderName, targetId, content[]}`；
- `team/message/delivered` **只有** `{messageId, targetId}` —— 没有 sender。

Lead 会话实测：`queued` 57 条、`delivered` 57 条，**按 `messageId` 配对后
`unpairedDeliveries = 0`**（57/57 全配上）。配对是按 id 查表，**不是**按相邻位置或时间接近度。
若某个 delivery 的 queue 不在可读窗口内，仍然发这条 span，但**不设 sender**，
并把 `unpairedDeliveries` 计入 `notes` —— 日志没说谁发的，插件就不说。

### 15.2 归属（谁该被画在谁的泳道上）

**所有** `team/message/*` 事件都写在 **Lead 的日志**里，无论发送者是谁。因此
**不能**按「从哪个日志读到的」来决定归属，必须按 payload 的 `senderId` 解析到
roster。实测归属正确：

```
16:14:08  from=91410edb…/docs   → 66b9735d…/packaging
16:15:46  from=…4d51254b/lead   → 66b9735d…/packaging
16:16:18  from=f828dda6…/verify → 87589993…/host-data
16:22:45  from=7484fccf…/shell  → c79a18f7…/ui
```

用户 prompt 则归到**承载它的那条日志**的泳道（Lead 的日志 → `lead` 泳道），
`from` 固定为 `{ kind: 'user', id: 'user', name: 'you' }`。

### 15.3 一处真缺陷：日志缓存让「已停止」判定变陈旧

`src/host/session-log.ts` 原本把一份读到的日志 **memo 1.5 秒**
（`CACHE_TTL_MS = 1500`，`CACHE_MAX_ENTRIES = 64`）。这在实测里直接表现为
**同一个 session 的第二次请求拿到上一份快照**：

```
第一次请求（日志仍开着）→ 缓存
1.5 秒内第二次请求      → 命中缓存 → 仍然报「全部已关闭」→ live=false
```

也就是说：用户刚发一条新 prompt，面板可能**停在冻结态**直到 memo 过期。
健壮性探针最初就是这样误报的（案例 3 明明是 closed 日志却读到 open 日志）。

**已修**：删掉跨请求缓存，改为**每次请求都真读**（同一请求内 `timeline.ts`
本来就对每个 lane 只 fold 一次，没有重复读）。`clearSessionLogCache()` 保留为
空实现，仅为既有测试调用点保持编译。

修复后同一组探针全绿（4 个场景）：

```
ok: own log mid-step => live (live=true, end=null)
ok: running teammate agent => live (live=true, end=null, 且该 teammate 有独立泳道)
ok: closed log => not live (frozen at the last event)
ok: cold teammate log with an open span => not live（冷日志的未闭合 step 是历史，不是「在跑」）
```

### 15.4 停止判定（task-7 C）——只用事件证据

```
live = (任一泳道的 agent 正在 running)  OR  (被请求的那个会话自身仍有 open span)
```

- `ctx.agents.get(id)?.status === 'running'`：**已注册**会话的权威答案；
- **冷会话**（`ctx.agents.get()` 返回 undefined）里未闭合的 span 是**历史**，不是证据：
  实测真实日志里 4 个已结束的 teammate 都以未闭合 step 结尾，若把它们当成「在跑」，
  死去团队的图表会永远向前爬；
- 冻结时 `range.end = 最后一个被观测到的事件时间`，**不是** `generatedAt` —— 右边缘
  仍然落在一个真实事件上，不需要发明任何时间戳。

同时给 `ctx.agents.list()` 加了最后一道 roster 兜底：**有 live agent 但日志里没有
`team/member` 记录**的 teammate 现在也能拿到泳道（否则它的 span 与消息全部消失）。
只接受 `session.header.parentSession === team root` 的子会话，避免把无关 agent 画成队友。

## 15.5 真缺陷：**空的 live 日志会遮蔽磁盘日志**（本轮实测发现并修复）

`readSessionLog` 的通道选择原本是：

```ts
const live = readLive(ctx, sessionId)
if (live.ok) return live          // ← 这里
const persisted = await readPersisted(ctx, sessionId)
```

而 `readLive` 只要拿到一个**数组**就返回 `ok: true` —— **包括空数组**。于是
「会话已注册、但历史还没回放进内存」这种情况（`snapshotEvents()` 返回 `[]`）
会被判成"读到了日志"，磁盘回退**永远不会执行**。

**实测复现**（真实形状的日志放磁盘、live 通道返回 `[]`）：

```
source       : log      ← 谎报：说数据来自会话日志
lead spans   : 0
lead messages: 0
observed range: 1791734874993 -> 1791734874993
```

即：**面板画空图，却声称 `source: 'log'`**。这比"慢"严重得多 —— 它同时犯了
本插件最忌讳的两件事（数据丢失 + 来源谎报）。

**已修**：
- `readLive` 对空数组返回 `{ ok: false, empty: true, reason: '…is empty' }`，
  新增 `SessionLogFailure.empty` 标记「形状正确但为空」；
- `readSessionLog` 因此会继续走磁盘通道；
- 若**两条通道都为空**（真正的新会话），返回**成功的空读**，这样全新会话不会被
  误报成降级的 `partial`，`source` 仍是 `log`。

**修复后同一复现**：`lead spans: 2`、`lead messages: 2`、range 落在真实事件区间。

**为什么之前没被发现**：单元测试与我的探针都用「live 与磁盘返回同一份数据」的假 ctx
（`snapshotEvents: () => logs[id]`），于是 `live.ok` 为真且**非空**，这条路径根本走不到。
暴露它的方式是**故意让两条通道不一致**（live 空、磁盘有）—— 记在这里，作为
「假 ctx 的通道一致性会掩盖分支」的教训。

**遗留 ❓**：真实宿主里「live 通道返回空数组」的实际发生率未测（本机没有这种会话样本）。
修复的价值在于：无论它多罕见，都不该静默丢数据。

## 16. 泳道配色令牌（task-7 D）——全部实测存在

host 只给**令牌名**，色值由客户端 `var(...)` 解析。在**运行中的桌面 app**
（DSH 0.2.0-rc.2 + `dsh-better-sidebar@0.25.0`）里读真实样式表验证：这些令牌
**定义在 `body` 选择器**上（该处共定义 107 个 `--dsw-alias-*`），且都能解析出真实颜色：

| 令牌 | light 皮肤解析值 |
|---|---|
| `--dsw-alias-state-business-primary` | `rgb(65, 118, 230)` |
| `--dsw-alias-state-success-primary` | `rgb(34, 197, 94)` |
| `--dsw-alias-state-warn-primary` | `rgb(245, 158, 11)` |
| `--dsw-alias-state-error-primary` | `rgb(236, 19, 19)` |
| `--dsw-alias-state-idle-primary` | `rgb(212, 212, 212)` |
| `--dsw-alias-label-primary-inverted`（`on`） | `rgb(255, 255, 255)` |

- `on` 一律用 `--dsw-alias-label-primary-inverted`：设计系统自己的「填充面之上的文字」
  墨色，better-sidebar 也这么用，不是猜的白。
- **实测不存在、因此没用**：`--dsw-alias-label-invert`、`--dsw-alias-label-on-brand`。
- verify 的 F8 曾是**险些误报**：`--dsw-alias-state-idle-primary` 与
  `--dsw-alias-label-primary-inverted` 在 better-sidebar 产物里一次都不出现。
  查定义源后确认两者都真：定义源是宿主 `@deepseek-ai/dsh-client-ui-theme`
  （app.asar 内，408 个 `--(dsw|ds)-*` 定义），better-sidebar 只是消费者。
  该 408 名字快照已固化为 `tests/fixtures/dsw-theme-tokens.json`，并有守护断言
  「buildTimeline 发出的每个 lane 色都必须在定义表里」。

### 16.1 为什么是 **5** 个色相，而不是 6 个（我提的第 6 色被 Lead 否掉）

我先提了 `--dsw-alias-onboarding-accent`（实测 `rgb(57, 100, 254)`，确实是与前 5 个不同的
色相），**Lead 核查后驳回，理由成立**：它属 onboarding 流程，主题改版可合法移除，
拿它做 team 身份色等于引入一个可能被撤掉的依赖。Lead 独立扫了 app.asar 里全部
**120** 个 `--dsw-alias-*`（比我的 107 个范围更大），确认没有可用的第 6 个：

- `--dsw-alias-brand-primary` / `--dsw-alias-button-primary-fill` → `rgb(15, 17, 21)` 近黑；
- `--dsw-alias-link` 与 business **同色值**（多一个名字，不多一个色相）；
- `--dsw-alias-state-*-tertiary` → `rgb(228, 237, 253)` 一类极浅底，承载不了白字。

**5 个真实饱和填充就是上限**，注释与本文都按上限写，不拿"表格上看起来不同"的令牌充数。

### 16.2 分配方式从「哈希」改为「按位置」（Lead 拍板，已落地）

旧实现 `PALETTE[stableHash(laneId) % 5]`：**只保证稳定，结构上无法避免碰撞** ——
生日问题下 3 个 id 落 5 槽就有约 0.8 概率撞一对；真实那次 9 泳道只用到 5 个 token，
8 个 teammate 里多对共享同色。用户的原话是「lead 和**各** teammate 都要有一种颜色」，
指的是**同屏内彼此可区分**，哈希做不到。

新规则（`laneColorTokens(laneId, index)`）：

| 泳道 | 颜色 |
|---|---|
| `lead`（下标 0） | 固定 `PALETTE[0]`（任何团队、任何会话都一样） |
| roster 第 *n* 个 teammate | `PALETTE[n]`，到第 5 个之后循环 |
| `unassigned` | 固定 `UNASSIGNED_COLOR_TOKENS`（中性项，不参与轮转） |

**保证**：前 5 条泳道（lead + 4 个 teammate）**必定五色互不相同**。
**已知上限**：**第 5 个 teammate 起颜色开始循环**；同色时靠泳道名 + 客户端的非颜色
冗余（描边/明暗）区分，这部分归 ui。

### 16.3 稳定性措辞（精确版，替换旧的"永远跨会话稳定"）

- **lead 永远同色**；
- **同一 teammate 在 roster 顺序不变时同色**；
- **roster 顺序变化时，teammate 的颜色可能随之改变** —— 这是为换取
  「同屏不撞色」付出的代价，**是有意的取舍**，不是缺陷。

旧实现那句"同一 member id 永远得到同一颜色（跨会话稳定）"**不再成立，已从注释与文档删除**。

**这条取舍的验证缺口**：它只有本文件与 `lane-color.ts` 的注释固定，**没有真机观察**
（verify 的真机冒烟里 roster 顺序没有变化，所以没能触发）。但它**不是待验证的未知行为**：
分配是纯函数 `PALETTE[index % 5]`，语义由 `tests/host-integration.spec.ts` 直测固定，
无需运行时观察即可确定。因此这条**不改判为 ❓**，只是把它记为「设计取舍，无真机样本」。
若将来做真机验证，顺手把「同一 teammate 在不同 roster 顺序下换色」记录一次即可。

### 16.4 读放大代价：**两个量级，分属两条通道**（与 verify 交叉测量后修正）

我最初给的 `18.7 ms`（median）只覆盖**服务路径**，verify 复跑后指出这不是唯一的量。
现在的完整图景是两条通道分别计价，**两者都保留、都署名**：

| 通道 | 测量者 | 每请求耗时 | 说明 |
|---|---|---|---|
| 服务路径（`agents.session.snapshotEvents()`，已在内存的事件对象） | host-data-2 | `20.8 / 19.0 / 18.7 / 18.4 / 18.5 ms`，median **18.7 ms** | 不读盘、不 `JSON.parse` |
| 磁盘冷读（`sessionPersistence.open().read()`，解 1941 帧 + parse 19k 行） | verify | 变体 A median **1010.3 ms** / 变体 B median **985.9 ms** | 分解：解压 ≈31.9 ms·日志、JSON.parse ≈50.4 ms·日志、fold ≈1.6 ms·日志 |

`18.7 ms` vs `≈1.0 s` 相差约 53×，**不是矛盾**：前者是内存对象，后者是「从磁盘解多帧 zstd
再逐行 parse」。`src/` 里除本脚本外没有任何 zstd/读盘代码，所以面板请求正常走前者。

**对「删掉 1.5s 缓存」决策的含义**：删缓存的安全性取决于请求走内存通道。若某次请求落到
磁盘回退通道，那一次就是 ≈1 秒 —— 这是**已知代价**，不是缺陷（面板轮询在秒级，1 秒的
偶发冷读可接受；而陈旧快照会让面板卡在冻结态，是**错误**而不仅是慢）。
❓**仍未验证**：真机「冷启动后第一次打开面板」的耗时（verify 记为 ❓17）。

### 16.5 多帧 zstd：不依赖外部 CLI 的读法（verify 提供，我逐日志验证）

这些日志是 **append-only 多帧 zstd**：Lead 文件 2.79 MB 里 **1941 帧**。
`zlib.zstdDecompressSync(buf)` **只解第一帧且不报错** —— 整文件只得到 222 B / 1 行
（`unzstd -c` 是 3795 行）；流式 `createZstdDecompress` 同样只给 222 B。

`src/host/dev-verify.mts` 原先用 `zstd -d -c`（正确但依赖外部二进制）。现已改为
verify 给的**无需 CLI** 写法：

```js
const parts = []; let off = 0
while (off < raw.byteLength) {
  const r = zstdDecompressSync(raw.subarray(off), { info: true })
  parts.push(r.buffer); const n = r.engine.bytesWritten
  if (!(n > 0)) break
  off += n
}
```

**逐日志验证**：本工作区全部 **15 个**真实日志，该写法与 `zstd -d -c` 得到**完全相同的行数**
（107 / 1207 / 1063 / 994 / 4193 / 563 / 88 / 49 / 749 / 4075 / 2621 / 4 / 280 / 3960 / 4），
mismatches = 0。自检脚本因此不再依赖本机是否装了 `zstd`。
