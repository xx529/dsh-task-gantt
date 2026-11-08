# DSH 0.2.2-rc.1 会话事件契约取证（host 半 · fold.ts / timeline.ts）

> 只读取证报告。审计对象：`dsh-task-gantt` 的 host 半如何读 DSH 0.2.2-rc.1 的会话事件日志。
> 审计方式：本机真实 `~/.dsh/sessions/**/session.v4.jsonl.zstd`（只读）+ 运行中 0.2.2-rc.1 实例的插件只读 API（`POST /dsh-task-gantt/api/timeline`）+ 0.2.2-rc.1 `app.asar` 解包代码。
> 分析脚本全部在 `/tmp/events-audit/`（`01-inventory.mts` … `14-settled-check.mts`、`quick.py`、`peek.py`）；**未修改** `src/**`、`lib/**`、`tests/**`、`package.json`。
> 本文件是本次唯一写入的产物；真实日志里的用户消息正文不摘录，只记事件类型/字段形状/条数/头行模板。

时间基线：2026-11-08T23:05–23:35 +08:00。仓库 HEAD = `2e095be`。审计期间 Lead 正在工作区里并行修改 `src/host/dev-verify.mts`（未提交）；凡引用该文件处，同时给出 **HEAD 行号** 与 **当时工作区行号**，避免行号漂移造成误读。

---

## 0. 结论总表（按严重度）

**三档结论：① 会导致用户可见错误 —— 0 条；② 只影响 dev-verify 门 —— D2/D3/D4；③ 仅内部诊断/可选增强 —— D1/D5/D6/D7/D8。**
面板明确不渲染 host 的 `notes`（`src/client/ui/BoardView.tsx:1611-1618`，注释写明“deliberately NOT rendered”），所以本报告不把 notes 文案算作用户可见缺陷。

| ID | 严重度 | 结论（Defect / 事实） | 证据 | 建议 |
|---|---|---|---|---|
| D2 | **只影响 dev-verify 门** | “每条 record 必须来自 queue”断言在**任何** 0.2.2 日志上必假：0.2.2 只有注入形态，`diagnostics.queued=0` 而 `injectedExchanges>0`。HEAD 上 5/5 工作区 FAIL。 | HEAD `src/host/dev-verify.mts:181-185`；复现输出见 §8.1 | 断言加入 `injectedExchanges - injectedDuplicates`（工作区里 Lead 已改，行 203） |
| D3 | **只影响 dev-verify 门** | “roster row 不得以 session id 为名”断言统计的是**原始 fold 行（含诚实 fallback）**，不是最终泳道名；research 工作区唯一命中是 2026-10-13 一个无 label 的一次性子代理。 | HEAD `src/host/dev-verify.mts:590,598-601`；根因见 §5 | 区分 `nameIsFallback` 与“声称有名字却仍等于 id”（工作区已改，行 632） |
| D4 | **只影响 dev-verify 门** | “真实日志里必须有人类提问”是无条件的；没有用过 `ask_user_question` 的工作区（htDot-bridge）必假。属工作区内容差异，不是缺陷。 | HEAD `src/host/dev-verify.mts:663-666`；`questionTotal=0, askCalls=0` | 先数原始 `tool/call`，为 0 则跳过（工作区已改，行 714） |
| D5 | dev-verify 诊断力 | lead 选择器的 `children` 计数实际为 0：`session.id` 被去掉 `session-` 前缀，而 352/353 个 `parentSession` 是 `session-<uuid>` 前缀形式，`===` 永不成立（唯一例外是“父本身是子会话”的 1 条裸 uuid 引用）；分数退化为“team/* 事件数”。 | HEAD `src/host/dev-verify.mts:101,114-129`；header 实测见 §7 | 两侧都归一化后再比；或直接用 header.id |
| D6 | dev-verify 覆盖缺口 | “当前 0.2.2 团队”从未被验到：lead 选择器偏好**历史上最大的团队**（capability-settings 选 10-15 的 `dffb11e4`，而非 11-08 的 `4767a48b`；task-gantt 选 10-10 的 `4d51254b`，而非当前的 `792532d9`）；`buildTimeline` 段的 root 又是“目录序第一个无父会话”，htDot-bridge 里是 `0c5d531f`（lanes=1，空队），断言空转。 | HEAD `:114-129`、`:521-527`；见 §8.1 | 增加 `--root <id>` / `--latest` 选择器；`buildTimeline` 用 `lead.id` |
| D1 | 仅 API/内部文案 | 响应 `notes` 仍写 “DSH 0.2.1's delivery form”。0.2.2 的团队消息**只有**这种注入形式，文案把它说成“0.2.1 的过渡形态”。面板不渲染 notes，只有直接看 API/dev-verify 输出的人会看到。 | `src/host/timeline.ts:1241`；live API notes 原样返回该句 | 改为版本中立措辞（如 “injected `user/message` (DSH 0.2.1+ delivery form)”），并同步 `fold.ts:533-535/736-746/1019-1025` 注释 |
| D7 | 仅内部语义（低） | `fold.ts` 把注入消息的 `queuedAt` 与 `deliveredAt` 都设为同一时刻，注释称“注入即同时投递”。0.2.2 实测不是：`agent/inbox/spliced` 记入 inbox 的时刻（队列）比 `user/message` 的投递时刻早，中位 75 ms、p90 19.3 s、最长 56.7 min。当前 UI 只画瞬时标记，因此不产生错误箭头；但“排队等待”这一段在 0.2.2 是可恢复的。 | `src/host/fold.ts:609-617`；实测见 §9 | 可选：用 `spliced.inserted[].id` 与 `user/message.data.id` 配对回填 `queuedAt`（0.2.2 的 spliced item 带完整 `source`+`id`） |
| D8 | 可选增强（低） | 0.2.2 新增 `subagent/descriptor`（v3，写进**子会话自己的日志**，含 `label`/`mode`/`provider`/`agentModel`），是比父日志 `subagent/catalog.label` 更稳的泳道名来源；当前完全未读。 | §5；代码 `dsh-subagent/lib/index.js:1806` | 可选：泳道名链在 catalog.label 缺失时补 descriptor.label |
| — | **无（用户可见）** | **未发现** 0.2.2 真实团队日志上的用户可见缺陷：消息箭头 from/to 全部落在真实泳道（0 个 undefined、0 个 fallback `system`）、泳道名无 id 化、任务历史/计数正常、无假箭头。 | §2/§4/§6/§9 的 live API 实测 | 保留 overlay 断言作为回归锁 |

> 双份事实边界：D2/D3/D4 在 HEAD 上 FAIL，但 23:25 的工作区版本已修（23:29 复测 5/5 工作区 **ALL CHECKS PASSED**，见 §8.2）。本报告的“失效”指的是 HEAD 语义，不是当前工作区。工作区仍在被并行修改，行号可能继续漂移。

---

## 1. 数据范围与方法

**Fact F0-1** 运行版本 = `0.2.2-rc.1`：

```bash
$ cat '/Applications/DeepSeek Harness.app/Contents/Resources/app.asar/dsh/package.json'  # 用 asar 读取器
{"name":"@deepseek-ai/dsh","version":"0.2.2-rc.1",…}
```

0.2.2 包体已解包到 `/tmp/dsh-asar-new/dsh/node_modules/@deepseek-ai/`（332 个包，`dsh/package.json` 同为 0.2.2-rc.1）。*注意：`/tmp/dsh022/` 在审计期间被并行会话移走，本报告引用的 0.2.2 代码行号取自 `/tmp/dsh-asar-new`；该目录是临时产物，权威来源是 `app.asar` 本身。*

**Fact F0-2** 日志盘点（脚本 `/tmp/events-audit/01-inventory.mts` + `10-discovery.py`）：

```bash
$ find ~/.dsh/sessions -name 'session.v4.jsonl.zstd' | wc -l      # 769
$ find ~/.dsh/sessions -name 'session.jsonl.zstd'    | wc -l      # 7
$ ls ~/.dsh/sessions | wc -l                                       # 39 个工作区 slug
$ find ~/.dsh/sessions -type f | sed 's#.*/##' | sort | uniq -c
 764 session.lock + session.v4.jsonl.zstd
   5 session.jsonl.zstd + session.lock + session.v4.jsonl.zstd
   2 session.jsonl.zstd（仅旧格式，2026-09）
