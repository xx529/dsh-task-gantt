# VALIDATION — 实际跑过的命令与原始证据（owner: verify）

> 本文件只记录**我（verify）实际执行过**的命令与输出摘要。没跑过的，一律标 ❓ 并说明谁该跑。
> 所有路径均为绝对路径。工作区：`/Users/lzx/Documents/GitHub/dsh-task-gantt`。
> 生成时间：2026-10-11（本机时区 Asia/Shanghai）。执行者：teammate `verify`。

---

## 1. 结论摘要（最后一次全量运行）

| 门 | 命令 | 结果 | 原始证据 |
|---|---|---|---|
| 类型检查 | `pnpm run typecheck` | ✅ `typecheck_exit=0`（`tsc -p tsconfig.json --noEmit`，无任何输出） | `/tmp/gate2.txt` |
| 单测 | `pnpm run test` | ✅ `Test Files 18 passed (18)` / `Tests 479 passed | 1 skipped (480)`（2026-10-12 01:20 复跑；见 §1.4–§1.9） | 01:20 复跑 |
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

## 1.2 真机冒烟（Lead 执行，verify 只记录、未执行）

**平台**：web profile 实例 19501，DSH 0.2.0-rc.2 + better-sidebar 0.25.0。Lead 实测并交付原始数据，我（verify）**没有**执行过 `mount`/`unmount`，本节全部标注来源。

### 本轮 7 项实测（Lead 提供，我逐项判定）

| # | 数据 | 判定 |
|---|---|---|
| 1 | `[data-build]` = `"build 2026-10-12 · tracks+peer-color"` | ✅ 确认部署的是含本轮修复的产物 |
| 2 | `data-msg-direction` 分布 = `{ incoming: 8 }`（**outgoing 0**） | ❓ **未通过** —— 见下"真机发现" |
| 3 | `.dtg-msg-out` / `.dtg-msg-in` = `0 / 8` | ❓ **未通过**（与第 2 项同一现象） |
| 4 | `.dtg-msg` 总数 = `8` == `0 + 8` | ✅ 计数自洽（**这正说明问题不是"没画"，而是"只画了一个方向"**） |
| 5 | 样例 `title`：`10-11 23:10 · received from you` / `10-11 23:19 · received from demo-gamma · 1 more here, not drawn`；**user marker 方向 = incoming** | ✅ 与规则 4 一致（人类发言在承载泳道上读作"收到"） |
| 6 | 泳道几何（矩形实测，泳道内局部坐标）：`lane-bg h=84`；`activity dy=4 h=8`；`message dy=16 h=11`；`task chip dy=114 h=36`；`task bar dy=127 h=10` ⇒ **activity 4–12 / message 16–27 / task 30–66 两两不相交**，chip 不越界；`114 − 84 = 30 = TASK_CARD_TOP` | ✅ 与我的**结构断言**交叉验证（我断言"三轨不相交 + 不写死 84 + `TASK_CARD_TOP === task 轨 y`"，真机数字逐条吻合） |
| 7 | 同一 `msPerPx=6.0` 下任务条宽 `2.2 / 4.1 / 5.3 / 7.3 px`（**不再是等长**）；chip 宽恒 148 且全部 `placement='right'`；无 history 的 live 标记 = `2px × 10px`（不再是 36px 柱子） | ✅ "条长=时长" 与"live 标记是点不是条"两项真机通过；与我的**单调性/下限**断言一致（2.2px 说明下限 2px 只是兜底，不是常态） |

### 真机发现（**离线全绿、真机仍错** —— 与两次 fixture 缺口同类）

第 2/3 项是**已知未过项**，但 **host 数据是正确的**：Lead 直接打路由拿到的会话（`session-48a50328-…`、`source:"log"`、4 泳道）里
```
demo-alpha laneId = b4c7baa8-…，一条 marker: from = { kind:'teammate', id:'b4c7baa8-…' }
demo-beta  laneId = 24fa5a9e-…，一条 marker: from = { kind:'teammate', id:'24fa5a9e-…' }
```
即 `from.id === laneId` 的消息**确实存在**（每条泳道都有一条来自自己），按规则应为 **outgoing**，而渲染出 0 条。已排除：部署不一致（仓库与实例 `lib/client.js` **md5 逐字节相同**）、产物缺 `bySessionId`（×3）、`laneIdOf` 未传入、泳道缺 `navigation`。

**我的独立取证（离线，先于 ui-2 的定位）**：我用**同一份真实 board** 按 `GanttChart.tsx:217-227` 的**真实构造**（`laneIds` + 由 `lane.navigation` 建的 `bySessionId` 两跳）重算方向，得到 **141 条 marker → outgoing 74 / incoming 67**，且 9 条泳道**全部带 `navigation`**。⇒ **数据与方向判定都是对的，丢失发生在"选哪些 marker 画"这一步**，从而**否证了"客户端手里的 data 与 host 不一致"这一候选解释**。（这条独立缩小了范围：不是数据、不是 `laneIdOf`，而是抽稀。）

**根因（ui-2 定位并修复）**：`decimateMarkers` 原先把**一个像素间距游标**与**一个占用集合**共用给所有方向。真实数据里"回复"天然落在它所回答的消息之后几像素，于是整条泳道的 outgoing 全部撞在已保留的 incoming 的 9px 窗口内被**系统性丢弃** —— 现象是"计数与时间都对，只有**方向层静默消失**"。修法：①间距游标与占用集合**按方向分开**（同方向仍 ≥9px，不同方向允许更近 —— 刻意取舍：宁可重叠 2px，也不能整方向消失）；②**backfill**：某方向"有数据但一条未留"时放开间距补一条；③非有限 `time` 的 span **不进候选，backfill 也不复活**。
**ui-2 的修复前后实测**（同一真实 payload）：4 泳道 `OUT 0→5 / IN 8→8`（`rendered 8→13`）；9 泳道 `OUT 5→21 / IN 21→24`（`rendered 26→45`）。**Lead 将重新部署复验第 2/3 项**，届时本节 ❓ 换 ✅。

**我的回归锁（3 条，已绿）**：`tests/layout.spec.ts`
1. **整个 cluster 落在最小间距内**（6 条 marker 挤在 6px 内）→ 两个方向都必须有保留；
   - **形状决定一切，我实测过这一点**：用"重建的旧算法（单一游标、9px）"跑同一输入 → 旧实现只留 **1** 条且方向只有 `incoming` ⇒ **本条在旧代码上必红**；而"每 4px 交替"的那种形状旧实现能留 2 条（每方向一条）⇒ **看起来等价却什么都证明不了**。这与"id 空间重合""两条读通道同源"是**同一类逃逸：决定 bug 可达性的是数据的形状，不是断言本身**。
2. **某方向将被整体抹掉时，恰好补回 1 条，且时间是原始值**（backfill 不得改写时间）；
3. **非有限 `time` 永不被复活**（ui-2 的 backfill 曾让这条红过一次 —— 说明它有牙齿）。

> 历史记录（上一轮，A1–A11 断言表）：当日冒烟命中 A1/A4/A5/A7/A8，A6/A9/A10/A11 未测；这一节现以本轮 7 项为准。

## 1.3 GitHub CI 首次真跑：红了，根因是 pnpm 大版本 → 已修（我本地用 node 20 + pnpm 10 完整复现）

**失败（Lead 一手，`gh run view 38072615574 --log-failed`）**
```
verify (node 20)  Set up pnpm   warn: This version of pnpm requires at least Node.js v22.13
verify (node 20)  Set up pnpm   Error [ERR_UNKNOWN_BUILTIN_MODULE]: No such built-in module: node:sqlite
verify (node 20)  Set up pnpm   Node.js v20.20.2
```
即 `pnpm/action-setup@v4` 的 `version: 11` 解析到 **pnpm 11.28.5**，而 pnpm 11 需要 Node ≥ 22.13（内部 `require('node:sqlite')`）→ **node 20 那一格连安装都没开始就挂了**。这也正是我 ❓2「CI 未跑过」的真实答案。

**根因的一手数据（registry packument，非猜测）**
```
curl -sS https://registry.npmjs.org/pnpm | python3 …（取 engines）
  最新 10.x = 10.34.6 → engines.node ">=18.12"     ← node 20 可跑
  最新 11.x = 11.28.5 → engines.node ">=22.13"     ← 与失败日志完全对应
  10.x 共 78 个版本；dist-tags.latest = 12.11.2
lockfileVersion: '9.0'                              ← pnpm 10 完全兼容，无需重生成 lockfile
```
**另一个只有实测才能发现的坑**：`pnpm-workspace.yaml` 用的是 `allowBuilds`（esbuild 的 install 脚本靠它放行）。
```
grep -o "allowBuilds\|onlyBuiltDependencies" <pnpm dist>/pnpm.cjs | sort | uniq -c
  pnpm 10.34.6 → allowBuilds 16, onlyBuiltDependencies 48   ← 支持
  pnpm 10.5.2  → onlyBuiltDependencies 48（无 allowBuilds） ← 不支持
```
所以 pin 必须写**确切 10.34.6**，不能只写 `10`：早期 10.x 会忽略 `allowBuilds`，进而跳过 esbuild 的 install 脚本。

**修复（我的文件）**
- `.github/workflows/ci.yml`：`version: 11` → **`version: 10.34.6`**；保留 `node: ['20','22']` 矩阵（`engines.node: >=20` 与 build 的 `target: node20` 是本仓库的声明，不能靠删格来回避）；新增步骤 **`Load the built host half on node ${{ matrix.node }}`**（`if: matrix.node == '20'`，在 Build 之后）让该声明变成可执行检查；文件头写清 pin 的理由与实测数据。
- `tests/ci.spec.ts`（14 → **19** 条）：新增 `describe('pnpm pin vs the node matrix')` → pin 必须是确切 `x.y.z`、必须能在矩阵最低的 node 下安装、`pnpmRunsOnNode20()` 反例标定（`10.34.6`✓ / `10.5.2`✓ / `11.28.5`✗ / `11`✗ / `latest`✗ / `12.11.2`✗）、load 步骤的存在/门控/断言/顺序。
- **反证**：把 pin 改回 `11` 后 `tests/ci.spec.ts` → `2 failed | 16 passed`（`"11" is a range or tag, not a reproducible version`、`pnpm 11 requires Node … so the node 20 cell would fail in "Set up pnpm" (run 38072615574)`）；还原后 `18 passed`。

