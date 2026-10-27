# AS-IS 现状盘点：dsh-task-gantt 侧边栏「任务甘特图」

> 用途：Figma「现状还原 + 改版」的事实底稿、UX 审计（`UX-AUDIT.md`）的证据库。
> 证据约定：所有 `文件:行号` 都是**仓库相对路径**（`src/...`、`docs/...`）。没有源码依据的数字一律不写；估算值单独标「估算」。
> 盘点对象：**代码 HEAD（`BUILD_LABEL = 'v0.2.38'`，`src/shared/contract.ts:31`）**。

---

## 0. 事实基准（先看这一节，它否掉一个可能的误还原）

| 事实 | 值 | 证据 |
|---|---|---|
| 当前代码版本标识 | `v0.2.38` | `src/shared/contract.ts:31` |
| 现成截图版本 | `v0.2.11 · label-in-box`（画在图里） | `docs/screenshots/panel-v4.png` 底部 |
| 面板设计宽度 | 320–480px（时间区约 190–350px） | `src/client/ui/timeline-layout.ts:11`、`src/client/ui/styles.ts:43` |
| 面板表面 | `--dsw-alias-bg-layer-1`（禁止用 sidebar-fill） | `src/client/ui/styles.ts:9-10,27`、`src/client/panel-style.ts:20-23` |
| 字号 token 实测值 | `xxxs-11`=11px/14px、`xxs-12`=12px/18px、`s-14`=14px/22px | 宿主主题包 `@deepseek-ai/dsh-client-ui-theme/lib/client.js`（本次提取字面量：`--dsw-font-xxxs-11: 11px/14px var(--dsw-font-family)` 等） |
| 主题色实测值 | tertiary 亮 `#81858c`/暗 `#adb2b8`；secondary 亮 `#61666b`/暗 `#cfd3d6`；dimmed 亮 `#e1e5ee`/暗 `#43454a`；bg-layer-1 亮 `#fff`/暗 `#232324` | `tests/fixtures/theme-token-values.json`、`docs/THEME-FACTS.md:26-36` |

### ⚠️ `panel-v4.png` 已过期（差 27 个版本），不能作为还原依据

截图里仍可见、但代码已删/已改的 7 处（若照截图还原，Figma 会复制已废弃的形态）：

| 截图里有的 | 代码现状 | 证据 |
|---|---|---|
| 泳道头里的状态词（「运行中」「空闲」「创建中」） | 已删除，状态只靠字形 + 颜色 | `src/client/ui/GanttChart.tsx:1154-1181`、`src/client/ui/styles.ts:203-207` |
| 「任务数」「消息数」两行分开 | 合并为一行 `5 任务 · ✉ 407` | `src/client/ui/GanttChart.tsx:1159-1196` |
| 工具行有 `活动+消息` 开关 | 开关已删除，两层都恒画 | `src/client/ui/GanttChart.tsx:789-792`、`CHANGELOG.md:1020-1040` |
| 工具栏没有「筛选 teammate」按钮 | 已新增（菜单 + 只看工作中） | `src/client/ui/BoardView.tsx:571-612` |
| 接收箭头 `↙` 指向左下 | 改为垂直镜像 `↘`（只翻转 y） | `src/client/ui/GanttChart.tsx:2499` |
| 图例有「我发起/teammate」两项 | 图例已无这两项（样式与文案残留） | `src/client/ui/labels.ts:159-160`（无引用） |
| 无提问 `?` 标记 | 已有（三种状态） | `src/client/ui/GanttChart.tsx:1804-1818` |

**结论：还原与改版的唯一基准是代码，截图只用于看"当时的暗色观感"。**

---

## 1. 面板结构树（自上而下，含 px / 间距 / 字号 / flex）

### 1.1 垂直高度预算（480px 宽、亮/暗通用）

| 层级 | 区块 | 高度 | 组成 | 证据 |
|---|---|---|---|---|
| 1 | `.dtg-root` | 100% | `flex column`，根字号 12px/18px（因为几乎每块都覆盖成 11px，根字号实际只影响少数无 font 的块） | `styles.ts:19-31` |
| 1.1 | 工具栏 `.dtg-bar` | **29px** | 控件高 20 + 上下 padding 4×2 + 底边 1 | `styles.ts:35-54,80-96` |
| 1.2 | 图区 `.dtg-chart`（flex 1） | 剩余 | `flex 1 1 auto`，内部再分 头部列/滚动区 | `styles.ts:258`、`GanttChart.tsx:716-723` |
| 1.3 | 图例 `.dtg-legend` | **20 / 34 / 48px**（1/2/3 行） | 每行 14px 行盒 + 上下 padding 3×2 | `styles.ts:1188` |
| 1.4 | build 行 `.dtg-build` | **18px** | 11px/14 行盒 + padding 1/3 | `styles.ts:1194-1202`、`BoardView.tsx:673-675` |
| 1.5 | 详情面板（任务 / 消息） | ≤45% / ≤60% | 两个可**同时**存在（见 UX-AUDIT P0-05） | `styles.ts:1139-1146,778`、`BoardView.tsx:635-653` |
| 1.6 | 错误/故障通知 `.dtg-notice` | 每条 22px | 4px padding + 14 行盒 + 1 边框 | `styles.ts:1167-1174` |

> 恒定的底部/顶部 chrome 合计 **67–95px**（29 + 18 + 图例 20–48），在 480×600 的面板里占 11–16%。

### 1.2 逐块明细

#### ① 工具栏（`BoardView.tsx:529-594` / `styles.ts:35-100`）
`display:flex; align-items:center; gap:4px; padding:4px 6px; overflow-x:auto; overflow-y:hidden; scrollbar-width:none; border-bottom:1px solid border-l1`；**所有直接子元素 `flex:0 0 auto`（不许收缩，只有 spacer 吸收余量）**。

