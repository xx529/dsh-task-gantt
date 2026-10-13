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
  countSubagentSessions: () => countSubagentSessions,
  inject: () => inject,
  isFirstSubagentTransition: () => isFirstSubagentTransition,
  name: () => name,
  watchForFirstTeam: () => watchForFirstTeam
});
module.exports = __toCommonJS(index_exports);
var import_react3 = require("react");

// src/shared/contract.ts
var API_VERSION = 1;
var BUILD_LABEL = "v0.2.31 \xB7 locale-gate";
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
  noSession: "\u65E0\u4F1A\u8BDD\u53EF\u8DF3\u8F6C",
  taskEventAria: "{time} {event}",
  taskEventHint: "\uFF08\u8BE5\u4EFB\u52A1\u7684\u72B6\u6001\u53D8\u5316\u65F6\u95F4\uFF09",
  laneModel: "\u6A21\u578B"
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
  noSession: "No session to open",
  taskEventAria: "{time} {event}",
  taskEventHint: "(when this task changed state)",
  laneModel: "Model"
};
var DICTIONARIES = { zh, en };
function detectLocale() {
  const lang = (typeof document !== "undefined" ? document.documentElement?.lang : "") || (typeof navigator !== "undefined" ? navigator.language : "") || "en";
  return /^zh/i.test(lang) ? "zh" : "en";
}
var locale = detectLocale();
function currentLocale() {
  return detectLocale();
}
function t(key) {
  return DICTIONARIES[detectLocale()][key];
}
function format(key, vars) {
  const template = t(key);
  if (vars === void 0) return template;
  return template.replace(/\{(\w+)\}/g, (match, name2) => {
    const value = vars[name2];
    return value === void 0 ? match : String(value);
  });
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

// src/client/ui/lane-activity.ts
var ACTIVITY_LABEL_KEY = {
  thinking: "laneActThinking",
  read: "laneActRead",
  readImage: "laneActRead",
  search: "laneActSearch",
  write: "laneActWrite",
  edit: "laneActEdit",
  commands: "laneActCommands",
  code: "laneActCode",
  webSearch: "laneActWebSearch",
  webFetch: "laneActWebFetch",
  subagents: "laneActSubagents",
  plan: "laneActPlan",
  questions: "laneActQuestions",
  tools: "laneActTools"
};
var ACTIVITY_FULL_KEY = {
  laneActThinking: "laneActThinkingFull",
  laneActRead: "laneActReadFull",
  laneActSearch: "laneActSearchFull",
  laneActWrite: "laneActWriteFull",
  laneActEdit: "laneActEditFull",
  laneActCommands: "laneActCommandsFull",
  laneActCode: "laneActCodeFull",
  laneActWebSearch: "laneActWebSearchFull",
  laneActWebFetch: "laneActWebFetchFull",
  laneActSubagents: "laneActSubagentsFull",
  laneActPlan: "laneActPlanFull",
  laneActQuestions: "laneActQuestionsFull",
  laneActTools: "laneActToolsFull",
  laneRunning: "laneWorking",
  laneProvisioning: "laneProvisioning"
};
function activityTooltip(activity) {
  if (activity.statusKey === null || activity.tooltipKey === null) return null;
  const full = ACTIVITY_FULL_KEY[activity.tooltipKey];
  return { fullKey: full ?? activity.tooltipKey, detail: activity.tooltipDetail };
}
var ACTIVITY_DETAIL_MAX = 160;
function activityFields(lane) {
  const descriptor = lane.activity;
  if (descriptor !== void 0 && descriptor !== null && typeof descriptor.kind === "string") {
    const key = ACTIVITY_LABEL_KEY[descriptor.kind];
    if (key !== void 0) {
      const detail = typeof descriptor.detail === "string" ? descriptor.detail : "";
      return {
        statusKey: key,
        tooltipKey: key,
        tooltipDetail: detail === "" ? null : detail.slice(0, ACTIVITY_DETAIL_MAX)
      };
    }
  }
  return { statusKey: null, tooltipKey: null, tooltipDetail: null };
}
var WORKING_STATUS_KEY = {
  running: "laneWorking",
  provisioning: "laneProvisioning"
};
function laneActivity(lane) {
  const openTurn = (lane.spans ?? []).some(isOpenTurn);
  const statusWorking = lane.status === void 0 ? void 0 : WORKING_STATUS_KEY[lane.status];
  const working = statusWorking !== void 0 ? true : lane.status !== void 0 ? false : openTurn;
  if (!working) {
    return { working: false, statusKey: null, reason: "none", tooltipKey: null, tooltipDetail: null };
  }
  const fields = activityFields(lane);
  if (fields.statusKey !== null) {
    return { working: true, ...fields, reason: "activity" };
  }
  const statusKey = statusWorking ?? "laneWorking";
  return { working: true, statusKey, reason: statusWorking === void 0 ? "open-turn" : "status", tooltipKey: statusKey, tooltipDetail: null };
}
function isOpenTurn(span) {
  if (span === null || typeof span !== "object") return false;
  if (span.kind !== "turn") return false;
  if ("open" in span && span.open === true) return true;
  return span.end === null;
}

// src/client/ui/lane-filter.ts
function filterTimelineLanes(data, hidden, allLanes = data.lanes, workingOnly = false) {
  const working = /* @__PURE__ */ new Map();
  const isWorking = (lane) => {
    const cached = working.get(lane.id);
    if (cached !== void 0) return cached;
    const value = laneActivity(lane).working;
    working.set(lane.id, value);
    return value;
  };
  const lanes = data.lanes.filter((lane) => {
    if (isPinnedLane(lane)) return true;
    if (hidden.has(lane.id)) return false;
    if (workingOnly && !isWorking(lane)) return false;
    return true;
  });
  if (lanes.length === data.lanes.length) return data;
  const visible = new Set(lanes.map((lane) => lane.id));
  const tasks = data.tasks.filter((task) => visible.has(task.laneId));
  const laneBySpeaker = /* @__PURE__ */ new Map();
  for (const candidate of allLanes) {
    laneBySpeaker.set(candidate.id, candidate.id);
    for (const key of speakerKeysOf(candidate)) laneBySpeaker.set(key, candidate.id);
  }
  const laneIdOf = (speakerId) => laneBySpeaker.get(speakerId) ?? null;
  const gone = /* @__PURE__ */ new Set();
  for (const lane of data.lanes) {
    if (!lanes.includes(lane)) gone.add(lane.id);
  }
  const dropFrom = hidden.size === 0 ? gone : /* @__PURE__ */ new Set([...hidden, ...gone]);
  return { ...data, lanes: lanes.map((lane) => dropHiddenPeerMessages(lane, dropFrom, laneIdOf)), tasks };
}
function isPinnedLane(lane) {
  return lane.role === "lead" || lane.id === "lead";
}
function dropHiddenPeerMessages(lane, hidden, laneIdOf) {
  if (hidden.size === 0 || lane.messages.length === 0) return lane;
  const messages = lane.messages.filter((message) => {
    for (const endpoint of [message.to, message.from]) {
      if (endpoint === void 0 || endpoint === null || endpoint.id === "") continue;
      const endpointLane = laneIdOf(endpoint.id);
      if (endpointLane !== null && hidden.has(endpointLane)) return false;
    }
    return true;
  });
  if (messages.length === lane.messages.length) return lane;
  return { ...lane, messages };
}
function speakerKeysOf(lane) {
  const keys = [lane.id];
  const navigation = lane.navigation;
  if (navigation !== void 0 && navigation !== null) {
    if (navigation.type === "session" && typeof navigation.value === "string") keys.push(navigation.value);
    else if (navigation.type === "address" && typeof navigation.value.sessionId === "string") keys.push(navigation.value.sessionId);
  }
  return keys;
}

// src/client/ui/overlay-position.ts
function clipBounds(anchor, options = {}) {
  const opts = typeof options === "number" ? { minWidth: options } : options;
  const minWidth = opts.minWidth ?? 160;
  const viewportWidth = typeof window === "undefined" ? 1024 : window.innerWidth;
  const viewportHeight = typeof window === "undefined" ? 768 : window.innerHeight;
  const viewport = {
    left: 0,
    right: viewportWidth,
    top: 0,
    bottom: viewportHeight,
    width: viewportWidth
  };
  if (typeof document === "undefined") return viewport;
  let el = anchor.parentElement;
  while (el !== null && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    if (cs.overflow !== "visible" || cs.overflowX !== "visible" || cs.overflowY !== "visible") {
      const r = el.getBoundingClientRect();
      if (r.width >= minWidth && r.height > 0) {
        return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width };
      }
    }
    el = el.parentElement;
  }
  return viewport;
}
function fixedContainingBlock(element) {
  let el = element.parentElement;
  while (el !== null && el !== document.documentElement) {
    const cs = getComputedStyle(el);
    if (cs.transform !== "none" || cs.filter !== "none" || cs.perspective !== "none" || cs.willChange === "transform" || /paint|layout|strict|content|size/.test(cs.contain === "none" ? "" : cs.contain)) {
      return el;
    }
    el = el.parentElement;
  }
  return null;
}
function overlaySpace(element) {
  const viewport = {
    left: 0,
    right: typeof window === "undefined" ? 1024 : window.innerWidth,
    top: 0,
    bottom: typeof window === "undefined" ? 768 : window.innerHeight,
    width: typeof window === "undefined" ? 1024 : window.innerWidth
  };
  if (typeof document === "undefined") return { offsetX: 0, offsetY: 0, bounds: viewport };
  const cb = fixedContainingBlock(element);
  if (cb === null) return { offsetX: 0, offsetY: 0, bounds: viewport };
  const r = cb.getBoundingClientRect();
  return {
    offsetX: r.left,
    offsetY: r.top,
    bounds: { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width }
  };
}

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

// src/client/ui/task-times.ts
function taskRunTimes(task, now) {
  const history = task.history ?? [];
  const first = (action) => {
    for (const event of history) {
      if (event !== null && typeof event === "object" && event.action === action && Number.isFinite(event.time)) {
        return event.time;
      }
    }
    return null;
  };
  const firstTime = history.find(
    (event) => event !== null && typeof event === "object" && Number.isFinite(event.time)
  )?.time;
  const created = first("created") ?? firstTime ?? now;
  const finished = task.status === "completed" || task.status === "deleted";
  let ended = null;
  if (finished) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const event = history[i];
      if (event !== null && typeof event === "object" && event.action === "completed" && Number.isFinite(event.time)) {
        ended = event.time;
        break;
      }
    }
  }
  const claimed = first("claimed") ?? first("reopened");
  const startedIsFallback = claimed === null;
  const started = claimed ?? created;
  const durationMs = Math.max(0, (ended ?? Math.max(now, started)) - started);
  return { created, started, ended, durationMs, startedIsFallback };
}

