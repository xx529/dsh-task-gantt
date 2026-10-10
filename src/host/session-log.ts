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
}

/** Result union — every failure is reported, never thrown. */
export type SessionLogResult = SessionLogRead | SessionLogFailure

/** Cache entry lifetime; a panel poll re-reads at most this often. */
const CACHE_TTL_MS = 1500
/** Upper bound on cached logs, so a long-lived host cannot grow unbounded. */
const CACHE_MAX_ENTRIES = 64

interface CacheEntry {
  at: number
  value: SessionLogResult
}

const cache = new Map<string, CacheEntry>()

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

/** Keep the cache bounded without pulling in an LRU dependency. */
function evictIfNeeded(): void {
  if (cache.size <= CACHE_MAX_ENTRIES) return
  // Map preserves insertion order: drop the oldest quarter.
  const drop = Math.ceil(CACHE_MAX_ENTRIES / 4)
  let removed = 0
  for (const key of cache.keys()) {
    cache.delete(key)
    removed += 1
    if (removed >= drop) break
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
 * Live first (freshest), then durable. A result is cached briefly so a panel
 * that polls faster than the log grows does not decompress the same logs over
 * and over.
 *
 * @param ctx - the plugin's host context.
 * @param sessionId - the session to read.
 * @returns the log, or a failure record explaining why it is missing.
 */
export async function readSessionLog(ctx: Context, sessionId: string): Promise<SessionLogResult> {
  const cached = cache.get(sessionId)
  const now = Date.now()
  if (cached !== undefined && now - cached.at < CACHE_TTL_MS) return cached.value

  const live = readLive(ctx, sessionId)
  let value: SessionLogResult = live
  if (!live.ok) {
    const persisted = await readPersisted(ctx, sessionId)
    // Report the live failure when neither channel worked: it names the closer cause.
    value = persisted.ok ? persisted : { ...persisted, reason: `${live.reason}; ${persisted.reason}` }
  }

  cache.set(sessionId, { at: now, value })
  evictIfNeeded()
  return value
}

/** Drop every cached log. Exposed for tests and for a manual refresh. */
export function clearSessionLogCache(): void {
  cache.clear()
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
