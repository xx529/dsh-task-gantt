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
var BUILD_LABEL = "v0.2.0 \xB7 tracks+peer-colour+message-body";
var TAB_TYPE_ID = "dsh-task-gantt:board";
var ROUTE_PREFIX = "/dsh-task-gantt/api";
var MESSAGE_PREVIEW_MAX = 16384;

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
  notes: "\u6570\u636E\u8BF4\u660E",
  openSession: "\u6253\u5F00\u8BE5\u4F1A\u8BDD",
  you: "\u4F60",
  noSession: "\u65E0\u4F1A\u8BDD\u53EF\u8DF3\u8F6C"
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
  notes: "Notes",
  openSession: "Open this session",
  you: "You",
  noSession: "No session to open"
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
   '[data-dsh-native-tab-host]' of height:100% (sidebar.module.css
   .nativeTabHost), so the root fills the pane with flex:1 + min-height:0.
   ':not(style)' keeps this rule off the injected <style> element itself, which
   carries the same marker attribute (a 'display' on a stylesheet tag renders its
   text when it is not parked in a 'display:none' head). */
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

/* A lane head the board can jump from to that lane's own session (task-9).
   The board applies this class only when a real navigation target exists
   (lane.navigation !== undefined), so cursor: pointer never promises a jump the
   host cannot make; a lane without a target keeps the plain arrow. The
   hover/focus tokens mirror the host's own affordances: hover uses the shared
   interactive surface, and the ring is byte-for-byte the host's focus treatment
   (dsh-better-sidebar/src/client/SideCardSection.module.css:145-148,274-277).
   NOTE: no backticks in these comments \u2014 this stylesheet is a JS template
   literal, so a stray backtick ends the string (learned the hard way). */
.dsh-task-gantt-lane-head-navigable {
  cursor: pointer;
  -webkit-app-region: no-drag;
}

.dsh-task-gantt-lane-head-navigable:hover {
  background: var(--dsw-alias-interactive-bg-hover);
}

.dsh-task-gantt-lane-head-navigable:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4);
  outline-offset: 2px;
}

/* Monospace (time ticks). Swaps ONLY the family, and deliberately uses
   font-family rather than the font: shorthand \u2014 a shorthand would reset the
   panel's inherited size/line-height. The family is --ds-font-family-code, the
   host's own code stack ("SF Mono", "JetBrains Mono", ... Menlo, monospace).
   Do NOT use --dsw-font-mono: it is not defined by the host theme (408 tokens in
   tests/fixtures/dsw-theme-tokens.json), and a var() naming an undefined custom
   property makes the WHOLE declaration invalid at computed-value time \u2014 the
   family would silently not apply AND the shorthand would additionally reset
   size/line-height. Legal-looking, invisible, and invisible to a colour scan. */
