# VALIDATION — 实际跑过的命令与原始证据（owner: verify）

> 本文件只记录**我（verify）实际执行过**的命令与输出摘要。没跑过的，一律标 ❓ 并说明谁该跑。
> 所有路径均为绝对路径。工作区：`/Users/lzx/Documents/GitHub/dsh-task-gantt`。
> 生成时间：2026-10-11（本机时区 Asia/Shanghai）。执行者：teammate `verify`。

---

## 1. 结论摘要（最后一次全量运行）

| 门 | 命令 | 结果 | 原始证据 |
|---|---|---|---|
| 类型检查 | `pnpm run typecheck` | ✅ `typecheck_exit=0`（`tsc -p tsconfig.json --noEmit`，无任何输出） | `/tmp/gate2.txt` |
| 单测 | `pnpm run test` | ✅ `Test Files 14 passed (14)` / `Tests 338 passed | 1 skipped (339)`（2026-10-11 01:08 复跑；F2 修复后原 skip 已转绿见 §5 F2；F7 修复后 ci.spec 9→14） | 01:08 复跑 |
| 构建 | `pnpm run build` | ✅ 产出 `lib/index.js` + `lib/client.js`（`.d.ts`/`.map` 同批） | `/tmp/gate2.txt` |
| 产物形状（packaging 脚本） | `pnpm run verify:build` | ✅ `[verify-build] OK`（宿主半 ESM 导出 name/inject/apply，0 个非相对 import；客户端半 wrapper 调用一次且 factory 返回 exports） | `/tmp/gate2.txt` |
| 展示元数据（packaging 脚本） | `pnpm run verify:meta` | ✅ `[verify-meta] OK`（`locale/en.json`、`locale/zh.json` 经 exports 解析；`icon.svg` 2277 B） | `/tmp/gate2.txt` |
| 提交产物新鲜度 | `git diff --exit-code HEAD -- lib` | ✅ **`exit=0`（Lead 提交 `f7a7263` 之后）**；提交前为 `exit=1`（见 §5 F1 与 F7：**必须带 `HEAD`**——不带 revision 的写法在 `git add lib` 之后会假绿） | 01:18 复跑 |

剩下 1 条 skipped 是**故意**保留的备选写法记录（`tests/client-tab.spec.ts`，`export const inject` 是否显式写 `betterSidebar`——该竞态已由 `ctx.inject` 延迟注册消除，故不强制），不是未完成的测试。

## 1.1 提交后复验（`f7a7263`，我在**已提交的树**上重跑，不是工作树）

Lead 于 2026-10-11 提交 `f7a7263 feat: agent-team task Gantt panel for the DSH sidebar`（66 files changed, 18683 insertions(+), 308 deletions(-)）。我没有采信「已提交」这句话，而是逐项验了提交内容与产物的字节一致性：

```
$ git log --oneline -1                          → f7a7263 feat: agent-team task Gantt panel for the DSH sidebar
$ git show HEAD:.github/workflows/ci.yml | grep 'git diff --exit-code'
  13: #   5. verify — `git diff --exit-code HEAD -- lib` …
  86: run: pnpm run verify:build && git diff --exit-code HEAD -- lib        ← 假绿那版没有被提交
$ git show HEAD:tests/ci.spec.ts | grep -c analyzeFreshnessScript           → 6（扩展版已入commit）
$ git show HEAD:docs/VALIDATION.md | grep -c F7                             → 5
$ for f in lib/index.js lib/client.js tests/host-integration.spec.ts \
        tests/fixtures/lead-team-journal.json tests/e2e/mount-smoke.sh \
        vitest.config.ts .github/workflows/ci.yml docs/VALIDATION.md ; do git cat-file -e HEAD:$f ; done
  → 全部 ✓（mount-smoke.sh 权限位 100755 保留）

# 关键：提交的 lib/ 必须就是「当前源码重建出来的 lib/」（字节级，我全量重建后比对）
$ md5 -q lib/index.js lib/client.js        → 6ca68c2896a0801ca76b20dc9c9bfc6b / c9083d8b1e4e0beb92f2154a863b65e7
$ pnpm run build && md5 -q lib/index.js lib/client.js   → 与上面逐字一致
$ git status --porcelain -- lib             → 空（重建后无任何改动）

$ pnpm run test    → 14 files | 338 passed | 1 skipped (339)
$ pnpm run check   → exit=0（整条 gate：typecheck → test → build → verify:build → verify:meta → git diff HEAD -- lib 全绿）
$ wc -c lib/index.js lib/client.js → 40502 B（39.6 KiB）/ 71996 B（70.3 KiB）
```

结论：**F1 已关闭且是字节级关闭**（提交产物 == 当前源码重建产物），F7 的「必须带 HEAD」在提交前后都给出正确信号（提交前 1、提交后 0）。`docs/INSTALL.md` 随后由 Lead 提交为 `517f23d`；此后工作区唯一未提交项是**本文件**（§1.1 与 §5/§6 的这次定稿）。

## 1.2 真机挂载冒烟（Lead 执行，verify 只记录、未执行）

