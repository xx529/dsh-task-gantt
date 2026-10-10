# dsh-task-gantt — 团队技术简报（冻结事实）

> 本文件由 Lead 维护，是**唯一**的跨半契约与 SDK 事实来源。所有 teammate 动手前先读它。
> 文中每条"事实"都标注了出处；标 ✅ 的是本机实测，标 📖 的是官方文档/源码引用，标 ❓ 的是**待验证**（谁验证谁改这一行）。

## 0. 目标

在 `/Users/lzx/Documents/GitHub/dsh-task-gantt` 实现独立 DSH 插件 **dsh-task-gantt**：
通过 `ctx.betterSidebar.registerTab` 注册一个侧边栏页面 —— **agent team 任务甘特图**：

- 纵轴 = teammate（Lead + 每个 teammate 一条泳道）；
- 横轴 = 真实时间（epoch ms）；
- 条内容 = 任务标题 + 简介信息（subject + description）。

用户已确认的三项决策：

1. **形态**：独立插件，注册为 dsh-better-sidebar 的新 tab（不改 better-sidebar 源码）。
2. **时间数据源**：会话事件日志（权威、可回溯）+ agentTeam 实时投影（叠加当前状态）。
3. **验收**：单测 + typecheck + 构建 + 装进 `~/.dsh/profiles/web` 真机挂载冒烟（Lead 负责申请写权限）。

## 1. 本机环境（实测）

| 事实 | 值 | 出处 |
|---|---|---|
| 工作区 | `/Users/lzx/Documents/GitHub/dsh-task-gantt` | ✅ |
| DSH 宿主版本 | **0.2.0-rc.2** | ✅ `~/.dsh/dsh-runtimes/dsh-primary-runtime/runtime.json` 的 `desktopVersion` |
| 本机 `dsh` CLI | `@deepseek-ai/dsh@0.1.2-alpha.2`（全局包，仅 CLI） | ✅ `.../lib/node_modules/@deepseek-ai/dsh/package.json` |
| 目标 profile | `web`（`~/.dsh/profiles/web`） | ✅ |
| 该 profile 的 better-sidebar | `dsh-better-sidebar@0.22.1`（源码在 `node_modules/dsh-better-sidebar/`，含完整 `src/`） | ✅ |
| better-sidebar 0.25.0 源码参考 | `/tmp/dsh-better-sidebar-src`（git clone，含 `docs/external-plugin-guide.md`，1241 行） | ✅ |
| node / pnpm / npm | v22.22.2 / 11.22.0 / 10.9.7 | ✅ |
| esbuild | 0.25.12（**install 脚本已批准**，见 `pnpm-workspace.yaml` 的 `allowBuilds`） | ✅ |
| gh CLI | 已登录 `xx529` | ✅ |

## 2. 插件形态事实

### 2.1 宿主如何发现插件的两半

📖 来自 `dsh-better-sidebar@0.25.0` 的 `dsh.plugin.json` 与 `cordis.patch.yml`：

```jsonc
// package.json
"main": "./lib/index.js",          // HOST 半：ESM，import 里 @deepseek-ai/* 全部 external
"exports": { ".": ..., "./client": { "default": "./lib/client.js" } },
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },   // 安装时自动把本包加进 profile 的 bundle 栈
  "client": { "platform": "web", "inject": [] }  // 浏览器半：由 clientModules 服务下发 client.js
}
```

```yaml
# cordis.patch.yml —— 官方 bundle 通道：`dsh plugin --profile web add dsh-task-gantt`
- insert:
    - id: dsh-task-gantt
      name: 'dsh-task-gantt'
```

📖 官方安装命令（写进 README）：`cd ~/.dsh && dsh plugin --profile web add dsh-task-gantt`。

### 2.2 浏览器半的打包格式（关键，别猜）

📖✅ 两个装好的真实插件产物逐字确认（`dsh-chat-tidy@0.4.0/lib/client.js`、`dsh-ego-browser@0.8.6/lib/client.js`）都是：