.dsh-task-gantt-mono {
  font-family: var(--ds-font-family-code);
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
  taskCreatedAt: "\u521B\u5EFA",
  messageSentTo: "\u53D1\u51FA \u2192",
  messageDetailTitle: "\u6D88\u606F\u8BE6\u60C5",
  messageSentMark: "\u53D1\u51FA",
  messageReceivedMark: "\u6536\u5230",
  messageWhenLabel: "\u65F6\u95F4",
  messageKindLabel: "\u7C7B\u578B",
  messageLaneLabel: "\u6240\u5728\u6CF3\u9053",
  messageNoBody: "\u65E0\u6B63\u6587",
  messageNoPeer: "\u672A\u77E5\u5BF9\u7AEF",
  messageTruncated: "\u6B63\u6587\u5DF2\u8FBE {max} \u5B57\u7B26\u4E0A\u9650\uFF0C\u5BBF\u4E3B\u53EF\u80FD\u5DF2\u622A\u65AD\uFF08\u6B64\u5904\u4E0D\u5047\u88C5\u5B8C\u6574\uFF09",
  messageReceivedFrom: "\u6536\u5230 \u2190",
  messagePeerUnknown: "\u5BF9\u7AEF\u4E0D\u5728\u672C\u770B\u677F\uFF08\u4E2D\u6027\u8272\uFF09",
  messageLegendSent: "\u53D1\u51FA",
  messageLegendReceived: "\u6536\u5230",
  taskFinishedAt: "\u5B8C\u6210",
  taskLastTransitionAt: "\u6700\u540E\u8FC1\u79FB",
  taskDuration: "\u65F6\u957F",
  taskDurationUnknown: "\u65F6\u957F\u672A\u77E5\uFF08\u5B9E\u65F6\uFF09",
  taskDurationLine: "{from} \u2192 {to}\uFF08{duration}\uFF09",
  taskDurationLineUnknown: "\u65F6\u957F\u672A\u77E5\uFF08\u5B9E\u65F6\uFF09",
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
  spinner: "\u8BFB\u53D6\u4E2D",
  endedLabel: "\u7ED3\u675F",
  frozenHint: "\u56E2\u961F\u5DF2\u5168\u90E8\u505C\u6B62\uFF1A\u65F6\u95F4\u8F74\u51BB\u7ED3\u5728\u6700\u540E\u4E00\u4E2A\u4E8B\u4EF6\uFF0C\u4E0D\u518D\u5411\u524D\u63A8\u8FDB",
  messageCountLabel: "{count} \u6761\u6D88\u606F",
  messageBandTitle: "{count} \u6761\u6D88\u606F\uFF0C\u4ECE {from} \u5230 {to}",
  messageLegendYou: "\u6211\u53D1\u8D77\uFF08\u6316\u7A7A+\u53CC\u8272\u73AF\uFF09",
  messageLegendTeammate: "teammate \u6D88\u606F\uFF08\u5B9E\u5FC3\uFF09",
  messageLegendHint: "\u6807\u8BB0\u989C\u8272 = \u5BF9\u7AEF\u7684\u6CF3\u9053\u8272\uFF08A \u7684\u6CF3\u9053\u91CC A\u2192B \u7528 B \u7684\u989C\u8272\uFF09\xB7 \u2197=\u53D1\u51FA \xB7 \u2199=\u6536\u5230 \xB7 \u5BF9\u7AEF\u662F\u4EBA\u65F6\u7528\u56FA\u5B9A\u7684\u53CC\u8272\u73AF\uFF1B\u7A7A\u9699\u5904 +N \u8868\u793A\u7701\u7565\u4E86 N \u6761\uFF0C\u4F4D\u7F6E\u4E0D\u52A8",
  messageModeBoth: "\u6D3B\u52A8+\u6D88\u606F",
  messageModeMarkers: "\u53EA\u770B\u6D88\u606F",
  messageModeHint: "\u5207\u6362\u662F\u5426\u663E\u793A turn/step \u6D3B\u52A8\u6761\uFF08\u53EA\u5F71\u54CD\u7ED8\u5236\uFF0C\u4E0D\u5F71\u54CD\u4EFB\u4F55\u65F6\u95F4\uFF09",
  messageOmitted: "\u6B64\u5904\u53E6\u6709 {count} \u6761\u672A\u7ED8\u5236",
  messageDropped: "{shown}/{total} \u6761\u6D88\u606F\u5DF2\u7ED8\u5236",
  messageDroppedHint: "\u6309\u50CF\u7D20\u95F4\u8DDD\u62BD\u7A00\uFF1B\u6BCF\u4E2A\u6807\u8BB0\u4ECD\u662F\u5B83\u81EA\u5DF1\u7684\u771F\u5B9E\u65F6\u95F4\uFF0C\u672A\u7ED8\u5236\u7684\u53EA\u88AB\u7701\u7565\u3001\u672A\u88AB\u632A\u52A8",
  messageAria: "{time}\uFF0C{route}\uFF0C{preview}",
  leadLabel: "Lead"
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
  taskCreatedAt: "created",
  messageSentTo: "sent to",
  messageDetailTitle: "Message details",
  messageSentMark: "sent",
  messageReceivedMark: "received",
  messageWhenLabel: "Time",
  messageKindLabel: "Kind",
  messageLaneLabel: "Lane",
  messageNoBody: "No body",
  messageNoPeer: "unknown peer",
  messageTruncated: "The body reached the {max}-character ceiling, so the host may have clipped it (not pretending otherwise here)",
  messageReceivedFrom: "received from",
  messagePeerUnknown: "counterpart is not on this board (neutral colour)",
  messageLegendSent: "sent",
  messageLegendReceived: "received",
  taskFinishedAt: "finished",
  taskLastTransitionAt: "last transition",
  taskDuration: "duration",
  taskDurationUnknown: "duration unknown (live)",
  taskDurationLine: "{from} \u2192 {to} ({duration})",
  taskDurationLineUnknown: "duration unknown (live)",
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
  spinner: "Loading",
  endedLabel: "ended",
  frozenHint: "Every member has stopped: the axis is frozen at the last event and no longer advances",
  messageCountLabel: "{count} messages",
  messageBandTitle: "{count} messages, {from} to {to}",
  messageLegendYou: "from me (hole + two-tone ring)",
  messageLegendTeammate: "teammate message (solid)",
  messageLegendHint: "the marker colour is the COUNTERPART lane colour (in A lane, A\u2192B uses B colour) \xB7 \u2197 = sent \xB7 \u2199 = received \xB7 a human counterpart uses the fixed two-tone ring; a +N in a gap means N more messages sit there, unmoved",
  messageModeBoth: "bars+messages",
  messageModeMarkers: "messages only",
  messageModeHint: "Toggle the turn/step bars (drawing only \u2014 no timestamp changes)",
  messageOmitted: "{count} more here, not drawn",
  messageDropped: "{shown}/{total} messages drawn",
  messageDroppedHint: "Thinned by pixel spacing; every marker keeps its own real time \u2014 omitted ones are never moved",
  messageAria: "{time}, {route}, {preview}",
  leadLabel: "Lead"
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
var DEFAULT_LANE_HEIGHT = 84;
var DEFAULT_HEADER_HEIGHT = 28;
var DEFAULT_TICK_COUNT = 6;
var LANE_PAD_Y = 3;
var TURN_BAND_HEIGHT = 10;
var STEP_BAR_HEIGHT = 8;
var ACTIVITY_TRACK_HEIGHT = TURN_BAND_HEIGHT;
var MESSAGE_TRACK_HEIGHT = 11;
var TRACK_GAP = 3;
var TASK_CARD_TOP = LANE_PAD_Y + ACTIVITY_TRACK_HEIGHT + TRACK_GAP + MESSAGE_TRACK_HEIGHT + TRACK_GAP;
var TASK_CARD_HEIGHT = 36;
var MIN_SPAN_PX = 2;
var TASK_BAR_MIN_WIDTH = MIN_SPAN_PX;
var TASK_BAR_HEIGHT = 10;
var TASK_BAR_TOP_OFFSET = (TASK_CARD_HEIGHT - TASK_BAR_HEIGHT) / 2;
var TASK_CHIP_GAP = 3;
var TASK_CHIP_WIDTH = 148;
var TASK_CHIP_INSIDE_MIN_WIDTH = TASK_CHIP_WIDTH;
var MIN_MS_PER_PX = 50;
var MAX_MS_PER_PX = 6e5;
var DEFAULT_MS_PER_PX = 1e3;
var MAX_TICKS = 400;
var MESSAGE_MARKER_MIN_GAP_PX = 9;
var MESSAGE_MARKER_WIDTH = 11;
var MESSAGE_MARKER_HEIGHT = 11;
var MESSAGE_MARKER_TOP = LANE_PAD_Y + ACTIVITY_TRACK_HEIGHT + TRACK_GAP;
var MESSAGE_MARKER_MAX = 40;
var MESSAGE_BAND_MIN_PX = 2;
var MESSAGE_BAND_HEIGHT = 2;
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
function isLiveBoard(data) {
  return data?.live !== false;
}
function computeWindow(data, now) {
  const fallback = num(now, 0);
  const rangeStart = num(data?.range?.start, fallback);
  const hasRangeEnd = typeof data?.range?.end === "number" && Number.isFinite(data.range.end);
  const rangeEnd = hasRangeEnd ? num(data?.range?.end, fallback) : null;
  const live = isLiveBoard(data);
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
    for (const message of lane.messages ?? []) {
      if (message === null || typeof message !== "object") continue;
      consider(message.time);
      consider(message.end);
    }
    for (const task of lane.tasks ?? []) {
      for (const event of task.history ?? []) consider(event.time);
    }
  }
  for (const task of data?.tasks ?? []) {
    for (const event of task.history ?? []) consider(event.time);
  }
  const start = rawStart;
  const endSource = live ? "now" : rangeEnd !== null ? "range" : "datum";
  const right = endSource === "now" ? Math.max(fallback, rawEnd) : endSource === "range" ? Math.max(rangeEnd ?? rawEnd, rawEnd) : rawEnd;
  const end = Math.max(right, start + 1);
  return { start, end, durationMs: end - start, live };
}
function decimateMarkers(list, input) {
  const gapPx = input.gapPx > 0 ? input.gapPx : MESSAGE_MARKER_MIN_GAP_PX;
  const maxPerLane = input.maxPerLane > 0 ? Math.floor(input.maxPerLane) : MESSAGE_MARKER_MAX;
  const msPerPx = input.msPerPx > 0 ? input.msPerPx : DEFAULT_MS_PER_PX;
  const candidates = [];
  for (let index = 0; index < list.length; index += 1) {
    const span = list[index];
    if (span === void 0 || span === null || typeof span !== "object") continue;
    if (!Number.isFinite(num(span.time, Number.NaN))) continue;
    if (input.mode === "both" && span.kind === "turn") continue;
    candidates.push(index);
  }
  const ordered = [...candidates].sort((a, b) => {
    const ta = num(list[a]?.time, 0);
    const tb = num(list[b]?.time, 0);
    return ta === tb ? a - b : ta - tb;
  });
  const spanPx = Math.max(0, (input.widthPx > 0 ? input.widthPx : 0) || 0);
  const bucketSizePx = Math.max(gapPx, spanPx > 0 ? spanPx / Math.max(1, Math.ceil(spanPx / gapPx)) : gapPx);
  const bucketCount = spanPx > 0 ? Math.max(1, Math.ceil(spanPx / bucketSizePx)) : 1;
  const kept = [];
  const usedBuckets = /* @__PURE__ */ new Set();
  const lastXByKind = /* @__PURE__ */ new Map();
  const kindOf = (span) => {
    if (input.laneId === void 0 || input.laneIdOf === void 0) return "any";
    return resolveMessageDirection(span, input.laneId, input.laneIdOf).direction;
  };
  for (const index of ordered) {
    if (kept.length >= maxPerLane) break;
    const span = list[index];
    if (span === void 0) continue;
    const x = (num(span.time, input.windowStart) - input.windowStart) / msPerPx;
    const bucket = spanPx > 0 ? clamp(Math.floor(x / bucketSizePx), 0, bucketCount - 1) : 0;
    const kind = kindOf(span);
    const bucketKey = `${kind}#${bucket}`;
    if (usedBuckets.has(bucketKey)) continue;
    const lastX = lastXByKind.get(kind);
    if (lastX !== void 0 && x - lastX < gapPx) continue;
    usedBuckets.add(bucketKey);
    kept.push(index);
    lastXByKind.set(kind, x);
  }
  const directionsWithData = new Set(ordered.map((index) => {
    const span = list[index];
    return span === void 0 ? "any" : kindOf(span);
  }));
  const directionsKept = new Set(kept.map((index) => {
    const span = list[index];
    return span === void 0 ? "any" : kindOf(span);
  }));
  for (const kind of directionsWithData) {
    if (directionsKept.has(kind) || kept.length >= maxPerLane) continue;
    const fallback = ordered.find((index) => {
      const span = list[index];
      return span !== void 0 && kindOf(span) === kind;
    });
    if (fallback !== void 0) {
      kept.push(fallback);
      directionsKept.add(kind);
    }
  }
  return { indices: kept.sort((a, b) => a - b), droppedTotal: candidates.length - kept.length, candidates: candidates.length };
}
function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) return "";
  const total = Math.floor(ms / 1e3);
  const seconds = total % 60;
  const minutes = Math.floor(total / 60) % 60;
  const hours = Math.floor(total / 3600);
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
function taskDurationLine(task, formatTime, texts) {
  const history = task.history ?? [];
  const created = history[0]?.time;
  const last = history[history.length - 1]?.time;
  if (created === void 0 || last === void 0 || history.length === 0) {
    return { from: "", to: "", duration: "", label: texts.unknown, text: texts.unknown, known: false };
  }
  const elapsed = Math.max(0, last - created);
  const from = formatTime(created);
  const to = formatTime(last);
  const duration = formatDuration(elapsed);
  const label = task.status === "completed" ? texts.finished : texts.lastTransition;
  return {
    from,
    to,
    duration,
    label,
    text: texts.line.replace("{from}", from).replace("{to}", `${label} ${to}`).replace("{duration}", duration),
    known: true
  };
}
function resolveMessageDirection(message, laneId, laneIdOf) {
  const fromId = message.from?.id ?? "";
  const toId = message.to?.id ?? "";
  const fromLane = fromId === "" ? null : laneIdOf(fromId);
  const toLane = toId === "" ? null : laneIdOf(toId);
  const selfIsSender = fromLane !== null && fromLane === laneId;
  const selfIsReceiver = toLane !== null && toLane === laneId;
  const outgoing = selfIsSender && !selfIsReceiver;
  const noAddressee = message.to === void 0 || message.to === null;
  let peer;
  if (noAddressee) {
    peer = selfIsSender ? void 0 : message.from;
  } else {
    peer = outgoing ? message.to : message.from;
  }
  const peerKind = peer?.kind ?? (outgoing ? "teammate" : "system");
  const peerName = peer?.name !== void 0 && peer.name !== "" ? peer.name : peer?.id ?? "";
  const peerLaneId = peer === void 0 || peer.id === "" ? null : laneIdOf(peer.id);
  return {
    direction: outgoing ? "outgoing" : "incoming",
    peerLaneId,
    peerKind,
    peerName,
    peerMatched: peer !== void 0 && (peerKind === "user" || peerLaneId !== null)
  };
}
function messageMarkerPaint(message, laneId, laneColors, laneIdOf, userPaint, systemPaint) {
  const resolved = resolveMessageDirection(message, laneId, laneIdOf);
  const isUser = resolved.peerKind === "user";
  const isSystem = resolved.peerKind === "system";
  const peerPaint = resolved.peerLaneId === null ? void 0 : laneColors.get(resolved.peerLaneId);
  const ownPaint = laneColors.get(laneId);
  const noAddressee = message.to === void 0 || message.to === null;
  const own = isUser && resolved.peerMatched ? userPaint : resolved.peerMatched && peerPaint !== void 0 ? peerPaint : noAddressee && !isSystem && ownPaint !== void 0 ? ownPaint : systemPaint;
  return {
    paint: own,
    direction: resolved.direction,
    peerName: resolved.peerName,
    peerLaneId: resolved.peerLaneId,
    peerMatched: resolved.peerMatched,
    isUser
  };
}
function messageDetail(input, texts, formatTime, previewMax = MESSAGE_PREVIEW_MAX) {
  const marker = input;
  const body = marker.preview ?? "";
  const isUser = marker.from.kind === "user";
  const fromName = isUser ? texts.you : marker.from.name !== "" ? marker.from.name : marker.from.id;
  const toName = marker.to === void 0 ? texts.peerFallback : marker.to.name !== "" && marker.to.name !== void 0 ? marker.to.name : marker.to.id;
  return {
    route: `${fromName} \u2192 ${toName}`,
    fromName,
    toName,
    direction: marker.direction,
    when: formatTime(marker.time),
    kind: marker.kind,
    body,
    hasBody: body !== "",
    maybeTruncated: body.length >= previewMax
    // The direction-specific arrow form (`B ← A`) is built by the renderer from
    // `route` + `direction`, so both languages can order the arrow correctly.
  };
}
function speakerLaneMapper(lanes) {
  const lanesById = new Set(lanes.map((lane) => lane.id));
  const bySessionId = /* @__PURE__ */ new Map();
  for (const lane of lanes) {
    const navigation = lane.navigation;
    const sessionId = navigation === void 0 ? void 0 : navigation.type === "session" ? navigation.value : navigation.value?.sessionId;
    if (typeof sessionId === "string" && sessionId !== "") bySessionId.set(sessionId, lane.id);
  }
  return (speakerId) => lanesById.has(speakerId) ? speakerId : bySessionId.get(speakerId) ?? null;
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
  const lanesById = new Set(lanesInput.map((lane) => lane.id));
  const laneBySessionId = /* @__PURE__ */ new Map();
  for (const lane of lanesInput) {
    const navigation = lane.navigation;
    const sessionId = navigation === void 0 ? void 0 : navigation.type === "session" ? navigation.value : navigation.value?.sessionId;
    if (typeof sessionId === "string" && sessionId !== "") laneBySessionId.set(sessionId, lane.id);
  }
  const speakerToLane = (speakerId) => lanesById.has(speakerId) ? speakerId : laneBySessionId.get(speakerId) ?? null;
  const messageMode = options.messageMode === "markers" ? "markers" : "both";
  const gapPx = num(options.messageMinGapPx, MESSAGE_MARKER_MIN_GAP_PX);
  const maxPerLane = num(options.messageMaxPerLane, MESSAGE_MARKER_MAX);
  const messages = [];
  const messageBands = [];
  let messageCount = 0;
  let droppedTotal = 0;
  for (let index = 0; index < lanesInput.length; index += 1) {
    const lane = lanesInput[index];
    if (lane === void 0) continue;
    const list = (lane.messages ?? []).filter(
      (entry) => entry !== null && typeof entry === "object"
    );
    if (list.length === 0) continue;
    const laneY = headerHeight + index * laneHeight;
    let firstTime = Number.POSITIVE_INFINITY;
    let lastTime = Number.NEGATIVE_INFINITY;
    for (const message of list) {
      const time = num(message?.time, Number.NaN);
      if (!Number.isFinite(time)) continue;
      if (time < firstTime) firstTime = time;
      if (time > lastTime) lastTime = time;
    }
    if (Number.isFinite(firstTime) && Number.isFinite(lastTime)) {
      const x0 = clamp(firstTime, win.start, win.end);
      const x1 = clamp(lastTime, win.start, win.end);
      const x = (x0 - win.start) / msPerPx;
      const w = Math.max(MESSAGE_BAND_MIN_PX, (x1 - x0) / msPerPx);
      const viewX = x - scrollLeft;
      const band = {
        laneId: lane.id,
        laneIndex: index,
        firstTime,
        lastTime,
        count: list.length,
        x,
        y: laneY + laneHeight - MESSAGE_BAND_HEIGHT - 1,
        w,
        h: MESSAGE_BAND_HEIGHT,
        viewX,
        visible: x + w >= 0 && x <= width
      };
      if (!cull || band.visible) messageBands.push(band);
    }
    const kept = decimateMarkers(list, {
      windowStart: win.start,
      msPerPx,
      widthPx: dataWidth,
      mode: messageMode,
      gapPx,
      maxPerLane,
      laneId: lane.id,
      laneIdOf: speakerToLane
    });
    let previousCandidate = -1;
    for (const keptIndex of kept.indices) {
      const message = list[keptIndex];
      if (message === void 0) continue;
      const droppedBefore = countCandidatesBetween(list, previousCandidate, keptIndex, messageMode);
      previousCandidate = keptIndex;
      const time = num(message.time, win.start);
      const x = (clamp(time, win.start, win.end) - win.start) / msPerPx;
      const viewX = x - scrollLeft;
      const rect = {
        laneId: lane.id,
        laneIndex: index,
        kind: message.kind,
        direction: resolveMessageDirection(message, lane.id, speakerToLane).direction,
        time,
        end: typeof message.end === "number" && Number.isFinite(message.end) ? message.end : null,
        from: message.from,
        to: message.to,
        preview: message.preview,
        key: message.messageId ?? `${lane.id}:${message.kind}:${time}:${keptIndex}`,
        messageIndex: keptIndex,
        droppedBefore,
        x,
        y: laneY + MESSAGE_MARKER_TOP,
        w: MESSAGE_MARKER_WIDTH,
        h: MESSAGE_MARKER_HEIGHT,
        viewX,
        visible: x + MESSAGE_MARKER_WIDTH >= 0 && x <= width
      };
      if (!cull || rect.visible) messages.push(rect);
    }
    messageCount += kept.candidates;
    droppedTotal += kept.droppedTotal;
  }
  const endSource = win.live ? "now" : typeof data?.range?.end === "number" && Number.isFinite(data.range.end) ? "range" : "datum";
  const endTime = win.live ? now : win.end;
  const endMarkerTime = clamp(endTime, win.start, win.end);
  const endMarkerX = (endMarkerTime - win.start) / msPerPx;
  const endMarkerViewX = endMarkerX - scrollLeft;
  const endMarker = {
    time: endMarkerTime,
    kind: win.live ? "now" : "ended",
    x: endMarkerX,
    viewX: endMarkerViewX,
    visible: endMarkerViewX >= 0 && endMarkerViewX <= width
  };
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
    messages,
    messageBands,
    ticks,
    endSource,
    endMarker,
    messageCount,
    droppedMessageCount: droppedTotal,
    now,
    nowX: endMarkerX,
    nowViewX: endMarkerViewX,
    nowVisible: endMarker.visible,
    tzOffsetMinutes,
    truncatedTicks: truncated,
    unplacedTaskIds
  };
}
function countCandidatesBetween(list, fromExclusive, toExclusive, mode) {
  let count = 0;
  for (let index = fromExclusive + 1; index < toExclusive; index += 1) {
    const span = list[index];
    if (span === void 0) continue;
    if (mode === "both" && span.kind === "turn") continue;
    count += 1;
  }
  return count;
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
  let w = TASK_BAR_MIN_WIDTH;
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
    w = Math.max(TASK_BAR_MIN_WIDTH, (x1 - x0) / msPerPx);
  } else {
    x = Math.max(0, win.durationMs / msPerPx - TASK_CHIP_WIDTH);
    w = TASK_BAR_MIN_WIDTH;
  }
  const viewX = x - scrollLeft;
  const labelPlacement = anchor === "history" && w >= TASK_CHIP_INSIDE_MIN_WIDTH ? "inside" : "right";
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
    // `h` stays the CARD box; the bar carries its own height, so "the bar became
    // a 36px blob again" is a red test rather than a silent regression.
    h: TASK_CARD_HEIGHT,
    barY: laneY + TASK_CARD_TOP + TASK_BAR_TOP_OFFSET,
    barH: TASK_BAR_HEIGHT,
    viewX,
    visible: viewX + w >= 0 && viewX <= viewportWidth,
    live: anchor === "live",
    labelPlacement,
    labelX: labelPlacement === "inside" ? x : x + w + TASK_CHIP_GAP,
    labelY: laneY + TASK_CARD_TOP,
    labelW: labelPlacement === "inside" ? w : TASK_CHIP_WIDTH,
    labelH: TASK_CARD_HEIGHT
  };
}