| # | 元素 | 形态 | 尺寸/字 | 数据来源 | 证据 |
|---|---|---|---|---|---|
| 1 | 来源 chip | 胶囊 chip，`radius 9`，`padding 1px 6px`，`border 1px`，`nowrap`，`max-width:100%` + 省略号 | 11px/14 | `source='log'` → 普通；`partial/live` → `.dtg-chip-warn`（琥珀描边+琥珀字） | `BoardView.tsx:523-533`、`styles.ts:55-75` |
| 2 | 现在 chip | 同上，brand 描边 + primary 字 | 11px/14 | `live!==false` 时显示 | `BoardView.tsx:534-536`、`styles.ts:70-73` |
| 3 | 冻结时段 chip | 同 chip，无 brand | 11px/14 | `MM-DD HH:mm:ss → 结束 MM-DD HH:mm:ss` | `BoardView.tsx:537-540` |
| 4 | 时间段 label + `<select>` | label 文字 11px tertiary + 原生 select（`max-width:72px`，`padding 1px 2px`，`radius 3`，`border-l2`） | 11px/14 | 选项：全部 / 5m / 15m / 30m / 1h / 3h | `BoardView.tsx:541-559,49-55`、`styles.ts:755-769` |
| 5 | 跟随时间线按钮 | `.dtg-btn`，文字后拼 `●`/`○`；ON 时加 `.dtg-btn-on`（字重 500、字号升 12px、primary 色） | 11px→12px | `follow`（默认 true） | `BoardView.tsx:560-569`、`styles.ts:771-774` |
| 6 | `.dtg-spacer` | 唯一可伸缩项 | — | — | `styles.ts:76,79` |
| 7 | 筛选 teammate 按钮 | `.dtg-btn`，文案 `筛选 teammate · <状态>`，无 badge 时用 `·` 兜底 | 11px/14 | `hiddenLanes.size`、`workingOnly` | `BoardView.tsx:571-587` |
| 8 | 任务数 chip | 胶囊 chip | 11px/14 | `shownData.tasks.length` | `BoardView.tsx:588-590` |
| 9 | 刷新按钮 | `.dtg-btn`，字形 `⟳`，`title=重试` | 11px | `retry()` | `BoardView.tsx:591-593` |

**宽度估算（估算，依据 11px CJK≈11px/字、拉丁≈6px/字、控件 padding/border 已计）**：
`102(来源) + 36(现在) + 80(时间段) + 79(跟随) + 85(筛选) + 45(7 任务) + 23(⟳) + gap 7×4=28 + padding 12 ≈ 490px`
→ **已经超过 480px 设计宽度**（冻结态把第 2 项换成第 3 项，+200px 左右，≈690px）。溢出靠 `overflow-x:auto` 吸收，但滚动条被 `scrollbar-width:none` 隐藏。

#### ② 筛选菜单 `.dtg-menu`（`BoardView.tsx:105-266` / `styles.ts:495-595`）
`position:fixed`，`z-index:50`，`padding 4px`，`radius 6`，`max-height 90–240px`（`MIN_USABLE_H=90` / `MAX_H=240`），`width 120–240px`（`min(240, max(120, 空间-12))`），`font 11px/14`，内部可滚动。

| 行 | 内容 | 尺寸/字 | 证据 |
|---|---|---|---|
| 模式行 | 「只看工作中」：22×12 轨道 + 8px 圆点 knob（开启时 left 11px，brand 色），`role="switch" aria-checked` | 行 padding 5px 4px，11px/500 | `BoardView.tsx:230-242`、`styles.ts:500-547` |
| 分隔线 | 1px，`margin 3px 2px` | — | `styles.ts:548-552` |
| 固定行（Lead） | 禁用 checkbox + 泳道名 + `固定显示` 备注，`cursor:default`，整行 secondary 色 | 行 padding 3px 4px | `BoardView.tsx:244-250`、`styles.ts:572-583,591-594` |
| 可筛行 | checkbox + 泳道名（勾选=显示） | 行 padding 3px 4px | `BoardView.tsx:253-263` |

定位策略：以**窗口**为界（不是面板），下方不够则上翻，保证最小 90px 可用高度并内部滚动；用 `overlaySpace` 抵消 `transform` 祖先造成的坐标系偏移（`BoardView.tsx:159-213`）。

#### ③ 图区左列：泳道头 `.dtg-heads`（`GanttChart.tsx:724-745,1035-1247` / `styles.ts:110-229,602-620`）

| 元素 | 尺寸/字 | 说明 | 证据 |
|---|---|---|---|
| 列宽 | **132px**（`LANE_HEAD_WIDTH`），`border-right border-l2`，`z-index:4` | 固定列，不随横向滚动 | `GanttChart.tsx:725`、`timeline-layout.ts:205` |
| 角标行 | 高 **28px**（`DEFAULT_HEADER_HEIGHT`），文字「活动」，11px tertiary，`padding 0 6px`，底边 1px | 与时间轴同高，但**不 sticky**（随内容 `translateY(-scrollTop)` 滚走） | `GanttChart.tsx:731-733`、`styles.ts:118-126,117` |
| 泳道行 | 高 **72px**（`DEFAULT_LANE_HEIGHT`），`padding 3px 6px`，`flex column`，`gap 2px`，底边 1px，idle 行 `opacity .72` | 行内容：pill 行 / 计数行 / 活动词行 | `styles.ts:127-136`、`timeline-layout.ts:206-215` |
| ① pill 行 | 身份点 **7px** + 名称 pill（`padding 1px 6px`、`radius 3`、12px/500、色底白字、省略号）+ 状态标记（**11px spinner** 或 11px 状态字形） | 名称 pill 底色/字色**内联注入**（payload 的 `color.bar` / `color.on`） | `GanttChart.tsx:1099-1145`、`styles.ts:138-169,221-229,632-640` |
| ② 计数行 | 11px/14 tertiary，`nowrap` + 省略号；内容 `5 任务 · ✉ 407`；**没有状态词** | 只有一个 span，`title` 才是「N 条消息」 | `GanttChart.tsx:1146-1197`、`styles.ts:177-202` |
| ③ 活动词行 | 11px/1.2 secondary，独立块级行，`nowrap` + 省略号；**字形 aria-hidden** | 仅"正在工作"的泳道有词 | `GanttChart.tsx:1198-1211`、`styles.ts:602-620` |
| 可点击包装 | 有 `lane.navigation` 时整行包 `<button>`（宽 100%，高 `72-2`），`focus-visible` 2px border-l4 | 无 navigation 时是普通 `role="listitem"` | `GanttChart.tsx:1217-1246`、`styles.ts:454-469` |

