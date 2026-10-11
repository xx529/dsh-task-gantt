/**
 * Runtime validator for the FROZEN `TimelineResponse` contract
 * (`src/shared/contract.ts`, owner: Lead).
 *
 * Why a hand-written validator instead of a schema library: the contract is
 * hand-written TypeScript, the plugin ships with zero runtime dependencies, and
 * the validator must be able to *point at the exact field* that is wrong, both
 * in the route tests and in the tests other owners run while implementing the
 * host half.
 *
 * Every rule below is traceable to a sentence in `src/shared/contract.ts`; the
 * ones that go slightly beyond the letter of the doc comments (cross-checks
 * between `tasks` and `lanes`) are marked `CROSS-CHECK` so a reader can tell
 * "the contract says so" from "verify's stricter reading".
 */
import {
  API_VERSION,
  MESSAGE_PREVIEW_MAX,
  type ActivitySpan,
  type TaskEvent,
  type TimelineLane,
  type TimelineResponse,
  type TimelineTask,
} from '../../src/shared/contract.ts'

/** One validation finding. `error` fails the assertion; `warn` is advisory. */
export interface TimelineProblem {
  path: string
  message: string
  severity: 'error' | 'warn'
}

const MEMBER_PHASES = new Set(['provisioning', 'active', 'failed'])
const MEMBER_STATUSES = new Set(['running', 'idle', 'provisioning', 'failed'])
const TASK_STATUSES = new Set(['pending', 'in_progress', 'completed', 'deleted'])
const TASK_ACTIONS = new Set(['created', 'claimed', 'completed', 'reopened', 'updated', 'observed'])
const SPAN_KINDS = new Set(['turn', 'step'])
const SOURCES = new Set(['log', 'partial', 'live'])

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== ''
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string')
}

/** Validate one activity span; `path` is used in messages. */
function checkSpan(span: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(span)) {
    problems.push({ path, message: 'span must be an object', severity: 'error' })
    return
  }
  if (typeof span.kind !== 'string' || !SPAN_KINDS.has(span.kind)) {
    problems.push({ path: `${path}.kind`, message: `span kind must be 'turn' | 'step' (got ${JSON.stringify(span.kind)})`, severity: 'error' })
  }
  if (!isFiniteNumber(span.start) || span.start <= 0) {
    problems.push({ path: `${path}.start`, message: `span start must be a positive epoch ms (got ${JSON.stringify(span.start)})`, severity: 'error' })
  }
  if (span.end !== null && !isFiniteNumber(span.end)) {
    problems.push({ path: `${path}.end`, message: `span end must be epoch ms or null (got ${JSON.stringify(span.end)})`, severity: 'error' })
  }
  if (isFiniteNumber(span.end) && isFiniteNumber(span.start) && span.end < span.start) {
    problems.push({ path: `${path}.end`, message: `span end ${span.end} precedes start ${span.start}`, severity: 'error' })
  }
  for (const key of ['turn', 'step'] as const) {
    if (span[key] !== undefined && !isFiniteNumber(span[key])) {
      problems.push({ path: `${path}.${key}`, message: `${key} must be a number when present (got ${JSON.stringify(span[key])})`, severity: 'error' })
    }
  }
}

/** Validate one task event (an x-axis anchor). */
function checkTaskEvent(event: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(event)) {
    problems.push({ path, message: 'task event must be an object', severity: 'error' })
    return
  }
  if (!isFiniteNumber(event.time) || event.time <= 0) {
    problems.push({ path: `${path}.time`, message: `event time must be a positive epoch ms (got ${JSON.stringify(event.time)})`, severity: 'error' })
  }
  if (typeof event.action !== 'string' || !TASK_ACTIONS.has(event.action)) {
    problems.push({ path: `${path}.action`, message: `event action must be one of ${[...TASK_ACTIONS].join('|')} (got ${JSON.stringify(event.action)})`, severity: 'error' })
  }
  if (!isNonEmptyString(event.sessionId)) {
    problems.push({ path: `${path}.sessionId`, message: 'event sessionId must be a non-empty string', severity: 'error' })
  }
  if (event.revision !== undefined && !isFiniteNumber(event.revision)) {
    problems.push({ path: `${path}.revision`, message: `revision must be a number when present (got ${JSON.stringify(event.revision)})`, severity: 'error' })
  }
}