```

- 所有 771 个带日志的会话目录都用多帧 zstd；解压必须逐帧（`dev-verify.mts:54-73` 的循环，或 `zstd -d -c`）。审计期间本机仍在新建会话，采样时刻不同会得到 769/770 个 v4 日志（下文的 header 统计用 770 样本）。
- “0.2.x 追加文件”取 `stat` mtime ≥ `2026-11-04 00:00 +08`：121–122 个文件、约 68 MB（审计期间新会话仍在写入，故数字会缓慢变化）。
- 事件“是否属于 0.2.2 时期”按**事件自身 `time`** ≥ 2026-11-04T00:00+08 判定（文件是 append-only，旧会话被 0.2.2 继续追加）。

**Fact F0-3** 只读旁证渠道：运行中的 DSH 实例把本插件挂在了 `http://127.0.0.1:60392`，`POST /dsh-task-gantt/api/timeline {"sessionId":"…"}` 返回与面板同源的 `TimelineResponse`。本报告所有“live API”数据均是该端点（只读、无副作用）的实测返回。

**Fact F0-4** 隐私处理：文档只记录事件类型计数、字段名集合、头行模板（如 `Team message from <name>:`）与时间戳；不摘录任何用户消息正文。

---

## 2. Q1：团队消息投递形式

### 2.1 0.2.2 已彻底移除 `team/message/*`（写侧）

**Fact F1-1** 全部 769 个 `session.v4` 日志中，`team/message/queued` = **601**、`team/message/delivered` = **601**，分布在 **14** 个日志；**最后一次**出现在 `2026-10-21T19:17:41+08`。此后再无任何一条（脚本 `scan-kinds.py`；输出 `/tmp/events-audit/out/scan-kinds.log`）。

```bash
$ python3 /tmp/events-audit/scan-kinds.py | tail -6
last occurrence per type/kind:
team/message/queued/None     2026-10-21T19:17:41.056+08:00  ~/.dsh/sessions/--Users-lzx-Documents-research--/session-af07a1de-…/session.v4.jsonl.zstd
team/message/delivered/None  2026-10-21T19:17:41.074+08:00  （同上）
```