#### ④ 时间轴 `.dtg-axis`（`GanttChart.tsx:1249-1302` / `styles.ts:241-257`）
`position:sticky; top:0; z-index:3; height 28px; border-bottom border-l2`。刻度：绝对定位，11px tertiary；整点/日期刻度为 `major` → secondary + 500 字重（`font: xxxs-strong-11`）。右侧 NOW 药丸：`padding 0 3px`、`radius 0 0 3 3`、brand 底 + inverted 字、11px/500、`translateX(-50%)`，文本 `现在 HH:mm`；靠近右缘时 `translateX(-100%)` 翻转（`GanttChart.tsx:1261,1276-1299`、`styles.ts:1116,1125-1136`）。

#### ⑤ 泳道内容：三条轨（`timeline-layout.ts:243-296`，绝对定位在 `.dtg-layer` 内）
| 轨 | y（泳道内） | 高 | 内容 | 证据 |
|---|---|---|---|---|
| 消息轨（最上） | 3 | 11 | 消息标记 11×11 / 问号 11px / turn 的 `▸` | `timeline-layout.ts:293-296,474-478` |
| 活动轨（中） | 17 | 10 | turn 带（10px，泳道色，`opacity .75`）+ step 条（8px 垂直居中） + 等待条（10px，z-index 2，压在 turn 带上） | `timeline-layout.ts:239-241,77-79`、`styles.ts:266-289,671-732` |
| 任务轨（下） | 30 | 32（槽） | 任务条 20px + 下方迁移标记轨 11px | `timeline-layout.ts:296-309,362-370`、`GanttChart.tsx:2631` |

泳道底纹：奇数泳道 `bg-layer-2` + `opacity .5`；网格线 1px（major 用 border-l2/0.9，普通 border-l1/0.6）（`styles.ts:260-263`）。空泳道提示「暂无任务」11px dimmed，`left:6px; top: 泳道y+20`（`GanttChart.tsx:866-878`、`styles.ts:1187`）。

#### ⑥ 任务条（`GanttChart.tsx:2681-2818` / `styles.ts:295-386`）
| 属性 | 值 | 证据 |
|---|---|---|
| 几何 | 左 = 首个 history 时间；宽 = **真实时长 / msPerPx**（下限 1px 发丝）；高 20px；top = 泳道 y+30 | `timeline-layout.ts:312-330,2345-2383` |
| 非历史任务（无 history） | 9px 固定宽标记，右对齐到 now，无标签 | `timeline-layout.ts:332-341,2384-2392` |
| 进行中任务 | 右边缘拉到 now，圆角切成直角 + `border-right:2px dashed currentColor` | `timeline-layout.ts:2357-2372`、`styles.ts:350-357` |
| 边框/填充 | `1px border-l2` + **`border-left:3px` 泳道色**，填充 `bg-layer-2`（中性，非泳道色） | `styles.ts:313-338`、`GanttChart.tsx:2746-2756` |
| 内边距 | `2px 6px 2px 8px`，圆角 4px，字 11px/500 | `styles.ts:325-336,370-377` |
| 标签三档 | `inside` (w≥36)：条内文本 + CSS 省略号；`ellipsis` (22–35)：只画「…」；`none` (<22)：不画 | `timeline-layout.ts:388-425`、`GanttChart.tsx:2806-2807` |
| 选中态 | `outline:2px brand; offset 1px` + `aria-pressed` | `styles.ts:347-348` |
| 迁移标记 | 每个 `history` 事件一个字形（＋ ▶ ✓ ↺ · ◌），左 = 条左 + 事件自身时间；同刻事件向下错 1px；`z-index:1`，带 1.5px 表面色描边 | `GanttChart.tsx:2563-2679`、`styles.ts:830-843` |

#### ⑦ 消息标记（`GanttChart.tsx:1638-1894` / `styles.ts:845-1107`）
- 尺寸 11×11，`position:absolute`，`left = marker.x - 9.3`（**箭头尖端落在时间点**，`GanttChart.tsx:2536,1780-1797`）；点击热区用 `::before` 向外扩 5px（`styles.ts:897-904`）。
- 形状：lane 箭头 `↗`（发出）/`↙` 镜像为 `↘`（收到，`scale(1,-1)`）；dispatch 同形但**虚线**；人类提示是**对话气泡**；turn 是 `▸`；提问是 `?`（静态红 `--dsw-static-red-600`）。
- 颜色：**对端泳道填充色**；人类用 primary 墨；对端不在板上用 `label-dimmed` 中性；一律带 `0 0 0 1.5px bg-layer-1` 光晕。
- 抽稀：同泳道相邻标记最小间距 **9px**、每泳道上限 **40**；被省略的数量以 `+N` 标在标记右侧（`left:12px`，11px tertiary）。

#### ⑧ 等待条（`GanttChart.tsx:1330-1368,1452-1521` / `styles.ts:654-753`）
`label-tertiary` 45% 透明 + 斜纹 mask；两端 2px 实心 cap。四种结果靠**形状/纹理**，不靠色相：
`open`（无右 cap + 右侧渐隐）→ `timeout`（右 cap 3px 宽、上下各出 3px，`opacity .6`）→ `woken`（右 cap 2px）→ `unknown`（`opacity .3`）。

#### ⑨ 悬停/焦点浮窗（`GanttChart.tsx:1964-2109` / `styles.ts:394-448`）
`position:fixed; z-index:40; pointer-events:none`；宽 `min(280, 空间-16)`；内边距 6/8；圆角 6；`shadow-lv2`；11px/14 正文；标题 12px/500 且**允许换行不省略**；`max-height` 按"锚点到视口边缘"的可用空间向下取整到整行（`POPOVER_LINE_PX=18`、`POPOVER_CHROME_PX=14`、`POPOVER_MAX_PX=560`），底部尽量切在块边界。

#### ⑩ 图例 `.dtg-legend`（`GanttChart.tsx:918-1003` / `styles.ts:1188-1192`）
`flex-wrap; gap:6px; padding:3px 6px; font 11px/14; color tertiary`。一行内混排：
`−` `⤢` `+` 三个缩放按钮（20px 高）→ 读数 `N 秒/像素` → spacer → `turn 区间` `step 区间` `任务卡` 三个色块 → `发出` `收到` 两个箭头 → `等待开始/结束`（仅当有 wait）→ `N/M 条消息已绘制`（仅当有抽稀）→ `状态迁移 创建/认领/完成` 三个字形 → `结束`（冻结时）→ `N 个任务的泳道不在名单中`（仅当有孤立任务）。