/** Validate one task. */
function checkTask(task: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(task)) {
    problems.push({ path, message: 'task must be an object', severity: 'error' })
    return
  }
  for (const key of ['id', 'subject', 'laneId'] as const) {
    if (!isNonEmptyString(task[key])) {
      problems.push({ path: `${path}.${key}`, message: `${key} must be a non-empty string`, severity: 'error' })
    }
  }
  if (typeof task.description !== 'string') {
    problems.push({ path: `${path}.description`, message: 'description must be a string (may be empty)', severity: 'error' })
  }
  if (!isFiniteNumber(task.revision)) {
    problems.push({ path: `${path}.revision`, message: 'revision must be a number', severity: 'error' })
  }
  if (typeof task.status !== 'string' || !TASK_STATUSES.has(task.status)) {
    problems.push({ path: `${path}.status`, message: `status must be one of ${[...TASK_STATUSES].join('|')} (got ${JSON.stringify(task.status)})`, severity: 'error' })
  }
  if (task.owner !== undefined && !isNonEmptyString(task.owner)) {
    problems.push({ path: `${path}.owner`, message: 'owner must be a non-empty string when present', severity: 'error' })
  }
  for (const key of ['blockedBy', 'writeScopes', 'writeScopeWarnings'] as const) {
    if (!isStringArray(task[key])) {
      problems.push({ path: `${path}.${key}`, message: `${key} must be a string array`, severity: 'error' })
    }
  }
  if (typeof task.ready !== 'boolean') {
    problems.push({ path: `${path}.ready`, message: 'ready must be a boolean', severity: 'error' })
  }
  if (!Array.isArray(task.history)) {
    problems.push({ path: `${path}.history`, message: 'history must be an array', severity: 'error' })
    return
  }
  task.history.forEach((event, index) => checkTaskEvent(event, `${path}.history[${index}]`, problems))
  for (let index = 1; index < task.history.length; index += 1) {
    const previous = task.history[index - 1] as TaskEvent
    const current = task.history[index] as TaskEvent
    if (isFiniteNumber(previous?.time) && isFiniteNumber(current?.time) && current.time < previous.time) {
      problems.push({
        path: `${path}.history[${index}]`,
        message: `history must ascend by time: ${current.time} after ${previous.time}`,
        severity: 'error',
      })
    }
  }
}

/** Validate one lane (a teammate row). */
/* ------------------------------------------------------------------ */
/* message spans, lane colour tokens and navigation (contract v2)      */
/* ------------------------------------------------------------------ */

const SPEAKER_KINDS = new Set(['user', 'lead', 'teammate', 'system'])
const MESSAGE_KINDS = new Set(['turn', 'message', 'user-prompt'])

/**
 * A theme-token NAME. Lane colours are token references the browser resolves
 * against the host theme — never literal paint. This is the anti-bypass rule:
 * `#fff` in `lane.color` would sidestep `tests/theme.spec.ts`, which only scans
 * source files, not runtime payloads.
 */
const TOKEN_NAME = /^--(?:dsw|ds)-[a-z0-9-]+$/

/** Looks like a literal colour rather than a token name (for a better message). */
const LITERAL_COLOUR = /^(?:#|rgba?\(|hsla?\(|oklch\(|lab\(|lch\(|color\()/i

/** Validate a `SpanSpeaker`. */
function checkSpeaker(speaker: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(speaker)) {
    problems.push({ path, message: 'speaker must be an object', severity: 'error' })
    return
  }
  if (typeof speaker.kind !== 'string' || !SPEAKER_KINDS.has(speaker.kind)) {
    problems.push({ path: `${path}.kind`, message: `speaker kind must be one of ${[...SPEAKER_KINDS].join('|')} (got ${JSON.stringify(speaker.kind)})`, severity: 'error' })
  }
  if (!isNonEmptyString(speaker.id)) {
    problems.push({ path: `${path}.id`, message: 'speaker id must be a non-empty string', severity: 'error' })
  }
  if (!isNonEmptyString(speaker.name)) {
    problems.push({ path: `${path}.name`, message: 'speaker name must be a non-empty string', severity: 'error' })
  }
}

