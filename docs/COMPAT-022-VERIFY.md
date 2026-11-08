# DSH 0.2.2-rc.1 适配提交 —— 独立验证报告（verifier）

> 独立验证，不采信 Lead 与两份审计文档的自述。本文件所有结论均来自本机实跑：
> 仓库 `/Users/lzx/Documents/GitHub/dsh-task-gantt`、真实 `~/.dsh/sessions/**/session.v4.jsonl.zstd`（只读）、
> 运行中实例 `http://127.0.0.1:60392`（只读 API）、`/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`（0.2.2-rc.1）。
>
> **验证目标（两次前移，见 §1）**
> - 起点：`164011e`（Lead 指定目标；验证中发现其 `dev-verify` 参数解析缺陷 D9）；
> - 终态：`926886e`（D9 修复 + 文档 Addendum；本报告以它为门禁目标，`164011e` 的结论保留并标注）。
>
> 脚本与原始日志：`/tmp/verify-022/`（`*.log`、`*.out`、`scan_events.py`、`scan_doc_facts2.py`、`theme-client-022.js`、`head/` = `git archive 164011e src` 快照）。
> 唯一写入：本文件。未修改 `src/**`、`tests/**`、`lib/**`、`package.json`、`~/.dsh/**`，未重启 host、未安装插件。
> 验证时间窗：2026-11-08T23:37–23:53 +08:00（期间当前 0.2.2 团队仍在活跃写日志，部分数字会漂移，已逐条标注）。

---

## 0. 结论速览

| # | 门禁 | 结果 | 关键证据 |
|---|---|---|---|
| 1 | git 状态与提交 | **PASS**（新 HEAD 干净；`164011e` 提交期曾因并行修改出现未提交改动，已由 `926886e` 收口） | §1 |
| 2 | `pnpm run check` | **PASS**，exit 0；typecheck 0 错误、45 files / 946 passed / 1 skipped、build/verify:build/verify:meta OK、`git diff --exit-code HEAD -- lib` 干净 | §2 |
| 3 | `dev-verify`（默认 + 3 个 0.2.2 团队 + 0.2.1 旧日志 + 2 个附加工作区） | **PASS**（9 条命令全 exit 0、`ALL CHECKS PASSED`、`sessions in` 行均指向正确工作区）；**`164011e` 上 slug 形式无效（D9），`926886e` 修复后有效** | §3 |
| 4a | 0.2.2 后 `team/message/queued\|delivered` = 0 | **PASS**（601/601 全在升级前；124 个升级后写入文件 0 条；最后一条 2026-10-21T19:17:41+08） | §4.1 |
| 4b | htDot-bridge Lead `d4d2e505`：agent-message relay = 32、mailbox = 0 | **PASS**（32 条 relay / 8 个不同 sender / 0 条 mailbox；头模板 32/32 `Team message from <name>:`） | §4.2 |
| 4c | 0.2.2 主题 token 419 且与 fixture 相等 | **PASS**（419 distinct，集合与 `tests/fixtures/dsw-theme-tokens.json` 完全相等） | §4.3 |
| 5 | 运行中实例 ping / timeline | **PASS**（ping ok；d4d2e505：9 lanes / 130 message spans / 16 个方向对 / **0 缺 to、0 from.kind=system**；当前团队 792532d9：4 lanes / 16 spans / 0/0） | §5 |
| 6 | 对抗性审阅（diff/文档数字） | **PASS（带保留）**：无 0.2.1 行为回退；dev-verify 仍有两处弱化/静默回退；文档有 1 处事实错误 + 1 处差一数字 + 若干不可复现快照（§7） | §6/§7 |

**最终判定：PASS**（就“0.2.2-rc.1 适配 + 门禁”而言；理由与限定见 §8）。**文档层需更正 2 处、澄清若干处；建议后续加固 1 处门禁**，均不影响插件运行面。

---

## 1. 门禁 1：git 状态与提交

**命令与输出（节选）**

```bash
$ git log --oneline -3
926886e fix(dev-verify): keep the workspace slug when --root is absent; record D9 in the audit
164011e fix(dsh-0.2.2-rc1): the mailbox is gone; make the fold and the real-log verifier era-neutral
2e095be docs(design): save the 90 Figma build scripts for lossless replay
$ git status --short          # 空输出
$ git rev-parse HEAD
926886ecc319f95a4cf8e684834b7304ac42dd7f
$ git show 926886e --stat --format='COMMIT %h %s'
 CHANGELOG.md              |   5 +++
 docs/COMPAT-022-EVENTS.md | 110 +++++++++++++++++++++++++++++++++++++++++-----
 src/host/dev-verify.mts   |   9 +++-
 3 files changed, 111 insertions(+), 13 deletions(-)
```

