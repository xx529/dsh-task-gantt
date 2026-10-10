/**
 * Route-layer tests: `src/host/timeline-route.ts` driven with fake
 * `req`/`res` objects (no server, no port).
 *
 * The route is the ONLY boundary the browser half talks to, so every status
 * code the contract promises is pinned here: same-origin fence (403), method
 * fence (405), unknown method (404), missing field/bad body (400), success
 * (200) — plus the one invariant that matters most for a debugging panel:
 * **the handler never throws out of `(req, res)`**.
 */
import { describe, expect, it } from 'vitest'
import { ROUTE_PREFIX } from '../src/shared/contract.ts'
import { buildTimelineHandler } from '../src/host/timeline-route.ts'
import { fakeContext, invoke } from './helpers/fake-http.ts'
import { assertTimeline } from './helpers/timeline-assert.ts'

const PING = `${ROUTE_PREFIX}/ping`
const TIMELINE = `${ROUTE_PREFIX}/timeline`
const HOST = '127.0.0.1:19387'

/** A handler on a context with no services mounted (worst-case degradation). */
function route() {
  return buildTimelineHandler(fakeContext())
}

/** The success envelope shape, asserted structurally. */
function expectOkBody(body: unknown): Record<string, unknown> {
  expect(body, JSON.stringify(body)).toMatchObject({ ok: true })
  const value = (body as { value: unknown }).value
  expect(value, 'the ok envelope must carry a value').toBeTruthy()
  return value as Record<string, unknown>
}

/** The failure envelope shape, asserted structurally. */
function expectErrorBody(body: unknown, code: string): void {
  expect(body, JSON.stringify(body)).toMatchObject({ ok: false, error: { code } })
  const error = (body as { error: { message: unknown } }).error
  expect(typeof error.message, 'the error envelope must carry a message').toBe('string')
  expect(String(error.message).length).toBeGreaterThan(0)
}

describe('POST /ping', () => {
  it('answers 200 with the api version and this plugin as host', async () => {
    const res = await invoke(route(), { url: PING, jsonBody: {} })
    expect(res.statusCode).toBe(200)
    expect(res.headers['content-type']).toContain('application/json')
    expect(res.headers['cache-control']).toBe('no-store')
    expect(res.endCalls).toBe(1)
    const value = expectOkBody(res.json)
    expect(value.apiVersion).toBe(1)
    expect(value.host).toBe('dsh-task-gantt')
  })

  it('accepts an empty body', async () => {
    const res = await invoke(route(), { url: PING, body: '' })
    expect(res.statusCode).toBe(200)
    expectOkBody(res.json)
  })
})

describe('POST /timeline', () => {
  it('answers 200 with a contract-valid TimelineResponse', async () => {
    const res = await invoke(route(), { url: TIMELINE, jsonBody: { sessionId: 'session-abc' } })
    expect(res.statusCode).toBe(200)
    const value = expectOkBody(res.json)
    // The frozen contract, enforced at runtime — not just in the type system.
    assertTimeline(value)
    expect(value.sessionId).toBe('session-abc')
    expect(value.generatedAt).toBeLessThanOrEqual(Date.now())
    expect(Array.isArray(value.lanes)).toBe(true)
    expect(Array.isArray(value.tasks)).toBe(true)
    expect(Array.isArray(value.notes)).toBe(true)
  })

  it('degrades to a non-throwing empty board when no service is mounted (source live|partial, notes non-empty)', async () => {
    const res = await invoke(route(), { url: TIMELINE, jsonBody: { sessionId: 'session-abc' } })
    expect(res.statusCode).toBe(200)
    const value = expectOkBody(res.json)
    assertTimeline(value)
    expect(['live', 'partial']).toContain(value.source)
    expect((value.notes as string[]).length, 'a degraded board must say why in notes').toBeGreaterThan(0)
  })

  it('rejects a missing sessionId with 400', async () => {
    const res = await invoke(route(), { url: TIMELINE, jsonBody: {} })
    expect(res.statusCode).toBe(400)
    expectErrorBody(res.json, 'bad-request')
  })

  it('rejects a non-string sessionId with 400', async () => {
    const res = await invoke(route(), { url: TIMELINE, jsonBody: { sessionId: 42 } })
    expect(res.statusCode).toBe(400)
    expectErrorBody(res.json, 'bad-request')
  })

  it('rejects an empty sessionId with 400', async () => {
    const res = await invoke(route(), { url: TIMELINE, jsonBody: { sessionId: '' } })
    expect(res.statusCode).toBe(400)
    expectErrorBody(res.json, 'bad-request')
  })

  it('rejects malformed JSON with 400', async () => {
    const res = await invoke(route(), { url: TIMELINE, body: '{ not json' })
    expect(res.statusCode).toBe(400)
    expectErrorBody(res.json, 'bad-request')
  })

  it('rejects a JSON array body with 400', async () => {
    const res = await invoke(route(), { url: TIMELINE, body: '[]' })
    expect(res.statusCode).toBe(400)
    expectErrorBody(res.json, 'bad-request')
  })
})

describe('method fence', () => {
  for (const method of ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD']) {
    it(`rejects ${method} with 405`, async () => {
      const res = await invoke(route(), { method, url: PING })
      expect(res.statusCode).toBe(405)
      expectErrorBody(res.json, 'method-error')
    })
  }
})

