# DSH 0.2.2-rc.1 适配审计 —— SDK / 客户端 API（owner: Lead）

> 结论：**两半所依赖的 API 在 0.2.2-rc.1 没有破坏性变化**；本轮真正需要改的是
> 真机自检（`dev-verify.mts`）的"按邮箱事件计数"断言、宿主主题 token 快照，以及
> 针对 0.2.2 只发注入消息这一事实补回归测试。逐条证据如下（Fact / Inference 分离）。
>
> 运行版本取证：`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`
> 内 `dsh/package.json` → `"version": "0.2.2-rc.1"`，`@deepseek-ai/cordis: 4.1.0`；
> 会话日志仍为 `session.v4.jsonl.zstd`（`dsh-session-format` 仍只到 v3→v4）。
> 解包方法：`node /tmp/dsh-asar2/asar.mjs "<app.asar>" list|cat|extract`（纯 node，
> 无依赖；本文所有 `@deepseek-ai/…` 行号均指该 asar 内文件）。

## 1. 结论速览

| # | 契约项 | 0.2.2-rc.1 事实 | 插件现状 | 结论 |
|---|---|---|---|---|
| 1 | `dsh.client` 清单 | `parseDshClient` 只强制 `platform: string`；`inject`/`external`/`immediately` 可选（`dsh-client-modules/lib/index.js` 内 `function parseDshClient(pkgName, value)`） | `package.json`: `dsh.client={platform:'web',inject:[]}`，`exports["./client"]` 是对象且 `default` 为字符串 | OK |
| 2 | `dsh.bundle.patch` | `dsh-app-boot` 仍读取并合并 bundle patch（0.2.2 内 7 处引用，0.2.1 为 6 处；新增的是 dump-config 诊断） | `cordis.patch.yml` 一个 `insert` 行 | OK |
| 3 | 插件兼容性预检 | `dsh-app-boot/lib/index.js` `unmetRequirements`：先看 `engines.dsh`（有则**单独**决定），否则只看 `peerDependencies` 里 `@deepseek-ai/dsh` / `@deepseek-ai/dsh-*`；不满足时抛 `incompatible-version`，可被 profile 的 `compatibility.json` 精确版本豁免 | 只声明可选 peer `@deepseek-ai/cordis:^4.0.0`（不是 `dsh*` 名），预检**不看**；4.1.0 满足 `^4.0.0` | OK，无需新增版本区间字段（也不会被静默禁用） |
| 4 | 客户端加载 | `window.__ModuleLoader__.load({id, factory})` 在 0.2.1 / 0.2.2 逐字相同；0.2.2 的 `dsh.client` 解析新增可选 `external` / `immediately`，缺省行为不变 | `scripts/build.mjs` 生成的 `lib/client.js` 就是该 wrapper；`scripts/verify-build.mjs` 断言 factory 返回 exports | OK |
| 5 | loader 样式 sink | 0.2.2 的 loader facade 仍无 `styles` 成员（与 0.2.1 相同） | `src/client/panel-style.ts` 已探测 `loader.styles?.insert`，缺失时回退自标记 `<style data-plugin-css>` | OK（回退路径即实际路径） |
| 6 | `webServer.register` | 0.2.2 `dsh-host-webserver/lib/index.js` 仍是 `register(route)`（route 形状含 `kind` 前缀） | `src/host/index.ts` 用 `register({kind:'prefix', path, handler})` | OK |
| 7 | `sessionPersistence.open` | 0.2.2 `dsh-session-persistence*` 仍是 `open(id, access, options)` | `src/host/session-log.ts` 调 `open(id,'read')` | OK |
| 8 | 活会话事件读取 | `Session.snapshotEvents(fromSeq, toSeqExclusive)` 在 0.2.2 仍存在（`dsh-session/lib/index.js:1454`；0.2.1 为 `:1452`，实现未变） | `src/host/session-log.ts` 活会话优先、持久化次之 | OK（仍带 host 的 `@deprecated` 注释，插件已有第二通道） |
| 9 | 团队事件 | `team/task`、`team/member` 仍写在 Lead 会话日志里，形状未变；`team/message/queued|delivered` **0.2.2 不再写**（见 `docs/COMPAT-022-EVENTS.md`） | `src/host/fold.ts` 两种形态都读；注入形态是 0.2.2 唯一形态 | OK（已补测试） |
| 10 | better-sidebar tab 服务（非 DSH 本体） | 已装 `dsh-better-sidebar@0.30.1`：`TabDescriptor` 仍有 `id/title/description/icon/order/hidden/available/single/dedupeKey/component`，`registerTab(descriptor)` 与 `openTab(seed, scope)` 均在（`lib/types/client/service.d.ts:148,619,710`；`lib/client-registry.js:1625`） | `src/client/index.ts` 只传这些字段 | OK |
| 11 | 主题 token | `dsh-client-ui-theme/lib/client.js`（0.2.2，138 133 B）定义 **419** 个 `--(dsw|ds)-*`；0.2.1 为 408。新增 12 个（illustration/state-done 等），删除 `--dsw-specific-sidebar-nav-item-hover` | 插件引用 51 个 token，全部仍定义；未用到被删的那个 | 快照已重生成（`tests/fixtures/dsw-theme-tokens.json`） |
| 12 | 主题值 | `theme-token-values.json` 的 2 个 ink + 16 个 static 解析值在 0.2.2 未变（唯一差异是 `#fff` 与 `#ffffff` 的写法） | 对比度测试内容不变 | OK |