- `164011e` 的变更面（`git show 164011e --numstat`）：18 个文件，含 `src/host/fold.ts(+22/−11)`、`src/host/timeline.ts(+8/−6)`、`src/host/dev-verify.mts(+157/−44)`、`src/shared/contract.ts(1/1)`、`tests/fixtures/dsw-theme-tokens.json(+15/−4)`、`tests/host-message-022.spec.ts(+301)`、两份审计文档、`lib/**`、`CHANGELOG`、README、package.json 版本号。
- **过程事实（重要）**：23:37 我开始时 `git status --short` 为空、HEAD=`164011e`；**23:39:43** 工作树出现未提交改动（`src/host/dev-verify.mts` 参数解析修复 + `docs/COMPAT-022-EVENTS.md`），此后 23:41:28 提交为 `926886e`。因此本报告对 `164011e` 的门禁 3 结果标注为 **D9 无效**（见 §3.2），对 `926886e` 的结果为有效复验。
- `lib/` 与 HEAD 一致：`pnpm run check` 的最后一步 `git diff --exit-code HEAD -- lib` 通过（§2），之后 `git status --short` 仍为空。
- `contract.ts` 的 `BUILD_LABEL` = `v0.3.3`（`src/shared/contract.ts:31`），构建产物 `lib/client.js` 内也含 `"v0.3.3"`（`grep -o 'v0\.3\.[0-9]'` → 1 处）。

**判定：PASS**（新 HEAD 工作树干净、提交内容与声明一致；已注明提交期发生过的并行修改）。

---

## 2. 门禁 2：`pnpm run check`（HEAD `926886e`，log 全文 `/tmp/verify-022/check-926886e.log`）

```bash
$ pnpm run check > /tmp/verify-022/check-926886e.log 2>&1; echo "EXIT=$?"
EXIT=0
```

关键输出：

```text
$ pnpm run typecheck && pnpm run test && pnpm run build && pnpm run verify:build && pnpm run verify:meta && git diff --exit-code HEAD -- lib
$ tsc -p tsconfig.json --noEmit
 Test Files  45 passed (45)
      Tests  946 passed | 1 skipped (947)

  lib/index.js       82.5kb
  lib/client.js      267.1kb
[dsh-task-gantt] built lib/index.js + lib/client.js
[verify-build] OK
  host half   lib/index.js  — ESM, exports name/inject/apply (0 specifier(s), all @deepseek-ai/* or relative)
  client half lib/client.js — window.__ModuleLoader__.load({ id: "dsh-task-gantt", factory }) invoked once, factory returned exports
[verify-meta] OK
  dsh-task-gantt/locale/en.json resolves through exports
  icon ./icon.svg → image/svg+xml, 2277 bytes (limit 262144)
```

- 退出码 **0**（整条 `&&` 链含最后 `git diff --exit-code HEAD -- lib`；`git status --short` 事后为空 → build 无漂移）。
- 数字与 CHANGELOG/提交信息自述（45 files / 946 passed / 1 skipped）”一致。
- 另：在 `164011e` 干净状态下 23:37:48–23:39 也跑过一次，同为 exit 0 / 45 files / 946 passed / 1 skipped（未单独留全文日志；结论与 `926886e` 相同）。
- 新回归文件 `tests/host-message-022.spec.ts` 单独复跑：`1 passed (1) / 7 passed (7)`（与“7 用例”声明一致）。

**判定：PASS**。

---

## 3. 门禁 3：`dev-verify` 真机自检（HEAD `926886e`，原始日志 `/tmp/verify-022/nh-*.log`）

命令统一为 `node --experimental-strip-types src/host/dev-verify.mts …`（cwd = 仓库根）。每个场景记录 **`sessions in …` 行**（证明 slug 真生效）、lead 选中 id、lanes、delivery form、判定、exit code。

### 3.1 有效复验（`926886e`）

