/**
 * Session-log reading for the host half — the ONLY module that touches host
 * services. Everything it returns is plain data, so the folding in `fold.ts`
 * stays pure and unit-testable without a host.
 *
 * Two read channels, in the same priority order the first-party
 * `dsh-better-sidebar` plugin uses (see docs/FINDINGS-host.md §3):
 *
 * 1. **live** — `ctx.get('agents').get(id).session.snapshotEvents()`: the
 *    in-memory log, i.e. the freshest read, including events not yet flushed.
 *    (The host marks this accessor `@deprecated`, but it is still the only
 *    route to unflushed events, and the shipped first-party consumer uses it.
 *    A future removal degrades to channel 2 without any behaviour change.)
 * 2. **persisted** — `ctx.get('sessionPersistence').open(id, 'read')` →
 *    `handle.read()` → `handle.close()`: the durable log, works for cold
 *    sessions and while another process owns the session.
 *
 * Every failure is data, never an exception: a missing service, a vanished
 * session, a refusing format, a broken handle — all come back as
 * `{ ok: false, reason }` so a caller can degrade honestly.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { RawSessionEvent } from './fold.ts'

/** The host Agent face this plugin consumes (structural, never value-imported). */
interface AgentLike {
  id?: unknown
  status?: unknown
  options?: { model?: unknown } | undefined
  session?: {
    header?: Record<string, unknown> | undefined
    snapshotEvents?: (() => readonly unknown[]) | undefined
  } | undefined
}

/** The host `agents` service face. */
interface AgentsServiceLike {
  get(id: string): AgentLike | undefined
  list?(): AgentLike[]
}

/** One open channel onto a persisted session. */
interface PersistedHandleLike {
  header?: Record<string, unknown> | undefined
  read(offset?: number, length?: number): Promise<{ events?: readonly unknown[] }>
  close(): Promise<void>
}

/** The host `sessionPersistence` service face. */
interface SessionPersistenceLike {
  open(id: string, access: 'read' | 'write'): Promise<PersistedHandleLike>
}

/** How a log was obtained. */
export type SessionLogChannel = 'live' | 'persisted'

/** A successfully read session log. */
export interface SessionLogRead {
  ok: true
  channel: SessionLogChannel
  events: readonly RawSessionEvent[]
  /** The stored session header (`cwd` / `parentSession` / `createdAt` / …). */
  header: Record<string, unknown>
}

/** A log that could not be read, with the reason for `notes`. */
export interface SessionLogFailure {
  ok: false
  reason: string
  /** Another channel may still work; the caller decides whether to try. */
  channel: SessionLogChannel | 'none'
  /**
   * The channel answered with a well-formed but **empty** event array.
   *
   * This is not the same as "no events exist": a resumed session can hand back
   * an empty in-memory log while the durable log on disk holds the whole
   * history. It is reported separately so the caller falls through to the
   * durable channel instead of mistaking "nothing in memory" for "nothing at
   * all", which would render an empty chart and still label it `source: 'log'`.
   */
  empty?: boolean
}

/** Result union — every failure is reported, never thrown. */
export type SessionLogResult = SessionLogRead | SessionLogFailure

/**
 * Kept as a no-op for callers written against the retired log cache.
 *
 * The cache itself was removed because serving a memoised log made the
 * liveness decision stale (see `readSessionLog`). Tests that called this to
 * reset between cases still compile and still pass: there is nothing left to
 * reset, so isolation is now automatic.
 */
export function clearSessionLogCache(): void {
  /* intentionally empty — logs are never cached across calls */
}

/** Resolve the live agent for one session id. */
export function liveAgent(ctx: Context, sessionId: string): AgentLike | undefined {
  const agents = ctx.get('agents') as AgentsServiceLike | undefined
  if (agents === undefined || typeof agents.get !== 'function') return undefined
  try {
    return agents.get(sessionId)
  } catch {
    return undefined
  }
}

/** Coerce an unknown array into raw events without trusting any element. */
function asEvents(value: unknown): RawSessionEvent[] | undefined {
  if (!Array.isArray(value)) return undefined
  return value.map((event) =>
    typeof event === 'object' && event !== null
      ? (event as RawSessionEvent)
      : ({} satisfies RawSessionEvent),
  )
}

/** Channel 1: the live in-memory log. */
function readLive(ctx: Context, sessionId: string): SessionLogRead | SessionLogFailure {
  const agent = liveAgent(ctx, sessionId)
  if (agent === undefined) {
    return { ok: false, reason: `session "${sessionId}" has no live agent`, channel: 'none' }
  }
  const read = agent.session?.snapshotEvents
  if (typeof read !== 'function') {
    return { ok: false, reason: `session "${sessionId}" exposes no live event log`, channel: 'none' }
  }
  let raw: unknown
  try {
    raw = read.call(agent.session)
  } catch (error) {
    return {
      ok: false,
      reason: `live log of "${sessionId}" could not be read: ${errorMessage(error)}`,
      channel: 'live',
    }
  }
  const events = asEvents(raw)
  if (events === undefined) {
    return { ok: false, reason: `live log of "${sessionId}" is not an event array`, channel: 'live' }
  }
  if (events.length === 0) {
    // A well-formed but empty in-memory log: the session is registered but its
    // history is not in memory. Treating this as success would hide the durable
    // log (measured: 0 spans, 0 messages, yet `source: 'log'`). Fall through.
    return {
      ok: false,
      reason: `live log of "${sessionId}" is empty`,
      channel: 'live',
      empty: true,
    }
  }
  return { ok: true, channel: 'live', events, header: agent.session?.header ?? {} }
}