## 2. 运行中实例实测（只读）

端口 `http://127.0.0.1:60392`（desktop profile 的 web server；profile 里装的就是
v0.3.2 = 仓库 HEAD）：

```
curl -s -X POST -H 'content-type: application/json' -d '{}' \
  http://127.0.0.1:60392/dsh-task-gantt/api/ping
→ {"ok":true,"value":{"apiVersion":1,"host":"dsh-task-gantt"}}

# 0.2.2 团队会话（dsh-htdot-bridge 的 Lead）
POST /dsh-task-gantt/api/timeline {"sessionId":"session-d4d2e505-5cc6-4322-8186-38f472fee03f"}
→ ok:true, lanes=9, tasks, 消息跨度：lead↔devops 16/14、lead↔pm 8/10、lead↔tester 18/18 …
  逐组统计 15 个方向、0 条缺 to、0 条 from.kind=system
```

**Fact**：host 半在 0.2.2-rc.1 能加载、能注册路由、能从冷日志折出泳道/任务/箭头。
**Fact**：0.2.2 团队日志的注入消息 sender 解析正确（relay 头 `Team message from X:`
+ roster/前缀容错），收件人由"日志所属会话"兜底（`src/host/timeline.ts:499`）。

## 3. 本轮实际改动（详见 CHANGELOG 0.3.3）

1. `src/host/dev-verify.mts`：队列会计改为时代无关恒等式
   `queued + unpairedDeliveries + (injectedExchanges - injectedDuplicates) === records.length`；
   新增 injection-only era 检测、逐日志会计；问题断言只在"raw 日志里确实有 ask 调用"时要求折出记录；
   泳道命名断言只惩罚"有名字却仍回落成会话 id"，honest fallback 单独计数。
2. `tests/fixtures/dsw-theme-tokens.json`：按 0.2.2-rc.1 重生成（419 个）；
   `src/client/panel-style.ts`、`tests/token-definitions.spec.ts` 的 408 说明同步更新。
3. 新增 `tests/host-message-022.spec.ts`：锁 0.2.2 只发注入形态、relay 头解析、
   Lead 的 `session-` 前缀、`subagent-settled` 不画箭头、新事件类型不产生记录、
   `agent/inbox/spliced` 不作为第二来源、端到端双向箭头不回落 `system`。
4. `src/host/dev-verify.mts` 另外修了两处"验错日志"的缺陷：`children` 计数因
   `session-` 前缀两侧不一致恒为 0；`buildTimeline` 段另取"目录序第一个无父会话"
   （可能是空会话，断言空转）。改为 bare id 归一化、选"最新且有团队日记的根日志"、
   mount 段复用同一 Lead，并新增 `--root <session-id>`。实测默认工作区现在验当前
   0.2.2 团队会话（`792532d9`，lanes=3），`--root 4d51254b…` 回到 0.2.1 旧库仍 PASS。

## 4. 复现命令

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
node /tmp/dsh-asar2/asar.mjs "/Applications/DeepSeek Harness.app/Contents/Resources/app.asar" \
  cat /dsh/node_modules/@deepseek-ai/dsh-client-modules/package.json   # 0.2.2-rc.1
node --experimental-strip-types src/host/dev-verify.mts \
  --Users-lzx-Documents-GitHub-dsh-htdot-bridge--                      # ALL CHECKS PASSED
pnpm run test -- tests/host-message-022.spec.ts                        # 7 passed
```