**Fact F1-2** 同一扫描里旧注入形态 `user/message` + `source.kind='team-message'` 共 **581** 条（56 个日志），最后一次 `2026-10-21T19:17:47+08`。它与 mailbox 事件同时消失，说明二者是同一代投递协议。

**Fact F1-3** 0.2.2 时期（事件时间 ≥ 2026-11-04）的事件普查（`02-era.mts`，122 个追加文件）：

| 事件类型 | < 2026-11-04 | ≥ 2026-11-04 |
|---|---:|---:|
| `team/message/queued` | 0 | **0** |
| `team/message/delivered` | 0 | **0** |
| `user/message` | 382 | 1163 |
| `agent/inbox/spliced` | 328 | 1282 |
| `team/member` | 22 | 64 |
| `team/task` | 56 | 35 |
| `subagent/descriptor` | 0 | **36** |
| `subagent/catalog` | 13 | 35 |
| `subagent/model-selection-policy` | 12 | 84 |
| `system/message` | 39 | 139 |
| `developer/message` | 45 | 44 |
| `request/header` | 69 | 191 |
| `request/context` | 12 | 99 |
| `job/registered` / `job/settled` | 1346 / 1344 | 7160 / 7158 |
| `assistant/attempt` | 49 | 51 |
| `llm/retry` / `llm/retry-started` | 44 / 44 | 38 / 38 |
| `command/run` / `command/done` | 10 / 10 | 21 / 21 |
| `todo/write` | 12 | 28 |
| `workspace/changes` | 42 | 115 |
| `compaction/prune` | 0 | 26 |
| `session/end-seed` | 43 | 102 |

**Inference I1-1** 0.2.2 的 Team 服务**只写** `team/member` 与 `team/task`，团队消息改走 `user/message` 注入 —— 与代码一致：

- 0.2.2 写 journal 的调用点只有 `team/member`：`dsh-experimental-agent-team/lib/index.js:1028,1142,1177`；`team/task`：`:1237,1378`。**没有** `team/message/*` 的写点。
- 团队消息发送路径：`dsh-experimental-agent-team/lib/index.js:1588-1609`（`sendAdmitted`）——
  `content = [{type:'text', text:'Team message from ${membership.name}:'}, ...body]`（`:1593`），
  `source = { kind:'agent-message', form:'relay', senderSessionId: caller.id }`（`:1597-1599`），
  投递给 Lead 用 `root.steer(input)`，投递给 teammate 用 `steerHostSubagentPrompt(...)`（`:1605-1609`）。
  同源代码：`lib/types/index.js:181-187`。
- 旧事件仍在**读侧**兼容：`lib/types/projection.js:129,148,227-234`、`lib/index.js:537,558,630`（session 格式升级与旧日志重放用），旧 source 类型 `TeamMessageSource {kind,teamId,messageId,senderId,senderName}` 仍被声明在 `dsh-api-session-controller/lib/typert.host.js:3972`。

### 2.2 注入 form 与头部模板（全量实测）

**Fact F1-4** 全部日志中 `source.kind ∈ {team-message, agent-message}` 的注入共 **2050** 条（=581+1469），头部归类对 `fold.ts` 的两条正则（`INJECTED_TEAM_HEADER` `fold.ts:551`、`INJECTED_AGENT_HEADER` `fold.ts:559`）**全部命中，0 条 NO-MATCH**（`07-values.mts`）：

```
   581  team-message :: TEAM_HEADER
  1402  agent-message :: TEAM_HEADER
    67  agent-message :: AGENT_HEADER
     0  NO MATCH
```

两种模板的真实来源（0.2.2 代码）：
- `Team message from <name>:` → Team 服务，`dsh-experimental-agent-team/lib/index.js:1593`
- ``Agent <senderId> sent a message: `` → 普通子代理 → 父代理的中继，`dsh-subagent/lib/types/continuation-messages.js:22-31`、`dsh-subagent/lib/index.js:462`

> 头部正则覆盖结论：**无遗漏**。`fold.ts:551` 的正则还覆盖了 0.2.0 的旧模板 `Team message team-message-<id> from X:`（581/581 命中）。

**Fact F1-5** `source` 字段形状按投递代际不同（`07-values.mts` 全量统计）：

| 形态 | 条数 | source 键集合 |
|---|---:|---|
| `team-message`（旧） | 581 | `{kind, teamId, messageId, senderId, senderName}` |
| `agent-message`（0.2.1/0.2.2） | 1469（其中 90 条属 0.2.2 时期） | `{form:'relay', kind, senderSessionId}` —— **无 senderName / 无 senderId / 无 messageId** |

**Inference I1-2** 0.2.2 只发 `agent-message/relay`。因此：
- `senderName` 只能来自头部模板 `Team message from X:`（`fold.ts:620` 的 `parts.senderName` 分支）——团队消息 100% 有名字；`Agent <id> sent a message:` 形态没有名字，需要 roster/泳道反查（实测其中 67 条在**同一日志内**没有 `team/member` 命中，`rosterHit=false`；在真实时间线里这些发送者是子代理，见 §4.3 的 live 结果）。
- `messageId` 在记录里回退为 `user/message.data.id`（`fold.ts:608`），不会与旧 mailbox id 撞车（0.2.2 不再有 mailbox 记录）。

### 2.3 Lead 没有 `team/member` 行时会怎样