Lead 在 **scratch home**（不碰用户真实 `~/.dsh`）完成冒烟；我**没有**执行 `tests/e2e/mount-smoke.sh` 的 `mount`/`unmount`，因此下表「证据」列写的是 Lead 报给我的一手观察，命中状态由我按 A1–A11 断言表逐条判定。**推断命中的项我都标了「推断」**，没有把推断当成实测。

| # | 断言点 | 判定 | 证据 / 说明 |
|---|---|---|---|
| A1 | profile bundle 栈出现本插件 | ✅ | 在 scratch 组合中安装后 tab 出现、路由可答；安装本体未逐步取证 |
| A2 | 启动日志无 `disabling profile plugin` | ✅（**推断**） | 未被禁用 ⇒ 预检通过；Lead 未直接贴启动日志行 |
| A3 | 浏览器半被下发且首行是 `window.__ModuleLoader__.load({ id: "dsh-task-gantt"` | ✅（**推断**） | 面板真实挂载 ⇒ 宿主 materialize 了 `lib/client.js`；未单独抓 `/plugins` 响应体 |
| A4 | `POST /api/ping` → `{ok:true,value:{apiVersion:1,host:'dsh-task-gantt'}}` | ✅ | 探针输出：`apply entered; webServer= undefined`，改 `ctx.inject` 后 `POST /dsh-task-gantt/api/ping` **立刻**返回 `{"ok":true,…}` |
| A5 | `/api/timeline` 200，`source ∈ log/partial/live`，`notes` 是数组 | ✅ | 200，`source: log`，6 张任务卡带**真实时间戳** |
| A6 | 跨源请求 403 | ❓ | 冒烟未做该负例（单测已覆盖 403/405/404/400，见 `tests/host-route.spec.ts` 28 例） |
| A7 | `+` 菜单出现「任务甘特图 / Task Gantt」 | ✅ | Lead 观察：tab 出现在 `+` 菜单并可打开 |
| A8 | 面板渲染泳道与任务卡 | ✅ | `div[data-dsh-task-gantt]` 挂载，`[class*="dtg-"]` **1085** 个节点；**7 条泳道**（lead / packaging / host-data / shell / ui / verify / docs）；**6 张任务卡**带真实时间戳 |
| A9 | 无 agent team 的会话里降级为空态而非报错 | ❓ | 冒烟未覆盖该场景 |
| A10 | 硬刷新后仍正常 | ❓ | 冒烟未做（只跑了 A11 之外的挂载路径） |
| A11 | 卸载后 tab 消失、无残留下载错误 | ❓ | `unmount` 未执行（脚本里的分支我未跑） |

截图（Lead 提供，我确认文件存在）：`/Users/lzx/Documents/GitHub/dsh-task-gantt/docs/screenshots/panel.png`（142 625 B）、`panel-compact.png`（117 674 B）。

**仍未验证（冒烟之外）**：实时增量刷新与 live `agentTeams` 投影路径（Lead 起过最小 team 但未观察到新 team 形成，**不计入已实测**）；`git diff --exit-code -- lib` 之外的真机反代子路径与桌面壳 `dsh-app://` 路由（仅单测覆盖，见 `tests/client-api.spec.ts`）。

---

## 2. 环境（实测值）

| 事实 | 值 | 怎么测的 |
|---|---|---|
| node / pnpm | v22.22.2 / 11.22.0 | `node -v`、`pnpm -v` |
| vitest | 3.2.7 | `node -e "console.log(require('./node_modules/vitest/package.json').version)"` |
| `@deepseek-ai/cordis` | 4.0.4（本仓库 dev tree 内） | `node_modules/@deepseek-ai/cordis/package.json` |
| jsdom | **未安装**（也不需要，见 §3.3 与 ❓9） | `ls node_modules/jsdom` → No such file or directory |
| react / react-dom | **未安装**（由宿主 `PLATFORM_MODULES` 提供，测试用 stub 别名） | `ls node_modules/react` → No such file or directory |
| 宿主 DSH 版本 | 0.2.0-rc.2（**Lead 的 scratch 组合**，用于探针与真机冒烟） | Lead 报告（我未复跑该组合） |
| `allowBuilds` 是真实存在的 pnpm 11 workspace 键 | ✅ | `grep -o 'allowBuilds[^,;)]\{0,60\}' ~/.nvm/…/pnpm/dist/pnpm.mjs` → 含 `"allowBuilds" in your project's pnpm-workspace.yaml to allow it to run its …` |

---

## 3. 我写的测试（14 个 spec / 331 用例）

写入范围（本任务独占）：`/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/**`、`/Users/lzx/Documents/GitHub/dsh-task-gantt/vitest.config.ts`、`/Users/lzx/Documents/GitHub/dsh-task-gantt/.github/workflows/**`、本文件。