**本地完整复现（等价于 CI 的整个 job，用的是 CI 日志里那个 node 版本）**
```
# 干净树 = 已提交的树；node 与 pnpm 都下到 /tmp，store 也在 /tmp（不碰 ~/.pnpm-store）
$ curl -fsSL https://nodejs.org/dist/v20.20.2/node-v20.20.2-darwin-arm64.tar.gz | tar -xz -C /tmp/node20 --strip-components=1
$ curl -fsSL https://registry.npmjs.org/pnpm/-/pnpm-10.34.6.tgz | tar -xz -C /tmp/pnpm10
$ cd /tmp/ci-clean && git -C <repo> archive HEAD | tar -x      # 74 个文件
$ PATH=/tmp/node20/bin:$PATH node /tmp/pnpm10/package/bin/pnpm.cjs install --frozen-lockfile --store-dir /tmp/pnpm-store
  → node v20.20.2 / pnpm 10.34.6；resolved 68, downloaded 68；esbuild@0.25.12 与 0.28.2 的 postinstall 都执行并 Done；install_exit=0（37.5s）
$ pnpm run typecheck   → exit=0
$ pnpm run test        → 14 files | 338 passed | 1 skipped (339)     ← 干净树里是我的提交版（342 条是本轮 ci.spec 扩容之后）
$ pnpm run build       → ⚡ Done in 111ms；lib/index.js + lib/client.js
$ pnpm run verify:build → [verify-build] OK        $ pnpm run verify:meta → OK
$ md5 对比 4 个 lib 产物（干净树重建 vs 已提交）→ index.js/client.js/index.js.map/client.js.map 全部一致（等价于 `git diff HEAD -- lib` 为空）
$ node -e "import('./lib/index.js')…"（新加的那一步）→ host half loads on v20.20.2, exit=0
  反证：把 /tmp/badcontract/lib/index.js 写成 name="wrong" → 该命令 exit=1 并打印 host half contract broken（非空转）
```
**另做了 YAML 解析校验（一次性，不进 CI）**：套件里没有 YAML 依赖，我把 ci.yml 交给真实解析器验证——`python3 -c "import yaml; yaml.safe_load(...)"` 与 `ruby -ryaml` 都能解析，且解析出的值是 `with.version = '10.34.6'`、`if = "matrix.node == '20'"`、load 步骤 run 长度 247、步骤顺序为 Checkout→Set up pnpm→Set up node→Install→Typecheck→Test→Build→Load→Verify→Verify meta。为避免再次出现「文本断言全过但 YAML 语法错」，我在 `tests/ci.spec.ts` 补了一条 plain-scalar 断言（不得含 `: `／` #`／以流式指示符开头）。

**仍待验证**：GitHub 上的**重跑**结果（Lead 会 push 并盯）——本地等价命令已全绿，但「云端 runner 上的 setup-node cache、action 版本解析」只有真跑才算数。

## 1.4 契约 v2（task-10）：冻结语义口径 + 新增守护 + 我自己的两处更正

Lead 扩展并冻结了 `src/shared/contract.ts`（`SpanSpeaker` / `MessageSpan` / `LaneColorTokens` / `LaneNavigation` / `TimelineResponse.live` / `MESSAGE_PREVIEW_MAX`）。我同步了门禁，并把**口径**定下来（已发给 host-data-2 与 ui-2）：

| # | 冻结规则 | 口径（谁违反就是 error，不是降级） |
|---|---|---|
| 1 | `live === true` ⟺ `range.end === null`；`live === false` ⟺ `range.end` 是时间戳 | **两个方向都按 error 处理**。`live` 与 `source` 是**正交**的：`source:'live'`（没读到日志）可以与 `live:false`（全队已停）同时出现。host 若无法判断，必须选**自洽的一对**（`live:true` + `end:null`）并在 `notes` 里说明；绝不允许 `live:false` + `end:null`（客户端没有可冻结的右边界）或 `live:true` + 硬 end（右边界会停止生长却说还活着） |
| 2 | `MessageSpan.to` | `kind:'message'` → **可选**（配到 delivered 就有，配不到就留空，因为journal 不说 sender/target 就不许编）；`kind:'turn'` / `'user-prompt'` → **必须缺席**（契约原文「a turn or a user prompt has no addressee」） |
| 3 | `from` / `to` 的 `SpanSpeaker` | `kind ∈ user\|lead\|teammate\|system`，`id`/`name` 必须非空字符串 |
| 4 | `preview` | 长度 ≤ `MESSAGE_PREVIEW_MAX`(140)、无换行、已 trim；连续空格只算 warn。host 必须自己裁剪，而不是把长文本甩给面板 |
| 5 | `LaneColorTokens.bar/on` | 必须是**令牌名** `/^--(?:dsw\|ds)-[a-z0-9-]+$/`。`#fff` / `red` / `var(--dsw-…)` 全部 error——这条专门堵「反正 theme 扫描只看源码，我在这里写色值就能绕过」 |
| 6 | `navigation` | `session` 必带非空 value；`address` 必带非空 `value.sessionId`；`unassigned` 哨兵泳道**不得**有 navigation（warn：正常泳道缺 navigation） |
| 7 | `messages` | 按 `time` 升序；`end` 为 null 或 ≥ time；`sessionId` 非空 |

**新增守护（全部有正反标定，能真的红）**
- `tests/contract.spec.ts` 71 条（原 39）：**新增 21 条反例**（live 缺失/非布尔、两种畸形态、color 缺失/色值/命名色/`var()`/非主题名、messages 非数组、kind 未知、乱序、from.id 空、from.kind 未知、preview 超长/带换行、turn 带 `to`、end<time、navigation 三种坏形态、unassigned 带 navigation），并保留「反例总数 == 被拒总数」这条防空转断点；另有 3 组正向/鉴别力用例（live 两种合法组合、speaker 四种 kind、令牌族接受 `--dsw-*`/`--ds-*` 且拒绝 11 种近似写法，且**能区分**「写了色值」与「名字写错」两种报错文案）。
- `tests/host-messages.spec.ts` **20 条（新文件）**：`foldMessageRecords` 的配对规则——**交错顺序下仍按 `messageId` 配对**（邻接实现会配对错）、孤儿 delivery 保留但**不编 sender**、重复 queued 取首个/重复 delivered 取末个、queue 缺 target 由 delivery 补、`user/message` 只有 `source.kind==='user'` 才算人类提示（其余 7 种 runtime kind 全部计入 `injectedUserMessages` 且不产出提示）、preview 折叠空白/裁剪到 140 且与契约常量一致、乱序/垃圾输入不抛异常、排列不变性。
- `tests/host-integration.spec.ts` 18 条：**fixture 升级为真实日志 1263 条事件**（现在包含全部 `team/message/queued` 56 + `delivered` 56 + `user/message` 80 —— 见 §4 事实 15），端到端断言：真实日志里 80 条 `user/message` 只产出**恰好 11 条**人类提示（`source.kind==='user'`）、配对 delivery 带 addressee、每条泳道都有真实令牌色与 navigation、9 条泳道 0 error **0 warn**。

**新发现 F8（我差点误报，记录方法论）**：`lane.color.on` 用的是 `--dsw-alias-label-primary-inverted`、`idle` 泳道用 `--dsw-alias-state-idle-primary`——这两个名字在 better-sidebar 的产物里**一次都没出现**，我一度怀疑是编造的 token（那样 bar 会渲染成透明且**任何地方都不报错**）。查证结论：**它们都是真实存在的**。教训是**必须查定义源**：better-sidebar 只是 token 的**消费者**，定义源是宿主 `@deepseek-ai/dsh-client-ui-theme/lib/client.js`（从 app.asar 提取，共 **408** 个定义）。我把这 408 个名字快照成 `tests/fixtures/dsw-theme-tokens.json`（provenance 写在 `_source`），新增守护「host 发出的每个 lane 色都必须在定义表里」，并做了鉴别力用例（`--dsw-alias-label-inverse` 这种看着很像但**不存在**的名字会被拒）。
**同一类错误的自我更正**：我自己的 fixture 之前就用了不存在的 `--dsw-alias-label-inverse`（3 个文件、10 处），已全部改成真实的 `--dsw-alias-label-primary-inverted`；并加了一条断言让**仓库 fixture 本身**也必须用真实 token——测试里的坏例子会教坏后来人，即使没有断言依赖它。

**后续（Lead 拍板后）**：我在真实 board 探针里发现的「9 泳道只用 5 个 token、多对 teammate 同色」被 Lead 定为**真缺陷**，host-data-2 已改为**按位置分配 + 5 色真实调色板**；我按新语义重写了配色断言并新增对纯函数 `laneColorTokens` 的位置语义直测（旧哈希实现在其上必红）。完整证据链见 §5 **F9**。

**同时更正我自己两条过时断言（task-10 的 tsc 错误之外）**：`tests/host-timeline.spec.ts` 与 `tests/host-integration.spec.ts` 里三条「`source==='live'` / 没日志 ⇒ `range.end` 必为 null」的断言在 v2 下**不再成立**（host 在完全观察不到时选择 `live:false` + `end=now`，是自洽的一对）。已改为断言冻结的**成对关系**，并把 host 的这个选择标注为「观察到的实现选择，不是契约要求」。

## 1.5 契约 v2 的第二批守护（task-8/task-9 的覆盖缺口）+ 四处更正

`docs` 之外全部落在 `tests/**`。基线：`typecheck exit=0`、`17 files / 438 passed / 1 skipped`（00:17 复跑）。

**新增/加强的覆盖**

| 文件 | 用例 | 内容 |
|---|---|---|
| `tests/token-definitions.spec.ts`（新） | 8 | **①存在性**：剥注释后扫 `src/**`（19 文件）的 `var(--token)` 与 `'--token'` 引用，差集必须为空（**当前 25 个 distinct 引用、0 missing**）。②**对比度**：`UR_MARKER_RING_TOKENS` 双层、`UR_MARKER_FILL_TOKEN` = 面板表面、每套皮肤至少一层 ≥3:1、被否掉的 `markdown-citation`（不随皮肤翻转）1.16:1 的反例锁、WCAG 公式自校准（18.90 / 1.17 / 1.16 / 1.00 / 15.41 全复现）。 |
| `tests/client-navigation.spec.ts`（新） | 13 | `apply()` 期间 `ctx.get` 调用序列**恰为 `['betterSidebar']`**（惰性取用的回归锁）；`navigate()` 四类死服务一律返回 false 且不冒泡（缺服务 / `openSession` 非函数 / 抛错 / **点击时 registry 抛错**）；解包口径（session→**裸字符串**、address→**同一对象引用** `toBe`）；**晚挂载**后同一 `navigate` 闭包开始工作；descriptor（`id`/`order=50`/`single`/`dedupeKey`）与 props **恰为四项**且回调**引用稳定**。 |
| `tests/layout.spec.ts` +12 | 51 | 冻结窗口语义（`live:false` 时 `now` 取 3 万或 10 亿都不改变 `window.end`/`dataWidth`/span x；闭合 span 不被拉伸；`live:true`→`endMarker.kind='now'`；退化 payload → `endSource='datum'`；**旧 payload 无 `live` 字段 → 仍按 live 处理**）；消息层（**抽稀只删不挪**：每个标记 time 必须等于某条真实消息的 time；`droppedMessageCount` 守恒；密度带 `count/firstTime/lastTime` 覆盖真实首尾；`decimateMarkers` 确定性 + `maxPerLane`；`both` 与 `markers` 的候选差；缺 `to` 不编造；恶意 messages 不抛异常）。 |
| `tests/bundle.spec.ts` 加强 | 16 | 运行时 `require` **白名单收紧为恰好 `["react","react/jsx-runtime"]`**（原先允许 `@deepseek-ai/*` 与 react-dom，无法发现新增依赖）。 |
| `tests/host-integration.spec.ts` +3 | 23 | **空 live 读不再遮蔽磁盘日志**的回归用例（见下）；「两条通道都可读但为空」按**成功空读**处理（`source:'log'`、0 span，不诬告成 `partial`）。 |