**Fact F1-6** 真实 0.2.2 团队里 Lead 日志**有** `team/member`（当前团队：`4` 条 member、`2` 条 catalog，时间 2026-11-08T15:04:36–15:04:38），名字 = `events-auditor` / `sdk-auditor`（§4.2 live 的 3 泳道即由此而来）。
**Fact F1-7** 但仍存在“根日志有注入、无 `team/member`”的历史数据（如 task-gantt 的 `f828dda6`：69 条注入、0 条 member；这是 0.2.1 时代已结束的子会话日志）。此时折叠仍有：
- `from`：`senderName` 来自头部模板 → 有显示名；`senderId=source.senderSessionId` → 有 id。`timeline.ts:434-451` 先按 id→泳道、再按 name→roster；两查不到则 **`{kind:'system', id, name}`**（`from` 永不为 `undefined`）。
- `to`：`timeline.ts:499` 对 `record.injected===true` 用 `fold.sessionId`（日志的拥有者）→ 只要该会话是泳道，就一定有收件泳道。

**Inference I1-3** “Lead 从未有 member 行”不会产生 undefined/空箭头，最坏是把发送者降级为 `system`（显示名仍是真名）。这是诚实降级，不是缺陷。0.2.2 常态下 Lead 日志总有 member 行，所以 `from` 能落回真实泳道。

---

## 3. Q2：注入消息的收件人 & 箭头验收

**Fact F2-1** `foldMessageRecords` 产出的注入记录**全部没有 `targetId`**（0.2.2 注入体里没有收件人字段，收件人 = 承载该事件的日志）。当前团队 root 日志折叠：`records=0, prompts=2, diag={queued:0,…,injectedExchanges:0}`；成员日志各 1 条注入记录。`timeline.ts:496-500` 已经兜底：

```ts
// src/host/timeline.ts:499
const to = record.injected === true ? lookup(fold.sessionId, undefined) : lookup(record.targetId, undefined)
```

**Fact F2-2（验收=通过）** 用运行中插件（真实宿主、真实 0.2.2 日志）逐会话实测，`message` 型 span 的 `from`/`to` 全部解析到真实泳道，`to=undefined` / `from.kind='system'` / `to.kind='system'` 的数量均为 0：

| 抽查对象（session 前缀） | 说明 | lanes | message spans（含双写） | undefined/系统 |
|---|---|---:|---:|---:|
| `cfcb5511` / `be7eac1e`（当前 0.2.2 团队成员） | 面板在 teammate 会话打开，自动上溯 root | 3 | 4 | 0 |
| `session-792532d9`（当前 0.2.2 Lead） | 直接以 Lead root 查询 | 3 | 4 | 0 |
| `session-d4d2e505`（0.2.1 时代团队 Lead，0.2.2 继续追加） | 老日志+新注入混合 | 9 | 130 | 0 |
| `session-af2d2967`（research 0.2.2 团队） | 5 条 relay 消息 + 5 settled | 6 | 10 | 0 |
| `session-4767a48b`（capability-settings 0.2.2 团队） | 2 条 relay | 3 | 4 | 0 |
| `session-06b4e5a6`（OrderCenter 0.2.2 团队） | 2 条 relay | 5 | 4 | 0 |
| `session-56ef6542`（trace-inspect 0.2.2 团队） | 30 条 relay | 6 | 136 | 0 |
| `session-af07a1de`（research 0.2.1 团队，mailbox+注入混合） | 16 注入 + 8 合并去重 | 5 | 32 | 0 |
| `session-5e8b2447`（0.2.2 普通子代理 → 父，Agent 头） | 单子代理泳道 | 2 | 2 | 0 |

当前团队的实际输出（live API，摘录关键字段）：

```
source=log lanes=3 live=true
lane lead          name='lead'           msgs 2
lane cfcb5511-…    name='events-auditor' msgs 1
lane be7eac1e-…    name='sdk-auditor'    msgs 1
message: from={kind:'lead',name:'lead'} to={kind:'teammate',name:'events-auditor'}
message: from={kind:'lead',name:'lead'} to={kind:'teammate',name:'sdk-auditor'}
notes: "2 team/agent message(s) arrived as injected `user/message` events (DSH 0.2.1's delivery form) and are drawn as exchanges"
```

**Inference I2-1** 结论：`targetId` 缺失**不影响 UI 箭头**；`timeline.ts:499` 的兜底是必需且生效的。仅内部诊断面变弱（`MessageFoldDiagnostics` 里 `queued/delivered/unpairedDeliveries` 在 0.2.2 全为 0，只剩 `injectedExchanges` 有意义;见 §8）。

**Inference I2-2** 不建议给注入记录“编造” `targetId`。若要让诊断面恢复可读性，推荐新增字段/计数（例如 `injectedExchanges` 已足够，另加 note），不要往 `targetId` 里塞 `fold.sessionId`，否则会与“mailbox 的 targetId 是 journal 明说的”这一语义混淆。

---

## 4. Q3：`subagent-settled/notice` 等新注入源是否会变成假箭头

**Fact F3-1** 0.2.2 追加文件里，所有非人类 `user/message` 注入的 kind/form 分布（`03-injections.mts`，122 个文件共 1188 条注入）：

