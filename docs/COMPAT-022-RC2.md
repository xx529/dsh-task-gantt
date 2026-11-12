# DSH 0.2.2-rc.2 适配复核 —— 当前插件 `dsh-task-gantt@0.3.4` → `0.3.5`

> 复核对象：仓库 `/Users/lzx/Documents/GitHub/dsh-task-gantt`，桌面 profile 里运行的
> `dsh-task-gantt@0.3.4`，以及本机实际安装的 **DSH 0.2.2-rc.2**（不是 rc.1）。
> 时间：2026-11-12 23:00–23:40 +08:00。所有 rc.2 结论都来自本机安装包与真实日志/接口，
> 不是 changelog 推断。

## 1. 版本取证

```bash
$ dsh --version
0.2.2-rc.2
$ /usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' \
    '/Applications/DeepSeek Harness.app/Contents/Info.plist'
0.2.2-rc.2
$ node -e "console.log(require(process.env.HOME+'/.nvm/versions/node/v24.19.0/lib/node_modules/@deepseek-ai/dsh/package.json').version)"
0.2.2-rc.2
```

rc.1 的结论文档（`docs/COMPAT-022-*.md`）仍然成立，但 rc.2 有两处**实际 API 删除/扩展**是
那轮没有覆盖的，见 §3。

## 2. 真实日志扫描（rc.2 安装之后写入的 36 个 `session.v4.jsonl.zstd`）

命令：`python3 /tmp/scan_rc2.py`（只统计类型/字段形状，不摘正文）。

| 事实 | 计数 |
|---|---|
| 事件总数 | 50 442 |
| `team/message/queued` / `delivered` | **0 / 0** |
| `team/mode` | 0（本机还没有 rc.2 时代新建的团队） |
| `team/member` | 78（时间戳都在 2026-11-08 ~ 11-11，即 rc.1 时代写入） |
| `subagent/catalog` | 394，**全部 version 0**；本机尚无 v3 样本（v3 由 rc.2 源码的 `establishCatalogChild` 写入，见 `dsh-subagent/lib/types/catalog.d.ts`） |
| `user/message` 的 `source.kind` | `user` 312、`agent-message` 8、其余为 runtime 注入 |
| `agent-message` 的 `form` | `relay` 8/8 |

结论：rc.2 仍不写邮箱事件，团队/代理消息仍只以注入 `user/message` 出现；rc.2 的
`agent-message` 头有两种历史拼写（`Team message from X:` 与 `Agent <id> sent a message:`），
插件两种都已解析（`src/host/fold.ts` 的 `INJECTED_TEAM_HEADER` / `INJECTED_AGENT_HEADER`）。

## 3. 逐包差异与插件影响