**从这次梳理里产生的真缺陷（已修，我加同源回归）**：`readSessionLog` 曾把 `readLive` 返回的**空数组**当成成功，于是「会话已注册但历史还没回放进内存」永远不会回退磁盘 → 面板空白却谎报 `source:'log'`。**为什么 403 个用例都漏掉**：所有 fake（含我的 fixture）都让两条通道返回**同一份数组**，该分支不可达。我的新用例故意让 `snapshotEvents()` 返回 `[]` 而 `sessionPersistence` 返回真日志 → 修复前必红。这也回答了我 §6 里那条降级语义：`hasHistory:false` + 空 spans + `source:'log'` 对**全新会话**是有意为之，不是 partial。

**四处更正（我独立复核后改口径，不照抄提案）**

1. **shell 的「36 个 distinct `var()` 引用」是每文件出现次数**（panel-style 12 + styles 24），**不是 distinct**：我实测 19 个文件、**25 个 distinct 引用**（含 `'--token'` 字符串形态）。守护的下限设为 20，避免把实际基线写死成错的数字。
2. **ui-2 的对比度断言③「任一单层都单独不达标」在现行实现下是假的**：`UR_MARKER_RING_TOKENS[0]` 是 `--dsw-alias-label-primary`，它**随皮肤翻转**（浅色 `#0f1115` = 18.90:1，暗色 `#f9fafb` = 15.41:1），**单层在两种皮肤下都达标**。按他们的写法会让正确代码变红。
   **出处说明（Lead 追问后补）**：我那个 15.41 是**定义源推导，不是实测** —— `--dsw-alias-label-primary` → `--dsw-static-neutral-bluish-50` = `#f9fafb`（在主题 bundle 里 grep 到该定义），对 Lead 实测的暗面板 `rgb(32,33,36)`；换成主题自己的暗面板 `bluish-875 = #232324` 则为 15.03。推导路径由 `--dsw-alias-markdown-citation` → `bluish-100 = #ebeef2`（= Lead 实测 `rgb(235,238,242)`）**完全吻合**交叉验证。
   **Lead 裁定：保留双环**。理由不是「单层数学上不可能」，而是**单层方案只在「该 token 随皮肤翻转」成立时才安全**，而这一行为**没有活页面实测**；双环不依赖该前提。（补充事实：`--dsw-alias-label-secondary` 在主题文件里**同样定义了两次**（bluish-700 | bluish-300），按同一份证据它会翻转到 `#cfd3d6` → 10.42:1 —— 但这仍是推导而非观测，正是裁定要避免的东西。）我改成编码真正的区分属性：被否掉的替代品 `--dsw-alias-markdown-citation` **不随皮肤翻转**（`#ebeef2`），所以在浅色面板只有 1.16:1 —— 这条才是「不许退回单色」的锁。
3. **转述的 `label-primary-inverted` 暗色 13.83 无法复现**：用他们自己的输入 `rgb(245,247,250)` vs `rgb(32,33,36)` 算得 **15.00**；按定义源暗色链（`…-inverted` → bluish-800 `#353638`）算得 **1.33**。三个输入里没有任何组合给出 13.83，所以我**没有**把它写进断言（阈值语义已足够），并把它作为开放项报给 ui-2/Lead。
   附口径说明：`--dsw-static-neutral-bluish-00` 在该文件里是 **`#fff`**（2 处定义），`bluish-50` 才是 `#f9fafb`。若把浅色面板基色取成 `bluish-50`，`label-primary` 浅色会算成 18.08 而不是 Lead 实测的 18.90（纯白面板）—— 这是**面板基色口径**差异，不是 token 值差异；我在 `tests/token-definitions.spec.ts` 里保留 Lead 的实测基色并注明两种口径，没有悄悄替换。我另从定义源独立复核了链条：`label-primary` → bluish-1000/50、`inverted` → bluish-00/800、`markdown-citation` → bluish-100 `#ebeef2`（与实测 `rgb(235,238,242)` 吻合，交叉验证了提取正确）。
4. **`MESSAGE_MARKER_MIN_GAP_PX`(9) < `MESSAGE_MARKER_WIDTH`(11)**：抽稀保证的是**位置间距** ≥9px，但标记宽 11px，所以被保留的两个标记仍可重叠 2px。我按提案断言了 gap 下限；**Lead 裁定本轮不改**，故这条记为**已知上限**（见 §6 ❓19），`tests/layout.spec.ts` 因此**不**断言 `gap >= width`（那会刻意为红，违背"只说真话"的门禁原则）。另外 `mode:'both'` 的去重方向我第一次写反了（`both` 比 `markers` **少 1** 个候选），已被用例抓住并修正。

5. **shell 更正了我的一个反例（我复核后接受）**：我原写「`(?<!:)` 会漏剥 `case 1: // note`」，**错**——冒号后是空格，负向断言照样通过、照样剥掉（我实测两法都剥）。真正的反例是：**(a)** `case 1:// comment`（冒号紧贴 `//`）→ `(?<!:)` 不剥 → 假红；**(b)**（更关键）非引号感知的剥法会吃掉**字符串字面量里的 `//`**，而我的 spec 同时扫 `'--token'` 字符串形态，于是「以字符串引用的坏 token」被静默吃掉 → **假绿**（实测 `const s = 'a//--dsw-nope'` → 朴素剥法变成 `const s = 'a'`，quote-aware 保持原样）。附带更正：`https://` 只在**引号内**受保护（`'https://h/x'` 实测保留），**裸写**的也会被剥（TS 源码里不是合法代码，无影响）。我选 quote-aware 的结论不变，理由已改准。

**本轮明确**未**覆盖（不假装有）**：ui-2 的缺口 B（`GanttChart.tsx` 渲染层 22 条，泳道头 button/`dtg-frozen`/`dtg-msg*`/title/aria 等）**一条都没落**；缺口 A 里 A1 的第 5 条我只做了退化分支、A2 的 12 条我做了 5 条（7/8/9/10/11/12 中的 7、8、9、11、12），A3 只做了 13。加上 stub 下 viewport 恒为 0（`cull:true` 会剪掉所有 bar），B 组需要专门的渲染遍历 helper；这是**已知缺口**，不是已覆盖。

## 1.6 任务条几何修正（用户真机反馈）+ 模板字面量守卫

**用户的原始观察**：「这些任务长度，应该是根据任务创建，到结束时间的长度，而不是每个都一样的长度」。
根因：旧几何 `w = clamp((x1-x0)/msPerPx, TASK_MIN_WIDTH=148, TASK_MAX_WIDTH=260)` —— **148/260 是文字宽度**，把任何任务都夹进同一条 148–260px 窄带，**时长信息被抹掉**（Lead 按真机图上 10 万 ms/px 换算：148px ≈ 740 秒，而 demo 任务只有几十秒）。

**新契约（ui-2，`src/client/ui/timeline-layout.ts` 文件头）**：`w = max(TASK_BAR_MIN_WIDTH=2, (clamp(last)-clamp(first))/msPerPx)`；**没有上限**；标签变成独立 chip（`labelPlacement/labelX/labelW`），`'inside'` 仅当 `w >= TASK_CHIP_INSIDE_MIN_WIDTH=148`；无 history → `w=2` 点标记、`durationMs=0`；`TASK_MIN_WIDTH`/`TASK_MAX_WIDTH` **已删除**（`grep -rn "TASK_MIN_WIDTH\|TASK_MAX_WIDTH" src/` 为空）。

**我改的 3 条（都在 `tests/layout.spec.ts`，都是"钉旧行为"）**
1. `anchors a card on its first history event…`：`w` 改为 `(last-first)/msPerPx` 真值 + `durationMs` + `x` 按窗口起点算，并断言 chip 挂在右侧（`labelPlacement==='right'`、`labelX === x+w+TASK_CHIP_GAP`）。
2. `caps a very long-lived card at the maximum width` → **删除**（它正是用户指出错误行为的固化），换成两条正向：`has NO label-derived cap`（3960px 就是 3960px）与 `doubling the duration doubles the bar`。
3. `anchors a card with no dated history at NOW`：`w = TASK_BAR_MIN_WIDTH`、`x = max(0, dataWidth - TASK_CHIP_WIDTH)`、**`durationMs === 0`**（时长未知不得画长条）。

**新增的 4 条守护**
| 用例 | 钉住的东西 |
|---|---|
| `doubling the duration doubles the bar` | `msPerPx=1000` 下 30s→**30.00px**、300s→**300.00px**、比值 **10.00**（用户需求的直接回归锁） |
| `the floor only applies below it` | 1ms 任务 → 恰好 **2px**（防止上一条退化成"只要大于下限就绿"） |
| `never lets the subject length move the bar` | subject 1 字符 vs **4000 字符** → `x`/`w` **完全相等**（实测 120px），且 `'inside'` 判定只看条宽不看文字 —— 根因级锁 |
| `client stylesheets are intact template literals`（`tests/theme.spec.ts`） | CSS 模板字面量被反引号截断的守卫，见下 |

**模板字面量守卫（ui-2 两次踩到）—— 我先写错了一版，实测后改准**
- 我第一次用「反引号计数必须是偶数」。**实测证明它抓不到真实事故**：ui-2 两次写的都是**成对**反引号（`` `markdown-citation` ``），总数是偶数 → 该检查放过。
- 真正的可判别信号是**模板体被切成碎片后留下未闭合的块注释**：把事故简化成 `` const css = `a { /* see `markdown-citation` here */ } b`; `` → 扫描出 **2** 个 body，且**两个都不平衡**（第一个开了注释、第二个才闭合）。健康文件测得的基线：`styles.ts` = **1** 个 body（17 430 字符，括号 115/115）、`panel-style.ts` = **3** 个 body（23/4123/54 字符，括号 15/15），所以断言写成「任何 body 不得有未闭合块注释」而**不是**写死 body 数量（对该文件的合法多模板免疫）。
- 单个游离反引号的情形走另一条路径：字面量永不闭合 → 扫描器**抛错并点名原因**（比 esbuild 的 `Expected ";" but found …` 可读得多）。
- 两条落地断言：① 每个 body 的 `/*` 与 `*/` 计数必须相等；② 拼接后的 CSS 必须保有选择器词汇（`.dtg-*` / `.dsh-task-gantt*`，两文件不同前缀，实测后按文件分别设阈值）、括号平衡、且不含 JS 行注释。
- **守卫的边界（诚实）**：它只扫**模板体**。我在写这个守卫时自己踩了同类坑的变体 —— 把 `*/` 写进了 JSDoc 注释（`` `['a /* see ', ' */ b']` ``），提前闭合了文档注释、导致本文件语法错误；那次是 `tsc` 抓到的，本守卫**不覆盖**（注释不在模板体内）。