| # | 调用 | `sessions in …` | 选中 lead | lanes | delivery form 行 | 结果 | exit |
|---|---|---|---|---|---|---|---|
| 1 | **无参** | `--Users-lzx-Documents-GitHub-dsh-task-gantt--: 18` | `792532d9-b234-4a60-8b04-153ae52141f9` | **4** | `injected only (queued=0, unpaired=0, injectedOnly=3)` | ALL CHECKS PASSED | 0 |
| 2 | `<slug task-gantt>` | `…dsh-task-gantt--: 18` | `792532d9…` | 4 | `injected only (…, injectedOnly=3)` | ALL CHECKS PASSED | 0 |
| 3 | `<slug htDot-bridge>` | `--Users-lzx-Documents-GitHub-dsh-htdot-bridge--: 32` | `d4d2e505-5cc6-4322-8186-38f472fee03f` | 9 | `injected only (queued=0, unpaired=0, injectedOnly=32)` | ALL CHECKS PASSED | 0 |
| 4 | `<slug Htdot-OrderCenter>` | `--Users-lzx-Documents-sunteng-Htdot-OrderCenter--: 6` | `06b4e5a6-6891-4988-b5a1-e474db507881` | 5 | `injected only (…, injectedOnly=2)` | ALL CHECKS PASSED | 0 |
| 5 | `<slug dsh-team-group>` | `--Users-lzx-Documents-GitHub-dsh-team-group--: 22` | `fd60565f-cdbb-4234-88e2-146ddda95bae` | 9 | `injected only (…, injectedOnly=182)` | ALL CHECKS PASSED | 0 |
| 6 | **`--root 4d51254b…`**（无 slug） | `…dsh-task-gantt--: 18` | `4d51254b-d8f4-4f21-a245-6b3ee56f6a99`（0.2.1 旧团队） | 9 | `mailbox + injected (queued=368, unpaired=0, injectedOnly=1)` | ALL CHECKS PASSED | 0 |
| 7 | `<slug htDot-bridge> --root d4d2e505…` | `…htdot-bridge--: 32` | `d4d2e505…` | 9 | `injected only (…, injectedOnly=32)` | ALL CHECKS PASSED | 0 |
| 8 | `<slug research>`（附加） | `--Users-lzx-Documents-research--: 172` | `af2d2967-8fb9-4329-a26f-afbfae44cb87` | 6 | `injected only (…, injectedOnly=5)` | ALL CHECKS PASSED | 0 |
| 9 | `<slug dsh-capability-settings>`（附加） | `--Users-lzx-Documents-GitHub-dsh-capability-settings--: 151` | `4767a48b-4623-49c5-818d-b17f38790279` | 3 | `injected only (…, injectedOnly=2)` | ALL CHECKS PASSED | 0 |

附加断言行（与被审文档相关）：

```text
# research（唯一 id 命名命中在此）
  dispatches total: 20; lane rows named by something other than their id: 60;
  id-named honest fallbacks: 1; id-named WITH a name claim: 0
ok  : no roster row that HAS a name may still be named after its own session id (found 0)

# htDot-bridge（该工作区从未调用 ask_user_question）
  questions folded: 0; status tally: []
  question tool calls in the raw logs: 0
ok  : every raw question call produced a folded record (0 call(s), 0 folded)

# team-group / capability-settings（都已折叠全部问题调用）
  team-group:        question tool calls in the raw logs: 2;  questions folded: 2
  capability-settings: question tool calls in the raw logs: 28; questions folded: 28
```

- 0.2.1 旧日志数字独立复核（直接解压 `session-4d51254b…/session.v4.jsonl.zstd`）：`queued=368, delivered=368`、注入 `team-message=142, agent-message/relay=1` → 与 `dev-verify` 的 `queued=368, injectedOnly=1` 一致；说明混合代际仍 PASS、未回退。
- 注意：默认工作区三项数字是**活数据**。Lead 自测记录为 `lanes=3`；我实测 **lanes=4**，因为当前团队在 23:37:30 新增了 `verifier` 泳道（member 事件 `verifier id=bc349aaa… phase=active`，我自己的会话），事件数/会话数也从 1537/17 涨到 1701/18（我跑期间继续涨到 1727）。这不是缺陷，是 live 漂移（§7 编号 I-3）。

### 3.2 `164011e` 上的无效复验（D9，Lead 已确认并修复）

`164011e` 的 `src/host/dev-verify.mts:102-105` 在**无 `--root`** 时把 argv[0] 当选项值滤掉：

```ts
const rootFlagIndex = argv.indexOf('--root')          // 无 flag 时为 -1
const slug = argv.find((arg, index) => index !== rootFlagIndex && index !== rootFlagIndex + 1)
  ?? '--Users-lzx-Documents-GitHub-dsh-task-gantt--'  // index !== 0 → 丢掉唯一的 slug
```

实测（`164011e` 干净工作树，23:38）：

```text
$ node … dev-verify.mts '--Users-lzx-…-dsh-task-gantt--'   → sessions in --Users-lzx-…-dsh-task-gantt--: 18 (正确)
$ node … dev-verify.mts '--Users-lzx-…-dsh-htdot-bridge--' → sessions in --Users-lzx-…-dsh-task-gantt--: 18  ← slug 被丢弃
$ node … dev-verify.mts '--Users-lzx-…-Htdot-OrderCenter--' → sessions in --Users-lzx-…-dsh-task-gantt--: 18 ← 同上
$ node … dev-verify.mts '--Users-lzx-…-dsh-team-group--'   → sessions in --Users-lzx-…-dsh-task-gantt--: 18  ← 同上
```

4 条 `slug` 命令全部 exit 0 且 `ALL CHECKS PASSED`，但实际验的是默认工作区（`lead 792532d9`，1625 事件的 task-gantt 当前团队日志；htDot-bridge 那次输出里甚至打印 `no team log in this workspace; team locks skipped`）→ **对被点的三个工作区（htDot-bridge / OrderCenter / team-group）而言是空转 PASS**。**这些结果在报告中一律作废**。

`926886e` 的修复（`positionals = rootFlagIndex === -1 ? argv : argv.filter(...)`）已在上表 #2–#5、#8、#9 复现：每条命令的 `sessions in` 都是被点的 slug，且 lead/数字正确。**D9 判定：`164011e` = FAIL（自测工具缺陷，不涉及插件运行面）；`926886e` = PASS（已修）**。