// src/client/ui/labels.ts
var zh2 = {
  zoomIn: "\u653E\u5927",
  zoomOut: "\u7F29\u5C0F",
  zoomReset: "\u9002\u5E94\u7A97\u53E3",
  zoomHint: "Ctrl/\u2318 + \u6EDA\u8F6E\u7F29\u653E\uFF0CShift + \u6EDA\u8F6E\u6A2A\u5411\u6EDA\u52A8",
  refresh: "\u5237\u65B0",
  nowLabel: "\u73B0\u5728",
  liveTaskHint: "\u65E0\u5386\u53F2\u8BB0\u5F55\uFF1A\u53EA\u663E\u793A\u5F53\u524D\u72B6\u6001\uFF0C\u4E0D\u662F\u5386\u53F2\u533A\u95F4",
  detailsTitle: "\u4EFB\u52A1\u8BE6\u60C5",
  close: "\u5173\u95ED",
  historyLabel: "\u72B6\u6001\u8FC1\u79FB",
  noHistory: "\u65E0\u5386\u53F2\u8BB0\u5F55\uFF08\u5B9E\u65F6\u6001\uFF0C\u65E5\u5FD7\u91CC\u6CA1\u6709\u53EF\u7528\u7684\u65F6\u95F4\u951A\u70B9\uFF09",
  taskCreatedAt: "\u521B\u5EFA",
  messageSentTo: "\u53D1\u51FA \u2192",
  waitStillBlocking: "\u4ECD\u5728\u7B49\u5F85",
  waitSeconds: "{count} \u79D2",
  waitOutcomeOpen: "\u4ECD\u5728\u7B49\u5F85\uFF08\u5C1A\u65E0\u7ED3\u679C\uFF09",
  waitOutcomeTimedOut: "\u7B49\u6EE1\u8D85\u65F6\uFF0C\u6CA1\u4EBA\u6765",
  waitOutcomeWoken: "\u7B49\u5230\u6709\u4EBA\u6765\u4E86",
  waitOutcomeUnknown: "\u7ED3\u679C\u4E0D\u53EF\u8BFB\uFF08\u4E2D\u6027\u663E\u793A\uFF09",
  waitAria: "\u7B49\u5F85\uFF1A{from} \u8D77\uFF0C{duration}\uFF0C{outcome}",
  waitAriaOpen: "\u7B49\u5F85\uFF1A{from} \u8D77\uFF0C{outcome}",
  waitLegend: "\u7B49\u5F85\u5F00\u59CB/\u7ED3\u675F",
  waitLegendHint: "\u659C\u7EB9\u6761 = agent \u5728\u7B49\u522B\u4EBA\uFF08\u4E0D\u662F\u5728\u5DE5\u4F5C\uFF09\uFF1B\u5DE6\u7AEF\u5B9E\u5FC3\u523B\u5EA6 = \u5F00\u59CB\uFF1B\u53F3\u7AEF\u5B9E\u5FC3 = \u6709\u4EBA\u6765\u4E86\uFF0C\u6761\u5F62\u523B\u5EA6 = \u7B49\u6EE1\u8D85\u65F6\uFF0C\u65E0\u523B\u5EA6+\u6E10\u9690 = \u4ECD\u5728\u7B49\u5F85",
  rangeLabel: "\u65F6\u95F4\u6BB5",
  rangeAll: "\u5168\u90E8",
  rangeHint: "\u53EA\u770B\u6700\u8FD1\u4E00\u6BB5\u65F6\u95F4\u5185\u7684\u5185\u5BB9",
  followLabel: "\u8DDF\u968F\u65F6\u95F4\u7EBF",
  laneFilterLabel: "\u7B5B\u9009 teammate",
  laneFilterPinned: "\u56FA\u5B9A\u663E\u793A",
  laneActThinking: "\u5206\u6790\u4E2D",
  laneActThinkingFull: "\u6B63\u5728\u5206\u6790\u8BF7\u6C42",
  laneActReadFull: "\u6B63\u5728\u8BFB\u53D6\u5185\u5BB9",
  laneActSearchFull: "\u6B63\u5728\u641C\u7D22",
  laneActWriteFull: "\u6B63\u5728\u5199\u6587\u4EF6",
  laneActEditFull: "\u6B63\u5728\u7F16\u8F91\u6587\u4EF6",
  laneActCommandsFull: "\u6B63\u5728\u8FD0\u884C\u547D\u4EE4",
  laneActCodeFull: "\u6B63\u5728\u5199\u4EE3\u7801",
  laneActWebSearchFull: "\u6B63\u5728\u8054\u7F51\u641C\u7D22",
  laneActWebFetchFull: "\u6B63\u5728\u6293\u53D6\u7F51\u9875",
  laneActSubagentsFull: "\u6B63\u5728\u8C03\u5EA6\u5B50\u4EE3\u7406",
  laneActPlanFull: "\u6B63\u5728\u89C4\u5212",
  laneActQuestionsFull: "\u6B63\u5728\u5411\u4F60\u63D0\u95EE",
  laneActToolsFull: "\u6B63\u5728\u8C03\u7528\u5DE5\u5177",
  laneActRead: "\u8BFB\u53D6\u4E2D",
  laneActSearch: "\u641C\u7D22\u4E2D",
  laneActWrite: "\u5199\u6587\u4EF6",
  laneActEdit: "\u7F16\u8F91\u4E2D",
  laneActCommands: "\u8FD0\u884C\u547D\u4EE4",
  laneActCode: "\u4EE3\u7801",
  laneActWebSearch: "\u8054\u7F51\u641C\u7D22",
  laneActWebFetch: "\u6293\u53D6\u7F51\u9875",
  laneActSubagents: "\u5B50\u4EE3\u7406",
  laneActPlan: "\u89C4\u5212\u4E2D",
  laneActQuestions: "\u63D0\u95EE\u4E2D",
  laneActTools: "\u8C03\u7528\u5DE5\u5177",
  laneFilterWorking: "\u53EA\u770B\u5DE5\u4F5C\u4E2D",
  laneFilterWorkingActive: "\u5DE5\u4F5C\u4E2D",
  laneFilterHint: "\u53EA\u663E\u793A\u52FE\u9009\u7684 teammate\uFF1Blead \u56FA\u5B9A\u663E\u793A\uFF0C\u4E0D\u80FD\u9690\u85CF",
  followHint: "\u6253\u5F00\u65F6\u89C6\u56FE\u81EA\u52A8\u8DDF\u7740 NOW \u5F80\u540E\u63A8\uFF1B\u5173\u95ED\u540E\u4E0D\u518D\u81EA\u52A8\u6EDA\u52A8",
  messageDetailTitle: "\u6D88\u606F\u8BE6\u60C5",
  messageSentMark: "\u53D1\u51FA",
  messageReceivedMark: "\u6536\u5230",
  messageWhenLabel: "\u65F6\u95F4",
  messageKindLabel: "\u7C7B\u578B",
  messageLaneLabel: "\u6240\u5728\u6CF3\u9053",
  messageNoBody: "\u65E0\u6B63\u6587",
  messageRecipientUnrecorded: "\uFF08\u672A\u8BB0\u5F55\u6536\u4EF6\u4EBA\uFF09",
  messageTruncated: "\u6B63\u6587\u5DF2\u8FBE {max} \u5B57\u7B26\u4E0A\u9650\uFF0C\u5BBF\u4E3B\u53EF\u80FD\u5DF2\u622A\u65AD\uFF08\u6B64\u5904\u4E0D\u5047\u88C5\u5B8C\u6574\uFF09",
  messageReceivedFrom: "\u6536\u5230 \u2190",
  messagePeerUnknown: "\u5BF9\u7AEF\u4E0D\u5728\u672C\u770B\u677F\uFF08\u4E2D\u6027\u8272\uFF09",
  messageLegendSent: "\u53D1\u51FA",
  messageLegendReceived: "\u6536\u5230",
  taskFinishedAt: "\u5B8C\u6210",
  taskStartedAt: "\u5F00\u59CB",
  taskEndedAt: "\u7ED3\u675F",
  taskNotEnded: "\u8FDB\u884C\u4E2D\uFF08\u5C1A\u672A\u7ED3\u675F\uFF09",
  laneWorking: "\u8FD0\u884C\u4E2D",
  laneProvisioning: "\u542F\u52A8\u4E2D",
  taskStartedFromCreated: "\u5F00\u59CB\u65F6\u95F4\u6309\u521B\u5EFA\u8BA1\uFF08\u4ECE\u672A\u8BA4\u9886\uFF09",
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
  countsFullLabel: "{tasks} \u4E2A\u4EFB\u52A1 \xB7 {messages} \u6761\u6D88\u606F",
  messageLegendYou: "\u6211\u53D1\u8D77\uFF08\u6316\u7A7A+\u53CC\u8272\u73AF\uFF09",
  messageLegendTeammate: "teammate \u6D88\u606F\uFF08\u5B9E\u5FC3\uFF09",
  messageLegendHint: "\u6807\u8BB0\u989C\u8272 = \u5BF9\u7AEF\u7684\u6CF3\u9053\u8272\uFF08A \u7684\u6CF3\u9053\u91CC A\u2192B \u7528 B \u7684\u989C\u8272\uFF09\xB7 \u2197=\u53D1\u51FA \xB7 \u2199=\u6536\u5230 \xB7 \u5BF9\u7AEF\u662F\u4EBA\u65F6\u7528\u56FA\u5B9A\u7684\u53CC\u8272\u73AF\uFF1B\u7A7A\u9699\u5904 +N \u8868\u793A\u7701\u7565\u4E86 N \u6761\uFF0C\u4F4D\u7F6E\u4E0D\u52A8",
  messageOmitted: "\u6B64\u5904\u53E6\u6709 {count} \u6761\u672A\u7ED8\u5236",
  messageDropped: "{shown}/{total} \u6761\u6D88\u606F\u5DF2\u7ED8\u5236\uFF08\u5F53\u524D\u65F6\u95F4\u6BB5\u5185\uFF09",
  messageDroppedHint: "\u6309\u50CF\u7D20\u95F4\u8DDD\u62BD\u7A00\uFF1B\u6BCF\u4E2A\u6807\u8BB0\u4ECD\u662F\u5B83\u81EA\u5DF1\u7684\u771F\u5B9E\u65F6\u95F4\uFF0C\u672A\u7ED8\u5236\u7684\u53EA\u88AB\u7701\u7565\u3001\u672A\u88AB\u632A\u52A8",
  messageAria: "{time}\uFF0C{route}\uFF0C{preview}",
  messagePopoverPreview: "\u6D88\u606F\u5185\u5BB9",
  leadLabel: "Lead"
};
var en2 = {
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
  zoomReset: "Fit window",
  zoomHint: "Ctrl/Cmd + wheel to zoom, Shift + wheel to scroll sideways",
  refresh: "Refresh",
  nowLabel: "now",
  liveTaskHint: "No history: current state only, not a measured interval",
  detailsTitle: "Task details",
  close: "Close",
  historyLabel: "Transitions",
  noHistory: "No history (live state \u2014 the log carried no usable time anchor)",
  taskCreatedAt: "created",
  messageSentTo: "sent to",
  waitStillBlocking: "still blocking",
  waitSeconds: "{count}s",
  waitOutcomeOpen: "still blocking (no result yet)",
  waitOutcomeTimedOut: "timed out, nobody came",
  waitOutcomeWoken: "a peer arrived",
  waitOutcomeUnknown: "outcome unreadable (shown neutral)",
  waitAria: "wait: from {from}, {duration}, {outcome}",
  waitAriaOpen: "wait: from {from}, {outcome}",
  waitLegend: "wait start/end",
  waitLegendHint: "striped band = the agent is waiting for someone (not working); a filled tick on the left is the START; on the right a filled tick means a peer arrived, a bar means it timed out, and no tick with a fade means it is still blocking",
  rangeLabel: "Time range",
  rangeAll: "All",
  rangeHint: "Show only the most recent stretch of the timeline",
  followLabel: "Follow timeline",
  laneFilterLabel: "Filter teammates",
  laneFilterPinned: "always shown",
  laneActThinking: "thinking",
  laneActThinkingFull: "thinking about the request",
  laneActReadFull: "reading",
  laneActSearchFull: "searching",
  laneActWriteFull: "writing a file",
  laneActEditFull: "editing a file",
  laneActCommandsFull: "running a command",
  laneActCodeFull: "writing code",
  laneActWebSearchFull: "searching the web",
  laneActWebFetchFull: "fetching a page",
  laneActSubagentsFull: "delegating to subagents",
  laneActPlanFull: "planning",
  laneActQuestionsFull: "asking you a question",
  laneActToolsFull: "calling tools",
  laneActRead: "reading",
  laneActSearch: "searching",
  laneActWrite: "writing",
  laneActEdit: "editing",
  laneActCommands: "running",
  laneActCode: "code",
  laneActWebSearch: "web search",
  laneActWebFetch: "web fetch",
  laneActSubagents: "subagents",
  laneActPlan: "planning",
  laneActQuestions: "asking",
  laneActTools: "calling tools",
  laneFilterWorking: "Working only",
  laneFilterWorkingActive: "working",
  laneFilterHint: "Show only the ticked teammates; the lead is always shown and cannot be hidden",
  followHint: "When on, the view advances with NOW; when off it never scrolls on its own",
  messageDetailTitle: "Message details",
  messageSentMark: "sent",
  messageReceivedMark: "received",
  messageWhenLabel: "Time",
  messageKindLabel: "Kind",
  messageLaneLabel: "Lane",
  messageNoBody: "No body",
  messageRecipientUnrecorded: "(recipient not recorded)",
  messageTruncated: "The body reached the {max}-character ceiling, so the host may have clipped it (not pretending otherwise here)",
  messageReceivedFrom: "received from",
  messagePeerUnknown: "counterpart is not on this board (neutral colour)",
  messageLegendSent: "sent",
  messageLegendReceived: "received",
  taskFinishedAt: "finished",
  taskStartedAt: "started",
  taskEndedAt: "ended",
  taskNotEnded: "in progress (not ended yet)",
  taskStartedFromCreated: "start taken from created (never claimed)",
  laneWorking: "working",
  laneProvisioning: "starting",
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
  countsFullLabel: "{tasks} tasks \xB7 {messages} messages",
  messageLegendYou: "from me (hole + two-tone ring)",
  messageLegendTeammate: "teammate message (solid)",
  messageLegendHint: "the marker colour is the COUNTERPART lane colour (in A lane, A\u2192B uses B colour) \xB7 \u2197 = sent \xB7 \u2199 = received \xB7 a human counterpart uses the fixed two-tone ring; a +N in a gap means N more messages sit there, unmoved",
  messageOmitted: "{count} more here, not drawn",
  messageDropped: "{shown}/{total} messages drawn (within the selected range)",
  messageDroppedHint: "Thinned by pixel spacing; every marker keeps its own real time \u2014 omitted ones are never moved",
  messageAria: "{time}, {route}, {preview}",
  messagePopoverPreview: "Message",
  leadLabel: "Lead"
};
var dictionaries2 = { zh: zh2, en: en2 };
function uiLabel(key, vars) {
  const table = dictionaries2[currentLocale()] ?? en2;
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
var DEFAULT_LANE_HEIGHT = 72;
var DEFAULT_HEADER_HEIGHT = 28;
var FOLLOW_GUTTER_RATIO = 1 / 4;
var DEFAULT_TICK_COUNT = 6;
var LANE_PAD_Y = 3;
var TURN_BAND_HEIGHT = 10;
var STEP_BAR_HEIGHT = 8;
var ACTIVITY_TRACK_HEIGHT = TURN_BAND_HEIGHT;
var MESSAGE_TRACK_HEIGHT = 11;
var TRACK_GAP = 3;
var MESSAGE_TRACK_TOP = LANE_PAD_Y;
var ACTIVITY_TRACK_TOP = MESSAGE_TRACK_TOP + MESSAGE_TRACK_HEIGHT + TRACK_GAP;
var TASK_CARD_TOP = ACTIVITY_TRACK_TOP + ACTIVITY_TRACK_HEIGHT + TRACK_GAP;
var TASK_CARD_HEIGHT = 32;
var MIN_SPAN_PX = 2;
var TASK_BAR_MIN_WIDTH = 1;
var TASK_MARKER_WIDTH = 9;
var TASK_BAR_HEIGHT = 20;
var TASK_BAR_TOP_OFFSET = 0;
var TASK_LABEL_MIN_WIDTH = 36;
var TASK_LABEL_ELLIPSIS_MIN_WIDTH = 22;
function taskLabelPlacement(anchor, w) {
  if (anchor !== "history" || !Number.isFinite(w)) return "none";
  if (w >= TASK_LABEL_MIN_WIDTH) return "inside";
  if (w >= TASK_LABEL_ELLIPSIS_MIN_WIDTH) return "ellipsis";
  return "none";
}
var MIN_MS_PER_PX = 50;
var MAX_MS_PER_PX = 6e5;
var DEFAULT_MS_PER_PX = 1e3;
var MIN_ZOOM_MS_PER_PX = 1 * SECOND_MS;
var MAX_TICKS = 400;
var MESSAGE_MARKER_MIN_GAP_PX = 9;
var MESSAGE_MARKER_WIDTH = 11;
var MESSAGE_MARKER_HEIGHT = 11;
var MESSAGE_MARKER_TOP = MESSAGE_TRACK_TOP;
var MESSAGE_MARKER_MAX = 40;
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
function rectVisible(viewX, w, viewportWidth) {
  return viewX + w > 0 && viewX < viewportWidth;
}
function inWindow(from, to, win) {
  return to >= win.start && from <= win.end;
}
function pad2(value) {
  return value < 10 ? `0${value}` : `${value}`;
}
function clampMsPerPx(value) {
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MS_PER_PX;
  return clamp(value, MIN_MS_PER_PX, MAX_MS_PER_PX);
}
function clampZoomMsPerPx(value, current) {
  if (!Number.isFinite(value) || value <= 0) return clampMsPerPx(current);
  const from = clampMsPerPx(current);
  return clamp(value, Math.min(MIN_ZOOM_MS_PER_PX, from), MAX_MS_PER_PX);
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
function formatClock(time, tzOffsetMinutes = 0, options) {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS);
  const hm = `${pad2(shifted.getUTCHours())}:${pad2(shifted.getUTCMinutes())}`;
  return options?.seconds === false ? hm : `${hm}:${pad2(shifted.getUTCSeconds())}`;
}
function formatDateTime(time, tzOffsetMinutes = 0) {
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS);
  return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())} ${formatClock(time, tzOffsetMinutes)}`;
}
function formatTickLabel(time, kind, tzOffsetMinutes = 0) {
  if (kind === "time") return formatClock(time, tzOffsetMinutes, { seconds: false });
  const shifted = new Date(num(time, 0) + tzOffsetMinutes * MINUTE_MS);
  return `${pad2(shifted.getUTCMonth() + 1)}-${pad2(shifted.getUTCDate())}`;
}
function isLiveBoard(data) {
  return data?.live !== false;
}
function dataExtent(data, fallback) {
  const seed = num(fallback, 0);
  let rawStart = seed;
  let rawEnd = seed;
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
  return { start: rawStart, end: rawEnd };
}
function effectiveWindowStart(now, windowSpanMs, earliestDatum) {
  if (typeof windowSpanMs !== "number" || !Number.isFinite(windowSpanMs) || windowSpanMs <= 0) return null;
  const clockStart = num(now, 0) - windowSpanMs;
  return Math.max(clockStart, num(earliestDatum, clockStart));
}
function computeWindow(data, now, windowSpanMs, anchorStartMs) {
  const fallback = num(now, 0);
  const rangeStart = num(data?.range?.start, fallback);
  const hasRangeEnd = typeof data?.range?.end === "number" && Number.isFinite(data.range.end);
  const rangeEnd = hasRangeEnd ? num(data?.range?.end, fallback) : null;
  const live = isLiveBoard(data);
  const extent = dataExtent(data, rangeStart);
  const start = extent.start;
  const rawEnd = extent.end;
  const endSource = live ? "now" : rangeEnd !== null ? "range" : "datum";
  const right = endSource === "now" ? Math.max(fallback, rawEnd) : endSource === "range" ? Math.max(rangeEnd ?? rawEnd, rawEnd) : rawEnd;
  const end = Math.max(right, start + 1);
  const span = typeof windowSpanMs === "number" && Number.isFinite(windowSpanMs) && windowSpanMs > 0 ? windowSpanMs : null;
  const anchor = typeof anchorStartMs === "number" && Number.isFinite(anchorStartMs) ? Math.max(anchorStartMs, start) : null;
  const filteredStart = anchor !== null ? anchor : span === null ? start : Math.max(start, end - span);
  return { start: filteredStart, end, durationMs: end - filteredStart, live };
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
var ON_DARK_FILL = "--dsw-static-neutral-bluish-00";
var ON_LIGHT_FILL = "--dsw-alias-label-primary";
var LANE_COLOR_FALLBACKS = [
  // 0 — blue: the Lead. Never handed to a teammate.
  { bar: "--dsw-static-blue-600", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 1 — crimson deep
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-600) 70%, var(--dsw-static-blue-600) 30%) 92%, var(--dsw-static-neutral-bluish-1000) 8%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 2 — green light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 60%, var(--dsw-static-amber-500) 40%) 68%, var(--dsw-static-neutral-bluish-1000) 32%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 3 — violet light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-500) 35%, var(--dsw-static-blue-450) 65%) 88%, var(--dsw-static-neutral-bluish-1000) 12%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 4 — olive deep
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-400) 15%, var(--dsw-static-amber-500) 85%) 50%, var(--dsw-static-neutral-bluish-1000) 50%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 5 — magenta light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-blue-600) 40%, var(--dsw-static-red-400) 60%) 98%, var(--dsw-static-neutral-bluish-1000) 2%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 6 — teal light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-blue-500) 30%, var(--dsw-static-green-400) 70%) 68%, var(--dsw-static-neutral-bluish-1000) 32%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 7 — magenta deep
  { bar: "color-mix(in srgb, var(--dsw-static-red-500) 50%, var(--dsw-static-blue-800) 50%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 8 — green deep
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 60%, var(--dsw-static-amber-500) 40%) 54%, var(--dsw-static-neutral-bluish-1000) 46%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 9 — rose light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-500) 75%, var(--dsw-static-blue-600) 25%) 98%, var(--dsw-static-neutral-bluish-1000) 2%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 10 — teal deep
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 50%, var(--dsw-static-blue-900) 50%) 88%, var(--dsw-static-neutral-bluish-1000) 12%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 11 — orange deep
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-600) 45%, var(--dsw-static-amber-500) 55%) 60%, var(--dsw-static-neutral-bluish-1000) 40%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 12 — azure deep
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-400) 35%, var(--dsw-static-blue-500) 65%) 60%, var(--dsw-static-neutral-bluish-1000) 40%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 13 — orange light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-red-600) 40%, var(--dsw-static-amber-500) 60%) 76%, var(--dsw-static-neutral-bluish-1000) 24%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 14 — violet deep
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-blue-450) 70%, var(--dsw-static-red-600) 30%) 74%, var(--dsw-static-neutral-bluish-1000) 26%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 15 — olive light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 15%, var(--dsw-static-amber-500) 85%) 66%, var(--dsw-static-neutral-bluish-1000) 34%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // 16 — azure light
  { bar: "color-mix(in srgb, color-mix(in srgb, var(--dsw-static-green-500) 20%, var(--dsw-static-blue-400) 80%) 70%, var(--dsw-static-neutral-bluish-1000) 30%)", on: ON_DARK_FILL, onLight: ON_LIGHT_FILL }
];
function messageDetail(input, texts, formatTime, previewMax = MESSAGE_PREVIEW_MAX) {
  const marker = input;
  const body = marker.preview ?? "";
  const isUser = marker.from.kind === "user";
  const fromName = isUser ? texts.you : marker.from.name !== "" ? marker.from.name : marker.from.id;
  const toName = marker.to === void 0 || marker.to === null ? marker.laneName !== void 0 && marker.laneName !== "" ? marker.laneName : texts.recipientUnrecorded : marker.to.name !== "" && marker.to.name !== void 0 ? marker.to.name : marker.to.id;
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
  const dataWidth = win.durationMs / Math.max(1e-9, msPerPx);
  const axisExtentPx = num(input.axisExtentPx, dataWidth);
  const tickCount = Math.max(1, Math.floor(positive(input.tickCount, DEFAULT_TICK_COUNT)));
  const targetStep = msPerPx * Math.max(1, viewportWidth) / tickCount;
  const stepMs = pickTickStep(targetStep);
  const align = stepMs >= DAY_MS ? tzOffsetMinutes * MINUTE_MS : 0;
  const first = Math.ceil((win.start - align) / stepMs) * stepMs + align;
  const labelKind = stepMs < DAY_MS ? "time" : "date";
  const axisEndTime = axisExtentPx > dataWidth ? win.start + axisExtentPx * msPerPx : win.end;
  const ticks = [];
  let truncated = false;
  let time = first;
  while (time <= axisEndTime) {
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
  const gutterPx = axisExtentPx - dataWidth;
  const gutterHasTick = ticks.some((tick) => tick.x >= dataWidth - 0.5);
  if (gutterPx > 0.5 && !gutterHasTick) {
    const boundaryTime = win.start + dataWidth * msPerPx;
    const boundaryX = dataWidth;
    const alreadyThere = ticks.some((tick) => Math.abs(tick.x - boundaryX) < 0.5);
    if (!alreadyThere && ticks.length < MAX_TICKS) {
      ticks.push({
        time: boundaryTime,
        x: boundaryX,
        viewX: boundaryX - scrollLeft,
        stepMs,
        labelKind,
        label: formatTickLabel(boundaryTime, labelKind, tzOffsetMinutes),
        major: false,
        visible: boundaryX - scrollLeft >= -1 && boundaryX - scrollLeft <= viewportWidth + 1
      });
    }
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
  const win = computeWindow(data, now, options.windowSpanMs, options.anchorStartMs);
  const dataWidth = win.durationMs / msPerPx;
  const gutterPx = options.follow === true ? width * FOLLOW_GUTTER_RATIO : 0;
  const contentWidth = dataWidth + gutterPx;
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
    // The tick budget follows the AXIS, not just the visible strip: in follow mode the
    // canvas is a quarter wider than the viewport, and measuring the step against the
    // narrower viewport left the 62px gutter with no tick in it at all (measured: the
    // last tick sat at x=247 of a 310px canvas). With no gutter this is exactly `width`,
    // so the unfollowed board's ticks are unchanged.
    viewportWidth: Math.max(width, contentWidth),
    scrollLeft,
    axisExtentPx: contentWidth,
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
    const inRange = list.filter((message) => {
      const time = num(message?.time, Number.NaN);
      return Number.isFinite(time) && inWindow(time, time, win);
    });
    const kept = decimateMarkers(inRange, {
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
      const message = inRange[keptIndex];
      if (message === void 0) continue;
      const droppedBefore = countCandidatesBetween(inRange, previousCandidate, keptIndex, messageMode);
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
        // LANE-QUALIFIED, always. One message is folded onto BOTH the sender's
        // and the recipient's lane and keeps its `messageId`, so a bare
        // `messageId` key occurred twice in this one array. React then logged
        // "Encountered two children with the same key" and reconciled the list
        // against a duplicate key, which left markers from an EARLIER layout
        // pass frozen on screen after a zoom (issue 2: "缩放后 icon 定在那里
        // 不动并叠加"). The lane is part of the identity here regardless, since
        // the same message paints and points differently per lane.
        key: `${lane.id}:${message.messageId ?? `${message.kind}:${time}:${keptIndex}`}`,
        messageIndex: keptIndex,
        droppedBefore,
        x,
        y: laneY + MESSAGE_MARKER_TOP,
        w: MESSAGE_MARKER_WIDTH,
        h: MESSAGE_MARKER_HEIGHT,
        viewX,
        visible: rectVisible(viewX, MESSAGE_MARKER_WIDTH, width)
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
  const intersects = inWindow(startRaw, endRaw, win);
  return {
    laneId,
    laneIndex,
    kind: isTurn ? "turn" : "step",
    open,
    start: startRaw,
    end: endRaw,
    x,
    y: laneY + (isTurn ? ACTIVITY_TRACK_TOP : ACTIVITY_TRACK_TOP + (TURN_BAND_HEIGHT - STEP_BAR_HEIGHT) / 2),
    w,
    h: isTurn ? TURN_BAND_HEIGHT : STEP_BAR_HEIGHT,
    viewX,
    visible: intersects && viewX + w >= 0 && viewX <= viewportWidth,
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
  const stillRunning = task.status === "pending" || task.status === "in_progress";
  let live = false;
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
    if (stillRunning) {
      to = Math.max(to, win.end);
      live = true;
    }
    const x0 = clamp(from, win.start, win.end);
    const x1 = clamp(to, win.start, win.end);
    x = (x0 - win.start) / msPerPx;
    w = Math.max(TASK_BAR_MIN_WIDTH, (x1 - x0) / msPerPx);
  } else {
    x = Math.max(0, win.durationMs / msPerPx - TASK_MARKER_WIDTH);
    w = TASK_MARKER_WIDTH;
  }
  const viewX = x - scrollLeft;
  const intersects = inWindow(from, to, win);
  const clippedLeft = intersects && from < win.start;
  const labelPlacement = taskLabelPlacement(anchor, w);
  const labelX = x;
  const labelW = labelPlacement === "none" ? 0 : w;
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
    visible: intersects && viewX + w >= 0 && viewX <= viewportWidth,
    clippedLeft,
    live: live || anchor === "live",
    labelPlacement,
    labelX: labelPlacement === "inside" ? x : labelX,
    labelY: laneY + TASK_CARD_TOP,
    labelW: labelPlacement === "inside" ? w : labelW,
    labelH: TASK_CARD_HEIGHT
  };
}

// src/client/ui/GanttChart.tsx
var import_jsx_runtime = require("react/jsx-runtime");
var ZOOM_STEP = 1.5;
function lanePaint(token) {
  const name2 = token.trim();
  if (name2 === "") return "currentColor";
  if (name2.startsWith("var(") || name2.startsWith("color-mix(")) return name2;
  return `var(${name2})`;
}
var LANE_COLOR_FALLBACKS2 = LANE_COLOR_FALLBACKS;
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
var UNASSIGNED_FALLBACK = {
  bar: "--dsw-static-blue-800",
  on: "--dsw-static-neutral-bluish-00",
  onLight: "--dsw-alias-label-primary"
};
function laneColor(lane, index) {
  const given = lane.color;
  if (given !== void 0 && typeof given.bar === "string" && given.bar !== "") {
    const on = lanePaint(given.on ?? "--dsw-alias-label-primary-inverted");
    return { bar: lanePaint(given.bar), on, onLight: given.onLight === void 0 ? on : lanePaint(given.onLight) };
  }
  const pick = (slot) => {
    const entry = LANE_COLOR_FALLBACKS2[slot % LANE_COLOR_FALLBACKS2.length];
    return {
      bar: lanePaint(entry.bar),
      on: lanePaint(entry.on),
      onLight: entry.onLight === void 0 ? lanePaint(entry.on) : lanePaint(entry.onLight)
    };
  };
  if (lane.role === "lead") return pick(0);
  if (lane.id === "unassigned" || lane.role === "unknown") {
    return {
      bar: lanePaint(UNASSIGNED_FALLBACK.bar),
      on: lanePaint(UNASSIGNED_FALLBACK.on),
      onLight: lanePaint(UNASSIGNED_FALLBACK.onLight ?? UNASSIGNED_FALLBACK.on)
    };
  }
  const position = Number.isFinite(index) && index > 0 ? Math.floor(index) : 1;
  return pick(1 + (position - 1) % (LANE_COLOR_FALLBACKS2.length - 1));
}
function GanttChart(props) {
  const {
    data,
    now,
    visible,
    selectedTaskId,
    onSelectTask,
    navigate,
    selectedMessageKey,
    onSelectMessage,
    windowSpanMs,
    follow
  } = props;
  const scrollRef = (0, import_react.useRef)(null);
  const frameRef = (0, import_react.useRef)(0);
  const pendingScrollLeft = (0, import_react.useRef)(null);
  const [viewport, setViewport] = (0, import_react.useState)({ width: 0, height: 0 });
  const [scroll, setScroll] = (0, import_react.useState)({ left: 0, top: 0 });
  const [msPerPx, setMsPerPx] = (0, import_react.useState)(null);
  const [fitLatch, setFitLatch] = (0, import_react.useState)(null);
  const [anchorStart, setAnchorStart] = (0, import_react.useState)(null);
  const anchorKey = `${Math.max(1, viewport.width)}|${windowSpanMs ?? "all"}|${follow === true ? "on" : "off"}`;
  const [hoveredPopover, setHoveredPopover] = (0, import_react.useState)(null);
  (0, import_react.useEffect)(() => {
    const el = scrollRef.current;
    if (el === null) return;
    const onScroll2 = () => {
      setHoveredPopover((previous) => {
        if (previous === null) return null;
        const found = el.contains(previous.anchor) ? previous.anchor : null;
        return found === null ? null : previous;
      });
    };
    el.addEventListener("scroll", onScroll2, { passive: true });
    return () => el.removeEventListener("scroll", onScroll2);
  }, []);
  const win = (0, import_react.useMemo)(
    () => computeWindow(data, now, windowSpanMs, anchorStart),
    [data, now, windowSpanMs, anchorStart]
  );
  const live = data.live !== false;
  const fittedMsPerPx = fitMsPerPx(win.durationMs, Math.max(1, viewport.width));
  const followActive = follow === true;
  const anchorKeyRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const span = typeof windowSpanMs === "number" && windowSpanMs > 0 ? windowSpanMs : null;
    if (!followActive || span === null) {
      anchorKeyRef.current = anchorKey;
      setAnchorStart(null);
      return;
    }
    if (anchorKeyRef.current === anchorKey) return;
    anchorKeyRef.current = anchorKey;
    setAnchorStart(effectiveWindowStart(now, span, dataExtent(data, win.start).start));
  }, [anchorKey, followActive, windowSpanMs, now]);
  const fitKey = { width: Math.max(1, viewport.width), span: windowSpanMs ?? null };
  (0, import_react.useEffect)(() => {
    if (!followActive || msPerPx !== null) {
      setFitLatch(null);
      return;
    }
    setFitLatch(
      (previous) => previous !== null && previous.width === fitKey.width && previous.span === fitKey.span ? previous : { width: fitKey.width, span: fitKey.span, msPerPx: fittedMsPerPx }
    );
  });
  const effectiveMsPerPx = msPerPx ?? (followActive && fitLatch !== null ? fitLatch.msPerPx : fittedMsPerPx);
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset();
  const laneColors = (0, import_react.useMemo)(() => {
    const map = /* @__PURE__ */ new Map();
    data.lanes.forEach((lane, index) => map.set(lane.id, laneColor(lane, index)));
    return map;
  }, [data]);
  const laneIdOf = (0, import_react.useMemo)(() => speakerLaneMapper(data.lanes), [data]);
  const markerCount = data.lanes.reduce((total, lane) => total + (lane.messages?.length ?? 0), 0);
  const waitBandCount = data.lanes.reduce((total, lane) => total + (lane.waits?.length ?? 0), 0);
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
        windowSpanMs,
        // OPTION A: the pinned left boundary (null when not applicable).
        anchorStartMs: anchorStart,
        // Only FOLLOW mode gets the trailing gutter; with it off, contentWidth is
        // byte-for-byte the data width, which is what the layout's own locks assume.
        follow: follow === true
      }
    ),
    [data, now, effectiveMsPerPx, viewport.width, viewport.height, scroll.left, scroll.top, windowSpanMs, anchorStart, follow]
  );
  const syncScroll = (0, import_react.useCallback)(
    () => {
      const el = scrollRef.current;
      if (el === null) return;
      const top = el.scrollTop;
      const left = el.scrollLeft;
      setScroll((prev) => prev.left === left && prev.top === top ? prev : { left, top });
    },
    []
  );
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
  (0, import_react.useEffect)(() => {
    if (follow !== true) return;
    const { scrollTo } = shouldFollowScroll({
      follow: true,
      live: isLiveBoard(data),
      nowX: layout.nowX,
      viewportWidth: viewport.width,
      contentWidth: layout.contentWidth,
      scrollLeft: scroll.left
    });
    if (scrollTo === null) return;
    setScroll((previous) => previous.left === scrollTo ? previous : { ...previous, left: scrollTo });
    const el = scrollRef.current;
    if (el !== null) {
      el.scrollLeft = scrollTo;
      syncScroll();
    }
  }, [follow, data, layout.nowX, layout.contentWidth, viewport.width, scroll.left, syncScroll]);
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
      const next = clampZoomMsPerPx(requested, effectiveMsPerPx);
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
  const waitBands = (0, import_react.useMemo)(() => {
    const out = [];
    const laneWindow = { start: layout.window.start, end: layout.window.end };
    data.lanes.forEach((lane, index) => {
      const waits = lane.waits;
      if (waits === void 0 || waits.length === 0) return;
      out.push(
        ...waitBandRects(waits, {
          laneId: lane.id,
          laneIndex: index,
          windowStart: laneWindow.start,
          windowEnd: laneWindow.end,
          msPerPx: layout.msPerPx,
          cull: true,
          viewportWidth: Math.max(1, viewport.width),
          scrollLeft: scroll.left,
          laneY: DEFAULT_HEADER_HEIGHT + index * DEFAULT_LANE_HEIGHT,
          laneHeight: DEFAULT_LANE_HEIGHT
        })
      );
    });
    return out;
  }, [data, layout.window.start, layout.window.end, layout.msPerPx, viewport.width, scroll.left]);
  const isPopoverAnchor = (0, import_react.useCallback)(
    (element) => element !== null && element === hoveredPopover?.anchor,
    [hoveredPopover]
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
                          style: { top: lane.y, width: layout.dataWidth, height: lane.height }
                        },
                        lane.laneId
                      )),
                      layout.ticks.filter((tick) => tick.x <= layout.dataWidth + 1e-6).map((tick) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                        "span",
                        {
                          className: tick.major ? "dtg-gridline dtg-gridline-major" : "dtg-gridline",
                          style: { left: tick.x, height: layout.contentHeight }
                        },
                        `grid:${tick.time}`
                      )),
                      waitBands.map((band) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(WaitBand, { band }, `wait:${band.laneId}:${band.start}:${band.end ?? "open"}`)),
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
                          tzOffsetMinutes,
                          onHoverChange: (element) => {
                            if (element === null) {
                              setHoveredPopover(null);
                              return;
                            }
                            const resolved = markerPaint(marker, laneColors, laneIdOf, userPaint, systemPaint);
                            setHoveredPopover({
                              anchor: element,
                              kind: "message",
                              message: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                                MessagePopoverBody,
                                {
                                  kind: marker.kind,
                                  route: resolved.direction === "outgoing" ? `${uiLabel("messageSentTo")} ${resolved.peerName}` : `${uiLabel("messageReceivedFrom")} ${resolved.peerName}`,
                                  when: formatDateTime(marker.time, tzOffsetMinutes),
                                  preview: marker.preview ?? ""
                                }
                              )
                            });
                          },
                          isPopoverAnchor
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
                        msPerPx: layout.msPerPx,
                        color: laneColors.get(rect.laneId),
                        onHoverChange: (element) => {
                          setHoveredPopover(element === null ? null : { anchor: element, kind: "task", taskId: rect.task.id });
                        },
                        isPopoverAnchor
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
        hoveredPopover === null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HoverPopover, { anchor: hoveredPopover.anchor, children: hoveredPopover.kind === "message" ? hoveredPopover.message : (() => {
          const live2 = layout.tasks.find((rect) => rect.task.id === hoveredPopover.taskId)?.task;
          const task = live2 ?? data.tasks.find((candidate) => candidate.id === hoveredPopover.taskId);
          return task === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TaskPopoverBody, { task, tzOffsetMinutes, now });
        })() }),
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
          markerCount === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", title: uiLabel("messageLegendHint"), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-arrow", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowIcon, { className: "dtg-msg-arrow", direction: "out", ink: "currentColor" }) }),
              uiLabel("messageLegendSent")
            ] }),
            /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", title: uiLabel("messageLegendHint"), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-arrow", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowIcon, { className: "dtg-msg-arrow", direction: "in", ink: "currentColor" }) }),
              uiLabel("messageLegendReceived")
            ] }),
            waitBandCount === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item", title: uiLabel("waitLegendHint"), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-wait", "aria-hidden": "true" }),
              uiLabel("waitLegend")
            ] }),
            layout.droppedMessageCount === 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-legend-item", title: uiLabel("messageDroppedHint"), children: uiLabel("messageDropped", {
              shown: layout.messages.length,
              total: layout.messageCount
            }) })
          ] }),
          /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-item dtg-legend-events", title: uiLabel("historyLabel"), children: [
            uiLabel("historyLabel"),
            ["created", "claimed", "completed"].map((action) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-legend-event", title: historyActionText(action), children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { "aria-hidden": "true", children: TASK_EVENT_GLYPH[action] }),
              historyActionText(action)
            ] }, action))
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
  const activity = laneActivity(lane);
  const working = activity.working;
  const activityTip = activityTooltip(activity);
  const statusTitle = activityTip === null ? void 0 : activityTip.detail === null ? uiLabel(activityTip.fullKey) : `${uiLabel(activityTip.fullKey)}\uFF1A${activityTip.detail}`;
  const ink = `dtg-ink dtg-ink-${status}`;
  const spans = lane.spans.length;
  const messages = lane.messages?.length ?? 0;
  const navigation = lane.navigation;
  const navigable = navigation !== void 0 && navigate !== void 0;
  const aria = navigable ? `${uiLabel("laneAria", { name: lane.name, status: statusText(status), tasks: drawnTasks, spans })}, ${t("openSession")}` : uiLabel("laneAria", { name: lane.name, status: statusText(status), tasks: drawnTasks, spans });
  const detail = [
    lane.name,
    roleText(lane.role),
    statusText(status),
    lane.model ?? "",
    lane.createdAt === void 0 ? "" : formatDateTime(lane.createdAt, tzOffsetMinutes),
    lane.error ?? "",
    /** FULL phrasing here on purpose: the head row is compact, the tooltip is not. */
    messages > 0 && drawnTasks > 0 ? uiLabel("countsFullLabel", { tasks: drawnTasks, messages }) : messages > 0 ? uiLabel("messageCountLabel", { count: messages }) : drawnTasks > 0 ? `${drawnTasks} ${uiLabel("tasksLabel")}` : "",
    navigable ? t("openSession") : t("noSession")
  ].filter((part) => part !== "").join(" \xB7 ");
  const rowStyle = {
    height: box.height,
    ...color === void 0 ? {} : { borderLeftColor: color.bar }
  };
  const body = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-head-top", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ink, "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-dot", style: color === void 0 ? void 0 : { background: color.bar } }) }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
        "span",
        {
          className: "dtg-head-name",
          title: lane.name,
          style: color === void 0 ? void 0 : { background: color.bar, color: lanePaint(color.on) },
          children: lane.name
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: ink, "aria-hidden": "true", children: working ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-glyph", children: STATUS_GLYPH[status] ?? "\xB7" }) })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-head-meta", children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: "dtg-head-meta-text",
        title: messages > 0 ? uiLabel("messageCountLabel", { count: messages }) : void 0,
        children: [
          drawnTasks > 0 ? `${drawnTasks} ${uiLabel("tasksLabel")}` : null,
          messages > 0 ? `\u2709 ${messages}` : null
        ].filter((part) => part !== null).join(" \xB7 ")
      }
    ) }),
    activity.statusKey === null ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-head-activity", title: statusTitle, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-head-status", "aria-hidden": "true", children: uiLabel(activity.statusKey) }) })
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
        children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "span",
          {
            className: tick.x > layout.contentWidth - 60 ? "dtg-tick-label dtg-tick-label-flip" : "dtg-tick-label",
            children: tick.label
          }
        )
      },
      `tick:${tick.time}`
    )),
    marker === null || !marker.visible ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      "span",
      {
        className: live ? "dtg-now-head" : "dtg-now-head dtg-now-head-ended",
        style: { left: marker.x, ...flipLabel ? { transform: "translateX(-100%)" } : {} },
        title: live ? formatDateTime(marker.time, tzOffsetMinutes) : `${uiLabel("endedLabel")} ${formatDateTime(marker.time, tzOffsetMinutes)}`,
        children: live ? `${uiLabel("nowLabel")} ${formatClock(marker.time, tzOffsetMinutes, { seconds: false })}` : `${uiLabel("endedLabel")} ${formatClock(marker.time, tzOffsetMinutes, { seconds: false })}`
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
function WaitBand({ band }) {
  const classes = ["dtg-wait"];
  if (band.open) classes.push("dtg-wait-open");
  else if (band.timedOut === true) classes.push("dtg-wait-timeout");
  else if (band.timedOut === false) classes.push("dtg-wait-woken");
  else classes.push("dtg-wait-unknown");
  const seconds = band.end === null ? null : Math.round((band.end - band.start) / 1e3);
  const outcome = band.open ? uiLabel("waitOutcomeOpen") : band.timedOut === true ? uiLabel("waitOutcomeTimedOut") : band.timedOut === false ? uiLabel("waitOutcomeWoken") : uiLabel("waitOutcomeUnknown");
  const from = formatDateTime(band.start, -new Date(band.start).getTimezoneOffset());
  const label = seconds === null ? uiLabel("waitAriaOpen", { from, outcome }) : uiLabel("waitAria", { from, duration: uiLabel("waitSeconds", { count: seconds }), outcome });
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "span",
    {
      className: classes.join(" "),
      style: { left: band.x, top: band.y, width: band.w, height: band.h },
      title: label,
      "aria-label": label,
      "data-lane-wait": band.laneId,
      "data-wait-open": band.open ? "true" : "false",
      "data-wait-outcome": band.open ? "open" : band.timedOut === true ? "timeout" : band.timedOut === false ? "woken" : "unknown",
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-wait-cap dtg-wait-cap-start", "aria-hidden": "true" }),
        band.open ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-wait-cap dtg-wait-cap-end", "aria-hidden": "true" })
      ]
    }
  );
}
function spanTitle(span) {
  const head = span.open ? `${span.kind} \xB7 ${uiLabel("spanOpen")}` : span.kind;
  const parts = [head];
  if (span.turn !== void 0) parts.push(`turn ${span.turn}`);
  if (span.step !== void 0) parts.push(`step ${span.step}`);
  return parts.join(" \xB7 ");
}
function finiteOr(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function waitBandRects(waits, input) {
  const msPerPx = input.msPerPx > 0 ? input.msPerPx : 1;
  const width = input.viewportWidth ?? Number.POSITIVE_INFINITY;
  const scrollLeft = input.scrollLeft ?? 0;
  const toX = (time) => (clamp(time, input.windowStart, input.windowEnd) - input.windowStart) / msPerPx;
  const out = [];
  for (const wait of waits) {
    if (wait === null || typeof wait !== "object") continue;
    const start = finiteOr(wait.start, Number.NaN);
    if (!Number.isFinite(start)) continue;
    const resolvedEnd = finiteOr(wait.end ?? Number.NaN, Number.NaN);
    const open = wait.end === null || wait.end === void 0 || !Number.isFinite(resolvedEnd);
    const end = open ? null : resolvedEnd;
    const effectiveEnd = end === null ? input.windowEnd : end;
    if (!inWindow(start, effectiveEnd, { start: input.windowStart, end: input.windowEnd })) continue;
    const clippedLeft = start < input.windowStart;
    const startX = toX(start);
    const endX = end === null ? toX(input.windowEnd) : toX(end);
    const x = Math.min(startX, endX);
    const w = Math.max(1, Math.abs(endX - startX));
    const viewX = x - scrollLeft;
    const visible = viewX + w >= 0 && viewX <= width;
    if (input.cull === true && !visible) continue;
    out.push({
      laneId: input.laneId,
      laneIndex: input.laneIndex,
      start,
      end,
      open,
      timedOut: wait.timedOut,
      timeoutMs: wait.timeoutMs,
      x,
      w,
      clippedLeft,
      // On the ACTIVITY track, coinciding with the turn band and the step bar inside
      // it: the user asked for the wait to overlap the span ("等待的灰色条可以重合在
      // span，这样表达更清晰"), because a wait IS what the agent was doing during that
      // stretch — it was blocked on a teammate.
      y: (input.laneY ?? 0) + ACTIVITY_TRACK_TOP,
      h: ACTIVITY_TRACK_HEIGHT,
      capLeftX: x,
      capRightX: x + w,
      viewX,
      visible
    });
  }
  return out;
}
function shouldFollowScroll(input) {
  if (!input.follow || !input.live) return { scrollTo: null };
  const maxScroll = Math.max(0, input.contentWidth - input.viewportWidth);
  if (maxScroll <= 0) return { scrollTo: null };
  const nowViewX = input.nowX - input.scrollLeft;
  if (nowViewX < input.viewportWidth - 0.5) return { scrollTo: null };
  const gutter = input.margin ?? input.viewportWidth * FOLLOW_GUTTER_RATIO;
  const target = clamp(input.nowX - (input.viewportWidth - gutter), 0, maxScroll);
  if (Math.abs(target - input.scrollLeft) < 0.5) return { scrollTo: null };
  return { scrollTo: target };
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
  onSelect,
  onHoverChange,
  isPopoverAnchor
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
  const counterpart = color === void 0 ? void 0 : color.bar;
  const arrowInk = counterpart ?? "var(--dsw-alias-label-secondary)";
  const shape = outgoing ? "solid" : "hollow";
  const style = {
    left: marker.x,
    top: marker.y,
    width: marker.w,
    height: marker.h,
    background: "transparent",
    // The human's bubble is drawn in the panel's own primary ink, which flips with the
    // skin, and carries the SAME surface halo as every other marker. It used to be a
    // punched-out white disc with a two-tone ring and a dark glyph inside, which the
    // user described exactly: "变成一个白色框黑心的东西". A disc plus a ring plus a dark
    // centre is three shapes at 11px; the bubble alone is one, and it says what it means.
    color: isUser ? "var(--dsw-alias-label-primary)" : arrowInk
  };
  style.boxShadow = "0 0 0 1.5px var(--dsw-alias-bg-layer-1)";
  const interactive = typeof onSelect === "function";
  const Tag = interactive ? "button" : "span";
  const markerRef = (0, import_react.useRef)(null);
  const popoverOpen = interactive && (isPopoverAnchor?.(markerRef.current) ?? false);
  useSuspendedTitle(markerRef.current, popoverOpen);
  const reportHover = () => onHoverChange?.(markerRef.current);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    Tag,
    {
      ...interactive ? { ref: markerRef } : {},
      ...interactive ? { type: "button", onClick: () => onSelect(selected ? null : marker.key), "aria-pressed": selected } : {},
      className: classes.join(" "),
      style,
      title: `${when} \xB7 ${route}${peerNote}${dropped}`,
      "aria-label": label,
      ...interactive ? {
        onMouseEnter: reportHover,
        onMouseLeave: () => onHoverChange?.(null),
        onFocus: reportHover,
        onBlur: () => onHoverChange?.(null)
      } : {},
      "data-msg-kind": marker.kind,
      "data-msg-shape": shape,
      "data-msg-direction": paint.direction,
      "data-msg-peer": paint.peerName,
      "data-msg-key": marker.key,
      "data-msg-from": marker.from.id,
      ...marker.to === void 0 ? {} : { "data-msg-to": marker.to.id },
      children: [
        marker.kind === "turn" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-msg-glyph", "aria-hidden": "true", children: "\u25B8" }) : isUser ? (
          // The human's own prompt is not a lane transfer, so it does not get an arrow.
          // It used to draw the same arrow in the punched-out disc, which the user read as
          // "变成一个白色框黑心的东西" — a dark glyph inside a white ring says nothing about
          // WHO spoke. A speech bubble is the shape everyone already reads as "a person
          // typed this", and it is unmistakable next to the arrows.
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BubbleIcon, { className: "dtg-msg-bubble", ink: `var(${UR_MARKER_RING_TOKENS[0]})` })
        ) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowIcon, { className: "dtg-msg-arrow", direction: outgoing ? "out" : "in", ink: arrowInk }),
        marker.droppedBefore > 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-msg-count", "aria-hidden": "true", children: `+${marker.droppedBefore}` }) : null
      ]
    }
  );
}
function useSuspendedTitle(element, open) {
  const saved = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    const el = element;
    if (el === null) return;
    if (open) {
      if (saved.current === null) {
        saved.current = el.getAttribute("title");
        el.removeAttribute("title");
      }
      return;
    }
    if (saved.current !== null) {
      const restore = saved.current;
      saved.current = null;
      el.setAttribute("title", restore);
    }
  }, [element, open]);
  (0, import_react.useEffect)(
    () => () => {
      if (saved.current === null) return;
      element?.setAttribute("title", saved.current);
      saved.current = null;
    },
    [element]
  );
}
function HoverPopover({
  anchor,
  children
}) {
  const rect = anchor.getBoundingClientRect();
  const GAP = 6;
  const MARGIN = 8;
  const MAX_W = 280;
  const bounds = clipBounds(anchor);
  const width = Math.min(MAX_W, Math.max(120, bounds.width - 2 * MARGIN));
  const flipAbove = rect.bottom + GAP + 120 > bounds.bottom;
  const maxLeft = Math.max(bounds.left + MARGIN, bounds.right - width - MARGIN);
  const left = Math.min(Math.max(bounds.left + MARGIN, rect.left), maxLeft);
  const style = flipAbove ? { left, bottom: Math.max(0, bounds.bottom - rect.top + GAP), width } : { left, top: rect.bottom + GAP, width };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-popover", style, role: "tooltip", children });
}
function TaskPopoverBody({
  task,
  tzOffsetMinutes,
  now
}) {
  const times = taskRunTimes(task, now);
  const format2 = (time) => formatDateTime(time, tzOffsetMinutes);
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-popover-title", children: task.subject === "" ? "\u2014" : task.subject }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: "dtg-popover-meta", children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: `${uiLabel("taskCreatedAt")} ${format2(times.created)}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: `${uiLabel("taskStartedAt")} ${format2(times.started)}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: times.ended === null ? `${uiLabel("taskEndedAt")} \u2014 ${uiLabel("taskNotEnded")}` : `${uiLabel("taskEndedAt")} ${format2(times.ended)}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: `${uiLabel("taskDuration")} ${formatDuration(times.durationMs)}` }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: `${statusText(task.status)}${times.startedIsFallback ? ` \xB7 ${uiLabel("taskStartedFromCreated")}` : ""}` })
    ] })
  ] });
}
function MessagePopoverBody({
  kind,
  route,
  when,
  preview
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-popover-title", children: route }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-popover-meta", children: when }),
    preview === "" ? null : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-popover-desc", children: uiLabel("messagePopoverPreview") }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-popover-body", children: preview })
    ] }),
    kind === "turn" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "dtg-popover-meta", children: uiLabel("waitLegend") }) : null
  ] });
}
function ArrowIcon({
  className,
  direction,
  ink,
  size = 12
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      className,
      viewBox: "0 0 12 12",
      width: size,
      height: size,
      "aria-hidden": "true",
      focusable: "false",
      fill: "none",
      stroke: ink,
      strokeWidth: ARROW_STROKE,
      strokeLinecap: "round",
      strokeLinejoin: "round",
      transform: direction === "out" ? void 0 : "scale(-1,-1)",
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: ARROW_PATH })
    }
  );
}
function BubbleIcon({ className, ink }) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "svg",
    {
      className,
      viewBox: "0 0 12 12",
      width: 11,
      height: 11,
      "aria-hidden": "true",
      focusable: "false",
      style: { fill: "none", stroke: ink, strokeWidth: 1.4, strokeLinejoin: "round" },
      children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("path", { d: "M2.4 1.8 H9.6 A1.6 1.6 0 0 1 11.2 3.4 V7 A1.6 1.6 0 0 1 9.6 8.6 H6.1 L3.4 10.9 V8.6 H2.4 A1.6 1.6 0 0 1 0.8 7 V3.4 A1.6 1.6 0 0 1 2.4 1.8 Z" })
    }
  );
}
var ARROW_PATH = "M3.3 9.7 L6.6 6.4 M3.7 3 H9.8 V9.1";
var ARROW_STROKE = 2;
var TASK_EVENT_GLYPH = {
  created: "\uFF0B",
  claimed: "\u25B6",
  completed: "\u2713",
  reopened: "\u21BA",
  updated: "\xB7",
  observed: "\u25CC"
};
function taskEventMarks(rect, msPerPx) {
  if (!Number.isFinite(msPerPx) || msPerPx <= 0) return [];
  const seenAt = /* @__PURE__ */ new Map();
  const marks = [];
  for (const event of rect.task.history) {
    const offset = (event.time - rect.at) / msPerPx;
    if (!Number.isFinite(offset)) continue;
    const repeat = seenAt.get(event.time) ?? 0;
    seenAt.set(event.time, repeat + 1);
    marks.push({
      action: event.action,
      glyph: TASK_EVENT_GLYPH[event.action] ?? "\xB7",
      label: historyActionText(event.action),
      x: rect.x + offset,
      top: rect.barY + rect.barH + 1 + repeat,
      time: event.time
    });
  }
  return marks;
}
function TaskEventMarks({
  rect,
  msPerPx,
  ink,
  tzOffsetMinutes
}) {
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_jsx_runtime.Fragment, { children: taskEventMarks(rect, msPerPx).map((mark, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      className: "dtg-task-event",
      role: "img",
      "aria-label": format("taskEventAria", {
        time: formatDateTime(mark.time, tzOffsetMinutes),
        event: mark.label
      }),
      "data-task-event": mark.action,
      style: { left: mark.x, top: mark.top, color: ink },
      title: `${mark.label} \xB7 ${formatDateTime(mark.time, tzOffsetMinutes)}`,
      children: mark.glyph
    },
    `${mark.time}-${mark.action}-${index}`
  )) });
}
function TaskCard({
  rect,
  selected,
  onSelectTask,
  tzOffsetMinutes,
  msPerPx,
  color,
  onHoverChange,
  isPopoverAnchor
}) {
  const cardRef = (0, import_react.useRef)(null);
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
  const boxStyle = {
    left: rect.x,
    top: rect.barY,
    width: rect.w,
    height: rect.barH,
    // The agent colour is ONLY the 3px left edge (restored from 00e58a6^). The fill
    // stays the neutral surface token so the box reads as a label card, not as a
    // solid identity swatch: a solid agent-coloured box was what the user asked to
    // undo, while the geometry (one box, length = duration) stays as it is.
    ...color === void 0 ? {} : { borderLeftColor: color.bar }
  };
  const inside = rect.labelPlacement === "inside";
  const showEllipsis = rect.labelPlacement === "ellipsis";
  const subject = task.subject === "" ? "\u2014" : task.subject;
  const popoverOpen = isPopoverAnchor?.(cardRef.current) ?? false;
  useSuspendedTitle(cardRef.current, popoverOpen);
  const reportHover = () => {
    if (onHoverChange === void 0) return;
    onHoverChange(cardRef.current);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: "dtg-task-wrap", "data-task-id": task.id, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
      "button",
      {
        ref: cardRef,
        type: "button",
        className: `dtg-task dtg-ink-${task.status}${rect.live ? " dtg-task-live" : ""}`,
        style: boxStyle,
        title: full,
        "aria-label": aria,
        "aria-pressed": selected,
        onClick: () => onSelectTask(selected ? null : task.id),
        onKeyDown,
        onMouseEnter: reportHover,
        onMouseLeave: () => onHoverChange?.(null),
        onFocus: reportHover,
        onBlur: () => onHoverChange?.(null),
        "data-task-anchor": rect.anchor,
        "data-label-placement": rect.labelPlacement,
        children: [
          inside ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-subject", children: subject }) : null,
          showEllipsis ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "dtg-task-ellipsis", "aria-hidden": "true", children: "\u2026" }) : null
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
      TaskEventMarks,
      {
        rect,
        msPerPx,
        ink: color === void 0 ? "var(--dsw-alias-label-secondary)" : lanePaint(color.bar),
        tzOffsetMinutes
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
  /* The toolbar is its own horizontal scroller. Narrowing the panel used to wrap the
     labels ("\u65F6\u95F4\u6BB5" measured 2 lines at 480px and 3 at 420px and below), which made the
     row look broken. Nothing inside may wrap, and the row scrolls sideways instead of
     squeezing its controls. That range belongs to THIS element, deliberately NOT to
     the scroll container - a different element that has produced a phantom horizontal
     scroll twice in this project. */
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
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
/* Every direct child of the bar sizes to its content; a shrinking child is what let a
   label break onto a second line. The spacer above is the exception and absorbs slack. */
.dtg-bar > * { flex: 0 0 auto; }
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
  /* A control label never breaks across lines, at any panel width. */
  white-space: nowrap;
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
/* The agent's identity is a PILL around the name, not a hairline stripe: a 2px
   left border was too easy to miss (the user's words: "a very narrow stripe, not
   obvious"). The background is supplied INLINE by the renderer from the lane's
   own colour token, so this rule only owns the SHAPE and the ink \u2014 never a
   colour value, which would break the theme contract. */
/* The cap is what guarantees the status word a seat. Growing freely, the pill ate every
   free pixel of the row (it had no max width), so a long name would have pushed the
   status word and the spinner out instead of truncating itself. A name that does not fit
   ellipsises inside the pill \u2014 which is the intended degradation. */
.dtg-head-name {
  min-width: 0;
  flex: 1 1 auto;
  display: inline-block;
  /* NO max-width cap. One was added while the row held three items (pill + status word
     + spinner) so the word kept a seat; the status word has since moved to the meta line,
     and the cap was then the only thing still truncating names \u2014 measured: host-data
     needed 69px but was capped to 66px, against ~108px of free row. Without it the pill
     uses the row (and shrinks only if a name genuinely does not fit). */
  padding: 1px 6px;
  border-radius: 3px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxs-strong-12);
  /* A FALLBACK only \u2014 the real ink arrives INLINE from LaneColorTokens.on.
     A saturated lane fill needs the same light ink in both skins, and every theme alias
     that means "text on a fill" flips with the theme: the label-primary-inverted token is
     white in the light skin and a dark grey (fifty-three, fifty-four, fifty-six) in the
     dark one, which measured 2.34:1 on the blue fill \u2014 dark grey on blue. The static white
     does not flip, so it is both the ink the host sends and this default. */
  color: var(--dsw-static-neutral-bluish-00);
}
/* One fact per line. As a single flex row, role + status + task count + message
   count were squeezed into one line and then cut with an ellipsis, so the user
   could not read their own agent's state. Stacking them is the fix; the lane's
   height budget is accounted for in the geometry notes. */
/* ONE row. It used to stack status / task count / message count vertically; they are
   one line now ("\u662F\u4E0D\u662F\u53EF\u4EE5\u53D8\u6210\u4E00\u884C"), because the lane's height is set by the TRACK stack
   and those extra line boxes were padding the lane out for nothing. */
.dtg-head-meta {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0;
  min-width: 0;
  color: var(--dsw-alias-label-tertiary);
  font: var(--dsw-font-xxxs-11);
}
/* Deliberately NOT ellipsised: wrapping a short state word onto a second line
   keeps it readable, whereas an ellipsis hides information the user asked for.
   overflow-wrap keeps a long unbroken token (a model name) inside the lane. */
/* Never wraps: the whole point is one row. A long label truncates with an ellipsis
   inside the head column instead of pushing the row to two lines. */
.dtg-head-meta-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  /* The font is declared HERE, not inherited. When this line became a single row it
     picked up the root 16px instead of the meta's 11px (measured: font 16px, and the
     line then needed 141px in a 108px column, so the message count was ellipsised
     away). 11px measures 97px, which fits. */
  font: var(--dsw-font-xxxs-11);
  line-height: 1.2;
}
/* NOTE: there is deliberately no .dtg-head-role rule. The role badge was removed \u2014
   for the Lead it printed the same word as the name pill directly beneath it (the
   user's "\u4E0B\u9762\u591A\u4E86\u4E00\u4E2A\u767D\u8272\u6846+ agent\u540D\u79F0\uFF0C\u8FD9\u4E2A\u5DF2\u7ECF\u662F\u591A\u4F59\u7684\u4E86"), and removing it also
   returned 16px to a head column that had zero margin. The role still reaches the
   user through the row's tooltip and accessible name. */

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
/* The task WRAP is a zero-sized positioning context for one task: its box and the
   transition rail. */
.dtg-task-wrap { position: absolute; left: 0; top: 0; width: 0; height: 0; }

/* THE box. Its width is set inline from the real elapsed time and it has NO padding
   floor and NO minimum, so nothing about a label can stretch it.

   There used to be two objects here: a thin duration bar whose length was the elapsed
   time, and a label card at a FIXED 148px. The user read the fixed one as the task:
   "\u4EFB\u52A1\u6846\u7684\u957F\u5EA6\u5E94\u8BE5\u662F\u6309\u5B9E\u9645\u65F6\u95F4\u7EBF\u6765\uFF0C\u800C\u4E0D\u662F\u6709\u4E2A\u6700\u5C0F\u56FA\u5B9A\u957F\u5EA6\u5927\u5C0F".
   A fixed width carries no information and contradicted the bar beside it, so there is
   now ONE box whose LENGTH is the duration.

   Its PAINT went back to the pre-00e58a6 card at the user's request ("\u4EFB\u52A1\u6761\u80CC\u666F\u989C\u8272
   \u4E0D\u8981\u7528\u8DDF agent \u7684\u989C\u8272\uFF0C\u7528\u56DE\u4E4B\u524D\u90A3\u79CD"): a neutral surface whose only agent-coloured
   element is the 3px left edge. In between it was filled solid with the lane identity
   colour, which read as an identity swatch rather than as a task. */
.dtg-task {
  position: absolute;
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
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
/* The hover tint is painted as an INSET SHADOW, never by replacing the background.
   --dsw-alias-interactive-bg-hover is SEMI-TRANSPARENT (measured in a real browser at a
   black tint of six percent alpha), so replacing the background punched a hole through
   the box and let whatever sat behind show through \u2014 the "hovering a task puts a colour
   bar across its middle" defect. An inset shadow paints above the element's own
   background and below its content, so a translucent token tints and an opaque one
   covers, with no hole in either case. */
.dtg-task:hover { box-shadow: inset 0 0 0 999px var(--dsw-alias-interactive-bg-hover); }
.dtg-task:focus-visible { outline: 2px solid var(--dsw-alias-state-business-primary); outline-offset: 1px; }
.dtg-task[aria-pressed='true'] { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }

/* An OPEN task: its right edge is not a fact yet, so the box is squared off there and
   the edge is dashed. The fill stays the lane colour \u2014 a live task is still that lane's
   task \u2014 and the dash is what says "this end is still moving". */
.dtg-task-live {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border-right: 2px dashed currentColor;
}
/* A task with no dated history has no duration at all: a small solid marker, fixed
   width, so it is visible and clickable without pretending to be a span of time. */
.dtg-task[data-task-anchor='live'] {
  border-radius: 3px;
  justify-content: center;
  padding: 0;
}

/* The only label: drawn inside the box, truncated with a real ellipsis when the box
   is too narrow (the user: show less text rather than render it outside). The flex
   parent needs a zero min-width on the child to be allowed to shrink at all, and the
   container must not wrap, or the text would push the box's own layout around. */
.dtg-task-subject {
  min-width: 0;
  flex: 0 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font: var(--dsw-font-xxxs-strong-11);
}

/* The middle label tier: wide enough to admit text, too narrow to show any. A literal
   ellipsis, so the box never reads as empty/broken. */
.dtg-task-ellipsis {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
}

/* The hover/focus popover.
   Fixed positioning, and rendered OUTSIDE the scroll container: an absolutely-positioned
   descendant contributes to its ancestor's scrollable overflow, which is how a 148px
   caption once inflated the scroll container from 248 to 399 and broke the follow toggle.
   A none pointer-events value keeps it from stealing the hover that opened it, and the
   stacking order puts it above the chart without touching the layout. */
.dtg-popover {
  position: fixed;
  z-index: 40;
  pointer-events: none;
  padding: 6px 8px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
  color: var(--dsw-alias-label-primary);
  box-shadow: var(--dsw-shadow-lv2);
  font: var(--dsw-font-xxxs-11);
}
.dtg-popover {
  /* A hard ceiling so long text can never push the popover out of the panel. Now that
     the title WRAPS, this is the one place that bounds the height; the body scrolls.
     Measured against the longest subject on the demo fixture (see the task report):
     title + four meta facts stay well inside 200px, so the clamp does not bite. */
  max-height: 200px;
  overflow: auto;
}
/* The title WRAPS. The single-line ellipsis added in 0.2.15 was withdrawn by the user
   ("\u5C31\u8981\u5B8C\u6574\u663E\u793A\u6807\u9898\uFF0C\u4E0D\u80FD\u7F29\u7565\u4E86\uFF0C\u663E\u793A\u5B8C\u6574\u6807\u9898"), so there is deliberately no nowrap and
   no text-overflow here: a long subject must be readable in full rather than clipped. */
.dtg-popover-title {
  overflow-wrap: anywhere;
  font: var(--dsw-font-xxs-strong-12);
}
/* The four run facts. They WRAP as separate chips rather than ellipsising: a status
   like "\u5DF2\u5B8C\u6210" was being cut to "\u5DF2\u5B8C\u2026" when this was one nowrap line. */
.dtg-popover-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  overflow-wrap: anywhere;
}
.dtg-popover-desc {
  margin-top: 2px;
  overflow-wrap: anywhere;
  color: var(--dsw-alias-label-secondary);
}
.dtg-popover-meta {
  margin-top: 4px;
  color: var(--dsw-alias-label-tertiary);
}
/* A message preview can be long, so the popover caps its height instead of growing
   past the panel; the overflow scrolls (a tooltip that cannot be read is worse than
   one that scrolls). */
.dtg-popover-body {
  margin-top: 2px;
  max-height: 160px;
  overflow: auto;
  overflow-wrap: anywhere;
  white-space: pre-wrap;
  color: var(--dsw-alias-label-secondary);
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
/* The identity colour now rides on the name pill (inline) and on the dot; the
   row itself draws no stripe. */
.dtg-lane-mark .dtg-dot { background: var(--dsw-alias-label-dimmed); }

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

/* --- teammate filter menu ----------------------------------------------- */

/* The "working only" MODE row. Deliberately not a checkbox row: a switch track with a
   sliding knob plus a separator, so it reads as a mode that changes the whole view
   rather than one more teammate to tick. Theme tokens only, legible in both skins. */
.dtg-menu-mode {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 5px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--dsw-alias-label-primary);
  font: var(--dsw-font-xxxs-strong-11);
  text-align: left;
  cursor: pointer;
}
.dtg-menu-mode:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dtg-menu-mode-track {
  flex: 0 0 auto;
  width: 22px;
  height: 12px;
  border-radius: 6px;
  border: 1px solid var(--dsw-alias-border-l2);
  background: var(--dsw-alias-bg-layer-1);
  position: relative;
}
.dtg-menu-mode-knob {
  position: absolute;
  top: 1px;
  left: 1px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary);
}
.dtg-menu-mode-on .dtg-menu-mode-track {
  border-color: var(--dsw-alias-brand-primary);
}
.dtg-menu-mode-on .dtg-menu-mode-knob {
  left: 11px;
  background: var(--dsw-alias-brand-primary);
}
.dtg-menu-mode-on { color: var(--dsw-alias-brand-primary); }
.dtg-menu-mode-label {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dtg-menu-sep {
  height: 1px;
  margin: 3px 2px;
  background: var(--dsw-alias-border-l1);
}



/* Fixed-positioned and OUTSIDE the toolbar: an absolutely positioned descendant adds
   to its ancestor's scrollable overflow, and this panel would clip a child menu. The
   measured invariant is that the scroll container's scrollWidth/clientWidth are identical
   with the menu open and closed. */
.dtg-menu {
  position: fixed;
  z-index: 50;
  max-height: 240px;
  overflow: auto;
  padding: 4px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 6px;
  background: var(--dsw-alias-bg-layer-2);
  box-shadow: var(--dsw-shadow-lv2);
  font: var(--dsw-font-xxxs-11);
}
.dtg-menu-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 4px;
  color: var(--dsw-alias-label-primary);
  cursor: pointer;
}
.dtg-menu-row:hover { background: var(--dsw-alias-interactive-bg-hover); }
.dtg-menu-row-pinned { cursor: default; color: var(--dsw-alias-label-secondary); }
.dtg-menu-row-pinned:hover { background: transparent; }
.dtg-menu-name {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.dtg-menu-note {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-tertiary);
}
.dtg-menu input { margin: 0; flex: 0 0 auto; }