**未动**：`MESSAGE_MARKER_MIN_GAP_PX(9) < MESSAGE_MARKER_WIDTH(11)`（Lead 裁定本轮不改，仍记 ❓19）。

## 1.7 问题 2 的根因核实：与 Lead 初诊**不一致**（我按实测记录，不按印象）

**Lead 的初诊**：`GanttChart.tsx:432` 用 `laneColors.get(marker.from.id)`，而 `laneColors` 的键是 **laneId**、`marker.from.id` 是**会话 id** → 查不到 → `undefined` → 填充没画上；用户看到"全是同一种深色"即由此而来。被归为"合法但静默失效的第四类：查表键不匹配"。

**我的实测（真实 1263 条日志 fixture + fake 服务，85 条 marker）**
```
lane ids: lead, 66b9735d-…, 87589993-…, 7484fccf-…, c79a18f7-…, f828dda6-…, 91410edb-…, 8a600894-…, d9f89160-…
   21 lead     | HIT  | 走 map 查表
   53 teammate | HIT  | 走 map 查表
   11 user     | MISS | 但走 userPaint（专门画法，不查 map）
走 map 且未命中 = 0 / 85
```
**为什么不成立**：`src/host/timeline.ts:404-421` 的 `makeSpeakerLookup` 对 `lead`/`teammate` 返回的 `from.id` **就是 lane id**（lead → `'lead'`；teammate → 该成员的 laneId，即其会话 id）——正是 `laneColors` 的键；`user`/`system` 在 `GanttChart` 里走 `userPaint`/`systemPaint` **根本不进 map 分支**；未识别的 sender 会被兜底成 `kind:'system'`（`:419`、`:454-456`），同样不进 map 分支。所以第 432 行在实际数据上对每一条**使用它**的 marker 都命中。

**结论（分两层，避免把风险类别写成已发生缺陷）**
1. **风险类别成立、本实例不成立**：「查表键与 id 空间不一致 → 返回 undefined → 静默无色」是一个值得守的类别（jsx 里 `.get()` 的返回类型是 `X | undefined`，而 CSS 把 undefined 静默当"无值"），但**在今天的真实数据上没有发生**。我在守护里仍会加「任何 marker 的 paint 必须非空」这条**前置不变量**，并如实标注它当前**不会红**、不是对某个现存 bug 的修复。
2. **用户诉求的真实缺口是语义**：用户逐字要求「A 发给 B：A 泳道显示**收件人 B 的颜色** + 发出标识；B 泳道显示**A 的颜色** + 接收标识」。当前实现**无论画在哪条泳道都用 `from` 的颜色**，且**没有发出/收到标识** —— 同一 marker 在两条泳道得到相同颜色，与要求相反。这才是要修的东西。
3. 附注：真实数据里 85 条 marker 全在 Lead 泳道（member 泳道自己的日志里没有 message 事件），所以"每条泳道各自决定颜色"这一语义在最常见的真实形态下**几乎不可见**；构造"同一消息出现在两条泳道"的用例必须由 fixture 提供（我会在守护里显式构造，不依赖真实日志恰好如此）。

**待 ui-2 落地后我要加的守护（按 Lead 口径，且不写魔法数）**
- ① 同一 `MessageSpan` 在 `from` 泳道与 `to` 泳道 paint **不同**，且分别等于**对方**泳道色（需 ui-2 把颜色决策抽成可测纯函数/映射，签名至少含 `(message, laneId)`）；
- ② 任一 marker 的 paint `bar`/`on` **非空**（前置不变量）；
- ③ 方向标识存在且**非颜色可辨**（形状/字形/`aria-label`）；
- ④ 问题 1：同一泳道内 **activity / message / task 三条轨道的 y 区间两两不相交**（不断言 `laneHeight === 84` 这类魔法数），需要 ui-2 把三轨道的 y/h 导出。

## 1.8 问题 2 复核结论（Lead 实测确认）+ 更深一层的双写缺口 + 问题 1 的结构性断言

**Lead 的活页面实测（与我的离线实测一致）**：7 条标记 —— `dtg-msg-user ×6` → `bg rgb(255,255,255)`（人类提示的专门画法）、`dtg-msg-agent ×1` → `bg rgb(245,158,11)`（颜色正常）。**`laneColors.get(marker.from.id)` 命中，不存在"返回 undefined 导致无色"**。Lead 明确更正：他的初诊是**按模式推断、没读 `makeSpeakerLookup`**，并同意按我的口径记录 —— 「查表键不匹配 → undefined → 静默无色」列为**风险类别（前置不变量，当前未捕获到实例）**，不写成已修的真 bug。§1.7 的全部内容由此**双重证实**（我的离线 85 条 marker 统计 + Lead 的活页面 7 条）。

**更深一层的缺口（Lead 顺着证据查出来的，比颜色更根本）**：`src/host/timeline.ts:826-851` 里
```
const lane = laneById.get(owner)   // owner = from.id
lane.messages.push(span)           // 只挂到「发送者」的泳道
```
即**每条消息只出现在发送者那一行**（活页面印证：6 条「你 → Lead」全在 lead 行，`demo-beta → …` 只在 demo-beta 行）。而用户要求「A 发给 B：A 的泳道一条、B 的泳道一条」⇒ **必须双写**。所以「按泳道取对方颜色」之外，**消息本身也还没到对方泳道**；Lead 已派 **task-11** 给 host-data-2（双写 + 去重键 `laneId+messageId` + `turn` 不双写 + 孤儿 delivery 只写一侧 + diagnostics 区分唯一数/出现次数）。我**等它落完**再加这四条守护：
1. `A → B` 的消息恰好出现 **2** 次（A、B 各一次；不是 1 次、不是 3 次）；
2. `kind:'turn'` 只出现 **1** 次（防止顺手双写）；
3. 孤儿 delivery（无 `to`）只出现 **1** 次；
4. diagnostics 的「唯一数」与「出现次数」各自正确（不能是简单相加）。

**问题 1（三层分开）我按 Lead 口径落成结构断言，已绿**：`tests/layout.spec.ts` 里原先把 `TASK_CARD_TOP` 钉成 `LANE_PAD_Y + TURN_BAND_HEIGHT + 4`（ui-2 加高泳道后立刻变红，属**预期的契约变更**不是回归）。现改为断言**结构属性**（用 ui-2 新导出的 `laneTracks(laneIndex, laneHeight)`）：
- 三条轨道 `['activity','message','task']`、各自 `h > 0`、**相邻两条 `y` 区间两两不相交**；
- 默认泳道必须**装得下**三条轨道 + `LANE_BOTTOM_PAD`（否则被下一行裁掉，"分开"就不成立）；
- 轨道高度是**固定值**（用户选的是"固定加高"而非自适应）：第 1 条泳道的内部布局恰为第 0 条整体平移一个 `laneHeight`，把 `laneHeight` 改成 100 也不改变各轨道高度；
- `TASK_CARD_TOP === task` 轨道的 `y`（只有一处推导，避免两个来源漂移）；`TASK_CARD_HEIGHT <= TASK_TRACK_HEIGHT`。
→ **不断言 `laneHeight === 84`**：那是魔法数，ui-2 下次调高度会让正确的代码变红，且说不清"分开"这件事。

**方法论文档（Lead 要求署名给他，我完全同意留档）**
> **「我用模式匹配代替读实现，得出了一个不存在的 bug，并已下发给队友。」** —— 下根因结论前，必须**读那条代码路径**，或做一次**能证伪它的实测**。（与「两条独立测量不齐时先找通道差异，而不是先判谁错」对称：一条讲"结论要有取证"，一条讲"分歧时别先归因对方"。）

## 1.9 方向判定真 bug、双写守护、以及一条最重要的 fixture 教训

**Lead 活页面实测的真 bug（ui-2 已修，我的守护已确认）**
```
Lead 实测（部署含新逻辑的产物）：8/8 标记 data-msg-direction="incoming"、dtg-msg-out 命中 0
而 host 数据是对的：lead 泳道 104 条 messages，含 from:lead→to:packaging（应 outgoing）…
根因：resolveMessageDirection 用「会话 id 比泳道 id」——lead 泳道 id 是 'lead'，而 from.id 是 'session-4d51254b-…'，永不相等
```
**我的第一版 fixture 有同一条逃逸路径**：我把 lane id 直接写成 `lane-a`/`lane-b`、speaker id 也写同名，于是**两个 id 空间重合**、原始比较也能通过 → 我的测试**全绿而真机全错**。已重写：
- lane id = `lead` / `lane-b`；speaker id = `session-a` / `session-b`；`laneIdOf` 是**唯一的桥**；
- 新增一条**元守护**：断言「没有任何 lane id 等于任何 speaker 会话 id」（这条一失效，整个文件就悄悄不再测这个 bug）；
- 新增**计数**断言（Lead 点名）：一次交换恰好产出 **1 outgoing + 1 incoming**；整块看板两个方向都必须 > 0 —— **只断言"属性存在"正是让全 incoming 实现逃逸的原因**。
- **又一次被队友纠正、也是我的第二个 fixture 缺口**：我的 `laneIdOf` 只做了"会话 id → 泳道 id"**一跳**，而真实实现是**两跳**（`GanttChart.tsx:207-215`）：① id 本身是 lane id → 返回自身（teammate 的 lane id 就是会话 id；实测真实数据里 **21/85** 条 marker 的 `from.id` 已经是 `'lead'` 这种 lane id）；② 否则经 `lane.navigation.value` 把会话 id 映到 lane。一跳版本会把所有"已处于 lane 空间"的 marker 误判。已改为两跳，并新增一个 `from.id === 'lead'`（lane 空间）的用例块，含一条"一跳映射会失败"的自证。
- 现状：ui-2 已修（`laneIdOf` 对两侧都做映射，`timeline-layout.ts:964-967`），我的守护确认 **lead 泳道 → outgoing**、且两个方向都出现。

