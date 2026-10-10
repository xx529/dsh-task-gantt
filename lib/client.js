window.__ModuleLoader__.load({ id: "dsh-task-gantt", factory: (require) => { var module = { exports: {} }; var exports = module.exports;

"use strict";
var __dshTaskGanttModule = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
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

  // src/client/index.ts
  var index_exports = {};
  __export(index_exports, {
    apply: () => apply,
    inject: () => inject,
    name: () => name
  });
  var import_react2 = __require("react");

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
    noTask: "\u6682\u65E0\u4EFB\u52A1"
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
    noTask: "No tasks"
  };
  var locale = detectLocale();
  function detectLocale() {
    const lang = (typeof document !== "undefined" ? document.documentElement?.lang : "") || (typeof navigator !== "undefined" ? navigator.language : "") || "en";
    return /^zh/i.test(lang) ? "zh" : "en";
  }
  function t(key) {
    return locale === "zh" ? zh[key] : en[key];
  }

  // src/client/ui/BoardView.tsx
  var import_react = __require("react");

  // src/client/api.ts
  function routeUrl(method) {
    const path = `${ROUTE_PREFIX}/${method}`;
    const base = typeof document === "undefined" ? "/" : document.baseURI;
    return new URL(path.replace(/^\//, ""), base).toString();
  }
  async function postJson(method, body) {
    const res = await fetch(routeUrl(method), {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body)
    });
    const envelope = await res.json();
    if (!envelope.ok) throw new Error(`${envelope.error.code}: ${envelope.error.message}`);
    return envelope.value;
  }
  async function fetchTimeline(sessionId) {
    const value = await postJson("timeline", { sessionId, apiVersion: API_VERSION });
    return value;
  }

  // src/client/ui/BoardView.tsx
  var import_jsx_runtime = __require("react/jsx-runtime");
  function BoardView({ sessionId, visible }) {
    const [data, setData] = (0, import_react.useState)(null);
    const [error, setError] = (0, import_react.useState)(null);
    (0, import_react.useEffect)(() => {
      if (!visible) return;
      let cancelled = false;
      fetchTimeline(sessionId).then((value) => {
        if (!cancelled) {
          setData(value);
          setError(null);
        }
      }).catch((cause) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      });
      return () => {
        cancelled = true;
      };
    }, [sessionId, visible]);
    if (error !== null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { role: "alert", children: `${t("errorTitle")}: ${error}` });
    if (data === null) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: t("loading") });
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { "data-dsh-task-gantt": "", children: `${data.lanes.length} lanes \u2014 TODO(ui)` });
  }

  // src/client/index.ts
  var name = "dsh-task-gantt";
  var inject = [];
  function apply(ctx) {
    const sidebar = ctx.get("betterSidebar");
    if (sidebar === void 0) {
      ctx.logger?.warn?.("dsh-task-gantt: dsh-better-sidebar is not mounted; the Gantt tab stays dormant");
      return;
    }
    ctx.effect(
      () => sidebar.registerTab({
        id: TAB_TYPE_ID,
        title: () => t("tabTitle"),
        description: () => t("tabDescription"),
        order: 50,
        single: true,
        dedupeKey: () => TAB_TYPE_ID,
        component: ({ scope, visible }) => (0, import_react2.createElement)(BoardView, { sessionId: scope.sessionId, visible })
      }),
      "dsh-task-gantt: sidebar tab"
    );
  }
  return __toCommonJS(index_exports);
})();

return module.exports; } });
//# sourceMappingURL=client.js.map