#### ⑪ 详情面板
任务详情（`BoardView.tsx:785-892`、`styles.ts:1139-1166`）：`flex 0 0 auto; max-height 45%; overflow:auto; padding 6/8/8; border-top border-l2; background bg-layer-2`。标题 14px/500 可换行；描述 12px pre-wrap；KV 行 `gap 6px; margin-top 3px`（键 tertiary、值 secondary、12px）；代码块 11px mono + `bg-layer-3`；历史列表 12px，时间列 mono/tertiary。
消息详情（`BoardView.tsx:694-783`、`styles.ts:778-800`）：`max-height 60%`；路由标题 12px/500 `word-break: break-all`；正文 11px pre-wrap，`max-height 40vh`，边框 + `bg`，可滚动；提问用共享的 `QuestionPopoverBody`（问题 + 答案 chip，绿色描边）。

#### ⑫ 状态 / 空 / 错误
| 态 | 形态 | 证据 |
|---|---|---|
| 加载 | `.dtg-center` 标题 14px + `正在读取会话日志…` | `BoardView.tsx:503-520`、`styles.ts:1175-1186` |
| 空 | 标题 14px `当前会话没有 agent team` + 说明 12px tertiary | `BoardView.tsx:614-619` |
| 错误 | 同 center + `role="alert"` + 重试按钮；已加载后错误改为底部 `.dtg-notice-error` 行 | `BoardView.tsx:507-517,655` |
| 团队故障 | `.dtg-notice-error`：`团队故障: <failure>` | `BoardView.tsx:656-658` |
| notes | **刻意不渲染** | `BoardView.tsx:659-665` |

---

## 2. 全部可见文案（zh-CN），按区块

> 类型图例：**状态**=随数据变化的字样；**控件**=可操作元素的可读文本；**数据**=数值/时间/名称等真实内容。

### 2.1 工具栏与菜单
| 文案（zh） | 键 | 类型 | 位置/触发 |
|---|---|---|---|
| 时间来自会话日志 | `sourceLog` | 状态 | `source==='log'` 时的 chip |
| 部分泳道无日志 | `sourcePartial` | 状态 | `source==='partial'`（琥珀 chip） |
| 仅实时状态（无日志） | `sourceLive` | 状态 | `source==='live'`（琥珀 chip） |
| 现在 | `nowLabel` | 状态 | live 时 chip；也是轴右端药丸前半 |
| `MM-DD HH:mm:ss → 结束 MM-DD HH:mm:ss` | `endedLabel` | 数据+状态 | 冻结时替换「现在」chip |
| 时间段 | `rangeLabel` | 控件 | select 的 label / aria-label |
| 全部 | `rangeAll` | 控件 | select 默认项 |
| 5m / 15m / 30m / 1h / 3h | 硬编码 | 控件 | select 预设（英文单位，见 P1-11） |
| 跟随时间线 ● / ○ | `followLabel` + 硬编码圆点 | 控件+状态 | 按钮 |
| 筛选 teammate | `laneFilterLabel` | 控件 | 按钮；无状态时尾随 `·` |
| 工作中 | `laneFilterWorkingActive` | 状态 | 只看工作中生效时拼进按钮 |
| −N | 硬编码 | 状态 | 隐藏 N 条泳道时拼进按钮 |
| N 任务 | `tasksLabel` | 数据 | 右侧 chip |
| ⟳ | 硬编码 | 控件 | 刷新（`title=重试`） |
| 只看工作中 | `laneFilterWorking` | 控件 | 菜单模式行 |
| 固定显示 | `laneFilterPinned` | 状态 | 菜单 Lead 行尾注 |
| 刷新 / 重试 | `refresh`/`retry` | 控件 | `title`、错误态按钮 |

### 2.2 图区
| 文案 | 键 | 类型 | 位置 |
|---|---|---|---|
| 活动 | `activityLabel` | 控件/表头 | 左列角标 |
| 现在 HH:mm | `nowLabel` + `formatClock` | 数据+状态 | 轴右端药丸（live） |
| 结束 HH:mm | `endedLabel` | 数据+状态 | 轴右端药丸（冻结，但样式无差异，见 P1-04） |
| HH:mm / MM-DD | `formatTickLabel` | 数据 | 轴刻度 |
| `N 任务 · ✉ M` | `tasksLabel` | 数据 | 泳道计数行 |
| 分析中 / 读取中 / 搜索中 / 写文件 / 编辑中 / 运行命令 / 代码 / 联网搜索 / 抓取网页 / 子代理 / 规划中 / 提问中 / 调用工具 | `laneAct*` 14 个短词 | 状态 | 活动词行（仅工作中泳道） |
| 运行中 / 启动中 | `laneWorking` / `laneProvisioning` | 状态 | 无 activity 描述时的兜底活动词 |
| 暂无任务 | `noTask`（i18n） | 状态 | 空泳道 |
| `N 秒/像素`（如 `5 秒/像素`、`0.50 秒/像素`） | `zoomLevel` | 数据 | 图例读数 |
| turn 区间 / step 区间 / 任务卡 | `turnLegend`/`stepLegend`/`taskLegend` | 控件说明 | 图例 |
| 发出 / 收到 | `messageLegendSent`/`messageLegendReceived` | 控件说明 | 图例 |
| 等待开始/结束 | `waitLegend` | 控件说明 | 图例（有 wait 才显示） |
| 状态迁移 创建 认领 完成 | `historyLabel` + `hist*` | 控件说明 | 图例 |
| 结束 | `endedLabel` | 状态 | 图例（冻结时） |
| `N/M 条消息已绘制（当前时间段内）` | `messageDropped` | 数据 | 图例（有抽稀时） |
| `N 个任务的泳道不在名单中，未绘制` | `notPlaced` | 数据 | 图例 |
| `N/M 条消息已绘制` | `messageDropped` | 数据 | 图例 |
| 展开/缩放的 `−` `⤢` `+` | — | 控件 | 图例左端 |
| v0.2.38 | `BUILD_LABEL` | 数据（诊断） | 底部行，不翻译 |