/* THE ACTIVITY LINE \u2014 its own row under the counts, per the user's "\u8FD9\u4E2A\u6587\u672C\u5E94\u8BE5\u51FA\u73B0\u5728\u7EDF\u8BA1
   \u6570\u636E\u7684\u4E0B\u65B9\uFF08\u4EFB\u52A1\u6570\u548C\u6D88\u606F\u6570\uFF09". It is a block row (not a flex row) so it owns the full head
   column width and can ellipsise on its own terms. Row height is one 11px line box, which
   the head has room for: measured inner content goes from ~43px to ~56px against the 65px
   available inside the 72px lane. */
.dtg-head-activity {
  min-width: 0;
  overflow: hidden;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  line-height: 1.2;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* The status word beside the spinner ("\u8FD0\u884C\u4E2D"). A fixed flex basis so it is never
   squeezed, and it is small text on the head background, so the ordinary label token
   gives it contrast in both skins. */
.dtg-head-status {
  flex: 0 0 auto;
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  white-space: nowrap;
}

/* --- working spinner (lane head) ---------------------------------------- */

/* A lane whose agent is working shows this instead of the static status glyph. Same
   IDEA as the dsh-turn-outline plugin's in-progress spinner, with our own markup,
   tokens and keyframes \u2014 nothing copied from it.

   Drawn with a BORDER RING, not a background image: a ring is one element, needs no
   asset, and takes its colours from currentColor + a theme token, so it is legible in
   both skins for free. 11px keeps it inside the head's existing 24px top row, and
   a fixed flex basis stops it being squeezed by a long name. */
.dtg-spin {
  display: block;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  border: 1.5px solid var(--dsw-alias-border-l2);
  border-top-color: currentColor;
  animation: dtg-spin 0.8s linear infinite;
}
@keyframes dtg-spin {
  to {
    transform: rotate(360deg);
  }
}
/* Respect the OS setting: no animation at all, and the ring still reads as a
   "something is happening here" dot rather than disappearing. */
@media (prefers-reduced-motion: reduce) {
  .dtg-spin {
    animation: none;
  }
}

/* --- wait blocks (wait_agent) ------------------------------------------- */

/* A wait is a PERIOD: it means "blocked, waiting for a teammate", which is the
   opposite of the turn/step bars it is now drawn ON ("working"). Distinguished from
   a message marker by TEXTURE, not by a new hue: the band is a faint wash with
   diagonal stripes cut out of it by a mask, so the stripe gradient carries no colour
   of its own.

   It shares the ACTIVITY track with the turn band and the step bar, at the user's
   request ("\u7B49\u5F85\u7684\u7070\u8272\u6761\u53EF\u4EE5\u91CD\u5408\u5728 span\uFF0C\u8FD9\u6837\u8868\u8FBE\u66F4\u6E05\u6670"), so WHICH ONE IS ON TOP
   matters. It has to be the band: the span's fill is opaque, and while the band
   painted under it the user could not see where the wait STARTED and ENDED at all.
   It used to paint under simply because the WaitBand element is rendered BEFORE the
   span bars inside dtg-layer and neither carried a z-index. Fixed with a stacking
   order rather than by moving the JSX, so that reordering the layer's children for
   some other reason cannot silently bury the band again. Kept below the axis (3) and
   the lane heads (4), which are the two things it may never cover. */
.dtg-wait {
  position: absolute;
  z-index: 2;
  border-radius: 2px;
  background: var(--dsw-alias-label-tertiary);
  opacity: 0.45;
}
.dtg-wait::after {
  content: '';
  position: absolute;
  inset: 0;
  /* The mask is what makes the stripes: repeating diagonal bands of transparent
     and opaque. No colour value is involved, so it survives every skin. */
  -webkit-mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
  mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
}
/* Outcome is carried by the END cap plus the band's texture, never by hue:
   - still blocking: no end cap, and the band fades out because that end has not
     happened yet;
   - timed out: the end cap is a tall bar ("the clock ran out");
   - a peer arrived: the end cap is a compact tick. */
.dtg-wait-open::after {
  -webkit-mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
  mask-image: repeating-linear-gradient(
    135deg,
    transparent 0 2px,
    var(--dsw-alias-bg-layer-1) 2px 4px
  );
}
.dtg-wait-open {
  -webkit-mask-image: linear-gradient(to right, var(--dsw-alias-bg-layer-1) 55%, transparent 100%);
  mask-image: linear-gradient(to right, var(--dsw-alias-bg-layer-1) 55%, transparent 100%);
}
.dtg-wait-timeout { opacity: 0.6; }
.dtg-wait-unknown { opacity: 0.3; }
/* The two ends the user asked to see. */
.dtg-wait-cap {
  position: absolute;
  top: -1px;
  bottom: -1px;
  width: 2px;
  background: var(--dsw-alias-label-primary);
  border-radius: 1px;
}
.dtg-wait-cap-start { left: 0; }
.dtg-wait-cap-end { right: 0; }
/* A timed-out wait gets a taller end bar, so "nobody came" is visible at a
   glance and not only in the tooltip. */
.dtg-wait-timeout .dtg-wait-cap-end { top: -3px; bottom: -3px; width: 3px; }
.dtg-wait-woken .dtg-wait-cap-end { width: 2px; }

/* Legend swatch for a wait block: the same striped band the chart draws, with
   its start cap visible so the legend explains both ends. */
.dtg-legend-wait {
  display: inline-block;
  width: 16px;
  height: 8px;
  border-radius: 2px;
  background: var(--dsw-alias-label-tertiary);
  opacity: 0.55;
  position: relative;
}
.dtg-legend-wait::before {
  content: '';
  position: absolute;
  left: 0;
  top: -2px;
  bottom: -2px;
  width: 2px;
  background: var(--dsw-alias-label-primary);
}
/* Controls in the toolbar: the range picker and the follow toggle. */
.dtg-control { display: inline-flex; align-items: center; gap: 3px; min-width: 0; }
.dtg-control-label { color: var(--dsw-alias-label-tertiary); font: var(--dsw-font-xxxs-11); white-space: nowrap; }
.dtg-select {
  max-width: 72px;
  /* A native select renders its value on one line; pin it so a narrow bar cannot
     turn the option text into two rows. */
  white-space: nowrap;
  padding: 1px 2px;
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 3px;
  background: var(--dsw-alias-bg-layer-1);
  color: var(--dsw-alias-label-secondary);
  font: var(--dsw-font-xxxs-11);
  -webkit-app-region: no-drag;
}
/* Follow ON reads as active by SHAPE weight, not only by hue. */
.dtg-btn-on {
  font: var(--dsw-font-xxs-strong-12);
  color: var(--dsw-alias-label-primary);
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

/* The key for the transition rail. It is a legend ITEM that holds sub-items, so it
   wraps; the glyphs are printed in ordinary ink, not a lane colour, because the key
   explains the SHAPE (the colour is per-lane and means nothing in a key). */
.dtg-legend-events {
  flex-wrap: wrap;
  gap: 6px;
  color: var(--dsw-alias-label-secondary);
}
.dtg-legend-event {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;
}
.dtg-legend-event > span:first-child {
  font: var(--dsw-font-xxxs-strong-11);
  color: var(--dsw-alias-label-primary);
}

/* --- task transition marks --------------------------------------------- */

/* One small glyph per dated transition, on a rail just under the bar.
   It is positioned from the event's OWN time (scaled by the same msPerPx as the bar),
   so it can be read against the bar's length. The rail is under the bar rather than on
   it because TASK_BAR_HEIGHT is the one measurement on this chart that must stay
   exactly proportional \u2014 overlaying glyphs on a 10px bar would cover it or force it
   taller, and either would undo the "bar length IS duration" rule. */
.dtg-task-event {
  position: absolute;
  font: var(--dsw-font-xxxs-strong-11);
  line-height: 1;
  pointer-events: none;
  /* Above the label chip. A task's LAST transition is by definition at the bar's right
     edge, which is exactly where an outside label chip begins \u2014 so without this the
     completed mark is painted under the chip and vanishes, which is the "\u6324\u5728\u4E00\u8D77"
     defect in a new place. Raised with a hairline of the chip's own surface behind it,
     so where a mark overlaps the card it reads as a badge on the card rather than as a
     glyph cut in half. */
  z-index: 1;
  box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-layer-2);
}

/* --- message markers --------------------------------------------------- */

/* The human's own prompt is a speech BUBBLE, not an arrow.
   It used to draw the lane arrow inside the punched-out disc, which the user read as
   "\u53D8\u6210\u4E00\u4E2A\u767D\u8272\u6846\u9ED1\u5FC3\u7684\u4E1C\u897F": a dark glyph in a white ring says nothing about who spoke.
   A filled bubble is the shape everyone already reads as "a person typed this", and it
   cannot be confused with the arrows that mean "this lane sent / received". */
.dtg-msg-bubble {
  display: block;
  flex: 0 0 auto;
  color: inherit;
}

/* The marker is an ARROW, and ONLY an arrow.
   Every earlier revision wrapped the glyph in something \u2014 first a 11px disc, then
   a solid/hollow plate \u2014 and the user's complaint was always the same: "\u5916\u9762\u8FD8\u6709\u4E2A
   \u6B63\u65B9\u5F62\u7684\u6846\u4F1A\u8BA9\u91CC\u9762\u7684\u5C16\u5934\u663E\u793A\u4E0D\u6E05\u6670". A frame competes with the tip of the arrow
   for the same few pixels. So the button keeps NO background, NO border and NO
   outline; the SVG path is the entire icon, which is what lets its 2px stroke and
   round caps stay crisp in the 11px track the layout reserves.
   Direction is carried by the arrow itself: it points \u2197 or \u2199, it is filled when
   this lane SENT the message and outlined when it received it, and it is painted
   in the counterpart's lane colour. */
.dtg-msg {
  position: absolute;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: none;
  border: 0;
  border-radius: 0;
  padding: 0;
  /* The decorative layer above is pointer-events: none so the lane background,
     gridlines, bands and spans never swallow a click. The marker is the one
     INTERACTIVE child, so it re-enables hit-testing here. Without this line the
     computed style inherits none, elementFromPoint never returns the marker,
     and clicking a "button" silently does nothing. */
  pointer-events: auto;
}
/* The arrow is INK-ONLY: no plate, no disc, no ring. currentColor is set per
   marker from the counterpart's lane FILL, so the icon carries the other lane's
   identity colour. A hairline of the panel surface behind it (set inline) keeps the
   arrow's edge readable even for a fill that is low-contrast on the panel. */
.dtg-msg-arrow {
  display: block;
  flex: 0 0 auto;
  color: inherit;
}
/* A comfortable hit target that does NOT move the arrow: the layout positions
   this box from the message's real time, so an offset would lie about when the
   message happened. An absolutely-positioned, transparent pseudo-element grows
   the clickable area outward without taking part in layout or paint. */
.dtg-msg[type='button']::before {
  content: '';
  position: absolute;
  top: -5px;
  right: -5px;
  bottom: -5px;
  left: -5px;
}
/* The human's own prompt keeps NO disc and NO ring: the bubble IS the marker.
   It used to be a punched-out white disc with a two-tone ring and an arrow inside, which
   the user described as "\u53D8\u6210\u4E00\u4E2A\u767D\u8272\u6846\u9ED1\u5FC3\u7684\u4E1C\u897F" \u2014 three shapes competing at 11px, and
   the dark glyph in the white ring said nothing about who spoke. The bubble's own outline
   supplies the contrast, and the shared surface halo (set inline, like every other
   marker) keeps it readable over any lane colour. */
.dtg-msg-user {
  background: none;
  border-radius: 0;
  box-shadow: none;
}
/* A turn marker is a context tick, not a message: it keeps the small flat glyph
   so it is never mistaken for a person's arrow. */
.dtg-msg-turn { background: none; }
.dtg-msg .dtg-msg-glyph { font-size: 10px; line-height: 1; }
/* The legend arrows use the SAME SVG geometry as the markers, so the key cannot
   drift from the thing it explains. */
.dtg-legend-arrow {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
}
.dtg-legend-arrow .dtg-msg-arrow { color: var(--dsw-alias-label-secondary); }

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
/* A tick label near the right edge sits to the LEFT of its own line, so the headroom's
   clock label is readable instead of clipped by the canvas. */
.dtg-tick-label-flip { transform: translateX(-100%); }

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
var WINDOW_SPAN_PRESETS = [
  { ms: 5 * 6e4, label: "5m" },
  { ms: 15 * 6e4, label: "15m" },
  { ms: 30 * 6e4, label: "30m" },
  { ms: 60 * 6e4, label: "1h" },
  { ms: 3 * 60 * 6e4, label: "3h" }
];
var POLL_MS = 5e3;
var NOW_MS = 1e3;
var styleMounts = 0;
function LaneFilterMenu({
  anchor,
  lanes,
  hidden,
  workingOnly,
  onToggle,
  onToggleWorking,
  onClose
}) {
  const ref = (0, import_react2.useRef)(null);
  (0, import_react2.useEffect)(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    const onPointer = (event) => {
      const target = event.target;
      if (target !== null && (ref.current?.contains(target) === true || anchor.contains(target))) return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onPointer);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointer);
    };
  }, [anchor, onClose]);
  const rect = anchor.getBoundingClientRect();
  const MARGIN = 6;
  const MIN_USABLE_H = 90;
  const MAX_H = 240;
  const space = overlaySpace(anchor);
  const boundsW = space.bounds.width;
  const boundsH = space.bounds.bottom - space.bounds.top;
  const relTop = rect.top - space.offsetY;
  const relLeft = rect.left - space.offsetX;
  const relBottom = relTop + rect.height;
  const width = Math.min(240, Math.max(120, boundsW - 2 * MARGIN));
  const roomBelow = boundsH - relBottom - 2 * MARGIN;
  const roomAbove = relTop - 2 * MARGIN;
  const flipAbove = roomBelow < MAX_H && roomAbove > roomBelow;
  const room = Math.max(0, flipAbove ? roomAbove : roomBelow);
  const maxHeight = Math.max(MIN_USABLE_H, Math.min(MAX_H, room));
  const maxLeft = Math.max(MARGIN, boundsW - width - MARGIN);
  const left = relLeft + width <= boundsW - MARGIN ? Math.max(MARGIN, relLeft) : maxLeft;
  const style = {
    left,
    top: flipAbove ? relTop - MARGIN - maxHeight : relBottom + MARGIN,
    maxHeight,
    width
  };
  const pinned = lanes.filter((lane) => isPinnedLane(lane));
  const filterable = lanes.filter((lane) => !isPinnedLane(lane));
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-menu", style, ref, role: "group", "aria-label": uiLabel("laneFilterLabel"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
      "button",
      {
        type: "button",
        className: workingOnly ? "dtg-menu-mode dtg-menu-mode-on" : "dtg-menu-mode",
        onClick: onToggleWorking,
        role: "switch",
        "aria-checked": workingOnly,
        "aria-label": uiLabel("laneFilterWorking"),
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-menu-mode-track", "aria-hidden": "true", children: /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-menu-mode-knob", "aria-hidden": "true" }) }),
          /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-menu-mode-label", children: uiLabel("laneFilterWorking") })
        ]
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-menu-sep", "aria-hidden": "true" }),
    pinned.map((lane) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-menu-row dtg-menu-row-pinned", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("input", { type: "checkbox", checked: true, disabled: true, "aria-label": `${lane.name} \xB7 ${uiLabel("laneFilterPinned")}`, readOnly: true }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-menu-name", children: lane.name }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-menu-note", children: uiLabel("laneFilterPinned") })
    ] }, lane.id)),
    filterable.map((lane) => /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "dtg-menu-row", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "input",
        {
          type: "checkbox",
          checked: !hidden.has(lane.id),
          onChange: () => onToggle(lane.id),
          "aria-label": lane.name
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-menu-name", children: lane.name })
    ] }, lane.id))
  ] });
}
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
  const [windowSpanMs, setWindowSpanMs] = (0, import_react2.useState)(null);
  const [follow, setFollow] = (0, import_react2.useState)(true);
  const [hiddenLanes, setHiddenLanes] = (0, import_react2.useState)(() => /* @__PURE__ */ new Set());
  const [workingOnly, setWorkingOnly] = (0, import_react2.useState)(false);
  const [filterOpen, setFilterOpen] = (0, import_react2.useState)(false);
  const filterButtonRef = (0, import_react2.useRef)(null);
  const shownData = (0, import_react2.useMemo)(
    () => data === null ? null : filterTimelineLanes(data, hiddenLanes, data.lanes, workingOnly),
    [data, hiddenLanes, workingOnly]
  );
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
    let found = null;
    for (const lane of data.lanes) {
      const list = lane.messages ?? [];
      for (let index = 0; index < list.length; index += 1) {
        const message = list[index];
        if (message === void 0) continue;
        const key = `${lane.id}:${message.messageId ?? `${message.kind}:${message.time}:${index}`}`;
        if (key !== selectedMessageKey) continue;
        found = {
          laneId: lane.id,
          // The lane's display name, so a missing recipient can be named
          // instead of printed as "unknown".
          laneName: lane.name !== "" ? lane.name : lane.id,
          message,
          direction: resolveMessageDirection(message, lane.id, laneIdOf).direction
        };
      }
    }
    return found;
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
  const toggleLane = (0, import_react2.useCallback)((laneId) => {
    setHiddenLanes((previous) => {
      const next = new Set(previous);
      if (next.has(laneId)) next.delete(laneId);
      else next.add(laneId);
      return next;
    });
  }, []);
  if (shownData === null) {
    return null;
  }
  if (data === null) {
    const failed = error !== null;
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-root", "data-dsh-task-gantt": "", "data-build": BUILD_LABEL, children: /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-center", role: failed ? "alert" : void 0, children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-center-title", children: failed ? t("errorTitle") : t("loading") }),
      failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: error }) : null,
      failed ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn", onClick: retry, children: t("retry") }) : null
    ] }) });
  }
  const tzOffsetMinutes = -new Date(now).getTimezoneOffset();
  const sourceChip = shownData.source === "log" ? { className: "dtg-chip", text: t("sourceLog") } : { className: "dtg-chip dtg-chip-warn", text: shownData.source === "partial" ? t("sourcePartial") : t("sourceLive") };
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-root", "data-dsh-task-gantt": "", "data-build": BUILD_LABEL, children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-bar", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: sourceChip.className, title: [t("sourceLog"), t("sourcePartial"), t("sourceLive")].join(" / "), children: sourceChip.text }),
      live ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip dtg-chip-live", children: uiLabel("nowLabel") }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip", title: uiLabel("frozenHint"), children: `${formatDateTime(shownData.range.start, tzOffsetMinutes)} \u2192 ${uiLabel("endedLabel")} ${formatDateTime(shownData.range.end ?? shownData.generatedAt, tzOffsetMinutes)}` }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("label", { className: "dtg-control", title: uiLabel("rangeHint"), children: [
        /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-control-label", children: uiLabel("rangeLabel") }),
        /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)(
          "select",
          {
            className: "dtg-select",
            "aria-label": uiLabel("rangeLabel"),
            value: windowSpanMs === null ? "all" : String(windowSpanMs),
            onChange: (event) => {
              const raw = event.target.value;
              setWindowSpanMs(raw === "all" ? null : Number(raw));
            },
            children: [
              /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: "all", children: uiLabel("rangeAll") }),
              WINDOW_SPAN_PRESETS.map((preset) => /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("option", { value: String(preset.ms), children: preset.label }, preset.ms))
            ]
          }
        )
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          className: follow ? "dtg-btn dtg-btn-on" : "dtg-btn",
          onClick: () => setFollow((value) => !value),
          title: uiLabel("followHint"),
          "aria-label": uiLabel("followLabel"),
          "aria-pressed": follow,
          children: `${uiLabel("followLabel")} ${follow ? "\u25CF" : "\u25CB"}`
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-spacer" }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "button",
        {
          type: "button",
          ref: filterButtonRef,
          className: "dtg-btn",
          onClick: () => setFilterOpen((open) => !open),
          title: uiLabel("laneFilterHint"),
          "aria-label": uiLabel("laneFilterLabel"),
          "aria-expanded": filterOpen,
          "aria-haspopup": "true",
          children: `${uiLabel("laneFilterLabel")} ${[
            workingOnly ? uiLabel("laneFilterWorkingActive") : null,
            hiddenLanes.size === 0 ? null : `\u2212${hiddenLanes.size}`
          ].filter((part) => part !== null).join(" \xB7 ") || "\xB7"}`
        }
      ),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-chip", title: `${t("tabTitle")} \xB7 ${shownData.lanes.length}`, children: `${shownData.tasks.length} ${uiLabel("tasksLabel")}` }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("button", { type: "button", className: "dtg-btn", onClick: retry, title: t("retry"), children: "\u27F3" })
    ] }),
    filterOpen && filterButtonRef.current !== null ? /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      LaneFilterMenu,
      {
        anchor: filterButtonRef.current,
        lanes: data.lanes,
        hidden: hiddenLanes,
        workingOnly,
        onToggle: toggleLane,
        onToggleWorking: () => setWorkingOnly((value) => !value),
        onClose: () => setFilterOpen(false)
      }
    ) : null,
    shownData.lanes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-center", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-center-title", children: t("emptyTitle") }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { children: t("emptyBody") }),
      error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { className: "dtg-notice-error", children: error })
    ] }) : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      GanttChart,
      {
        data: shownData,
        visible,
        now,
        selectedTaskId,
        onSelectTask,
        selectedMessageKey,
        onSelectMessage,
        navigate: onNavigate,
        windowSpanMs,
        follow
      }
    ),
    selectedTask === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      TaskDetails,
      {
        task: selectedTask,
        generatedAt: shownData.generatedAt,
        tzOffsetMinutes,
        onClose: () => setSelectedTaskId(null)
      }
    ),
    selectedMessage === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
      MessageDetails,
      {
        laneId: selectedMessage.laneId,
        laneName: selectedMessage.laneName,
        message: selectedMessage.message,
        direction: selectedMessage.direction,
        tzOffsetMinutes,
        onClose: () => setSelectedMessageKey(null)
      }
    ),
    error === null ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice dtg-notice-error", children: `${t("errorTitle")}: ${error}` }),
    shownData.failure === void 0 ? null : /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-notice dtg-notice-error", children: `${uiLabel("failureLabel")}: ${shownData.failure}` }),
    /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("div", { className: "dtg-build", "data-build": BUILD_LABEL, title: BUILD_LABEL, children: BUILD_LABEL })
  ] });
}
function MessageDetails({
  laneId,
  laneName,
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
      preview: message.preview,
      laneName
    },
    { you: t("you"), recipientUnrecorded: uiLabel("messageRecipientUnrecorded") },
    (time) => formatDateTime(time, tzOffsetMinutes)
  );
  const outgoing = detail.direction === "outgoing";
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details dtg-message-details", role: "region", "aria-label": uiLabel("messageDetailTitle"), children: [
    /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "dtg-details-head", children: [
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
        "span",
        {
          className: "dtg-details-title dtg-message-route",
          "data-message-route": detail.route,
          "data-message-direction": detail.direction,
          "data-message-from": detail.fromName,
          "data-message-to": detail.toName,
          children: detail.route
        }
      ),
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
    ctx.effect(() => watchForFirstTeam(ctx, mounted), FIRST_TEAM_EFFECT_LABEL);
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
    scoped.effect(() => watchForFirstTeam(scoped, service), FIRST_TEAM_EFFECT_LABEL);
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
var SESSIONS_SERVICE = "sessions";
var FIRST_TEAM_POLL_MS = 2e3;
var FIRST_TEAM_EFFECT_LABEL = "dsh-task-gantt: reveal on first team";
function countSubagentSessions(snapshot) {
  if (snapshot === null || typeof snapshot !== "object") return 0;
  const byId = snapshot.byId;
  if (byId === null || typeof byId !== "object") return 0;
  let count = 0;
  for (const summary of Object.values(byId)) {
    if (summary !== null && typeof summary === "object" && summary.origin === "subagent") {
      count += 1;
    }
  }
  return count;
}
function isFirstSubagentTransition(previous, next) {
  return previous === 0 && next > 0;
}
function watchForFirstTeam(ctx, service) {
  const reveal = service;
  const openTab = reveal.openTab;
  if (typeof openTab !== "function") return () => {
  };
  let timer;
  const stop = () => {
    if (timer !== void 0) clearInterval(timer);
    timer = void 0;
  };
  let previous;
  let done = false;
  const tick = () => {
    if (done) return;
    let next;
    try {
      const sessions = ctx.get(SESSIONS_SERVICE);
      next = countSubagentSessions(sessions?.list?.getSnapshot?.());
    } catch {
      return;
    }
    if (previous === void 0) {
      previous = next;
      return;
    }
    const first = isFirstSubagentTransition(previous, next);
    previous = next;
    if (!first) return;
    done = true;
    stop();
    if (reveal.isTabEnabled?.(TAB_TYPE_ID) === false) return;
    try {
      openTab.call(service, { type: TAB_TYPE_ID, title: t("tabTitle"), reveal: true });
    } catch {
    }
  };
  timer = setInterval(tick, FIRST_TEAM_POLL_MS);
  return stop;
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
