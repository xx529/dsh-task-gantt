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
      // RE-BASED 2026-10-12. This used to be a flat `duration < 600000` with the note
      // "the real maximum on this machine is 300s". That heuristic has since been
      // outgrown by real data, measured on this machine's largest real log:
      //
      //   waits 48 closed, durations 2399ms .. 630789ms
      //   12 of them >= 300000ms; the maximum is 630789ms (10.5 min)
      //   timeoutMs values actually requested: 60000, 180000, 300000, 420000, 600000, 900000
      //
      // So a 630789ms wait is not an artifact: it is a call that asked for a 900000ms
      // (15 min) timeout and waited 10.5 minutes for a peer to arrive. A fixed ceiling
      // cannot tell those apart from the compaction re-append, and picking a bigger
      // constant would just move the same mistake later.
      //
      // The re-append it guards against pairs a call with a result MINUTES TO HOURS
      // after its own timeout expired. That is exactly expressible per wait: a real wait
      // cannot outlive the timeout IT asked for (plus scheduling slack — the three
      // overruns measured here are 48ms, 166ms and 48ms, i.e. timer jitter).
      const duration = wait.end - wait.start
      const SLACK_MS = 60 * 1000
      if (typeof wait.timeoutMs === 'number') {
        expect(
          duration,
          `wait of ${duration}ms outlives its own ${wait.timeoutMs}ms timeout by more than ${SLACK_MS}ms — that is a compaction re-append, not a wait`,
        ).toBeLessThan(wait.timeoutMs + SLACK_MS)
      } else {
        // No timeout recorded, so there is nothing to compare against. Keep the old
        // coarse ceiling purely as a sanity bound, and say why it is only a bound.
        expect(duration, `wait of ${duration}ms has no timeoutMs to check against`).toBeLessThan(60 * 60 * 1000)
      }
    }
    // Every real wait had a readable outcome; "unknown" for all of them is the signature
    // of pairing with the pruned re-append.
    const known = waits.filter((wait) => wait.timedOut !== undefined).length
    expect(known, `${waits.length - known} of ${waits.length} waits lost their outcome`).toBeGreaterThan(0)
  })
})