### 2.3 悬停浮窗 / 详情面板
| 文案 | 键 | 类型 | 位置 |
|---|---|---|---|
| 完整任务标题 | `task.subject` | 数据 | 浮窗标题（12px/500，可换行） |
| 创建 / 开始 / 结束 / 时长 | `taskCreatedAt`/`taskStartedAt`/`taskEndedAt`/`taskDuration` | 数据标签 | 浮窗 meta、详情 |
| 进行中（尚未结束） | `taskNotEnded` | 状态 | 浮窗 |
| 开始时间按创建计（从未认领） | `taskStartedFromCreated` | 状态 | 浮窗 |
| 发出 → X / 收到 ← X / 派发给 X / 接收自 X | `messageSentTo`/`messageReceivedFrom`/`messageDispatchedTo`/`messageDispatchedFrom` | 数据 | 浮窗标题、详情 |
| 消息内容 / 派发说明 | `messagePopoverPreview`/`messageDispatchedPreview` | 控件说明 | 浮窗 |
| 子代理派发（由父子会话关系推断，非日志消息） | `messageDispatchedHint` | 说明 | 派发浮窗 |
| 任务详情 / 消息详情 | `detailsTitle`/`messageDetailTitle` | 控件（aria） | 面板 aria-label |
| 创建 → 完成 时间（时长）/ 时长未知（实时） | `taskDurationLine`/`taskDurationUnknown` | 数据 | 详情 KV |
| 负责 / 未指派 | `taskOwner`/`unassigned` | 数据 | 详情 KV |
| 泳道 | `laneLabel` | 数据标签 | 详情 KV（值是**原始 laneId**，见 P1-08） |
| 状态 · 版本 N | `statusLabel`/`revisionLabel` | 数据 | 详情 KV |
| 可开始 ✓/✗ | `taskReady` | 数据 | 详情 KV |
| 依赖 / 写入范围 / 无 | `taskBlockedBy`/`taskWriteScopes`/`blockedByNone`/`scopesNone` | 数据 | 详情 KV + 代码块 |
| 提示 | `notesLabel` | 数据标签 | 写入范围警告 |
| 状态迁移 `N · 时间来自会话日志` | `historyLabel`/`historySource` | 数据 | 详情 KV |
| 无历史记录（实时态，日志里没有可用的时间锚点） | `noHistory` | 状态 | 详情 KV |
| 时间 / 类型 / 所在泳道 | `messageWhenLabel`/`messageKindLabel`/`messageLaneLabel` | 数据标签 | 消息详情 |
| 发出 / 收到（kind） | `messageSentMark`/`messageReceivedMark` | 状态 | 消息详情 |
| 无正文 | `messageNoBody` | 状态 | 消息详情 |
| 正文已达 12000 字符上限… | `messageTruncated` | 状态 | 消息详情 |
| 等待：从 … 起，…，…（4 种结果） | `waitAria*`/`waitOutcome*` | 数据 | 等待条 title/aria（**AT 读不到**，见 A-3） |
| 时间，A → B，正文预览 | `messageAria` | 数据（aria） | 标记 aria-label |
| 时间，泳道 状态：向人类提问 | `questionAria` | 数据（aria） | 问号标记 |
| 向人类提问 / 等待回复 / 已回答 / 提问失败 | `questionRoute`/`questionStatus*` | 状态 | 提问浮窗 |
| 答案 / 自由输入 / 结果中未记录选项选择 / 结果无法解析，以下为原文 / 原始结果 | `question*` | 数据标签 | 提问浮窗 |
| 任务甘特图：N 条泳道、M 个任务… | `chartAria` | 数据（aria） | 图 role=group |
| Ctrl/⌘ + 滚轮缩放，Shift + 滚轮横向滚动 | `zoomHint` | 控件说明 | 滚动区 aria-label + 读数 title |

### 2.4 中心态
`正在读取会话日志…`（loading，**不可达**，见 P0-01）、`当前会话没有 agent team` + `本面板展示 Lead 会话与其 teammate 的任务时间线。先创建 team 或共享任务，再回到这里。`（empty）、`读取时间线失败` + `<error>` + `重试`（error）。

---

## 3. 全部交互清单