/**
 * Validate one `MessageSpan`.
 *
 * The frozen `to` semantics (contract prose): `to` is "present for
 * `kind: 'message'` … a turn or a user prompt has no addressee and leaves this
 * `undefined`". Combined with the host rule "if no `delivered` twin matches,
 * leave `to` empty", the rule enforced here is:
 *
 * - `kind: 'message'` → `to` is OPTIONAL (paired with a delivery ⇒ present,
 *   unmatched queued ⇒ absent);
 * - `kind: 'turn' | 'user-prompt'` → `to` MUST be absent.
 */
function checkMessageSpan(span: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(span)) {
    problems.push({ path, message: 'message span must be an object', severity: 'error' })
    return
  }
  const kind = span.kind
  if (typeof kind !== 'string' || !MESSAGE_KINDS.has(kind)) {
    problems.push({ path: `${path}.kind`, message: `message kind must be one of ${[...MESSAGE_KINDS].join('|')} (got ${JSON.stringify(kind)})`, severity: 'error' })
  }
  if (!isFiniteNumber(span.time) || span.time <= 0) {
    problems.push({ path: `${path}.time`, message: `message time must be a positive epoch ms (got ${JSON.stringify(span.time)})`, severity: 'error' })
  }
  if (span.end !== null && !isFiniteNumber(span.end)) {
    problems.push({ path: `${path}.end`, message: `message end must be epoch ms or null (got ${JSON.stringify(span.end)})`, severity: 'error' })
  }
  if (isFiniteNumber(span.end) && isFiniteNumber(span.time) && span.end < span.time) {
    problems.push({ path: `${path}.end`, message: `message end ${span.end} precedes time ${span.time}`, severity: 'error' })
  }
  checkSpeaker(span.from, `${path}.from`, problems)
  if (span.to !== undefined) {
    checkSpeaker(span.to, `${path}.to`, problems)
    if (kind === 'turn' || kind === 'user-prompt') {
      problems.push({
        path: `${path}.to`,
        message: `a ${kind as string} has no addressee; only kind 'message' may carry 'to'`,
        severity: 'error',
      })
    }
  }
  if (span.preview !== undefined) {
    if (typeof span.preview !== 'string') {
      problems.push({ path: `${path}.preview`, message: 'preview must be a string when present', severity: 'error' })
    } else {
      if (span.preview.length > MESSAGE_PREVIEW_MAX) {
        problems.push({
          path: `${path}.preview`,
          message: `preview is ${span.preview.length} chars; the host must clip it to MESSAGE_PREVIEW_MAX (${MESSAGE_PREVIEW_MAX})`,
          severity: 'error',
        })
      }
      if (/[\r\n]/.test(span.preview)) {
        problems.push({ path: `${path}.preview`, message: 'preview must be the message first line, whitespace-collapsed (no newline)', severity: 'error' })
      }
      if (span.preview !== span.preview.trim()) {
        problems.push({ path: `${path}.preview`, message: 'preview must be trimmed', severity: 'error' })
      }
      if (/ {2,}/.test(span.preview)) {
        problems.push({ path: `${path}.preview`, message: 'preview contains a run of spaces; the host collapses whitespace', severity: 'warn' })
      }
    }
  }
  if (span.messageId !== undefined && !isNonEmptyString(span.messageId)) {
    problems.push({ path: `${path}.messageId`, message: 'messageId must be a non-empty string when present', severity: 'error' })
  }
  if (!isNonEmptyString(span.sessionId)) {
    problems.push({ path: `${path}.sessionId`, message: 'message sessionId must be a non-empty string', severity: 'error' })
  }
}

