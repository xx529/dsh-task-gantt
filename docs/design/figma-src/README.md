# Figma 原型源码（可重放恢复）

这里保存的是搭建 Figma 设计文件 **`gantt`** 的**全部 90 个构建脚本**，按录制顺序编号。
下次要修改设计时，不必从零重画，也不用找 `.fig` 文件：按顺序重放这些脚本，就能**无损恢复**
到 2026-10-27 的最终状态（8 页、与 `docs/design/figma/*.png` 导出图一致）。

## 1. 目录

```
docs/design/figma-src/
├── README.md          ← 本文件
├── manifest.json      ← 90 步的清单：顺序、文件名、录制时结果、字节数
└── steps/
    ├── 001-turn1-step37.js
    ├── 002-turn1-step39.js
    ├── …
    └── 090-turn8-step58.js
```

- 每个 `.js` 文件是一段原样的 `use_figma` 脚本（顶部 4 行注释是录制信息，其后是代码本体）。
- `manifest.json` 的 `result` 字段是**录制时**的真实结果：`ok` 或 `error`。
- 其中有 **14 个 `error` 步骤是预期失败**：它们是当时的试探/被后续步骤覆盖的版本。重放时它们
  会在同一处再次报错，**跳过继续下一步即可**，不要因此认为恢复失败（后续步骤会重建对应页面）。

## 2. 恢复前的准备

1. Figma 桌面端打开一个设计文件（建议就叫 `gantt`；**新建空白文件也可以**）。
2. 打开 DSH 的 **DSH to Figma · Local** companion 插件，确认「已连接」。
3. 本机具备设计用字体：`PingFang SC`、`SF Pro`、`JetBrains Mono`（Figma 云端字体已缓存）。

> 脚本会按名字查找/创建 `00 · 封面` … `07 · Markdown 与弹窗` 这些页面，并在绘制前清空页面内容，
> 所以对已有文件重放会**覆盖**同名页面，不会动其他页面。

## 3. 恢复步骤

1. 连接 Figma：`figma_status` 确认 `backend=local` 且文档正确（多个文档时先 `figma_select_document`）。
2. 按 `manifest.json` 的 `step` 从小到大，依次读取 `steps/<file>` 的**代码本体**，作为 `code`
   参数调用 `use_figma`。不要打乱顺序、不要跳过（后一步经常是在前一步画布上的补丁）。
3. 记录为 `error` 的步骤照常执行；报错后继续下一步。
4. 全部 90 步完成后，视觉应与这些导出图一致：
   - `docs/design/figma/00-cover.png` … `07-markdown-modal.png`
   - 单面板：`redesign-dark-480x580.png` / `redesign-light-480x580.png`

## 4. 之后怎么继续迭代

- **新增**设计改动时，请把脚本继续存进 `steps/`（按 091、092…编号）并同步 `manifest.json`，
  保持「脚本即源码」；不要只改 Figma 后再手工导出 PNG，否则下次无法重放。
- 导出图用 `download_assets` 重新生成并提交到 `docs/design/figma/`。
- 页面结构与设计决策见 [`../README.md`](../README.md)，代码实施记录见
  [`../IMPLEMENTATION.md`](../IMPLEMENTATION.md)。

## 5. 已知限制

- 脚本依赖 DSH ↔ Figma 本地桥的 `use_figma` 运行时（ESM + 顶层 `await`），**不能**直接粘进
  Figma 普通插件控制台执行。
- 重放产生的是同一份设计内容，不保证节点 ID 与录制时相同（Figma 每次创建都会分配新 ID）；
  依赖 ID 的外部引用（如组件链接）需重新指向。
- 脚本里保存了当时的示例数据文案（泳道名、任务名、时间），属于原型数据，不是真机日志。