| # | 交互 | 触发条件 | 结果 | 真实元素/无障碍 | 证据 |
|---|---|---|---|---|---|
| 1 | 轮询 | Tab 可见时每 **5000ms** | 重新 GET timeline，替换整棵树；错误写入 `error` | 无 ARIA 实时区（`role=alert` 只在不可达的 center 上） | `BoardView.tsx:57-58,363-391` |
| 2 | NOW 心跳 | `live && visible`，每 **1000ms** | 重算 now → NOW 线/进行中条右端推进 | — | `BoardView.tsx:59-60,402-407` |
| 3 | 跟随时间线开/关 | 点按钮 | ON：now 到右缘时自动把 now 弹回视口 **3/4** 处；OFF：永不写 scrollLeft | `<button aria-pressed>` | `BoardView.tsx:560-569`、`GanttChart.tsx:1539-1582` |
| 4 | 时段筛选 | select 变更 | 只重排同一次 fetch 的数据（不重取）；follow ON 时把窗口左边界**锚定**在切换时刻 | `<select aria-label>` | `BoardView.tsx:541-559`、`GanttChart.tsx:336-352,427-440` |
| 5 | 打开筛选菜单 | 点「筛选 teammate」 | fixed 菜单出现在按钮下方（空间不足则上方） | `aria-expanded`/`aria-haspopup` | `BoardView.tsx:571-587,602-612` |
| 6 | 关菜单 | Escape / 菜单外 mousedown | 关闭 | Keydown 监听在 window | `BoardView.tsx:124-140` |
| 7 | 勾/取消队友 | 点菜单 checkbox | 加入/移出 `hiddenLanes`（空集=全显）；被隐藏队友的消息**一并丢弃** | `<input type=checkbox aria-label=泳道名>` | `BoardView.tsx:253-263,485-492`、`lane-filter.ts:147-176` |
| 8 | 只看工作中 | 点模式行 | 与隐藏集合 **AND** 组合；Lead 恒显 | `role=switch aria-checked` | `BoardView.tsx:230-242`、`lane-filter.ts:52-105` |
| 9 | 横向滚动 | 普通滚轮（浏览器）/Shift+滚轮/滚动条 | 内容平移，rAF 节流同步 | `.dtg-scroll` 是可聚焦容器（`tabIndex=0`，`aria-label=zoomHint`） | `GanttChart.tsx:592-598,747-753` |
| 10 | 缩放 | **Ctrl/⌘+滚轮** | 以指针时刻为锚点缩放 ×1.5 / ÷1.5，范围 1s–600s per px | 原生非 passive wheel 监听 | `GanttChart.tsx:634-648`、`timeline-layout.ts:429-452` |
| 11 | 缩放按钮 | `−` / `+` | 以**视口水平中心**为锚点缩放 | 按钮可访问名就是 `−` / `+` | `GanttChart.tsx:919-927,650-656` |
| 12 | 适应窗口 | `⤢` | `msPerPx=null`（回到自动 fit） | 可访问名 `⤢` | `GanttChart.tsx:922-924` |
| 13 | 选任务 | 点任务条 | 下方出现任务详情；再点取消 | `<button aria-pressed aria-label=任务Aria>` | `GanttChart.tsx:2781-2797` |
| 14 | 任务键盘 | Enter/Space 切换选中，Escape 取消 | 同上 | 同上 | `GanttChart.tsx:2724-2732` |
| 15 | 任务悬停/聚焦 | mouseenter / focus | **完整标题 + 起止 + 时长** 浮窗（运行中时长随 now 增长） | 浮窗 `role=tooltip`；原 `title` 在浮窗打开时被临时摘除以避免双提示 | `GanttChart.tsx:899-916,1918-1944` |
| 16 | 选消息标记 | 点标记 | 切换选中态（双环）+ 下方消息详情；与任务选择**互不清除** | `<button aria-pressed aria-label=messageAria>` | `GanttChart.tsx:1851-1865`、`BoardView.tsx:644-653` |
| 17 | 消息悬停/聚焦 | mouseenter / focus | 路由 + 时间 + 正文预览；提问显示问题/答案 | `role=tooltip` | `GanttChart.tsx:814-841` |
| 18 | Esc 关闭详情 | keydown Escape（window） | **先关消息详情，再关任务详情**（要按两次） | window 监听，与焦点无关 | `BoardView.tsx:469-478` |
| 19 | 点泳道头跳会话 | 有 `navigation` 的泳道 | 调 shell 的 `openTab`；失败静默 | `<button aria-label="名称: 打开该会话">`，focus-visible 2px | `GanttChart.tsx:1217-1246`、`index.ts:303-307` |
| 20 | 刷新 | 点 `⟳` | `reloadKey+1` → 重新 fetch | 无 aria-label（可访问名 `⟳`） | `BoardView.tsx:591-593,479` |
| 21 | 图例提示 | 悬停图例项 | 原生 `title` 显示长说明（颜色语义、抽稀规则、等待纹理） | `<span title>`，不可聚焦 | `GanttChart.tsx:951-992` |
| 22 | 滚动抽稀/剔除 | 每次滚动/缩放 | 视口外的 rect 被 cull（DOM 数量），标记按 9px 间距抽稀 | 无 | `timeline-layout.ts:459-483`、`GanttChart.tsx:530` |
| 23 | 空/错误 | 无 lane / fetch 失败 | 无 lane → 中心空态；fetch 失败 → 底部红字（**首次加载失败时面板全空白**，见 P0-01） | `role=alert` 仅空态分支 | `BoardView.tsx:614-619,655-658` |

---

## 4. 数据驱动变体（改版必须一张设计图覆盖的组合）

### 4.1 板级状态
| 维度 | 取值 | 界面差异 | 证据 |
|---|---|---|---|
| `live` | `true` / `false` | chip：现在 / 时段区间；轴右端：`现在 HH:mm` / `结束 HH:mm`；NOW 线：实 brand / 虚线 dimmed；图例：无 / 有「结束」；断点动画：有 / 无 | `BoardView.tsx:534-540`、`GanttChart.tsx:844-849,1285-1298`、`styles.ts:1110-1111,1118-1124` |
| `source` | `log` / `partial` / `live` | chip 普通 / 琥珀 ×2 | `BoardView.tsx:523-526`、`styles.ts:74` |
| `failure` | 有/无 | 底部红条 `团队故障: …` | `BoardView.tsx:656-658` |
| `notes` | 有/无 | **不渲染**（红线） | `BoardView.tsx:659-665` |
| 空 team | 无 lane | 中心空态 | `BoardView.tsx:614-619` |
| 孤立任务 | `unplacedTaskIds>0` | 图例红字 `N 个任务…未绘制` | `GanttChart.tsx:998-1002` |

### 4.2 泳道状态（`MemberStatus`，4 种 + 桶）
| status | 状态字形 | 状态色（ink） | 活动词 | 证据 |
|---|---|---|---|---|
| `running` | ▶ / spinner（工作中时） | success | 有 | `status.ts:33-42`、`GanttChart.tsx:1138-1144` |
| `idle` | ⏸（整行 opacity .72） | tertiary | 无 | `styles.ts:136,214` |
| `provisioning` | … | warn | 有（启动中） | `styles.ts:215` |
| `failed` | ✕ | error | 无 | `styles.ts:216` |
| `undefined`（unassigned 桶） | 按 idle 处理 | tertiary | 无 | `GanttChart.tsx:1049` |

### 4.3 任务状态（`TaskStatus`，4 种）

> 状态枚举去重说明：成员 4 + 任务 4 = **8 个枚举键**；`deleted` 复用 `completed` 的文案（`status.ts:16`），所以界面上只有 **7 种字样**（运行中 / 空闲 / 启动中 / 失败 / 待处理 / 进行中 / 已完成）。改版必须覆盖全部 8 个键，否则 `deleted` 无设计。字形表另含 8 个键（`status.ts:33-42`）。
| status | 文字 | 条尾 | 证据 |
|---|---|---|---|
| `pending` | 待处理 | 直角 + 虚右边（仍在增长） | `status.ts:13`、`timeline-layout.ts:2339` |
| `in_progress` | 进行中 | 同上 | `status.ts:14` |
| `completed` | 已完成 | 正常圆角 | `status.ts:15` |
| `deleted` | **已完成**（映射到完成文案，见 P1-10） | 正常圆角 | `status.ts:16` |