```js
window.__ModuleLoader__.load({ id: 'dsh-chat-tidy', factory: (require) => {
  var module = { exports: {} }; var exports = module.exports;
  /* …bundle body…  require("react") / require("react/jsx-runtime") / require("@deepseek-ai/dsh-client-store")  */
  return module.exports; } });
```

- **必须**是这个形状；`factory` 收到的 `require` 解析宿主自己的模块表（React 是单例，不要 copy 进 bundle）。
- 构建脚本 `scripts/build.mjs` 已按此实现（esbuild `iife` + `banner`/`footer` + `external: ['react','react-dom','react/jsx-runtime','@deepseek-ai/*']`）。
- ❓**待验证**：宿主 clientModules 对 `exports["./client"]` 的解析是否要求 `"default"` 键（本仓库已写 `{"default": "./lib/client.js"}`，与 dsh-capability-panel 一致）。
- ❓**待验证**：`dsh.client.inject` 数组里能不能出现 `dsh-better-sidebar`（它是普通包名，不是 `@deepseek-ai/*`）。**默认策略：留空数组**，client 半用 `ctx.get('betterSidebar')` 软探测（结构类型已在 `src/shared/contract.ts` 的 `BetterSidebarTabService` 冻结），避免启动预检把整行禁用。

### 2.3 ⚠️ peer 依赖的启动期硬约束（最容易静默失效的一处）

📖 `dsh-better-sidebar` 仓库 `AGENTS.md` §3.4 第 12 条 + §3.0：

> `packages/boot/app-boot/src/plugin-compatibility.ts` 遍历 profile 行的 `peerDependencies`，对**名字为 `@deepseek-ai/dsh` 或以 `@deepseek-ai/dsh-` 开头**的条目跑 `semver.satisfies(宿主版本, range, { includePrerelease: true })`，不满足就把整行 `row.disabled = true`，只在 stderr 留一行 `disabling profile plugin <label>: <reason>`。
> - caret 范围**永远跨不过 minor**：`^0.1.7-rc.1` 对 `0.2.0-rc.2` 判定为 **false**。
> - `peerDependenciesMeta.optional` **没有豁免**。
> - 豁免只能写 profile 自己的 `compatibility.json`。

**结论（硬规则）**：本插件的 `peerDependencies` 里
- ✅ 可以写 `@deepseek-ai/cordis`（宿主有，且 `^4.0.0` 容得下 4.0.4）；
- ❌ **绝不**写任何其它 `@deepseek-ai/dsh-*` 到 `peerDependencies`（会撞预检）；
- ❌ `dependencies` / `peerDependencies` / `optionalDependencies` 里**绝不出现** `cordis` 这个名字（市场按名硬拒，`optional` 无效）；
- ❌ `scripts` 里**不得**有 `preinstall` / `install` / `postinstall` / `prepare`（市场约束）。

📖 出处：`/tmp/dsh-better-sidebar-src/AGENTS.md` §1「市场受管安装约束」。

## 3. 数据源（这是整个插件的核心）

### 3.1 agentTeam 实时投影（浏览器侧，权威的任务/名单状态）

📖 `dsh-better-sidebar@0.22.1/src/client/team-projection.ts` + `src/context-types.ts` L400-470。

浏览器从 `SessionListState.projectionsBySession[leadSessionId].values.agentTeam` 直接读到：

```ts
interface SidebarTeamProjection {
  members: readonly { id: string; name: string; role: 'lead'|'teammate';
                      phase: 'provisioning'|'active'|'failed'; error?: string }[]
  tasks: readonly {
    id: string; revision: number; subject: string; description: string;
    status: 'pending'|'in_progress'|'completed'|'deleted';
    ownerName?: string; blockedBy: string[]; writeScopes: string[];
    ready: boolean; writeScopeWarnings: string[]
  }[]
  failure?: string
}
```

- 一个 team ≡ 一个 Lead session（`TeamId ≡ lead session id`）📖 `team-routes.ts` 头注释。
- **投影里没有时间戳**（这是本插件必须去读会话日志的原因）。
- 读法（client 半）：`ctx.sessions.list.getSnapshot().projectionsBySession` + `subscribe`。📖 `context-types.ts` L500+ 的 `SidebarSessionList`。

