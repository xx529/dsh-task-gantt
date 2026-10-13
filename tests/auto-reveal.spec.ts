/**
 * The one-time reveal on the first sub-agent / team invocation.
 *
 * Two layers, because the honest question is not "does the timer fire" but
 * "does it fire EXACTLY once, only for the first invocation, and never break
 * anything when the API is absent":
 *
 * 1. the pure predicate and the counter, exhaustively;
 * 2. the watcher driven with fake timers against a fake `betterSidebar` and a
 *    fake `sessions` feed — including the capability-absent and
 *    implementation-throws paths, which are the ones a real deployment will hit
 *    on an older runtime.
 *
 * The API this exercises is quoted from the installed `dsh-better-sidebar@0.25.0`:
 * `BetterSidebarService.openTab(seed, scope?)` (`src/client/service.ts:639`),
 * `OpenTabSeed.reveal?: boolean` defaulting to true (`:483-491`). The built-in
 * it mirrors is `activateTasksPage` (`src/client/sidebar/use-host-feeds.ts:97`),
 * armed by a 0 → N direct-subagent transition (`src/client/subagent-detect.ts:47-56`)
 * after a 500 ms debounce (`use-host-feeds.ts:31`, used at `:258`).
 */
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { countSubagentSessions, isFirstSubagentTransition, watchForFirstTeam } from '../src/client/index.ts'
import { TAB_TYPE_ID, type BetterSidebarTabService } from '../src/shared/contract.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = readFileSync(resolve(ROOT, 'src/client/index.ts'), 'utf8')

/** One session-list snapshot with the given rows. */
function snapshot(rows: readonly Record<string, unknown>[]): unknown {
  return { byId: Object.fromEntries(rows.map((row, index) => [`s${index}`, row])) }
}

/** A row as the client feed publishes it (`origin` / `parentId`). */
function subagentRow(parentId = 'lead'): Record<string, unknown> {
  return { id: 'child', origin: 'subagent', parentId, displayTitle: 'teammate' }
}

/** A fake client context whose `sessions` read is swapped between ticks. */
function fakeCtx(read: () => unknown): { ctx: never; setFeed: (next: () => unknown) => void } {
  let feed = read
  const ctx = {
    get: (key: string) => (key === 'sessions' ? { list: { getSnapshot: () => feed() } } : undefined),
  }
  return { ctx: ctx as never, setFeed: (next) => { feed = next } }
}

/** A fake better-sidebar service with spies. */
function fakeService(over: Record<string, unknown> = {}): {
  service: BetterSidebarTabService
  openTab: ReturnType<typeof vi.fn>
} {
  const openTab = vi.fn()
  const service = { registerTab: () => () => {}, openTab, ...over } as unknown as BetterSidebarTabService
  return { service, openTab }
}

afterEach(() => {
  vi.useRealTimers()
})

