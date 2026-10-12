/**
 * `foldWaitSpans` against a REAL session log, when this machine has one.
 *
 * This test exists because synthetic fixtures did NOT catch the defect it was written
 * after: on real data every `wait_agent` call carries TWO results — the real one, and a
 * re-append from the compaction machinery whose body is
 * `[dsh-jev-compaction] Historical tool output pruned…`, landing up to 51 minutes later.
 * A fold that kept the LAST result reported every wait with a duration of 15 minutes to
 * 21 hours, an outcome of "unknown" for all 24, and looked perfectly reasonable in every
 * fixture built by hand.
 *
 * It is `skipIf` rather than a silent early return on purpose: a test that quietly does
 * nothing when its input is missing is a false green, and this repo has been bitten by
 * exactly that before. When it cannot run, the summary says so.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, statSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { foldWaitSpans } from '../src/host/fold.ts'

/** The largest real session log on this machine, or `null`. */
function largestRealLog(): string | null {
  const root = join(homedir(), '.dsh', 'sessions')
  if (!existsSync(root)) return null
  let best: string | null = null
  let size = 0
  const walk = (dir: string, depth: number): void => {
    if (depth > 4) return
    let entries: string[]
    try {
      entries = readdirSync(dir)
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry)
      let stat
      try {
        stat = statSync(path)
      } catch {
        continue
      }
      if (stat.isDirectory()) walk(path, depth + 1)
      else if (entry === 'session.v4.jsonl.zstd' && stat.size > size) {
        size = stat.size
        best = path
      }
    }
  }
  walk(root, 0)
  if (best === null) return null
  try {
    execFileSync('zstdcat', ['--version'], { stdio: 'ignore' })
  } catch {
    return null
  }
  return best
}

const LOG = largestRealLog()

describe('foldWaitSpans against a real session log', () => {
  it.skipIf(LOG === null)('pairs every real wait with the result that actually ended it', () => {
    const text = execFileSync('zstdcat', [LOG as string], { maxBuffer: 1 << 30 }).toString('utf8')
    const events = text
      .split('\n')
      .filter((line) => line.trim() !== '')
      .map((line) => {
        try {
          return JSON.parse(line) as unknown
        } catch {
          return null
        }
      })
      .filter((event) => event !== null)

    const waits = foldWaitSpans(events, 'real')
    expect(waits.length, 'this log is known to contain wait_agent calls').toBeGreaterThan(0)

    for (const wait of waits) {
      if (wait.end === null) continue
      expect(wait.end, 'a wait cannot end before it starts').toBeGreaterThanOrEqual(wait.start)
      // The compaction re-append is minutes to hours after the real end; anything that
      // slow is the artifact, not the wait. The real maximum on this machine is 300s,
      // the largest timeout any caller asked for.
      const duration = wait.end - wait.start
      expect(duration, `wait of ${duration}ms looks like a compaction re-append, not a wait`).toBeLessThan(10 * 60 * 1000)
    }
    // Every real wait had a readable outcome; "unknown" for all of them is the signature
    // of pairing with the pruned re-append.
    const known = waits.filter((wait) => wait.timedOut !== undefined).length
    expect(known, `${waits.length - known} of ${waits.length} waits lost their outcome`).toBeGreaterThan(0)
  })
})