交叉验证：在 `164011e` 上我用 `dev-verify <dummy> <slug>`（令 slug 落在 argv[1]，旧解析下等价于正确传参）跑出的 4 个团队结果 —— htDot-bridge 32/d4d2e505、OrderCenter 6/06b4e5a6、team-group 22/fd60565f、research 172/af2d2967 —— 与 `926886e` 正常形式的复验完全一致，说明“修复只影响传参，不影响选日志逻辑”。

### 3.3 门禁健壮性（新发现，非阻塞）

`--root` 指向不存在/不属于该工作区的 session 时，脚本只 `console.warn` 然后**静默回退**到自动选出的 lead 并 exit 0：

```text
$ node … dev-verify.mts --root deadbeef-0000-0000-0000-000000000000
--root deadbeef-…: no such session in this workspace
=== lead 792532d9-…: 1727 events
ALL CHECKS PASSED                                    # exit=0
$ node … dev-verify.mts '--Users-…htdot-bridge--' --root 4d51254b-…
--root 4d51254b-…: no such session in this workspace
=== lead d4d2e505-…: 2539 events
ALL CHECKS PASSED                                    # exit=0
```

即：`--root` 拼错不会让门禁变红（会在 stderr 提示后验另一份日志）。建议（不阻塞）：`--root` 给定时若找不到目标 session 应 `process.exitCode = 1`。

**判定：PASS**（9/9 命令正确生效；D9 已修复并复验；残留 `--root` 静默回退记为改进项）。

---

## 4. 三条关键事实独立复核（自写脚本，不引用文档数字）

### 4.1 0.2.2 之后 `team/message/*` = 0（脚本 `/tmp/verify-022/scan_events.py`）

口径：遍历 `~/.dsh/sessions/**/session.v4.jsonl.zstd`，用系统 `zstd -d -c` 解多帧、逐行 JSON 解析；同时按“文件 mtime ≥ 2026-11-04T00:00+08”与“事件 `time` ≥ 同一时刻”两种口径统计。

```text
session.v4 files: 771        # 采样时刻不同，随后又新增到 772（live 写日志）
mtime >= 2026-11-04: 124
decode/parse failures: 0
team/message counts (all files): {'team/message/queued': 601, 'team/message/delivered': 601}
files carrying mailbox events: 14
last mailbox: team/message/queued 2026-10-21T19:17:41.056000+08:00 ~/.dsh/sessions/--Users-lzx-Documents-research--/session-af07a1de-6edf-44c2-9b05-e14b03d261e8/session.v4.jsonl.zstd
last mailbox: team/message/delivered 2026-10-21T19:17:41.074000+08:00 （同一文件）
post-upgrade files: 124  of which carry mailbox: 0
```

按事件时间的第二遍扫描（`scan_doc_facts2.py`）：`team/message/queued: pre=601 / post=0`，`team/message/delivered: pre=601 / post=0`。
**结论：0.2.2 时期 `team/message/queued|delivered` = 0，最后一条在 2026-10-21T19:17:41+08 —— 与提交/文档结论一致。**

### 4.2 htDot-bridge Lead `session-d4d2e505-…`

直接解压该日志（`2539` 行）：

```text
user/message: 95
injected kinds: {('agent-message','relay'): 32, ('subagent-settled','notice'): 31,
                 ('time-context','snapshot'): 16, ('user',None): 6, …}
team/message/queued: 0
team/message/delivered: 0
team/member: 16   team/task: 50
```

- 32 条 `source.kind='agent-message', form='relay'`；8 个不同 `senderSessionId`；32/32 首行匹配 `Team message from <name>:`（0 条不匹配）。
- **结论：32 条 relay、0 条 mailbox —— 与声明一致。**

### 4.3 0.2.2 主题 token：419 且与 fixture 相等

用 `/tmp/dsh-asar2/asar.mjs` 从 **运行中 app 的 asar**（`@deepseek-ai/dsh-client-ui-theme/lib/client.js`）取原文，按 fixture 注释里的口径 `/(--(?:dsw|ds)-[a-z0-9-]+)\s*:/` 去重计数：

```text
file bytes: 140148
distinct tokens: 419
total definition matches: 630
fixture _count: 419   len: 419
equal: True
only in host: []      only in fixture: []
```

- 插件引用的 token 全部仍定义：剥离注释/字符串后的 `distinct referenced tokens = 46`（若把注释里提到过的也按裸字符串计则 51），`undefined refs = 0`。
- **结论：419 且与 fixture 完全相等 —— PASS**。（`fixture._source` 里写的 “138133 B” 与 asar 条目实际 140148 B 不符，见 §7 I-5；不影响计数结论。）

---

## 5. 门禁 5：运行中实例只读实测