describe('auto-reveal: the first sub-agent / team invocation', () => {
  /* ------------------------------------------------------- pure predicate */

  it('counts sub-agent rows in a session-list snapshot and nothing else', () => {
    expect(countSubagentSessions(snapshot([subagentRow(), subagentRow('other')]))).toBe(2)
    // A root conversation row is not a sub-agent.
    expect(countSubagentSessions(snapshot([{ id: 'lead', origin: undefined, parentId: undefined }]))).toBe(0)
    expect(countSubagentSessions(snapshot([{ id: 'x', origin: 'user' }]))).toBe(0)
    // A `parentId` without the durable `origin` is NOT a sub-agent row: the feed
    // publishes both, and better-sidebar's own counter requires `origin`.
    expect(countSubagentSessions(snapshot([{ id: 'x', parentId: 'lead' }]))).toBe(0)
  })

  it('is total over hostile snapshots', () => {
    for (const value of [undefined, null, 0, '', 'nope', [], {}, { byId: null }, { byId: 'x' }]) {
      expect(countSubagentSessions(value), JSON.stringify(value) ?? 'undefined').toBe(0)
    }
    // Non-object rows are skipped, not dereferenced.
    expect(countSubagentSessions({ byId: { a: null, b: 3, c: subagentRow() } })).toBe(1)
    expect(countSubagentSessions(Object.create(null))).toBe(0)
  })

  it('fires only on the 0 -> N crossing, exactly as the built-in does', () => {
    expect(isFirstSubagentTransition(0, 1)).toBe(true)
    expect(isFirstSubagentTransition(0, 5)).toBe(true)
    // No sub-agent yet.
    expect(isFirstSubagentTransition(0, 0)).toBe(false)
    // A page that ALREADY had a team when the plugin loaded: its baseline is the
    // current count, so a later spawn is not "the first invocation" and the view
    // is left alone. This is `detectNewDirectSubagent`'s documented behaviour.
    expect(isFirstSubagentTransition(3, 4)).toBe(false)
    // Sub-agents finishing is not an invocation.
    expect(isFirstSubagentTransition(2, 0)).toBe(false)
    expect(isFirstSubagentTransition(2, 1)).toBe(false)
  })

  /* ------------------------------------------------------------- watcher */

  it('reveals our tab exactly once, on the first sub-agent, and never again', () => {
    vi.useFakeTimers()
    let feed: unknown = snapshot([])
    const { ctx, setFeed } = fakeCtx(() => feed)
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(ctx, service)
    // First read only ARMS the baseline.
    vi.advanceTimersByTime(2000)
    expect(openTab, 'arming the baseline must not reveal').not.toHaveBeenCalled()

    // The first teammate is spawned.
    setFeed(() => snapshot([subagentRow()]))
    vi.advanceTimersByTime(2000)
    expect(openTab).toHaveBeenCalledTimes(1)
    expect(openTab).toHaveBeenCalledWith({ type: TAB_TYPE_ID, title: expect.any(String), reveal: true })

    // The team grows and shrinks for a long while: nothing more may happen.
    setFeed(() => snapshot([subagentRow(), subagentRow('lead2')]))
    vi.advanceTimersByTime(2000)
    setFeed(() => snapshot([subagentRow()]))
    vi.advanceTimersByTime(2000)
    setFeed(() => snapshot([]))
    vi.advanceTimersByTime(2000)
    setFeed(() => snapshot([subagentRow()]))
    vi.advanceTimersByTime(10_000)
    expect(openTab, 'a second invocation must not re-reveal (or re-take focus)').toHaveBeenCalledTimes(1)

    stop()
  })

  it('does not reveal for a team that already existed before the plugin loaded', () => {
    vi.useFakeTimers()
    let feed: unknown = snapshot([subagentRow(), subagentRow('p2')])
    const { ctx, setFeed } = fakeCtx(() => feed)
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(ctx, service)
    vi.advanceTimersByTime(2000) // arms the baseline at 2
    setFeed(() => snapshot([subagentRow(), subagentRow('p2'), subagentRow('p3')]))
    vi.advanceTimersByTime(10_000)
    expect(openTab, 'a reload with an existing team must not steal the view').not.toHaveBeenCalled()
    stop()
  })

  it('is a silent no-op when the service has no openTab (older runtime)', () => {
    vi.useFakeTimers()
    const { ctx, setFeed } = fakeCtx(() => snapshot([]))
    // A service with `registerTab` but no reveal capability at all.
    const { service } = fakeService()
    delete (service as { openTab?: unknown }).openTab
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const stop = watchForFirstTeam(ctx, service)
    setFeed(() => snapshot([subagentRow()]))
    vi.advanceTimersByTime(20_000)
    expect(warn, 'no console noise on a missing capability').not.toHaveBeenCalled()
    stop()
  })

  it('swallows a throwing implementation and a throwing sessions feed', () => {
    vi.useFakeTimers()
    let feed: unknown = snapshot([])
    const { ctx, setFeed } = fakeCtx(() => feed)
    const openTab = vi.fn(() => {
      throw new Error('foreign service')
    })
    const service = { registerTab: () => () => {}, openTab } as unknown as BetterSidebarTabService

    const stop = watchForFirstTeam(ctx, service)
    vi.advanceTimersByTime(2000)
    setFeed(() => snapshot([subagentRow()]))
    // Must not throw out of the timer.
    expect(() => vi.advanceTimersByTime(2000)).not.toThrow()
    expect(openTab).toHaveBeenCalledTimes(1)
    stop()

    // A sessions service that throws on read is equally harmless.
    const hostile = {
      get: () => ({
        list: {
          getSnapshot: () => {
            throw new Error('nope')
          },
        },
      }),
    } as never
    const { service: service2, openTab: openTab2 } = fakeService()
    const stop2 = watchForFirstTeam(hostile, service2)
    expect(() => vi.advanceTimersByTime(10_000)).not.toThrow()
    expect(openTab2).not.toHaveBeenCalled()
    stop2()
  })

  it('honours the user disabling our tab type in the side-card prefs', () => {
    vi.useFakeTimers()
    let feed: unknown = snapshot([])
    const { ctx, setFeed } = fakeCtx(() => feed)
    const { service, openTab } = fakeService({ isTabEnabled: (id: string) => id !== TAB_TYPE_ID })

    const stop = watchForFirstTeam(ctx, service)
    vi.advanceTimersByTime(2000)
    setFeed(() => snapshot([subagentRow()]))
    vi.advanceTimersByTime(2000)
    expect(openTab, 'a disabled tab type is not opened behind the user\'s back').not.toHaveBeenCalled()
    stop()
  })

  it('stops its timer when the fiber disposes', () => {
    vi.useFakeTimers()
    const setSpy = vi.spyOn(globalThis, 'setInterval')
    const clearSpy = vi.spyOn(globalThis, 'clearInterval')
    const { ctx } = fakeCtx(() => snapshot([]))
    const { service } = fakeService()

    const stop = watchForFirstTeam(ctx, service)
    expect(setSpy).toHaveBeenCalledTimes(1)
    stop()
    expect(clearSpy).toHaveBeenCalled()
    // Idempotent: a second dispose is not an error.
    expect(() => stop()).not.toThrow()
  })

  /* ------------------------------------------------------ source guards */

  it('detects the capability by method presence and never by version', () => {
    // The documented rule (service.ts:651-657) is that `features` only grows and
    // consumers gate on membership — so no version string may appear here.
    // Comments are stripped first: the file header QUOTES the built-in's own
    // `openTab({ type: 'subagent' })` line, and a quote is not a call site.
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(code).not.toMatch(/desktopVersion|version\s*[<>]=?\s*['"\d]|0\.2\.\d+-rc/)
    expect(code).toContain("typeof openTab !== 'function'")
    // The reveal is exactly one invocation, and it asks for the focus.
    expect(code.match(/openTab\.call\s*\(/g)?.length, 'one reveal call site').toBe(1)
    expect(code).toContain('reveal: true')
    // And it must be idempotent by construction, not by luck: the watch marks
    // itself done before calling, then stops.
    expect(code).toContain('done = true')
    expect(code).toContain('stop()')
  })

  it('uses the same tab id it registers', () => {
    expect(TAB_TYPE_ID).toBe('dsh-task-gantt:board')
    expect(SOURCE).toContain("type: TAB_TYPE_ID")
  })
})