| 文件（绝对路径） | 用例 | 覆盖 |
|---|---|---|
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/contract.spec.ts` | 39 | 冻结字面量（`API_VERSION=1` / `TAB_TYPE_ID='dsh-task-gantt:board'` / `ROUTE_PREFIX`）；`contract.ts` 零 import；**`assertTimeline` 的 27 条反例**（缺字段、spans/history 乱序、deleted 任务、laneId 指向不存在的泳道、lane.tasks 与 tasks 不一致、重复 id…） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/helpers/timeline-assert.ts` | — | 契约运行时校验器（helper，非用例） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/manifest.spec.ts` | 17 | 市场规则（三个依赖字段无 `cordis`、无 install 生命周期脚本）；`peerDependencies` 只有 `@deepseek-ai/cordis`（brief §2.3）；`exports["./client"]` 为字符串或 `{default:string}`；`dsh.client.platform==='web'`；`dsh.bundle.patch` 存在且安全；`files[]` 内文件都在 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/theme.spec.ts` | 37 | 扫描 `src/client/**`（含 ui 的 CSS 字符串）零硬编码颜色；**扫描器双向标定**：14 条必须红（hex/rgb/hsl/oklch/颜色名/非主题 var）+ 17 条必须绿（token、`transparent`/`currentColor`/`inherit`、`color-mix(var(--dsw-*))`、注释里的字面量） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/i18n.spec.ts` | 19 | zh/en 客户端词典 key 集合完全一致；源码里每个 `t('…')` 都是已声明 key；语言探测（`document.lang` → `navigator.language` → en，用 stub + `vi.resetModules`，**不需要 jsdom**）；`locale/en.json` 与 `locale/zh.json` 结构一致且真的翻译过 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-route.spec.ts` | 28 | 用假 `req`/`res` 打真实 handler：200/400/403/404/405、同源判定优先于方法判定、query 路径、分两块到达的 body、`ctx.get` 抛异常时仍返回信封且绝不外抛 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-timeline.spec.ts` | 21 | `buildTimeline` 降级矩阵（8 种恶意 ctx：无服务、`get` 抛异常、`sessions.list()` 抛、`sessionPersistence.open()` reject、`handle.read()` reject、`agentTeams.listMembers()` 抛…）：绝不抛异常、响应始终过契约校验、`source ∈ live|partial` 且 `notes` 非空 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-fold.spec.ts` | 59 | 折叠容错：缺 `turn/start`、缺 `step/end`（`end:null`）、乱序输入等价、`time` 相等按 `seq` 稳定、孤儿 `step/end` 不生成 span、第二个 `step/start` 把上一个收成 0 长度（**永不为负**）、缺 `time` 事件被丢弃并计数、`turn` 带在 `step` 之前；队日志回放（created→claimed、revision 回退被跳过、roster 相位、`mid-stream` 首快照）；工具调用映射与 CAS 归因；`dateTaskFromToolCalls` 拒绝有歧义的 create；**40 轮伪随机语料**验证不抛异常 + 不变式 + 确定性；F2 的 catalog-first 成员索引用例（host-data 修好后由 `it.skip` 转正，见 §5 F2） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-integration.spec.ts` | 13 | **跑在真实日志 fixture 上**的端到端：`tests/fixtures/lead-team-journal.json`（234 条事件，逐字取自本机 Lead 会话日志）+ 假的 `agents`/`sessionPersistence`/`agentTeams` 服务 → 泳道/任务/归因/降级 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-mount.spec.ts` | 8 | 宿主半挂载：`webServer` 已在 → 注册 `prefix` 路由到 `ROUTE_PREFIX` 且 handler 真能答 `/ping`；`webServer` **尚未挂载** → 走 `ctx.inject(['webServer'],…)` 延迟注册；无动态 inject → 仅告警不抛；register 抛异常不被吞 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/layout.spec.ts` | 39 | 纯函数布局：窗口解析（live 钉在 now / 历史窗口覆盖全部数据 / duration≥1）、缩放钳制、tick 步长/对齐/`MAX_TICKS` 截断、`formatClock` 时区、泳道 y 堆叠、span 几何（open 延到 now、`MIN_SPAN_PX`）、`scrollLeft`→`viewX`、cull、任务卡（history vs live、min/max 宽度、`unplacedTaskIds`）、消毒与确定性 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/client-api.spec.ts` | 14 | 路由解析：反代子路径 `https://h/dataops/proxy/3080/` 必须得到 `…/3080/dsh-task-gantt/api/timeline`（**保留页面前缀**）、`dsh-app://app/`、`__DSH_TRANSPORT__.streamBaseUrl` 优先、注入的 `routeBase` 最优先、无 base 时退回文档相对路径；`postJson` 信封/非 JSON（`ApiHttpError.status`）/`signal` 透传 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/client-tab.spec.ts` | 15 (+1 skip) | 真实 `apply()` + 记录型服务：`registerTab` 恰好一次、id=`TAB_TYPE_ID`、title/description 取自词典、单实例（`single` 或等价的 `dedupeKey`）、图标渲染出 `currentColor` 且无颜色字面量、component 在 `visible:true/false` 下都能调用；**better-sidebar 晚到**时经 `ctx.inject` 回调补注册；无 `ctx.inject` 的老 ctx 只告警不抛；重复注册抛错被降级为告警 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/bundle.spec.ts` | 16 | 产物守护：`lib/client.js` 首行 `window.__ModuleLoader__.load({ id: "dsh-task-gantt", factory: (require) => {`、末行 `return module.exports; } });`、`require("react")` 外置、**没有内联 React**、只有 1 次 `load`；`lib/index.js` 是 ESM 且 `export { apply, inject, name }`、0 个 `require(`、不含 `__ModuleLoader__`；两个 `.map` 是 v3；**按宿主 `CLIENT_CHUNK` 正则守住按需分块文件名**（见 §4 事实 11） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/ci.spec.ts` | 14 | **两个门都守**：`.github/workflows/ci.yml`（先剥注释行，避免注释文字满足断言）→ ubuntu-latest、node 20/22、`--frozen-lockfile`、typecheck→test→build 顺序、`verify` 必须在 build 之后、build 之前不得出现任何 lib/ freshness diff、**freshness diff 必须带 `HEAD`**；`package.json#scripts.check` → 同一条 `analyzeFreshnessScript` 分析（HEAD-based、顺序、五步齐全），并对分析器本身做反例标定（index-based / 顺序反转 / 缺步骤都能识别） |

