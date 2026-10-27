# 实施记录（Figma v1 原型 → 代码）

> 日期 2026-10-27。原型的 7 页见 [`README.md`](./README.md)；本文件记录**这一轮实际落了什么代码、怎么验证、还差什么**。

## 1. 已实现（按原型）

### 图表内核（`timeline-layout.ts` / `GanttChart.tsx` / `styles.ts`）

- **几何**：泳道头 132→**136**，泳道 72→**80**，任务条 20→**22**，任务卡槽 32→**34**（22 条 + 2 间隙 + 10 认领轨），轴 28→**26**；轨道改为 消息 6..18 / 活动 22..32 / 任务 36..70。
- **任务条**：中性填充 + 左 3px 身份色 + 圆角 5 + 11px/500 标签；右端状态字形（✓ / ● / ○ / ✕，形状而非仅颜色）；live 任务右端虚线。
- **认领轨**：条下 2.5px 的双段轨（灰=创建→认领排队，蓝=认领→结束执行）+ 2×7px 交界刻线。数据来自新增纯函数 `claimInstant`（委托 `task-start` 的 `claimStart`，与抽屉的「认领」列同源，不会漂）。
- **移除**：条下 ＋/▶/✓ 三字形事件轨（`taskEventMarks` / `TaskEventMarks` / `TASK_EVENT_GLYPH`），以及它的图例项。
- **泳道头**：去掉与身份药丸重复的色点；药丸 20px/radius 4/11px 500；**唯一**状态指示（spinner/空心点/琥珀点）右对齐；计数行与活动词沿用既有规则。
- **时间轴**：刻度改等宽字体；NOW 由白底方块改为**可点的强调色时间胶囊**（`现在 · HH:MM`），点击回到实时边缘并开启跟随（`onJumpToNow` + `recenterKey`）。
- **页脚**：图例不再常驻两行；收成一行（缩放 − / ⤢ / +、百分比、右端「图例」），完整图例进 `.dtg-legend-pop` 弹层（Esc / 点外部关闭）。

### 面板外壳（`BoardView.tsx` / 新建 `styles-shell.ts`）

- 工具栏 40px 重写：`● 会话日志 | 现在 HH:MM | … | 全部时段 | 跟随(switch) | 筛选(icon+badge) | 刷新(icon)`；删除「N 任务」与长文案；冻结态显示「结束 HH:MM」。
- **加载/错误态可达**：修复 `shownData === null` 早返回导致的空白首帧；骨架 3 行 + 标题 + 正文 + 重试，工具栏下方错误条。
- **单一底部抽屉**：任务 / 消息 / 问题三选一（单一 selection union，互斥），绝对定位覆盖、不压缩图区，Esc / ✕ / 点图空白关闭。
  - 任务：三点时间线（创建/认领/完成）+ 负责/依赖/写入范围/版本/时长 + 描述 + 状态迁移；
  - 消息：方向 + 路由 + 时间 + 全文；
  - 问题：逐题 1—4 题，只显示已选 label（✓）与自由输入，不列未选项；失败只给错误码；unparsed 显示原文。

## 2. 验证

| 项 | 结果 |
|---|---|
| `pnpm run typecheck` | 通过 |
| `npx vitest run` | **42 files / 911 passed / 1 skipped** |
| `pnpm run build` | 通过（`lib/client.js` 已重建） |
| `node scripts/verify-build.mjs` | OK（仅既有注释里的 `#ec1313` 历史提示） |
| `node scripts/verify-meta.mjs` | OK |
| 真机视觉 | **未做**（本机无可用浏览器；需要 DSH 面板实机确认） |

`pnpm run check` 的最后一步 `git diff --exit-code HEAD -- lib` 需要提交后才为绿；本轮不提交，故该步按预期跳过。

## 3. 怎么在真机看到

profile 目前装的是 `github:xx529/dsh-task-gantt#v0.2.30`，**不是**这份工作区。本地预览：

```bash
cd ~/.dsh && dsh plugin --profile web add "link:/Users/lzx/Documents/GitHub/dsh-task-gantt"
```