### 4.4 任务几何变体
| 变体 | 形态 | 证据 |
|---|---|---|
| anchor=`history` | 条长 = 时长（≥1px） | `timeline-layout.ts:2345-2383` |
| anchor=`live`（无 history） | 9px 标记，右对齐 now，无标签、无迁移轨 | `timeline-layout.ts:2384-2392`、`taskLabelPlacement` 强制 `none` |
| labelPlacement=`inside` / `ellipsis` / `none` | 文本 / 「…」/ 空 | `timeline-layout.ts:388-425` |
| `clippedLeft`（被时段窗截断） | **无任何 UI 表达**（计算了不画，见 P2-08） | `timeline-layout.ts:2394-2399` |

### 4.5 消息标记变体（kind × direction × 对端）
| kind | 形状 | 颜色 | 有正文预览 | 证据 |
|---|---|---|---|---|
| `message` | 箭头（实心视觉 = 发出） | 对端泳道色 | 有 | `GanttChart.tsx:1777-1818` |
| `message`（收到） | 箭头镜像 | 对端泳道色 | 有 | `GanttChart.tsx:2499` |
| `dispatch` | 箭头 + **虚线**（1.6/1.2、butt cap） | 对端/子会话泳道色 | 有（派发说明） | `styles.ts:1044-1059` |
| `turn` | `▸` 小字形，无盘 | lane 色 | 无（浮窗只显示 waitLegend） | `GanttChart.tsx:1874-1875,2221` |
| `user-prompt` | 对话气泡（描边） | primary 墨 | 有 | `GanttChart.tsx:1881-1887` |
| `question` | `?` 字 | 静态红 `--dsw-static-red-600` | 详情用问题+答案 | `GanttChart.tsx:1804-1818,2290-2358` |
| question `waiting`/`answered`/`failed` | 脉冲 / 无 / 虚线描边 | 三态同色 | — | `styles.ts:936-965` |
| 对端不在板上 | 箭头 | `label-dimmed` + 文案标注 | — | `timeline-layout.ts:156-176`、`labels.ts:108` |
| 被抽稀 | `+N` 徽标 | tertiary | — | `GanttChart.tsx:1891`、`styles.ts:1086-1094` |

### 4.6 等待结果（4 种）
`open`（无右 cap + 渐隐）· `timedOut=true`（宽 3px 高 +6px 的右 cap，opacity .6）· `timedOut=false`（2px 右 cap）· `unknown`（中性 2px，opacity .3）。证据 `GanttChart.tsx:1330-1368`、`styles.ts:700-732`。

### 4.7 其它
- 标记总数为 0 → 图例隐藏「发出/收到/等待/抽稀」四项（`GanttChart.tsx:946-978`）。
- 有 wait → 图例才出现「等待开始/结束」（`GanttChart.tsx:963-968`）。
- 菜单：无状态（`·`）/ 只看工作中 / 隐藏 N 条 / 全部固定（无可筛项，无提示行）。
- 横幅：`dtg-paused`（Tab 不可见时保留最后一帧并停动画）、`dtg-frozen`（冻结停动画）（`GanttChart.tsx:717-722`、`styles.ts:1110-1111,1218`）。

---

## 5. 「已被用户明确要求过」的设计决定（改版红线）

> 判读规则：**语义/存在性不可推翻**；字号、间距、描边粗细等视觉参数可在不改变语义的前提下调整（下表「可动范围」列）。
> 出处以代码注释里的用户原话为准；`CHANGELOG.md` 只作旁证。