/** Validate `LaneColorTokens`: two theme-token NAMES, never literal paint. */
function checkColorTokens(color: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(color)) {
    problems.push({ path, message: 'lane color must be an object of theme-token names', severity: 'error' })
    return
  }
  for (const key of ['bar', 'on'] as const) {
    const value = color[key]
    if (!isNonEmptyString(value)) {
      problems.push({ path: `${path}.${key}`, message: `${key} must be a non-empty string token name`, severity: 'error' })
      continue
    }
    if (!TOKEN_NAME.test(value)) {
      problems.push({
        path: `${path}.${key}`,
        message: LITERAL_COLOUR.test(value)
          ? `${key} is a literal colour (${value}); it must be a theme token NAME like --dsw-alias-brand-primary`
          : `${key} must match ${String(TOKEN_NAME)} (got ${value})`,
        severity: 'error',
      })
    }
  }
}

/** Validate `LaneNavigation`. */
function checkNavigation(navigation: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(navigation)) {
    problems.push({ path, message: 'navigation must be an object', severity: 'error' })
    return
  }
  if (navigation.type === 'session') {
    if (!isNonEmptyString(navigation.value)) {
      problems.push({ path: `${path}.value`, message: "a 'session' navigation value must be a non-empty session id", severity: 'error' })
    }
    return
  }
  if (navigation.type === 'address') {
    const value = navigation.value
    if (!isRecord(value)) {
      problems.push({ path: `${path}.value`, message: "an 'address' navigation value must be an object", severity: 'error' })
      return
    }
    if (!isNonEmptyString(value.sessionId)) {
      problems.push({ path: `${path}.value.sessionId`, message: "an 'address' navigation value must carry a non-empty sessionId", severity: 'error' })
    }
    return
  }
  problems.push({ path: `${path}.type`, message: `navigation type must be 'session' | 'address' (got ${JSON.stringify(navigation.type)})`, severity: 'error' })
}

function checkLane(lane: unknown, path: string, problems: TimelineProblem[]): void {
  if (!isRecord(lane)) {
    problems.push({ path, message: 'lane must be an object', severity: 'error' })
    return
  }
  if (!isNonEmptyString(lane.id)) {
    problems.push({ path: `${path}.id`, message: 'lane id must be a non-empty string', severity: 'error' })
  }
  if (typeof lane.name !== 'string') {
    problems.push({ path: `${path}.name`, message: 'lane name must be a string (may be empty)', severity: 'error' })
  }
  if (lane.role !== 'lead' && lane.role !== 'teammate' && lane.role !== 'unknown') {
    problems.push({ path: `${path}.role`, message: `role must be lead|teammate|unknown (got ${JSON.stringify(lane.role)})`, severity: 'error' })
  }
  if (lane.phase !== undefined && (typeof lane.phase !== 'string' || !MEMBER_PHASES.has(lane.phase))) {
    problems.push({ path: `${path}.phase`, message: `phase must be one of ${[...MEMBER_PHASES].join('|')} when present`, severity: 'error' })
  }
  if (lane.status !== undefined && (typeof lane.status !== 'string' || !MEMBER_STATUSES.has(lane.status))) {
    problems.push({ path: `${path}.status`, message: `status must be one of ${[...MEMBER_STATUSES].join('|')} when present`, severity: 'error' })
  }
  if (lane.createdAt !== undefined && !isFiniteNumber(lane.createdAt)) {
    problems.push({ path: `${path}.createdAt`, message: 'createdAt must be a number when present', severity: 'error' })
  }
  if (lane.error !== undefined && typeof lane.error !== 'string') {
    problems.push({ path: `${path}.error`, message: 'error must be a string when present', severity: 'error' })
  }
  if (typeof lane.hasHistory !== 'boolean') {
    problems.push({ path: `${path}.hasHistory`, message: 'hasHistory must be a boolean', severity: 'error' })
  }
  if (!Array.isArray(lane.spans)) {
    problems.push({ path: `${path}.spans`, message: 'spans must be an array', severity: 'error' })
  } else {
    lane.spans.forEach((span, index) => checkSpan(span, `${path}.spans[${index}]`, problems))
    for (let index = 1; index < lane.spans.length; index += 1) {
      const previous = lane.spans[index - 1] as ActivitySpan
      const current = lane.spans[index] as ActivitySpan
      if (isFiniteNumber(previous?.start) && isFiniteNumber(current?.start) && current.start < previous.start) {
        problems.push({
          path: `${path}.spans[${index}]`,
          message: `spans must ascend by start: ${current.start} after ${previous.start}`,
          severity: 'error',
        })
      }
    }
    // A lane that reports spans must say so; a lane that claims history must
    // carry spans. (`hasHistory` is what the UI switches the "no log" badge on.)
    if (lane.hasHistory === false && lane.spans.length > 0) {
      problems.push({ path: `${path}.hasHistory`, message: 'hasHistory is false but spans are present', severity: 'warn' })
    }
  }
  if (!Array.isArray(lane.messages)) {
    problems.push({ path: `${path}.messages`, message: 'messages must be an array (empty is fine)', severity: 'error' })
  } else {
    lane.messages.forEach((message, index) => checkMessageSpan(message, `${path}.messages[${index}]`, problems))
    for (let index = 1; index < lane.messages.length; index += 1) {
      const previous = lane.messages[index - 1] as { time?: unknown }
      const current = lane.messages[index] as { time?: unknown }
      if (isFiniteNumber(previous?.time) && isFiniteNumber(current?.time) && current.time < previous.time) {
        problems.push({
          path: `${path}.messages[${index}]`,
          message: `messages must ascend by time: ${current.time} after ${previous.time}`,
          severity: 'error',
        })
      }
    }
  }
  checkColorTokens(lane.color, `${path}.color`, problems)
  if (lane.navigation !== undefined) {
    checkNavigation(lane.navigation, `${path}.navigation`, problems)
    if (lane.id === 'unassigned') {
      problems.push({
        path: `${path}.navigation`,
        message: "'unassigned' is a sentinel lane, not a session; it must not offer navigation",
        severity: 'error',
      })
    }
  } else if (isNonEmptyString(lane.id) && lane.id !== 'unassigned') {
    // Advisory: the contract says navigation is absent only when there is no
    // real session behind the lane, so a normal lane without it is suspicious
    // but not yet a hard failure.
    problems.push({ path: `${path}.navigation`, message: `lane "${lane.id}" has no navigation target`, severity: 'warn' })
  }
  if (!Array.isArray(lane.tasks)) {
    problems.push({ path: `${path}.tasks`, message: 'lane tasks must be an array', severity: 'error' })
  } else {
    const laneId = typeof lane.id === 'string' ? lane.id : undefined
    lane.tasks.forEach((task, index) => {
      checkTask(task, `${path}.tasks[${index}]`, problems)
      const taskLaneId = isRecord(task) ? task.laneId : undefined
      if (laneId !== undefined && typeof taskLaneId === 'string' && taskLaneId !== laneId) {
        problems.push({
          path: `${path}.tasks[${index}].laneId`,
          message: `task drawn on lane "${laneId}" but its laneId is "${taskLaneId}"`,
          severity: 'error',
        })
      }
    })
  }
}

