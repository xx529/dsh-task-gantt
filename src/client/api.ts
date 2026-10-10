/**
 * The client half's one HTTP client.
 *
 * Owner: teammate `ui` (write scope `src/client/api.ts`).
 *
 * Route shape (host half, `src/host/timeline-route.ts`): POST
 * `<ROUTE_PREFIX>/timeline` with a JSON body, answered with
 * {@link ApiEnvelope}.
 *
 * The URL is resolved through {@link resolveHostRoute} (`../transport.ts`,
 * owner: Lead), which follows DSH's own client exactly:
 * `new URL(path.slice(1), __DSH_TRANSPORT__?.streamBaseUrl ?? document.baseURI)`
 * — the leading slash is STRIPPED so the path stays document-relative and keeps
 * any reverse-proxy page prefix, and a shell-owned Host on another origin
 * supplies the base through the transport. Resolving against
 * `window.location.origin` (the previous implementation) is WRONG on a proxied
 * sub-path (`https://host/dataops/proxy/3080/`) and on the desktop shell
 * (`dsh-app://app/`): both leave the page prefix behind and 404.
 * Source: `/Applications/DeepSeek Harness.app/Contents/Resources/app.asar` →
 * `stream-client.js`; also dsh-better-sidebar's external-plugin guide §6.
 */
import type { ApiEnvelope, TimelineResponse } from '../shared/contract.ts'
import { API_VERSION, ROUTE_PREFIX } from '../shared/contract.ts'
import { resolveHostRoute } from './transport.ts'

/**
 * A route resolver the shell can inject from `src/client/index.ts`, where the
 * mounted better-sidebar service is in scope:
 * `(path) => resolveHostRoute(path, sidebar)`.
 */
export type RouteBase = (path: string) => string

export interface RequestOptions {
  /** Aborts the request (the board aborts its poll on unmount / hide). */
  signal?: AbortSignal
  /** Shell-injected resolver; falls back to {@link resolveHostRoute}. */
  routeBase?: RouteBase
}

/** Resolve one of this plugin's routes against the page's transport base. */
export function routeUrl(method: string, options?: RequestOptions): string {
  const path = `${ROUTE_PREFIX}/${method}`
  if (options?.routeBase !== undefined) return options.routeBase(path)
  return resolveHostRoute(path)
}

/** The HTTP status + message of a failed route call. */
export class ApiHttpError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiHttpError'
    this.status = status
  }
}

/** POST one JSON body and unwrap the plugin's envelope. */
export async function postJson<T>(
  method: string,
  body: Record<string, unknown>,
  options?: RequestOptions,
): Promise<T> {
  const res = await fetch(routeUrl(method, options), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
    ...(options?.signal === undefined ? {} : { signal: options.signal }),
  })
  const text = await res.text()
  let envelope: ApiEnvelope<T> | undefined
  try {
    envelope = JSON.parse(text) as ApiEnvelope<T>
  } catch {
    envelope = undefined
  }
  if (envelope === undefined) {
    throw new ApiHttpError(res.status, `HTTP ${res.status}: ${text.slice(0, 200)}`)
  }
  if (!envelope.ok) throw new Error(`${envelope.error.code}: ${envelope.error.message}`)
  return envelope.value
}

/** Read the timeline of one session (the board's only request). */
export async function fetchTimeline(
  sessionId: string,
  options?: RequestOptions,
): Promise<TimelineResponse> {
  return postJson<TimelineResponse>('timeline', { sessionId, apiVersion: API_VERSION }, options)
}
