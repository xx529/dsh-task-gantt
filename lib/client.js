window.__ModuleLoader__.load({ id: "dsh-task-gantt", factory: (require) => { var module = { exports: {} }; var exports = module.exports;

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject,
  name: () => name
});
module.exports = __toCommonJS(index_exports);
var import_react3 = require("react");

// src/shared/contract.ts
var API_VERSION = 1;
var TAB_TYPE_ID = "dsh-task-gantt:board";
var ROUTE_PREFIX = "/dsh-task-gantt/api";

// src/client/i18n.ts
var zh = {
  tabTitle: "\u4EFB\u52A1\u7518\u7279\u56FE",
  tabDescription: "\u6309 teammate \u5C55\u793A\u4EFB\u52A1\u65F6\u95F4\u7EBF",
  loading: "\u6B63\u5728\u8BFB\u53D6\u4F1A\u8BDD\u65E5\u5FD7\u2026",
  emptyTitle: "\u5F53\u524D\u4F1A\u8BDD\u6CA1\u6709 agent team",
  emptyBody: "\u672C\u9762\u677F\u5C55\u793A Lead \u4F1A\u8BDD\u4E0E\u5176 teammate \u7684\u4EFB\u52A1\u65F6\u95F4\u7EBF\u3002\u5148\u521B\u5EFA team \u6216\u5171\u4EAB\u4EFB\u52A1\uFF0C\u518D\u56DE\u5230\u8FD9\u91CC\u3002",
  errorTitle: "\u8BFB\u53D6\u65F6\u95F4\u7EBF\u5931\u8D25",
  retry: "\u91CD\u8BD5",
  sourceLog: "\u65F6\u95F4\u6765\u81EA\u4F1A\u8BDD\u65E5\u5FD7",
  sourcePartial: "\u90E8\u5206\u6CF3\u9053\u65E0\u65E5\u5FD7",
  sourceLive: "\u4EC5\u5B9E\u65F6\u72B6\u6001\uFF08\u65E0\u65E5\u5FD7\uFF09",
  lead: "Lead",
  teammate: "Teammate",
  unassigned: "\u672A\u6307\u6D3E",
  statusPending: "\u5F85\u5904\u7406",
  statusInProgress: "\u8FDB\u884C\u4E2D",
  statusCompleted: "\u5DF2\u5B8C\u6210",
  statusFailed: "\u5931\u8D25",
  statusIdle: "\u7A7A\u95F2",
  statusRunning: "\u8FD0\u884C\u4E2D",
  statusProvisioning: "\u521B\u5EFA\u4E2D",
  taskOwner: "\u8D1F\u8D23",
  taskBlockedBy: "\u4F9D\u8D56",
  taskReady: "\u53EF\u5F00\u59CB",
  taskWriteScopes: "\u5199\u5165\u8303\u56F4",
  noTask: "\u6682\u65E0\u4EFB\u52A1",
  now: "\u73B0\u5728",
  zoomIn: "\u653E\u5927\u65F6\u95F4\u8F74",
  zoomOut: "\u7F29\u5C0F\u65F6\u95F4\u8F74",
  zoomReset: "\u91CD\u7F6E\u7F29\u653E",
  liveOnly: "\u5B9E\u65F6\u72B6\u6001\uFF08\u65E0\u5386\u53F2\u65F6\u95F4\uFF09",
  notes: "\u6570\u636E\u8BF4\u660E"
};
var en = {
  tabTitle: "Task Gantt",
  tabDescription: "Task timeline per teammate",
  loading: "Reading session logs\u2026",
  emptyTitle: "No agent team in this session",
  emptyBody: "This panel charts the timeline of the lead session and its teammates. Create a team or a shared task, then come back.",
  errorTitle: "Could not read the timeline",
  retry: "Retry",
  sourceLog: "Timeline from session logs",
  sourcePartial: "Some lanes have no log",
  sourceLive: "Live state only (no log)",
  lead: "Lead",
  teammate: "Teammate",
  unassigned: "Unassigned",
  statusPending: "Pending",
  statusInProgress: "In progress",
  statusCompleted: "Completed",
  statusFailed: "Failed",
  statusIdle: "Idle",
  statusRunning: "Running",
  statusProvisioning: "Provisioning",
  taskOwner: "Owner",
  taskBlockedBy: "Blocked by",
  taskReady: "Ready",
  taskWriteScopes: "Write scopes",
  noTask: "No tasks",
  now: "Now",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomReset: "Reset zoom",
  liveOnly: "Live state (no dated history)",
  notes: "Notes"
};
var DICTIONARIES = { zh, en };
function detectLocale() {
  const lang = (typeof document !== "undefined" ? document.documentElement?.lang : "") || (typeof navigator !== "undefined" ? navigator.language : "") || "en";
  return /^zh/i.test(lang) ? "zh" : "en";
}
var locale = detectLocale();
function t(key) {
  return DICTIONARIES[detectLocale()][key];
}
var dictionaries = {
  zh: { ...zh },
  en: { ...en }
};

// src/client/panel-style.ts
var PLUGIN_ID = "dsh-task-gantt";
var STYLE_TAG_ID = `${PLUGIN_ID}/styles.css`;
var STYLE_MARKER_ATTR = "data-dsh-task-gantt";
var PANEL_CSS = `
/* Tab body root. The host wraps every tab body in a column-flex
   \`[data-dsh-native-tab-host]\` of height:100% (sidebar.module.css
   .nativeTabHost), so the root fills the pane with flex:1 + min-height:0.
   \`:not(style)\` keeps this rule off the injected <style> element itself, which
   carries the same marker attribute (a \`display\` on a stylesheet tag renders its
   text when it is not parked in a \`display:none\` head). */
[data-dsh-task-gantt]:not(style),
.dsh-task-gantt-panel {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12);
  -webkit-app-region: no-drag;
}

/* Interactive chrome: toolbars, zoom buttons, lane headers. */
.dsh-task-gantt-chrome {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 6px 10px;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  -webkit-app-region: no-drag;
}

/* The one scrolling region of the panel (chart canvas). */
.dsh-task-gantt-scroll {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
}

/* Loading / empty / degradation text. */
.dsh-task-gantt-notice {
  padding: 16px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxs-12);
  text-align: center;
}

.dsh-task-gantt-error {
  color: var(--dsw-alias-state-error-primary);
}

/* Token-styled button; the host draws the rest of the chrome. */
.dsh-task-gantt-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 6px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.dsh-task-gantt-button:hover {
  background: var(--dsw-alias-interactive-bg-hover);
  color: var(--dsw-alias-label-primary);
}

.dsh-task-gantt-button:disabled {
  color: var(--dsw-alias-label-dimmed);
  cursor: default;
}

/* Drag-strip exit for ad-hoc chrome (guide \xA712.1). */
.dsh-task-gantt-nodrag {
  -webkit-app-region: no-drag;
}

.dsh-task-gantt-mono {
  font: var(--dsw-font-mono);
  color: var(--dsw-alias-label-tertiary);
}
`;
var injected = false;
function injectPanelStyles(css = PANEL_CSS) {
  if (injected) return NOOP;
  try {
    return injectOnce(css);
  } catch {
    return NOOP;
  }
}
function injectOnce(css) {
  const viaLoader = insertViaLoader(css);
  if (viaLoader !== null) {
    injected = true;
    return NOOP;
  }
  if (typeof document === "undefined") return NOOP;
  if (typeof document.createElement !== "function" || typeof document.querySelector !== "function") {
    return NOOP;
  }
  const owned = `style[data-plugin-css=${JSON.stringify(STYLE_TAG_ID)}]`;
  if (document.querySelector(owned) !== null) {
    injected = true;
    return NOOP;
  }
  const tag = document.createElement("style");
  tag.setAttribute("data-plugin", PLUGIN_ID);
  tag.setAttribute("data-plugin-css", STYLE_TAG_ID);
  tag.setAttribute(STYLE_MARKER_ATTR, "");
  tag.textContent = css;
  const parent = document.head ?? document.documentElement;
  parent.appendChild(tag);
  injected = true;
  return () => {
    if (tag.isConnected) tag.remove();
    injected = false;
  };
}
function NOOP() {
}
function insertViaLoader(css) {
  if (typeof window === "undefined") return null;
  const loader = window.__ModuleLoader__;
  const styles = loader?.styles;
  const insert = styles?.insert;
  if (typeof insert !== "function") return null;
  try {
    insert.call(styles, css);
    return true;
  } catch {
    return null;
  }
}

// src/client/transport.ts
function documentRelative(path) {
  return path.startsWith("/") ? path.slice(1) : path;
}
function resolveHostRoute(path, sidebar) {
  if (typeof sidebar?.hostRouteUrl === "function") {
    try {
      return sidebar.hostRouteUrl(path);
    } catch {
    }
  }
  const globals = globalThis;
  const base = globals.__DSH_TRANSPORT__?.streamBaseUrl ?? globals.document?.baseURI;
  if (base === void 0 || base === "") return documentRelative(path);
  try {
    return new URL(documentRelative(path), base).toString();
  } catch {
    return documentRelative(path);
  }
}

// src/client/ui/BoardView.tsx
var import_react2 = require("react");

// src/client/api.ts
function routeUrl(method, options) {
  const path = `${ROUTE_PREFIX}/${method}`;
  if (options?.routeBase !== void 0) return options.routeBase(path);
  return resolveHostRoute(path);
}
var ApiHttpError = class extends Error {
  constructor(status, message) {
    super(message);
    __publicField(this, "status");
    this.name = "ApiHttpError";
    this.status = status;
  }
};
async function postJson(method, body, options) {
  const res = await fetch(routeUrl(method, options), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
    ...options?.signal === void 0 ? {} : { signal: options.signal }
  });
  const text = await res.text();
  let envelope;
  try {
    envelope = JSON.parse(text);
  } catch {
    envelope = void 0;
  }
  if (envelope === void 0) {
    throw new ApiHttpError(res.status, `HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!envelope.ok) throw new Error(`${envelope.error.code}: ${envelope.error.message}`);
  return envelope.value;
}
async function fetchTimeline(sessionId, options) {
  return postJson("timeline", { sessionId, apiVersion: API_VERSION }, options);
}

// src/client/ui/GanttChart.tsx
var import_react = require("react");

// src/client/ui/labels.ts
var zh2 = {
  zoomIn: "\u653E\u5927",
  zoomOut: "\u7F29\u5C0F",
  zoomReset: "\u9002\u5E94\u7A97\u53E3",
  zoomHint: "Ctrl/\u2318 + \u6EDA\u8F6E\u7F29\u653E\uFF0CShift + \u6EDA\u8F6E\u6A2A\u5411\u6EDA\u52A8",
  refresh: "\u5237\u65B0",
  nowLabel: "\u73B0\u5728",
  liveBadge: "\u5B9E\u65F6",
  liveTaskHint: "\u65E0\u5386\u53F2\u8BB0\u5F55\uFF1A\u53EA\u663E\u793A\u5F53\u524D\u72B6\u6001\uFF0C\u4E0D\u662F\u5386\u53F2\u533A\u95F4",
  detailsTitle: "\u4EFB\u52A1\u8BE6\u60C5",
  close: "\u5173\u95ED",
  historyLabel: "\u72B6\u6001\u8FC1\u79FB",
  noHistory: "\u65E0\u5386\u53F2\u8BB0\u5F55\uFF08\u5B9E\u65F6\u6001\uFF0C\u65E5\u5FD7\u91CC\u6CA1\u6709\u53EF\u7528\u7684\u65F6\u95F4\u951A\u70B9\uFF09",
  revisionLabel: "\u7248\u672C",
  statusLabel: "\u72B6\u6001",
  laneLabel: "\u6CF3\u9053",
  failureLabel: "\u56E2\u961F\u6545\u969C",
  notesLabel: "\u63D0\u793A",
  activityLabel: "\u6D3B\u52A8",
  tasksLabel: "\u4EFB\u52A1",
  durationLabel: "\u65F6\u957F",
  blockedByNone: "\u65E0",
  chartAria: "\u4EFB\u52A1\u7518\u7279\u56FE\uFF1A{lanes} \u6761\u6CF3\u9053\u3001{tasks} \u4E2A\u4EFB\u52A1\uFF0C\u65F6\u95F4\u4ECE {from} \u5230 {to}",
  laneAria: "{name}\uFF0C\u72B6\u6001{status}\uFF0C{tasks} \u4E2A\u4EFB\u52A1\uFF0C{spans} \u6BB5\u6D3B\u52A8",
  taskAria: "\u4EFB\u52A1\u300C{subject}\u300D\uFF0C\u72B6\u6001{status}\uFF0C{anchor}",
  taskAriaLive: "\u5B9E\u65F6\u6001\uFF08\u65E0\u5386\u53F2\u8BB0\u5F55\uFF09",
  taskAriaHistory: "\u5386\u53F2\u533A\u95F4\uFF0C\u4ECE {from} \u8D77",
  spanOpen: "\u8FDB\u884C\u4E2D",
  turnLegend: "turn \u533A\u95F4",
  stepLegend: "step \u533A\u95F4",
  taskLegend: "\u4EFB\u52A1\u5361",
  liveLegend: "\u5B9E\u65F6\uFF08\u65E0\u5386\u53F2\uFF09",
  notPlaced: "{count} \u4E2A\u4EFB\u52A1\u7684\u6CF3\u9053\u4E0D\u5728\u540D\u5355\u4E2D\uFF0C\u672A\u7ED8\u5236",
  noLanes: "\u6CA1\u6709\u53EF\u7ED8\u5236\u7684\u6CF3\u9053",
  zoomLevel: "{seconds} \u79D2/\u50CF\u7D20",
  fitPending: "\u6B63\u5728\u6D4B\u91CF\u5BBD\u5EA6\u2026",
  histCreated: "\u521B\u5EFA",
  histClaimed: "\u8BA4\u9886",
  histCompleted: "\u5B8C\u6210",
  histReopened: "\u91CD\u5F00",
  histUpdated: "\u66F4\u65B0",
  histObserved: "\u9996\u6B21\u89C2\u6D4B",
  scopesNone: "\u65E0",
  historySource: "\u65F6\u95F4\u6765\u81EA\u4F1A\u8BDD\u65E5\u5FD7",
  spinner: "\u8BFB\u53D6\u4E2D"
};
var en2 = {
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomReset: "Fit window",
  zoomHint: "Ctrl/Cmd + wheel to zoom, Shift + wheel to scroll sideways",
  refresh: "Refresh",
  nowLabel: "now",
  liveBadge: "live",
  liveTaskHint: "No history: current state only, not a measured interval",
  detailsTitle: "Task details",
  close: "Close",
  historyLabel: "Transitions",
  noHistory: "No history (live state \u2014 the log carried no usable time anchor)",
  revisionLabel: "revision",
  statusLabel: "Status",
  laneLabel: "Lane",
  failureLabel: "Team failure",
  notesLabel: "Notes",
  activityLabel: "Activity",
  tasksLabel: "Tasks",
  durationLabel: "Duration",
  blockedByNone: "none",
  chartAria: "Task Gantt chart: {lanes} lanes, {tasks} tasks, time from {from} to {to}",
  laneAria: "{name}, status {status}, {tasks} tasks, {spans} activity spans",
  taskAria: 'Task "{subject}", status {status}, {anchor}',
  taskAriaLive: "live state (no history)",
  taskAriaHistory: "history span starting {from}",
  spanOpen: "running",
  turnLegend: "turn span",
  stepLegend: "step span",
  taskLegend: "task card",
  liveLegend: "live (no history)",
  notPlaced: "{count} task(s) belong to a lane outside the roster and were not drawn",
  noLanes: "No lane to draw",
  zoomLevel: "{seconds} s/px",
  fitPending: "Measuring width\u2026",
  histCreated: "created",
  histClaimed: "claimed",
  histCompleted: "completed",
  histReopened: "reopened",
  histUpdated: "updated",
  histObserved: "first observed",
  scopesNone: "none",
  historySource: "Times come from session logs",
  spinner: "Loading"
};
var dictionaries2 = { zh: zh2, en: en2 };
function uiLabel(key, vars) {
  const table = dictionaries2[locale] ?? en2;
  const template = table[key] ?? en2[key] ?? key;
  if (vars === void 0) return template;
  return template.replace(/\{(\w+)\}/g, (_match, name2) => {
    const value = vars[name2];
    return value === void 0 ? `{${name2}}` : String(value);
  });
}

// src/client/ui/status.ts
var TASK_STATUS_TEXT = {
  pending: () => t("statusPending"),
  in_progress: () => t("statusInProgress"),
  completed: () => t("statusCompleted"),
  deleted: () => t("statusCompleted")
};
var MEMBER_STATUS_TEXT = {
  running: () => t("statusRunning"),
  idle: () => t("statusIdle"),
  provisioning: () => t("statusProvisioning"),
  failed: () => t("statusFailed")
};
var ROLE_TEXT = {
  lead: () => t("lead"),
  teammate: () => t("teammate"),
  unknown: () => t("unassigned")
};
var STATUS_GLYPH = {
  running: "\u25B6",
  idle: "\u23F8",
  provisioning: "\u2026",
  failed: "\u2715",
  pending: "\u25CB",
  in_progress: "\u25B6",
  completed: "\u2713",
  deleted: "\u232B"
};
function taskStatusText(status) {
  if (status === void 0) return "\u2014";
  return (TASK_STATUS_TEXT[status] ?? (() => "\u2014"))();
}
function memberStatusText(status) {
  if (status === void 0) return "\u2014";
  return (MEMBER_STATUS_TEXT[status] ?? (() => "\u2014"))();
}
function roleText(role) {
  return (ROLE_TEXT[role] ?? ROLE_TEXT.unknown)();
}
function historyActionText(action) {
  switch (action) {
    case "created":
      return uiLabel("histCreated");
    case "claimed":
      return uiLabel("histClaimed");
    case "completed":
      return uiLabel("histCompleted");
    case "reopened":
      return uiLabel("histReopened");
    case "observed":
      return uiLabel("histObserved");
    default:
      return uiLabel("histUpdated");
  }
}

// src/client/ui/timeline-layout.ts
var SECOND_MS = 1e3;
var MINUTE_MS = 60 * SECOND_MS;
var HOUR_MS = 60 * MINUTE_MS;
var DAY_MS = 24 * HOUR_MS;
var LANE_HEAD_WIDTH = 132;
var DEFAULT_LANE_HEIGHT = 56;
var DEFAULT_HEADER_HEIGHT = 28;
var DEFAULT_TICK_COUNT = 6;
var LANE_PAD_Y = 3;
var TURN_BAND_HEIGHT = 10;
var STEP_BAR_HEIGHT = 8;
var TASK_CARD_GAP = 4;
var TASK_CARD_TOP = LANE_PAD_Y + TURN_BAND_HEIGHT + TASK_CARD_GAP;
var TASK_CARD_HEIGHT = 36;
var TASK_MIN_WIDTH = 148;
var TASK_MAX_WIDTH = 260;
var MIN_SPAN_PX = 2;
var MIN_MS_PER_PX = 50;
var MAX_MS_PER_PX = 6e5;
var DEFAULT_MS_PER_PX = 1e3;
var MAX_TICKS = 400;
var TICK_STEPS = [
  SECOND_MS,
  2 * SECOND_MS,
  5 * SECOND_MS,
  10 * SECOND_MS,
  15 * SECOND_MS,
  30 * SECOND_MS,
  MINUTE_MS,
  2 * MINUTE_MS,
  5 * MINUTE_MS,
  10 * MINUTE_MS,
  15 * MINUTE_MS,
  30 * MINUTE_MS,
  HOUR_MS,
  2 * HOUR_MS,
  3 * HOUR_MS,
  6 * HOUR_MS,
  12 * HOUR_MS,
  DAY_MS,
  2 * DAY_MS,
  7 * DAY_MS
];
function clamp(value, lo, hi) {
  if (value < lo) return lo;
  if (value > hi) return hi;
  return value;
}
function num(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function positive(value, fallback) {
  const v = num(value, Number.NaN);
  return Number.isFinite(v) && v > 0 ? v : fallback;
}
function pad2(value) {
  return value < 10 ? `0${value}` : `${value}`;
}
function clampMsPerPx(value) {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MS_PER_PX;
  return clamp(value, MIN_MS_PER_PX, MAX_MS_PER_PX);
}
function fitMsPerPx(durationMs, widthPx) {
  const d = Number.isFinite(durationMs) && durationMs > 0 ? durationMs : 1;
  const w = Number.isFinite(widthPx) && widthPx > 0 ? widthPx : 1;
  return clampMsPerPx(d / w);
}
function pickTickStep(targetMs) {
  const target = Number.isFinite(targetMs) && targetMs > 0 ? targetMs : TICK_STEPS[0] ?? SECOND_MS;
  for (const step of TICK_STEPS) {
    if (step >= target) return step;
  }
  return TICK_STEPS[TICK_STEPS.length - 1] ?? DAY_MS;
}
function formatClock(time, tzOffsetMinutes = 0) {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS);
  return `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
}
function formatDateTime(time, tzOffsetMinutes = 0) {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS);
  return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())} ${formatClock(time, tzOffsetMinutes)}`;
}
function formatTickLabel(time, kind, tzOffsetMinutes = 0) {
  if (kind === "time") return formatClock(time, tzOffsetMinutes);
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS);
  return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}
function computeWindow(data, now) {
  const fallback = num(now, 0);
  const rangeStart = num(data?.range?.start, fallback);
  const rangeEnd = typeof data?.range?.end === "number" ? num(data.range.end, fallback) : null;
  let rawStart = rangeStart;
  let rawEnd = rangeStart;
  const consider = (value) => {
    if (typeof value !== "number" || !Number.isFinite(value)) return;
    if (value < rawStart) rawStart = value;
    if (value > rawEnd) rawEnd = value;
  };
  for (const lane of data?.lanes ?? []) {
    for (const span of lane.spans ?? []) {
      consider(span.start);
      consider(span.end);
    }
    for (const task of lane.tasks ?? []) {
      for (const event of task.history ?? []) consider(event.time);
    }
  }
  for (const task of data?.tasks ?? []) {
    for (const event of task.history ?? []) consider(event.time);
  }
  const start = rawStart;
  const proposed = rangeEnd !== null ? Math.max(rangeEnd, rawEnd) : Math.max(fallback, rawEnd);
  const end = Math.max(proposed, start + 1);
  return { start, end, durationMs: end - start, live: data?.range?.end === null };
}
function buildTicks(input) {
  const { window: win, msPerPx, viewportWidth, scrollLeft, tzOffsetMinutes } = input;
  const tickCount = Math.max(1, Math.floor(positive(input.tickCount, DEFAULT_TICK_COUNT)));
  const targetStep = msPerPx * Math.max(1, viewportWidth) / tickCount;
  const stepMs = pickTickStep(targetStep);
  const align = stepMs >= DAY_MS ? tzOffsetMinutes * MINUTE_MS : 0;
  const first = Math.ceil((win.start - align) / stepMs) * stepMs + align;
  const labelKind = stepMs < DAY_MS ? "time" : "date";
  const ticks = [];
  let truncated = false;
  let time = first;
  while (time <= win.end) {
    if (ticks.length >= MAX_TICKS) {
      truncated = true;
      break;
    }
    const x = (time - win.start) / msPerPx;
    const viewX = x - scrollLeft;
    ticks.push({
      time,
      x,
      viewX,
      stepMs,
      labelKind,
      label: formatTickLabel(time, labelKind, tzOffsetMinutes),
      major: labelKind === "date" ? true : (time - align) % HOUR_MS === 0,
      visible: viewX >= -1 && viewX <= viewportWidth + 1
    });
    time += stepMs;
  }
  return { ticks, stepMs, truncated };
}
function layoutTimeline(data, viewport, options) {
  const now = num(options.now, 0);
  const laneHeight = positive(viewport?.laneHeight, DEFAULT_LANE_HEIGHT);
  const headerHeight = positive(viewport?.headerHeight, DEFAULT_HEADER_HEIGHT);
  const width = positive(viewport?.width, 1);
  const viewportHeight = num(viewport?.height, 0);
  const msPerPx = clampMsPerPx(num(options.msPerPx, DEFAULT_MS_PER_PX));
  const scrollLeft = Math.max(0, num(options.scrollLeft, 0));
  const scrollTop = Math.max(0, num(options.scrollTop, 0));
  const cull = options.cull === true;
  const tzOffsetMinutes = typeof options.tzOffsetMinutes === "number" && Number.isFinite(options.tzOffsetMinutes) ? options.tzOffsetMinutes : -new Date(now).getTimezoneOffset();
  const win = computeWindow(data, now);
  const dataWidth = win.durationMs / msPerPx;
  const contentWidth = dataWidth;
  const lanesInput = data?.lanes ?? [];
  const laneIndexById = /* @__PURE__ */ new Map();
  const lanes = lanesInput.map((lane, index) => {
    const y = headerHeight + index * laneHeight;
    laneIndexById.set(lane.id, index);
    const visible = viewportHeight <= 0 ? true : y + laneHeight > scrollTop + headerHeight && y < scrollTop + headerHeight + viewportHeight;
    return {
      laneId: lane.id,
      index,
      name: lane.name,
      y,
      height: laneHeight,
      viewY: y - scrollTop,
      visible,
      lane
    };
  });
  const spans = [];
  for (let index = 0; index < lanesInput.length; index += 1) {
    const lane = lanesInput[index];
    if (lane === void 0) continue;
    const laneY = headerHeight + index * laneHeight;
    const list = lane.spans ?? [];
    for (let s = 0; s < list.length; s += 1) {
      const span = list[s];
      if (span === void 0) continue;
      const rect = spanRect(lane.id, index, laneY, span, win, msPerPx, now, scrollLeft, width);
      if (!cull || rect.visible) spans.push(rect);
    }
  }
  const tasks = [];
  const placed = /* @__PURE__ */ new Set();
  const pushTask = (task, laneIndex) => {
    placed.add(task.id);
    const laneY = headerHeight + laneIndex * laneHeight;
    const rect = taskCardRect(
      task,
      lanesInput[laneIndex]?.id ?? task.laneId,
      laneIndex,
      laneY,
      win,
      msPerPx,
      scrollLeft,
      width
    );
    if (!cull || rect.visible) tasks.push(rect);
  };
  for (let index = 0; index < lanesInput.length; index += 1) {
    const lane = lanesInput[index];
    if (lane === void 0) continue;
    for (const task of lane.tasks ?? []) pushTask(task, index);
  }
  const unplacedTaskIds = [];
  for (const task of data?.tasks ?? []) {
    if (placed.has(task.id)) continue;
    const laneIndex = laneIndexById.get(task.laneId);
    if (laneIndex === void 0) {
      unplacedTaskIds.push(task.id);
      continue;
    }
    pushTask(task, laneIndex);
  }
  const { ticks, truncated } = buildTicks({
    window: win,
    msPerPx,
    viewportWidth: width,
    scrollLeft,
    tickCount: num(options.tickCount, DEFAULT_TICK_COUNT),
    tzOffsetMinutes
  });
  const nowX = clamp((now - win.start) / msPerPx, 0, dataWidth);
  const nowViewX = nowX - scrollLeft;
  return {
    window: win,
    msPerPx,
    scrollLeft,
    scrollTop,
    viewportWidth: width,
    viewportHeight,
    dataWidth,
    contentWidth,
    contentHeight: headerHeight + lanesInput.length * laneHeight,
    lanes,
    spans,
    tasks,
    ticks,
    now,
    nowX,
    nowViewX,
    nowVisible: nowViewX >= 0 && nowViewX <= width,
    tzOffsetMinutes,
    truncatedTicks: truncated,
    unplacedTaskIds
  };
}
function spanRect(laneId, laneIndex, laneY, span, win, msPerPx, now, scrollLeft, viewportWidth) {
  const startRaw = num(span.start, win.start);
  const open = span.end === null || span.end === void 0;
  const endRaw = open ? Math.min(Math.max(now, startRaw), win.end) : Math.max(startRaw, num(span.end, startRaw));
  const x0 = clamp(startRaw, win.start, win.end);
  const x1 = clamp(endRaw, win.start, win.end);
  const x = (x0 - win.start) / msPerPx;
  const w = Math.max(MIN_SPAN_PX, (x1 - x0) / msPerPx);
  const viewX = x - scrollLeft;
  const isTurn = span.kind === "turn";
  return {
    laneId,
    laneIndex,
    kind: isTurn ? "turn" : "step",
    open,
    start: startRaw,
    end: endRaw,
    x,
    y: laneY + (isTurn ? LANE_PAD_Y : LANE_PAD_Y + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2),
    w,
    h: isTurn ? TURN_BAND_HEIGHT : STEP_BAR_HEIGHT,
    viewX,
    visible: viewX + w >= 0 && viewX <= viewportWidth,
    ...span.turn === void 0 ? {} : { turn: span.turn },
    ...span.step === void 0 ? {} : { step: span.step }
  };
}
function taskCardRect(task, laneId, laneIndex, laneY, win, msPerPx, scrollLeft, viewportWidth) {
  const history = task.history ?? [];
  let anchor = "live";
  let historyIndex = -1;
  let from = win.end;
  let to = win.end;
  let x = 0;
  let w = TASK_MIN_WIDTH;
  if (history.length > 0) {
    anchor = "history";
    historyIndex = 0;
    from = num(history[0]?.time, win.start);
    to = from;
    for (const event of history) {
      const time = num(event.time, from);
      if (time > to) to = time;
    }
    const x0 = clamp(from, win.start, win.end);
    const x1 = clamp(to, win.start, win.end);
    x = (x0 - win.start) / msPerPx;
    w = clamp((x1 - x0) / msPerPx, TASK_MIN_WIDTH, TASK_MAX_WIDTH);
  } else {
    x = Math.max(0, win.durationMs / msPerPx - TASK_MIN_WIDTH);
    w = TASK_MIN_WIDTH;
  }
  const viewX = x - scrollLeft;
  return {
    laneId,
    laneIndex,
    task,
    anchor,
    at: from,
    durationMs: to - from,
    historyIndex,
    x,
    y: laneY + TASK_CARD_TOP,
    w,
    h: TASK_CARD_HEIGHT,
    viewX,
    visible: viewX + w >= 0 && viewX <= viewportWidth,
    live: anchor === "live"
  };
}

// src/client/ui/GanttChart.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ZOOM_STEP = 1.5;
function GanttChart(props) {
  const { data, now, visible, selectedTaskId, onSelectTask } = props;
  const scrollRef = (0, import_react.useRef)(null);
  const frameRef = (0, import_react.useRef)(0);
  const pendingScrollLeft = (0, import_react.useRef)(null);
  const [viewport, setViewport] = (0, import_react.useState)({ width: 0, height: 0 });
  const [scroll, setScroll] = (0, import_react.useState)({ left: 0, top: 0 });
  const [msPerPx, setMsPerPx] = (0, import_react.useState)(null);
  const win = (0, import_react.useMemo)(() => computeWindow(data, now), [data, now]);
  const effectiveMsPerPx = msPerPx ?? fitMsPerPx(win.durationMs, Math.max(1, viewport.width));
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset();
  const layout = (0, import_react.useMemo)(
    () => layoutTimeline(
      data,
      {
        width: Math.max(1, viewport.width),
        height: viewport.height,
        laneHeight: DEFAULT_LANE_HEIGHT,
        headerHeight: DEFAULT_HEADER_HEIGHT
      },
      {
        now,
        msPerPx: effectiveMsPerPx,
        scrollLeft: scroll.left,
        scrollTop: scroll.top,
        cull: true
      }
    ),
    [data, now, effectiveMsPerPx, viewport.width, viewport.height, scroll.left, scroll.top]
  );
  const syncScroll = (0, import_react.useCallback)(() => {
    const el = scrollRef.current;
    if (el === null) return;
    const top = el.scrollTop;
    const left = el.scrollLeft;
    setScroll((prev) => prev.left === left && prev.top === top ? prev : { left, top });
  }, []);
  (0, import_react.useEffect)(() => {
    const el = scrollRef.current;
    if (el === null) return;
    const apply2 = () => {
      const width = el.clientWidth;
      const height = el.clientHeight;
      setViewport(
        (prev) => prev.width === width && prev.height === height ? prev : { width, height }
      );
    };
    apply2();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", apply2);
      return () => window.removeEventListener("resize", apply2);
    }
    const observer = new ResizeObserver(apply2);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  const onScroll = (0, import_react.useCallback)(() => {
    if (frameRef.current !== 0) return;
    frameRef.current = requestAnimationFrame(() => {
      frameRef.current = 0;
      syncScroll();
    });
  }, [syncScroll]);
  (0, import_react.useEffect)(
    () => () => {
      if (frameRef.current !== 0) cancelAnimationFrame(frameRef.current);
    },
    []
  );
  const applyZoom = (0, import_react.useCallback)(
    (requested, cursorX) => {
      const el = scrollRef.current;
      const next = clampMsPerPx(requested);
      if (next === effectiveMsPerPx) return;
      if (el !== null) {
        const timeAtCursor = win.start + (el.scrollLeft + cursorX) * effectiveMsPerPx;
        pendingScrollLeft.current = Math.max(0, (timeAtCursor - win.start) / next - cursorX);
      }
      setMsPerPx(next);
    },
    [effectiveMsPerPx, win.start]
  );
  (0, import_react.useLayoutEffect)(() => {
    const el = scrollRef.current;
    const pending = pendingScrollLeft.current;
    if (el === null || pending === null) return;
    pendingScrollLeft.current = null;
    el.scrollLeft = pending;
    syncScroll();
  }, [effectiveMsPerPx, syncScroll]);
  (0, import_react.useEffect)(() => {
    const el = scrollRef.current;
    if (el === null) return;
    const handler = (event) => {
      if (!(event.ctrlKey || event.metaKey)) return;
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = event.deltaY > 0 ? ZOOM_STEP : 1 / ZOOM_STEP;
      applyZoom(effectiveMsPerPx * factor, event.clientX - rect.left);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, [applyZoom, effectiveMsPerPx]);
  const zoomByButton = (0, import_react.useCallback)(
    (factor) => {
      const el = scrollRef.current;
      applyZoom(effectiveMsPerPx * factor, el === null ? 0 : el.clientWidth / 2);
    },
    [applyZoom, effectiveMsPerPx]
  );
  const showNow = win.live || now >= win.start && now <= win.end;
  const chartAria = uiLabel("chartAria", {
    lanes: layout.lanes.length,
    tasks: layout.tasks.length,
    from: formatDateTime(win.start, tzOffsetMinutes),
    to: formatDateTime(win.end, tzOffsetMinutes)
  });
  const drawnPerLane = (box) => box.lane.tasks.length;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: visible ? "dtg-chart" : "dtg-chart dtg-paused",
      role: "group",
      "aria-label": chartAria,
      "data-dsh-task-gantt": "",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-body", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-heads", style: { width: LANE_HEAD_WIDTH }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
            "div",
            {
              className: "dtg-heads-inner",
              style: { transform: `translateY(${-layout.scrollTop}px)` },
              role: "list",
              children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-head-corner", style: { height: DEFAULT_HEADER_HEIGHT }, role: "presentation", children: uiLabel("activityLabel") }),
                layout.lanes.map((lane) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  LaneHead,
                  {
                    box: lane,
                    tzOffsetMinutes,
                    drawnTasks: drawnPerLane(lane)
                  },
                  lane.laneId
                ))
              ]
            }
          ) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "div",
            {
              className: "dtg-scroll",
              ref: scrollRef,
              onScroll,
              tabIndex: 0,
              "aria-label": uiLabel("zoomHint"),
              children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  className: "dtg-canvas",
                  style: { width: layout.contentWidth, height: layout.contentHeight },
                  children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Axis, { layout, showNow, tzOffsetMinutes }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-layer", "aria-hidden": "true", children: [
                      layout.lanes.map((lane) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "span",
                        {
                          className: lane.index % 2 === 1 ? "dtg-lane-bg dtg-lane-bg-alt" : "dtg-lane-bg",
                          style: { top: lane.y, width: layout.contentWidth, height: lane.height }
                        },
                        lane.laneId
                      )),
                      layout.ticks.map((tick) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "span",
                        {
                          className: tick.major ? "dtg-gridline dtg-gridline-major" : "dtg-gridline",
                          style: { left: tick.x, height: layout.contentHeight }
                        },
                        `grid:${tick.time}`
                      )),
                      layout.spans.map(
                        (span, index) => span.kind === "turn" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpanBar, { span }, `turn:${index}:${spanKey(span)}`) : null
                      ),
                      layout.spans.map(
                        (span, index) => span.kind === "step" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpanBar, { span }, `step:${index}:${spanKey(span)}`) : null
                      ),
                      showNow ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-now", style: { left: layout.nowX } }) : null
                    ] }),
                    layout.tasks.map((rect) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      TaskCard,
                      {
                        rect,
                        selected: rect.task.id === selectedTaskId,
                        onSelectTask,
                        tzOffsetMinutes
                      },
                      `${rect.task.id}@${rect.laneIndex}`
                    )),
                    layout.lanes.map(
                      (lane) => lane.lane.spans.length === 0 && lane.lane.tasks.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "span",
                        {
                          className: "dtg-empty-lane",
                          style: { left: 6, top: lane.y + 20 },
                          children: t("noTask")
                        },
                        `empty:${lane.laneId}`
                      ) : null
                    )
                  ]
                }
              )
            }
          )
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-legend", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dtg-btn", onClick: () => zoomByButton(1 / ZOOM_STEP), title: uiLabel("zoomOut"), children: "\u2212" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dtg-btn", onClick: () => setMsPerPx(null), title: uiLabel("zoomReset"), children: "\u2922" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: "dtg-btn", onClick: () => zoomByButton(ZOOM_STEP), title: uiLabel("zoomIn"), children: "+" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-zoom-readout", title: uiLabel("zoomHint"), children: uiLabel("zoomLevel", {
            seconds: (effectiveMsPerPx / 1e3).toFixed(effectiveMsPerPx < 1e3 ? 2 : 0)
          }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-spacer" }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-turn" }),
            uiLabel("turnLegend")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-step" }),
            uiLabel("stepLegend")
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-card" }),
            uiLabel("taskLegend")
          ] }),
          layout.unplacedTaskIds.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-item dtg-ink-failed", title: layout.unplacedTaskIds.join(", "), children: uiLabel("notPlaced", { count: layout.unplacedTaskIds.length }) })
        ] })
      ]
    }
  );
}
function spanKey(span) {
  return `${span.laneId}:${span.kind}:${span.start}:${span.end}:${span.turn ?? ""}:${span.step ?? ""}`;
}
function statusText(status) {
  if (status === void 0) return "\u2014";
  return status === "pending" || status === "in_progress" || status === "completed" || status === "deleted" ? taskStatusText(status) : memberStatusText(status);
}
function LaneHead({
  box,
  tzOffsetMinutes,
  drawnTasks
}) {
  const lane = box.lane;
  const status = lane.status ?? "idle";
  const ink = `dtg-ink dtg-ink-${status}`;
  const spans = lane.spans.length;
  const aria = uiLabel("laneAria", {
    name: lane.name,
    status: statusText(status),
    tasks: drawnTasks,
    spans
  });
  const detail = [
    lane.name,
    statusText(status),
    lane.model ?? "",
    lane.createdAt === void 0 ? "" : formatDateTime(lane.createdAt, tzOffsetMinutes),
    lane.error ?? ""
  ].filter((part) => part !== "").join(" \xB7 ");
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: status === "idle" ? "dtg-head-row dtg-head-row-idle" : "dtg-head-row",
      style: { height: box.height },
      role: "listitem",
      "aria-label": aria,
      title: detail,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-head-top", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ink, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-dot" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-name", title: lane.name, children: lane.name }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ink, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-glyph", children: STATUS_GLYPH[status] ?? "\xB7" }) })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-head-meta", children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dtg-head-role ${ink}`, children: roleText(lane.role) }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-meta-text", children: statusText(status) }),
          drawnTasks > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-meta-text", children: `${drawnTasks} ${uiLabel("tasksLabel")}` }) : null
        ] })
      ]
    }
  );
}
function Axis({
  layout,
  showNow,
  tzOffsetMinutes
}) {
  const flipNowLabel = layout.nowX > layout.contentWidth - 60;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-axis", style: { height: DEFAULT_HEADER_HEIGHT, width: layout.contentWidth }, children: [
    layout.ticks.map((tick) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: tick.major ? "dtg-tick dtg-tick-major" : "dtg-tick",
        style: { left: tick.x },
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-tick-label", children: tick.label })
      },
      `tick:${tick.time}`
    )),
    showNow ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: "dtg-now-head",
        style: { left: layout.nowX, ...flipNowLabel ? { transform: "translateX(-100%)" } : {} },
        title: formatDateTime(layout.now, tzOffsetMinutes),
        children: `${uiLabel("nowLabel")} ${formatClock(layout.now, tzOffsetMinutes)}`
      }
    ) : null
  ] });
}
function SpanBar({ span }) {
  const classes = ["dtg-step"];
  if (span.kind === "turn") classes[0] = "dtg-turn";
  else if (span.open) classes.push("dtg-step-open", "dtg-span-open");
  const style = {
    left: span.x,
    top: span.y,
    width: span.w,
    height: span.h
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: classes.join(" "), style, title: spanTitle(span) });
}
function spanTitle(span) {
  const head = span.open ? `${span.kind} \xB7 ${uiLabel("spanOpen")}` : span.kind;
  const parts = [head];
  if (span.turn !== void 0) parts.push(`turn ${span.turn}`);
  if (span.step !== void 0) parts.push(`step ${span.step}`);
  return parts.join(" \xB7 ");
}
function TaskCard({
  rect,
  selected,
  onSelectTask,
  tzOffsetMinutes
}) {
  const task = rect.task;
  const selection = rect.live ? uiLabel("taskAriaLive") : uiLabel("taskAriaHistory", { from: formatDateTime(rect.at, tzOffsetMinutes) });
  const aria = uiLabel("taskAria", {
    subject: task.subject,
    status: statusText(task.status),
    anchor: selection
  });
  const full = `${task.subject}
${task.description}`;
  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectTask(selected ? null : task.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onSelectTask(null);
    }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "button",
    {
      type: "button",
      className: `dtg-task dtg-ink-${task.status}${rect.live ? " dtg-task-live" : ""}`,
      style: { left: rect.x, top: rect.y, width: rect.w, height: rect.h },
      title: full,
      "aria-label": aria,
      "aria-pressed": selected,
      onClick: () => onSelectTask(selected ? null : task.id),
      onKeyDown,
      "data-task-id": task.id,
      "data-task-anchor": rect.anchor,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-subject", children: task.subject === "" ? "\u2014" : task.subject }),
        task.description === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-desc", children: task.description }),
        rect.live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-flag", children: uiLabel("liveBadge") }) : null
      ]
    }
  );
}