**由这条教训产出的方法论（与"两条通道要故意不一致"成对）**
> **fixture 必须让"只在实际数据里才不同的两个 id 空间"真的不同** —— 与「所有 fake 都让两条读通道返回同一份数据，于是分支不可达」是同一类假绿：**fixture 太整齐，把关键差异抹平了。**

**三处"口径/注释 与 代码不一致"的最终处置（ui-2 逐条裁定，我的用例已同步）**
1. **未配对 queued（`to` 缺失）**：**代码为准**，定为 `outgoing`（"它确实离开了本泳道，只是没记录去过哪里"）；`peer` 保持 null 不编造，颜色用本泳道自身色。ui-2 之前给我的口头口径"incoming"是描述错误，已改文件注释。
2. **`system` speaker + 无收件人**：**ui-2 改了代码** —— 新增显式 `isSystem` 判定，`noAddressee && !isSystem` 才用本泳道色，否则**中性色**。我那条用例因此从"期望泳道色"改为"期望中性色"（这是代码变更导致的预期更新；该组合在 host 侧仍不可达，属防御分支）。
3. **自言自语（note to self）**：**保留代码 `incoming`**（Lead 在任务里逐字指定了 `outgoing = selfIsSender && !selfIsReceiver` 这个单表达式优先级），ui-2 把原来那句误导注释改成与代码一致。我的用例钉住 `incoming`，并在注释里写明这是被显式指定的规则。

**task-11 双写守护（已落，4 条）**：真实数据实测 141 个 span = **112** 条消息副本（56 个 exchange × 2）+ **11** 条 prompt 副本 + **18** 条 turn。守护：
1. `A→B` 的每个 exchange 副本数 **≤2**，两次的泳道集合必须恰为 `{from.id, to.id}`，且**至少有一个 exchange 被双写**（否则功能没开）；
2. `turn` 恰好 **1** 份（16 条 turn 全部通过）；
3. 孤儿 delivery（无 `to`）恰好 **1** 份且落在发送方泳道；
4. diagnostics 三个数各自正确 —— 这里发现并**已修复 F11**（见下）。

**F11（我发现 → host-data-2 修 → 回归锁已加）**：原 note 写 `67 unique message(s) drawn on 141 lane(s)`，但 `copiesWritten` 把 **turn 也计入**（`uniqueMessages` 不计），141 里只有 123 是消息/prompt 副本、**18 是 turn** —— 两个数**不是同一总体**。host-data-2 已按"每个数一个总体"改为**三个数同句**：`{unique} unique message(s): {messageCopies} message/prompt copies drawn across lanes … plus {turnsWritten} turn span(s)`，且 `messageCopies` 只统计消息+prompt。我的回归锁（`tests/host-integration.spec.ts`）：
- 结构化正则（不钉整句）抽出三个数；`unique === 去重消息+去重提示`；**`copies === 消息副本 + 提示副本`（不含 turn）← F11 的真正锁**；`turns === turn 副本数`；`copies - unique === 被镜像的交换数`（不是简单相加）。
- 原先的 `it.fails('[F11] …')` 修复探测器**已改成正常断言**并删除（使命完成）。
- **host-data-2 的独立对账（真实 9 泳道日志，不用我的 fixture）**：`unique=164 / copies=304 / turns=88`，并逐条核对 `copies == 所有非 turn 的 lane.messages 总数`、`turns == turn 总数`、`unique == distinct 键数`、`全部 lane.messages == copies + turns (392 == 392)` —— 与我的 67/123/18 分解口径一致（同源不同数据）。
- **采纳他们的方法论告诫**：`copies` 与 `unique` **不是简单倍数关系**（exchange 与 prompt 各自 1 或 2 份，取决于收件人是否在 roster），所以**不要写 parity 或分解式恒等式**；唯一权威是**从 lanes 精确重点算**。我原先那条 `copies - unique === mirrored` 是分解式，现已**先断言"每个 exchange ≤2 份"这一前提**再使用，并在注释里写明"若不一致，信重点算、不要信恒等式"（他们为此踩了两次假红，diff=137/140 不是任何干净倍数）。

**host-data-2 §18.7 的四条权威规则（我据此补了守护，并实测了可达性）**
1. 方向是**节点级**（同一条 span 对象在两行分别是"发出/收到"）⇒ 判定必须拿**当前泳道**的 id，不能拿 span 自身字段；
2. `from.id` 本身就是 **lane id**（不是 session id），所以"再查一跳 `navigation.value`"是多余的；真要多查，那是**两跳**（id→lane，再 session→lane）；
3. **不要用收件人反推方向**：畸形 payload 下 `from.id === to.id` 可能成立，此时按"发送"处理；
4. `turn` 恒落自己泳道 ⇒ `from.id === lane.id` 恒真；`user-prompt` 的 `from.id` 恒为字面量 `'user'`（人类没有自己的行）⇒ 它在被寻址的泳道上判成 **received**（"我收到了你的话"），**不是 bug**。

**我的实测可达性与守护**（`tests/message-paint.spec.ts`，27 条）：
- 真实日志 **0 条自寻址 span**（`from.id === to.id`）⇒ 规则 3 的分支**当前不可达**，属防御；
- 真实日志 **11 条 prompt 全部没有收件人**（host 今天不写 `to`），全部画在"承载该日志的泳道"上；
- 新增 4 条守护：prompt 用**固定 user 色**（用户要求）+ 方向 **incoming**（规则 4）；即使将来 host 补上收件人，被寻址泳道上**仍须 incoming**；以及自寻址形态的自证。

**✅ 一处 owner 规则分歧已裁决（Lead，2026-10-12）：以 client 为准**。§18.7 原规则 3 说自寻址 span（`from.id === to.id`）应读作 **sent**，而 client 的单表达式 `outgoing = selfIsSender && !selfIsReceiver` 给 **incoming**。Lead 裁定 **①维持 client** 并要求 host-data-2 对齐 §18.7 措辞，理由：(a) 真实数据 **0 条自寻址**，纯防御分支；(b) 该表达式是 Lead 的显式指定、ui-2 特意保留；(c) 对"对着自己泳道的 span"，"到达"与"发出"同样站得住；(d) 收尾阶段为一个不可达分支改活代码属**无收益改动**。我的用例注释已从"分歧"改写为"**已裁决：client 权威**"，并把四条理由留档。
   **裁决后 host-data-2 又提出"该表达式会让自发自收落入第三态（既非 outgoing 也非 incoming）"，我实测复核后如实记录为"部分成立、且不影响裁决"**：
   - 可观测的 `direction` **永远只有两个值之一**（`outgoing` | `incoming`），不存在第三态；对 `A→A @A`，`selfIsSender` **与** `selfIsReceiver` **同时为真**，因为 `toLane === laneId`，所以它是被**正面判定为"本泳道是接收方"** ⇒ `incoming`。他们表里的"两者都 false"针对的是一个**假想的对称布尔** `incoming = selfIsReceiver && !selfIsSender`，而代码并不计算它。
   - **但他们的担忧有一个真实残差**：对"本泳道既非发送方也非接收方"的调用（`A→B @不存在的泳道`），表达式同样落到 `incoming` ⇒ **`incoming` 实际上是兜底值，而不是"我确实收到了"的正面判定**。该形态**不可达**（marker 只会布置在它自己的泳道上），实测 `A->B @ghost` 也为 `incoming` + `peerMatched:true`。
   - **需要 host-data-2 注意**：他们把 §18.7 规则 3 改写成 `selfIsSender ? 'sent' : (selfIsReceiver ? 'received' : 'sent')`，该式对自寻址输出 **`sent`**，**与 Lead 的裁决①相矛盾**；已请他们按裁决对齐为 `incoming`，避免两处 owner 文档漂移。
   - 另：ui-2 在同一轮修掉一个**真 bug**（`to` 缺失时对端推错，prompt 的 aria 一度渲染成 `收到 ← Lead`，即把承载泳道自己当成对端）；我新增守护：**对端必须永远是"另一方"**（prompt → `peerName === 'you'`，且 `!== 承载泳道名`），两种形态（无 `to` / `to` 指向本泳道）各一条。

**另加**：`BUILD_LABEL` 守护（`src/shared/contract.ts` 的非空字符串 + `BoardView.tsx` 的**每个 return 分支都有 `data-build={BUILD_LABEL}`**，共 ≥3 处）—— 用户两次无法判断"修好没有"，可见的构建标识是最便宜的答案。

**待更新**：§1.2 的真机小节仍是上一轮的记录；Lead 说修完会部署、读 `data-build` 确认版本并给我原始 DOM 数据，届时并入（含 `outgoing` 命中数）。

## 1.10 host 侧 §18.8 的 13 条不变量 → 按编号纳入守护（其中第 13 条是我此前的真空）

host-data-2 在 `docs/FINDINGS-host.md` §18.8 发布了 **13 条 host 侧不变量**（真实 9 泳道 / **446 个 span** 上逐条实测），目的正是**让渲染层不必重推**。我逐条核对后处理如下：

| # | 不变量 | 此前的覆盖情况 |
|---|---|---|
| 1 | `lane.messages` 按 `time` 升序 | 已由 `assertTimeline` 逐字段强制 |
| 2 | `end === null` 或 `end >= time` | 同上 |
| 3 | `time` 有限（无 NaN 坐标） | 同上 |
| 4 | `from.kind ∈ {user,lead,teammate,system}` | 同上 |
| 5 | `from.id` / `from.name` 非空 | 同上 |
| 6 | `kind ∈ {turn,message,user-prompt}` | 同上 |
| 7 | `turn.to` 恒缺席 | 同上（谁带 `to` 直接 error） |
| 8 | `user-prompt.from.id` 恒为 `'user'` | 已在"80 条 user/message → 恰好 11 条人类提示"用例中断言 |
| 9 | `preview` ≤140 且无换行 | 同上 |
| 10 | `turn` 的 messageId 恰好 1 条泳道 | 已在 task-11 双写用例中断言 |
| 11 | `message` 的 messageId 恰好 1 **或 2** 条泳道 | 已断言 ≤2 + "至少一个被双写" + 孤儿恰好 1 |
| 12 | 每个 span 的 `sessionId` 非空 | 同上 |
| 13 | **`unassigned` 泳道的 `messages` 恒为空** | ⚠️ **此前没有任何断言 —— 真空，已补** |

**做法**：新增 `it('holds all 13 numbered rules on the real board')`，把 13 条**按编号**一次性断言（违反时消息直接报出编号），这样未来任何漂移都会**点名它破坏了哪一条**，而不是一句"契约不符"。第 13 条正是这次新补的。