```
time-context/snapshot 414   runtime-context/snapshot 186   agent-instructions/instructions 146
agent-message/relay 124     skill-catalog/catalog 96       subagent-settled/notice 90
tool-jobs/notice 46         schedule/- 27                  plugin:dsh-im/notice 17
user-approval/- 15          skill-invocation/instructions 11  shell-command/- 7
compact-checkpoint/- 7      session-reference/recall 2
```

**Fact F3-2** `fold.ts` 只把 `kind ∈ {team-message, agent-message}` 当消息（`fold.ts:542`、`:967`）。实测：
- 含 `subagent-settled` 的日志共 83 个（含其他代际），其中 15 个日志“只有 settled、没有任何 agent/team 消息”，它们的 `injectedExchanges` 全为 **0**，`records` 只来自 mailbox（或 0）→ settled **从未产生 record**。
- 0.2.2 时期的 settled 注入：122 个追加文件里 90 条；4 个 0.2.2 团队根 + 成员日志里分别为 2 / 2 / 5 / 4 条，**0 条**带 `Team message` 头。
- settled 的 source 形状（0.2.2 代码）：`{kind:'subagent-settled', form:'notice', senderSessionId, summary}`（`dsh-subagent/lib/types/continuation-messages.js:105-115`；`dsh-subagent/lib/index.js:540`），头行模板 `Background subagent <childId> finished …` —— 与两条消息头正则不匹配。

**Fact F3-3** 全量头部归类（见 F1-4）：除 `team-message`/`agent-message` 外，其余 1064 条注入（122 个追加文件）**没有一条**匹配消息头模板。

**Inference I3-1** 假箭头风险 = 0。`subagent-settled`、`tool-jobs`、`time-context` 等只影响 `injectedUserMessages` 计数与 note 文案（“N 条运行时注入未绘制”）。若未来 DSH 给 settled 换成 `agent-message` kind 或 `Team message` 头，才是风险点——建议保留一个“settled 永不折叠”的单元锁。

---

## 5. Q4：子代理事件形状 与 research 的 id-named 泳道根因

### 5.1 三种子代理事件

**Fact F4-1** `subagent/catalog`（0.2.2 时期 35 条 / 11 个日志；全量文件里 36 行样本）：形状与旧版**完全一致** `{childId, childCreatedAt, mode, label, version:0}`（`06-subagent.mts`）。0.2.2 样本中 `label` **36/36 非空**，`mode=continuable`。→ childId→泳道映射仍成立（当前团队两条 catalog 即 events-auditor/sdk-auditor 的名字来源）。

**Fact F4-2** `subagent/descriptor` 是 **0.2.2 新增事件**：0.2.2 时期 36 条 / 36 个会话；< 2026-11-04 为 0 条。形状 v3：

```json
{"type":"subagent/descriptor","data":{"version":3,"mode":"continuable","provider":"spawn",
 "label":"<task name>","agentProvider":"tokfans","agentModel":"deepseek-flash"}}
```

代码：写在**子会话自己的日志**第 0 条（`dsh-subagent/lib/index.js:1806`、`dsh-subagent/lib/types/manager.js:772`）。
**Inference I4-1** 它**没有 childId**，不能单独映射泳道；但它随子会话日志存在且带 `label`，是“父日志 catalog.label 缺失时”的天然兜底名源（当前插件未读，见 D8）。老会话（2026-10-13）的 v3 descriptor 没有 `label`，所以不能靠它救老数据。

**Fact F4-3** `subagent/model-selection-policy` 形状未变 `{allowedModels:[…]}`；0.2.2 时期 84 条。插件不读该事件，无影响。

### 5.2 research 工作区 `still id-named: 1` 的根因

**Fact F4-4** 全机扫描“折叠后 member.name === member.id”的 roster 行（`scan-idnamed.mts`，87 个带 team/member 或 catalog 的日志）：**唯一命中**：

```
slug  --Users-lzx-Documents-research--
log   25f42626-1493-4dbb-8fed-911f19f8910d/session.v4.jsonl.zstd
member id=a58275e8-… name=a58275e8-… fallback=true createdAt=2026-10-13T03:24:31+08
catalog t=2026-10-13T03:24:31 label=null mode=one-shot
dispatch（指向该 child 的 started subagent ack）: 无
子会话自身日志 a58275e8…: 20 events；只有 session/title {source.kind:'fallback'} + subagent/descriptor v3（无 label）
```

**Inference I4-2** 根因链：`subagent/catalog.label` 为空 + 父日志没有 `started subagent` ack（无法用 dispatch description 补名）+ 子会话自己的 `session/title` 是 `fallback` 标题（`fold.ts:1552-1561` 明确丢弃 fallback 标题）→ 无任何可用名字 → fold 给出 `name=childId, nameIsFallback=true`。
- 这是 **2026-10-13（0.2.0/0.2.1 前）的数据**，不是 0.2.2 造成；0.2.2 时期的 36 条 catalog 全有 label。
- 该行只会在“该日志恰好作为团队/子代理根被面板打开”时表现为 id 名泳道；dev-verify 的断言扫的是**所有日志的原始 fold 行**，因此把“诚实 fallback”当成失败（D3）。`timeline.ts:868-872` 会用子会话真实标题升级 fallback 名；本例连标题都没有，ui 侧没有可用的名字可显示。

---

## 6. Q5：`team/task` 与 `team/member` 形状