/**
 * Validate a `TimelineResponse`.
 *
 * @param value - the value to check (usually JSON-parsed route output).
 * @returns every problem found, in document order; empty means valid.
 */
export function validateTimeline(value: unknown): TimelineProblem[] {
  const problems: TimelineProblem[] = []
  if (!isRecord(value)) {
    return [{ path: '$', message: 'TimelineResponse must be an object', severity: 'error' }]
  }
  if (value.apiVersion !== API_VERSION) {
    problems.push({ path: '$.apiVersion', message: `apiVersion must be ${API_VERSION} (got ${JSON.stringify(value.apiVersion)})`, severity: 'error' })
  }
  for (const key of ['sessionId', 'rootSessionId'] as const) {
    if (!isNonEmptyString(value[key])) {
      problems.push({ path: `$.${key}`, message: `${key} must be a non-empty string`, severity: 'error' })
    }
  }
  if (!isFiniteNumber(value.generatedAt) || value.generatedAt <= 0) {
    problems.push({ path: '$.generatedAt', message: 'generatedAt must be a positive epoch ms', severity: 'error' })
  }
  const range = value.range
  if (!isRecord(range)) {
    problems.push({ path: '$.range', message: 'range must be an object', severity: 'error' })
  } else {
    if (!isFiniteNumber(range.start)) {
      problems.push({ path: '$.range.start', message: 'range.start must be a finite epoch ms', severity: 'error' })
    }
    if (range.end !== null && !isFiniteNumber(range.end)) {
      problems.push({ path: '$.range.end', message: 'range.end must be epoch ms or null', severity: 'error' })
    }
    if (isFiniteNumber(range.end) && isFiniteNumber(range.start) && range.end < range.start) {
      problems.push({ path: '$.range.end', message: `range.end ${range.end} precedes range.start ${range.start}`, severity: 'error' })
    }
  }
  if (typeof value.live !== 'boolean') {
    problems.push({ path: '$.live', message: 'live must be a boolean', severity: 'error' })
  } else if (isRecord(range)) {
    // FROZEN SEMANTICS (contract): `live === false` ⟺ `range.end` is a
    // timestamp; `live === true` ⟺ `range.end === null`. The pair is what makes
    // the chart stop growing on an idle team, so an inconsistent pair is an
    // ERROR here — not a degradation. Ruling communicated to host-data-2/ui:
    // a host that cannot tell must pick the CONSISTENT pair (`live: true` with
    // `end: null`) and say so in `notes`; it must never send `live: false`
    // together with `end: null`.
    if (value.live && range.end !== null) {
      problems.push({
        path: '$.range.end',
        message: `live is true but range.end is ${JSON.stringify(range.end)}; a live board must keep end:null (the client pins the right edge to now)`,
        severity: 'error',
      })
    }
    if (!value.live && !isFiniteNumber(range.end)) {
      problems.push({
        path: '$.range.end',
        message: `live is false but range.end is ${JSON.stringify(range.end)}; a frozen board must carry the frozen timestamp`,
        severity: 'error',
      })
    }
  }
  if (typeof value.source !== 'string' || !SOURCES.has(value.source)) {
    problems.push({ path: '$.source', message: `source must be one of ${[...SOURCES].join('|')} (got ${JSON.stringify(value.source)})`, severity: 'error' })
  }
  if (!isStringArray(value.notes)) {
    problems.push({ path: '$.notes', message: 'notes must be a string array (never throw for a degradation — say it here)', severity: 'error' })
  }
  if (value.failure !== undefined && typeof value.failure !== 'string') {
    problems.push({ path: '$.failure', message: 'failure must be a string when present', severity: 'error' })
  }

  const lanes = value.lanes
  const laneIds = new Set<string>()
  const tasksOnLanes = new Set<string>()
  if (!Array.isArray(lanes)) {
    problems.push({ path: '$.lanes', message: 'lanes must be an array', severity: 'error' })
  } else {
    lanes.forEach((lane, index) => {
      const path = `$.lanes[${index}]`
      checkLane(lane, path, problems)
      const laneId = isRecord(lane) ? lane.id : undefined
      if (typeof laneId === 'string') {
        if (laneIds.has(laneId)) {
          problems.push({ path: `${path}.id`, message: `duplicate lane id "${laneId}"`, severity: 'error' })
        }
        laneIds.add(laneId)
        if (Array.isArray(lane.tasks)) {
          for (const task of lane.tasks) {
            if (isRecord(task) && typeof task.id === 'string') tasksOnLanes.add(task.id)
          }
        }
      }
    })
  }

  const tasks = value.tasks
  const topLevelIds = new Set<string>()
  if (!Array.isArray(tasks)) {
    problems.push({ path: '$.tasks', message: 'tasks must be an array', severity: 'error' })
  } else {
    tasks.forEach((task, index) => {
      const path = `$.tasks[${index}]`
      checkTask(task, path, problems)
      if (!isRecord(task)) return
      const { id, status, laneId } = task
      if (typeof id === 'string') {
        if (topLevelIds.has(id)) {
          problems.push({ path: `${path}.id`, message: `duplicate task id "${id}"`, severity: 'error' })
        }
        topLevelIds.add(id)
        // CROSS-CHECK: `laneId` is documented as "the lane this task is drawn
        // on"; a laneId that names no lane silently drops the bar.
        if (typeof laneId === 'string' && laneIds.size > 0 && !laneIds.has(laneId)) {
          problems.push({ path: `${path}.laneId`, message: `task laneId "${laneId}" names no lane in $.lanes`, severity: 'error' })
        }
        // CROSS-CHECK: a task present at the top level but on no lane would
        // never be drawn either.
        if (!tasksOnLanes.has(id) && laneIds.size > 0) {
          problems.push({ path: `${path}.id`, message: `task "${id}" appears on no lane.tasks`, severity: 'error' })
        }
      }
      if (status === 'deleted') {
        problems.push({ path: `${path}.status`, message: 'deleted tasks must not appear in TimelineResponse.tasks', severity: 'error' })
      }
    })
  }

  // CROSS-CHECK: lane.tasks must not invent tasks the response does not carry.
  if (Array.isArray(lanes) && Array.isArray(tasks)) {
    for (const id of tasksOnLanes) {
      if (!topLevelIds.has(id)) {
        problems.push({ path: '$.lanes', message: `lane task "${id}" is missing from $.tasks`, severity: 'error' })
      }
    }
  }

  return problems
}