**两条我特别采纳的提醒（host-data-2 提出）**
- **第 11 条的"1 条泳道"是正常结果**（孤儿 delivery，或收件人已不在 roster），**不是数据缺失**；我的用例把孤儿形态单独钉住（恰好 1 份 + 落在发送方泳道），UI 不应假设"每条消息必有对端"。
- **host 事实（第 7/10/11 条）与 `direction` 判定（§18.7）正交**：host 只说"这条 span 出现在哪些泳道"，从不规定"画成发出还是收到"。我的 `tests/message-paint.spec.ts` 恰好把 **`direction` 与 `peer` 拆成独立断言**（对端永远是另一方），与这个正交性一一对应。

**我接受他们的范围决定**：他们**没有**为 `laneTracks` / 条高 / chip 高声明任何不变量，理由是会变成"第三个口头契约"（描述漂移的来源）。几何以 ui-2 的 `laneTracks` 文档注释 + 我的 `tests/layout.spec.ts` 为准；host 侧只为上面 13 条背书。真机几何数据到手后我做交叉对账。

## 2. 环境（实测值）

| 事实 | 值 | 怎么测的 |
|---|---|---|
| node / pnpm | v22.22.2 / 11.22.0 | `node -v`、`pnpm -v` |
| vitest | 3.2.7 | `node -e "console.log(require('./node_modules/vitest/package.json').version)"` |
| `@deepseek-ai/cordis` | 4.0.4（本仓库 dev tree 内） | `node_modules/@deepseek-ai/cordis/package.json` |
| jsdom | **未安装**（也不需要，见 §3.3 与 ❓9） | `ls node_modules/jsdom` → No such file or directory |
| react / react-dom | **是本包 devDependency**（`^18.3.1`，于 `f7a7263` 加入；`node_modules/react` 存在，实测 18.3.1）。浏览器里由宿主 `PLATFORM_MODULES` 提供，产物只 `require` 不内联（`tests/bundle.spec.ts` 守住）；测试用 stub 别名是**为绕过 renderer**（真实 React 在无 renderer 时调用含 `useState` 的组件会抛 "Invalid hook call"），不是为了解析依赖 | `node -e "console.log(require('react').version)"` → `18.3.1`；`ls -d node_modules/react` 存在 |
| 宿主 DSH 版本 | 0.2.0-rc.2（**Lead 的 scratch 组合**，用于探针与真机冒烟） | Lead 报告（我未复跑该组合） |
| `allowBuilds` 支持的 pnpm 版本 | **10.34.6 支持**（16 处）、**10.5.2 不支持**（只有 `onlyBuiltDependencies` 48 处）；11.x 支持 | `grep -o "allowBuilds\|onlyBuiltDependencies" <pnpm dist>/pnpm.cjs \| sort \| uniq -c`（对 corepack 缓存的 10.5.2 与下载的 10.34.6 各跑一次）→ 这条决定了 pin 必须写**确切** 10.34.6 而不是「10」 |
| `allowBuilds` 是真实存在的 pnpm workspace 键（版本敏感，见下一行） | ✅ | `grep -o 'allowBuilds[^,;)]\{0,60\}' ~/.nvm/…/pnpm/dist/pnpm.mjs` → 含 `"allowBuilds" in your project's pnpm-workspace.yaml to allow it to run its …` |

---

## 3. 我写的测试（18 个 spec / 480 用例：479 passed + 1 skipped）

写入范围（本任务独占）：`/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/**`、`/Users/lzx/Documents/GitHub/dsh-task-gantt/vitest.config.ts`、`/Users/lzx/Documents/GitHub/dsh-task-gantt/.github/workflows/**`、本文件。

| 文件（绝对路径） | 用例 | 覆盖 |
|---|---|---|
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/contract.spec.ts` | 71 | 冻结字面量（`API_VERSION=1` / `TAB_TYPE_ID` / `ROUTE_PREFIX`）；`contract.ts` 零 import；**`assertTimeline` 48 条反例**（旧 27 条 + 契约 v2 的 live↔end、messages、color 令牌、navigation 等 21 条）；3 组冻结语义正向与鉴别力用例；反例总数 == 被拒总数的防空转断点 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/helpers/timeline-assert.ts` | — | 契约运行时校验器（helper，非用例） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/manifest.spec.ts` | 17 | 市场规则（三个依赖字段无 `cordis`、无 install 生命周期脚本）；`peerDependencies` 只有 `@deepseek-ai/cordis`（brief §2.3）；`exports["./client"]` 为字符串或 `{default:string}`；`dsh.client.platform==='web'`；`dsh.bundle.patch` 存在且安全；`files[]` 内文件都在 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/theme.spec.ts` | 37 | 扫描 `src/client/**`（含 ui 的 CSS 字符串）零硬编码颜色；**扫描器双向标定**：14 条必须红（hex/rgb/hsl/oklch/颜色名/非主题 var）+ 17 条必须绿（token、`transparent`/`currentColor`/`inherit`、`color-mix(var(--dsw-*))`、注释里的字面量） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/i18n.spec.ts` | 19 | zh/en 客户端词典 key 集合完全一致；源码里每个 `t('…')` 都是已声明 key；语言探测（`document.lang` → `navigator.language` → en，用 stub + `vi.resetModules`，**不需要 jsdom**）；`locale/en.json` 与 `locale/zh.json` 结构一致且真的翻译过 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-route.spec.ts` | 28 | 用假 `req`/`res` 打真实 handler：200/400/403/404/405、同源判定优先于方法判定、query 路径、分两块到达的 body、`ctx.get` 抛异常时仍返回信封且绝不外抛 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-timeline.spec.ts` | 21 | `buildTimeline` 降级矩阵（8 种恶意 ctx：无服务、`get` 抛异常、`sessions.list()` 抛、`sessionPersistence.open()` reject、`handle.read()` reject、`agentTeams.listMembers()` 抛…）：绝不抛异常、响应始终过契约校验、`source ∈ live|partial` 且 `notes` 非空 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-fold.spec.ts` | 59 | 折叠容错：缺 `turn/start`、缺 `step/end`（`end:null`）、乱序输入等价、`time` 相等按 `seq` 稳定、孤儿 `step/end` 不生成 span、第二个 `step/start` 把上一个收成 0 长度（**永不为负**）、缺 `time` 事件被丢弃并计数、`turn` 带在 `step` 之前；队日志回放（created→claimed、revision 回退被跳过、roster 相位、`mid-stream` 首快照）；工具调用映射与 CAS 归因；`dateTaskFromToolCalls` 拒绝有歧义的 create；**40 轮伪随机语料**验证不抛异常 + 不变式 + 确定性；F2 的 catalog-first 成员索引用例（host-data 修好后由 `it.skip` 转正，见 §5 F2） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-integration.spec.ts` | 20 | **跑在真实日志 fixture 上**的端到端：`tests/fixtures/lead-team-journal.json`（**1263 条事件**，逐字取自本机 Lead 会话日志，含全部 message 事件）+ 假的 `agents`/`sessionPersistence`/`agentTeams` 服务 → 泳道/任务/归因/消息/颜色令牌/降级；含**令牌存在性**守护（§1.4 F8）与**配色不撞色**守护（§5 F9） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/host-mount.spec.ts` | 8 | 宿主半挂载：`webServer` 已在 → 注册 `prefix` 路由到 `ROUTE_PREFIX` 且 handler 真能答 `/ping`；`webServer` **尚未挂载** → 走 `ctx.inject(['webServer'],…)` 延迟注册；无动态 inject → 仅告警不抛；register 抛异常不被吞 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/layout.spec.ts` | 39 | 纯函数布局：窗口解析（live 钉在 now / 历史窗口覆盖全部数据 / duration≥1）、缩放钳制、tick 步长/对齐/`MAX_TICKS` 截断、`formatClock` 时区、泳道 y 堆叠、span 几何（open 延到 now、`MIN_SPAN_PX`）、`scrollLeft`→`viewX`、cull、任务卡（history vs live、min/max 宽度、`unplacedTaskIds`）、消毒与确定性 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/client-api.spec.ts` | 14 | 路由解析：反代子路径 `https://h/dataops/proxy/3080/` 必须得到 `…/3080/dsh-task-gantt/api/timeline`（**保留页面前缀**）、`dsh-app://app/`、`__DSH_TRANSPORT__.streamBaseUrl` 优先、注入的 `routeBase` 最优先、无 base 时退回文档相对路径；`postJson` 信封/非 JSON（`ApiHttpError.status`）/`signal` 透传 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/client-tab.spec.ts` | 15 (+1 skip) | 真实 `apply()` + 记录型服务：`registerTab` 恰好一次、id=`TAB_TYPE_ID`、title/description 取自词典、单实例（`single` 或等价的 `dedupeKey`）、图标渲染出 `currentColor` 且无颜色字面量、component 在 `visible:true/false` 下都能调用；**better-sidebar 晚到**时经 `ctx.inject` 回调补注册；无 `ctx.inject` 的老 ctx 只告警不抛；重复注册抛错被降级为告警 |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/bundle.spec.ts` | 16 | 产物守护：`lib/client.js` 首行 `window.__ModuleLoader__.load({ id: "dsh-task-gantt", factory: (require) => {`、末行 `return module.exports; } });`、`require("react")` 外置、**没有内联 React**、只有 1 次 `load`；`lib/index.js` 是 ESM 且 `export { apply, inject, name }`、0 个 `require(`、不含 `__ModuleLoader__`；两个 `.map` 是 v3；**按宿主 `CLIENT_CHUNK` 正则守住按需分块文件名**（见 §4 事实 11） |
| `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/ci.spec.ts` | 19 | **两个门都守**：`.github/workflows/ci.yml`（先剥注释行，避免注释文字满足断言）→ ubuntu-latest、node 20/22、`--frozen-lockfile`、typecheck→test→build 顺序、`verify` 必须在 build 之后、build 之前不得出现任何 lib/ freshness diff、**freshness diff 必须带 `HEAD`**；`package.json#scripts.check` → 同一条 `analyzeFreshnessScript` 分析（HEAD-based、顺序、五步齐全），并对分析器本身做反例标定（index-based / 顺序反转 / 缺步骤都能识别）；**pnpm pin** → 必须是确切 `x.y.z`、必须能在矩阵最低的 node 20 下安装（含反例标定：`10.34.6` ✓ / `11.28.5` ✗ / `11` ✗ / `latest` ✗ / `12.11.2` ✗），且 `Load the built host half` 步骤必须存在、限定 node 20、读 `./lib/index.js`、断言 `name`/`apply`、且在 build 之后；另守**长 one-liner 必须是可解析的 plain YAML scalar**（套件没有 YAML 依赖，这条挡的是「文本断言全过、GitHub 上 YAML 解析失败」） |

### 3.3 为什么不用 jsdom（决策与代价）