// src/client/ui/styles.ts
var STYLE_ELEMENT_ID = "dsh-task-gantt-ui-style";
var BOARD_CSS = `
.dtg-root {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxs-12);
  -webkit-app-region: no-drag;
}
.dtg-root *, .dtg-root *::before, .dtg-root *::after { box-sizing: border-box; }

/* --- control bar ------------------------------------------------------- */
.dtg-bar {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: 0 0 auto;
  min-width: 0;
  padding: 4px 6px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  background: var(--dsw-alias-bg-layer-1);
  -webkit-app-region: no-drag;
}
.dtg-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  padding: 1px 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 9px;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dtg-chip-live {
  color: var(--dsw-alias-label-primary);
  border-color: var(--dsw-alias-brand-primary);
}
.dtg-chip-warn { color: var(--dsw-alias-state-warn-primary); border-color: var(--dsw-alias-state-warn-primary); }
.dtg-chip-error { color: var(--dsw-alias-state-error-primary); border-color: var(--dsw-alias-state-error-primary); }
.dtg-spacer { flex: 1 1 auto; min-width: 0; }
.dtg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 5px;
  background: transparent;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  cursor: pointer;
  -webkit-app-region: no-drag;
}
.dtg-btn:hover { background: var(--dsw-alias-interactive-bg-hover); color: var(--dsw-alias-label-primary); }
.dtg-btn:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-btn[aria-pressed='true'] { color: var(--dsw-alias-label-primary); border-color: var(--dsw-alias-brand-primary); }
.dtg-zoom-readout { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); white-space: nowrap; }

/* --- chart frame ------------------------------------------------------- */
.dtg-body {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  min-width: 0;
  position: relative;
}
.dtg-heads {
  flex: 0 0 auto;
  overflow: hidden;
  border-right: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  z-index: 4;
}
.dtg-heads-inner { will-change: transform; }
.dtg-head-corner {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 6px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  border-bottom: 1px solid var(--dsw-alias-border-l1);
}
.dtg-head-row {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 3px 6px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  overflow: hidden;
}
.dtg-head-row-idle { opacity: 0.72; }
.dtg-head-top { display: flex; align-items: center; gap: 4px; min-width: 0; }
.dtg-head-name {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxs-strong-12);
  color: var(--dsw-alias-label-primary);
}
.dtg-head-meta {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-head-meta-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dtg-head-role {
  flex: 0 0 auto;
  padding: 0 3px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 3px;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}

/* Status ink: the dot and the glyph take currentColor, so the colour rule
 * below is the single source of the status colour (never colour alone \u2014 the
 * row always carries the status WORD next to the dot too). */
.dtg-ink { color: var(--dsw-alias-label-tertiary); }
.dtg-ink-running { color: var(--dsw-alias-state-success-primary); }
.dtg-ink-idle { color: var(--dsw-alias-label-tertiary); }
.dtg-ink-provisioning { color: var(--dsw-alias-state-warn-primary); }
.dtg-ink-failed { color: var(--dsw-alias-state-error-primary); }
.dtg-ink-pending { color: var(--dsw-alias-label-tertiary); }
.dtg-ink-in_progress { color: var(--dsw-alias-brand-primary); }
.dtg-ink-completed { color: var(--dsw-alias-state-success-primary); }
.dtg-ink-deleted { color: var(--dsw-alias-label-dimmed); }
.dtg-dot {
  flex: 0 0 auto;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: currentColor;
}
.dtg-dot-ring { box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1); }
.dtg-glyph { flex: 0 0 auto; font: var(--dsw-font-xxxs-strong-11); }

/* --- timeline scroller ------------------------------------------------- */
.dtg-scroll {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  position: relative;
  overflow: auto;
  overscroll-behavior: contain;
}
.dtg-canvas { position: relative; }
.dtg-axis {
  position: sticky;
  top: 0;
  z-index: 3;
  background: var(--dsw-alias-bg-layer-1);
  border-bottom: 1px solid var(--dsw-alias-border-l2);
  overflow: hidden;
}
.dtg-tick { position: absolute; top: 0; bottom: 0; display: flex; align-items: center; }
.dtg-tick-label {
  padding: 0 3px;
  transform: translateX(1px);
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
}
.dtg-tick-major .dtg-tick-label { color: var(--dsw-alias-label-secondary); font: var(--dsw-font-xxxs-strong-11); }
.dtg-chart { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; min-width: 0; }
.dtg-layer { position: absolute; left: 0; top: 0; right: 0; bottom: 0; pointer-events: none; }
.dtg-lane-bg { position: absolute; left: 0; border-top: 1px solid var(--dsw-alias-border-l1); }
.dtg-lane-bg-alt { background: var(--dsw-alias-bg-layer-2); opacity: 0.5; }
.dtg-gridline { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--dsw-alias-border-l1); opacity: 0.6; }
.dtg-gridline-major { background: var(--dsw-alias-border-l2); opacity: 0.9; }

/* --- activity bars ----------------------------------------------------- */
.dtg-turn {
  position: absolute;
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-3);
  opacity: 0.75;
}
.dtg-step {
  position: absolute;
  border-radius: 2px;
  background: var(--dsw-alias-label-tertiary);
}
.dtg-step-open {
  background: var(--dsw-alias-brand-primary);
  background-image: repeating-linear-gradient(
    135deg,
    var(--dsw-alias-label-primary-inverted) 0 2px,
    transparent 2px 5px
  );
  animation: dtg-pulse 1.4s ease-in-out infinite;
}
.dtg-step-open.dtg-no-anim { animation: none; }
.dtg-span-open { outline: 1px dashed var(--dsw-alias-brand-primary); outline-offset: 1px; }
@keyframes dtg-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* --- task cards -------------------------------------------------------- */
.dtg-task {
  position: absolute;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 1px;
  padding: 2px 6px 2px 8px;
  margin: 0;
  text-align: left;
  border: 1px solid var(--dsw-alias-border-l2);
  border-left-width: 3px;
  border-left-color: currentColor;
  border-radius: 4px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
  overflow: hidden;
  font: var(--dsw-font-xxxs-11);
  -webkit-app-region: no-drag;
}
.dtg-task:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dtg-task:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-task[aria-pressed='true'] { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.dtg-task-live {
  border-style: dashed;
  border-left-style: solid;
  background: var(--dsw-alias-bg-layer-1);
}
/* Room for the live flag inside the subject line. */
.dtg-task-live .dtg-task-subject { padding-right: 22px; }
.dtg-task-subject {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxs-strong-12);
}
.dtg-task-desc {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-task-flag {
  position: absolute;
  top: 1px;
  right: 3px;
  padding: 0 3px;
  border-radius: 3px;
  border: 1px solid currentColor;
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1.3;
  pointer-events: none;
}

/* --- now marker -------------------------------------------------------- */
.dtg-now { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--dsw-alias-brand-primary); }
.dtg-now-head {
  position: absolute;
  top: 0;
  padding: 0 3px;
  transform: translateX(-50%);
  border-radius: 0 0 3px 3px;
  background: var(--dsw-alias-brand-primary);
  color: var(--dsw-alias-label-primary-inverted);
  font: var(--dsw-font-xxxs-strong-11);
  white-space: nowrap;
  pointer-events: none;
}

/* --- details / notices ------------------------------------------------- */
.dtg-details {
  flex: 0 0 auto;
  max-height: 45%;
  overflow: auto;
  padding: 6px 8px 8px;
  border-top: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-2);
}
.dtg-details-head { display: flex; align-items: flex-start; gap: 6px; }
.dtg-details-title { flex: 1 1 auto; min-width: 0; font: var(--dsw-font-s-strong-14); overflow-wrap: anywhere; }
.dtg-details-body { margin-top: 4px; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; white-space: pre-wrap; }
.dtg-kv { display: flex; gap: 6px; margin-top: 3px; }
.dtg-kv-key { flex: 0 0 auto; color: var(--dsw-alias-label-tertiary); }
.dtg-kv-val { flex: 1 1 auto; min-width: 0; color: var(--dsw-alias-label-secondary); overflow-wrap: anywhere; }
.dtg-code {
  display: block;
  margin: 2px 0 0;
  padding: 2px 4px;
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-3);
  color: var(--dsw-alias-label-secondary);
  font-family: var(--ds-font-family-code);
  font-size: 11px;
  overflow-wrap: anywhere;
}
.dtg-hist { margin: 4px 0 0; padding: 0; list-style: none; }
.dtg-hist li { display: flex; gap: 6px; color: var(--dsw-alias-label-secondary); }
.dtg-hist-time { flex: 0 0 auto; color: var(--dsw-alias-label-tertiary); font-family: var(--ds-font-family-code); }
.dtg-notice {
  flex: 0 0 auto;
  padding: 4px 8px;
  border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
.dtg-notice-error { color: var(--dsw-alias-state-error-primary); }
.dtg-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 100%;
  padding: 16px 12px;
  text-align: center;
  color: var(--dsw-alias-label-tertiary);
}
.dtg-center-title { color: var(--dsw-alias-label-primary); font: var(--dsw-font-s-14); }
.dtg-empty-lane { position: absolute; color: var(--dsw-alias-label-dimmed); font: var(--dsw-font-xxxs-11); white-space: nowrap; }
.dtg-legend { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; padding: 3px 6px; color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); }
.dtg-legend-item { display: inline-flex; align-items: center; gap: 3px; white-space: nowrap; }
.dtg-legend-turn { width: 14px; height: 8px; border-radius: 2px; background: var(--dsw-alias-bg-layer-3); opacity: 0.75; }
.dtg-legend-step { width: 14px; height: 6px; border-radius: 2px; background: var(--dsw-alias-label-tertiary); }
.dtg-legend-card { width: 14px; height: 9px; border: 1px dashed var(--dsw-alias-border-l2); border-left: 3px solid var(--dsw-alias-label-tertiary); border-radius: 3px; }
.dtg-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  border: 0;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
@media (prefers-reduced-motion: reduce) {
  .dtg-step-open { animation: none; }
}
/* A hidden tab keeps the last frame but stops animating. */
.dtg-paused .dtg-step-open { animation: none; }
`;