### 3.2 会话事件日志（权威时间轴）

✅ 实测：本会话日志解压后每条事件都带 `time`（epoch ms）与 `seq`、`data`：

```jsonc
{"type":"session","version":4,"id":"session-…","createdAt":1791647755015,"cwd":"…","agentPreset":"standard"}
{"type":"turn/start","seq":…,"time":…,"data":{…}}
{"type":"step/start","seq":…,"time":…,"data":{…}}
{"type":"step/end",  "seq":…,"time":…,"data":{…}}
{"type":"tool/call", "seq":…,"time":…,"data":{…}}
{"type":"tool/result","seq":…,"time":…,"data":{…}}
{"type":"assistant/message", …}
```

✅ 实测本会话 157 条事件里出现的 `type` 计数：`tool/call` 39、`tool/result` 38、`step/start` 20、`assistant/message` 20、`step/end` 19、`user/message` 5、`agent/inbox/spliced` 4、`session/title` 2、`session` 1、`permission/preset` 1、`sandbox/mode` 1、`approval/policy` 1、`agent-preset/selected` 1、`turn/start` 1、`system/message` 1、`request/header` 1、`request/context` 1、`session/title-llm-request` 1。
（注意：这条会话里 `turn/start` 只有 1 条而 `step/start` 有 20 条 —— 说明**闭合判定必须容忍缺失的 open/close 配对**，不能假设严格交替。）

### 3.3 宿主的会话读取 API（host 半）

📖 `cordis_inspect_query(host, Service, listService)` 实测输出：

```ts
// ctx.sessions —— In-memory session store
get(id: SessionId): Session | undefined
list(): Session[]
// Session 的具体形状 ❓待验证（它有哪些投影/事件字段）

// ctx.sessionPersistence —— Durable append-only session storage（冷会话也能读）
open(id, access: 'read'|'write', options?): Promise<SessionHandle>
list(options?): Promise<readonly SessionPersistenceSnapshot[]>
stat(id, options?): Promise<SessionPersistenceSnapshot | undefined>

// ctx.agentTeams —— Agent Teams service（部署未挂载时 ctx.get('agentTeams') === undefined）
membership(agent: Agent): TeamMembership
listMembers(agent: Agent): TeamMemberView[]
listTasks(caller: Agent): TeamTaskView[]
getTask(caller: Agent, id: TeamTaskId): TeamTaskView
updateTask(caller: Agent, request) / createTask(caller, request)   // 本插件只读，不用
waitForChange(caller, timeoutMs, signal): Promise<TeamWaitResult>

// ctx.agents
get(id: SessionId): Agent | undefined
list(): Agent[]

// ctx.subagents
listChildren(parentSessionId, signal?): Promise<SubagentCatalogEntry[]>

// ctx.webServer —— route 注册
register(route: { kind: 'exact'|'prefix'; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void|Promise<void> }): () => void
registerUpgrade(route: { path: string; handler: (req, socket, head) => void|Promise<void> }): () => void
```

📖 `dsh-better-sidebar` 的 host 半用法参考（`src/index.ts` L819-853、`src/subagent-live-route.ts`、`src/sidechat-routes.ts`、`src/fs-watch.ts`）：
- 注册形态：`ctx.effect(() => ctx.webServer.register({ kind: 'prefix', path: '/sidebar/api', handler }), 'label')`；
- host 半读会话事件：`session.snapshotEvents()`（活会话）与 `sessionPersistence.open(id,'read') → handle.read() → handle.close()`（冷会话），见 `src/context-types.ts` 的 `SidebarSessionPersistenceService` 与 `src/sidechat-routes.ts` 的实现。
- ❓**待验证**：`ctx.get('sessionPersistence')` 在本机 0.2.0-rc.2 上是否存在（服务目录里列了它，但服务目录是**所有已注册**服务的目录，不等于本部署一定有）。**降级路径必须实现**：读不到日志时返回 `source: 'live'` 的空泳道 + `notes`。

### 3.4 任务状态迁移事件如何定位

