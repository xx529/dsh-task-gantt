/**
 * Regression reproduction for FINDINGS §15.5 — the empty-live shadowing defect.
 *
 * Not part of the test suite (that lives in `tests/`, owned by another track).
 * This is a runnable reproduction with the real host shape, so the fix can be
 * re-proved at any time on this machine:
 *
 * ```bash
 * node --experimental-strip-types src/host/dev-verify-channel.mts
 * ```
 *
 * The defect it pins: `readSessionLog` treats an **empty but well-formed** live
 * log as success, so the durable channel is never tried. The visible symptom was
 * an empty chart labelled `source: 'log'` — data loss plus a false provenance
 * claim. Before the fix this script printed `DEFECT CONFIRMED` with 0 spans; it
 * now prints `OK` with the disk log's spans.
 *
 * WHY THIS NEEDED ITS OWN FILE: every other probe uses a fake host whose live
 * and durable channels return the SAME array, so `live.ok` is true and non-empty
 * and this branch is unreachable. Reproducing it requires deliberately making the
 * two channels disagree — the lesson worth keeping.
 *
 * Exit code 0 = fixed, 1 = the defect is back.
 */
import { buildTimeline } from './timeline.ts'

const T = 1_800_000_000_000

/** The durable log: real history, including a user prompt and a full turn. */
const durableLog = [
  { type: 'session', version: 4, id: 's-root', createdAt: T, cwd: '/tmp' },
  { type: 'turn/start', seq: 1, time: T + 100, data: { turn: 1 } },
  { type: 'step/start', seq: 2, time: T + 200, data: { turn: 1, step: 1 } },
  { type: 'step/end', seq: 3, time: T + 300, data: {} },
  { type: 'turn/end', seq: 4, time: T + 400, data: {} },
  {
    type: 'user/message',
    seq: 5,
    time: T + 150,
    data: { content: [{ type: 'text', text: 'hi' }], source: { kind: 'user' }, role: 'user', id: 'm1' },
  },
]

/** A registered session whose in-memory log is EMPTY while the disk has it all. */
const ctx = {
  logger: { warn: (...args: unknown[]) => console.log('WARN', ...args) },
  get: (name: string) => {
    if (name === 'agents') {
      return {
        get: (id: string) =>
          id === 's-root'
            ? { id, status: 'idle', options: { model: 'x' }, session: { header: durableLog[0], snapshotEvents: () => [] } }
            : undefined,
        list: () => [],
      }
    }
    if (name === 'sessionPersistence') {
      return {
        async open(id: string) {
          if (id !== 's-root') throw new Error(`no such session: ${id}`)
          return { async read() { return { events: durableLog } }, async close() {} }
        },
      }
    }
    return undefined
  },
} as never

const value = await buildTimeline(ctx, 's-root')
const lead = value.lanes[0]
console.log('source       :', value.source)
console.log('lead spans   :', lead?.spans.length)
console.log('lead messages:', lead?.messages.length)
console.log('range        :', value.range.start, '->', value.range.end)

const ok = (lead?.spans.length ?? 0) > 0 && (lead?.messages.length ?? 0) > 0
console.log(
  ok
    ? '\nOK: the empty live read no longer shadows the durable log'
    : '\nDEFECT CONFIRMED: the durable log was ignored because the empty live read reported success',
)
process.exitCode = ok ? 0 : 1
