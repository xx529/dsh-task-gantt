// src/shared/contract.ts
var API_VERSION = 1;
var ROUTE_PREFIX = "/dsh-task-gantt/api";
var MESSAGE_PREVIEW_MAX = 16384;
var WAIT_TOOL_NAME = "wait_agent";

// src/host/fold.ts
var TASK_STATUSES = ["pending", "in_progress", "completed", "deleted"];
var MEMBER_PHASES = ["provisioning", "active", "failed"];
var UPDATE_ACTION_MAP = {
  claim: "claimed",
  complete: "completed",
  reopen: "reopened",
  release: "updated",
  edit: "updated",
  set_dependencies: "updated",
  reassign: "updated",
  delete: "updated"
};
function asFiniteNumber(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function asPositiveInt(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : void 0;
}
function asText(value) {
  if (typeof value !== "string") return void 0;
  const text2 = value.trim();
  return text2 === "" ? void 0 : text2;
}
function asRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? value : void 0;
}
function asTextArray(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const text2 = asText(item);
    if (text2 !== void 0) out.push(text2);
  }
  return out;
}
function indexEvents(events) {
  return events.map((event, index) => {
    const raw = asRecord(event);
    const seq = raw === void 0 ? void 0 : asFiniteNumber(raw.seq);
    const time = raw === void 0 ? void 0 : asFiniteNumber(raw.time);
    return { event, index, seq: seq === void 0 ? index : seq, time };
  });
}
function inLogOrder(indexed) {
  return [...indexed].sort((a, b) => a.seq - b.seq || a.index - b.index);
}
function inTimeOrder(indexed) {
  return indexed.filter((item) => item.time !== void 0).sort((a, b) => a.time - b.time || a.seq - b.seq || a.index - b.index);
}
function countUndated(indexed) {
  let undated = 0;
  for (const item of indexed) if (item.time === void 0) undated += 1;
  return undated;
}
function countMalformed(indexed) {
  let malformed = 0;
  for (const item of indexed) {
    const raw = asRecord(item.event);
    if (raw === void 0 || typeof raw.type !== "string" || raw.type === "") malformed += 1;
  }
  return malformed;
}
function eventType(item) {
  const raw = asRecord(item.event);
  return raw === void 0 ? void 0 : asText(raw.type);
}
function eventData(item) {
  const raw = asRecord(item.event);
  return raw === void 0 ? void 0 : asRecord(raw.data);
}
function emptyDiagnostics(events) {
  return {
    events,
    malformed: 0,
    undated: 0,
    orphanCloses: 0,
    openSpans: 0,
    rewoundTransitions: 0
  };
}
function close(span, end) {
  const emitted = {
    kind: span.kind,
    start: span.start,
    end: end === null ? null : Math.max(span.start, end)
  };
  if (span.turn !== void 0) emitted.turn = span.turn;
  if (span.step !== void 0) emitted.step = span.step;
  return emitted;
}
function foldActivitySpans(events) {
  const indexed = indexEvents(events);
  const diagnostics = emptyDiagnostics(events.length);
  diagnostics.malformed = countMalformed(indexed);
  diagnostics.undated = countUndated(indexed);
  const ordered = inTimeOrder(indexed);
  const spans = [];
  let openStep;
  let openTurn;
  const settle = (pending, end) => {
    if (pending === void 0) return;
    spans.push(close(pending, end));
    if (end === null) diagnostics.openSpans += 1;
  };
  for (const item of ordered) {
    const type = eventType(item);
    const time = item.time;
    if (type === void 0 || time === void 0) continue;
    const data = eventData(item);
    const turn = data === void 0 ? void 0 : asPositiveInt(data.turn);
    const step = data === void 0 ? void 0 : asPositiveInt(data.step);
    switch (type) {
      case "step/start": {
        settle(openStep, time);
        openStep = { kind: "step", start: time, index: item.index, turn, step };
        break;
      }
      case "step/end": {
        if (openStep === void 0) {
          diagnostics.orphanCloses += 1;
        } else {
          settle(openStep, time);
          openStep = void 0;
        }
        break;
      }
      case "turn/start": {
        settle(openTurn, time);
        openTurn = { kind: "turn", start: time, index: item.index, turn };
        break;
      }
      case "turn/end": {
        if (openTurn === void 0) {
          diagnostics.orphanCloses += 1;
        } else {
          settle(openTurn, time);
          openTurn = void 0;
        }
        break;
      }
      default:
        break;
    }
  }
  settle(openStep, null);
  settle(openTurn, null);
  const kindRank = (span) => span.kind === "turn" ? 0 : 1;
  spans.sort((a, b) => a.start - b.start || kindRank(a) - kindRank(b));
  return { spans, diagnostics };
}
var USER_SOURCE_KIND = "user";
var PREVIEW_MAX = 16384;
function previewOf(value) {
  const collapsed = collapseWhitespace(value);
  if (collapsed === "") return void 0;
  return collapsed.length <= PREVIEW_MAX ? collapsed : `${collapsed.slice(0, PREVIEW_MAX - 1)}\u2026`;
}
function previewFromText(content) {
  if (!Array.isArray(content)) return "";
  const parts = [];
  for (const item of content) {
    const record = asRecord(item);
    if (record === void 0) continue;
    const value = record.text;
    if (typeof value === "string" && value !== "") parts.push(value);
  }
  return parts.join(" ");
}
function collapseWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}
function previewFromContent(content) {
  if (!Array.isArray(content)) return void 0;
  const parts = [];
  for (const item of content) {
    const record = asRecord(item);
    if (record === void 0) continue;
    const value = record.text;
    if (typeof value === "string" && value !== "") parts.push(value);
  }
  if (parts.length === 0) return void 0;
  return previewOf(parts.join(" "));
}
function foldMessageRecords(events) {
  const indexed = inLogOrder(indexEvents(events));
  const diagnostics = {
    queued: 0,
    delivered: 0,
    unpairedDeliveries: 0,
    userPrompts: 0,
    injectedUserMessages: 0,
    truncatedBodies: 0
  };
  const queues = /* @__PURE__ */ new Map();
  const deliveries = /* @__PURE__ */ new Map();
  const deliveryOrder = [];
  const userPrompts = [];
  for (const item of indexed) {
    const type = eventType(item);
    const time = item.time;
    const data = eventData(item);
    if (type === void 0 || data === void 0) continue;
    if (type === "team/message/queued") {
      const message = asRecord(data.message);
      if (message === void 0) continue;
      const messageId = asText(message.id);
      if (messageId === void 0 || time === void 0) continue;
      diagnostics.queued += 1;
      const record = { messageId, queuedAt: time, seq: item.seq };
      const senderId = asText(message.senderId);
      if (senderId !== void 0) record.senderId = senderId;
      const senderName = asText(message.senderName);
      if (senderName !== void 0) record.senderName = senderName;
      const targetId = asText(message.targetId);
      if (targetId !== void 0) record.targetId = targetId;
      const preview = previewFromContent(message.content);
      if (preview !== void 0) {
        record.preview = preview;
        const collapsed = collapseWhitespace(previewFromText(message.content));
        if (collapsed.length > PREVIEW_MAX) {
          record.truncated = true;
          diagnostics.truncatedBodies += 1;
        }
      }
      if (!queues.has(messageId)) queues.set(messageId, record);
      continue;
    }
    if (type === "team/message/delivered") {
      const messageId = asText(data.messageId);
      if (messageId === void 0 || time === void 0) continue;
      diagnostics.delivered += 1;
      if (!deliveries.has(messageId)) deliveryOrder.push(messageId);
      const targetId = asText(data.targetId);
      const entry = { time, seq: item.seq };
      if (targetId !== void 0) entry.targetId = targetId;
      deliveries.set(messageId, entry);
      continue;
    }
    if (type === "user/message") {
      const source = asRecord(data.source);
      const sourceKind = asText(source?.kind);
      if (sourceKind !== USER_SOURCE_KIND) {
        if (sourceKind !== void 0) diagnostics.injectedUserMessages += 1;
        continue;
      }
      if (time === void 0) continue;
      diagnostics.userPrompts += 1;
      const prompt = { time, seq: item.seq, sourceKind };
      const preview = previewFromContent(data.content);
      if (preview !== void 0) prompt.preview = preview;
      userPrompts.push(prompt);
    }
  }
  const records = [];
  for (const record of queues.values()) {
    const delivered = deliveries.get(record.messageId);
    const merged = { ...record };
    if (delivered !== void 0) {
      merged.deliveredAt = delivered.time;
      if (merged.targetId === void 0 && delivered.targetId !== void 0) {
        merged.targetId = delivered.targetId;
      }
    }
    records.push(merged);
  }
  for (const messageId of deliveryOrder) {
    if (queues.has(messageId)) continue;
    const delivered = deliveries.get(messageId);
    if (delivered === void 0) continue;
    diagnostics.unpairedDeliveries += 1;
    const record = {
      messageId,
      deliveredAt: delivered.time,
      seq: delivered.seq
    };
    if (delivered.targetId !== void 0) record.targetId = delivered.targetId;
    records.push(record);
  }
  const orderOf = (record) => record.queuedAt ?? record.deliveredAt ?? 0;
  records.sort((a, b) => orderOf(a) - orderOf(b) || a.seq - b.seq);
  userPrompts.sort((a, b) => a.time - b.time || a.seq - b.seq);
  return { records, userPrompts, diagnostics };
}
function readTaskSnapshot(data) {
  const task = asRecord(data.task);
  if (task === void 0) return void 0;
  const id = asText(task.id);
  const revision = asPositiveInt(task.revision);
  const status = asText(task.status);
  if (id === void 0 || revision === void 0 || status === void 0) return void 0;
  if (!TASK_STATUSES.includes(status)) return void 0;
  const snapshot = {
    id,
    revision,
    subject: typeof task.subject === "string" ? task.subject : "",
    description: typeof task.description === "string" ? task.description : "",
    status,
    blockedBy: asTextArray(task.blockedBy),
    writeScopes: asTextArray(task.writeScopes)
  };
  const ownerId = asText(task.ownerId);
  if (ownerId !== void 0) snapshot.ownerId = ownerId;
  return snapshot;
}
function readMemberSnapshot(data) {
  const member = asRecord(data.member);
  if (member === void 0) return void 0;
  const id = asText(member.id);
  const name2 = asText(member.name);
  const phase = asText(member.phase);
  if (id === void 0 || name2 === void 0 || phase === void 0) return void 0;
  if (!MEMBER_PHASES.includes(phase)) return void 0;
  const read = {
    id,
    name: name2,
    phase
  };
  const description = asText(member.description);
  if (description !== void 0) read.description = description;
  const error = asText(member.error);
  if (error !== void 0) read.error = error;
  return read;
}
function deriveTaskAction(previous, next) {
  if (previous === void 0) {
    if (next.revision === 1) return "created";
    if (next.status === "in_progress") return "claimed";
    if (next.status === "completed") return "completed";
    return "updated";
  }
  if (previous.status !== "completed" && next.status === "completed") return "completed";
  if (previous.status === "completed" && next.status !== "completed") return "reopened";
  if (previous.status !== "in_progress" && next.status === "in_progress") return "claimed";
  return "updated";
}
var SUBAGENT_TOOL_NAMES = ["subagent", "subagent_spawn", "subagent_fork"];
var SUBAGENT_ACK = /\bstarted subagent\s+(session-)?([0-9a-fA-F][0-9a-fA-F-]{7,})/;
function dispatchDescription(argumentsRaw) {
  if (typeof argumentsRaw !== "string") return "";
  let parsed;
  try {
    parsed = JSON.parse(argumentsRaw);
  } catch {
    return "";
  }
  const args = asRecord(parsed);
  return args === void 0 ? "" : asText(args.description) ?? "";
}
function ackChildId(message) {
  if (message === void 0) return void 0;
  const content = message.content;
  if (!Array.isArray(content)) return void 0;
  let text2 = "";
  for (const block of content) {
    const record = asRecord(block);
    if (record === void 0) continue;
    if (typeof record.text === "string") text2 += record.text;
  }
  const match = SUBAGENT_ACK.exec(text2);
  return match?.[2];
}
function foldSubagentDispatches(events) {
  const byCallId = /* @__PURE__ */ new Map();
  const out = [];
  for (const item of inLogOrder(indexEvents(events))) {
    const type = eventType(item);
    const data = eventData(item);
    if (data === void 0) continue;
    if (type === "tool/call") {
      const name2 = asText(data.name);
      const callId2 = asText(data.callId);
      const time = item.time;
      if (name2 === void 0 || callId2 === void 0 || time === void 0) continue;
      if (!SUBAGENT_TOOL_NAMES.includes(name2)) continue;
      const dispatch2 = {
        time,
        callId: callId2,
        childId: "",
        description: dispatchDescription(data.arguments)
      };
      byCallId.set(callId2, dispatch2);
      out.push(dispatch2);
      continue;
    }
    if (type !== "tool/result") continue;
    const message = asRecord(data.message);
    const source = message === void 0 ? void 0 : asRecord(message.source);
    const callId = asText(source?.callId) ?? asText(message?.toolCallId) ?? asText(data.callId);
    if (callId === void 0) continue;
    const dispatch = byCallId.get(callId);
    if (dispatch === void 0) continue;
    const childId = ackChildId(message);
    if (childId !== void 0) dispatch.childId = childId;
  }
  return out.filter((dispatch) => dispatch.childId !== "");
}
function foldTeamEvents(events, sessionId) {
  const indexed = indexEvents(events);
  const diagnostics = emptyDiagnostics(events.length);
  diagnostics.malformed = countMalformed(indexed);
  diagnostics.undated = countUndated(indexed);
  const team = {
    tasks: [],
    taskById: /* @__PURE__ */ new Map(),
    members: [],
    memberById: /* @__PURE__ */ new Map(),
    memberIdByName: /* @__PURE__ */ new Map(),
    diagnostics
  };
  const descriptionByChildId = /* @__PURE__ */ new Map();
  for (const dispatch of foldSubagentDispatches(events)) {
    if (dispatch.description === "") continue;
    if (!descriptionByChildId.has(dispatch.childId)) descriptionByChildId.set(dispatch.childId, dispatch.description);
  }
  for (const item of inLogOrder(indexed)) {
    const type = eventType(item);
    if (type === void 0) continue;
    if (type === "session/title") {
      const data = eventData(item);
      if (data === void 0) continue;
      const title = asText(data.title);
      const source = asRecord(data.source);
      if (title === void 0 || asText(source?.kind) === "fallback") continue;
      team.sessionTitle ??= title;
      continue;
    }
    if (type === "session") {
      const flat = asRecord(item.event) ?? {};
      const nested = eventData(item);
      const source = nested === void 0 ? flat : { ...flat, ...nested };
      team.sessionId ??= asText(source.id);
      team.sessionCreatedAt ??= asFiniteNumber(source.createdAt);
      team.sessionParentId ??= asText(source.parentSession);
      continue;
    }
    if (type === "subagent/catalog") {
      const data = eventData(item);
      if (data === void 0) continue;
      const childId = asText(data.childId);
      const childCreatedAt = asFiniteNumber(data.childCreatedAt);
      if (childId === void 0 || childCreatedAt === void 0) continue;
      const existing = team.memberById.get(childId);
      if (existing !== void 0) {
        existing.childCreatedAt ??= childCreatedAt;
        continue;
      }
      const label = asText(data.label);
      const description = descriptionByChildId.get(childId);
      const name2 = label ?? description;
      const placeholder = {
        id: childId,
        name: name2 ?? childId,
        ...name2 === void 0 ? { nameIsFallback: true } : {},
        // NO `phase`: a catalog row says the child session was CREATED, which is not
        // evidence of `provisioning`. Writing one here pinned the lane's status to
        // `provisioning` forever (the permanent spinner).
        firstSeenAt: item.time ?? childCreatedAt,
        lastSeenAt: item.time ?? childCreatedAt,
        phases: [],
        childCreatedAt
      };
      team.memberById.set(childId, placeholder);
      team.members.push(placeholder);
      continue;
    }
    if (type === "team/member") {
      const data = eventData(item);
      const time = item.time;
      if (data === void 0 || time === void 0) continue;
      const member = readMemberSnapshot(data);
      if (member === void 0) continue;
      let record = team.memberById.get(member.id);
      if (record === void 0) {
        record = {
          id: member.id,
          name: member.name,
          phase: member.phase,
          firstSeenAt: time,
          lastSeenAt: time,
          phases: []
        };
        team.memberById.set(member.id, record);
        team.members.push(record);
      }
      if (!team.memberIdByName.has(member.name)) team.memberIdByName.set(member.name, member.id);
      record.name = member.name;
      delete record.nameIsFallback;
      record.phase = member.phase;
      record.lastSeenAt = time;
      if (member.description !== void 0) record.description = member.description;
      if (member.error !== void 0) record.error = member.error;
      record.phases.push({ phase: member.phase, time });
      continue;
    }
    if (type === "team/task") {
      const data = eventData(item);
      const time = item.time;
      if (data === void 0 || time === void 0) continue;
      const snapshot = readTaskSnapshot(data);
      if (snapshot === void 0) continue;
      let record = team.taskById.get(snapshot.id);
      if (record === void 0) {
        record = { id: snapshot.id, snapshot, createdAt: time, transitions: [] };
        record.transitions.push({ time, action: deriveTaskAction(void 0, snapshot), revision: snapshot.revision, sessionId });
        team.taskById.set(snapshot.id, record);
        team.tasks.push(record);
        continue;
      }
      if (snapshot.revision <= record.snapshot.revision) {
        diagnostics.rewoundTransitions += 1;
        continue;
      }
      const action = deriveTaskAction(record.snapshot, snapshot);
      record.snapshot = snapshot;
      record.transitions.push({ time, action, revision: snapshot.revision, sessionId });
      continue;
    }
  }
  for (const record of team.tasks) {
    record.transitions.sort((a, b) => a.time - b.time);
  }
  return team;
}
function parseToolArguments(value) {
  if (typeof value !== "string") return void 0;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return void 0;
  }
}
function foldWaitSpans(events, sessionId) {
  const indexed = indexEvents(events);
  const ends = /* @__PURE__ */ new Map();
  const starts = [];
  for (const item of indexed) {
    const type = eventType(item);
    const time = item.time;
    if (time === void 0) continue;
    const data = eventData(item);
    if (data === void 0) continue;
    if (type === "tool/call") {
      if (asText(data.name) !== WAIT_TOOL_NAME) continue;
      const callId = asText(data.callId);
      if (callId === void 0) continue;
      const args = parseToolArguments(data.arguments);
      starts.push({
        callId,
        time,
        timeoutMs: args === void 0 ? void 0 : asPositiveInt(args.timeout_ms),
        seq: item.seq
      });
      continue;
    }
    if (type === "tool/result") {
      const message = asRecord(data.message);
      if (message === void 0) continue;
      const source = asRecord(message.source);
      const callId = asText(message.toolCallId) ?? (source === void 0 ? void 0 : asText(source.callId));
      if (callId === void 0) continue;
      const previous = ends.get(callId);
      const timedOut = parseTimedOut(message.content);
      if (previous === void 0 || time < previous.time || time === previous.time && (item.seq ?? 0) < (previous.seq ?? 0)) {
        ends.set(callId, { time, timedOut, seq: item.seq });
      }
    }
  }
  starts.sort((a, b) => a.time - b.time || (a.seq ?? 0) - (b.seq ?? 0));
  return starts.map((call) => {
    const result = ends.get(call.callId);
    const row = {
      start: call.time,
      // Still open when nothing came back: `null`, not `call.time`.
      end: result === void 0 ? null : result.time,
      sessionId
    };
    if (call.timeoutMs !== void 0) row.timeoutMs = call.timeoutMs;
    if (result !== void 0 && result.timedOut !== void 0) row.timedOut = result.timedOut;
    return row;
  });
}
function parseTimedOut(content) {
  if (!Array.isArray(content)) return void 0;
  for (const part of content) {
    const record = asRecord(part);
    if (record === void 0) continue;
    const text2 = asText(record.text);
    if (text2 === void 0) continue;
    try {
      const parsed = asRecord(JSON.parse(text2));
      if (parsed === void 0) continue;
      const value = parsed.timedOut;
      if (typeof value === "boolean") return value;
    } catch {
      continue;
    }
  }
  return void 0;
}
function foldToolCallTransitions(events, sessionId) {
  const indexed = indexEvents(events);
  const out = [];
  for (const item of inTimeOrder(indexed)) {
    if (eventType(item) !== "tool/call") continue;
    const data = eventData(item);
    const time = item.time;
    if (data === void 0 || time === void 0) continue;
    const tool = asText(data.name);
    if (tool === void 0) continue;
    if (tool !== "team_task_create" && tool !== "team_task_update") continue;
    const args = parseToolArguments(data.arguments);
    if (args === void 0) continue;
    if (tool === "team_task_create") {
      const row2 = { tool, action: "created", time, sessionId, seq: item.seq };
      const subject = asText(args.subject);
      if (subject !== void 0) row2.subject = subject;
      out.push(row2);
      continue;
    }
    const action = UPDATE_ACTION_MAP[asText(args.action) ?? ""];
    if (action === void 0) continue;
    const row = { tool, action, time, sessionId, seq: item.seq };
    const taskId = asText(args.task_id);
    if (taskId !== void 0) row.taskId = taskId;
    const expectedRevision = asPositiveInt(args.expected_revision);
    if (expectedRevision !== void 0) row.expectedRevision = expectedRevision;
    out.push(row);
  }
  return out;
}
function attributeTransitions(taskId, transitions, toolCalls, subject, fallbackSessionId) {
  const byConsumedRevision = /* @__PURE__ */ new Map();
  const createdBySubject = /* @__PURE__ */ new Map();
  for (const call of toolCalls) {
    if (call.taskId === taskId && call.expectedRevision !== void 0 && !byConsumedRevision.has(call.expectedRevision)) {
      byConsumedRevision.set(call.expectedRevision, call);
    }
    if (call.action === "created" && call.subject !== void 0) {
      const list = createdBySubject.get(call.subject);
      if (list === void 0) createdBySubject.set(call.subject, [call]);
      else list.push(call);
    }
  }
  const withSession = (transition, sessionId) => {
    const next = transition.sessionId === "" ? fallbackSessionId : transition.sessionId;
    return { ...transition, sessionId: sessionId ?? next };
  };
  return transitions.map((transition) => {
    if (transition.action === "created") {
      const candidates = createdBySubject.get(subject);
      if (candidates !== void 0 && candidates.length === 1) {
        return withSession(transition, candidates[0]?.sessionId);
      }
      return withSession(transition, void 0);
    }
    if (transition.revision !== void 0 && transition.revision > 1) {
      const call = byConsumedRevision.get(transition.revision - 1);
      if (call !== void 0) return withSession(transition, call.sessionId);
    }
    return withSession(transition, void 0);
  });
}
function dateTaskFromToolCalls(taskId, subject, toolCalls, fallbackSessionId) {
  const matched = [];
  const creates = [];
  for (const call of toolCalls) {
    if (call.taskId === taskId) {
      matched.push(call);
      continue;
    }
    if (call.action === "created" && call.subject !== void 0 && call.subject === subject) {
      creates.push(call);
    }
  }
  if (creates.length === 1) {
    const only = creates[0];
    if (only !== void 0) matched.push(only);
  }
  const history = matched.map((call) => {
    const event = {
      time: call.time,
      action: call.action,
      sessionId: call.sessionId === "" ? fallbackSessionId : call.sessionId
    };
    if (call.expectedRevision !== void 0) event.revision = call.expectedRevision + 1;
    else if (call.action === "created") event.revision = 1;
    return event;
  });
  history.sort((a, b) => a.time - b.time);
  return history;
}
var COMMAND_TOOLS = ["bash", "pwsh", "exec_command", "write_stdin"];
var PLAN_TOOLS = ["todo_write", "create_goal", "update_goal", "get_goal"];
var LIVE_TOOL_DETAIL_KEYS = [
  "title",
  "description",
  "objective",
  "task",
  "task_name",
  "name",
  "question",
  "questions",
  "prompt",
  "message",
  "command",
  "cmd",
  "queries",
  "query",
  "pattern",
  "url",
  "uri",
  "file_path",
  "path",
  "target",
  "action",
  "status"
];
var LIVE_TOOL_DETAIL_MAX_CHARS = 160;
function toolActivityKind(name2) {
  if (name2 === "read") return "read";
  if (name2 === "read_image") return "readImage";
  if (name2 === "grep" || name2 === "glob" || name2.endsWith("_inspect")) return "search";
  if (name2 === "write") return "write";
  if (name2 === "edit" || name2 === "apply_patch") return "edit";
  if (COMMAND_TOOLS.includes(name2) || name2.startsWith("terminal_")) return "commands";
  if (name2 === "run_code") return "code";
  if (name2 === "web_search") return "webSearch";
  if (name2 === "web_fetch") return "webFetch";
  if (name2 === "subagent" || name2.startsWith("subagent_")) return "subagents";
  if (PLAN_TOOLS.includes(name2)) return "plan";
  if (name2 === "ask_user_question" || name2 === "request_user_input") return "questions";
  return "tools";
}
function normalizeLiveToolDetail(value) {
  const text2 = typeof value === "string" ? value : Array.isArray(value) && value.length > 0 && value.every((item) => typeof item === "string") ? value.join(", ") : "";
  const normalized = text2.replace(/\s+/g, " ").trim();
  const chars = Array.from(normalized);
  return chars.length <= LIVE_TOOL_DETAIL_MAX_CHARS ? normalized : `${chars.slice(0, LIVE_TOOL_DETAIL_MAX_CHARS - 1).join("").trimEnd()}\u2026`;
}
function questionDetail(value) {
  if (!Array.isArray(value)) return "";
  for (const item of value) {
    const record = asRecord(item);
    if (record === void 0) continue;
    const detail = normalizeLiveToolDetail(record.question);
    if (detail !== "") return detail;
  }
  return "";
}
function liveToolDetail(name2, argumentsRaw) {
  if (typeof argumentsRaw !== "string") return normalizeLiveToolDetail(name2);
  let parsed;
  try {
    parsed = JSON.parse(argumentsRaw);
  } catch {
    return normalizeLiveToolDetail(name2);
  }
  const args = asRecord(parsed);
  if (args === void 0) return normalizeLiveToolDetail(name2);
  for (const key of LIVE_TOOL_DETAIL_KEYS) {
    if (!(key in args)) continue;
    const value = args[key];
    const detail = key === "questions" ? questionDetail(value) : normalizeLiveToolDetail(value);
    if (detail !== "") return detail;
  }
  return normalizeLiveToolDetail(name2);
}
function lastUnsettledToolCall(indexed) {
  const pending = /* @__PURE__ */ new Map();
  for (const item of inLogOrder(indexed)) {
    const type = eventType(item);
    if (type === "tool/call") {
      const data2 = eventData(item);
      if (data2 === void 0) continue;
      const callId2 = asText(data2.callId);
      const name2 = asText(data2.name);
      if (callId2 === void 0 || name2 === void 0) continue;
      pending.set(callId2, { name: name2, args: data2.arguments, seq: item.seq });
      continue;
    }
    if (type !== "tool/result") continue;
    const data = eventData(item);
    if (data === void 0) continue;
    const message = asRecord(data.message);
    const source = message === void 0 ? void 0 : asRecord(message.source);
    const callId = asText(source?.callId) ?? asText(message?.toolCallId) ?? asText(data.callId);
    if (callId !== void 0) pending.delete(callId);
  }
  let latest;
  for (const entry of pending.values()) {
    if (latest === void 0 || entry.seq > latest.seq) latest = entry;
  }
  return latest === void 0 ? void 0 : { name: latest.name, args: latest.args };
}
function foldLaneLiveActivity(events) {
  const spans = foldActivitySpans(events).spans;
  const hasTurn = spans.some((span) => span.kind === "turn");
  const open = hasTurn ? spans.some((span) => span.kind === "turn" && span.end === null) : spans.some((span) => span.kind === "step" && span.end === null);
  const running = open ? lastUnsettledToolCall(indexEvents(events)) : void 0;
  if (running === void 0) {
    return { kind: "thinking", detail: "", evidence: "no-running-tool" };
  }
  return {
    kind: toolActivityKind(running.name),
    detail: liveToolDetail(running.name, running.args),
    toolName: running.name,
    evidence: "running-tool"
  };
}
function foldSessionEvents(events, sessionId) {
  return {
    sessionId,
    activity: foldActivitySpans(events),
    team: foldTeamEvents(events, sessionId),
    toolCalls: foldToolCallTransitions(events, sessionId),
    messages: foldMessageRecords(events),
    waits: foldWaitSpans(events, sessionId),
    laneActivity: foldLaneLiveActivity(events)
  };
}
function mergeDiagnostics(diagnostics) {
  const merged = emptyDiagnostics(0);
  for (const item of diagnostics) {
    merged.events += item.events;
    merged.malformed += item.malformed;
    merged.undated += item.undated;
    merged.orphanCloses += item.orphanCloses;
    merged.openSpans += item.openSpans;
    merged.rewoundTransitions += item.rewoundTransitions;
  }
  return merged;
}