然后重启 `dsh web`，页面 `Cmd+Shift+R` 硬刷新，右侧栏 `+` → 「任务甘特图」。看完要回到发布版：`dsh plugin --profile web remove dsh-task-gantt` 再按 INSTALL.md 重装。

## 4. 这一轮没做（下一批）

1. **筛选菜单**仍是旧样式（`.dtg-menu*`）；原型里的菜单重排未落。
2. **键盘快捷键**：`←/→` 平移、`+/-` 缩放、`N` 现在、`F` 跟随、`/` 筛选（目前只有 Esc 关抽屉）。
3. **死 CSS**：`.dtg-bar/.dtg-chip*/.dtg-control*/.dtg-select/.dtg-center*/.dtg-details*/.dtg-kv*/.dtg-code/.dtg-hist*/.dtg-notice*/.dtg-muted/.dtg-dot*/.dtg-legend-msg*` 已无引用，可从 `styles.ts` 清理（本轮刻意留到最后，避免和并行改动互相踩）。
4. **真机视觉校验**：抽屉遮罩层级、448px 工具栏预算、骨架/错误条、认领轨在 480px 下的可读性。
5. **版本号 / CHANGELOG**：仍是 0.2.38；发布前应升到 0.3.0 并同时改 `BUILD_LABEL`（`tests/release.spec.ts` 要求两者一致），再补 CHANGELOG。
6. 泳道头计数仍是 `✉ N` 而不是原型里的「N 消息」；空闲泳道 `.72` 透明度与 tertiary 对比度（审计 P1/P2）未调。

## 5. 0.3.1 真机反馈修复

- **消息正文换行**：host 的 `preview` 是压平的单行文本，详情复用它导致段落丢失。现在 host 额外产出
  `MessageSpan.body`（换行保留、CRLF 归一、同一 16384 上限，仅当压平确实改变文本时附带），
  `messageDetail()` 优先使用它，老 payload 自动回退 `preview`。
- **查看完整详情**：详情抽屉头部新增展开按钮，弹窗复用同一个 `drawerBody` 节点（不可能出现两套
  渲染），覆盖整面板、正文自己滚动；Esc 先关弹窗再关抽屉；切换选中项自动收起。
- 测试：43 files / 923 passed。

## 6. 0.3.2 Markdown 渲染 + 应用级详情弹窗

- **正文默认渲染 Markdown**：新增无依赖的 `src/client/ui/markdown.tsx`（块解析 + 行内解析，
  产出 React 节点，不使用 `dangerouslySetInnerHTML`）。支持标题 / 段落（单换行保留为 `<br>`）/
  **粗体** / *斜体* / ~~删除线~~ / `行内代码` / 围栏代码块 / 有序与无序列表 / 引用 / 分隔线 / 链接；
  链接只允许 http/https/mailto，`javascript:` 与 `data:` 按纯文本渲染。
- **原文切换**：抽屉与弹窗头部新增「原文 / 渲染」按钮（`aria-pressed`），默认渲染；切换不清空内容，
  切换选中项时复位。应用范围：消息全文、任务描述、问题 prompt 与自由输入。
- **弹窗改为应用级居中**：`position: fixed; inset: 0` + 打开时 `getBoundingClientRect()` 测量自身盒子，
  若因祖先 transform/contain 未覆盖视口，则按偏移矫正并铺满窗口；宽度 `min(760px, 92vw)`、高
  `min(88vh, 760px)`。这样在**整个应用窗口**居中，不再被 480px 侧栏限制（未引入 `react-dom`：
  本包 bundle 的 external 契约只有 `react` / `react/jsx-runtime`）。
  Esc 先关弹窗再关抽屉，遮罩点击关闭，切换选中项自动收起。
- 测试：44 files / 939 passed；新增 `tests/markdown.spec.ts`（解析规则 + 安全 + 渲染树），
  更新 `detail-expand.spec.ts`（固定定位 / 视口校正 / 原文切换）与 message-question 的全文断言。