> ⚠️ **本节已被实测推翻并更正（Lead 复核 + host-data 一手取证）。** 原假设"会话日志里没有 `team/*`"**只对没有 team 的会话成立**：我最初扫的是本会话在**早期**的状态，那时还没有 team。

✅ **事实（`team/task` 与 `team/member` 是一等会话事件）**：Lead 会话日志里存在 `team/task` / `team/member` / `team/message/queued|delivered`，每条都带 `time`（epoch ms）。实测：
- 本会话（Lead）日志：`team/task` 15 条、`team/member` 12 条；6 个 teammate 日志里 **0 条**（板书只写在 Lead 自己的日志里）。
- 事件形状：`{"type":"team/task","seq":485,"time":1791648711980,"data":{"version":2,"teamId":"session-…","task":{id,revision,subject,description,status,blockedBy,writeScopes,…}}}`；`team/member` 的 `data.member.id` **就是子会话 id**。
- 工具名：`team_task_create` / `team_task_update`（工具行号见 `docs/FINDINGS-host.md`）。

因此 `src/host/timeline.ts` 的**时间锚点优先级**（实现与该文件头一致）：
1. **主路径**：Lead 日志的 `team/task` 事件的 `time` —— 权威且可回溯；
2. **兜底**：某任务有看板记录但日志无 `team/task` → 扫 `tool/call` 的 `time` 定锚，`team_task_update.expected_revision`（CAS 前置条件）用来把迁移**归属到执行它的 teammate**（真实日志 6/6 正确）；用了这条要在 `notes` 里说明；
3. 都拿不到 → `history: []`，UI 只画当前状态（`source: 'live'` 语义）。

**禁止**发明时间戳：宁可 `history: []`，也不要拿"现在"顶上。

❓**仍未验证**：`completed` / `reopen` 迁移在真实日志里**从未出现过**（全队任务只走到 `pending → in_progress`），其形状由构造事件覆盖。

## 4. 冻结的契约

`src/shared/contract.ts` **已冻结**（Lead 所有）：`TimelineResponse` / `TimelineLane` / `TimelineTask` / `ActivitySpan` / `TaskEvent` / `ApiEnvelope` / `TAB_TYPE_ID` / `ROUTE_PREFIX` / `API_VERSION` / `BetterSidebarTabService`。

改这个文件 = 跨半破坏性变更，**必须先经 Lead 同意**。

## 5. 主题与 i18n

📖 `dsh-better-sidebar` 指南 §12「皮肤兼容（令牌驱动）」：
- **面板表面**背景用 `var(--dsw-alias-bg-layer-1)`；**绝不**消费 `--dsw-specific-sidebar-fill`。
- 文字/边框/分隔线只消费 `--dsw-alias-*` / `--dsw-font-*` / `--ds-*` 令牌，**零硬编码颜色**（`tests/theme.spec.ts` 在 better-sidebar 里就是这么守的，我们抄同一套守护）。
- 交互 chrome 加 `-webkit-app-region: no-drag`。

i18n：本插件**自带** zh-CN / en 词典（不依赖 `@deepseek-ai/dsh-client-locale`，避免多一个 peer）。语言探测：
`document.documentElement.lang || navigator.language`，`zh*` → 中文，否则英文。

## 6. 写入范围（防冲突，硬约束）

| 路径 | 唯一 owner |
|---|---|
| `src/shared/contract.ts` | **Lead** |
| `package.json`（deps/scripts 字段） | **packaging** |
| `scripts/`、`tsconfig*.json`、`cordis.patch.yml`、`dsh.plugin.json`、`icon.svg`、`.gitignore` | **packaging** |
| `src/host/**` | **host-data** |
| `src/client/index.ts`、`src/client/i18n.ts`、`src/client/tab.ts` | **shell** |
| `src/client/api.ts`、`src/client/ui/**` | **ui** |
| `tests/**`、`vitest.config.ts`、`.github/workflows/**` | **verify** |
| `README.md`、`README.zh.md`、`LICENSE`、`docs/**` | **docs**（Lead 复核） |

**不要**顺手改别人的文件：需要改时发消息给 owner 或 Lead。