/** Channel 2: the durable log, read through an explicit handle. */
async function readPersisted(ctx: Context, sessionId: string): Promise<SessionLogRead | SessionLogFailure> {
  const persistence = ctx.get('sessionPersistence') as SessionPersistenceLike | undefined
  if (persistence === undefined || typeof persistence.open !== 'function') {
    return { ok: false, reason: 'the sessionPersistence service is unavailable', channel: 'none' }
  }
  let handle: PersistedHandleLike
  try {
    handle = await persistence.open(sessionId, 'read')
  } catch (error) {
    return {
      ok: false,
      reason: `session "${sessionId}" could not be opened for read: ${errorMessage(error)}`,
      channel: 'persisted',
    }
  }
  try {
    const slice = await handle.read()
    const events = asEvents(slice?.events)
    if (events === undefined) {
      return { ok: false, reason: `persisted log of "${sessionId}" is not an event array`, channel: 'persisted' }
    }
    return { ok: true, channel: 'persisted', events, header: handle.header ?? {} }
  } catch (error) {
    return {
      ok: false,
      reason: `persisted log of "${sessionId}" could not be read: ${errorMessage(error)}`,
      channel: 'persisted',
    }
  } finally {
    // A close failure must never mask the read result.
    try {
      await handle.close()
    } catch {
      /* the handle is already unusable; nothing to recover */
    }
  }
}

/** A short, log-safe rendering of an unknown thrown value. */
function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  return String(error)
}

/**
 * Read one session's event log through the best available channel.
 *
 * Live first (freshest), then durable.
 *
 * **Deliberately uncached across calls.** An earlier revision memoised a result
 * for 1.5 s to avoid re-decompressing a log a fast-polling panel had already
 * read. That memo was a correctness bug, not an optimisation: the timeline's
 * liveness flag is derived from this log, so a second request inside the window
 * was answering from a *stale* snapshot — a session whose log had just opened a
 * new turn still read as fully closed, and the chart stayed frozen until the
 * memo expired. Reading the log is the point of the request; the panel polls on
 * the order of seconds, and duplicate reads *within* one request are already
 * impossible because the caller folds each lane exactly once.
 *
 * @param ctx - the plugin's host context.
 * @param sessionId - the session to read.
 * @returns the log, or a failure record explaining why it is missing.
 */
export async function readSessionLog(ctx: Context, sessionId: string): Promise<SessionLogResult> {
  const live = readLive(ctx, sessionId)
  if (live.ok) return live
  const persisted = await readPersisted(ctx, sessionId)
  if (persisted.ok) return persisted
  // An empty live read is not an error when the session genuinely has no
  // history: keep it a *successful* empty read so a brand-new session is not
  // reported as a degraded board.
  if (live.empty === true && persisted.channel === 'persisted') {
    return { ok: true, channel: 'persisted', events: [], header: {} }
  }
  // Report the live failure when neither channel worked: it names the closer cause.
  return { ...persisted, reason: `${live.reason}; ${persisted.reason}` }
}

/**
 * Read just one session's header without keeping a handle open longer than
 * needed. Used when resolving the team root before any log has been folded.
 *
 * @param ctx - the plugin's host context.
 * @param sessionId - the session to inspect.
 * @returns the header, or `undefined` when it cannot be read.
 */
export async function readSessionHeader(
  ctx: Context,
  sessionId: string,
): Promise<Record<string, unknown> | undefined> {
  const agent = liveAgent(ctx, sessionId)
  const liveHeader = agent?.session?.header
  if (liveHeader !== undefined && typeof liveHeader === 'object') return liveHeader
  const result = await readSessionLog(ctx, sessionId)
  return result.ok ? result.header : undefined
}

/**
 * Read the live agent's model label, when the deployment exposes one.
 *
 * @param ctx - the plugin's host context.
 * @param sessionId - the session to inspect.
 * @returns the model id, or `undefined`.
 */
export function liveAgentModel(ctx: Context, sessionId: string): string | undefined {
  const model = liveAgent(ctx, sessionId)?.options?.model
  return typeof model === 'string' && model !== '' ? model : undefined
}

/**
 * Every live agent this deployment has registered.
 *
 * Used as the last resort for the roster: a teammate whose `team/member` entry
 * the journal never wrote (or wrote somewhere unreadable) is still a real,
 * running session, and without this list it would get no lane while its own log
 * sat there holding the very spans the chart should show.
 *
 * @param ctx - the plugin's host context.
 * @returns the agents, or an empty array when the service is absent/unusable.
 */
export function liveAgentList(ctx: Context): AgentLike[] {
  const agents = ctx.get('agents') as AgentsServiceLike | undefined
  if (agents === undefined || typeof agents.list !== 'function') return []
  try {
    const list = agents.list()
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

/**
 * Whether a session currently has a running agent.
 *
 * @param ctx - the plugin's host context.
 * @param sessionId - the session to inspect.
 * @returns `true` only when the live agent reports `running`.
 */
export function liveAgentRunning(ctx: Context, sessionId: string): boolean | undefined {
  const agent = liveAgent(ctx, sessionId)
  if (agent === undefined) return undefined
  return agent.status === 'running'
}