describe('same-origin fence', () => {
  it('rejects a cross-origin request with 403', async () => {
    const res = await invoke(route(), {
      url: TIMELINE,
      jsonBody: { sessionId: 'session-abc' },
      headers: { origin: 'http://evil.example', host: HOST },
    })
    expect(res.statusCode).toBe(403)
    expectErrorBody(res.json, 'forbidden')
  })

  it('rejects a malformed Origin with 403', async () => {
    const res = await invoke(route(), { url: PING, jsonBody: {}, headers: { origin: 'not a url', host: HOST } })
    expect(res.statusCode).toBe(403)
    expectErrorBody(res.json, 'forbidden')
  })

  it('rejects an Origin without a Host header with 403', async () => {
    const res = await invoke(route(), { url: PING, jsonBody: {}, headers: { origin: `http://${HOST}` } })
    expect(res.statusCode).toBe(403)
    expectErrorBody(res.json, 'forbidden')
  })

  it('accepts a matching Origin', async () => {
    const res = await invoke(route(), { url: PING, jsonBody: {}, headers: { origin: `http://${HOST}`, host: HOST } })
    expect(res.statusCode).toBe(200)
    expectOkBody(res.json)
  })

  it('accepts a request with no Origin at all (same-process fetch)', async () => {
    const res = await invoke(route(), { url: PING, jsonBody: {}, headers: { host: HOST } })
    expect(res.statusCode).toBe(200)
  })

  it('checks the origin BEFORE the method (a cross-origin GET is 403, not 405)', async () => {
    const res = await invoke(route(), { method: 'GET', url: PING, headers: { origin: 'http://evil.example', host: HOST } })
    expect(res.statusCode).toBe(403)
  })
})

describe('path fence', () => {
  it('404s an unknown method under the prefix', async () => {
    const res = await invoke(route(), { url: `${ROUTE_PREFIX}/nope`, jsonBody: {} })
    expect(res.statusCode).toBe(404)
    expectErrorBody(res.json, 'not-found')
  })

  it('404s a sub-path under a known method', async () => {
    const res = await invoke(route(), { url: `${ROUTE_PREFIX}/ping/extra`, jsonBody: {} })
    expect(res.statusCode).toBe(404)
  })

  it('404s a path outside the prefix', async () => {
    const res = await invoke(route(), { url: '/sidebar/api/timeline', jsonBody: {} })
    expect(res.statusCode).toBe(404)
  })

  it('404s an empty method (trailing slash)', async () => {
    const res = await invoke(route(), { url: `${ROUTE_PREFIX}/`, jsonBody: {} })
    expect(res.statusCode).toBe(404)
  })

  it('404s a case-mismatched method', async () => {
    const res = await invoke(route(), { url: `${ROUTE_PREFIX}/PING`, jsonBody: {} })
    expect(res.statusCode).toBe(404)
  })

  it('reads the path from a query-carrying URL', async () => {
    const res = await invoke(route(), { url: `${PING}?cache=1`, jsonBody: {} })
    expect(res.statusCode).toBe(200)
  })
})

describe('never throws out of the handler', () => {
  it('survives a context whose get() always throws', async () => {
    const warnings: string[] = []
    const handler = buildTimelineHandler(
      fakeContext({
        get: () => {
          throw new Error('service registry exploded')
        },
        warn: (message) => void warnings.push(message),
      }),
    )
    const res = await invoke(handler, { url: TIMELINE, jsonBody: { sessionId: 'session-abc' } })
    // Either an honest empty board (200) or an enveloped 500 — never a throw,
    // never an empty body, always the same envelope shape.
    expect([200, 500]).toContain(res.statusCode)
    expect(res.endCalls).toBe(1)
    if (res.statusCode === 200) {
      assertTimeline(expectOkBody(res.json))
    } else {
      expectErrorBody(res.json, 'internal-error')
      expect(warnings.length, 'a swallowed failure must be logged').toBeGreaterThan(0)
    }
  })

  it('answers a request whose body arrives in two chunks', async () => {
    const handler = route()
    // Deliver the JSON in two `data` events: the body reader must concatenate.
    const listeners = new Map<string, (chunk?: unknown) => void>()
    const req = {
      method: 'POST',
      url: TIMELINE,
      headers: {} as Record<string, string>,
      on(event: 'data' | 'end' | 'error', listener: (chunk?: unknown) => void) {
        listeners.set(event, listener)
        return req
      },
    }
    let body = ''
    const res = {
      statusCode: 0,
      setHeader: () => undefined,
      end: (chunk?: string) => {
        body = chunk ?? ''
      },
    }
    const pending = Promise.resolve(handler(req as any, res as any))
    await new Promise((resolveTick) => setTimeout(resolveTick, 0))
    listeners.get('data')?.(Buffer.from('{"sessionId":', 'utf8'))
    listeners.get('data')?.(Buffer.from('"session-abc"}', 'utf8'))
    listeners.get('end')?.()
    await pending
    expect(res.statusCode).toBe(200)
    expect(JSON.parse(body)).toMatchObject({ ok: true })
  })
})