## 7. 质量门（每个人提交前都要过）

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
pnpm run typecheck      # 必须 0 error
pnpm run test           # 必须全绿
pnpm run build          # 必须产出 lib/index.js + lib/client.js
```

真机挂载冒烟（Lead 统一执行，避免多人抢 profile）：

```bash
cd ~/.dsh && dsh plugin --profile web add "link:/Users/lzx/Documents/GitHub/dsh-task-gantt"
# 然后重启 dsh web，浏览器硬刷新，打开右侧栏 → + → 任务甘特图
```

## 7.1 上架插件市场的官方路径（Lead 已查证）

📖 一手出处：`https://github.com/awesome-dsh-plugin/awesome-dsh-plugin` 的 `contributing.md`（本机已 clone 到 `/tmp/awesome-dsh-plugin`）+ `scripts/check-submission.mjs`。
市场客户端（`dshmarket@1.10.1`）的登记表来自 `https://awesome-dsh-plugin.com/plugins.json`，源仓库就是上面那个（📖 `~/.dsh/profiles/web/node_modules/dshmarket/src/registry.ts` 的 `REGISTRY_URL`）。

**上架方式 = 向 `awesome-dsh-plugin/awesome-dsh-plugin` 提一个只新增一个 YAML 文件的 PR**：

```yaml
# data/plugins/<owner>__<repo>.yml   ← 文件名必须是这个形状
url: https://github.com/xx529/dsh-task-gantt
name: xx529/dsh-task-gantt
category: ui
description:
  en: 'One-line description ending with a period.'
  zh: '一句话描述，以句号结尾。'
```

**CI 硬性门槛**（📖 `scripts/check-submission.mjs`，违反必被拒）：
1. 仓库 `package.json` 必须声明 **`dsh.bundle`**（⚠️ 只声明 `dsh.client` 是最常见的被拒原因，那样**无法通过 `dsh plugin add` 安装**）；本仓库两者都有，见 §2.1。
2. 仓库**创建满 1 天**（`MIN_AGE_DAYS = 1`）；**没有**提交数门槛。
3. 仓库存在、未归档，且不是 DSH 本体。
4. 仓库要有**真实可用的代码**（占位/README-only 仓库不收）。
5. 仓库需加 GitHub topic **`dsh-plugin`**。
6. 一个 PR 最多新增 3 个条目（`MAX_ENTRIES_PER_PR = 3`）。
7. 描述只讲功能、不带营销词；含 `: `（冒号+空格）时必须给 YAML 加引号。
8. （可选）`description.zh` 不是必填，维护者会补。

**市场客户端安装语义**（📖 `dshmarket/src/install.ts`）：安装后按 profile 的 `package.json → dsh.profile.bundles` 判定，只有 `dsh.bundle` 的包才会被正常 boot 路径激活；没有 `dsh.bundle` 的纯客户端插件走市场自己的 shim 挂载。

**对本仓库的推论**：
- 安装命令优先给 **GitHub 直装**（bundle 通道，`lib/` 已提交所以无需构建）：
  `cd ~/.dsh && dsh plugin --profile web add "dsh-task-gantt@github:xx529/dsh-task-gantt"`
- `dsh-better-sidebar` 是**可选前置**，不是 `dependencies`（否则会被一起装成硬依赖）；README 里要求用户先装它。

## 7.2 真机挂载冒烟结果（Lead 执行，2026-10-11）

环境：独立 scratch home（`DSH_HOME=/tmp/gantt-scratch-home`，**不碰用户 ~/.dsh**），DSH CLI **0.2.0-rc.2**（`npx --package @deepseek-ai/dsh@0.2.0-rc.2`），`dsh-better-sidebar@0.25.0`，本插件以 tarball 经 `dsh plugin --profile web add` 安装（bundle 通道，与用户安装路径一致）。

