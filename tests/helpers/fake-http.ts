/**
 * Fake node `IncomingMessage` / `ServerResponse` pair for route tests.
 *
 * The host registers this plugin's handler through
 * `ctx.webServer.register({ kind: 'prefix', path, handler })`, so the handler's
 * only contract is the node request/response surface. These fakes implement
 * exactly that surface — no HTTP server, no port, no sockets — which keeps the
 * route tests hermetic and fast while still exercising the real handler.
 */
import type { Context } from '@deepseek-ai/cordis'

/** What the handler wrote back. */
export interface RecordedResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
  /** `end()` call count: a handler must write exactly one response per request. */
  endCalls: number
  /** `JSON.parse(body)`, when the body is JSON. */
  json: unknown
}

interface FakeRequest {
  method?: string
  url?: string
  headers: Record<string, string>
  on(event: 'data' | 'end' | 'error', listener: (chunk?: unknown) => void): FakeRequest
}

interface FakeResponse {
  statusCode: number
  setHeader(name: string, value: string): void
  end(body?: string): void
}

/** One request to run through the handler. */export interface RequestSpec {
  method?: string
  url?: string
  headers?: Record<string, string>
  /** Raw body text. Use `jsonBody` for an object. */
  body?: string
  /** Body serialized with `JSON.stringify`. */
  jsonBody?: unknown
  /** Deliver the request without ever firing `end` (a hung client). */
  neverEnd?: boolean
}

/**
 * Run one request through a route handler.
 *
 * @param handler - the handler returned by `buildTimelineHandler`.
 * @param spec - method / url / headers / body.
 * @returns everything the handler wrote, plus the parsed JSON when possible.
 */
export async function invoke(handler: (req: any, res: any) => unknown, spec: RequestSpec = {}): Promise<RecordedResponse> {
  const listeners = new Map<string, (chunk?: unknown) => void>()
  const req: FakeRequest = {
    method: spec.method ?? 'POST',
    url: spec.url ?? '/',
    headers: spec.headers ?? {},
    on(event, listener) {
      listeners.set(event, listener)
      return req
    },
  }
  const recorded: RecordedResponse = { statusCode: 0, headers: {}, body: '', endCalls: 0, json: undefined }
  const res: FakeResponse = {
    statusCode: 0,
    setHeader(name, value) {
      recorded.headers[name.toLowerCase()] = value
    },
    end(body) {
      recorded.endCalls += 1
      recorded.body = body ?? ''
    },
  }

  const pending = Promise.resolve(handler(req, res))
  // Let the handler reach its first `await` (which registers the body
  // listeners) before the body is delivered.
  await new Promise((resolveTick) => setTimeout(resolveTick, 0))
  const raw = spec.body ?? (spec.jsonBody === undefined ? undefined : JSON.stringify(spec.jsonBody))
  if (raw !== undefined) listeners.get('data')?.(Buffer.from(raw, 'utf8'))
  if (spec.neverEnd !== true) listeners.get('end')?.()
  await pending

  recorded.statusCode = res.statusCode
  try {
    recorded.json = JSON.parse(recorded.body)
  } catch {
    recorded.json = undefined
  }
  return recorded
}

/** A minimal host context stand-in: no services by default, warnings collected. */
export interface FakeContextOptions {
  /** `ctx.get(name)`; the default returns `undefined` for every service. */
  get?: (name: string) => unknown
  /** Called for every `ctx.logger.warn(...)`. */
  warn?: (message: string) => void
}

/**
 * Build a `Context`-shaped object good enough for this plugin's host code:
 * `get`, `logger`, `effect`, `on`. No service is mounted unless the caller
 * supplies one, which is exactly the degradation case the plugin must survive.
 */
export function fakeContext(options: FakeContextOptions = {}): Context {
  const ctx = {
    logger: {
      warn: options.warn ?? (() => undefined),
      info: () => undefined,
      error: () => undefined,
      debug: () => undefined,
    },
    get: options.get ?? (() => undefined),
    effect: (callback: () => unknown) => {
      callback()
      return () => undefined
    },
    on: () => () => undefined,
    inject: () => () => undefined,
  }
  return ctx as unknown as Context
}