| 包 | rc.1 → rc.2 变化 | 插件影响 | 处理 |
|---|---|---|---|
| `dsh-agent-team` | `TeamService` 删除 `listMembers` / `tryMembership`；保留 `isEnabled / setEnabled / createTask / getTask / listTasks / updateTask` | 旧代码每次请求都报 `agentTeams.listMembers failed: teams.listMembers is not a function`，名册只能靠日志兜底 | **已修**：`listMembers` 改为可选探测；rc.2 下静默走 `subagent/catalog` + 子会话日志 + 运行时子代理 |
| `dsh-subagent` | `subagent/catalog` 升 v3，新增短名 `name`；删除 `listChildren` / `drainChildren`；`listDescendants` 保留；事件作用域改为 subagent 树根 | 插件未用被删的两个方法；v3 `name` 可直接做泳道名，也是 rc.2 任务板 `ownerName` 的来源 | **已修**：`name` 作为显示名并登记 `name → session id` 别名；日志里没有 `team/member` 时不再丢成员 |
| `dsh-agent-team` 任务视图 | `TeamTaskView` 同时带 `ownerId` 与 `ownerName`；`ownerName` 是 subagent 名称/路径 | 旧代码只读 `ownerName`，且 `ownerName` 不在 `memberIdByName` 时任务掉 `unassigned` | **已修**：读 `ownerId` 并优先按它落道；`ownerName` 只作展示，不再当唯一键 |
| `dsh-client-ui-theme` | token 419 → **455**（+36 个 sidebar-glass / chart / json-tree / tooltip token，无删除）；插件实际引用的 token 值未变 | 运行时无破坏；快照测试会掩盖未来删除 | **已修**：`tests/fixtures/dsw-theme-tokens.json` 重生成 455 |
| `dsh-session` | `known-event-types` 新增 `team/mode` | 旧 fold 不读它；不会崩，但需要明确是“有意忽略” | **已锁**：新增测试断言 `team/mode` 不产生成员/任务 |
| `dsh-client-modules` / `dsh-app-boot` / `dsh-host-webserver` / `dsh-session` / `dsh-session-persistence` / `dsh-client-ui-sidebar-right` | 与插件相关的接口/路由/DOM 属性未变（`window.__ModuleLoader__`、`webServer.register`、`snapshotEvents`、`sessionPersistence.open`、`data-sidebar-right-*` 全在） | 无 | 复核通过 |
| `dsh-better-sidebar@0.30.1`（第三方） | 未随 rc.2 升级；peer 声明 `^0.2.2-rc.1`，rc.2 满足 | `registerTab` / `openTab` / `mounted` 服务面未变 | 复核通过；若作者后续适配 rc.2，需再跑一次本文件的 §5 |

## 4. 运行中实例实测（rc.2，改动前）

```bash
$ curl -s -X POST -H 'content-type: application/json' -d '{}' \
    http://127.0.0.1:53930/dsh-task-gantt/api/ping
{"ok":true,"value":{"apiVersion":1,"host":"dsh-task-gantt"}}

$ curl -s -X POST -H 'content-type: application/json' \
    -d '{"sessionId":"session-792532d9-b234-4a60-8b04-153ae52141f9"}' \
    http://127.0.0.1:53930/dsh-task-gantt/api/timeline
# lanes: 4（lead / events-auditor / sdk-auditor / verifier）
# notes 首条：agentTeams.listMembers failed: teams.listMembers is not a function
```

同一端点对 rc.2 时代的新会话（`session-63e4b4e0…`，本会话）在 23:12 采样时返回 1 lane / 50 spans（会话仍在增长）；
说明 host 半在 rc.2 仍能加载、注册路由、从冷/热日志折出活动。**唯一可见的适配痕迹就是那条
`listMembers` 备注**——0.3.5 已移除。

## 5. 门禁

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
pnpm run check          # typecheck + test + build + verify:build + verify:meta + lib 干净
node --experimental-strip-types src/host/dev-verify.mts   # ALL CHECKS PASSED
```

`pnpm run check`：46 files / 961 passed / 1 skipped（改动前 955 passed；新增
`tests/host-rc2.spec.ts` 6 条）。`dev-verify` 覆盖真实 rc.1/rc.2 混合日志：0 缺收件人、
0 发送者回落 `system`、任务/泳道/提问/注入消息会计全部通过。

## 6. 仍需注意

1. **桌面 profile 里装的是 0.3.4**：本修复在仓库 HEAD（0.3.5），需要重新安装/更新插件后
   才会在 UI 生效。本次没有改动 `~/.dsh/profiles/**`。
2. 本机还没有“rc.2 时代新建的 Agent Team”日志（`team/mode` 计数 0，`team/member` 全是
   rc.1 时间戳，`subagent/catalog` 394 条全是 v0）。所以 rc.2 的“无 `team/member`、只有
   `subagent/catalog` v3”路径目前由 `dsh-subagent` 的 v3 类型/写入源码 + `tests/host-rc2.spec.ts`
   的契约夹具锁定；下一次真实团队跑完，`dev-verify` 会自动选中最新团队并复验。
3. `team/mode` 被**有意忽略**：禁用团队模式不清除历史任务/成员，甘特图继续如实展示历史；
   这不影响当前状态（任务板本身仍由 `agentTeams.listTasks` 提供）。
