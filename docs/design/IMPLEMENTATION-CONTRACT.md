# 实现契约（Figma 原型 → 代码，v1）

> 供 Lead 与 `shell-ui` 并行实施时对齐用。**改动前先读本文件**；任何偏离先通知 Lead。

## 1. 文件所有权（禁止越界写）

| 所有者 | 文件 |
|---|---|
| Lead | `src/client/ui/timeline-layout.ts`、`src/client/ui/GanttChart.tsx`、`src/client/ui/styles.ts`、`src/client/ui/labels.ts`、`src/shared/contract.ts`（仅必要时） |
| shell-ui | `src/client/ui/BoardView.tsx`、**新建** `src/client/ui/styles-shell.ts`、`tests/client-tab.spec.ts`、`tests/filter-dom.spec.ts`、`tests/lane-filter.spec.ts` |
| 共享只读 | `src/client/ui/status.ts`、`task-times.ts`、`i18n.ts`、`src/host/**` |

新样式一律写进 `styles-shell.ts` 并 export `SHELL_CSS`；`BoardView` 用 `useBoardStyles()` 同时注入 `BOARD_CSS`（`./styles.ts`，只读）与 `SHELL_CSS`（两个 `<style>` 或拼一个字符串均可）。**不要改 `styles.ts`。**

## 2. 几何（Lead 已改，shell-ui 按此写 CSS）

- 面板宽 480；工具栏 40；轴 26；泳道头 **136**；泳道高 **80**；任务条高 **22**；任务卡槽 34（22 条 + 2 间隙 + 10 认领轨）。
- 轨道：消息 6..18（h12）· 活动 22..32（h10）· 任务 36..70。
- 认领轨在任务条下 2.5px：灰段（创建→认领）+ 蓝段（认领→结束）+ 2×7 交界刻线。
- 新的几何常量由 `timeline-layout.ts` 导出；**shell-ui 不要写死像素值**，需要时 import 常量。

## 3. GanttChart 新增 props（shell-ui 需要传）

```ts
interface GanttChartProps {
  // ...existing
  /** 每次自增：请求把时间轴滚到最右（NOW）。 */
  recenterKey?: number
  /** 用户点了轴上的「现在」胶囊：由 BoardView 打开跟随并 bump recenterKey。 */
  onJumpToNow?: () => void
}
```

BoardView 里：

```ts
const [recenterKey, setRecenterKey] = useState(0)
// 点「现在」：setFollow(true); setRecenterKey(k => k + 1)
<GanttChart ... recenterKey={recenterKey}
  onJumpToNow={() => { setFollow(true); setRecenterKey(k => k + 1) }} />
```

跟随开启时 GanttChart 已有自动滚动；`recenterKey` 只用于「已经在跟随但用户横向拖走后点现在」的重置。

## 4. 工具栏（shell-ui 负责，类名自定，建议 `.dtg-topbar*`）

480px 内固定宽 ≤ 448，一行：`● 会话日志 | 现在 16:20 | …spacer… | 全部时段 ▾ | 跟随(switch) | 筛选(icon+badge) | 刷新(icon)`。图标用内联 SVG（不引资源），按钮 26×26，控件高 26，圆角 6。删除「N 任务」chip。筛选按钮不再显示长文案，徽标显示隐藏数（`-N`）。全部颜色只用 `--dsw-alias-*` 令牌。

## 5. 面板状态与抽屉（shell-ui 负责）

- `BoardView.tsx:499` 的 `if (shownData === null) return null` 必须改掉：`data === null` 时渲染居中加载/错误态（骨架 3 行 + 标题 14 + 正文 12 + 重试按钮），错误态同时在工具栏下方给错误条。
- 详情统一为**一个底部抽屉**（`.dtg-drawer`，绝对定位覆盖、不挤压图区；max-height 62%，内部滚动；Esc / ✕ / 点图空白关闭）：
  - 任务：标题 + 状态（圆点+词）+ 三点时间线（创建/认领/完成）+ KV + 描述 + 状态迁移；
  - 消息：方向（圆点+词）+ 路由 + 时间 + 正文全文；
  - 问题：状态（圆点+词）+ 每题 header + 问题 + 答案（✓ + 文本，不列未选项），多题逐题渲染，失败只有错误码，unparsed 显示原文。
- `selectedTask` / `selectedMessage` **互斥**：打开一个清掉另一个。
- 状态表达统一「6px 圆点 + 词」，不用描边 chip。

## 6. 测试

- 两边各自 `npx vitest run <自己负责的 spec>`，最后 Lead 跑全量。
- 任何断言旧文案（「筛选 teammate −1」「时间来自会话日志」等）的用例，按新 DOM 更新；**不允许删除有意义的断言**，改写为对新结构的等价断言。
- 红线（泳道名色底白字、条长=真实时长、标签只在条内、消息轨在活动轨上、箭头无外框、红色问号、Lead 固定、build 常显等）不得推翻。
