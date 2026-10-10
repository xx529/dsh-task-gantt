# 真机挂载冒烟（Lead 执行，verify 提供脚本与预期输出）

本目录只含**可复现的冒烟脚本与断言点**。`verify` 不写 `~/.dsh`：真实挂载会改动
`~/.dsh/profiles/web` 这一个共享资源，多人同时操作会互相踩，因此由 Lead 统一执行。

## 0. 为什么必须做这一步

单测全部跑在假 `req`/`res` 和打桩的 `ctx` 上，证明不了下面这条链路的任何一环：

```
dsh plugin add  →  bundle 行写进 profile  →  宿主 clientModules 扫描 package.json 的
dsh.client.platform==='web' + exports["./client"]  →  /plugins 下发 lib/client.js
→  浏览器 __ModuleLoader__.load 注册 factory  →  cordis 物化  →  ctx.betterSidebar
→  + 菜单出现「任务甘特图」  →  面板能取到 /dsh-task-gantt/api/timeline 数据
```

## 1. 前置检查（只读，可随时跑）

```bash
# 1.1 仓库质量门（在仓库根目录）。注意 freshness 检查必须带 HEAD：
#     `git diff --exit-code -- lib`（不带 revision）比的是「工作区 vs 索引」，
#     一旦有人 `git add lib` 就会假绿，而 HEAD 里可能还是旧产物。
cd /Users/lzx/Documents/GitHub/dsh-task-gantt
pnpm run typecheck && pnpm run test && pnpm run build && git diff --exit-code HEAD -- lib

# 1.2 构建产物形状（与两个已上架插件的产物逐字同形）
head -c 120 lib/client.js; echo
tail -c 60 lib/client.js; echo

# 1.3 manifest 面：宿主 clientModules 要求的三个键
node -e "const p=require('./package.json');console.log(JSON.stringify({main:p.main,client:p.exports['./client'],platform:p.dsh.client.platform,inject:p.dsh.client.inject},null,2))"
```

**预期**

```
window.__ModuleLoader__.load({ id: "dsh-task-gantt", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
return module.exports; } });
{"main":"./lib/index.js","client":{"default":"./lib/client.js"},"platform":"web","inject":[]}
```

## 2. 挂载（写 `~/.dsh`，只有 Lead 做）

```bash
bash /Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/mount-smoke.sh check
bash /Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/mount-smoke.sh mount    # 需要确认
bash /Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/mount-smoke.sh verify
bash /Users/lzx/Documents/GitHub/dsh-task-gantt/tests/e2e/mount-smoke.sh unmount  # 冒烟做完再收尾
```

`mount` 执行的是官方 bundle 通道（brief §2.1）：

```bash
cd ~/.dsh && dsh plugin --profile web add "link:/Users/lzx/Documents/GitHub/dsh-task-gantt"
```

**预期（逐条断言）**

| # | 断言点 | 怎么验 | 预期 |
|---|---|---|---|
| A1 | profile 的 bundle 栈出现本插件 | `grep -rn "dsh-task-gantt" ~/.dsh/profiles/web/*.yml ~/.dsh/profiles/web/*.json 2>/dev/null` | 出现 `dsh-task-gantt` 一行 |
| A2 | 宿主启动日志没有禁用行 | 启动 stderr / `~/.dsh/logs` 中 `disabling profile plugin` | **没有**包含 `dsh-task-gantt` 的行 |
| A3 | 浏览器半被下发 | DevTools Network 过滤 `plugins` → 找到 `client.js`（可能被合并进 combo `plugins/??…`） | 200，且响应体首行是 `window.__ModuleLoader__.load({ id: "dsh-task-gantt"` |
| A4 | 宿主半路由已注册 | DevTools Console：`await fetch('/dsh-task-gantt/api/ping',{method:'POST',headers:{'content-type':'application/json'},body:'{}'}).then(r=>r.json())` | `{ok:true,value:{apiVersion:1,host:'dsh-task-gantt'}}` |
| A5 | 时间线接口可用 | 同上，`/dsh-task-gantt/api/timeline`，body `{"sessionId":"<当前会话 id>"}` | `{ok:true,value:{apiVersion:1,…}}`，`value.source` 是 `log`/`partial`/`live` 之一，且 `notes` 是数组 |
| A6 | 非同源被拒 | Console：`fetch('/dsh-task-gantt/api/ping',{method:'POST',headers:{origin:'http://evil.example'}})` | HTTP 403，body `{ok:false,error:{code:'forbidden',…}}` |
| A7 | tab 出现在 `+` 菜单 | 右侧栏 → `+` → 找到「任务甘特图 / Task Gantt」 | 可见，点击后打开面板 |
| A8 | 面板渲染出泳道 | 打开面板 | 至少 Lead 一条泳道；有 teammate 时应有多条；条内含 subject/description |
| A9 | 降级态不崩 | 在一个**没有** agent team 的会话里打开面板 | 显示空态文案（zh: 当前会话没有 agent team），不是报错、不是白屏 |
| A10 | 硬刷新后仍正常 | Cmd+Shift+R | 以上 A3/A7/A8 仍成立（没有 HMR 残留导致的重复注册错误） |
| A11 | 卸载后 tab 消失 | `dsh plugin --profile web remove dsh-task-gantt` 后重启 | `+` 菜单里不再有该 tab，且 stderr 无残留下载错误 |

## 3. 失败时的定位顺序

1. **A2 命中禁用行** → 看 stderr 里 `semver` 范围：`peerDependencies` 里混进了
   `@deepseek-ai/dsh-*`（brief §2.3 硬规则，`tests/manifest.spec.ts` 会先在 CI 拦住）。
2. **A3 404 / 宿主报 `declares dsh.client but exports no "./client" bundle`** →
   `package.json` 的 `exports["./client"]` 不是字符串或 `{default: string}`，
   或 `lib/client.js` 没提交。
3. **A4 404** → 宿主半没激活：`webServer` 服务不存在，或 `apply()` 抛错。
   看 stderr 的 `dsh-task-gantt:` 日志行。
4. **A7 无 tab** → 浏览器半加载了但 `ctx.get('betterSidebar')` 是 undefined：
   见 `docs/VALIDATION.md` 的**发现 1**（`export const inject` 为空 + 即时软探测的
   顺序竞态）。临时验证手段：Console 里 `window.__DSH_BOOT__` 的 plugins 行顺序。
5. **A8 空泳道** → A5 接口先看 `source` 与 `notes`：`live` 表示没读到会话日志
   （`sessionPersistence` 不可用），这是**已声明的降级**，不是崩溃。

## 4. 冒烟记录要求

Lead 执行后请把**原始输出**（命令 + stdout/stderr 摘要）追加到
`/Users/lzx/Documents/GitHub/dsh-task-gantt/docs/VALIDATION.md` 的「真机冒烟」小节，
每条断言标注 ✅/❌ 与证据。`verify` 不代填这一节。