| # | 红线 | 用户原话（出处） | 实现 | 可动范围 |
|---|---|---|---|---|
| R1 | **泳道名必须是色底白字**（不是左侧细条、不是白底文字） | 「改成是 agent 名称的背景色，例如 lead 文字是白色，有个背景色是蓝色」（`GanttChart.tsx:1105-1110`） | 内联 `background: color.bar; color: color.on`（静态白，`timeline-layout.ts:1672-1681`） | 尺寸/圆角可调；不能改成描边或色点 |
| R2 | **状态文字不重复显示**（去掉状态词、去掉 role 徽章） | 「「空闲」这个状态文本我觉得没必要了」（`GanttChart.tsx:1173-1180`）；role 徽章「下面多了一个白色框+ agent名称，这个已经是多余的」（`styles.ts:203-207`） | 状态只留字形 + 色；词留在 aria/title | 可提升字形可读性；**不得**把状态词加回可见行 |
| R3 | **任务条长度 = 真实时长**，无最小可读宽度（发丝 1px） | 「任务框的长度应该是按实际时间线来，而不是有个最小固定长度大小」（`styles.ts:304-316`、`timeline-layout.ts:312-330`） | `max(TASK_BAR_MIN_WIDTH=1, duration/msPerPx)` | 高度/圆角可调；**不得**设最小像素宽 |
| R4 | **任务条填充中性色 + 3px 左色边**，不用实心 agent 色 | 「任务条背景颜色不要用跟 agent 的颜色，用回之前那种」（`styles.ts:313-317`） | `bg-layer-2` + `border-left:3px currentColor` | 左条 3px 可在 2–4px 内调；填充可换 token 但必须是中性表面 |
| R5 | **标签只在条内画**，装不下就省略/不画（三档 inside/ellipsis/none） | 「只在条内画，装不下就较少显示的文本」（`timeline-layout.ts:375,714`）、「最少也要显示 「...」」（`timeline-layout.ts:394`） | `taskLabelPlacement` 36/22 阈值 | 阈值需按新 padding 重推；**不得**把标签移到条外 |
| R6 | **活动词在统计行下方**（第三行） | 「这个文本应该出现在统计数据的下方（任务数和消息数）」（`GanttChart.tsx:1198-1201`） | 独立 `.dtg-head-activity` 行 | 行高/字号可调；顺序不可改为 pill 行上方 |
| R7 | **不显示 notes 诊断行** | 「界面中这段内容不需要显示」（`BoardView.tsx:659-665`） | notes 不渲染 | 不得恢复"精简版" |
| R8 | **不要「活动+消息」开关**，两层恒画 | 「这个开关感觉意义不大，取消这个功能吧」（`GanttChart.tsx:789-792`、`CHANGELOG.md:1020-1040`） | 无 messageMode 状态 | 不得以任何形式恢复该开关 |
| R9 | **消息标记轨在活动轨上方** | 「信息收发显示的泳道放在 span 的泳道上面」（`timeline-layout.ts:81-84`） | `laneTracks` = message→activity→task | 顺序不可换 |
| R10 | **等待条与 span 重合**（同一 activity 轨），不单独一行 | 「等待的灰色条可以重合在 span，这样表达更清晰」（`GanttChart.tsx:1441,1508-1513`） | wait 与 turn/step 同 y、z-index 2 | 纹理/透明度可调；不可移到消息轨 |
| R11 | **消息颜色 = 对端泳道色**；人用双色/气泡，不用通用圆点 | 「A 发给 B，A 的泳道显示 收件人B 的颜色」（`GanttChart.tsx:1753-1762`） | `messageMarkerPaint` | 形状可调；颜色语义不可改 |
| R12 | **标记不加外框/圆盘**：箭头就是全部；发送/接收同粗细、仅方向不同；接收是垂直镜像 | 「发送和接收的箭头 icon 样式应该一致…统一一下」→「改成更接收一样的 icon 只是方向变了」；「接收…从左上指向右下」（`styles.ts:858-867`、`GanttChart.tsx:2364-2371,2499`） | SVG stroke 2，无 fill，`scale(1,-1)` | 线宽可在 2–2.5 调；不可回退填充/加盘 |
| R13 | **dispatch 用虚线**表示"派生而非记录" | 契约定义 + `styles.ts:1044-1059` | `stroke-dasharray 1.6 1.2` | 虚线参数可调，语义不可丢 |
| R14 | **提问标记必须是鲜艳红 `?`**，不加新图标 | 「这个问号要用红色鲜艳的那种红」（`GanttChart.tsx:1804-1818`） | `--dsw-static-red-600` + 字符 `?` | 红值固定；不可换图标 |
| R15 | **提问详情只显示「问题+答案」**，不列全部选项描述 | 「里面显示内容不合适，应该是显示 问题 + 答案…如果还在等待就是只有问题」（`GanttChart.tsx:2271-2281`） | `QuestionPopoverBody` | 版式可调；内容集合不可加选项说明 |
| R16 | **浮窗显示完整标题**（不省略） | 「就要完整显示标题，不能缩略了」（`styles.ts:414-420`、`GanttChart.tsx:2167`） | 无 nowrap/ellipsis | 最大宽度可调 |
| R17 | **点泳道头跳会话；Lead 固定显示不可筛掉** | 「但是 lead 是不能筛选的，一定要显示的」（`lane-filter.ts:20-25,117-119`） | `isPinnedLane` + 菜单禁用行 | 跳转入口可换形态；不可让 Lead 可隐藏 |
| R18 | **「只看工作中」是模式行（switch），不是普通 checkbox** | 「上面筛选 teammate 地方，多一个特殊的筛选就是筛选当前正在工作中的」（`BoardView.tsx:221-242`） | `role=switch` + 轨道 | 视觉可调；不可退化成同级 checkbox |
| R19 | **live/冻结由服务端决定**，客户端不得自行推断 | 契约 `live` 权威（`BoardView.tsx:395-401`、`timeline-layout.ts:1027-1038`） | `data.live !== false` | 表现可改，判据不可改 |
| R20 | **时段筛选锚定左边界**（选 A：旧内容不动），follow 走到右缘再弹回 3/4 | 「选 A」（`GanttChart.tsx:336-352`）、「推到边缘位置又再回到 3/4」（`GanttChart.tsx:1555-1582`） | `anchorStart` + 迟滞 | 交互细节可调；两条语义均不可回退 |
| R21 | **普通滚轮不劫持**，仅 Ctrl/⌘+滚轮缩放 | 「Ctrl/⌘ + 滚轮缩放，Shift + 滚轮横向滚动」（`GanttChart.tsx:8-13,634-648`） | 非 passive wheel + 修饰键判断 | 可加拖拽平移等附加手势，不得抢普通滚轮 |
| R22 | **零字面色值、全部 token**；面板表面 = `bg-layer-1`，禁用 `--dsw-specific-sidebar-fill` | 皮肤契约（`styles.ts:6-13`、`panel-style.ts:20-23`） | 408 token 清单校验 | 只能在这些 token 里重排搭配 |
| R23 | **构建标识常显且不翻译** | 「a page can run a stale bundle…」（`BoardView.tsx:666-675`） | `.dtg-build` 固定渲染 | 可换位置/降噪，不可删除 |

---

## 6. 死代码 / 计算了但没渲染的字段（改版可直接清理）

| 项 | 状态 | 证据 |
|---|---|---|
| 加载 / 错误中心态 | **不可达**（`shownData===null` 先 `return null`） | `BoardView.tsx:332-335,499-501` vs `503-520` |
| 双详情同时打开 | 可能且会把图挤没 | `BoardView.tsx:635-653`、`styles.ts:1141,778` |
| `.dtg-head-row` 的 `borderLeftColor` | 无 `border-left` → 无效内联样式 | `GanttChart.tsx:1094-1097`、`styles.ts:127-135` |
| `.dtg-now-head-ended` | JSX 用了，CSS **没有该规则**（冻结药丸无样式差异） | `GanttChart.tsx:1287`、`styles.ts` 无定义 |
| `.dtg-chip-error`、`.dtg-lane-mark`、`.dtg-dot-ring`、`.dtg-legend-msg(-user)` | 无引用 | `styles.ts:75,228,472,1095-1107` |
| `messageLegendYou` / `messageLegendTeammate` / `waitStillBlocking` / `noLanes` / `fitPending` / `spinner` / `durationLabel` / `leadLabel` | 词典里有、无人使用 | `labels.ts:159-160,39,143-145,130,167` |
| `panel-style.ts` 的 8 个类钩子 | 只有 `-lane-head-navigable` 被用；其余 7 个（chrome/scroll/notice/button/mono/nodrag/error）无引用 | `panel-style.ts:59-180`、grep 结果 0 |
| `TaskCardRect.clippedLeft` | 计算了但 UI 从不表达 | `timeline-layout.ts:2394-2399,2444` |
| `TimelineLayout.truncatedTicks` | 计算了但从不提示 | `timeline-layout.ts:785-786`、`GanttChart.tsx` 无引用 |
| `TASK_CARD_HEIGHT=32` 与 `TASK_BAR_HEIGHT=20` | 槽位 32 只用到 20 + 11px 轨，余 10px（有意）；但标签阈值按 36 推导时按 `w-14` 算，忽略 4px 边框 | `timeline-layout.ts:309,362,384-388`、`styles.ts:32,325-330` |
