// src/shared/contract.ts
var API_VERSION = 1;
var ROUTE_PREFIX = "/dsh-task-gantt/api";

// src/host/timeline.ts
async function buildTimeline(ctx, sessionId) {
  void ctx;
  const now = Date.now();
  return {
    apiVersion: API_VERSION,
    sessionId,
    rootSessionId: sessionId,
    generatedAt: now,
    range: { start: now, end: null },
    lanes: [],
    tasks: [],
    source: "live",
    notes: ["timeline derivation not implemented yet"]
  };
}

// src/host/timeline-route.ts
async function readJsonBody(req, limit = 1 << 20) {
  const chunks = [];
  let size = 0;
  await new Promise((resolvePromise, rejectPromise) => {
    req.on("data", (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk));
      size += buf.length;
      if (size > limit) {
        rejectPromise(new Error("request body too large"));
        return;
      }
      chunks.push(buf);
    });
    req.on("end", () => resolvePromise());
    req.on("error", (error) => rejectPromise(error instanceof Error ? error : new Error(String(error))));
  });
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (text === "") return {};
  const parsed = JSON.parse(text);
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("request body must be a JSON object");
  }
  return parsed;
}
function writeJson(res, status, body) {
  const payload = JSON.stringify(body);
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(payload);
}
function writeError(res, status, code, message) {
  writeJson(res, status, { ok: false, error: { code, message } });
}
function sameOrigin(req) {
  const origin = req.headers.origin;
  if (typeof origin !== "string" || origin === "") return true;
  const host = req.headers.host;
  if (typeof host !== "string" || host === "") return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
function stringField(payload, key) {
  const value = payload[key];
  return typeof value === "string" && value !== "" ? value : void 0;
}
function buildTimelineHandler(ctx) {
  return async (req, res) => {
    if (!sameOrigin(req)) {
      writeError(res, 403, "forbidden", "same-origin requests only");
      return;
    }
    if (req.method !== "POST") {
      writeError(res, 405, "method-error", "POST only");
      return;
    }
    const pathname = new URL(req.url ?? "/", "http://dsh.internal").pathname;
    const prefix = `${ROUTE_PREFIX}/`;
    if (!pathname.startsWith(prefix) || pathname.slice(prefix.length).includes("/")) {
      writeError(res, 404, "not-found", "unknown dsh-task-gantt API method");
      return;
    }
    const method = pathname.slice(prefix.length);
    let payload;
    try {
      payload = await readJsonBody(req);
    } catch (error) {
      writeError(res, 400, "bad-request", error instanceof Error ? error.message : "invalid body");
      return;
    }
    try {
      if (method === "ping") {
        writeJson(res, 200, { ok: true, value: { apiVersion: API_VERSION, host: "dsh-task-gantt" } });
        return;
      }
      if (method === "timeline") {
        const sessionId = stringField(payload, "sessionId");
        if (sessionId === void 0) {
          writeError(res, 400, "bad-request", "sessionId is required");
          return;
        }
        const timeline = await buildTimeline(ctx, sessionId);
        writeJson(res, 200, { ok: true, value: timeline });
        return;
      }
      writeError(res, 404, "not-found", `unknown dsh-task-gantt API method "${method}"`);
    } catch (error) {
      ctx.logger?.warn?.(`dsh-task-gantt: ${method} failed: ${String(error)}`);
      writeError(res, 500, "internal-error", error instanceof Error ? error.message : String(error));
    }
  };
}

// src/host/index.ts
var name = "dsh-task-gantt";
var inject = [];
function apply(ctx) {
  const logger = ctx.logger ?? console;
  ctx.effect(
    () => {
      const webServer = ctx.get("webServer");
      if (webServer === void 0) {
        logger.warn?.("dsh-task-gantt: no webServer service; the Gantt panel will report an empty board");
        return () => {
        };
      }
      const handler = buildTimelineHandler(ctx);
      return webServer.register({ kind: "prefix", path: ROUTE_PREFIX, handler });
    },
    "dsh-task-gantt: /dsh-task-gantt/api routes"
  );
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