- 宿主把 React 作为**平台模块**下发，产物只 `require` 不内联；`vitest.config.ts` 把 `react` / `react/jsx-runtime` 别名到 `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/stubs/react.ts`，因此能**调用**组件函数并检查返回的元素树，但**不渲染**。
- ⚠️ **更正（2026-10-11）**：我早先写的理由是「React 不是本包依赖，不加别名就解析不到」——**这是错的**。`react`/`react-dom` 自 `f7a7263` 起就在 `devDependencies`（`^18.3.1`），`node_modules/react` 存在（实测 18.3.1）。我在干净树里做 `pnpm install --frozen-lockfile` 时看到它们被装出来，才发现这行是旧的。别名真正的动机是**正确性**：用真实 React 18.3.1 直接调用一个含 `useState` 的组件会抛 "Invalid hook call"（无 renderer 时 hooks 不合法，我实测过）；stub 让 hooks 返回惰性值，才能只做「调用 + 检查元素树」。`vitest.config.ts` 的注释已同步更正。
- 因此：组件的**真实渲染**（滚动、点击、详情面板）由 §1.2 的真机冒烟覆盖，不由单测覆盖。`ui` 已提示：在 stub 下 `GanttChart` 的 viewport 恒为 `{width:0,height:0}`，所以几何断言都直接打在 `layoutTimeline` 上（这也是它设计成纯函数的原因）。

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
| 15 | 主机会话日志在本轮实测中已增长到 **3486 行**（3647 行版本是早期快照）：`user/message` 80（其中 `source.kind='user'` 仅 **11**，其余 69 为 time-context 18 / team-message 22 / subagent-settled 20 / tool-jobs 6 / runtime-context 1 / agent-instructions 1 / schedule 1）、`team/message/queued` 56、`team/message/delivered` 56、`team/task` 26、`team/member` 16、`subagent/catalog` 8、`turn/start` 10、`step/start`/`step/end` 499+499 | `unzstd -c ~/.dsh/sessions/…/session-4d51254b-…/session.v4.jsonl.zstd` 后按 type 计数；fixture 重生成说明在 §7 |
| 16 | 宿主主题共定义 **408** 个 `--(dsw|ds)-*` 自定义属性；定义源是 `@deepseek-ai/dsh-client-ui-theme/lib/client.js`（101853 B），**不是** better-sidebar 的产物（后者只消费）——我差点把 `--dsw-alias-state-idle-primary` 与 `--dsw-alias-label-primary-inverted` 误报为不存在 | 从 app.asar 提取该文件后 `re.findall(r'(--(?:dsw|ds)-[a-z0-9-]+)\s*:')`；快照已存为 `tests/fixtures/dsw-theme-tokens.json` |
| 17 | **会话日志是 append-only 的多帧 zstd 流**：Lead 日志 2.79 MB 里含 **1941** 个 zstd 帧；`zlib.zstdDecompressSync(buf)` **只解第一帧且不报错**（整文件只得到 222 B / 1 行，而 `unzstd -c` 得到 3795 行）；流式 API `createZstdDecompress` 同样只给 222 B。仓库的 `src/host/dev-verify.mts:37-41` 已注释并改用 `zstd -d -c` CLI。**无需外部 CLI 的替代写法**（我实测可用）：`zstdDecompressSync(buf.subarray(off), { info: true })` 拿 `engine.bytesWritten` 逐帧推进并拼接。这条是平台事实：单帧解码会**静默拿到残缺日志**（面板会「有日志但几乎没有活动」），排查时先怀疑它 | `node -e "…zstdDecompressSync…"` 对比 `unzstd -c … | wc -l`；并阅读 `src/host/dev-verify.mts` 的注释 |
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

### F5（`src/host/index.ts`，**改动者未知**；四条行为路径已验证，真机前提由 Lead 探针闭环）宿主半的 `webServer` 时序

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

### F8（**差点误报，转为一条真守护**）token 存在性必须查定义源，不能查消费者产物

- **现象**：host 发出的 `--dsw-alias-label-primary-inverted`（所有泳道的 `on`）与 `--dsw-alias-state-idle-primary`（idle 泳道）在 **better-sidebar 的产物里 0 次出现**，我一度怀疑是编造的 token —— 后果会是 bar **静默渲染成透明且任何地方都不报错**。
- **查证**：定义源是宿主 `@deepseek-ai/dsh-client-ui-theme/lib/client.js`（app.asar 内，101 853 B，共 **408** 个 `--(dsw|ds)-*` 定义），两者**都真实存在**。better-sidebar 只是 token 的**消费者**，消费不到某个名字不代表它不存在。
- **落地**：把 408 个名字快照为 `tests/fixtures/dsw-theme-tokens.json`（provenance 在 `_source`）；新增守护「`buildTimeline` 发出的每个 `lane.color.bar/on` 必须在定义表内」+ 鉴别力用例（`--dsw-alias-label-inverse` 这种像真的但不存在会被拒）；并把我自己 fixture 里 10 处不存在的 `--dsw-alias-label-inverse` 全部换成真实 token（测试里的坏例子会教坏后来人）。
- **方法论**：**存在性查定义源，形态查正则，两者缺一都会漏** —— 正则抓不到拼错，定义表抓不到「写了色值/表达式」。详见 §1.4。

### F9（**真缺陷，我实测发现，已由 host-data-2 修复**）泳道配色碰撞：9 条泳道只用到 5 个 token

- **发现过程**：我在真实日志 fixture 上跑了一次探针（打印每条 lane 的 `color` + 全量 `validateTimeline` 告警），看到 8 位 teammate 里多对共享同色（error 出现 3 次、success/idle 各 2 次）。当时契约只写「同一 member id 稳定」，所以我按「观察」上报、没有报成缺陷。
- **Lead 拍板为真缺陷**：用户原话是「lead 和各 teammate **都要有一种颜色**」，而旧实现是 `hash(id) % 5` —— 哈希只保证稳定性，**结构上无法避免碰撞**（生日界下 3 个 id 落在 5 槽的碰撞概率约 0.8），实测 9 泳道 5 色等于需求没被满足。
- **修复（host-data-2，`src/host/lane-color.ts` + `timeline.ts:812/:924`）**：
  1. `laneColorTokens(laneId, index)` —— **按位置**分配（`lead` 固定 `PALETTE[0]`，teammate 按 roster 顺序取 `PALETTE[1..]`，越界回绕）；
  2. 调色板 = **5 个真实饱和填充**：`state-business-primary` / `state-success-primary` / `state-warn-primary` / `state-error-primary` / `state-idle-primary`，`on` 统一 `--dsw-alias-label-primary-inverted`；
  3. `unassigned` 走独立的 `UNASSIGNED_COLOR_TOKENS`（不占 roster 槽）。
- **为什么最终是 5 色而不是 Lead 最初写的 6 色（我独立复核过两侧证据）**：Lead 原方案第 6 色是 `--dsw-alias-brand-primary`；host-data-2 一度改用 `--dsw-alias-onboarding-accent` 作为「真正不同的色相」。我从**定义源**（`@deepseek-ai/dsh-client-ui-theme/lib/client.js`，app.asar 内）核实：`brand-primary` 定义为 `var(--dsw-static-neutral-bluish-1000)` / `…-50`，与 `--dsw-alias-label-primary` **同值**（浅色皮近黑 `rgb(15,17,21)`）—— 当第 6 色会让那条泳道看起来像正文；`onboarding-accent` 是字面量 `#3964fe`（真蓝色），但 Lead 复核 app.asar 全部 120 个 `--dsw-alias-*` 后判定它属于 onboarding 流程、主题改版可合法移除，**故最终定为 5 色上限**。我的独立测量与两位的结论一致。
- **新语义（有意变更，host-data-2 已写进文件注释与 FINDINGS）**：`lead` 永远同色；**同一 teammate 在 roster 顺序不变时**同色；roster 顺序变化时 teammate 颜色**可能变** —— 这是为「同屏不撞色」付出的代价。
- **已知上限**：第 5 个 teammate（第 6 条泳道）起调色板回绕、颜色重复；这是 5 色调色板的诚实上限，不是 bug。
- **我的守护（按 Lead 的判据，全部通过）**：① 真实 board 探针 **0 error / 0 warn**；② `lead + 6 teammate`（用 `rootEvents` 隔离 fixture，避免 fixture 自带的 8 个 member 混入 —— 这正是我第一版写错 `toHaveLength(7)` 却拿到 15 条 lane 的原因）断言**前 N 条两两不同色**（N = `LANE_COLOR_TOKENS.length`，对调色板长度不敏感）；③ 直接测纯函数 `laneColorTokens` 的位置语义（lead 忽略 index、teammate 填满剩余槽、`index == length` 回绕到 slot 0、`unassigned` 不占槽）——**旧哈希实现在 ②③ 上都会红**；④ 所有 `bar/on` 必须在 408 token 定义表内（不变）。
- **读放大：我自己独立测了一遍，结论与 host-data-2 的 18.7 ms **不是同一个量**（详见 §4 事实 17 与 §6 ❓17）**：
  - **冷读（从磁盘解全部 zstd 帧 + JSON.parse + fold）**，9 个真实 lane 日志（14.4 MB 压缩 / 19 004 事件）：
    - 自写多帧循环（`zstdDecompressSync(buf, {info:true})` + `engine.bytesWritten` 逐帧推进）：`1028.7, 1010.3, 1133.3, 999.3, 852.7` → **median 1010.3 ms / max 1133.3 ms**；分解：解压 ≈31.9 ms/日志、`JSON.parse` ≈50.4 ms/日志、fold ≈1.6 ms/日志。
    - 仓库自己的路径（`dev-verify.mts` 用的 `zstd -d -c`，一次过解全部帧）：`967.2, 1065.8, 985.9, 985.8, 1024.6` → **median 985.9 ms / max 1065.8 ms**。两种实现互相印证：**一次冷读 ≈ 1.0 秒**。
  - host-data-2 报的是 **服务路径**（`handle.read()`，19 个样本 median 18.7 / max 20.8 ms，删缓存后实测）——**我不认为它错**：`src/` 里除了 `dev-verify.mts` **没有任何文件/zstd 代码**（`grep -rn "zstd|Decompress|jsonl.zstd|readFile" src/` 只命中 dev-verify），所以面板请求走的是宿主服务、拿到的应是**已在内存里的事件对象**，不需要解压与 parse。两者相差约 53×，差的就是「这次读到底碰没碰磁盘」。
  - **对决策的含义**：删掉 1.5s 缓存是否安全，取决于**服务路径是否真的在内存里**（service 路径成立则安全）。若有任何请求落到 `sessionPersistence.open().read()` 这类磁盘回退通道，那一次就是 ≈1 秒。这条我列为 ❓17，没有真机测量。


## 6. 未验证假设（❓ 清单，逐条说明谁该验证）

> 状态更新（2026-10-11 定稿）：第 1 条已由 Lead 的 scratch 冒烟**部分闭环**（命中判定见 §1.2，A6/A9/A10/A11 仍是 ❓）；第 11 条已由 Lead 的探针**闭环**；其余条目仍然开放。**任何一条都不得当成"已实测"引用**，除非状态栏写明并给出证据。