// src/client/ui/GanttChart.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ZOOM_STEP = 1.5;
function lanePaint(token) {
  const name2 = token.trim();
  if (name2 === "") return "currentColor";
  return name2.startsWith("var(") ? name2 : `var(${name2})`;
}
var LANE_COLOR_FALLBACKS = [
  { bar: "--dsw-alias-brand-primary", on: "--dsw-alias-label-primary-inverted" },
  { bar: "--dsw-alias-state-success-primary", on: "--dsw-alias-label-primary-inverted" },
  { bar: "--dsw-alias-state-warn-primary", on: "--dsw-alias-label-primary-inverted" },
  { bar: "--dsw-alias-state-error-primary", on: "--dsw-alias-label-primary-inverted" },
  { bar: "--dsw-alias-state-business-primary", on: "--dsw-alias-label-primary-inverted" },
  { bar: "--dsw-alias-state-idle-primary", on: "--dsw-alias-label-primary-inverted" }
];
var USER_COLOR = {
  bar: "--dsw-alias-bg-layer-1",
  on: "--dsw-alias-label-primary"
};
var SYSTEM_COLOR = {
  bar: "--dsw-alias-label-dimmed",
  on: "--dsw-alias-label-primary"
};
var UR_MARKER_RING_TOKENS = [
  "--dsw-alias-label-primary",
  "--dsw-alias-label-primary-inverted"
];
function laneColor(lane, index) {
  const given = lane.color;
  if (given !== void 0 && typeof given.bar === "string" && given.bar !== "") {
    return { bar: lanePaint(given.bar), on: lanePaint(given.on ?? "--dsw-alias-label-primary-inverted") };
  }
  const pick = (index0) => {
    const entry = LANE_COLOR_FALLBACKS[index0 % LANE_COLOR_FALLBACKS.length];
    return { bar: lanePaint(entry.bar), on: lanePaint(entry.on) };
  };
  if (lane.role === "lead") return pick(0);
  if (lane.id === "unassigned" || lane.role === "unknown") return pick(LANE_COLOR_FALLBACKS.length - 1);
  let hash = 0;
  for (let i = 0; i < lane.id.length; i += 1) hash = hash * 31 + lane.id.charCodeAt(i) >>> 0;
  return pick(1 + hash % (LANE_COLOR_FALLBACKS.length - 1));
}
function GanttChart(props) {
  const { data, now, visible, selectedTaskId, onSelectTask, navigate, selectedMessageKey, onSelectMessage } = props;
  const scrollRef = (0, import_react.useRef)(null);
  const frameRef = (0, import_react.useRef)(0);
  const pendingScrollLeft = (0, import_react.useRef)(null);
  const [viewport, setViewport] = (0, import_react.useState)({ width: 0, height: 0 });
  const [scroll, setScroll] = (0, import_react.useState)({ left: 0, top: 0 });
  const [msPerPx, setMsPerPx] = (0, import_react.useState)(null);
  const [messageMode, setMessageMode] = (0, import_react.useState)("both");
  const win = (0, import_react.useMemo)(() => computeWindow(data, now), [data, now]);
  const live = data.live !== false;
  const effectiveMsPerPx = msPerPx ?? fitMsPerPx(win.durationMs, Math.max(1, viewport.width));
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset();
  const laneColors = (0, import_react.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    data.lanes.forEach((lane, index) => map.set(lane.id, laneColor(lane, index)));
    return map;
  }, [data]);
  const laneIdOf = (0, import_react.useMemo)(() => speakerLaneMapper(data.lanes), [data]);
  const markerCount = data.lanes.reduce((total, lane) => total + (lane.messages?.length ?? 0), 0);
  const userPaint = (0, import_react.useMemo)(() => ({ bar: lanePaint(USER_COLOR.bar), on: lanePaint(USER_COLOR.on) }), []);
  const systemPaint = (0, import_react.useMemo)(() => ({ bar: lanePaint(SYSTEM_COLOR.bar), on: lanePaint(SYSTEM_COLOR.on) }), []);
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
        cull: true,
        messageMode
      }
    ),
    [data, now, effectiveMsPerPx, viewport.width, viewport.height, scroll.left, scroll.top, messageMode]
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
  const endMarker = layout.endMarker;
  const chartAria = `${uiLabel("chartAria", {
    lanes: layout.lanes.length,
    tasks: layout.tasks.length,
    from: formatDateTime(win.start, tzOffsetMinutes),
    to: formatDateTime(win.end, tzOffsetMinutes)
  })}${live ? "" : `, ${uiLabel("frozenHint")}`}`;
  const drawnPerLane = (box) => box.lane.tasks.length;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: ["dtg-chart", visible ? "" : "dtg-paused", live ? "" : "dtg-frozen"].filter(Boolean).join(" "),
      role: "group",
      "aria-label": chartAria,
      "data-dsh-task-gantt": "",
      "data-dtg-live": live ? "true" : "false",
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
                    drawnTasks: drawnPerLane(lane),
                    color: laneColors.get(lane.laneId),
                    navigate
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
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Axis, { layout, tzOffsetMinutes, live }),
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
                      layout.messageBands.map((band) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "span",
                        {
                          className: "dtg-msg-band",
                          style: {
                            left: band.x,
                            top: band.y,
                            width: band.w,
                            height: band.h,
                            background: laneColors.get(band.laneId)?.bar
                          },
                          title: uiLabel("messageBandTitle", {
                            count: band.count,
                            from: formatClock(band.firstTime, tzOffsetMinutes),
                            to: formatClock(band.lastTime, tzOffsetMinutes)
                          })
                        },
                        `band:${band.laneId}`
                      )),
                      layout.spans.map(
                        (span, index) => span.kind === "turn" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpanBar, { span, color: laneColors.get(span.laneId) }, `turn:${index}:${spanKey(span)}`) : null
                      ),
                      layout.spans.map(
                        (span, index) => span.kind === "step" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SpanBar, { span, color: laneColors.get(span.laneId) }, `step:${index}:${spanKey(span)}`) : null
                      ),
                      layout.messages.map((marker) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        MessageMarker,
                        {
                          marker,
                          paint: markerPaint(marker, laneColors, laneIdOf, userPaint, systemPaint),
                          selected: marker.key === selectedMessageKey,
                          onSelect: onSelectMessage,
                          tzOffsetMinutes
                        },
                        `msg:${marker.key}`
                      )),
                      endMarker !== null && endMarker.visible ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "span",
                        {
                          className: live ? "dtg-now" : "dtg-now dtg-now-ended",
                          style: { left: endMarker.x }
                        }
                      ) : null
                    ] }),
                    layout.tasks.map((rect) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                      TaskCard,
                      {
                        rect,
                        selected: rect.task.id === selectedTaskId,
                        onSelectTask,
                        tzOffsetMinutes,
                        color: laneColors.get(rect.laneId)
                      },
                      `${rect.task.id}@${rect.laneIndex}`
                    )),
                    layout.lanes.map(
                      (lane) => lane.lane.spans.length === 0 && lane.lane.tasks.length === 0 && (lane.lane.messages?.length ?? 0) === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
          markerCount === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
            "button",
            {
              type: "button",
              className: "dtg-btn",
              onClick: () => setMessageMode((mode) => mode === "both" ? "markers" : "both"),
              title: uiLabel("messageModeHint"),
              "aria-pressed": messageMode === "markers",
              children: messageMode === "markers" ? uiLabel("messageModeMarkers") : uiLabel("messageModeBoth")
            }
          ),
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
          markerCount === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", title: uiLabel("messageLegendHint"), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-arrow", "aria-hidden": "true", children: "\u2197" }),
              uiLabel("messageLegendSent")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", title: uiLabel("messageLegendHint"), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-arrow", "aria-hidden": "true", children: "\u2199" }),
              uiLabel("messageLegendReceived")
            ] }),
            layout.droppedMessageCount === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-item", title: uiLabel("messageDroppedHint"), children: uiLabel("messageDropped", {
              shown: layout.messages.length,
              total: layout.messageCount
            }) })
          ] }),
          live ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-item", title: uiLabel("frozenHint"), children: uiLabel("endedLabel") }),
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
  drawnTasks,
  color,
  navigate
}) {
  const lane = box.lane;
  const status = lane.status ?? "idle";
  const ink = `dtg-ink dtg-ink-${status}`;
  const spans = lane.spans.length;
  const messages = lane.messages?.length ?? 0;
  const navigation = lane.navigation;
  const navigable = navigation !== void 0 && navigate !== void 0;
  const aria = navigable ? `${uiLabel("laneAria", { name: lane.name, status: statusText(status), tasks: drawnTasks, spans })}, ${t("openSession")}` : uiLabel("laneAria", { name: lane.name, status: statusText(status), tasks: drawnTasks, spans });
  const detail = [
    lane.name,
    statusText(status),
    lane.model ?? "",
    lane.createdAt === void 0 ? "" : formatDateTime(lane.createdAt, tzOffsetMinutes),
    lane.error ?? "",
    messages > 0 ? uiLabel("messageCountLabel", { count: messages }) : "",
    navigable ? t("openSession") : t("noSession")
  ].filter((part) => part !== "").join(" \xB7 ");
  const rowStyle = {
    height: box.height,
    ...color === void 0 ? {} : { borderLeftColor: color.bar }
  };
  const body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-head-top", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ink, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-dot", style: color === void 0 ? void 0 : { background: color.bar } }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-name", title: lane.name, children: lane.name }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ink, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-glyph", children: STATUS_GLYPH[status] ?? "\xB7" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-head-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: `dtg-head-role ${ink}`, children: roleText(lane.role) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-meta-text", children: statusText(status) }),
      drawnTasks > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-meta-text", children: `${drawnTasks} ${uiLabel("tasksLabel")}` }) : null,
      messages > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-meta-text", title: uiLabel("messageBandTitle", { count: messages, from: "", to: "" }), children: `\u2709 ${messages}` }) : null
    ] })
  ] });
  const rowClass = status === "idle" ? "dtg-head-row dtg-head-row-idle" : "dtg-head-row";
  if (!navigable || navigation === void 0) {
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: rowClass, style: rowStyle, role: "listitem", "aria-label": aria, title: detail, children: body });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: rowClass, style: rowStyle, role: "listitem", "aria-label": aria, title: detail, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "button",
    {
      type: "button",
      className: "dsh-task-gantt-lane-head-navigable dtg-head-btn",
      style: { height: box.height - 2 },
      title: detail,
      "aria-label": `${lane.name}: ${t("openSession")}`,
      onClick: () => {
        try {
          navigate(navigation);
        } catch {
        }
      },
      children: body
    }
  ) });
}
function Axis({
  layout,
  tzOffsetMinutes,
  live
}) {
  const marker = layout.endMarker;
  const flipLabel = marker !== null && marker.x > layout.contentWidth - 60;
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
    marker === null || !marker.visible ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: live ? "dtg-now-head" : "dtg-now-head dtg-now-head-ended",
        style: { left: marker.x, ...flipLabel ? { transform: "translateX(-100%)" } : {} },
        title: live ? formatDateTime(marker.time, tzOffsetMinutes) : `${uiLabel("endedLabel")} ${formatDateTime(marker.time, tzOffsetMinutes)}`,
        children: live ? `${uiLabel("nowLabel")} ${formatClock(marker.time, tzOffsetMinutes)}` : `${uiLabel("endedLabel")} ${formatClock(marker.time, tzOffsetMinutes)}`
      }
    )
  ] });
}
function SpanBar({ span, color }) {
  const classes = ["dtg-step"];
  if (span.kind === "turn") classes[0] = "dtg-turn";
  else if (span.open) classes.push("dtg-step-open", "dtg-span-open");
  const style = {
    left: span.x,
    top: span.y,
    width: span.w,
    height: span.h,
    ...color === void 0 ? {} : { background: color.bar }
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
function markerPaint(marker, laneColors, laneIdOf, userPaint, systemPaint) {
  const resolved = messageMarkerPaint(
    {
      kind: marker.kind,
      time: marker.time,
      end: marker.end,
      from: marker.from,
      to: marker.to,
      preview: marker.preview,
      sessionId: marker.from.id
    },
    marker.laneId,
    laneColors,
    laneIdOf,
    userPaint,
    systemPaint
  );
  return {
    paint: resolved.paint,
    direction: resolved.direction,
    peerName: resolved.peerName,
    peerMatched: resolved.peerMatched,
    isUser: resolved.isUser
  };
}
function MessageMarker({
  marker,
  paint,
  tzOffsetMinutes,
  selected,
  onSelect
}) {
  const color = paint.paint;
  const outgoing = paint.direction === "outgoing";
  const isUser = paint.isUser;
  const classes = ["dtg-msg", isUser ? "dtg-msg-user" : "dtg-msg-agent", outgoing ? "dtg-msg-out" : "dtg-msg-in"];
  if (marker.kind === "turn") classes.push("dtg-msg-turn");
  if (selected) classes.push("dtg-msg-active");
  const when = formatDateTime(marker.time, tzOffsetMinutes);
  const route = outgoing ? `${uiLabel("messageSentTo")} ${paint.peerName}` : `${uiLabel("messageReceivedFrom")} ${paint.peerName}`;
  const peerNote = paint.peerMatched ? "" : ` \xB7 ${uiLabel("messagePeerUnknown")}`;
  const dropped = marker.droppedBefore > 0 ? ` \xB7 ${uiLabel("messageOmitted", { count: marker.droppedBefore })}` : "";
  const label = uiLabel("messageAria", { time: when, route, preview: marker.preview ?? "" });
  const style = {
    left: marker.x,
    top: marker.y,
    width: marker.w,
    height: marker.h,
    ...color === void 0 ? {} : { background: color.bar },
    // Two layers are what make the human's dot legible on BOTH skins (the fill is
    // deliberately the surface colour): whichever skin is active, one of the two
    // rings contrasts with the surface. Also a class-level rule; this inline copy
    // exists so a culled render still carries it.
    ...isUser ? { boxShadow: `0 0 0 2px var(${UR_MARKER_RING_TOKENS[0]}), 0 0 0 3.5px var(${UR_MARKER_RING_TOKENS[1]})` } : {}
  };
  const interactive = typeof onSelect === "function";
  const Tag = interactive ? "button" : "span";
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    Tag,
    {
      ...interactive ? { type: "button", onClick: () => onSelect(selected ? null : marker.key), "aria-pressed": selected } : {},
      className: classes.join(" "),
      style,
      title: `${when} \xB7 ${route}${peerNote}${dropped}`,
      "aria-label": label,
      "data-msg-kind": marker.kind,
      "data-msg-direction": paint.direction,
      "data-msg-peer": paint.peerName,
      "data-msg-key": marker.key,
      "data-msg-from": marker.from.id,
      ...marker.to === void 0 ? {} : { "data-msg-to": marker.to.id },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-msg-glyph", "aria-hidden": "true", children: marker.kind === "turn" ? "\u25B8" : outgoing ? "\u2197" : "\u2199" }),
        marker.droppedBefore > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-msg-count", "aria-hidden": "true", children: `+${marker.droppedBefore}` }) : null
      ]
    }
  );
}
function TaskCard({
  rect,
  selected,
  onSelectTask,
  tzOffsetMinutes,
  color
}) {
  const task = rect.task;
  const selection = rect.live ? uiLabel("taskAriaLive") : uiLabel("taskAriaHistory", { from: formatDateTime(rect.at, tzOffsetMinutes) });
  const aria = uiLabel("taskAria", {
    subject: task.subject,
    status: statusText(task.status),
    anchor: selection
  });
  const elapsed = taskDurationLine(task, (time) => formatDateTime(time, tzOffsetMinutes), {
    created: uiLabel("taskCreatedAt"),
    finished: uiLabel("taskFinishedAt"),
    lastTransition: uiLabel("taskLastTransitionAt"),
    duration: uiLabel("taskDuration"),
    unknown: uiLabel("taskDurationUnknown"),
    line: uiLabel("taskDurationLine")
  });
  const full = `${task.subject}
${task.description}${elapsed.known ? `
${elapsed.from} \u2192 ${elapsed.label} ${elapsed.to} (${elapsed.duration})` : `
${elapsed.text}`}`;
  const onKeyDown = (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelectTask(selected ? null : task.id);
    } else if (event.key === "Escape") {
      event.preventDefault();
      onSelectTask(null);
    }
  };
  const labelStyle = {
    left: rect.labelX,
    top: rect.labelY,
    width: rect.labelW,
    height: rect.labelH,
    ...color === void 0 ? {} : { borderLeftColor: color.bar }
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-task-wrap", "data-task-id": task.id, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: `dtg-task-bar dtg-task-bar-${rect.anchor}${rect.live ? " dtg-task-bar-live" : ""}`,
        style: {
          left: rect.x,
          // Centred inside the card box, at TASK_BAR_HEIGHT tall — a bar, not a
          // 36px blob (that is what read as "a colour chip floating by the text").
          top: rect.barY,
          width: rect.w,
          height: rect.barH,
          ...color === void 0 ? {} : { background: color.bar }
        },
        "aria-hidden": "true"
      }
    ),
    rect.labelPlacement === "right" && !rect.live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: "dtg-task-anchor",
        style: { left: rect.x + rect.w, top: rect.y + rect.h / 2, width: Math.max(TASK_CHIP_GAP, rect.labelX - (rect.x + rect.w)) },
        "aria-hidden": "true"
      }
    ) : null,
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        type: "button",
        className: `dtg-task dtg-ink-${task.status}${rect.live ? " dtg-task-live" : ""}${rect.labelPlacement === "right" ? " dtg-task-outside" : ""}`,
        style: labelStyle,
        title: full,
        "aria-label": aria,
        "aria-pressed": selected,
        onClick: () => onSelectTask(selected ? null : task.id),
        onKeyDown,
        "data-task-anchor": rect.anchor,
        "data-label-placement": rect.labelPlacement,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-subject", children: task.subject === "" ? "\u2014" : task.subject }),
          task.description === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-desc", children: task.description }),
          rect.live ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-flag", children: uiLabel("liveBadge") }) : null
        ]
      }
    )
  ] });
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
  /* The renderer paints the lane colour inline (a token reference); this is the
     neutral default for a payload that carries no lane colour. */
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