// src/client/ui/BoardView.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
var POLL_MS = 5e3;
var NOW_MS = 1e3;
var styleMounts = 0;
function useBoardStyles() {
  (0, import_react2.useEffect)(() => {
    if (typeof document === "undefined") return;
    let element = document.getElementById(STYLE_ELEMENT_ID);
    if (element === null) {
      element = document.createElement("style");
      element.id = STYLE_ELEMENT_ID;
      element.setAttribute("data-dsh-task-gantt", "");
      document.head.appendChild(element);
    }
    element.textContent = BOARD_CSS;
    styleMounts += 1;
    return () => {
      styleMounts -= 1;
      if (styleMounts <= 0) document.getElementById(STYLE_ELEMENT_ID)?.remove();
    };
  }, []);
}
function BoardView({ sessionId, visible, routeBase }) {
  const [data, setData] = (0, import_react2.useState)(null);
  const [error, setError] = (0, import_react2.useState)(null);
  const [now, setNow] = (0, import_react2.useState)(() => Date.now());
  const [reloadKey, setReloadKey] = (0, import_react2.useState)(0);
  const [selectedTaskId, setSelectedTaskId] = (0, import_react2.useState)(null);
  useBoardStyles();
  const routeBaseRef = (0, import_react2.useRef)(routeBase);
  routeBaseRef.current = routeBase;
  (0, import_react2.useEffect)(() => {
    if (!visible) return;
    let disposed = false;
    const controller = new AbortController();
    const load = async () => {
      try {
        const value = await fetchTimeline(sessionId, {
          signal: controller.signal,
          routeBase: routeBaseRef.current
        });
        if (disposed) return;
        setData(value);
        setError(null);
        setNow(Date.now());
      } catch (cause) {
        if (disposed || controller.signal.aborted) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    };
    void load();
    const timer = window.setInterval(() => {
      void load();
    }, POLL_MS);
    return () => {
      disposed = true;
      controller.abort();
      window.clearInterval(timer);
    };
  }, [sessionId, visible, reloadKey]);
  const live = data !== null && data.range.end === null;
  (0, import_react2.useEffect)(() => {
    if (!visible || !live) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), NOW_MS);
    return () => window.clearInterval(timer);
  }, [visible, live]);
  const selectedTask = (0, import_react2.useMemo)(() => {
    if (data === null || selectedTaskId === null) return null;
    const direct = data.tasks.find((task) => task.id === selectedTaskId);
    if (direct !== void 0) return direct;
    for (const lane of data.lanes) {
      const found = lane.tasks.find((task) => task.id === selectedTaskId);
      if (found !== void 0) return found;
    }
    return null;
  }, [data, selectedTaskId]);
  (0, import_react2.useEffect)(() => {
    if (selectedTaskId !== null && selectedTask === null && data !== null) setSelectedTaskId(null);
  }, [selectedTaskId, selectedTask, data]);
  const onSelectTask = (0, import_react2.useCallback)((taskId) => setSelectedTaskId(taskId), []);
  const retry = (0, import_react2.useCallback)(() => setReloadKey((key) => key + 1), []);
  if (data === null) {
    const failed = error !== null;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-root", "data-dsh-task-gantt": "", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-center", role: failed ? "alert" : void 0, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-center-title", children: failed ? t("errorTitle") : t("loading") }),
      failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: error }) : null,
      failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn", onClick: retry, children: t("retry") }) : null
    ] }) });
  }
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset();
  const sourceChip = data.source === "log" ? { className: "dtg-chip", text: t("sourceLog") } : { className: "dtg-chip dtg-chip-warn", text: data.source === "partial" ? t("sourcePartial") : t("sourceLive") };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-root", "data-dsh-task-gantt": "", children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: sourceChip.className, title: [t("sourceLog"), t("sourcePartial"), t("sourceLive")].join(" / "), children: sourceChip.text }),
      live ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip dtg-chip-live", children: uiLabel("nowLabel") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip", children: `${formatDateTime(data.range.start, tzOffsetMinutes)} \u2192 ${data.range.end === null ? "" : formatDateTime(data.range.end, tzOffsetMinutes)}` }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip", title: `${t("tabTitle")} \xB7 ${data.lanes.length}`, children: `${data.tasks.length} ${uiLabel("tasksLabel")}` }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn", onClick: retry, title: t("retry"), children: "\u27F3" })
    ] }),
    data.lanes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-center-title", children: t("emptyTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("emptyBody") }),
      error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-notice-error", children: error })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      GanttChart,
      {
        data,
        visible,
        now,
        selectedTaskId,
        onSelectTask
      }
    ),
    selectedTask === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      TaskDetails,
      {
        task: selectedTask,
        generatedAt: data.generatedAt,
        tzOffsetMinutes,
        onClose: () => setSelectedTaskId(null)
      }
    ),
    error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice dtg-notice-error", children: `${t("errorTitle")}: ${error}` }),
    data.failure === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice dtg-notice-error", children: `${uiLabel("failureLabel")}: ${data.failure}` }),
    data.notes.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice", title: data.notes.join("\n"), children: `${uiLabel("notesLabel")}: ${data.notes.join(" \xB7 ")}` })
  ] });
}
function TaskDetails({
  task,
  generatedAt,
  tzOffsetMinutes,
  onClose
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details", role: "region", "aria-label": uiLabel("detailsTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-details-title", children: task.subject }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn", onClick: onClose, title: uiLabel("close"), "aria-label": uiLabel("close"), children: "\u2715" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-details-body", children: task.description === "" ? "\u2014" : task.description }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: t("taskOwner") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: task.owner ?? t("unassigned") })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: uiLabel("laneLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: task.laneId })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: uiLabel("statusLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: `${taskStatusText(task.status)} \xB7 ${uiLabel("revisionLabel")} ${task.revision}` })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: t("taskReady") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: task.ready ? "\u2713" : "\u2717" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: t("taskBlockedBy") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: task.blockedBy.length === 0 ? uiLabel("blockedByNone") : task.blockedBy.map((id) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { className: "dtg-code", children: id }, id)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: t("taskWriteScopes") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: task.writeScopes.length === 0 ? uiLabel("scopesNone") : task.writeScopes.map((scope) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { className: "dtg-code", children: scope }, scope)) })
    ] }),
    task.writeScopeWarnings.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: uiLabel("notesLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: task.writeScopeWarnings.map((warning) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("code", { className: "dtg-code", children: warning }, warning)) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: uiLabel("historyLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "span",
        {
          className: "dtg-kv-val",
          title: `${uiLabel("historySource")} \xB7 ${formatDateTime(generatedAt, tzOffsetMinutes)}`,
          children: task.history.length === 0 ? uiLabel("noHistory") : `${task.history.length} \xB7 ${uiLabel("historySource")}`
        }
      )
    ] }),
    task.history.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("ul", { className: "dtg-hist", children: task.history.map((event, index) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("li", { children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-hist-time", children: formatDateTime(event.time, tzOffsetMinutes) }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: `${historyActionText(event.action)}${event.revision === void 0 ? "" : ` \xB7 r${event.revision}`} \xB7 ${event.sessionId}` })
    ] }, `${event.time}:${index}`)) })
  ] });
}