### 3.3 为什么不用 jsdom（决策与代价）

- 宿主把 React 作为**平台模块**下发，本包不依赖 React；`vitest.config.ts` 把 `react` / `react/jsx-runtime` 别名到 `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/stubs/react.ts`，因此能**调用**组件函数并检查返回的元素树，但**不渲染**。
- 因此：组件的**真实渲染**（滚动、点击、详情面板）由 ❓1 的真机冒烟覆盖，不由单测覆盖。`ui` 已提示：在 stub 下 `GanttChart` 的 viewport 恒为 `{width:0,height:0}`，所以几何断言都直接打在 `layoutTimeline` 上（这也是它设计成纯函数的原因）。

---

## 4. 我独立核验的一手事实（不是复述作者结论）

| # | 事实 | 出处/命令 |
|---|---|---|
| 1 | Lead 会话日志里**存在** `team/task`(11) 与 `team/member`(12) 事件——brief §3.4「本会话日志里没有 team/*」是**旧会话**的实测，对 team 会话不成立 | `unzstd -c …/session-4d51254b-…/session.v4.jsonl.zstd > /tmp/lead-session.jsonl`（647 行）后按 type 计数 |
| 2 | `data.task` 的真实 key 恰为 7 个：`blockedBy, description, id, revision, status, subject, writeScopes` —— **没有** `ownerName`/`ownerId`/`ready` | 同上，逐条解 JSON |
| 3 | `data.member.id` 就是 teammate 的**子会话 id**，与 `~/.dsh/sessions/…/<id>/` 目录名逐一对应（6 个都对上） | 日志与目录名比对 |
| 4 | 真实日志里 `team/member`(provisioning) **先于** 同 id 的 `subagent/catalog`（6/6） | 按 seq 排序输出 |
| 5 | teammate 自己的日志**没有** `team/*` 事件，但**有** `tool/call name="team_task_update"`，`data.arguments` 是 JSON 字符串（如 `{"task_id":"task-5","expected_revision":1,"action":"claim"}`） | `unzstd -c …/f828dda6-…/session.v4.jsonl.zstd` |
| 6 | 宿主 `clientModules`（在 app.asar 内）对客户端半的解析：`dsh.client.platform` 必须是 string；`exports["./client"]` 必须是字符串或 `{default:string}`，否则抛 `declares dsh.client but exports no "./client" bundle`；`dsh.client.inject` 是可选字符串数组，**未知名字在浏览器侧被静默跳过**（`const dependency = this.graphRows.get(packageName); if (dependency !== void 0) …`） | 解析 `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar` 头后提取 `dsh/node_modules/@deepseek-ai/dsh-client-modules/lib/index.js`、`lib/client.js` |
| 7 | 已上架三方插件 `dsh-code-nav` 的客户端半确实是 `const inject = ["betterSidebar","locale"]` 且直接 `ctx.betterSidebar.*` | `~/.dsh/profiles/web/node_modules/dsh-code-nav/lib/client.js` |
| 8 | cordis 4.0.4 `ctx.inject(deps, callback)` = 「Run a callback once the requested services are available … unloaded and re-run whenever a required service changes」→ 本仓库 client/host 两半用它消除激活顺序竞态是**有依据的** | `node_modules/@deepseek-ai/cordis/lib/types/registry.d.ts:100-113` |
| 9 | `pnpm pack --dry-run` 的 tarball **包含** `locale/en.json`、`locale/zh.json`（display locale 不会漏发） | `pnpm pack --dry-run` 输出清单 |
| 10 | `lib/index.js` 的挂载点现行实现是「检测到 `webServer` → 同步 `ctx.effect(register)`；未检测到 → `ctx.inject(['webServer'], scoped => scoped.effect(register))`；无动态 inject → 仅告警」。我用假 ctx 覆盖了这四条路径；**改动者未知**（host-data 书面确认不是他：他 task-2 交付的是一次性 `ctx.get('webServer')` 探测版本），且「live composition 实测 webServer 尚未挂载」这句话我**没有独立复测**——见 §6 ❓11 | `/Users/lzx/Documents/GitHub/dsh-task-gantt/src/host/index.ts` + `tests/host-mount.spec.ts`（8 用例） |
| 11 | 宿主 `clientModules` 的按需分块命名门：`const CLIENT_CHUNK = /^client\.[A-Za-z0-9][A-Za-z0-9._-]*\.js$/`，注释原文 *"Published package-local client chunk names accepted by the on-demand route."*；`registration.chunk` 存在且不匹配就 throw。本插件不传 `chunk`，故不触发；已加守护用例固定这条约束 | 我一手提取同一份 `app.asar` 内 `@deepseek-ai/dsh-client-modules/lib/index.js` 后 grep `CLIENT_CHUNK`（与 packaging 的独立结论一致） |
| 12 | 宿主对插件资源的缓存键**只看文件元数据、不看内容**：`artifactRevision(baseline) = framedHash("plugin-artifact", [mtimeMs, ctimeMs, size])`，注释 *"Identify an entry's build from filesystem metadata without hashing its contents."* → 重建会失效缓存；「内容变了但 mtime/ctime/size 没变」不会失效 | 同一份宿主 bundle，grep `artifactRevision` |
| 13 | `lib/` 只有 `client.js`(71996 B)、`client.js.map`、`index.d.ts`、`index.js`(40504 B)、`index.js.map`，没有额外 chunk 文件；全部 mtime 落在最后一次构建 | `ls -la /Users/lzx/Documents/GitHub/dsh-task-gantt/lib` |
| 14 | **构建幂等**（packaging 的说法，我独立复现）：重建前后 `md5 -q lib/index.js lib/client.js` 字节一致，`git diff --stat -- lib` 也仍是同一组 `4 files changed, 2871 insertions(+), 197 deletions(-)` → 产物严格晚于全部源码且重建不产生新差异 | `md5` 前后对比 + `git diff --stat` 前后对比 |

---

## 5. 发现清单（谁的代码、什么证据、建议怎么改）

### F1（packaging / Lead，**提交前必修**）HEAD 里的 `lib/` 落后于源码

- 证据：重建后 `git diff --exit-code HEAD -- lib` → `exit=1`，`git diff --stat -- lib` = `4 files changed, 2871 insertions(+), 197 deletions(-)`。CI 的 `verify` 步骤是 `pnpm run build && pnpm run verify:build && git diff --exit-code HEAD -- lib`，所以**在 `lib/` 被提交之前 CI 必红**。
- 说明：`lib/` 是**故意提交**的（`.gitignore` 注释：bundle 通道从 GitHub 直装、无构建步骤）。这不是代码缺陷，而是发布/CI 前置条件。
- 建议：`cd /Users/lzx/Documents/GitHub/dsh-task-gantt && pnpm run build && git add lib && git commit`；之后 `git diff --exit-code HEAD -- lib` 应 `exit=0`（注意必须带 `HEAD`，理由见 F7）。
- **处置（packaging 已认领，commit 由 Lead 执行）**：packaging 核出 HEAD 的 `lib/index.js` 只有 4526 B（还是 `notes: ["timeline derivation not implemented yet"]` 的脚手架占位），工作区是当前源码真产物；并给出「产物晚于全部源码 + 重建 0 变化」的幂等证据。**我独立复现了幂等性**（§4 事实 14：重建前后 md5 与 diff 统计都不变）。结论：这是纯粹的提交动作，`git add lib` 后即绿，不需要改任何字段。packaging 已把命令写进 `docs/INSTALL.md` §9。
- **已关闭（2026-10-11，commit `f7a7263`）**：Lead 提交后我在**已提交的树**上复验——`git diff --exit-code HEAD -- lib` → `exit=0`；且提交的 `lib/` 与「当前源码重新 build 出来的 `lib/`」**md5 逐字一致**、重建后 `git status --porcelain -- lib` 为空（字节级新鲜，见 §1.1）。唯一的未提交项是 `docs/INSTALL.md`（packaging 的文档记录）。注意：**任何人再改 `src/**` 并 build，F1 会以 `exit=1` 复活**，这是正确告警。
- **提交前的插曲（历史记录，已过去）**：host-data 曾在验证构建幂等时执行过 `git add -A -- lib`（`git status --porcelain -- lib` 曾显示 `M `，第一列已暂存），这也正是 F7 假绿被触发的时刻；该状态已由 commit `f7a7263` 终结。**只要再有人改 `src/**` 并 build，F1 会以 `exit=1` 复活**（正确告警），届时按 §7 顺序重跑并把 `lib/` 一并提交。

### F2（host-data，**已修复**，原 skip 用例已转正）`memberIdByName` 在 catalog-先-于-member 的顺序下漏索引

- 原证据（我实测，非推断）：`foldTeamEvents([subagentCatalogEvent(childId:'m-1'), teamMemberEvent(id:'m-1',name:'ui')])` → `memberIdByName = []`，而 `memberById.get('m-1').name === 'ui'` 正确。原因：`subagent/catalog` 分支先建了 placeholder record，之后 `team/member` 分支因为 `record !== undefined` 跳过了唯一写入 `memberIdByName` 的代码块。
- 影响面：`src/host/timeline.ts` 的 `laneIdFor()` 用 `memberIdByName.get(ownerName)` 把 board 的 owner 映射到泳道；`agentTeams` 不可用（board-less 降级路径）且 catalog 先到时，该成员的任务会落到 `unassigned` 泳道而不是本人泳道。实测的真实日志里 6/6 都是 member 先到，且 live 投影会独立补索引，所以当时**不可见但是真实缺陷**。
- **修复（host-data，`src/host/fold.ts:620-624`）**：`memberIdByName` 的写入移出 `record === undefined` 分支，改成「name 已知且未映射就补」，`first-name-wins` 语义保留，并额外支持重命名后旧名/新名都解析到同一 id。
- **我的复核**：`pnpm exec vitest run tests/host-fold.spec.ts -t "indexes a member name"` → `Tests 1 passed | 58 skipped`（即该用例由红转绿）；全量 338 passed / 1 skipped（含提交后复验，见 §1.1）。
- **流程记录（透明）**：host-data 把 `tests/host-fold.spec.ts` 尾部那条 `it.skip` 改成 `it`（他们的说法是我在消息里书面授权「修好后去掉 skip」）。这是对我独占写入范围的越界修改。我逐行核对过：**只动了 `it.skip`→`it` 一个 token 与该段注释措辞，断言体与我的原文完全一致**；此后全量仍绿，故我接受这个改动并保留。若以后再需要我解除 xfail，请只发消息、由我改。

### F3（ui，已由 owner 在并行工作中修掉，仅作记录）`TaskCardRect.clippedRight` 曾是不可达字段

- 过程：我 00:29 的用例断言 `clippedRight === true`（历史超出窗口）失败；00:30 我再读文件时该字段已被移除，文件头注释改为「no 'clipped' flag is needed」。我的用例已改成断言**可观测几何**（`x + w <= dataWidth`，以及画布窄于卡片时 `x + w > dataWidth` 的可达溢出）。
- 结论：现在没有这个字段，也没有这个坑；记录在此是为了说明验证过程真的抓到了它。

### F4（ui，提醒，非缺陷）颜色名规则：本仓库比官方更严，且已排除误报

- `ui` 指出 `white-space: nowrap` 之类会被「颜色名一律红」误伤。我的扫描器**只对 paint 属性**（`color/background/border*/fill/stroke/box-shadow/…`）做颜色名判定，`white-space` 不在清单里；实测 `src/client/ui/styles.ts` 的 12 处 `white-space` 全部未触发（37 个主题用例全绿）。
- 与官方口径的差异（已知并接受）：`dsh-better-sidebar/tests/theme.spec.ts:101-160` 只扫 `#hex`/`\brgba?\(` 与 `color:` 声明；我还额外扫颜色名和非主题 `var()`，更严。若以后出现误报，先看是不是 paint 属性的真实字面量。

