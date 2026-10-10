// src/shared/contract.ts
var API_VERSION = 1;
var ROUTE_PREFIX = "/dsh-task-gantt/api";

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
  for (const item of inLogOrder(indexed)) {
    const type = eventType(item);
    if (type === void 0) continue;
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
      } else {
        const placeholder = {
          id: childId,
          name: childId,
          phase: "provisioning",
          firstSeenAt: item.time ?? childCreatedAt,
          lastSeenAt: item.time ?? childCreatedAt,
          phases: [],
          childCreatedAt
        };
        team.memberById.set(childId, placeholder);
        team.members.push(placeholder);
      }
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
function foldSessionEvents(events, sessionId) {
  return {
    sessionId,
    activity: foldActivitySpans(events),
    team: foldTeamEvents(events, sessionId),
    toolCalls: foldToolCallTransitions(events, sessionId)
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

// src/host/session-log.ts
var CACHE_TTL_MS = 1500;
var CACHE_MAX_ENTRIES = 64;
var cache = /* @__PURE__ */ new Map();
function liveAgent(ctx, sessionId) {
  const agents = ctx.get("agents");
  if (agents === void 0 || typeof agents.get !== "function") return void 0;
  try {
    return agents.get(sessionId);
  } catch {
    return void 0;
  }
}
function evictIfNeeded() {
  if (cache.size <= CACHE_MAX_ENTRIES) return;
  const drop = Math.ceil(CACHE_MAX_ENTRIES / 4);
  let removed = 0;
  for (const key of cache.keys()) {
    cache.delete(key);
    removed += 1;
    if (removed >= drop) break;
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
  const cached = cache.get(sessionId);
  const now = Date.now();
  if (cached !== void 0 && now - cached.at < CACHE_TTL_MS) return cached.value;
  const live = readLive(ctx, sessionId);
  let value = live;
  if (!live.ok) {
    const persisted = await readPersisted(ctx, sessionId);
    value = persisted.ok ? persisted : { ...persisted, reason: `${live.reason}; ${persisted.reason}` };
  }
  cache.set(sessionId, { at: now, value });
  evictIfNeeded();
  return value;
}
async function readSessionHeader(ctx, sessionId) {
  const agent = liveAgent(ctx, sessionId);
  const liveHeader = agent?.session?.header;
  if (liveHeader !== void 0 && typeof liveHeader === "object") return liveHeader;
  const result = await readSessionLog(ctx, sessionId);
  return result.ok ? result.header : void 0;
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
    sessionId: member.id,
    phase: member.phase
  };
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
      range: { start: generatedAt, end: null },
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
  for (const [name2, id] of rootFold.team.memberIdByName) memberIdByName.set(name2, id);
  for (const view of memberViews) {
    const name2 = text(view.name);
    const id = text(view.id);
    if (name2 !== void 0 && id !== void 0) memberIdByName.set(name2, id);
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
  const folds = /* @__PURE__ */ new Map();
  folds.set(rootSessionId, rootFold);
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
    const fold = foldSessionEvents(read.events, id);
    folds.set(id, fold);
    allToolCalls.push(...fold.toolCalls);
    diagnostics.push(fold.activity.diagnostics);
  }
  allToolCalls.sort((a, b) => a.time - b.time || a.seq - b.seq);
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
  const lanes = [];
  for (const draft of drafts) {
    const fold = draft.sessionId === void 0 ? void 0 : folds.get(draft.sessionId);
    const spans = fold?.activity.spans ?? [];
    const hasOpenSpan = spans.some((span) => span.end === null);
    const fromView = statusFromViewStatus(draft.viewStatus);
    const running = draft.sessionId === void 0 ? void 0 : liveAgentRunning(ctx, draft.sessionId);
    const status = fromView === "running" || fromView === "idle" ? fromView : deriveStatus(draft.phase, running, hasOpenSpan);
    const lane = {
      id: draft.id,
      name: draft.name,
      role: draft.role,
      status,
      // `hasHistory` is true only when the log was readable AND yielded spans:
      // the flag tells the UI "this is durable history", not "a log exists".
      hasHistory: fold !== void 0 && spans.length > 0,
      spans,
      tasks: []
    };
    if (draft.phase !== void 0) lane.phase = draft.phase;
    if (draft.createdAt !== void 0) lane.createdAt = draft.createdAt;
    if (draft.model !== void 0) lane.model = draft.model;
    if (draft.error !== void 0) lane.error = draft.error;
    lanes.push(lane);
  }
  const laneIds = new Set(lanes.map((lane) => lane.id));
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
      tasks: unassignedDrafts.map((draft) => toTimelineTask(draft, "unassigned"))
    };
    lanes.push(lane);
    tasks.push(...lane.tasks);
  }
  tasks.sort(byFirstTime);
  const observed = [];
  for (const lane of lanes) {
    for (const span of lane.spans) {
      observed.push(span.start);
      if (span.end !== null) observed.push(span.end);
    }
    if (lane.createdAt !== void 0) observed.push(lane.createdAt);
  }
  for (const task of tasks) {
    for (const event of task.history) observed.push(event.time);
  }
  if (rootFold.team.sessionCreatedAt !== void 0) observed.push(rootFold.team.sessionCreatedAt);
  const start = observed.length > 0 ? Math.min(...observed) : rootFold.team.sessionCreatedAt ?? generatedAt;
  if (observed.length === 0) {
    notes.push("no dated session event was readable; the chart has no activity to place and starts at the root session creation time");
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
    range: { start, end: null },
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