1. ❓（**部分闭环**）**真机挂载冒烟**：Lead 已在 scratch home 执行并命中 A1–A5、A7、A8（见 §1.2 表），我**没有**运行过 `mount`/`unmount`。仍开放：**A6**（跨源 403 负例）、**A9**（无 team 会话的降级空态）、**A10**（硬刷新）、**A11**（卸载后 tab 消失）。脚本与断言表：
   `/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/README.md`、`/Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/mount-smoke.sh`（`check|mount|verify|unmount`，`check` 是只读预检）。
2. ❓（**大幅收窄**）**GitHub CI**：已真跑一次并**红了**（run `38072615574`，node 20 格在 "Set up pnpm" 就挂：pnpm 11.28.5 需要 Node ≥ 22.13）→ 根因已定位并修复（pin `10.34.6` + node-20 加载检查 + 18 条守护），**见 §1.3**；`pnpm install --frozen-lockfile` 已在**干净树 + node 20.20.2 + pnpm 10.34.6 + 全新 store** 下实测 `exit=0`（含两个 esbuild postinstall），整条 job 的其余步骤也在该环境全绿。**仍待验证的只剩「云端重跑」本身**：`actions/setup-node` 的 pnpm cache 命中行为、`pnpm/action-setup@v4` 对 `10.34.6` 的解析、ubuntu runner 上的平台差异——这些只有 Lead push 后的真跑才算数。
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
15. ❓**token 快照会随宿主主题升级而过期**：`tests/fixtures/dsw-theme-tokens.json` 是 2026-10-11 从 DSH 0.2.0-rc.2 的 `@deepseek-ai/dsh-client-ui-theme` 提取的 408 个名字。若宿主改名/删名，我的「令牌存在性」守护会**误报红**（把仍然合法的 DSH 新版 token 判为不存在）；若宿主**新增**名字而插件用了它，本机这份旧快照也会误报。重新生成方式见 §7；这条守护的价值是抓「拼错/编造」，不保证跨版本前向兼容。
16. ✅（**曾是真缺陷 F9，已修并验证**）**「lead 与每个 teammate 都要有一种颜色」**：旧实现 `hash(id) % 5` 在实测 9 泳道下多对同色，Lead 拍板为真缺陷；host-data-2 已改为**按位置**分配 + 5 色真实饱和调色板（`lead` 固定 `PALETTE[0]`）。新语义：`lead` 永远同色 / 同一 teammate 在 **roster 顺序不变**时同色 / 顺序变化时可能变色（有意的取舍）。**已知上限**：第 5 个 teammate 起调色板回绕、颜色重复 —— 5 个真实饱和填充就是上限（`brand-primary` 与正文同色、`onboarding-accent` 属 onboarding 流程），这是诚实上限而非 bug。守护：前 N 条（N=调色板长度）两两不同色 + `laneColorTokens` 位置语义直测 + 全部 token 在 408 定义表内，详见 §5 F9。仍未验证的部分：**跨会话 roster 顺序变化导致 teammate 变色**这一取舍只由文档与注释固定，**没有真机观察**（真机冒烟时 roster 顺序未变）。
17. ❓**面板每次请求到底走哪条读路径未在真机确认**：`src/` 无文件/zstd 代码 ⇒ 请求走宿主服务；服务返回内存事件时约 19 ms（host-data-2 实测），但若落到 `sessionPersistence.open().read()` 之类磁盘回退通道，**冷读一次 ≈1.0 秒**（我实测，§4 事实 17）。删掉 1.5s 跨请求缓存的安全性依赖前者成立——建议真机冒烟时顺带测一次「冷启动后第一次打开面板」的耗时（§1.2 未含此项）。
18. ❓**暗色皮肤下这三个 token 的活页面解析值从未实测**：`label-secondary` / `label-primary` / `label-primary-inverted`。我给出的暗色值（`#cfd3d6` / `#f9fafb` / `#353638`）**全部是定义源推导**（主题 bundle 的第二个皮肤块 + static 字面量），Lead 的 `getComputedStyle` 只在浅色皮肤下做过。这正是「双环 vs 单层」之争唯一缺的一手数据 —— 建议真机冒烟时切到暗色皮肤各读一次这三条（并记下面板 `bg-layer-1` 的实际值），就能把 §5 F8/§1.5 里所有推导换成实测。
19. ❓（**已知上限，Lead 裁定本轮不改**）`MESSAGE_MARKER_MIN_GAP_PX`(9) < `MESSAGE_MARKER_WIDTH`(11)：抽稀只保证标记**位置**间距 ≥9px，保留的两个标记仍可重叠 2px。我在 `tests/layout.spec.ts` 中只断言 gap 下限、**不**断言 `gap >= width`（那会刻意为红）；若后续把它改成 ≥12，把那条断言补上即可。
20. ❓（**已知启发式 + 显式保留项，Lead 裁定本轮不改**，ui-2 要求记档以免收尾时被当成新 bug）chip 的 `inside` 阈值 `TASK_CHIP_INSIDE_MIN_WIDTH = 148px`：`labelPlacement === 'inside'` 仅当**条宽 ≥ chip 宽**，语义是"条装得下完整文字才内嵌，否则右侧挂靠"。148 是**与 chip 等宽的启发式**而非实测最优值——任何更窄的条一律右侧挂靠（例如 100px 的条不内嵌文字）。`tests/layout.spec.ts` 因此只断言结构（两条轨道不相交、`TASK_CARD_TOP === task 轨 y`、`TASK_CARD_HEIGHT <= TASK_TRACK_HEIGHT`）与 `labelPlacement` 的**两端情形**，**不**断言 148 这个魔数；若日后改为自适应，请同步更新 `labelPlacement` 的断言口径。（同批显式保留项还有 ❓19：`MESSAGE_MARKER_MIN_GAP_PX(9) < WIDTH(11)` 可重叠 2px；以及真机目视项：条高 10 / chip 36 / `dtg-msg-out` 命中数 / `data-build`，归 Lead。）
21. ✅（**已裁决：不做**，Lead 2026-10-12）是否给 `user-prompt` 补 `to` —— **不做**。理由：用户只要求"我本人发起的对话用固定颜色"，而当前"prompt 挂在其承载泳道上"的语义已经正确（读作 `incoming`，即"我收到了你的话"，符合 §18.7 规则 4）；补 `to` 属于**行为变更**，且会让人类发言在视觉上**翻倍**（同一句话出现在两条泳道上）。我的守护两种形态都已覆盖，因此这条裁决不产生任何断言改动。

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

**完整复现 CI 的 job（含最低 node 版本），不需要改本机环境** —— 这就是 §1.3 用的那套；注意 CI 的 pnpm 是 `10.34.6`、node 20 格是 `20`：

```bash
REPO=/Users/lzx/Documents/GitHub/dsh-task-gantt
curl -fsSL https://nodejs.org/dist/v20.20.2/node-v20.20.2-darwin-arm64.tar.gz -o /tmp/node20.tgz
mkdir -p /tmp/node20 && tar -xzf /tmp/node20.tgz -C /tmp/node20 --strip-components=1
mkdir -p /tmp/pnpm10 && curl -fsSL https://registry.npmjs.org/pnpm/-/pnpm-10.34.6.tgz | tar -xz -C /tmp/pnpm10
rm -rf /tmp/ci-clean && mkdir -p /tmp/ci-clean && git -C "$REPO" archive HEAD | tar -x -C /tmp/ci-clean
cd /tmp/ci-clean
export PATH=/tmp/node20/bin:$PATH
PNPM="node /tmp/pnpm10/package/bin/pnpm.cjs"
$PNPM install --frozen-lockfile --store-dir /tmp/pnpm-store   # 全新 store；应看到两个 esbuild postinstall Done
$PNPM run typecheck && $PNPM run test && $PNPM run build && $PNPM run verify:build && $PNPM run verify:meta
node -e "import('./lib/index.js').then((m)=>{if(typeof m.apply!=='function'||m.name!=='dsh-task-gantt')throw new Error('host half contract broken');console.log('host half loads on',process.version)}).catch((e)=>{console.error(e);process.exit(1)})"
# 干净树没有 .git，freshness 等价检查：
for f in index.js client.js index.js.map client.js.map; do diff <(md5 -q "$REPO/lib/$f") <(md5 -q "/tmp/ci-clean/lib/$f") && echo "✓ $f"; done
```

契约 v2 的两份 fixture 都可重新生成（**改完请一并提交，否则 CI 会红**）：

```bash
# 1) tests/fixtures/lead-team-journal.json —— 真实会话日志（含全部 message 事件）
unzstd -c ~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-task-gantt--/session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99/session.v4.jsonl.zstd > /tmp/lead-session.jsonl
python3 - <<'EOF'
import json
keep=[]
for line in open('/tmp/lead-session.jsonl'):
    line=line.strip()
    if not line: continue
    e=json.loads(line); t=e.get('type')
    if t in ('session','turn/start','step/start','step/end','team/task','team/member','subagent/catalog',
             'team/message/queued','team/message/delivered','user/message'):
        keep.append(e)
    elif t=='tool/call' and str((e.get('data') or {}).get('name','')).startswith('team_task_'):
        keep.append(e)
keep.sort(key=lambda e: e.get('seq', 0))
print('events', len(keep))   # 只做结构保留；长文本字段（subject/description/label/senderName/content[].text）裁到 90 字符
json.dump({'_note':'VERBATIM structure from a real log; long text clipped to 90 chars','events':keep},
          open('tests/fixtures/lead-team-journal.json','w'), ensure_ascii=False, indent=1)
EOF

# 2) tests/fixtures/dsw-theme-tokens.json —— 宿主主题定义的 token 名快照（408 个）
#    定义源 = app.asar 内 @deepseek-ai/dsh-client-ui-theme/lib/client.js（不是 better-sidebar 的产物）
#    提取该文件后收集 /(--(?:dsw|ds)-[a-z0-9-]+)\s*:/ 的全部匹配并排序去重。
```

真实日志 fixture 的历史来源（同一条命令，旧快照 234 事件）：

```bash
unzstd -c ~/.dsh/sessions/--Users-lzx-Documents-GitHub-dsh-task-gantt--/session-4d51254b-d8f4-4f21-a245-6b3ee56f6a99/session.v4.jsonl.zstd > /tmp/lead-session.jsonl
# tests/fixtures/lead-team-journal.json = 该文件的 session header + 全部 turn/step 事件 + 全部 team/* 事件
# + 全部 team_task_* tool/call；仅把超长人读文本（subject/description/label）截到 90 字符，
# keys / seq / time / status / revision / id / 事件顺序原样保留。
```