// src/client/index.ts
var name = "dsh-task-gantt";
var inject = [];
var SERVICE_NAME = "betterSidebar";
var TAB_ORDER = 50;
var TAB_EFFECT_LABEL = "dsh-task-gantt: sidebar tab";
injectPanelStyles();
function apply(ctx) {
  injectPanelStyles();
  const mounted = readTabService(ctx);
  if (mounted !== void 0) {
    ctx.effect(() => registerTab(ctx, mounted), TAB_EFFECT_LABEL);
    return;
  }
  const canWait = typeof ctx.inject === "function";
  if (!canWait) {
    warn(
      ctx,
      "dsh-task-gantt: no betterSidebar service and no ctx.inject on this context; the task Gantt tab cannot be registered"
    );
    return;
  }
  ctx.inject([SERVICE_NAME], (scoped) => {
    const service = readTabService(scoped);
    if (service === void 0) return;
    scoped.effect(() => registerTab(scoped, service), TAB_EFFECT_LABEL);
  });
  warn(
    ctx,
    "dsh-task-gantt: the betterSidebar service is not mounted; the task Gantt tab stays dormant until dsh-better-sidebar provides it"
  );
}
function readTabService(ctx) {
  const candidate = ctx.get(SERVICE_NAME);
  if (candidate === null || typeof candidate !== "object") return void 0;
  if (typeof candidate.registerTab !== "function") return void 0;
  return candidate;
}
function registerTab(ctx, service) {
  try {
    return service.registerTab({
      id: TAB_TYPE_ID,
      title: () => t("tabTitle"),
      description: () => t("tabDescription"),
      icon: (size) => (0, import_react3.createElement)(GanttGlyph, { size }),
      order: TAB_ORDER,
      // One board per plugin: reopening from the + menu focuses the open tab.
      // `single: true` is the documented sugar for `dedupeKey: () => id`, and the
      // guide (§4.1) gives an explicit `dedupeKey` precedence over `single`; both
      // are declared so the identity the host dedupes on is unambiguous.
      single: true,
      dedupeKey: () => TAB_TYPE_ID,
      // The host route is registered ABSOLUTE but the page may sit behind a
      // reverse-proxy sub-path or be served from `dsh-app://`; handing the board
      // the page's real transport base (via the mounted sidebar service) keeps
      // its fetches on the same prefix the DSH client itself uses. See
      // transport.ts for the verified host rule and the fallback chain.
      component: ({ scope, visible }) => (0, import_react3.createElement)(BoardView, {
        sessionId: scope.sessionId,
        visible,
        routeBase: (path) => resolveHostRoute(path, service)
      })
    });
  } catch (error) {
    warn(ctx, `dsh-task-gantt: could not register the "${TAB_TYPE_ID}" tab: ${describe(error)}`);
    return () => {
    };
  }
}
function GanttGlyph({ size }) {
  const bar = (key, x, y, width) => (0, import_react3.createElement)("rect", {
    key,
    x,
    y,
    width,
    height: 2.4,
    rx: 1.2,
    fill: "currentColor",
    stroke: "none"
  });
  return (0, import_react3.createElement)(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      "aria-hidden": true,
      focusable: false
    },
    bar("a", 1.8, 2.9, 6.4),
    bar("b", 4.4, 6.8, 9.4),
    bar("c", 6.4, 10.7, 5.4)
  );
}
function warn(ctx, message) {
  const logger = ctx.logger;
  if (typeof logger?.warn === "function") logger.warn(message);
  else if (typeof console !== "undefined") console.warn(message);
}
function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

return module.exports; } });
//# sourceMappingURL=client.js.map
