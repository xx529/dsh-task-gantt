/**
 * The one-time reveal on the conversation's FIRST teammate.
 *
 * Three layers, because the honest question is not "does a timer fire" but
 * "does it fire for THIS conversation's first teammate, exactly once, and never
 * when the reader already had a team — nor when another conversation spawns
 * one":
 *
 * 1. the pure helpers (`sessionRowsOf`, `isTeammateRow`,
 *    `countDirectTeammates`, `firstTeammateDue`), exhaustively;
 * 2. the watcher driven with fake timers against a fake `sessions` feed, a fake
 *    `sidebarRight` column, and a fake `betterSidebar` service — including the
 *    capability-absent and implementation-throws paths, which are the ones a
 *    real deployment will hit on an older runtime;
 * 3. source guards, so the invariants that are cheap to lose in a refactor
 *    (capability by method presence, one open call site, no version strings)
 *    stay asserted.
 *
 * The API exercised here is the installed `dsh-better-sidebar@0.30.1` surface:
 * `BetterSidebarService.openTab(seed, scope?)` (`src/client/service.ts`),
 * `OpenTabSeed.reveal` defaulting to true (focus), the 0 → N
 * `detectNewDirectSubagent` trigger (`src/client/subagent-detect.ts`), its
 * 500 ms debounce (`src/client/sidebar/use-host-feeds.ts`), and
 * `ctx.sidebarRight.mounted` as the sanctioned "session on screen" feed
 * (`src/context-types.ts:545`).
 *
 * v0.3.4 replaced the old GLOBAL 0 → N counter with this per-conversation one:
 * on a machine that keeps finished subagent sessions in the list the global
 * baseline was already > 0 at page load, so the crossing could never happen and
 * the tab stayed shut. Test 6 below is that exact regression.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  countDirectTeammates,
  firstTeammateDue,
  isTeammateRow,
  sessionRowsOf,
  watchForFirstTeam,
} from '../src/client/index.ts'
import { TAB_TYPE_ID, type BetterSidebarTabService } from '../src/shared/contract.ts'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = readFileSync(resolve(ROOT, 'src/client/index.ts'), 'utf8')

/** One session-list snapshot with the given rows. */
function snapshot(rows: Record<string, Record<string, unknown>>): unknown {
  return { byId: rows }
}

/** A durable subagent child row. */
function teammateRow(parentId: string, over: Record<string, unknown> = {}): Record<string, unknown> {
  return { origin: 'subagent', parentId, displayTitle: 'teammate', ...over }
}

/** A root conversation row. */
function rootRow(): Record<string, unknown> {
  return { displayTitle: 'conversation' }
}

interface Harness {
  ctx: never
  setRows(rows: unknown): void
  setMounted(id: string | undefined): void
  emitList(): void
  emitMounted(): void
  listenerCount(): number
  setExpanded(value: boolean): void
  toggles(): number
}

/**
 * A fake client context: `sessions.list` and `sidebarRight.mounted` are
 * mutable feeds with real subscription semantics, and `toggleExpanded` records
 * its calls.
 */
function harness(
  options: {
    rows?: unknown
    mounted?: string | undefined
    subscribe?: boolean
    expanded?: boolean
    right?: boolean
    activeKind?: string
  } = {},
): Harness {
  let rows: unknown = options.rows ?? { byId: {} }
  let mounted = options.mounted
  let expanded = options.expanded ?? true
  let toggleCount = 0
  const listListeners = new Set<() => void>()
  const mountedListeners = new Set<() => void>()
  const subscribeTo = (listeners: Set<() => void>) => (listener: () => void): (() => void) => {
    listeners.add(listener)
    return () => { listeners.delete(listener) }
  }
  const useSubscribe = options.subscribe !== false
  const useRight = options.right !== false
  const ctx = {
    get(name: string) {
      if (name === 'sessions') {
        return {
          list: {
            getSnapshot: () => rows,
            ...(useSubscribe ? { subscribe: subscribeTo(listListeners) } : {}),
          },
        }
      }
      if (name === 'sidebarRight' && useRight) {
        return {
          mounted: {
            getSnapshot: () => mounted,
            ...(useSubscribe ? { subscribe: subscribeTo(mountedListeners) } : {}),
          },
          ...(options.activeKind === undefined ? {} : { active: () => ({ kind: options.activeKind }) }),
          isExpanded: () => expanded,
          toggleExpanded: () => { toggleCount += 1; expanded = true },
        }
      }
      return undefined
    },
  }
  return {
    ctx: ctx as never,
    setRows: (next) => { rows = next },
    setMounted: (id) => { mounted = id },
    emitList: () => { for (const listener of [...listListeners]) listener() },
    emitMounted: () => { for (const listener of [...mountedListeners]) listener() },
    listenerCount: () => listListeners.size + mountedListeners.size,
    setExpanded: (value) => { expanded = value },
    toggles: () => toggleCount,
  }
}

