/**
 * created / started / ended, and the run duration, for one task.
 *
 * The user's spec, verbatim:
 *
 *   > 应该有创建，开始，结束三个时间，durations 如果不是在结束状态应该是开始时间到此时的
 *   > 时长，如果是结束了，就是开始到结束的时长
 *
 * Three DISTINCT instants, which are not interchangeable:
 *   - `created`: the first `created` event (or the first event of any kind);
 *   - `started`: the first `claimed`/`reopened` event — when work actually began;
 *   - `ended`:   a `completed` event for a finished task, otherwise `null`.
 *
 * The last transition is deliberately NOT used as an end. Doing that is what produced
 * the reported defect: a task still running showed `finished 10-12 22:50:21 进行中`,
 * i.e. a fake end taken from its most recent `updated`/`observed` tick.
 *
 * `durationMs = (ended ?? now) - started`, so a RUNNING task's duration grows with the
 * clock and a finished one is fixed at started -> ended.
 *
 * CHOICE, stated rather than hidden: a task with no `claimed`/`reopened` event was never
 * claimed, so `started` FALLS BACK TO `created` and `startedIsFallback` is set, letting
 * the UI say "开始时间按创建计（从未认领）" instead of silently inventing a claim. The
 * alternative — "—" and no duration — would leave the common never-claimed case with no
 * duration at all.
 *
 * Kept in its own module (not inside the chart component) so a unit test can lock the
 * three states without pulling React and the whole renderer into the test graph.
 */
import type { TimelineTask } from '../../shared/contract.ts'

/** The three instants plus the derived run. */
export interface TaskRunTimes {
  created: number
  started: number
  /** `null` while the task has not ended. Never a stand-in last transition. */
  ended: number | null
  /** `(ended ?? now) - started`, floored at 0. */
  durationMs: number
  /** `true` when there was no claim and `started` was taken from `created`. */
  startedIsFallback: boolean
}

/**
 * @param task - the task, with its `history`.
 * @param now - the live clock, used as the end for a task that has not ended.
 */
export function taskRunTimes(task: TimelineTask, now: number): TaskRunTimes {
  const history = task.history ?? []
  const first = (action: string): number | null => {
    for (const event of history) {
      if (event !== null && typeof event === 'object' && event.action === action && Number.isFinite(event.time)) {
        return event.time
      }
    }
    return null
  }
  const firstTime = history.find(
    (event) => event !== null && typeof event === 'object' && Number.isFinite(event.time),
  )?.time
  const created = first('created') ?? firstTime ?? now
  /**
   * A finished task ends at its LAST completion, not its first: a task that was
   * completed, reopened and completed again is finished at the second one. Only taken
   * when the status says finished, so a reopen cannot leave a stale end behind.
   */
  const finished = task.status === 'completed' || task.status === 'deleted'
  let ended: number | null = null
  if (finished) {
    for (let i = history.length - 1; i >= 0; i -= 1) {
      const event = history[i]
      if (
        event !== null &&
        typeof event === 'object' &&
        event.action === 'completed' &&
        Number.isFinite(event.time)
      ) {
        ended = event.time
        break
      }
    }
  }
  const claimed = first('claimed') ?? first('reopened')
  const startedIsFallback = claimed === null
  const started = claimed ?? created
  // `now` may lag a recorded instant (a replayed log, or a test clock); never report a
  // negative run.
  const durationMs = Math.max(0, (ended ?? Math.max(now, started)) - started)
  return { created, started, ended, durationMs, startedIsFallback }
}