```bash
$ curl -s -X POST -H 'content-type: application/json' -d '{}' http://127.0.0.1:60392/dsh-task-gantt/api/ping
{"ok":true,"value":{"apiVersion":1,"host":"dsh-task-gantt"}}
```

`POST /dsh-task-gantt/api/timeline {"sessionId":"session-d4d2e505-5cc6-4322-8186-38f472fee03f"}`（0.2.2 团队 Lead，原始响应 `/tmp/verify-022/timeline-d4d2e505.json`，916 875 B）：

```text
ok: true   lanes: 9   [lead, scout, architect, pm, ux, backend, frontend, devops, tester]
message spans: 130（每方向在双方泳道各画一次）
missing to: 0        from.kind=system: 0        to.kind=system: 0
direction pairs: 16  （lead↔devops 14/16、lead↔tester 18/18、lead↔pm 8/10、lead↔backend 8/6、…）
notes: "79 unique message(s): 144 message/prompt copies …; 65 team/agent message(s) arrived as injected `user/message` events (DSH 0.2.1's delivery form) …"
```

`POST … {"sessionId":"session-792532d9-b234-4a60-8b04-153ae52141f9"}`（**当前 0.2.2 团队**）：`lanes=4`（lead / events-auditor / sdk-auditor / verifier）、message spans=16、`missing to=0`、`from.kind=system=0`、`to.kind=system=0`。

**重要限定（诚实标注）**：运行中 profile（`~/.dsh/profiles/desktop`）安装的是 **dsh-task-gantt 0.3.2**，不是 `v0.3.3` 提交版。对比仓库构建产物与已安装 `lib/index.js`，**唯一差异就是 notes 文案一行**：

```diff
- … injected `user/message` events (DSH 0.2.1's delivery form) and are drawn as exchanges
+ … injected `user/message` events (the delivery form DSH 0.2.2 writes) and are drawn as exchanges
```

`fold.ts`/`timeline.ts` 在本轮提交中为**注释 + 这一句 notes 文案**改动（§6.1），故 live 实例测得的折叠/箭头行为等价于本提交；但**不能**用 live 实例证明 `v0.3.3` 包被真实加载（见 §9）。另外根路径 `GET /` 返回 401（`dsh web authentication required`），无法从 boot 数据独立确认 client 模块注册。

**判定：PASS**（ping/timeline 全通；箭头 0 缺 to、0 system）；限定见上。

---

## 6. 门禁 6：对抗性审阅

### 6.1 diff 会否让 0.2.1 行为回退？—— 结论：不会

逐行核对 `git diff 2e095be 164011e`：