### F5（`src/host/index.ts`，**改动者未知**；行为已验证，真机前提未验证）宿主半的 `webServer` 时序

- `src/host/index.ts` 现行实现：`webServer` 已在 → 同步 `ctx.effect(register)`；未在 → `ctx.inject(['webServer'], scoped => scoped.effect(register))`；无动态 inject → 仅告警。
- 我用假 ctx 覆盖了这四条路径（`tests/host-mount.spec.ts`，8 用例全绿），包括「延迟回调触发后才真的能答 `/ping`」。这比 brief 里假设的「apply 时同步注册」更稳，但它**只证明了实现的四条分支行为**。
- **归属更正**：我最初在给 host-data 的消息里把这次改动记成他的，是错的——host-data 书面确认他 task-2 交付的是「一次性 `ctx.get('webServer')` 探测」版本，改动者未知（疑为 Lead 或 packaging）。他复核后接受现行实现。
- **同时更正一句我的话**：我先前写「live composition 实测 webServer 尚未挂载」时，它只是该实现的注释依据（我未复测）。**该前提已于 2026-10-11 由 Lead 用 scratch 探针实测闭环**（`webServer= undefined`，见 §6 ❓11 与 §1.2 A4）；给出证据的是 Lead，我仍未复跑探针，我独立验证的是四条行为路径。