// src/host/lane-color.ts
var ON_DARK_FILL = "--dsw-static-neutral-bluish-00";
var ON_LIGHT_FILL = "--dsw-alias-label-primary";
function slot(bar) {
  return { bar, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL };
}
function mix(parts, inkWeight) {
  const total = parts.reduce((sum, [, weight]) => sum + weight, 0);
  const pct = (weight) => String(Math.round(weight / total * 1e3) / 10);
  const weighted = parts.map(([token, weight]) => `var(${token}) ${pct(weight)}%`).join(", ");
  const base = parts.length === 1 && inkWeight <= 0 ? parts[0]?.[0] ?? "" : parts.length === 1 ? `var(${parts[0]?.[0] ?? ""})` : `color-mix(in srgb, ${weighted})`;
  if (inkWeight <= 0) return base;
  return `color-mix(in srgb, ${base} ${100 - inkWeight}%, var(${INK_TOKEN}) ${inkWeight}%)`;
}
var INK_TOKEN = "--dsw-static-neutral-bluish-1000";
var BLUE_LEAD = "--dsw-static-blue-600";
var CRIMSON_DEEP = mix([["--dsw-static-red-600", 70], ["--dsw-static-blue-600", 30]], 8);
var GREEN_LIGHT = mix([["--dsw-static-green-500", 60], ["--dsw-static-amber-500", 40]], 32);
var VIOLET_LIGHT = mix([["--dsw-static-red-500", 35], ["--dsw-static-blue-450", 65]], 12);
var OLIVE_DEEP = mix([["--dsw-static-green-400", 15], ["--dsw-static-amber-500", 85]], 50);
var MAGENTA_LIGHT = mix([["--dsw-static-blue-600", 40], ["--dsw-static-red-400", 60]], 2);
var TEAL_LIGHT = mix([["--dsw-static-blue-500", 30], ["--dsw-static-green-400", 70]], 32);
var MAGENTA_DEEP = mix([["--dsw-static-red-500", 50], ["--dsw-static-blue-800", 50]], 0);
var GREEN_DEEP = mix([["--dsw-static-green-500", 60], ["--dsw-static-amber-500", 40]], 46);
var ROSE_LIGHT = mix([["--dsw-static-red-500", 75], ["--dsw-static-blue-600", 25]], 2);
var TEAL_DEEP = mix([["--dsw-static-green-500", 50], ["--dsw-static-blue-900", 50]], 12);
var ORANGE_DEEP = mix([["--dsw-static-red-600", 45], ["--dsw-static-amber-500", 55]], 40);
var AZURE_DEEP = mix([["--dsw-static-green-400", 35], ["--dsw-static-blue-500", 65]], 40);
var ORANGE_LIGHT = mix([["--dsw-static-red-600", 40], ["--dsw-static-amber-500", 60]], 24);
var VIOLET_DEEP = mix([["--dsw-static-blue-450", 70], ["--dsw-static-red-600", 30]], 26);
var OLIVE_LIGHT = mix([["--dsw-static-green-500", 15], ["--dsw-static-amber-500", 85]], 34);
var AZURE_LIGHT = mix([["--dsw-static-green-500", 20], ["--dsw-static-blue-400", 80]], 30);
var LANE_COLOR_TOKENS = [
  // 蓝 blue — the Lead's fixed colour, and the head of the wheel.
  { bar: BLUE_LEAD, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  // ---- the sixteen teammate colours, in roster order ----
  { bar: CRIMSON_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: GREEN_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: VIOLET_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: OLIVE_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: MAGENTA_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: TEAL_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: MAGENTA_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: GREEN_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: ROSE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: TEAL_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: ORANGE_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: AZURE_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: ORANGE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: VIOLET_DEEP, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: OLIVE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL },
  { bar: AZURE_LIGHT, on: ON_DARK_FILL, onLight: ON_LIGHT_FILL }
];
var TEAMMATE_COLOR_COUNT = LANE_COLOR_TOKENS.length - 1;
var LEAD_COLOR_TOKENS = LANE_COLOR_TOKENS[0];
var UNASSIGNED_COLOR_TOKENS = slot("--dsw-static-blue-800");
function laneColorTokens(laneId, index) {
  if (laneId === "unassigned") return UNASSIGNED_COLOR_TOKENS;
  if (laneId === "lead") return LEAD_COLOR_TOKENS;
  const position = Number.isFinite(index) && index > 0 ? Math.floor(index) : 1;
  const slotIndex = 1 + (position - 1) % TEAMMATE_COLOR_COUNT;
  return LANE_COLOR_TOKENS[slotIndex] ?? LEAD_COLOR_TOKENS;
}

// src/host/session-log.ts
function liveAgent(ctx, sessionId) {
  const agents = ctx.get("agents");
  if (agents === void 0 || typeof agents.get !== "function") return void 0;
  try {
    return agents.get(sessionId);
  } catch {
    return void 0;
  }
}
function asEvents(value) {
  if (!Array.isArray(value)) return void 0;
  return value.map(
    (event) => typeof event === "object" && event !== null ? event : {}
  );
}
function readLive(ctx, sessionId) {
  const agent = liveAgent(ctx, sessionId);
  if (agent === void 0) {
    return { ok: false, reason: `session "${sessionId}" has no live agent`, channel: "none" };
  }
  const read = agent.session?.snapshotEvents;
  if (typeof read !== "function") {
    return { ok: false, reason: `session "${sessionId}" exposes no live event log`, channel: "none" };
  }
  let raw;
  try {
    raw = read.call(agent.session);
  } catch (error) {
    return {
      ok: false,
      reason: `live log of "${sessionId}" could not be read: ${errorMessage(error)}`,
      channel: "live"
    };
  }
  const events = asEvents(raw);
  if (events === void 0) {
    return { ok: false, reason: `live log of "${sessionId}" is not an event array`, channel: "live" };
  }
  if (events.length === 0) {
    return {
      ok: false,
      reason: `live log of "${sessionId}" is empty`,
      channel: "live",
      empty: true
    };
  }
  return { ok: true, channel: "live", events, header: agent.session?.header ?? {} };
}
async function readPersisted(ctx, sessionId) {
  const persistence = ctx.get("sessionPersistence");
  if (persistence === void 0 || typeof persistence.open !== "function") {
    return { ok: false, reason: "the sessionPersistence service is unavailable", channel: "none" };
  }
  let handle;
  try {
    handle = await persistence.open(sessionId, "read");
  } catch (error) {
    return {
      ok: false,
      reason: `session "${sessionId}" could not be opened for read: ${errorMessage(error)}`,
      channel: "persisted"
    };
  }
  try {
    const slice = await handle.read();
    const events = asEvents(slice?.events);
    if (events === void 0) {
      return { ok: false, reason: `persisted log of "${sessionId}" is not an event array`, channel: "persisted" };
    }
    return { ok: true, channel: "persisted", events, header: handle.header ?? {} };
  } catch (error) {
    return {
      ok: false,
      reason: `persisted log of "${sessionId}" could not be read: ${errorMessage(error)}`,
      channel: "persisted"
    };
  } finally {
    try {
      await handle.close();
    } catch {
    }
  }
}
function errorMessage(error) {
  if (error instanceof Error) return error.message;
  return String(error);
}
async function readSessionLog(ctx, sessionId) {
  const live = readLive(ctx, sessionId);
  if (live.ok) return live;
  const persisted = await readPersisted(ctx, sessionId);
  if (persisted.ok) return persisted;
  if (live.empty === true && persisted.channel === "persisted") {
    return { ok: true, channel: "persisted", events: [], header: {} };
  }
  return { ...persisted, reason: `${live.reason}; ${persisted.reason}` };
}
async function readSessionHeader(ctx, sessionId) {
  const agent = liveAgent(ctx, sessionId);
  const liveHeader = agent?.session?.header;
  if (liveHeader !== void 0 && typeof liveHeader === "object") return liveHeader;
  const result = await readSessionLog(ctx, sessionId);
  return result.ok ? result.header : void 0;
}
function liveAgentList(ctx) {
  const agents = ctx.get("agents");
  if (agents === void 0 || typeof agents.list !== "function") return [];
  try {
    const list = agents.list();
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
function liveAgentRunning(ctx, sessionId) {
  const agent = liveAgent(ctx, sessionId);
  if (agent === void 0) return void 0;
  return agent.status === "running";
}

// src/host/timeline.ts
var MAX_ROOT_DEPTH = 16;
function text(value) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  return trimmed === "" ? void 0 : trimmed;
}
function num(value) {
  return typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function bool(value) {
  return typeof value === "boolean" ? value : void 0;
}
function textArray(value) {
  if (!Array.isArray(value)) return [];
  const out = [];
  for (const item of value) {
    const entry = text(item);
    if (entry !== void 0) out.push(entry);
  }
  return out;
}
function agentTeams(ctx) {
  const teams = ctx.get("agentTeams");
  if (teams === void 0 || typeof teams.listTasks !== "function") return void 0;
  return teams;
}
function reason(error) {
  return error instanceof Error ? error.message : String(error);
}
async function resolveRootSessionId(ctx, sessionId, notes) {
  const teams = agentTeams(ctx);
  const agent = liveAgent(ctx, sessionId);
  if (teams !== void 0 && agent !== void 0 && typeof teams.tryMembership === "function") {
    try {
      const membership = teams.tryMembership(agent);
      const root = text(membership?.root?.id);
      if (root !== void 0) return root;
      notes.push(`agentTeams.tryMembership("${sessionId}") returned no root; falling back to the parentSession chain`);
    } catch (error) {
      notes.push(`agentTeams.tryMembership("${sessionId}") failed: ${reason(error)}`);
    }
  } else if (teams === void 0) {
    notes.push("the agentTeams service is unavailable; the board is rebuilt from the session log alone");
  }
  const visited = /* @__PURE__ */ new Set();
  let current = sessionId;
  for (let depth = 0; depth < MAX_ROOT_DEPTH; depth += 1) {
    if (visited.has(current)) {
      notes.push(`parentSession chain from "${sessionId}" is cyclic at "${current}"; stopping`);
      break;
    }
    visited.add(current);
    const header = await readSessionHeader(ctx, current);
    const parent = text(header?.parentSession);
    if (parent === void 0 || parent === current) break;
    current = parent;
  }
  return current;
}
function deriveStatus(phase, running, hasOpenSpan) {
  if (phase === "failed") return "failed";
  if (phase === "provisioning") return "provisioning";
  if (running === true) return "running";
  if (running === false) return "idle";
  return hasOpenSpan ? "running" : "idle";
}
function phaseFromViewStatus(status) {
  if (status === "provisioning") return "provisioning";
  if (status === "failed") return "failed";
  if (status === "running" || status === "inactive") return "active";
  return void 0;
}
function statusFromViewStatus(status) {
  if (status === "provisioning") return "provisioning";
  if (status === "failed") return "failed";
  if (status === "running") return "running";
  if (status === "inactive") return "idle";
  return void 0;
}
function leadDraft(rootSessionId, rootTeam, leadView) {
  const draft = {
    id: "lead",
    name: text(leadView?.name) ?? "lead",
    role: "lead",
    sessionId: rootSessionId
  };
  const viewStatus = text(leadView?.status);
  if (viewStatus !== void 0) draft.viewStatus = viewStatus;
  const phase = phaseFromViewStatus(viewStatus);
  if (phase !== void 0) draft.phase = phase;
  if (rootTeam.sessionCreatedAt !== void 0) draft.createdAt = rootTeam.sessionCreatedAt;
  const model = text(leadView?.model);
  if (model !== void 0) draft.model = model;
  const error = textArray(leadView?.diagnostics).join("; ");
  if (error !== "") draft.error = error;
  return draft;
}
function teammateDraft(view, memberId, journal) {
  const viewStatus = text(view.status);
  const draft = {
    id: memberId,
    name: text(view.name) ?? journal?.name ?? memberId,
    role: "teammate",
    sessionId: memberId
  };
  if (viewStatus !== void 0) draft.viewStatus = viewStatus;
  const phase = phaseFromViewStatus(viewStatus) ?? journal?.phase;
  if (phase !== void 0) draft.phase = phase;
  const createdAt = journal?.childCreatedAt ?? journal?.firstSeenAt;
  if (createdAt !== void 0) draft.createdAt = createdAt;
  const model = text(view.model);
  if (model !== void 0) draft.model = model;
  const error = textArray(view.diagnostics).join("; ") || journal?.error;
  if (error !== void 0 && error !== "") draft.error = error;
  return draft;
}
function teammateDraftFromJournal(member) {
  const draft = {
    id: member.id,
    name: member.name,
    role: "teammate",
    sessionId: member.id
  };
  if (member.phase !== void 0) draft.phase = member.phase;
  if (member.nameIsFallback === true) draft.nameIsFallback = true;
  const createdAt = member.childCreatedAt ?? member.firstSeenAt;
  if (createdAt !== void 0) draft.createdAt = createdAt;
  if (member.error !== void 0) draft.error = member.error;
  return draft;
}
function draftFromView(view) {
  const id = text(view.id);
  const revision = num(view.revision);
  if (id === void 0 || revision === void 0) return void 0;
  const status = text(view.status);
  if (status !== "pending" && status !== "in_progress" && status !== "completed" && status !== "deleted") {
    return void 0;
  }
  const draft = {
    id,
    revision,
    subject: typeof view.subject === "string" ? view.subject : "",
    description: typeof view.description === "string" ? view.description : "",
    status,
    blockedBy: textArray(view.blockedBy),
    writeScopes: textArray(view.writeScopes),
    ready: bool(view.ready) ?? false,
    writeScopeWarnings: textArray(view.writeScopeWarnings),
    history: []
  };
  const owner = text(view.ownerName);
  if (owner !== void 0) {
    draft.owner = owner;
    draft.ownerName = owner;
  }
  return draft;
}
function draftFromSnapshot(snapshot, snapshots) {
  const ready = snapshot.status === "pending" && snapshot.blockedBy.every((id) => snapshots.find((candidate) => candidate.id === id)?.status === "completed");
  const draft = {
    id: snapshot.id,
    revision: snapshot.revision,
    subject: snapshot.subject,
    description: snapshot.description,
    status: snapshot.status,
    blockedBy: [...snapshot.blockedBy],
    writeScopes: [...snapshot.writeScopes],
    ready,
    writeScopeWarnings: [],
    history: []
  };
  if (snapshot.ownerId !== void 0) draft.owner = snapshot.ownerId;
  return draft;
}
function toTimelineTask(draft, laneId) {
  const { ownerName: _ownerName, ...task } = draft;
  void _ownerName;
  return { ...task, laneId };
}
function makeSpeakerLookup(laneByMemberId, memberIdByName, memberNameById) {
  return (id, name2) => {
    if (id === void 0) return void 0;
    const resolved = name2 ?? memberNameById.get(id) ?? id;
    const laneId = laneByMemberId.get(id);
    if (laneId === "lead") return { kind: "lead", id: "lead", name: resolved };
    if (laneId !== void 0) return { kind: "teammate", id: laneId, name: resolved };
    if (name2 !== void 0) {
      const byName = memberIdByName.get(name2);
      if (byName === "lead") return { kind: "lead", id: "lead", name: name2 };
      if (byName !== void 0) return { kind: "teammate", id: byName, name: name2 };
    }
    if (id === "lead") return { kind: "lead", id: "lead", name: resolved };
    return { kind: "system", id, name: resolved };
  };
}
function messageSpansFrom(fold, lookup, seen) {
  const spans = [];
  for (const record of fold.messages.records) {
    const time = record.queuedAt ?? record.deliveredAt;
    if (time === void 0) continue;
    if (record.queuedAt !== void 0) {
      if (seen.has(record.messageId)) continue;
      seen.add(record.messageId);
    }
    const span = {
      kind: "message",
      time,
      end: record.deliveredAt ?? null,
      from: lookup(record.senderId, record.senderName) ?? {
        kind: "system",
        id: record.senderId ?? "unknown",
        name: record.senderName ?? "unknown"
      },
      messageId: record.messageId,
      sessionId: fold.sessionId
    };
    const to = lookup(record.targetId, void 0);
    if (to !== void 0) span.to = to;
    if (record.preview !== void 0) span.preview = record.preview;
    spans.push(span);
  }
  return spans;
}
function userPromptSpansFrom(fold) {
  return fold.messages.userPrompts.map((prompt) => {
    const span = {
      kind: "user-prompt",
      time: prompt.time,
      end: null,
      from: { kind: "user", id: "user", name: "you" },
      sessionId: fold.sessionId
    };
    if (prompt.preview !== void 0) span.preview = prompt.preview;
    return span;
  });
}
function turnSpansFrom(fold, speaker) {
  const spans = [];
  for (const span of fold.activity.spans) {
    if (span.kind !== "turn") continue;
    const emitted = {
      kind: "turn",
      time: span.start,
      end: span.end,
      from: speaker,
      sessionId: fold.sessionId
    };
    if (span.turn !== void 0) emitted.messageId = `turn:${fold.sessionId}:${span.turn}`;
    spans.push(emitted);
  }
  return spans;
}
function speakerOfLane(lane) {
  return lane.role === "lead" ? { kind: "lead", id: lane.id, name: lane.name } : { kind: "teammate", id: lane.id, name: lane.name };
}
function sortMessageSpans(spans) {
  const rank = (span) => span.kind === "turn" ? 0 : span.kind === "message" ? 1 : span.kind === "dispatch" ? 2 : 3;
  return spans.sort((a, b) => a.time - b.time || rank(a) - rank(b));
}
async function buildTimeline(ctx, sessionId) {
  const generatedAt = Date.now();
  try {
    return await deriveTimeline(ctx, sessionId, generatedAt);
  } catch (error) {
    ctx.logger?.warn?.(`dsh-task-gantt: timeline derivation failed for "${sessionId}": ${reason(error)}`);
    return {
      apiVersion: API_VERSION,
      sessionId,
      rootSessionId: sessionId,
      generatedAt,
      // Nothing was derived, so there is nothing to keep growing: freeze an
      // empty window instead of promising a live edge we cannot justify.
      range: { start: generatedAt, end: generatedAt },
      live: false,
      lanes: [],
      tasks: [],
      source: "live",
      notes: [`timeline derivation failed and was degraded to an empty board: ${reason(error)}`]
    };
  }
}
async function deriveTimeline(ctx, sessionId, generatedAt) {
  const notes = [];
  const rootSessionId = await resolveRootSessionId(ctx, sessionId, notes);
  const teams = agentTeams(ctx);
  const rootAgent = liveAgent(ctx, rootSessionId);
  let memberViews = [];
  let taskViews = [];
  let boardRead = false;
  let failure;
  if (teams !== void 0) {
    if (rootAgent === void 0) {
      notes.push(`no live agent for root session "${rootSessionId}"; the roster and board fall back to the session log`);
    } else {
      try {
        memberViews = teams.listMembers(rootAgent) ?? [];
      } catch (error) {
        notes.push(`agentTeams.listMembers failed: ${reason(error)}`);
      }
      try {
        taskViews = teams.listTasks(rootAgent) ?? [];
        boardRead = true;
      } catch (error) {
        failure = reason(error);
        notes.push(`agentTeams.listTasks failed: ${failure}`);
      }
    }
  }
  const rootRead = await readSessionLog(ctx, rootSessionId);
  if (!rootRead.ok) notes.push(`root session log unavailable: ${rootRead.reason}`);
  const rootFold = foldSessionEvents(rootRead.ok ? rootRead.events : [], rootSessionId);
  const memberIdByName = /* @__PURE__ */ new Map();
  const memberNameById = /* @__PURE__ */ new Map();
  for (const [name2, id] of rootFold.team.memberIdByName) {
    memberIdByName.set(name2, id);
    memberNameById.set(id, name2);
  }
  for (const view of memberViews) {
    const name2 = text(view.name);
    const id = text(view.id);
    if (name2 !== void 0 && id !== void 0) {
      memberIdByName.set(name2, id);
      memberNameById.set(id, name2);
    }
  }
  for (const member of rootFold.team.members) {
    if (member.name !== void 0 && member.name !== "") memberNameById.set(member.id, member.name);
  }
  const leadView = memberViews.find((view) => text(view.role) === "lead" || text(view.name) === "lead");
  const drafts = [leadDraft(rootSessionId, rootFold.team, leadView)];
  const seenLaneIds = /* @__PURE__ */ new Set([rootSessionId]);
  for (const view of memberViews) {
    const id = text(view.id);
    if (id === void 0 || id === rootSessionId) continue;
    if (text(view.role) === "lead" || text(view.name) === "lead") continue;
    if (seenLaneIds.has(id)) continue;
    seenLaneIds.add(id);
    drafts.push(teammateDraft(view, id, rootFold.team.memberById.get(id)));
  }
  for (const member of rootFold.team.members) {
    if (seenLaneIds.has(member.id) || member.id === rootSessionId) continue;
    seenLaneIds.add(member.id);
    drafts.push(teammateDraftFromJournal(member));
  }
  const runtimeMembers = liveAgentList(ctx);
  if (runtimeMembers.length > 0) {
    for (const agent of runtimeMembers) {
      const id = text(agent.id);
      if (id === void 0 || id === rootSessionId || seenLaneIds.has(id)) continue;
      const header = agent.session?.header;
      const parent = header === void 0 ? void 0 : text(header.parentSession);
      if (parent !== rootSessionId) continue;
      seenLaneIds.add(id);
      const draft = { id, name: id, role: "teammate", sessionId: id };
      const model = text(agent.options?.model);
      if (model !== void 0) draft.model = model;
      const createdAt = num(header?.createdAt);
      if (createdAt !== void 0) draft.createdAt = createdAt;
      draft.viewStatus = agent.status === "running" ? "running" : "inactive";
      drafts.push(draft);
    }
  }
  const folds = /* @__PURE__ */ new Map();
  folds.set(rootSessionId, rootFold);
  const readableLogs = /* @__PURE__ */ new Set();
  if (rootRead.ok) readableLogs.add(rootSessionId);
  const rawBySession = /* @__PURE__ */ new Map();
  if (rootRead.ok) rawBySession.set(rootSessionId, rootRead.events);
  const allToolCalls = [...rootFold.toolCalls];
  const diagnostics = [rootFold.activity.diagnostics];
  let readable = rootRead.ok ? 1 : 0;
  let unreadable = rootRead.ok ? 0 : 1;
  const memberLogIds = drafts.map((draft) => draft.sessionId).filter((id) => id !== void 0 && id !== rootSessionId);
  const memberReads = await Promise.all(memberLogIds.map(async (id) => ({ id, read: await readSessionLog(ctx, id) })));
  for (const { id, read } of memberReads) {
    if (!read.ok) {
      unreadable += 1;
      notes.push(`session log of lane "${id}" unavailable: ${read.reason}`);
      continue;
    }
    readable += 1;
    readableLogs.add(id);
    rawBySession.set(id, read.events);
    const fold = foldSessionEvents(read.events, id);
    folds.set(id, fold);
    allToolCalls.push(...fold.toolCalls);
    diagnostics.push(fold.activity.diagnostics);
  }
  allToolCalls.sort((a, b) => a.time - b.time || a.seq - b.seq);
  for (const draft of drafts) {
    if (draft.nameIsFallback !== true || draft.sessionId === void 0) continue;
    const title = folds.get(draft.sessionId)?.team.sessionTitle;
    if (title === void 0) continue;
    draft.name = title;
    delete draft.nameIsFallback;
  }
  const byId = /* @__PURE__ */ new Map();
  const snapshots = [];
  for (const record of rootFold.team.tasks) {
    if (record.snapshot.status === "deleted") continue;
    snapshots.push(record.snapshot);
    const draft = draftFromSnapshot(record.snapshot, snapshots);
    draft.history = attributeTransitions(
      record.id,
      record.transitions,
      allToolCalls,
      record.snapshot.subject,
      rootSessionId
    );
    byId.set(record.id, draft);
  }
  if (boardRead) {
    for (const view of taskViews) {
      const fromBoard = draftFromView(view);
      if (fromBoard === void 0 || fromBoard.status === "deleted") continue;
      const existing = byId.get(fromBoard.id);
      if (existing === void 0) {
        const record = rootFold.team.taskById.get(fromBoard.id);
        fromBoard.history = record === void 0 ? [] : attributeTransitions(fromBoard.id, record.transitions, allToolCalls, fromBoard.subject, rootSessionId);
        byId.set(fromBoard.id, fromBoard);
        continue;
      }
      existing.revision = fromBoard.revision;
      existing.subject = fromBoard.subject;
      existing.description = fromBoard.description;
      existing.status = fromBoard.status;
      existing.blockedBy = fromBoard.blockedBy;
      existing.writeScopes = fromBoard.writeScopes;
      existing.ready = fromBoard.ready;
      existing.writeScopeWarnings = fromBoard.writeScopeWarnings;
      if (fromBoard.owner !== void 0) {
        existing.owner = fromBoard.owner;
        existing.ownerName = fromBoard.owner;
      }
    }
  } else {
    notes.push("board state (owner / readiness / advisory write-scope warnings) is unavailable; tasks were rebuilt from the log");
    for (const draft of byId.values()) {
      const snapshot = snapshots.find((candidate) => candidate.id === draft.id);
      if (snapshot === void 0) continue;
      draft.ready = draftFromSnapshot(snapshot, snapshots).ready;
    }
  }
  let datedByToolCalls = 0;
  for (const draft of byId.values()) {
    if (draft.history.length > 0) continue;
    const fromCalls = dateTaskFromToolCalls(draft.id, draft.subject, allToolCalls, rootSessionId);
    if (fromCalls.length === 0) continue;
    draft.history = fromCalls;
    datedByToolCalls += 1;
  }
  if (datedByToolCalls > 0) {
    notes.push(
      `${datedByToolCalls} task(s) had no team/task journal event; their history was dated from team_task_* tool calls (brief \xA73.4 level 2)`
    );
  }
  const laneByMemberId = /* @__PURE__ */ new Map();
  laneByMemberId.set(rootSessionId, "lead");
  for (const draft of drafts) {
    if (draft.sessionId !== void 0) laneByMemberId.set(draft.sessionId, draft.id);
  }
  for (const member of rootFold.team.members) {
    if (!laneByMemberId.has(member.id)) laneByMemberId.set(member.id, member.id);
  }
  const lanes = [];
  for (const draft of drafts) {
    const laneIndex = lanes.length;
    const fold = draft.sessionId === void 0 ? void 0 : folds.get(draft.sessionId);
    const spans = fold?.activity.spans ?? [];
    const hasOpenSpan2 = spans.some((span) => span.end === null);
    const fromView = statusFromViewStatus(draft.viewStatus);
    const running = draft.sessionId === void 0 ? void 0 : liveAgentRunning(ctx, draft.sessionId);
    const runningKnown = typeof running === "boolean";
    const coldSession = draft.sessionId !== void 0 && !runningKnown;
    const logRead = draft.sessionId !== void 0 && readableLogs.has(draft.sessionId);
    const statusKnown = fromView === "running" || fromView === "idle" || draft.phase === "failed" || draft.phase === "provisioning" || runningKnown || logRead;
    const status = statusKnown ? fromView === "running" || fromView === "idle" ? fromView : deriveStatus(draft.phase, runningKnown ? running : void 0, coldSession ? false : hasOpenSpan2) : void 0;
    const lane = {
      id: draft.id,
      name: draft.name,
      role: draft.role,
      // `hasHistory` is true only when the log was readable AND yielded spans:
      // the flag tells the UI "this is durable history", not "a log exists".
      hasHistory: fold !== void 0 && spans.length > 0,
      spans,
      // Filled by the message pass below (turns + exchanges + prompts) — one
      // single place decides placement, so a turn can never be drawn twice.
      messages: [],
      color: laneColorTokens(draft.id, laneIndex),
      tasks: []
    };
    if (status !== void 0) lane.status = status;
    if (draft.sessionId !== void 0) {
      const laneFold = folds.get(draft.sessionId);
      if (laneFold !== void 0 && laneFold.waits.length > 0) lane.waits = laneFold.waits;
    }
    if (draft.sessionId !== void 0 && readableLogs.has(draft.sessionId)) {
      const laneFold = folds.get(draft.sessionId);
      if (laneFold !== void 0) lane.activity = laneFold.laneActivity;
    }
    if (draft.sessionId !== void 0) {
      lane.navigation = { type: "session", value: draft.sessionId };
    }
    if (draft.phase !== void 0) lane.phase = draft.phase;
    if (draft.createdAt !== void 0) lane.createdAt = draft.createdAt;
    if (draft.model !== void 0) lane.model = draft.model;
    if (draft.error !== void 0) lane.error = draft.error;
    lanes.push(lane);
  }
  const laneIds = new Set(lanes.map((lane) => lane.id));
  const lookup = makeSpeakerLookup(laneByMemberId, memberIdByName, memberNameById);
  const laneById = new Map(lanes.map((lane) => [lane.id, lane]));
  const spanByKey = /* @__PURE__ */ new Map();
  const placedIn = /* @__PURE__ */ new Set();
  const messageDiagnostics = [];
  let uniqueMessages = 0;
  let messageCopies = 0;
  let turnsWritten = 0;
  let offRosterTargets = 0;
  const place = (laneId, messageId, span) => {
    const lane = laneById.get(laneId);
    if (lane === void 0) return;
    const key = `${laneId}\0${messageId ?? `${span.kind}:${span.time}:${span.from.id}`}`;
    if (placedIn.has(key)) return;
    placedIn.add(key);
    lane.messages.push(span);
    if (span.kind === "turn") turnsWritten += 1;
    else messageCopies += 1;
  };
  for (const [foldSessionId, fold] of folds) {
    messageDiagnostics.push(fold.messages.diagnostics);
    const ownLaneId = laneByMemberId.get(foldSessionId) ?? foldSessionId;
    const ownLane = laneById.get(ownLaneId);
    if (ownLane !== void 0) {
      for (const span of turnSpansFrom(fold, speakerOfLane(ownLane))) {
        const key = `turn\0${foldSessionId}\0${span.messageId ?? span.time}`;
        if (spanByKey.has(key)) continue;
        spanByKey.set(key, span);
        place(ownLaneId, `turn:${span.messageId ?? span.time}`, span);
      }
    }
    for (const span of messageSpansFrom(fold, lookup, /* @__PURE__ */ new Set())) {
      const key = `message\0${span.messageId ?? `${span.time}\0${span.from.id}`}`;
      if (spanByKey.has(key)) continue;
      spanByKey.set(key, span);
      uniqueMessages += 1;
      place(span.from.id, span.messageId, span);
      if (span.to === void 0) continue;
      if (laneById.has(span.to.id)) {
        place(span.to.id, span.messageId, span);
      } else {
        offRosterTargets += 1;
      }
    }
    for (const span of userPromptSpansFrom(fold)) {
      const key = `prompt\0${span.time}\0${span.preview ?? ""}`;
      if (spanByKey.has(key)) continue;
      spanByKey.set(key, span);
      uniqueMessages += 1;
      place(ownLaneId, `prompt:${span.time}:${span.preview ?? ""}`, span);
      const target = span.to;
      if (target !== void 0 && laneById.has(target.id)) {
        place(target.id, `prompt:${span.time}:${span.preview ?? ""}`, span);
      }
    }
  }
  let dispatchesPlaced = 0;
  for (const [sessionId2, events] of rawBySession) {
    for (const dispatch of foldSubagentDispatches(events)) {
      const parentLane = laneById.get(laneByMemberId.get(sessionId2) ?? sessionId2);
      const childLane = laneById.get(laneByMemberId.get(dispatch.childId) ?? dispatch.childId);
      if (parentLane === void 0 || childLane === void 0) continue;
      const span = {
        kind: "dispatch",
        time: dispatch.time,
        // A dispatch is an instant, not a duration: it is the moment the work was
        // handed over. `end` mirrors the instant so the client can draw it as a point.
        end: dispatch.time,
        from: speakerOfLane(parentLane),
        to: speakerOfLane(childLane),
        preview: dispatch.description === "" ? void 0 : dispatch.description,
        messageId: dispatch.callId,
        sessionId: sessionId2
      };
      const key = `dispatch\0${dispatch.callId}`;
      if (spanByKey.has(key)) continue;
      spanByKey.set(key, span);
      dispatchesPlaced += 1;
      place(parentLane.id, `dispatch:${dispatch.callId}`, span);
      place(childLane.id, `dispatch:${dispatch.callId}`, span);
    }
  }
  for (const lane of lanes) lane.messages = sortMessageSpans(lane.messages);
  let unpairedDeliveries = 0;
  let injectedUserMessages = 0;
  let truncatedBodies = 0;
  for (const diagnostics2 of messageDiagnostics) {
    unpairedDeliveries += diagnostics2.unpairedDeliveries;
    injectedUserMessages += diagnostics2.injectedUserMessages;
    truncatedBodies += diagnostics2.truncatedBodies;
  }
  if (offRosterTargets > 0) {
    notes.push(
      `${offRosterTargets} message(s) were addressed to a session outside this roster (a finished/failed member or another team); they are drawn on the sender's lane only, and no lane was invented for them`
    );
  }
  if (messageCopies > uniqueMessages) {
    notes.push(
      `${uniqueMessages} unique message(s): ${messageCopies} message/prompt copies drawn across lanes (an exchange is shown on both the sender's and the recipient's lane, so a per-lane count is not a message total), plus ${turnsWritten} turn span(s)`
    );
  }
  if (unpairedDeliveries > 0) {
    notes.push(
      `${unpairedDeliveries} team message delivery(ies) had no queued twin in the readable window; those spans carry no sender (the journal does not name one)`
    );
  }
  if (truncatedBodies > 0) {
    notes.push(
      `${truncatedBodies} message body(ies) exceeded the ${MESSAGE_PREVIEW_MAX}-character cap and were clipped; the tail is not in this response`
    );
  }
  if (injectedUserMessages > 0) {
    notes.push(
      `${injectedUserMessages} user/message event(s) were runtime injections (time-context, tool-jobs, subagent-settled, team-message, \u2026), not the human, and are not drawn as prompts`
    );
  }
  const laneIdFor = (draft) => {
    const owner = draft.ownerName;
    if (owner !== void 0) {
      if (owner === "lead") return "lead";
      const byName = memberIdByName.get(owner);
      if (byName !== void 0) return byName;
      if (draft.owner === rootSessionId) return "lead";
      return "unassigned";
    }
    const last = draft.history[draft.history.length - 1];
    if (last !== void 0) {
      if (last.sessionId === rootSessionId) return "lead";
      if (laneIds.has(last.sessionId)) return last.sessionId;
    }
    return "unassigned";
  };
  const tasksByLane = /* @__PURE__ */ new Map();
  for (const draft of byId.values()) {
    let laneId = laneIdFor(draft);
    if (!laneIds.has(laneId)) laneId = "unassigned";
    const bucket = tasksByLane.get(laneId);
    if (bucket === void 0) tasksByLane.set(laneId, [draft]);
    else bucket.push(draft);
  }
  const firstTime = (draft) => draft.history[0]?.time ?? Number.POSITIVE_INFINITY;
  const byFirstTime = (a, b) => {
    const left = firstTime(a);
    const right = firstTime(b);
    if (left !== right) return left < right ? -1 : 1;
    return a.subject.localeCompare(b.subject) || a.id.localeCompare(b.id);
  };
  const tasks = [];
  for (const lane of lanes) {
    const laneDrafts = [...tasksByLane.get(lane.id) ?? []].sort(byFirstTime);
    lane.tasks = laneDrafts.map((draft) => toTimelineTask(draft, lane.id));
    tasks.push(...lane.tasks);
  }
  const unassignedDrafts = [...tasksByLane.get("unassigned") ?? []].sort(byFirstTime);
  if (unassignedDrafts.length > 0) {
    const lane = {
      id: "unassigned",
      name: "unassigned",
      role: "unknown",
      hasHistory: false,
      spans: [],
      // No session owns this row, so it can carry no turn, no navigation, and
      // the palette's neutral colour rather than borrowing a teammate's.
      messages: [],
      // The sentinel row never participates in the positional cycle.
      color: laneColorTokens("unassigned", lanes.length),
      tasks: unassignedDrafts.map((draft) => toTimelineTask(draft, "unassigned"))
    };
    lanes.push(lane);
    tasks.push(...lane.tasks);
  }
  tasks.sort(byFirstTime);
  const observed = [];
  let hasOpenSpan = false;
  for (const lane of lanes) {
    for (const span of lane.spans) {
      observed.push(span.start);
      if (span.end !== null) observed.push(span.end);
      else hasOpenSpan = true;
    }
    for (const message of lane.messages) {
      observed.push(message.time);
      if (message.end !== null) observed.push(message.end);
      else if (message.kind === "turn") hasOpenSpan = true;
    }
    if (lane.createdAt !== void 0) observed.push(lane.createdAt);
  }
  for (const task of tasks) {
    for (const event of task.history) observed.push(event.time);
  }
  if (rootFold.team.sessionCreatedAt !== void 0) observed.push(rootFold.team.sessionCreatedAt);
  const start = observed.length > 0 ? Math.min(...observed) : rootFold.team.sessionCreatedAt ?? generatedAt;
  const lastObserved = observed.length > 0 ? Math.max(...observed) : void 0;
  if (observed.length === 0) {
    notes.push("no dated session event was readable; the chart has no activity to place and starts at the root session creation time");
  }
  const anyAgentRunning = lanes.some((lane) => {
    const navigation = lane.navigation;
    if (navigation === void 0) return false;
    const sessionId2 = navigation.type === "session" ? navigation.value : navigation.value.sessionId;
    return sessionId2 !== void 0 && liveAgentRunning(ctx, sessionId2) === true;
  });
  const ownSessionStillOpen = lanes.some((lane) => {
    const navigation = lane.navigation;
    if (navigation === void 0 || navigation.type !== "session") return false;
    if (navigation.value !== sessionId) return false;
    return lane.spans.some((span) => span.end === null) || lane.messages.some((message) => message.kind === "turn" && message.end === null);
  });
  const live = anyAgentRunning || ownSessionStillOpen;
  if (!live) {
    notes.push(
      "no live agent is running and the requested session has no open span, so the timeline is frozen at the last observed event; the chart no longer advances with the wall clock"
    );
  }
  const merged = mergeDiagnostics(diagnostics);
  if (merged.orphanCloses > 0) {
    notes.push(`${merged.orphanCloses} unpaired turn/step end event(s) were ignored (a close without an open can never date a span)`);
  }
  if (merged.undated > 0) {
    notes.push(`${merged.undated} event(s) carried no usable time and were excluded (no timestamp is ever invented)`);
  }
  if (merged.rewoundTransitions > 0) {
    notes.push(`${merged.rewoundTransitions} task snapshot(s) were skipped for a non-increasing revision`);
  }
  const source = readable > 0 && unreadable === 0 ? "log" : readable > 0 ? "partial" : "live";
  const response = {
    apiVersion: API_VERSION,
    sessionId,
    rootSessionId,
    generatedAt,
    // `end: null` means "still growing"; a real instant means "stopped here".
    // The frozen value is the last event actually observed, so the chart shows
    // the work that happened rather than trailing an idle team forever.
    range: { start, end: live ? null : lastObserved ?? start },
    live,
    lanes,
    tasks,
    source,
    notes
  };
  if (failure !== void 0) response.failure = failure;
  return response;
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
  const text2 = Buffer.concat(chunks).toString("utf8").trim();
  if (text2 === "") return {};
  const parsed = JSON.parse(text2);
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
var WEB_SERVER_SERVICE = "webServer";
function apply(ctx) {
  const install = (target) => {
    const webServer = target.get(WEB_SERVER_SERVICE);
    if (webServer === void 0) {
      return () => {
      };
    }
    const handler = buildTimelineHandler(target);
    return webServer.register({ kind: "prefix", path: ROUTE_PREFIX, handler });
  };
  if (ctx.get(WEB_SERVER_SERVICE) !== void 0) {
    ctx.effect(() => install(ctx), "dsh-task-gantt: /dsh-task-gantt/api routes");
    return;
  }
  const dynamic = ctx;
  if (typeof dynamic.inject !== "function") {
    ctx.logger?.warn?.(
      "dsh-task-gantt: no webServer service and no ctx.inject on this context; the timeline API stays unmounted"
    );
    return;
  }
  dynamic.inject([WEB_SERVER_SERVICE], (scoped) => {
    scoped.effect(() => install(scoped), "dsh-task-gantt: /dsh-task-gantt/api routes");
  });
}
export {
  apply,
  inject,
  name
};
//# sourceMappingURL=index.js.map