| 文件 | 改动性质 | 风险 |
|---|---|---|
| `src/host/fold.ts` | **纯注释**（22 增 11 删，全部在 `/** */`、`//` 内；无一行可执行代码） | 0（0.2.1 折叠逻辑零变化） |
| `src/host/timeline.ts` | 注释 + **1 条 notes 模板字符串**（“0.2.1's delivery form” → “the delivery form DSH 0.2.2 writes”） | 0：面板不渲染 notes（`src/client/ui/BoardView.tsx:1610-1616` 注释明写 `The host's notes are deliberately NOT rendered`），仅 API 响应文本变化 |
| `src/client/panel-style.ts` | 注释里的 token 计数 408→419 | 0 |
| `src/shared/contract.ts` | `BUILD_LABEL` v0.3.2→v0.3.3 | 0（展示用） |
| `tests/fixtures/dsw-theme-tokens.json` | 按 0.2.2 重生成（+12/−1） | 0：已独立核验 419=asar 定义集合；被删 token 插件未引用 |
| `src/host/dev-verify.mts` | 自检工具（不打包、不运行于宿主） | 门禁层面有风险，见 6.2 |
| `tests/host-message-022.spec.ts` | 新增 7 用例回归锁 | 0（测试全绿） |
| `lib/**` | 重新构建，与 HEAD 一致 | 0（`git diff --exit-code HEAD -- lib` 通过） |
| CHANGELOG / README / package.json | 版本与说明 | 0 |

**0.2.1 兼容实证**：`--root 4d51254b…`（0.2.1 时代团队，`queued=368/injectedOnly=1`）PASS，且混合代际日志 `af07a1de`（research）等亦 PASS —— 旧邮箱形态的折叠未被改动。

### 6.2 dev-verify 新逻辑的误判风险

1. **D9（已确认并修复）**：见 §3.2。影响面 = 自检工具本身（`<slug>` 静默验错工作区），不涉及插件运行面；修复提交 `926886e` 已复验。
2. **`--root` 找不到目标时静默回退并 exit 0**（§3.3，现行问题，建议修）。
3. **问题记录锁被弱化**：断言条件为 `askCalls === 0 || questionTotal > 0`，但消息文案写的是 “every raw question call produced a folded record”。只要求“至少折出 1 条”，若 28 次调用只折出 1 条也会 PASS（当前实测各工作区均 `folded == calls`，暂未触发）。建议改为 `questionTotal >= askCalls` 或按 callId 覆盖。
4. 注入段的箭头断言只检查 “`from.kind==='system'` 且 sender 在 roster”，**未断言 `to` 存在**；`to` 覆盖由 live API 抽查补足（§5：0 缺 to）。建议在 dev-verify 里补一条 `to === undefined` 计数断言。
5. 逐日志会计恒等式 `queued + unpaired + (injectedExchanges − injectedDuplicates) === records.length` 与折函数同源，主要锁“不引入第四种来源”；现有 0.2.2/0.2.1 日志均 `offending logs: 0`。
6. `pickLatest` 以 `lastEventTime + (有 children ? 1 : 0)` 排序，1 ms 之差可压过“有子会话”的日志；当前被 `isTeamLog`（含 `team/task|team/member`）前置过滤，实测两个团队工作区选择均正确（htDot→d4d2e505，team-group→fd60565f）。

### 6.3 文档数字/结论 vs 实测

（“漂移”= 当前 0.2.2 团队仍在写日志导致的可解释变化；“不一致”= 口径/事实层面的问题。）

| 文档条目 | 文档值 | 我的实测 | 结论 |
|---|---|---|---|
| EVENTS F0-2 文件盘点 | 769 v4 / 7 `session.jsonl.zstd` / 39 slug | 771–772 v4 / 7 / 39 | 漂移（live 增量），一致 |
| EVENTS F1-1 邮箱 | 601/601，14 日志，最后 2026-10-21T19:17:41 | **601/601，14 日志，最后 2026-10-21T19:17:41.056/.074** | **一致（精确）** |
| EVENTS F1-2 `team-message` 注入 | 581 条 | **581 条** | 一致 |
| EVENTS F1-3 代际表 | 如 user/message 382/1163、job 7160、descriptor 36、settled 等 | 我全量口径 post：user/message 1248、job/registered 8453、descriptor 37、settled 59… | 漂移（live），方向一致；个别（settled 90 vs 59）口径不可复现 → I-6 |
| EVENTS F1-4 注入总量 | 2050（=581+1469） | **2059（=581+1478）**，多出的 9 条为验证期间新产生的 relay（同窗口 post 增量 +9） | 漂移，可解释 |
| EVENTS F1-5 `agent-message` 无 senderName/messageId | 1469（0.2.2 期 90） | 1478（post 99）；确实只有 `{kind,form,senderSessionId}` | 一致（+漂移） |
| EVENTS F2-2 d4d2e505 live 表 | lanes 9 / message spans 130 / 0 缺 to / 0 system | **lanes 9 / spans 130 / 0 / 0** | **一致（精确）** |
| EVENTS F3-1/F3-2 settled 不产生 record | settled 注入 90（0.2.2 期）/ 83 日志含 settled | 83 日志含 settled **精确一致**；post settled=59（口径差异，见 I-6）；`fold.ts` 仅认 `team-message/agent-message`，settled 不产生 record | 结论一致，计数不可复现 |
| EVENTS F3-3 头模板覆盖 | 2050 条 0 条 NO-MATCH | post 99 条：96 `Team message` + 3 `Agent <id>`，**0 NO-MATCH** | 一致 |
| EVENTS F4-1 catalog | 0.2.2 期 36 条 label 全非空 | **36/36 label 非空** | 一致 |
| EVENTS F4-2 descriptor | “0.2.2 新增；< 2026-11-04 为 0 条” | **事实不符**：全库 pre-cutoff descriptor **312 条**（v3；311 带 label；样本 2026-10-15/10-22/10-23），post=37 | **不一致 → I-1** |
| EVENTS F5-2 team 枚举 | phase {provisioning:32, active:32}；task status {pending:13,in_progress:13,completed:9} | post：phase 33/33；status 14/15/12；**无新枚举值** | 一致（+漂移） |
| EVENTS F6-1/2 发现层 | 仅 3 种文件名；417 根/352 带前缀/1 裸 | 772 v4 + 7 旧格式，无 v5/索引；**418/353/1** | 一致（+漂移） |
| EVENTS F8-2 spliced 配对 | 126/126 内容配对 | post：spliced 插入的 agent-message = 99 = user/message 注入 99（同一消息双记录，支持“不作第二来源”） | 一致（未复跑 126/126 逐条配对） |
| API #11 主题 token | 419；0.2.1 为 408；文件 138133 B；插件引用 51 个 | **419 精确相等**；408 **UNVERIFIED**（0.2.1 app 副本已被移走）；asar 条目 **140148 B**；引用 46（剥离注释）/51（含注释裸串），全部定义 | 419 一致；I-5/I-7 |
| API #1–#10、#12 | 无破坏性变化 | 本节不再重复（task-2 范围），但运行中 0.2.2 宿主上 host 半可加载、路由可用、旧版（0.3.2）host 行为等价 | 部分支持 |
| CHANGELOG 0.3.3 / commit msg | 45/946/1；v0.3.3；368+1；htDot d4d2e505/9 lanes/32；**15 个方向对**；默认 `792532d9` lanes=3 | 45/946/1 ✓；v0.3.3 ✓；368+1 ✓；htDot 9/32 ✓；**方向对 16 个**（8 名 teammate × 双向，逐对数字与文档相同）；默认 lanes=4 | **I-2、I-3** |
| EVENTS §8.2（工作区版 5/5） | capability-settings `injectedOnly=61`、task-gantt `queued=368+1` | 现行选 Lead 逻辑（D6 修复后）：capability→`4767a48b`/`injectedOnly=2`，默认 task-gantt→`792532d9`/`injectedOnly=3` | 记录时序不同导致的 stale（§13 部分替代）；**I-4** |
| EVENTS §13.2/13.3 快照 | 默认 17 sessions / 1537 events / lanes=3；htDot 32/2539/lanes=9；`--root` lanes=9 | 默认 **18 / 1701（期间 1727）/ lanes=4**；htDot 32/2539/9 ✓；`--root` 9 ✓ | htDot/root 精确一致；默认因 verifier 泳道加入而漂移 → I-3 |

---

## 7. 不一致清单（编号，全部非阻塞）

| 编号 | 类别 | 内容 | 证据 | 建议 |
|---|---|---|---|---|
| **I-1** | **文档事实错误** | `docs/COMPAT-022-EVENTS.md` F4-2 称 `subagent/descriptor` 是 “0.2.2 新增事件；< 2026-11-04 为 0 条”。实测全库 pre-cutoff descriptor **312 条**（v3，311 带 label，样本 2026-10-15/10-22/10-23）；该事件在升级前已存在。 | `/tmp/verify-022/scan_doc_facts2.py` 输出 `descriptor pre: {(3,'label'):311,(3,'no-label'):1}`；样本见 §6.3 | 改成“0.2.2 时期高频（37/36 会话）；<2026-11-04 亦有 312 条（v3）”——D8 仍是可选增强，但“新增”不成立 |
| **I-2** | 数字差一 | commit msg / CHANGELOG / API 文档称 d4d2e505 “**15 个方向对**”。实测 **16**（8 名 teammate × 双向；各对计数 16/14、18/18、8/10… 与文档一致）。 | `timeline-d4d2e505.json`：`direction pairs: 16`（§5） | 改为 16（或说明“15”的口径） |
| **I-3** | 快照漂移（可解释） | 默认工作区 “lanes=3 / 17 sessions / 1537 events” 现在不可复现：lanes=4（新增 verifier 泳道，member 事件 created 1794152250278 = 23:37:30）、sessions 18、events 1701（我最后一次 1727）。 | §3.1 #1、§5 当前团队 4 lanes | 报告/CHANGELOG 标注“截至 23:37 的快照”；无代码问题 |
| **I-4** | 文档 stale | EVENTS §8.2 表（23:29 工作区版）里 capability-settings `injectedOnly=61`、task-gantt `queued=368+1` 是**旧 Lead 选择器**（偏好历史最大团队）的结果；现行选择器下 capability-settings 选 `4767a48b`（`injectedOnly=2`）、默认 task-gantt 选 `792532d9`（`injectedOnly=3`）。§13 已部分更新但没列 capability-settings 新值。 | §3.1 #1/#9；EVENTS §8.2/§13 | §8.2 标注“旧选择器快照”或补一行新值 |
| **I-5** | 元数据错误 | `tests/fixtures/dsw-theme-tokens.json._source` 写该文件 “138133 B”，asar 条目实际 **140148 B**（0.2.2-rc.1）。token 计数 419 不受影响。 | §4.3 | 纠正字节数或删掉该字段 |
| **I-6** | 口径不可复现 | EVENTS F3-1 “0.2.2 期 settled 注入 90 条”，我实测 post-cutoff `subagent-settled/notice` = **59**；`含 settled 的日志 83 个` 则精确一致。疑为其统计含 spliced 副本或时间窗不同。 | `scan_doc_facts2.py`；EVENTS F3-1/F3-2 | 标明统计口径（user/message 注入 vs spliced 插入） |
| **I-7** | 数字口径 | “插件引用 51 个 token”：剥离注释后的真实引用为 **46** 个 distinct（51 = 含注释里裸串的计数）。不影响“全部仍定义”的结论。 | §4.3 | 说明 51 的口径 |
| **I-8** | 门禁健壮性（代码建议） | `--root` 不存在时只 warn 并回退，exit 0。 | §3.3 | `--root` 未命中时置 exit code 1 |
| **I-9** | 门禁断言弱化 | 问题记录锁条件 `askCalls===0 \|\| questionTotal>0` 弱于其文案 “every raw question call produced a folded record”。 | §6.2 | 改 `questionTotal >= askCalls` 或按 callId 覆盖 |
| **I-10** | 门禁覆盖 | dev-verify 未断言注入消息的 `to` 非空（live API 补测 0 缺 to）。 | §6.2 | 增加 `to === undefined` 计数断言 |

**无“会让 0.2.1 行为回退”的不一致**；**无“会让 dev-verify 在‘真正运行了团队日志’的路径上误判 PASS”的不一致**（D9 是“验错工作区”，已在 `926886e` 修复）。

---

## 8. 最终判定

**PASS**。理由：

1. **功能面**：运行中 0.2.2-rc.1 宿主上，host 折叠对真实 0.2.2 团队日志产出正确结果 —— `d4d2e505` 9 lanes / 130 spans / 16 个方向对 / **0 缺收件人、0 发送者回落 system**；当前团队 792532d9 同断言 0/0。0.2.2 “只有注入形态” 的事实（0 mailbox、32 relay）由我独立脚本确认。
2. **门禁面**：新 HEAD `926886e` 上 `pnpm run check` exit 0（45 files/946 passed/1 skipped，lib 无漂移）；`dev-verify` 9 种调用（无参 / 6 个工作区 slug / `--root` 0.2.1 旧库 / slug+root）全部 `sessions in` 正确、`ALL CHECKS PASSED`、exit 0；0.2.1 旧日志仍 PASS（368 邮箱 + 1 注入）。
3. **回归面**：`fold.ts` 为纯注释改动，`timeline.ts` 仅注释 + notes 文案；`--root` 0.2.1 日志实测未回退。无 `system` 假箭头、无缺收件人。
4. **保留项**：`164011e` 提交本身带 D9（slug 被静默忽略）—— 我独立复现，Lead 已在 `926886e` 修复并经我复验；因此“以 `164011e` 为最终交付”会 **FAIL**，“以 `926886e` 为最终交付”为 **PASS**。文档层 I-1（descriptor 事实错误）与 I-2（15 vs 16）建议在下一提交更正；I-8/I-9/I-10 是自检工具的健壮性改进，不阻塞发布。

---

## 9. 我没有验证到的部分（UNVERIFIED）

1. **0.2.1 app 的 408 个主题 token**：`/tmp/dsh-021` 下的旧 app 副本在我开始比对前已被并行会话移走（目录为空），无法独立复核 “408→419、+12/−1” 的旧值；419 与 0.2.2 侧已精确复核。
2. **v0.3.3 包被真实宿主加载**：运行中 profile（desktop）安装的是 0.3.2；我验证了 `lib/index.js` 与已安装版本的唯一差异是 notes 一行、`verify-build` 通过、单元/集成测试全绿，但**没有**把 0.3.3 装进 profile 或重启 host（约束禁止），也没有可视化验证面板 UI。
3. **client 半在 0.2.2 宿主的 boot 注册**：`GET /` 需鉴权（401），无法从 boot 数据确认 `dsh-task-gantt` client 模块 rev；client 半的兼容性结论只能引用 `verify-build` + 运行实例上 host 路由可用 + 0.3.2 客户端在 0.2.2 下实际可用（Lead/其他成员验证，我未复现）。
4. **EVENTS F1-2 的“56 个日志 / 最后 2026-10-21T19:17:47”**、**F8 的 126/126 逐条配对与 75 ms/19.3 s/56.7 min 时差**：只复核了总量/结论方向，未逐条重算。
5. **`~/.dsh` 其他 profile 与插件清单**、`pnpm pack --dry-run`、发布产物内容：不在本任务门禁内。
6. **0.2.2 API 契约逐条**（task-2 范围，`docs/COMPAT-022-API.md` 的 #1–#10/#12）：未逐项重跑去证实；仅以运行中实例可用性与 `verify-build` 结果侧证。

---

## 10. 复现材料

| 路径 | 内容 |
|---|---|
| `/tmp/verify-022/check-926886e.log` | `pnpm run check` 全文（HEAD 926886e，exit 0） |
| `/tmp/verify-022/nh-*.log` | `926886e` 上 9 条 dev-verify 命令的完整输出 |
| `/tmp/verify-022/devverify-*.log` | `164011e` 上 D9 无效复验（4 个 slug 均打印默认工作区）与 workaround 结果 |
| `/tmp/verify-022/scan_events.py` / `scan_events.out` | 全库邮箱事件/注入计数（601/601、14 日志、124 升级后文件 0 条、最后时间） |
| `/tmp/verify-022/scan_doc_facts2.py` / `.out` | header 分布 418/353/1、team 枚举、catalog/descriptor、settled 等文档核对 |
| `/tmp/verify-022/theme-client-022.js` | 从运行中 app.asar 提取的主题 client.js（140148 B）；419 token 与 fixture 比对脚本见 §4.3 |
| `/tmp/verify-022/timeline-d4d2e505.json` / `timeline-792532d9.json` | 运行中插件只读 timeline 原始响应 |
| `/tmp/verify-022/head/` | `git archive 164011e src` 快照（用于证明 D9 在提交版本中存在） |
| `/tmp/verify-022/dev-verify-2e095be.mts` | 旧 HEAD 的 dev-verify（旧参数解析：`process.argv[2]`，说明 D9 是 164011e 引入的回归） |