**Fact F5-1** 遍历 65 个含团队日记的日志（`07-values.mts`），按事件自身时间分代：

`team/task` 键集合：
```
old : blockedBy,description,id,ownerId?,revision,status,subject,writeScopes（1109 条含 ownerId / 567 条不含）
0.2.2: blockedBy,description,id,ownerId?,revision,status,subject,writeScopes（22 条含 ownerId / 13 条不含）
```
`team/member` 键集合两代**完全一致**：`context,description,id,name,phase,provider`。

**Fact F5-2** 取值分布：0.2.2 时期 `team/task.status ∈ {pending:13, in_progress:13, completed:9}`（旧日志另有 `deleted:2`）；`team/member.phase ∈ {provisioning:32, active:32}`。**没有发现新枚举值**。`team/task` / `team/member` 的外层 payload `version: 2`（代码 `dsh-experimental-agent-team/lib/index.js:1029,1238`），插件不读 version，读的是内层对象（`fold.ts:1047-1094`），因此兼容。

**Inference I5-1** Q5 结论：形状无破坏性变化。`revision` 仍严格递增，`deriveTaskAction`（`fold.ts:1107-1122`）在真实 0.2.2 日志上工作正常（dev-verify 的 lifecycle/attribution 断言与 live 任务的 `history` 均通过）。`ownerId` 仍是可选的（创建时无 owner，claim 后出现），`writeScopes/description/blockedBy/subject` 语义未变。

---

## 7. Q6：会话日志发现层

**Fact F6-1** `~/.dsh/sessions/` 下**只有 3 种文件名**（见 F0-2），没有 v5、没有索引/清单文件、没有 `.tmp`。会话格式仍是 `session.v4.jsonl.zstd`：header `version: 4`（702 个可解码样本；67 个未解码是因为脚本对 >2 MB 文件跳过，不是格式问题；2 个旧 header version 0 属于 2026-09 的旧目录）。

**Fact F6-2** 目录命名与 header.id **一一对应**（770 个可解 v4 header，`15-parents.py`）：

```
417  parentSession 缺省           header.id = "session-<uuid>"    （根会话；目录同名）
352  parentSession = "session-<uuid>"  header.id 裸 "<uuid>"      （普通子会话）
  1  parentSession = 裸 "<uuid>"  header.id 裸 "<uuid>"            （父本身是子会话：
     ~/.dsh/sessions/--Users-lzx-Documents-research--/a58275e8-…，父 = 25f42626-…）
```

即：**根会话 id 带 `session-` 前缀，子会话 id 是裸 uuid；`parentSession` 里存的是父 id 的原样值**（父为根→带前缀，父为子→裸 uuid）。两种目录命名在 0.2.0 时代就已共存，**不是 0.2.2 的变化**。`session-` 前缀是 id 语义的一部分，不是目录装饰。

**Fact F6-3** 0.2.2 的 session header 新增了字段（`isSeeded, origin, delegationDepth, agentPreset`，部分旧 header 没有），但插件只读 `id/createdAt/cwd/parentSession`（`fold.ts:1564-1574`），未受影响。

**Fact F6-4** 插件本体**没有目录扫描**：`src/host/session-log.ts:120-235` 只走宿主服务（`agents.get(...).session.snapshotEvents()` / `sessionPersistence.open(id,'read')`）。唯一的目录扫描在 `dev-verify.mts:87-105`（本地工作区 `~/.dsh/sessions/<slug>/<dir>/session.v4.jsonl.zstd`）：它 readdir 全部目录、对两种命名都兼容（`dir.replace(/^session-/,'')`）；7 个只有 `session.jsonl.zstd` 的旧目录会被 `try/catch` 跳过并 warn（不致命）。

**Inference I6-1** Q6 结论：发现层未变；0.2.2 没有新日志格式。dev-verify 的路径假设仍成立，但要注意两点：(a) 它把目录名去掉 `session-` 前缀后当 session id 用，与 header 的带前缀 id 不一致（D5）；(b) 它按 mtime/目录顺序挑选“第一个无父会话”，不保证是用户正在看的会话。

---

## 8. Q7：dev-verify 断言在 0.2.2 下的失效项

### 8.1 HEAD（`2e095be`）复现：5/5 工作区 FAIL

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
for slug in '--Users-lzx-Documents-GitHub-dsh-htdot-bridge--' \
            '--Users-lzx-Documents-GitHub-dsh-capability-settings--' \
            '--Users-lzx-Documents-research--' \
            '--Users-lzx-Documents-GitHub-dsh-task-gantt--' \
            '--Users-lzx-Documents-GitHub-dsh-team-group--'; do
  node --experimental-strip-types src/host/dev-verify.mts "$slug" 2>&1 | grep -E 'FAIL|CHECK'
