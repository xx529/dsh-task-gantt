/**
 * The plugin's own i18n: zh-CN + en, resolved from the page language.
 *
 * Deliberately dependency-free (no `@deepseek-ai/dsh-client-locale` peer): the
 * panel must load on a profile that composes nothing but better-sidebar, and the
 * guide (§10) tells consumers not to reach into better-sidebar's internal `t()`.
 *
 * Locale source (TEAM-BRIEF §5): `document.documentElement.lang || navigator.language`.
 * The DSH web shell keeps `documentElement.lang` in sync with the host locale —
 * `@deepseek-ai/dsh-client-locale`'s `syncDocumentLanguage()` writes `'zh-CN'`
 * for the `zh` snapshot and the raw language otherwise (verified in
 * `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar`), so reading
 * it at call time follows a live language switch instead of freezing the
 * language at module load.
 *
 * Adding a key means adding it to BOTH dictionaries; `MessageKey` is derived
 * from `zh` and `en` is typed as a full `Record`, so a missing translation is a
 * typecheck error rather than a silent English fallback.
 *
 * Owner: teammate `shell` — request new keys instead of editing this file.
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
  now: '现在',
  zoomIn: '放大时间轴',
  zoomOut: '缩小时间轴',
  zoomReset: '重置缩放',
  liveOnly: '实时状态（无历史时间）',
  notes: '数据说明',
  openSession: '打开该会话',
  you: '你',
  noSession: '无会话可跳转',
} as const

/** Every message key; both dictionaries must define all of them. */
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
  now: 'Now',
  zoomIn: 'Zoom in',
  zoomOut: 'Zoom out',
  zoomReset: 'Reset zoom',
  liveOnly: 'Live state (no dated history)',
  notes: 'Notes',
  openSession: 'Open this session',
  you: 'You',
  noSession: 'No session to open',
}

const DICTIONARIES: Record<Locale, Record<MessageKey, string>> = { zh, en }

/** Detect the page locale from the document language, then the browser. */
export function detectLocale(): Locale {
  const lang =
    (typeof document !== 'undefined' ? document.documentElement?.lang : '') ||
    (typeof navigator !== 'undefined' ? navigator.language : '') ||
    'en'
  return /^zh/i.test(lang) ? 'zh' : 'en'
}

/**
 * Locale snapshot taken at module load.
 *
 * @deprecated Prefer {@link t} or {@link currentLocale}: this value does not
 * follow a live language switch. Kept for tests and simple imports.
 */
export const locale: Locale = detectLocale()

/** The locale the page is in *right now*. */
export function currentLocale(): Locale {
  return detectLocale()
}

/** Translate one key in the page's current locale. */
export function t(key: MessageKey): string {
  return DICTIONARIES[detectLocale()][key]
}

/** Translate one key in an explicit locale. */
export function translate(localeOverride: Locale, key: MessageKey): string {
  return DICTIONARIES[localeOverride][key]
}

/** The full dictionary of the page's current locale (for tests). */
export function messages(): Record<MessageKey, string> {
  return { ...DICTIONARIES[detectLocale()] }
}

/** Both dictionaries, keyed by locale (for tests). */
export const dictionaries: Record<Locale, Record<MessageKey, string>> = {
  zh: { ...zh },
  en: { ...en },
}
