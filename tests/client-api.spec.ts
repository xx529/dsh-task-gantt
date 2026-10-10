/**
 * Client transport tests (`src/client/api.ts` owner: ui, `src/client/transport.ts`
 * owner: Lead).
 *
 * The bug these pin: resolving a host route against `window.location.origin`
 * drops the page's own prefix, so a reverse-proxied page
 * (`https://host/dataops/proxy/3080/`) and the desktop shell (`dsh-app://app/`)
 * both 404. DSH's own client resolves `new URL(path.slice(1), transport ??
 * document.baseURI)` — a DOCUMENT-RELATIVE path — and this plugin follows it.
 *
 * No DOM is needed: `document` / `__DSH_TRANSPORT__` / `fetch` are stubbed and
 * `unstubGlobals` in `vitest.config.ts` restores them after each test.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiHttpError, fetchTimeline, postJson, routeUrl } from '../src/client/api.ts'
import { resolveHostRoute } from '../src/client/transport.ts'
import { API_VERSION, ROUTE_PREFIX } from '../src/shared/contract.ts'

/** A `Response`-shaped stub — only what `postJson` reads. */
function jsonResponse(status: number, body: unknown): Response {
  const text = typeof body === 'string' ? body : JSON.stringify(body)
  return { status, ok: status >= 200 && status < 300, text: async () => text } as unknown as Response
}

/** Capture the (url, init) of the next `fetch`. */
function stubFetch(response: Response): ReturnType<typeof vi.fn> {
  const spy = vi.fn(async () => response)
  vi.stubGlobal('fetch', spy)
  return spy
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('routeUrl — document-relative resolution', () => {
  it('keeps a reverse-proxy page prefix', () => {
    vi.stubGlobal('document', { baseURI: 'https://h/dataops/proxy/3080/' })
    expect(routeUrl('timeline')).toBe('https://h/dataops/proxy/3080/dsh-task-gantt/api/timeline')
  })

  it('resolves against the desktop shell base', () => {
    vi.stubGlobal('document', { baseURI: 'dsh-app://app/' })
    expect(routeUrl('ping')).toBe('dsh-app://app/dsh-task-gantt/api/ping')
  })

  it('prefers the shell transport base over document.baseURI', () => {
    vi.stubGlobal('document', { baseURI: 'https://h/dataops/proxy/3080/' })
    vi.stubGlobal('__DSH_TRANSPORT__', { streamBaseUrl: 'https://shell.example/remote/7/' })
    expect(routeUrl('timeline')).toBe('https://shell.example/remote/7/dsh-task-gantt/api/timeline')
  })

  it('builds the path from the frozen ROUTE_PREFIX', () => {
    vi.stubGlobal('document', { baseURI: 'https://h/' })
    expect(routeUrl('timeline')).toBe(`https://h${ROUTE_PREFIX}/timeline`)
  })

  it('lets an injected routeBase win over both bases', () => {
    vi.stubGlobal('document', { baseURI: 'https://h/ignored/' })
    vi.stubGlobal('__DSH_TRANSPORT__', { streamBaseUrl: 'https://ignored.example/' })
    const seen: string[] = []
    const url = routeUrl('timeline', {
      routeBase: (path) => {
        seen.push(path)
        return `https://injected.example${path}`
      },
    })
    expect(url).toBe('https://injected.example/dsh-task-gantt/api/timeline')
    expect(seen).toEqual(['/dsh-task-gantt/api/timeline'])
  })

  it('falls back to the document-relative path when no base exists', () => {
    vi.stubGlobal('document', undefined)
    vi.stubGlobal('__DSH_TRANSPORT__', undefined)
    expect(routeUrl('timeline')).toBe('dsh-task-gantt/api/timeline')
  })
})

describe('resolveHostRoute', () => {
  it('prefers the mounted service hostRouteUrl', () => {
    vi.stubGlobal('document', { baseURI: 'https://h/' })
    expect(resolveHostRoute('/dsh-task-gantt/api/ping', { hostRouteUrl: (path) => `sidebar:${path}` })).toBe('sidebar:/dsh-task-gantt/api/ping')
  })

  it('falls through when hostRouteUrl throws (a foreign service must not break the panel)', () => {
    vi.stubGlobal('document', { baseURI: 'https://h/' })
    const url = resolveHostRoute('/dsh-task-gantt/api/ping', {
      hostRouteUrl: () => {
        throw new Error('service exploded')
      },
    })
    expect(url).toBe('https://h/dsh-task-gantt/api/ping')
  })

  it('accepts a path without a leading slash', () => {
    vi.stubGlobal('document', { baseURI: 'https://h/proxy/' })
    expect(resolveHostRoute('dsh-task-gantt/api/ping')).toBe('https://h/proxy/dsh-task-gantt/api/ping')
  })
})

describe('postJson — envelope handling', () => {
  it('POSTs JSON and unwraps a success envelope', async () => {
    vi.stubGlobal('document', { baseURI: 'https://h/' })
    const spy = stubFetch(jsonResponse(200, { ok: true, value: { answer: 42 } }))
    await expect(postJson<{ answer: number }>('ping', { a: 1 })).resolves.toEqual({ answer: 42 })
    const [url, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://h/dsh-task-gantt/api/ping')
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>)['content-type']).toBe('application/json')
    expect(init.body).toBe('{"a":1}')
    expect(init.signal).toBeUndefined()
  })

  it('throws the envelope error for a failure envelope', async () => {
    vi.stubGlobal('document', { baseURI: 'https://h/' })
    stubFetch(jsonResponse(403, { ok: false, error: { code: 'forbidden', message: 'same-origin requests only' } }))
    await expect(postJson('timeline', {})).rejects.toThrow('forbidden: same-origin requests only')
  })

  it('throws an ApiHttpError carrying the status for a non-JSON body', async () => {
    vi.stubGlobal('document', { baseURI: 'https://h/' })
    stubFetch(jsonResponse(502, '<html>bad gateway</html>'))
    await expect(postJson('timeline', {})).rejects.toBeInstanceOf(ApiHttpError)
    await postJson('timeline', {}).catch((error: unknown) => {
      expect((error as ApiHttpError).status).toBe(502)
      expect((error as ApiHttpError).message).toContain('502')
    })
  })

  it('forwards an AbortSignal when given one', async () => {
    vi.stubGlobal('document', { baseURI: 'https://h/' })
    const spy = stubFetch(jsonResponse(200, { ok: true, value: null }))
    const controller = new AbortController()
    await postJson('timeline', {}, { signal: controller.signal })
    const [, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(init.signal).toBe(controller.signal)
  })
})

describe('fetchTimeline', () => {
  it('posts the session id and the frozen api version', async () => {
    vi.stubGlobal('document', { baseURI: 'https://h/proxy/' })
    const spy = stubFetch(jsonResponse(200, { ok: true, value: { apiVersion: API_VERSION } }))
    await fetchTimeline('session-abc')
    const [url, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://h/proxy/dsh-task-gantt/api/timeline')
    expect(JSON.parse(String(init.body))).toEqual({ sessionId: 'session-abc', apiVersion: API_VERSION })
  })
})
