/**
 * The plugin's read-only JSON API.
 *
 * Route table (all under {@link ROUTE_PREFIX}, `POST`, JSON body, same-origin):
 *
 * | method     | body                          | returns                       |
 * |------------|-------------------------------|-------------------------------|
 * | `timeline` | `{ sessionId, since?, max? }` | `ApiOk<TimelineResponse>`     |
 * | `ping`     | `{}`                          | `ApiOk<{ apiVersion, host }>` |
 *
 * Every failure is the same envelope: `{ ok: false, error: { code, message } }`.
 * The route NEVER throws out of the handler: an unavailable agent-team layer is
 * a legitimate empty board, not a 500.
 */
import type { Context } from '@deepseek-ai/cordis'
import type { ApiEnvelope, TimelineResponse } from '../shared/contract.ts'
import { API_VERSION, ROUTE_PREFIX } from '../shared/contract.ts'
import { buildTimeline } from './timeline.ts'

/** Minimal node HTTP shapes (the SDK's own types are host-internal). */
interface ReqLike {
  method?: string
  url?: string
  headers: Record<string, string | string[] | undefined>
  on(event: 'data' | 'end' | 'error', listener: (chunk?: unknown) => void): void
}

interface ResLike {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

/** Collect and parse a bounded JSON request body. */
async function readJsonBody(req: ReqLike, limit = 1 << 20): Promise<Record<string, unknown>> {
  const chunks: Buffer[] = []
  let size = 0
  await new Promise<void>((resolvePromise, rejectPromise) => {
    req.on('data', (chunk) => {
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      size += buf.length
      if (size > limit) {
        rejectPromise(new Error('request body too large'))
        return
      }
      chunks.push(buf)
    })
    req.on('end', () => resolvePromise())
    req.on('error', (error) => rejectPromise(error instanceof Error ? error : new Error(String(error))))
  })
  const text = Buffer.concat(chunks).toString('utf8').trim()
  if (text === '') return {}
  const parsed: unknown = JSON.parse(text)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('request body must be a JSON object')
  }
  return parsed as Record<string, unknown>
}

/** Write one JSON response. */
function writeJson(res: ResLike, status: number, body: ApiEnvelope<unknown>): void {
  const payload = JSON.stringify(body)
  res.statusCode = status
  res.setHeader('content-type', 'application/json; charset=utf-8')
  res.setHeader('cache-control', 'no-store')
  res.end(payload)
}

/** Write one failure in the shared envelope. */
function writeError(res: ResLike, status: number, code: string, message: string): void {
  writeJson(res, status, { ok: false, error: { code, message } })
}

/** Same-origin fence: a browser request always carries a matching `Origin`/`Host`. */
function sameOrigin(req: ReqLike): boolean {
  const origin = req.headers.origin
  if (typeof origin !== 'string' || origin === '') return true
  const host = req.headers.host
  if (typeof host !== 'string' || host === '') return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}

/** Read a non-empty string field, or undefined. */
function stringField(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key]
  return typeof value === 'string' && value !== '' ? value : undefined
}

/**
 * Build the route handler bound to the plugin context.
 *
 * @param ctx - the plugin's host context.
 * @returns a `(req, res)` handler suitable for `ctx.webServer.register`.
 */
export function buildTimelineHandler(ctx: Context): (req: ReqLike, res: ResLike) => Promise<void> {
  return async (req, res) => {
    if (!sameOrigin(req)) {
      writeError(res, 403, 'forbidden', 'same-origin requests only')
      return
    }
    if (req.method !== 'POST') {
      writeError(res, 405, 'method-error', 'POST only')
      return
    }
    const pathname = new URL(req.url ?? '/', 'http://dsh.internal').pathname
    const prefix = `${ROUTE_PREFIX}/`
    if (!pathname.startsWith(prefix) || pathname.slice(prefix.length).includes('/')) {
      writeError(res, 404, 'not-found', 'unknown dsh-task-gantt API method')
      return
    }
    const method = pathname.slice(prefix.length)
    let payload: Record<string, unknown>
    try {
      payload = await readJsonBody(req)
    } catch (error) {
      writeError(res, 400, 'bad-request', error instanceof Error ? error.message : 'invalid body')
      return
    }
    try {
      if (method === 'ping') {
        writeJson(res, 200, { ok: true, value: { apiVersion: API_VERSION, host: 'dsh-task-gantt' } })
        return
      }
      if (method === 'timeline') {
        const sessionId = stringField(payload, 'sessionId')
        if (sessionId === undefined) {
          writeError(res, 400, 'bad-request', 'sessionId is required')
          return
        }
        const timeline: TimelineResponse = await buildTimeline(ctx, sessionId)
        writeJson(res, 200, { ok: true, value: timeline })
        return
      }
      writeError(res, 404, 'not-found', `unknown dsh-task-gantt API method "${method}"`)
    } catch (error) {
      // A read failure is never fatal for the panel: report the empty board and
      // say why, so the UI can show an honest note instead of a broken chart.
      ctx.logger?.warn?.(`dsh-task-gantt: ${method} failed: ${String(error)}`)
      writeError(res, 500, 'internal-error', error instanceof Error ? error.message : String(error))
    }
  }
}

/**
 * Build the timeline for one session — implemented in ./timeline.ts.
 * Re-exported here so the route module owns the wire shape and the data module
 * owns the derivation.
 */