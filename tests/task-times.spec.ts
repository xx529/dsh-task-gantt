/**
 * The three instants a task popover must show, and the run derived from them.
 *
 * The user caught the defect in a screenshot: a task that was still running showed
 *
 *   created 10-12 22:50:11 / finished 10-12 22:50:21 进行中 / duration 9s
 *
 * — a "finished" line fed by the LAST transition of a task that had not finished, and a
 * duration that never moved. Their spec:
 *
 *   > 应该有创建，开始，结束三个时间，durations 如果不是在结束状态应该是开始时间到此时的
 *   > 时长，如果是结束了，就是开始到结束的时长
 *
 * Covers the three states the task asked for: running, finished, and never claimed.
 */
import { describe, expect, it } from 'vitest'

import { taskRunTimes } from '../src/client/ui/task-times.ts'
import type { TimelineTask } from '../src/shared/contract.ts'

/** Only the fields `taskRunTimes` reads, plus the status it branches on. */
function makeTask(status: TimelineTask['status'], history: TimelineTask['history']): TimelineTask {
  return {
    id: 't',
    revision: 1,
    subject: 'subject',
    description: 'description',
    status,
    blockedBy: [],
    writeScopes: [],
    ready: true,
    writeScopeWarnings: [],
    laneId: 'lead',
    history,
  } as TimelineTask
}

const T0 = 1_700_000_000_000
const MIN = 60_000
const event = (time: number, action: TimelineTask['history'][number]['action']) =>
  ({ time, action, revision: 1, sessionId: 'lead-session' }) as TimelineTask['history'][number]

describe('taskRunTimes', () => {
  describe('a RUNNING task', () => {
    // created -> claimed -> updated (the last transition that must NOT become an end)
    const running = makeTask('in_progress', [
      event(T0, 'created'),
      event(T0 + 10_000, 'claimed'),
      event(T0 + 20_000, 'updated'),
    ])

    it('has no end, and never uses the last transition as one', () => {
      const times = taskRunTimes(running, T0 + 30_000)
      expect(times.created).toBe(T0)
      expect(times.started).toBe(T0 + 10_000)
      // The `updated` at +20s must not appear here; that was the defect.
      expect(times.ended).toBeNull()
      expect(times.startedIsFallback).toBe(false)
    })

    it('duration is (now - started) and GROWS with the clock', () => {
      const early = taskRunTimes(running, T0 + 30_000)
      const later = taskRunTimes(running, T0 + 90_000)
      expect(early.durationMs).toBe(20_000)
      expect(later.durationMs).toBe(80_000)
      expect(later.durationMs).toBeGreaterThan(early.durationMs)
      // Measured from the CLAIM, not from `created`: +10s apart would be 20s/80s.
      expect(early.started).toBe(T0 + 10_000)
    })

    it('never reports a negative run if the clock lags the claim', () => {
      const times = taskRunTimes(running, T0)
      expect(times.durationMs).toBe(0)
    })
  })

  describe('a FINISHED task', () => {
    const finished = makeTask('completed', [
      event(T0, 'created'),
      event(T0 + 10_000, 'claimed'),
      event(T0 + 25_000, 'updated'),
      event(T0 + 40_000, 'completed'),
    ])

    it('ends at the completion, not at the last transition', () => {
      const times = taskRunTimes(finished, T0 + 10 * MIN)
      expect(times.created).toBe(T0)
      expect(times.started).toBe(T0 + 10_000)
      // The `completed` event, i.e. +40s — NOT the `updated` at +25s.
      expect(times.ended).toBe(T0 + 40_000)
    })

    it('duration is fixed at started -> ended and ignores the clock', () => {
      const atOnce = taskRunTimes(finished, T0 + 40_000)
      const muchLater = taskRunTimes(finished, T0 + 10 * MIN)
      expect(atOnce.durationMs).toBe(30_000)
      expect(muchLater.durationMs).toBe(30_000)
      expect(muchLater.durationMs).toBe(atOnce.durationMs)
    })

    it('uses the LAST completion when a task was reopened and finished again', () => {
      const reopened = makeTask('completed', [
        event(T0, 'created'),
        event(T0 + 10_000, 'claimed'),
        event(T0 + 20_000, 'completed'),
        event(T0 + 30_000, 'reopened'),
        event(T0 + 50_000, 'completed'),
      ])
      const times = taskRunTimes(reopened, T0 + 10 * MIN)
      // started stays the FIRST claim; ended is the last completion.
      expect(times.started).toBe(T0 + 10_000)
      expect(times.ended).toBe(T0 + 50_000)
      expect(times.durationMs).toBe(40_000)
    })

    it('a reopened-but-not-refinished task has no end', () => {
      const reopened = makeTask('in_progress', [
        event(T0, 'created'),
        event(T0 + 10_000, 'claimed'),
        event(T0 + 20_000, 'completed'),
        event(T0 + 30_000, 'reopened'),
      ])
      const times = taskRunTimes(reopened, T0 + 60_000)
      // Status says running, so the earlier completion is not an end.
      expect(times.ended).toBeNull()
      expect(times.durationMs).toBe(50_000)
      expect(times.started).toBe(T0 + 10_000)
    })
  })

  describe('a NEVER-CLAIMED task', () => {
    // created then only `observed`/`updated`: no claim ever happened.
    const neverClaimed = makeTask('pending', [
      event(T0, 'created'),
      event(T0 + 5_000, 'observed'),
      event(T0 + 8_000, 'updated'),
    ])

    it('falls back to created for started, and SAYS SO', () => {
      const times = taskRunTimes(neverClaimed, T0 + 60_000)
      expect(times.started, 'started falls back to created').toBe(T0)
      expect(times.startedIsFallback, 'the fallback is flagged, not silent').toBe(true)
      expect(times.ended).toBeNull()
      expect(times.durationMs).toBe(60_000)
    })

    it('a never-claimed FINISHED task ends at its completion', () => {
      const done = makeTask('completed', [event(T0, 'created'), event(T0 + 12_000, 'completed')])
      const times = taskRunTimes(done, T0 + 10 * MIN)
      expect(times.startedIsFallback).toBe(true)
      expect(times.started).toBe(T0)
      expect(times.ended).toBe(T0 + 12_000)
      expect(times.durationMs).toBe(12_000)
    })
  })

  it('survives a task whose history is empty or malformed', () => {
    const empty = makeTask('in_progress', [])
    const times = taskRunTimes(empty, T0 + 5_000)
    expect(times.created).toBe(T0 + 5_000) // falls back to the clock
    expect(times.ended).toBeNull()
    expect(times.durationMs).toBe(0)
    const junk = makeTask('in_progress', [null as unknown as TimelineTask['history'][number]])
    expect(() => taskRunTimes(junk, T0)).not.toThrow()
  })
})