| 断言 | 结果 | 证据 |
|---|---|---|
| 插件行进入组合树 | ✅ | `dsh --profile web --dump-config` 出现 `- id: dsh-task-gantt / name: dsh-task-gantt` |
| 浏览器半被下发并执行 | ✅ | 页面里存在 `<style data-plugin="dsh-task-gantt">`（**实拍**，不是推断） |
| **tab 出现在 `+` 菜单** | ✅ | 新建标签页菜单含「任务甘特图」 |
| 面板挂载 | ✅ | `div[data-dsh-task-gantt]` 存在，`[class*="dtg-"]` 节点 **1085** 个 |
| 纵轴 = teammate | ✅ | 7 条泳道：lead / packaging / host-data / shell / ui / verify / docs |
| 横轴 = 真实时间 | ✅ | 刻度 00:10 / 00:20 / 00:30 / 00:40 + `now 00:47` |
| 条内显示任务标题 + 简介 | ✅ | 6 张任务卡，标题如「打包与脚手架：构建产物形状、manifest、安装验证」，第二行为 `Owner: packaging。目标：…` |
| 状态区分 | ✅ | 5 张已完成卡（宽 260px）+ verify 1 张进行中卡（宽 148px、泳道标「运行中」） |
| 降级态如实标注 | ✅ | 无 agentTeams 时页脚显示 notes：`the agentTeams service is unavailable; the board is rebuilt from the session log alone` |
| host 路由 | ✅ | `POST /dsh-task-gantt/api/ping` → `{"ok":true,...}`；`/api/timeline` → HTTP 200、`source:"log"`、7 lanes / 6 tasks |

**由此确认（推翻一处团队内部假设）**：`webServer` 服务在 `apply()` 执行时**尚未挂载** —— 我加探针后实测输出 `apply entered; webServer= undefined`，改成 `ctx.inject(['webServer'], …)` 后路由立即注册成功。这条现在是 **Lead 一手实测**，可以对外引用。

❓**仍未验证**：反代子路径（`https://host/<prefix>/`）下的路由解析只到单测级；桌面壳的 `dsh-app://` 基底只到单元级；**实时增量刷新与 live `agentTeams` 投影路径**只到单元/构造数据级 —— Lead 在 scratch 实例里提交了一次最小 team 任务（`spawn_teammate` ×2 + 共享任务 ×2）以补这一段，但受时间限制**未观察到新 team 形成**，因此这段不作为"已实测"写入交付。

## 7.3 桌面 profile（用户当前环境）的安装路径

`~/.dsh/profiles/desktop` 是**用户运行环境**，已装 `dsh-better-sidebar@0.25.0` 且 `@deepseek-ai/dsh-experimental-agent-team-profile` 在 bundles 里（即 live `agentTeams` 层是挂着的）。

⚠️ **该 profile 不能用 CLI 安装**：实测 `dsh plugin --profile desktop add <pkg>` → `error: profile "desktop" is managed exclusively by the Electron application`。桌面 profile 的依赖改动由 **Electron 应用内的插件管理器 / 市场**代为执行。

用户侧的安装方式（二选一）：
1. 应用内「插件」页 / 侧卡片插件市场里安装（GitHub 源或本地 tarball）；
2. 若应用提供「从文件安装 / 开发模式」，用 `pnpm pack` 产出的 tarball。

## 8. 官方文档出处

- 外部插件接入指南（唯一权威）：`/tmp/dsh-better-sidebar-src/docs/external-plugin-guide.md`
  - §2 类型合并与依赖声明、§3 最小骨架、§4 TabDescriptor 全字段、§4.2 TabComponentProps、§6 页面内数据访问、§7 服务方法清单、§12 皮肤契约、§13 完整最小示例、§15 真实接入案例（15 个第三方插件）
- better-sidebar 仓库规则（硬约束/CI/发版）：`/tmp/dsh-better-sidebar-src/AGENTS.md`
- better-sidebar 内置参考实现（吃自己的狗粮）：`~/.dsh/profiles/web/node_modules/dsh-better-sidebar/src/client/builtins/`、`src/client/service.ts`
- 上一个注册 tab 的三方插件（真实可跑）：`~/.dsh/profiles/desktop/node_modules/dsh-ego-browser/`（host 路线注册写法在 `lib/index.js` L2025-2070）
