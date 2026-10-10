/**
 * The plugin's own i18n: zh-CN + en, resolved from the page language.
 *
 * Deliberately dependency-free (no `@deepseek-ai/dsh-client-locale` peer): the
 * panel must load on a profile that composes nothing but better-sidebar.
 */

export type Locale = 'zh' | 'en'

const zh = {
  tabTitle: '任务甘特图',
  tabDescription: '按 teammate 展示任务时间线',
  loading: '正在读取会话日志…',
  emptyTitle: '当前会话没有 agent team',
  emptyBody: '本面板展示 Lead 会话与其 teammate 的任务时间线。先创建 team 或共享任务，再回到这里。',
  errorTitle: '读取时间线失败',
  retry: '重试',
  sourceLog: '时间来自会话日志',
  sourcePartial: '部分泳道无日志',
  sourceLive: '仅实时状态（无日志）',
  lead: 'Lead',
  teammate: 'Teammate',
  unassigned: '未指派',
  statusPending: '待处理',
  statusInProgress: '进行中',
  statusCompleted: '已完成',
  statusFailed: '失败',
  statusIdle: '空闲',
  statusRunning: '运行中',
  statusProvisioning: '创建中',
  taskOwner: '负责',
  taskBlockedBy: '依赖',
  taskReady: '可开始',
  taskWriteScopes: '写入范围',
  noTask: '暂无任务',
} as const

export type MessageKey = keyof typeof zh

const en: Record<MessageKey, string> = {
  tabTitle: 'Task Gantt',
  tabDescription: 'Task timeline per teammate',
  loading: 'Reading session logs…',
  emptyTitle: 'No agent team in this session',
  emptyBody: 'This panel charts the timeline of the lead session and its teammates. Create a team or a shared task, then come back.',
  errorTitle: 'Could not read the timeline',
  retry: 'Retry',
  sourceLog: 'Timeline from session logs',
  sourcePartial: 'Some lanes have no log',
  sourceLive: 'Live state only (no log)',
  lead: 'Lead',
  teammate: 'Teammate',
  unassigned: 'Unassigned',
  statusPending: 'Pending',
  statusInProgress: 'In progress',
  statusCompleted: 'Completed',
  statusFailed: 'Failed',
  statusIdle: 'Idle',
  statusRunning: 'Running',
  statusProvisioning: 'Provisioning',
  taskOwner: 'Owner',
  taskBlockedBy: 'Blocked by',
  taskReady: 'Ready',
  taskWriteScopes: 'Write scopes',
  noTask: 'No tasks',
}

/** Detect the page locale once, at module scope. */
export const locale: Locale = detectLocale()

function detectLocale(): Locale {
  const lang =
    (typeof document !== 'undefined' ? document.documentElement?.lang : '') ||
    (typeof navigator !== 'undefined' ? navigator.language : '') ||
    'en'
  return /^zh/i.test(lang) ? 'zh' : 'en'
}

/** Translate one key in the detected locale. */
export function t(key: MessageKey): string {
  return locale === 'zh' ? zh[key] : en[key]
}

/** The full dictionary of the detected locale (for tests). */
export function messages(): Record<MessageKey, string> {
  return locale === 'zh' ? { ...zh } : { ...en }
}

/** Both dictionaries, keyed by locale (for tests). */
export const dictionaries = { zh, en } as const
