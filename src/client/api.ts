/**
 * The client half's one HTTP client — SCAFFOLD ONLY (see docs/TEAM-BRIEF.md §6).
 *
 * Owner: teammate `ui`.
 */
import type { ApiEnvelope, TimelineResponse } from '../shared/contract.ts'
import { API_VERSION, ROUTE_PREFIX } from '../shared/contract.ts'

/** Resolve one of this plugin's routes against the page's own transport base. */
export function routeUrl(method: string): string {
  const path = `${ROUTE_PREFIX}/${method}`
  const base = typeof document === 'undefined' ? '/' : document.baseURI
  return new URL(path.replace(/^\//, ''), base).toString()
}

/** POST one JSON body and unwrap the plugin's envelope. */
export async function postJson<T>(method: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(routeUrl(method), {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  const envelope = (await res.json()) as ApiEnvelope<T>
  if (!envelope.ok) throw new Error(`${envelope.error.code}: ${envelope.error.message}`)
  return envelope.value
}

/** Read the timeline of one session. */
export async function fetchTimeline(sessionId: string): Promise<TimelineResponse> {
  const value = await postJson<TimelineResponse>('timeline', { sessionId, apiVersion: API_VERSION })
  return value
}
