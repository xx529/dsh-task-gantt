/**
 * UI-local messages of the Gantt board (zh-CN + en).
 *
 * `src/client/i18n.ts` (owned by the `shell` teammate) carries the keys the TAB
 * needs; the board needs more strings than it declares, and a teammate must not
 * edit another owner's file — so the board keeps its own dictionary here and
 * resolves the locale through the SAME detection the shell already made
 * (`locale` from `../i18n.ts`). One detector, two dictionaries, no drift.
 */
import { locale } from '../i18n.ts'

const zh = {
  zoomIn: '放大',
  zoomOut: '缩小',
  zoomReset: '适应窗口',
  zoomHint: 'Ctrl/⌘ + 滚轮缩放，Shift + 滚轮横向滚动',
  refresh: '刷新',
  nowLabel: '现在',
  liveBadge: '实时',
  liveTaskHint: '无历史记录：只显示当前状态，不是历史区间',
  detailsTitle: '任务详情',
  close: '关闭',
  historyLabel: '状态迁移',
  noHistory: '无历史记录（实时态，日志里没有可用的时间锚点）',
  revisionLabel: '版本',
  statusLabel: '状态',
  laneLabel: '泳道',
  failureLabel: '团队故障',
  notesLabel: '提示',
  activityLabel: '活动',
  tasksLabel: '任务',
  durationLabel: '时长',
  blockedByNone: '无',
  chartAria: '任务甘特图：{lanes} 条泳道、{tasks} 个任务，时间从 {from} 到 {to}',
  laneAria: '{name}，状态{status}，{tasks} 个任务，{spans} 段活动',
  taskAria: '任务「{subject}」，状态{status}，{anchor}',
  taskAriaLive: '实时态（无历史记录）',
  taskAriaHistory: '历史区间，从 {from} 起',
  spanOpen: '进行中',
  turnLegend: 'turn 区间',
  stepLegend: 'step 区间',
  taskLegend: '任务卡',
  liveLegend: '实时（无历史）',
  notPlaced: '{count} 个任务的泳道不在名单中，未绘制',
  noLanes: '没有可绘制的泳道',
  zoomLevel: '{seconds} 秒/像素',
  fitPending: '正在测量宽度…',
  histCreated: '创建',
  histClaimed: '认领',
  histCompleted: '完成',
  histReopened: '重开',
  histUpdated: '更新',
  histObserved: '首次观测',
  scopesNone: '无',
  historySource: '时间来自会话日志',
  spinner: '读取中',
} as const

export type UiMessageKey = keyof typeof zh

const en: Record<UiMessageKey, string> = {
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomReset: 'Fit window',
  zoomHint: 'Ctrl/Cmd + wheel to zoom, Shift + wheel to scroll sideways',
  refresh: 'Refresh',
  nowLabel: 'now',
  liveBadge: 'live',
  liveTaskHint: 'No history: current state only, not a measured interval',
  detailsTitle: 'Task details',
  close: 'Close',
  historyLabel: 'Transitions',
  noHistory: 'No history (live state — the log carried no usable time anchor)',
  revisionLabel: 'revision',
  statusLabel: 'Status',
  laneLabel: 'Lane',
  failureLabel: 'Team failure',
  notesLabel: 'Notes',
  activityLabel: 'Activity',
  tasksLabel: 'Tasks',
  durationLabel: 'Duration',
  blockedByNone: 'none',
  chartAria: 'Task Gantt chart: {lanes} lanes, {tasks} tasks, time from {from} to {to}',
  laneAria: '{name}, status {status}, {tasks} tasks, {spans} activity spans',
  taskAria: 'Task "{subject}", status {status}, {anchor}',
  taskAriaLive: 'live state (no history)',
  taskAriaHistory: 'history span starting {from}',
  spanOpen: 'running',
  turnLegend: 'turn span',
  stepLegend: 'step span',
  taskLegend: 'task card',
  liveLegend: 'live (no history)',
  notPlaced: '{count} task(s) belong to a lane outside the roster and were not drawn',
  noLanes: 'No lane to draw',
  zoomLevel: '{seconds} s/px',
  fitPending: 'Measuring width…',
  histCreated: 'created',
  histClaimed: 'claimed',
  histCompleted: 'completed',
  histReopened: 'reopened',
  histUpdated: 'updated',
  histObserved: 'first observed',
  scopesNone: 'none',
  historySource: 'Times come from session logs',
  spinner: 'Loading',
}

const dictionaries: Record<'zh' | 'en', Record<UiMessageKey, string>> = { zh, en }

/** Translate one UI-local key, substituting `{name}` placeholders. */
export function uiLabel(key: UiMessageKey, vars?: Record<string, string | number>): string {
  const table = dictionaries[locale] ?? en
  const template = table[key] ?? en[key] ?? key
  if (vars === undefined) return template
  return template.replace(/\{(\w+)\}/g, (_match, name: string) => {
    const value = vars[name]
    return value === undefined ? `{${name}}` : String(value)
  })
}

/** The dictionary of the active locale (for tests / debugging). */
export function uiMessages(): Record<UiMessageKey, string> {
  return { ...(dictionaries[locale] ?? en) }
}