### F6（info，无缺陷）board-less 路径的 `ready` 重算没有前向引用问题

- 我怀疑 `draftFromSnapshot` 在增量 `snapshots` 上算 `ready` 会把「先建的后依赖」判错，于是构造了 `task-B(blockedBy:['task-A'])` 先出现、`task-A` 后建并 completed 的日志。实测 `task-B.ready === true`——因为 `deriveTimeline` 在 board 不可用时**用完整快照数组重算了一遍**。假设被实验否定，不是缺陷。

### F7（**我自己的 CI/门禁缺陷**，已修）不带 revision 的 `git diff --exit-code -- lib` 在 `git add lib` 之后假绿

- 触发：host-data 为验证构建幂等跑了 `git add -A -- lib`，我随即发现我原来的 freshness 检查比的是**工作区 vs 索引**：
  ```
  $ git status --porcelain -- lib      → M  lib/client.js …（第一列 M = 已暂存，第二列空 = 工作区干净）
  $ git diff --exit-code -- lib        → exit=0   ← 假绿！HEAD 里的 lib 还是 4526 B 的脚手架
  $ git diff --exit-code HEAD -- lib   → exit=1   ← 正确暴露
  ```
  反证：故意给 `lib/client.js` 追加一个字节后两种写法都返回 1（差别只在「已暂存但未提交」这个状态），随后 `git restore lib/client.js` 已复原。