/* One absolutely-positioned wrapper per task, so the BAR and its LABEL chip are
   laid out independently: bar length = duration, chip = readable text. The
   wrapper has no size of its own; both children carry their own geometry. */
.dtg-task-wrap { position: absolute; left: 0; top: 0; width: 0; height: 0; }
/* The duration bar. Its width is set inline from the real elapsed time; it gets
   no padding and no text, so nothing about a label can stretch it. */
.dtg-task-bar {
  position: absolute;
  /* A Gantt bar: 10px tall (TASK_BAR_HEIGHT), rounded, so it reads as duration
     rather than as a colour chip in front of the label. */
  border-radius: 3px;
  background: var(--dsw-alias-label-tertiary);
  opacity: 0.85;
}
/* A task with no dated history has no knowable duration: a marker, not a bar. */
.dtg-task-bar-live {
  border-radius: 50%;
  opacity: 1;
  box-shadow: 0 0 0 2px var(--dsw-alias-bg-layer-1);
}
/* Hairline from the bar's end to a chip that had to hang outside it. */
.dtg-task-anchor {
  position: absolute;
  height: 0;
  border-top: 1px dashed var(--dsw-alias-label-dimmed);
}
/* The chip sits at the geometry the layout computed (inside the bar, or to its
   right); position:absolute keeps it out of normal flow so it can never
   influence the bar. */
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
.dtg-task-outside {
  /* An outside chip is anchored to the bar by a connector, not by overlap. */
  border-left-width: 2px;
}
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