/** A fake better-sidebar service with spies. */
function fakeService(over: Record<string, unknown> = {}): {
  service: BetterSidebarTabService
  openTab: ReturnType<typeof vi.fn>
} {
  const openTab = vi.fn()
  const service = {
    registerTab: () => () => {},
    openTab,
    getSnapshot: () => ({ sessionId: undefined }),
    subscribeState: () => () => {},
    ...over,
  } as unknown as BetterSidebarTabService
  return { service, openTab }
}

/** Watch + seed one teammate + flush the debounce. */
function spawnFirstTeammate(h: Harness, seat: string): void {
  h.setRows(snapshot({
    [seat]: rootRow(),
    [`${seat}-child`]: teammateRow(seat),
  }))
  h.emitList()
}

afterEach(() => {
  vi.useRealTimers()
})

describe('auto-reveal: the conversation\'s first teammate', () => {
  /* --------------------------------------------------------- pure helpers */

  it('reads only a real byId record and is total over hostile snapshots', () => {
    expect(sessionRowsOf({ byId: { a: rootRow() } })).toEqual({ a: rootRow() })
    for (const value of [undefined, null, 0, '', 'nope', [], {}, { byId: null }, { byId: 'x' }, { byId: [] }]) {
      expect(sessionRowsOf(value), JSON.stringify(value) ?? 'undefined').toBeUndefined()
    }
  })

  it('counts only durable subagent children, scoped to the seat, minus Side Chat', () => {
    const rows = sessionRowsOf(snapshot({
      lead: rootRow(),
      a: teammateRow('lead'),
      b: teammateRow('lead'),
      'side-thread': teammateRow('lead', { displayTitle: 'Side: quick question' }),
      foreign: teammateRow('other'),
      'no-origin': { parentId: 'lead', displayTitle: 'not a subagent' },
      'broken-row': 3 as unknown as Record<string, unknown>,
    }))
    expect(countDirectTeammates(rows, 'lead')).toBe(2)
    expect(countDirectTeammates(rows, 'other')).toBe(1)
    expect(countDirectTeammates(rows, 'nobody')).toBe(0)
    // A bare parentId without the durable origin is NOT a teammate row.
    expect(countDirectTeammates(sessionRowsOf(snapshot({ x: { parentId: 'lead' } })), 'lead')).toBe(0)
    // Total when the list is unknown.
    expect(countDirectTeammates(undefined, 'lead')).toBe(0)
  })

  it('classifies one row exactly like better-sidebar\'s isSideThreadSummary, inverted', () => {
    expect(isTeammateRow(teammateRow('lead'))).toBe(true)
    // A title-less subagent (the list can publish a hydrating row) is a teammate.
    expect(isTeammateRow({ origin: 'subagent', parentId: 'lead' })).toBe(true)
    // Side Chat rides the subagent origin but is not team topology.
    expect(isTeammateRow(teammateRow('lead', { displayTitle: 'Side: hi' }))).toBe(false)
    expect(isTeammateRow(rootRow())).toBe(false)
    expect(isTeammateRow(undefined)).toBe(false)
    expect(isTeammateRow(null as unknown as undefined)).toBe(false)
  })

  it('fires only on a settled 0 → N crossing', () => {
    expect(firstTeammateDue(0, 1)).toBe(true)
    expect(firstTeammateDue(0, 5)).toBe(true)
    // No teammate yet.
    expect(firstTeammateDue(0, 0)).toBe(false)
    // The conversation already had a team when the reader arrived: its baseline
    // is the current count, so a later spawn is not the FIRST teammate.
    expect(firstTeammateDue(2, 3)).toBe(false)
    // Teammates finishing is not an invocation.
    expect(firstTeammateDue(2, 1)).toBe(false)
    expect(firstTeammateDue(2, 0)).toBe(false)
    // An unsettled watch never fires.
    expect(firstTeammateDue(undefined, 1)).toBe(false)
  })

  /* -------------------------------------------------------------- watcher */

  it('reveals once on the first teammate of the on-screen conversation', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead' })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    // Arming the baseline (0) must not reveal.
    expect(openTab).not.toHaveBeenCalled()

    spawnFirstTeammate(h, 'lead')
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledTimes(1)
    expect(openTab).toHaveBeenCalledWith(
      { type: TAB_TYPE_ID, title: expect.any(String), reveal: true },
      { sessionId: 'lead' },
    )

    // The team grows and shrinks for a long while: nothing more may happen.
    h.setRows(snapshot({ lead: rootRow(), a: teammateRow('lead'), b: teammateRow('lead') }))
    h.emitList()
    vi.advanceTimersByTime(10_000)
    h.setRows(snapshot({ lead: rootRow() }))
    h.emitList()
    vi.advanceTimersByTime(10_000)
    expect(openTab, 'a second teammate must not re-reveal (or re-take focus)').toHaveBeenCalledTimes(1)

    stop()
  })

  it('never fires for a teammate spawned in ANOTHER conversation (the v0.3.3 defect)', () => {
    vi.useFakeTimers()
    // The page opens with history: other conversations already have subagents,
    // so a GLOBAL 0 → N counter would be stuck at N > 0 forever.
    let rows = snapshot({
      lead: rootRow(),
      'old-a': teammateRow('other'),
      'old-b': teammateRow('another'),
    })
    const h = harness({ mounted: 'lead' })
    h.setRows(rows)
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    vi.advanceTimersByTime(2000)
    expect(openTab).not.toHaveBeenCalled()

    // A foreign conversation spawns another teammate: still not our first.
    rows = snapshot({
      lead: rootRow(),
      'old-a': teammateRow('other'),
      'old-b': teammateRow('another'),
      'old-c': teammateRow('other'),
    })
    h.setRows(rows)
    h.emitList()
    vi.advanceTimersByTime(2000)
    expect(openTab, 'a teammate of another conversation must not reveal this board').not.toHaveBeenCalled()

    // Our conversation spawns its first teammate: now it fires.
    rows = snapshot({
      lead: rootRow(),
      'old-a': teammateRow('other'),
      'old-b': teammateRow('another'),
      mine: teammateRow('lead'),
    })
    h.setRows(rows)
    h.emitList()
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledTimes(1)

    stop()
  })

  it('does not reveal for a conversation that already had a team', () => {
    vi.useFakeTimers()
    const h = harness({
      rows: snapshot({ lead: rootRow(), a: teammateRow('lead'), b: teammateRow('lead') }),
      mounted: 'lead',
    })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    vi.advanceTimersByTime(2000) // arms the baseline at 2
    h.setRows(snapshot({ lead: rootRow(), a: teammateRow('lead'), b: teammateRow('lead'), c: teammateRow('lead') }))
    h.emitList()
    vi.advanceTimersByTime(10_000)
    expect(openTab, 'a reload with an existing team must not steal the view').not.toHaveBeenCalled()
    stop()
  })

  it('waits for the seat row to be published before arming anything', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({}), mounted: 'lead' })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    vi.advanceTimersByTime(5000)
    expect(openTab, 'a hydrating list is not an empty conversation').not.toHaveBeenCalled()

    // The conversation row lands: now the baseline is armed at 0.
    h.setRows(snapshot({ lead: rootRow() }))
    h.emitList()
    spawnFirstTeammate(h, 'lead')
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledTimes(1)
    expect(openTab).toHaveBeenCalledWith(
      { type: TAB_TYPE_ID, title: expect.any(String), reveal: true },
      { sessionId: 'lead' },
    )
    stop()
  })

  it('re-arms the baseline for the conversation the reader switches to', () => {
    vi.useFakeTimers()
    // Conversation `a` already has a team, so it is quiet.
    const h = harness({
      rows: snapshot({ a: rootRow(), 'a-child': teammateRow('a') }),
      mounted: 'a',
    })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    vi.advanceTimersByTime(2000)
    expect(openTab).not.toHaveBeenCalled()

    // The reader starts a fresh conversation `b`: armed at 0.
    h.setRows(snapshot({ a: rootRow(), 'a-child': teammateRow('a'), b: rootRow() }))
    h.setMounted('b')
    h.emitMounted()
    expect(openTab).not.toHaveBeenCalled()

    // `b` spawns its first teammate: it fires, scoped to `b`.
    h.setRows(snapshot({
      a: rootRow(),
      'a-child': teammateRow('a'),
      b: rootRow(),
      'b-child': teammateRow('b'),
    }))
    h.emitList()
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledTimes(1)
    expect(openTab).toHaveBeenCalledWith(
      { type: TAB_TYPE_ID, title: expect.any(String), reveal: true },
      { sessionId: 'b' },
    )
    stop()
  })

  it('falls back to the store session when the host has no right column', () => {
    vi.useFakeTimers()
    // No sidebarRight service at all: the better-sidebar store names the seat.
    const h = harness({ rows: snapshot({ lead: rootRow() }), right: false })
    const { service, openTab } = fakeService({ getSnapshot: () => ({ sessionId: 'lead' }) })

    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, 'lead')
    h.emitList()
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledTimes(1)
    stop()
  })

  it('does not reveal on a teammate\'s own seat', () => {
    vi.useFakeTimers()
    const h = harness({
      rows: snapshot({ lead: rootRow(), child: teammateRow('lead') }),
      mounted: 'child',
    })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    // The teammate session spawns its own subagent: that is not a team board.
    h.setRows(snapshot({ lead: rootRow(), child: teammateRow('lead'), grandchild: teammateRow('child') }))
    h.emitList()
    vi.advanceTimersByTime(5000)
    expect(openTab).not.toHaveBeenCalled()
    stop()
  })

  it('focuses the page and expands a collapsed column', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead', expanded: false })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, 'lead')
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledWith(
      { type: TAB_TYPE_ID, title: expect.any(String), reveal: true },
      { sessionId: 'lead' },
    )
    expect(h.toggles(), 'a collapsed column is expanded for a focused open').toBe(1)
    stop()
  })

  it('parks the page on a narrow viewport instead of taking the screen', () => {
    vi.useFakeTimers()
    vi.stubGlobal('window', { innerWidth: 600 })
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead', expanded: false })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, 'lead')
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledWith(
      { type: TAB_TYPE_ID, title: expect.any(String), reveal: false },
      { sessionId: 'lead' },
    )
    expect(h.toggles(), 'the fullscreen column is never force-opened').toBe(0)
    stop()
  })

  it('honours the user disabling our tab type in the side-card prefs', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead' })
    const { service, openTab } = fakeService({ isTabEnabled: (id: string) => id !== TAB_TYPE_ID })

    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, 'lead')
    vi.advanceTimersByTime(500)
    expect(openTab, 'a disabled tab type is not opened behind the user\'s back').not.toHaveBeenCalled()
    stop()
  })

  it('is a silent no-op when the service has no openTab (older runtime)', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead' })
    // A service with `registerTab` but no reveal capability at all.
    const { service } = fakeService()
    delete (service as { openTab?: unknown }).openTab
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})

    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, 'lead')
    vi.advanceTimersByTime(20_000)
    expect(warn, 'no console noise on a missing capability').not.toHaveBeenCalled()
    stop()
  })

  it('swallows a throwing implementation and a throwing sessions feed', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead' })
    const openTab = vi.fn(() => {
      throw new Error('foreign service')
    })
    const service = { registerTab: () => () => {}, openTab } as unknown as BetterSidebarTabService

    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, 'lead')
    expect(() => vi.advanceTimersByTime(500)).not.toThrow()
    expect(openTab).toHaveBeenCalledTimes(1)
    stop()

    // A sessions service that throws on read is equally harmless.
    const hostile = {
      get: (name: string) => {
        if (name !== 'sessions') return undefined
        return {
          list: {
            getSnapshot: () => {
              throw new Error('nope')
            },
          },
        }
      },
    } as never
    const { service: service2, openTab: openTab2 } = fakeService()
    const stop2 = watchForFirstTeam(hostile, service2)
    expect(() => vi.advanceTimersByTime(10_000)).not.toThrow()
    expect(openTab2).not.toHaveBeenCalled()
    stop2()
  })

  it('the heartbeat covers a host that publishes no subscription', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead', subscribe: false })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    // The install-time pass already armed the baseline at 0.
    spawnFirstTeammate(h, 'lead')
    // No feed to notify us: the 2 s heartbeat re-reads the snapshot.
    vi.advanceTimersByTime(2000) // sees the new teammate → arms the 500 ms re-check
    vi.advanceTimersByTime(500)
    expect(openTab).toHaveBeenCalledTimes(1)
    stop()
  })

  it('detaches every feed and timer when the fiber disposes', () => {
    vi.useFakeTimers()
    const h = harness({ rows: snapshot({ lead: rootRow() }), mounted: 'lead' })
    const { service, openTab } = fakeService()

    const stop = watchForFirstTeam(h.ctx, service)
    expect(h.listenerCount(), 'both feeds are subscribed').toBeGreaterThan(0)
    stop()
    expect(h.listenerCount(), 'dispose detaches the subscriptions').toBe(0)
    // Idempotent: a second dispose is not an error.
    expect(() => stop()).not.toThrow()
    spawnFirstTeammate(h, 'lead')
    vi.advanceTimersByTime(10_000)
    expect(openTab, 'a disposed watcher must never open').not.toHaveBeenCalled()
  })

  /* -------------------------------------------------------- source guards */

  it('keeps the armed baseline across a transient “no session” gap', () => {
    vi.useFakeTimers()
    const seat = 'session-a'
    const h = harness({ mounted: seat, rows: snapshot({ [seat]: rootRow() }) })
    const { service, openTab } = fakeService()
    const stop = watchForFirstTeam(h.ctx, service)
    // First pass arms the baseline at 0.
    expect(openTab).not.toHaveBeenCalled()
    // The column remounts (or the list refreshes): mounted is briefly undefined.
    h.setMounted(undefined)
    h.emitMounted()
    // The teammate appears during that gap.
    h.setRows(snapshot({ [seat]: rootRow(), child: teammateRow(seat) }))
    h.emitList()
    // The seat comes back; the baseline must still be 0 → this is the first teammate.
    h.setMounted(seat)
    h.emitMounted()
    vi.advanceTimersByTime(1_000)
    expect(openTab, 'a transient gap must not turn the first teammate into a baseline').toHaveBeenCalledTimes(1)
    stop()
  })

  it('opens once when a conversation is first seen with a RUNNING teammate', () => {
    vi.useFakeTimers()
    const seat = 'session-a'
    const h = harness({
      mounted: seat,
      rows: snapshot({ [seat]: rootRow(), child: teammateRow(seat, { running: true }) }),
    })
    const { service, openTab } = fakeService()
    watchForFirstTeam(h.ctx, service)
    vi.advanceTimersByTime(1_000)
    expect(openTab, 'an active team appearing now is still the first teammate').toHaveBeenCalledTimes(1)
  })

  it('re-focuses the Gantt tab when another auto-open wins the seat', () => {
    vi.useFakeTimers()
    const seat = 'session-a'
    const h = harness({ mounted: seat, rows: snapshot({ [seat]: rootRow() }), activeKind: 'other-tab' })
    const { service, openTab } = fakeService()
    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, seat)
    vi.advanceTimersByTime(600) // first open already happened
    expect(openTab).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(800) // the 800 ms focus pass
    expect(openTab, 'the focus pass must re-open the same tab').toHaveBeenCalledTimes(2)
    expect(openTab.mock.calls[1]?.[0]).toMatchObject({ type: TAB_TYPE_ID, reveal: true })
    stop()
  })

  it('does not re-open when the Gantt tab already owns the seat', () => {
    vi.useFakeTimers()
    const seat = 'session-a'
    const h = harness({ mounted: seat, rows: snapshot({ [seat]: rootRow() }), activeKind: TAB_TYPE_ID })
    const { service, openTab } = fakeService()
    const stop = watchForFirstTeam(h.ctx, service)
    spawnFirstTeammate(h, seat)
    vi.advanceTimersByTime(1_500)
    expect(openTab).toHaveBeenCalledTimes(1)
    stop()
  })

  it('detects the capability by method presence and never by version', () => {
    // The documented rule (service.ts:651-657) is that `features` only grows and
    // consumers gate on membership — so no version string may appear here.
    // Comments are stripped first: the file header QUOTES the built-in's own
    // `openTab({ type: 'subagent' })` line, and a quote is not a call site.
    const code = SOURCE.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')
    expect(code).not.toMatch(/desktopVersion|version\s*[<>]=?\s*['"\d]|0\.2\.\d+-rc/)
    expect(code).toContain("typeof openTab !== 'function'")
    // The reveal is exactly one invocation, and it asks for the FOCUS on a wide
    // viewport (the parked narrow open is the same call with `reveal: false`).
    expect(code.match(/openTab\.call\s*\(/g)?.length, 'one reveal call site').toBe(1)
    expect(code).toContain('reveal: wide')
    // Idempotent by construction, not by luck: latch the conversation, then open.
    expect(code).toContain('revealed.add')
    expect(code).toMatch(/const wide = typeof window === 'undefined' \? true : window\.innerWidth/)
  })

  it('uses the same tab id it registers', () => {
    expect(TAB_TYPE_ID).toBe('dsh-task-gantt:board')
    expect(SOURCE).toContain('type: TAB_TYPE_ID')
  })
})