/** The errors only (what an assertion should fail on). */
export function timelineErrors(value: unknown): TimelineProblem[] {
  return validateTimeline(value).filter((problem) => problem.severity === 'error')
}

/**
 * Assert a value is a valid `TimelineResponse`.
 *
 * @param value - the value to check.
 * @throws Error listing every problem when the value is invalid.
 */
export function assertTimeline(value: unknown): asserts value is TimelineResponse {
  const problems = timelineErrors(value)
  if (problems.length > 0) {
    throw new Error(`invalid TimelineResponse:\n${problems.map((problem) => `  - ${problem.path}: ${problem.message}`).join('\n')}`)
  }
}

/** A minimally valid response, for negative-control tests and as a fixture. */
export function validTimeline(): TimelineResponse {
  const start = 1_700_000_000_000
  return {
    apiVersion: API_VERSION,
    sessionId: 'session-1',
    rootSessionId: 'session-1',
    generatedAt: start + 1000,
    // `end: null` ⇒ `live: true` (frozen pair; see validateTimeline).
    range: { start, end: null },
    live: true,
    lanes: [
      {
        id: 'lead',
        name: 'Lead',
        role: 'lead',
        phase: 'active',
        status: 'running',
        createdAt: start,
        hasHistory: true,
        spans: [{ kind: 'step', start, end: start + 10, turn: 1, step: 1 }],
        messages: [
          // The human's own prompt: no addressee, fixed speaker id 'user'.
          {
            kind: 'user-prompt',
            time: start + 20,
            end: null,
            from: { kind: 'user', id: 'user', name: 'you' },
            preview: 'please build the gantt panel',
            sessionId: 'session-1',
          },
          // A delivery that found its `delivered` twin: `to` is present.
          {
            kind: 'message',
            time: start + 30,
            end: start + 40,
            from: { kind: 'lead', id: 'lead', name: 'lead' },
            to: { kind: 'teammate', id: 'session-1', name: 'ui' },
            preview: 'take task-4',
            messageId: 'msg-1',
            sessionId: 'session-1',
          },
        ],
        color: { bar: '--dsw-alias-brand-primary', on: '--dsw-alias-label-primary-inverted' },
        navigation: { type: 'session', value: 'session-1' },
        tasks: [
          {
            id: 'task-1',
            revision: 1,
            subject: 'do the thing',
            description: 'details',
            status: 'pending',
            blockedBy: [],
            writeScopes: ['src/host'],
            ready: true,
            writeScopeWarnings: [],
            laneId: 'lead',
            history: [{ time: start, action: 'created', revision: 1, sessionId: 'session-1' }],
          },
        ],
      },
    ],
    tasks: [
      {
        id: 'task-1',
        revision: 1,
        subject: 'do the thing',
        description: 'details',
        status: 'pending',
        blockedBy: [],
        writeScopes: ['src/host'],
        ready: true,
        writeScopeWarnings: [],
        laneId: 'lead',
        history: [{ time: start, action: 'created', revision: 1, sessionId: 'session-1' }],
      },
    ],
    source: 'log',
    notes: [],
  }
}

/** A lane fixture, for the layout tests to reuse. */
export function validLane(): TimelineLane {
  return validTimeline().lanes[0] as TimelineLane
}

/** A task fixture. */
export function validTask(): TimelineTask {
  return validTimeline().tasks[0] as TimelineTask
}