/* --- lane head navigation (requirement: click a teammate -> their chat) - */

/* The host class carries hover/focus/cursor; this only lays the button out so
   the row looks identical to the non-clickable variant. */
.dtg-head-btn {
  display: block;
  width: 100%;
  margin: 0;
  padding: 3px 6px;
  border: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  -webkit-app-region: no-drag;
}
.dtg-head-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4);
  outline-offset: -2px;
}
.dtg-lane-mark .dtg-dot { background: var(--dsw-alias-label-dimmed); }
.dtg-head-name { color: var(--dsw-alias-label-primary); }
.dtg-head-row { border-left: 2px solid transparent; }

/* The marker is a BUTTON now (its body opens in the detail view), so it has to
   stay visually a dot: strip every button affordance the platform would add. */
.dtg-msg[type='button'] {
  padding: 0;
  border: 0;
  font: inherit;
  cursor: pointer;
  -webkit-app-region: no-drag;
}
/* Selected state gets a non-colour cue: a second ring, so it reads on any lane
   colour and under any theme. */
.dtg-msg-active {
  box-shadow:
    0 0 0 1px var(--dsw-alias-bg-layer-1),
    0 0 0 3px var(--dsw-alias-label-secondary);
}
.dtg-msg[type='button']:focus-visible {
  outline: 2px solid var(--dsw-alias-border-l4);
  outline-offset: 1px;
}