- 危害：这条门存在的唯一目的就是拦住「提交的产物 ≠ 源码」。一旦有人 stage 过构建产物，它就在**恰好的时机**变成绿灯，而 CI（checkout 后 index == HEAD）反而会红 —— 本地说绿、CI 说红，最容易被误判成「CI 环境问题」。
- 修复（我的文件）：
  1. `.github/workflows/ci.yml` → `pnpm run verify:build && git diff --exit-code HEAD -- lib`；
  2. `tests/ci.spec.ts` 增加断言（workflow：**freshness diff 必须带 `HEAD`**、不得出现不带 revision 的写法；`package.json#scripts.check`：同一条 `analyzeFreshnessScript` 分析 HEAD-based + 顺序 + 五步齐全），并对分析器本身做反例标定（index-based / 顺序反转 / 缺 freshness / 缺步骤都能识别）→ 用例数 9 → 14；
  3. `tests/e2e/README.md` 前置命令、本文 §1/§7 同步。
- **同类写法已由 packaging 修掉**（他们的文件，我只读）：
  1. `package.json:65` 的 `check` → 已改为 `… && git diff --exit-code HEAD -- lib`；
  2. `docs/INSTALL.md` §9（提交后行号：§9 起于 `:326`，命令在 `:334`）→ 已改带 `HEAD`，并把我的实测原文写成 ⚠️ 段（`:337` "The `HEAD` is load-bearing"）；`:346-347` 保留的裸写法是**故意展示的反例文本**，不是可执行命令。
- **packaging 另加了同源门禁**：`scripts/verify-build.mjs` 末尾第 4 组检查，断言 `package.json#scripts.check` 含 `git diff --exit-code HEAD -- lib` 且不含 index-based 写法（CI 里 `verify:build` 必经）。我读了这段代码（`:249-263`）确认断言内容与失败文案。
- **我的独立正反实证（`scripts/verify-build.mjs`，打包 script，包装在隔离副本里跑，**没有碰仓库任何文件**）**：
  ```
  $ mkdir -p /tmp/vb/scripts && cp scripts/verify-build.mjs /tmp/vb/scripts/
  $ ln -s <repo>/{lib,src,locale,docs,icon.svg,cordis.patch.yml,…} /tmp/vb/   # 只复制 package.json
  $ cp package.json /tmp/vb/package.json && node /tmp/vb/scripts/verify-build.mjs ; echo $?   → 0
  $ （把 check 改回 index-based 后）node /tmp/vb/scripts/verify-build.mjs  → FAIL (2), exit=1
      - …must verify lib/ freshness with `git diff --exit-code HEAD -- lib`…
      - …contains an index-based `git diff --exit-code -- lib` …
  $ （把 freshness 步骤整体删掉后）→ FAIL (1), exit=1
  ```
  `root = dirname(script).replace(/\/scripts$/, '')`，所以隔离副本能完整跑通；仓库内 `package.json` 全程未被修改（结束后 `grep -c "git diff --exit-code HEAD -- lib" package.json` = 1，`/tmp/vb` 已删除）。
- **决策记录**：packaging 问我是否把该断言从「只读 workflow」扩到「同时读 `package.json`」。我采纳 **(b) 两边都守**——测试是显式回归网，不该依赖「CI 一定会跑到 verifier」这一间接性；已实现在 `tests/ci.spec.ts` 的 `describe('package.json#scripts.check (the local equivalent of CI)')`。

---

## 6. 未验证假设（❓ 清单，逐条说明谁该验证）

> 状态更新（2026-10-11 定稿）：第 1 条已由 Lead 的 scratch 冒烟**部分闭环**（命中判定见 §1.2，A6/A9/A10/A11 仍是 ❓）；第 11 条已由 Lead 的探针**闭环**；其余条目仍然开放。**任何一条都不得当成"已实测"引用**，除非状态栏写明并给出证据。

1. ❓（**部分闭环**）**真机挂载冒烟**：Lead 已在 scratch home 执行并命中 A1–A5、A7、A8（见 §1.2 表），我**没有**运行过 `mount`/`unmount`。仍开放：**A6**（跨源 403 负例）、**A9**（无 team 会话的降级空态）、**A10**（硬刷新）、**A11**（卸载后 tab 消失）。脚本与断言表：
   `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/README.md`、`/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/mount-smoke.sh`（`check|mount|verify|unmount`，`check` 是只读预检）。