done
```

HEAD 输出摘要（完整日志在 `/tmp/events-audit/out/devverify-*.log`）：

| 工作区 | FAIL 行 | 归因 |
|---|---|---|
| capability-settings | `every emitted record came from a queue…` | D2：`queued=0, injectedExchanges=61` |
| htDot-bridge | 同上 + `the real logs contain questions to a human (0)` | D2 与 D4（该工作区 `askCalls=0`） |
| team-group | queue 断言 | D2：`injectedExchanges=182` |
| research | `no roster row may be NAMED after its own session id (found 1)` | D3（§5.2 的老 one-shot 子代理） |
| task-gantt | queue 断言 | D2：`queued=368, injectedExchanges=1`（同一日志混代际时也会命中） |

**Fact F7-1** 失败原因不是“折叠错了”，而是断言把 **0.2.0 的投递协议**当成了唯一合法协议。HEAD 行号：
- D2：`dev-verify.mts:181-185`，要求 `queued + unpairedDeliveries === records.length`；0.2.2 的注入记录既不是 queued 也不是 unpaired。
- D3：`:590`（`member.name === member.id` 计数）、`:598-601`（断言）——统计的是 fold 原始行，不是最终泳道；`nameIsFallback` 的诚实降级被算成缺陷。
- D4：`:663-666`（`questionTotal > 0` 无条件）。
- D5：`:101`（`id: dir.replace(/^session-/,'')`）与 `:114-129`（`otherHeader?.parentSession === session.id`）——一侧带前缀一侧不带，`children` 实际只剩“父本身是子会话”的 1 条能命中（见 F6-2 的 770 样本：352 条带前缀引用 + 1 条裸 uuid 引用）。

### 8.2 工作区（未提交）版本复测：5/5 PASS

Lead 在审计期间已修改 `src/host/dev-verify.mts`（+82/−23，未提交）。用同一命令在 23:29 复测：

```
htdot-bridge       delivery form: injected only (queued=0, unpaired=0, injectedOnly=32)   ALL CHECKS PASSED
capability-settings delivery form: injected only (queued=0, unpaired=0, injectedOnly=61)  ALL CHECKS PASSED
research           delivery form: mailbox + injected (queued=16, …)                       ALL CHECKS PASSED
task-gantt         delivery form: mailbox + injected (queued=368, unpaired=0, injectedOnly=1) ALL CHECKS PASSED
team-group         delivery form: injected only (queued=0, unpaired=0, injectedOnly=182)  ALL CHECKS PASSED
```

对应工作区行号：queue 断言 `:203`、id-named 断言 `:632`、questions 断言 `:714`、逐日志账本 `:826`。

**Inference I7-1** 断言应“版本无关”的写法（与 Lead 已落地的方向一致）：
1. **投递账本**：`records.length === queued + unpairedDeliveries + (injectedExchanges − injectedDuplicates)`。（`injectedDuplicates` 只在旧日志两种形态混杂时 >0。）
2. **id 命名**：只在“存在名字声明（`nameIsFallback !== true`）却仍等于 id”时失败；把 `nameIsFallback` 的条数单列打印，由 `buildTimeline` 后的泳道名复核（`timeline.ts:868-872` 的标题升级后才代表用户看到的名字）。
3. **人类提问**：先数原始 `tool/call` 里的 `ask_user_question/request_user_input`；为 0 则跳过“是否有折叠记录”的锁。
4. **lead/root 选择**：两侧归一化比较；`buildTimeline` 段直接用选出的 lead，而不是“目录序第一个无父会话”；再增加显式 `--root`（或选“最近活跃团队”）以覆盖 0.2.2 当前团队。

### 8.3 工作区内容差异 ≠ 缺陷

**Fact F7-2** htDot-bridge 的 `questions to a human (0)`：该工作区 32 个日志里 `ask_user_question/request_user_input` 原始调用数 = 0（`question tool calls in the raw logs: 0`）。这是“这个工作区没人问过问题”，不是折叠坏了。research/capability-settings/task-gantt 分别有 9/27/12 次原始调用且折叠数均 >0。

**Fact F7-3** D5 的实际影响：`children` 实际只剩 1 条（父本身是子会话）能命中，分数基本退化为 `team/*` 事件数；在 htDot-bridge 里仍正确选中 `d4d2e505`（team 事件 66 条、本来也是真 Lead），但这是巧合而非逻辑保证。另：`buildTimeline` 段的 `rootSession` 是“加载顺序里第一个无父会话”（`:521-527`），htDot-bridge 里是 `0c5d531f`（lanes=1，无 team 事件），该段 `provisioning/id-named/activity` 断言在此工作区是空转。建议改 `buildTimeline(stubCtx, lead.id)`。

---

## 9. Q8：`agent/inbox/spliced` 是否仍是第二来源

**Fact F8-1** spliced 的 inserted item 形状（真实事件，只读字段名）：

```json
{"type":"agent/inbox/spliced","data":{"target":"next-turn|next-step","start":0,
 "inserted":[{"content":[…text blocks…],"source":{…与 user/message 的 source 相同…},"role":"user","id":"<message id>"}]}}
```

即：**同一条注入消息**既以 `agent/inbox/spliced.inserted[]` 记一次（入 inbox），又以 `user/message` 记一次（投递进对话）。0.2.2 代码路径：Team 服务 `root.steer(input)` / `steerHostSubagentPrompt(...)`（`dsh-experimental-agent-team/lib/index.js:1605-1609`）。

**Fact F8-2** 全量配对实测：
- 2050 条 `agent/inbox/spliced` 插入事件携带 `source.kind ∈ {team-message, agent-message}`（扫描中按 source 命中计数），恰等于 581 + 1469 条注入消息数。
- 122 个 0.2.2 追加文件内（`11-spliced.mts`）：注入消息 126 条，**126/126** 的内容能在同日志 spliced 插入中找到；`splicedOnly(team header)=0`、`usermsgOnly(team header)=0`；人类 prompt 360 条中 340 条配对（差异来自引用/包装改写）；其它注入 1085 条只有 201 条配对（40 条仅 spliced）。
- 812 条 spliced 是“移除/回收”帧（`removedCount`）。

**Fact F8-3** 队列→投递时差（配对成功样本 n=667）：min 4 ms、p50 **75 ms**、p90 **19.3 s**、max **56.7 min**；分桶 `<1s:424, 1s-1m:217, 1m-1h:26`。spliced 的时刻是“入 inbox（队列）”，`user/message` 的时刻是“投递”。

**Inference I8-1** “不把 `agent/inbox/spliced` 当第二来源”的结论**仍然成立**：它与 `user/message` 是同一消息的两种记录，读了会双计（箭头重复、note 计数翻倍）。当前 `fold.ts` 只读 `user/message` 是正确的。
**Inference I8-2** 但 0.2.2 因此丢失了 0.2.0 mailbox 提供的“排队→投递”跨度：`fold.ts:609-617` 把两者压成同一时刻。若产品需要“消息在收件人 inbox 里等了多久”，可用 `spliced.inserted[].id` ↔ `user/message.data.id` 配对回填 `queuedAt`（D7）；不需要时不改也无用户可见错误。

---

## 10. 建议修复点（与当前工作区对照）

| # | 文件:行 | 建议 | 状态 |
|---|---|---|---|
| 1 | `src/host/dev-verify.mts:181-185`（工作区 :203） | 投递账本加入注入项；逐日志再做一次账本断言 | **工作区已修** |
| 2 | `src/host/dev-verify.mts:590,598-601`（工作区 :632） | id-named 断言区分 `nameIsFallback`；最终以 `buildTimeline` 泳道名复核 | **工作区已修** |
| 3 | `src/host/dev-verify.mts:663-666`（工作区 :714） | 人类提问锁改为 `askCalls===0 || questionTotal>0` | **工作区已修** |
| 4 | `src/host/dev-verify.mts:114-129`、`:521-527` | 归一化 `parentSession` 与 id；lead 选择器加“最近活跃团队 / 显式 --root”；`buildTimeline` 用 `lead.id` | 待办 |
| 5 | `src/host/timeline.ts:1241`（及 `fold.ts:533-535,736-746,1019-1025` 注释） | 把 “DSH 0.2.1's delivery form” 改成版本中立措辞（0.2.2 只有这一形态；面板不渲染 notes，但 API/dev-verify 读者会看到） | 待办（API 文案） |
| 6 | `src/host/fold.ts:609-617` | 可选：用 `agent/inbox/spliced` 回填注入消息的 `queuedAt`（跨日志 id 配对），恢复“排队→投递”跨度；同时修正“one observed instant”注释 | 可选 |
| 7 | `src/host/fold.ts`（新增读取 `subagent/descriptor`）与 `timeline.ts:868-872` | 可选：泳道名链在 catalog.label 缺失时补子会话自身 descriptor.label，减少 id 化泳道 | 可选 |
| 8 | `src/host/dev-verify.mts:164-170` | 诊断打印注入记录时把 `to` 显示为“carrier=fold.sessionId”或 `injected`,避免 `to=-` 被误读成“没有收件人” | 可选 |

---

## 11. 复现材料清单

| 脚本（`/tmp/events-audit/`） | 作用 |
|---|---|
| `lib.mts` | 多帧 zstd 解压 + 目录枚举 + JSON 工具 |
| `01-inventory.mts` | 全机日志/事件类型普查 |
| `02-era.mts` | 按事件时间的代际普查 + payload shape 对比 |
| `03-injections.mts` | 注入 kind/form/header/源字段统计 |
| `04-fold-real.mts` / `05-current-team.mts` | 对真实工作区跑 `foldSessionEvents`/`buildTimeline` |
| `06-subagent.mts` | 子代理事件、ack 正则、descriptor/catalog 形状 |
| `07-values.mts` | team/task·member 枚举 + 全量注入头正则覆盖 |
| `08-dispatch.mts` | subagent/spawn_teammate 的 dispatch 解析 |
| `09-roots.mts` | 指定 0.2.2 团队根的时间线箭头验收 |
| `10-discovery.py` / `13-prefix.py` | 目录命名/header/父子链 |
| `11-spliced.mts` | spliced ↔ user/message 配对与队列时差 |
| `12-dup.mts` | 混合代际日志的双画风险 |
| `14-settled-check.mts` | settled 等注入不产生 record 的实测 |
| `scan-kinds.py` / `quick.py` / `peek.py` | 全机 kind 时间线下界、单日志形状、原始事件抽样 |

`/tmp/events-audit/out/` 下保留了每步的原始输出（`*.log`、`*.json`），可用于复核本报告中的每一个数字。

---

## 12. Fact / Inference 边界备忘

- 事实（可复跑）：事件计数/时间戳/字段集合/代码行/运行中 API 返回。
- 推断（未直接观测）：dev-verify 修复后对“未来 DSH 版本”的健壮性；候选增强（descriptor 命名、spliced 回填队列时间）的收益。
- 未取证（不在本任务范围）：0.2.2 客户端加载契约、SDK API 变化、better-sidebar 接口（属 task-2）；`tools.resolve`/PTC 等执行面变化。