/* --- message detail view ------------------------------------------------ */

.dtg-message-details { max-height: 60%; }
.dtg-message-route {
  font: var(--dsw-font-xxs-strong-12);
  word-break: break-all;
}
.dtg-details-kind {
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
/* The FULL body lives here (never in a tooltip): wraps, and scrolls once it
   outgrows the panel. Real bodies run to several thousand characters. */
.dtg-message-body {
  margin: 4px 8px 6px;
  max-height: 40vh;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  font: var(--dsw-font-xxxs-11);
  color: var(--dsw-alias-label-secondary);
  border: 1px solid var(--dsw-alias-border-l1);
  border-radius: 4px;
  padding: 6px 8px;
}
.dtg-muted { color: var(--dsw-alias-label-tertiary); }

/* --- message markers --------------------------------------------------- */

/* The lane's true message extent: a hairline rhythm strip, never a timeline. */
.dtg-msg-band {
  position: absolute;
  border-radius: 1px;
  background: var(--dsw-alias-label-dimmed);
  opacity: 0.35;
}
.dtg-msg {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  /* Filled = a delivery from that lane; the outline keeps the dot visible on
     any bar colour underneath. */
  background: var(--dsw-alias-label-tertiary);
  box-shadow: 0 0 0 1px var(--dsw-alias-bg-layer-1);
}
/* The human's own prompt: a punched-out dot with a TWO-TONE ring, never a hue.
   Single tokens are invisible on one theme or the other (measured: the
   previously-used markdown-citation token scored 1.16:1 on a light panel), and
   app switches themes without any attribute we could read. So the ring paints
   BOTH ends of the ink pair: whichever skin is active, one of the two layers
   contrasts with the surface. Do not collapse this to one token \u2014 a single
   candidate measures below the 3:1 graphical minimum on one skin or the other,
   and "it flips with the skin" is an assumption, not a measurement. The fill
   stays the panel surface so the dot reads as a punched-out hole. */
.dtg-msg-user {
  background: var(--dsw-alias-bg-layer-1);
  border: 0;
  box-shadow:
    0 0 0 2px var(--dsw-alias-label-primary),
    0 0 0 3.5px var(--dsw-alias-label-primary-inverted);
}
.dtg-msg-agent { border: 0; }
.dtg-msg-turn { border-radius: 1px; }
/* Direction is carried by SHAPE, not only colour: outgoing rides in a squared
   dot, incoming in a ringed round one, and the glyph itself points the way
   (\u2197 vs \u2199). "Did I send this or receive it" therefore survives a colour-blind
   reader. The colour is always the COUNTERPART's lane colour. */
.dtg-msg-out { border-radius: 2px; }
.dtg-msg-in { border-style: solid; }
.dtg-msg .dtg-msg-glyph { font-size: 9px; }
.dtg-legend-arrow {
  display: inline-block;
  font: var(--dsw-font-xxxs-11);
  line-height: 1;
  color: var(--dsw-alias-label-secondary);
}

.dtg-msg-glyph {
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
  /* The glyph is the non-colour signal: \u270E = the human's own prompt,
     \u2709 = a delivery, \u25B8 = a turn marker. It sits on the lane's saturated fill,
     so the inverted ink is the readable one there. */
  color: var(--dsw-alias-label-primary-inverted);
}
/* ...except inside the human's punched-out dot, whose fill is the PANEL colour:
   the inverted ink would be white-on-white in a light theme, so this one glyph
   takes the primary ink instead (and the two-tone ring carries the outline). */
.dtg-msg-user .dtg-msg-glyph {
  color: var(--dsw-alias-label-primary);
}
.dtg-msg-count {
  position: absolute;
  left: 12px;
  top: 0;
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
  color: var(--dsw-alias-label-tertiary);
  pointer-events: none;
}
.dtg-legend-msg {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.dtg-legend-msg-user {
  background: var(--dsw-alias-bg-layer-1);
  box-shadow:
    0 0 0 2px var(--dsw-alias-label-primary),
    0 0 0 3.5px var(--dsw-alias-label-primary-inverted);
}

/* Frozen board: no pulse, so nothing on screen implies ongoing work. */
.dtg-paused .dtg-step-open { animation: none; }
.dtg-frozen .dtg-step-open { animation: none; }

/* --- now marker -------------------------------------------------------- */
.dtg-now { position: absolute; top: 0; bottom: 0; width: 1px; background: var(--dsw-alias-brand-primary); }
/* Frozen board: the same line, but unmistakably not a live clock. */
.dtg-now-ended {
  background: var(--dsw-alias-label-dimmed);
  border-left: 1px dashed var(--dsw-alias-label-dimmed);
  width: 0;
}
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
/* Build identity: quiet, monospaced, never a call to action. */
.dtg-build {
  padding: 1px 8px 3px;
  font: var(--dsw-font-xxxs-11);
  color: var(--dsw-alias-label-tertiary);
  opacity: 0.7;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
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
assertNoBackticksInCss(BOARD_CSS, "styles.ts BOARD_CSS");
function assertNoBackticksInCss(css, label) {
  const TICK = String.fromCharCode(96);
  const index = css.indexOf(TICK);
  if (index !== -1) {
    const line = css.slice(0, index).split("\n").length;
    throw new Error(
      `${label}: stray ${TICK} in a CSS template literal at line ${line}. Such a character inside a CSS comment terminates the template early and breaks the module transform.`
    );
  }
}

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
function BoardView({ sessionId, visible, routeBase, navigate }) {
  const [data, setData] = (0, import_react2.useState)(null);
  const [error, setError] = (0, import_react2.useState)(null);
  const [now, setNow] = (0, import_react2.useState)(() => Date.now());
  const [reloadKey, setReloadKey] = (0, import_react2.useState)(0);
  const [selectedTaskId, setSelectedTaskId] = (0, import_react2.useState)(null);
  const [selectedMessageKey, setSelectedMessageKey] = (0, import_react2.useState)(null);
  useBoardStyles();
  const routeBaseRef = (0, import_react2.useRef)(routeBase);
  routeBaseRef.current = routeBase;
  const navigateRef = (0, import_react2.useRef)(navigate);
  navigateRef.current = navigate;
  const onNavigate = (0, import_react2.useCallback)((target) => {
    const opener = navigateRef.current;
    if (opener === void 0) return false;
    try {
      return opener(target) === true;
    } catch {
      return false;
    }
  }, []);
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
  const live = data !== null && data.live !== false;
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
  const onSelectMessage = (0, import_react2.useCallback)((key) => setSelectedMessageKey(key), []);
  const selectedMessage = (0, import_react2.useMemo)(() => {
    if (data === null || selectedMessageKey === null) return null;
    const laneIdOf = speakerLaneMapper(data.lanes);
    for (const lane of data.lanes) {
      const list = lane.messages ?? [];
      for (let index = 0; index < list.length; index += 1) {
        const message = list[index];
        if (message === void 0) continue;
        const key = message.messageId ?? `${lane.id}:${message.kind}:${message.time}:${index}`;
        if (key === selectedMessageKey) {
          return { laneId: lane.id, message, direction: resolveMessageDirection(message, lane.id, laneIdOf).direction };
        }
      }
    }
    return null;
  }, [data, selectedMessageKey]);
  (0, import_react2.useEffect)(() => {
    if (!visible) return;
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (selectedMessageKey !== null) setSelectedMessageKey(null);
      else if (selectedTaskId !== null) setSelectedTaskId(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visible, selectedMessageKey, selectedTaskId]);
  const retry = (0, import_react2.useCallback)(() => setReloadKey((key) => key + 1), []);
  if (data === null) {
    const failed = error !== null;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-root", "data-dsh-task-gantt": "", "data-build": BUILD_LABEL, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-center", role: failed ? "alert" : void 0, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-center-title", children: failed ? t("errorTitle") : t("loading") }),
      failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: error }) : null,
      failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn", onClick: retry, children: t("retry") }) : null
    ] }) });
  }
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset();
  const sourceChip = data.source === "log" ? { className: "dtg-chip", text: t("sourceLog") } : { className: "dtg-chip dtg-chip-warn", text: data.source === "partial" ? t("sourcePartial") : t("sourceLive") };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-root", "data-dsh-task-gantt": "", "data-build": BUILD_LABEL, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: sourceChip.className, title: [t("sourceLog"), t("sourcePartial"), t("sourceLive")].join(" / "), children: sourceChip.text }),
      live ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip dtg-chip-live", children: uiLabel("nowLabel") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip", title: uiLabel("frozenHint"), children: `${formatDateTime(data.range.start, tzOffsetMinutes)} \u2192 ${uiLabel("endedLabel")} ${formatDateTime(data.range.end ?? data.generatedAt, tzOffsetMinutes)}` }),
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
        onSelectTask,
        selectedMessageKey,
        onSelectMessage,
        navigate: onNavigate
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
    selectedMessage === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      MessageDetails,
      {
        laneId: selectedMessage.laneId,
        message: selectedMessage.message,
        direction: selectedMessage.direction,
        tzOffsetMinutes,
        onClose: () => setSelectedMessageKey(null)
      }
    ),
    error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice dtg-notice-error", children: `${t("errorTitle")}: ${error}` }),
    data.failure === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice dtg-notice-error", children: `${uiLabel("failureLabel")}: ${data.failure}` }),
    data.notes.length === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice", title: data.notes.join("\n"), children: `${uiLabel("notesLabel")}: ${data.notes.join(" \xB7 ")}` }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-build", "data-build": BUILD_LABEL, title: BUILD_LABEL, children: BUILD_LABEL })
  ] });
}
function MessageDetails({
  laneId,
  message,
  direction,
  tzOffsetMinutes,
  onClose
}) {
  const detail = messageDetail(
    {
      kind: message.kind,
      time: message.time,
      direction,
      from: message.from,
      to: message.to,
      preview: message.preview
    },
    { you: t("you"), peerFallback: uiLabel("messageNoPeer") },
    (time) => formatDateTime(time, tzOffsetMinutes)
  );
  const outgoing = detail.direction === "outgoing";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details dtg-message-details", role: "region", "aria-label": uiLabel("messageDetailTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-details-title dtg-message-route", "data-message-route": detail.route, children: detail.route }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-details-kind", "data-message-direction": detail.direction, children: outgoing ? uiLabel("messageSentMark") : uiLabel("messageReceivedMark") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn dtg-details-close", onClick: onClose, "aria-label": uiLabel("close"), children: "\u2715" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: uiLabel("messageWhenLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: detail.when })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: uiLabel("messageKindLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: detail.kind })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: uiLabel("messageLaneLabel") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: laneId })
    ] }),
    detail.maybeTruncated ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice", children: uiLabel("messageTruncated", { max: MESSAGE_PREVIEW_MAX }) }) : null,
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      "div",
      {
        className: "dtg-message-body",
        "data-message-body": "",
        "data-message-body-length": detail.body.length,
        "data-message-has-body": detail.hasBody ? "true" : "false",
        children: detail.hasBody ? detail.body : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-muted", children: uiLabel("messageNoBody") })
      }
    )
  ] });
}
function TaskDetails({
  task,
  generatedAt,
  tzOffsetMinutes,
  onClose
}) {
  const duration = taskDurationLine(task, (time) => formatDateTime(time, tzOffsetMinutes), {
    created: uiLabel("taskCreatedAt"),
    finished: uiLabel("taskFinishedAt"),
    lastTransition: uiLabel("taskLastTransitionAt"),
    duration: uiLabel("taskDuration"),
    unknown: uiLabel("taskDurationUnknown"),
    line: uiLabel("taskDurationLine")
  });
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details", role: "region", "aria-label": uiLabel("detailsTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-details-title", children: task.subject }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn", onClick: onClose, title: uiLabel("close"), "aria-label": uiLabel("close"), children: "\u2715" })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-details-body", children: task.description === "" ? "\u2014" : task.description }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-kv dtg-kv-duration", title: duration.text, "data-duration-known": duration.known ? "true" : "false", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-key", children: duration.known ? uiLabel("taskCreatedAt") : uiLabel("taskDuration") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-kv-val", children: duration.known ? `${duration.from} \u2192 ${duration.label} ${duration.to}\uFF08${duration.duration}\uFF09` : duration.text })
    ] }),
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
var WORKSPACE_SERVICE = "uiWorkspace";
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
  const routeBase = (path) => resolveHostRoute(path, service);
  const navigate = (target) => navigateToSession(ctx, target);
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
        routeBase,
        navigate
      })
    });
  } catch (error) {
    warn(ctx, `dsh-task-gantt: could not register the "${TAB_TYPE_ID}" tab: ${describe(error)}`);
    return () => {
    };
  }
}
function navigateToSession(ctx, target) {
  try {
    const workspace = ctx.get(WORKSPACE_SERVICE);
    const openSession = workspace?.openSession;
    if (typeof openSession !== "function") return false;
    openSession.call(workspace, target.value);
    return true;
  } catch {
    return false;
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