2. ❓**CI 未在 GitHub 上跑过**。`.github/workflows/ci.yml` 只做了静态守护（`tests/ci.spec.ts` 14 条）+ 本地等价命令实测：`pnpm run typecheck` / `pnpm run test` / `pnpm run build` / `pnpm run verify:build` 都跑过且通过；`pnpm install --frozen-lockfile` **没有**在干净目录验证过（本机 `node_modules` 已存在），`actions/setup-node` 的 pnpm cache 行为也未验证。
3. ❓**`pnpm run verify:meta` 是由 packaging 写的脚本**，我跑了并记录输出（✅ exit=0），但我没有独立复算它对宿主 `readPluginMeta()` 的转写是否逐条正确。
4. ❓**`team/task` 的 `completed` / `reopen` 迁移在真实日志里从未出现过**（全队目前只有 `pending → in_progress` 的样本）。我的用例使用构造事件覆盖了这两条迁移；真实样本仍是空白。
5. ❓**`dsh.client.inject` 非空的真实行为未验证**：本包按 brief §2.2 保持 `[]`。我从宿主 bundle 读出「未知名字被静默跳过」，但**没有**用真实 profile 跑过一次非空数组。
6. ❓**`ctx.inject` 的 unload/re-run 语义只在 fake ctx 上验证过**：真实的「服务消失→回调 fiber 被卸载→路由撤销」没有真机验证。
7. ❓**降级态下的 `source: 'log'` 与空泳道组合**：我的集成测试里，一个 journal 认识但（假）持久化返回空事件数组的成员，会出现 `hasHistory:false` + 空 `spans` + `source:'log'`。契约对 `hasHistory` 的定义是「false = live/**empty**」，因此我判定为一致、不报缺陷；真实 `sessionPersistence.open()` 对空会话是返回空数组还是 reject，**未验证**。
8. ❓**主题契约只扫源码**：`scripts/verify-build.mjs` 另有一份对**构建产物字符串字面量**的颜色扫描（我跑过，输出无 notes）。两份扫描都是启发式，可能存在双方都漏掉的颜色写法（例如拼在模板字符串里的十六进制）。
9. ❓**没有 DOM 渲染测试**：见 §3.3。面板真实布局、滚动、`-webkit-app-region`、样式注入的样式归属（`claimStyles`）都只由真机冒烟覆盖（§1.2 命中 A8 的「1085 个 `dtg-` 节点」属于此类覆盖）。
10. ❓**`src/host/dev-verify.mts`（host-data 的自检脚本）我没有运行**；我只运行了 `pnpm run verify:build` / `pnpm run verify:meta` 与自己的 vitest 套件。host-data 报其 27 条断言 `ALL CHECKS PASSED`，我未复跑。
11. ✅（**已闭环，2026-10-11 Lead 一手实测**）**「live composition 下 `apply()` 时 `webServer` 尚未挂载」现在可以当实测事实引用**：Lead 在 scratch 组合（DSH 0.2.0-rc.2）里给已安装的 host 半加探针，实测输出 `DTG_PROBE apply entered; webServer= undefined`；改成 `ctx.inject(['webServer'],…)` 后 `POST /dsh-task-gantt/api/ping` 立刻返回 `{"ok":true,…}`。
    - 更正历史：这句话我最初是从 `src/host/index.ts` 的注释里读来并当成既成事实引用（措辞越界，已更正过一次）；现在由 Lead 用探针补上了证据，归属与证据都清楚。**证据提供者 = Lead，我没有复跑这个探针**；我独立验证的仍是 `tests/host-mount.spec.ts` 的四条行为路径（8 用例）。
12. ❓**`subagent/catalog` 的 `data.label` 是任务描述而不是成员名**（host-data 结论），所以 catalog-only 成员的 lane `name` 会退化成子会话 id。我没有独立核对过 `label` 的真实语义；若 ui 要展示可读名字，需要另找来源。
13. ❓**`hasHistory` 目前是二态**（host-data：日志读到 **且** 折出 ≥1 个 span 才为 true；契约写的是 "false = live/**empty**"）。我在集成用例里确实观察到「journal 认识该成员 + 假持久化返回空事件」→ `hasHistory:false` + 空 spans + `source:'log'`，按契约判定一致、未报缺陷。若要区分「无日志 / 有日志但无活动 / 有活动」三态，需要 Lead 改冻结契约（host-data 说已挂在 Lead 决策清单上）。
14. ❓**实时增量刷新与 live `agentTeams` 投影路径从未被观察到**：Lead 在 scratch 组合里启动过最小 team，但**没有观察到新 team 形成**，所以「面板随时间推进自动出现新泳道/新任务卡」这条路径**不计入已实测**（构造 fixture 的集成用例覆盖的是数据推导，不是真机实时刷新）。

---

## 7. 复现方式（任何人在干净 checkouts 上都能重跑）

```bash
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
pnpm install --frozen-lockfile
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run verify:build
pnpm run verify:meta
git diff --exit-code HEAD -- lib # 需要 lib/ 已提交（见 F1）；必须带 HEAD，否则 git add 后假绿（见 F7）
```

只跑某一块：

```bash
pnpm exec vitest run tests/host-fold.spec.ts tests/host-integration.spec.ts   # 数据层
pnpm exec vitest run tests/layout.spec.ts tests/theme.spec.ts tests/client-api.spec.ts tests/client-tab.spec.ts  # 浏览器半
```

真实日志 fixture 的来源（可重新生成）：

```bash
unzstd -c ~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-task-gantt--/session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99/session.v4.jsonl.zstd > /tmp/lead-session.jsonl
# tests/fixtures/lead-team-journal.json = 该文件的 session header + 全部 turn/step 事件 + 全部 team/* 事件
# + 全部 team_task_* tool/call；仅把超长人读文本（subject/description/label）截到 90 字符，
# keys / seq / time / status / revision / id / 事件顺序原样保留。
```
