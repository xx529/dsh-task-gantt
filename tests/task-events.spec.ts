/**
 * The CLAIM rail: when did a task actually start executing?
 *
 * The bar's two ends answer "created" and "completed", so the missing instant is the
 * claim. `claimInstant` resolves it from the event history (the ONE vocabulary the panel
 * already prints), and `claimOffsetPx` turns it into the x offset of the tick that the
 * task card draws under its bar.
 *
 * The old spec asserted the removed multi-glyph transition rail (＋/▶/✓ under every
 * bar). That encoding was replaced on purpose: three glyphs per task needed a legend
 * entry to be readable, while the claim is the only one of the three instants the bar's
 * geometry does not already show.
 */
import { describe, expect, it } from 'vitest'
import type { TaskEvent, TimelineResponse } from '../src/shared/contract.ts'
import {
  DEFAULT_HEADER_HEIGHT,
  DEFAULT_LANE_HEIGHT,
  claimInstant,
  claimOffsetPx,
  layoutTimeline,
  type TaskCardRect,
} from '../src/client/ui/timeline-layout.ts'
import { claimStart } from '../src/client/ui/task-times.ts'
import { validTimeline } from './helpers/timeline-assert.ts'

function event(time: number, action: TaskEvent['action']): TaskEvent {
  return { time, action, revision: 1, sessionId: 'session-a' }
}

/** A card whose bar starts at x=40 and is 100px wide. */
function card(claimAt: number | null, over: Partial<TaskCardRect> = {}): TaskCardRect {
  return {
    laneId: 'lead',
    laneIndex: 0,
    task: {
      id: 't1',
      revision: 2,
      laneId: 'lead',
      subject: 's',
      description: '',
      status: 'in_progress',
      blockedBy: [],
      writeScopes: [],
      ready: true,
      writeScopeWarnings: [],
      history: [event(10_000, 'created')],
    },
    anchor: 'history',
    at: 10_000,
    durationMs: 1_000,
    historyIndex: 0,
    claimAt,
    x: 40,
    y: 0,
    h: 34,
    w: 100,
    barY: 36,
    barH: 22,
    viewX: 40,
    visible: true,
    live: false,
    labelPlacement: 'inside',
    labelX: 40,
    labelY: 0,
    labelW: 100,
    labelH: 34,
    ...over,
  }
}

describe('claimInstant: the first claim of the CURRENT execution', () => {
  it('is null for a task that was created but never claimed', () => {
    expect(claimInstant([event(10_000, 'created')])).toBeNull()
    expect(claimInstant([])).toBeNull()
  })

  it('returns the claimed event that follows the creation', () => {
    expect(
      claimInstant([event(10_000, 'created'), event(10_200, 'claimed'), event(10_500, 'completed')]),
    ).toBe(10_200)
  })

  it('keeps the FIRST claim through a reopen, matching the drawer\'s 认领 column', () => {
    // created -> claimed -> reopened -> claimed. `claimStart` (the drawer's source of
    // truth) treats the run as continuous, so the rail must not invent a second start:
    // the two places where the user reads "认领" would otherwise disagree.
    const history = [
      event(10_000, 'created'),
      event(10_100, 'claimed'),
      event(10_400, 'reopened'),
      event(10_600, 'claimed'),
      event(10_900, 'completed'),
    ]
    expect(claimInstant(history)).toBe(10_100)
    expect(claimInstant(history)).toBe(claimStart(history))
  })

  it('counts a reopen as the start when the task was never claimed', () => {
    expect(claimInstant([event(10_000, 'created'), event(10_400, 'reopened')])).toBe(10_400)
  })

  it('is null after a plain creation that was never claimed', () => {
    expect(claimInstant([event(10_000, 'created'), event(10_200, 'updated')])).toBeNull()
  })

  it('takes the FIRST claim of a burst, not the last', () => {
    expect(
      claimInstant([
        event(10_000, 'created'),
        event(10_100, 'claimed'),
        event(10_120, 'claimed'),
        event(10_200, 'completed'),
      ]),
    ).toBe(10_100)
  })
})

describe('claimOffsetPx: where the tick lands inside the bar', () => {
  it('puts a claimed task at the fraction of the bar its elapsed time implies', () => {
    // 1s per px, claim 0.4s in => 0.4px. Small numbers on purpose: the tick must not be
    // rounded to "roughly the right place".
    const rect = card(10_000 + 400, { at: 10_000, w: 100 })
    expect(claimOffsetPx(rect, 1_000)).toBeCloseTo(0.4, 6)
  })

  it('draws the whole rail as queued when the task was never claimed', () => {
    expect(claimOffsetPx(card(null), 1_000)).toBe(100)
  })

  it('clamps a claim outside the drawn span onto the bar', () => {
    // A task that started before the window: `at` is clamped to the window edge but the
    // claim keeps its real time. The tick must stay on the card, never past its end.
    expect(claimOffsetPx(card(120_000, { at: 10_000, w: 100 }), 1_000)).toBe(100)
    expect(claimOffsetPx(card(5_000, { at: 10_000, w: 100 }), 1_000)).toBe(0)
  })

  it('treats an unusable scale as "no claim position" instead of NaN', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(claimOffsetPx(card(10_100), bad), `msPerPx=${String(bad)}`).toBe(100)
    }
  })
})

describe('layout wiring: the task card carries the claim instant', () => {
  it('computes claimAt from the task history', () => {
    const data: TimelineResponse = validTimeline()
    const start = data.range.start
    const history = [
      event(start, 'created'),
      event(start + 500, 'claimed'),
      event(start + 1_000, 'completed'),
    ]
    const task = data.tasks[0]
    const laneTask = data.lanes[0]?.tasks[0]
    if (task === undefined || laneTask === undefined) throw new Error('fixture has no task')
    task.status = 'completed'
    task.history = history
    laneTask.status = 'completed'
    laneTask.history = history
    const layout = layoutTimeline(
      data,
      { width: 200, height: 400, laneHeight: DEFAULT_LANE_HEIGHT, headerHeight: DEFAULT_HEADER_HEIGHT },
      { now: start + 2_000, msPerPx: 1_000 },
    )
    const drawn = layout.tasks[0]
    expect(drawn?.claimAt).toBe(start + 500)
    expect(drawn?.at).toBe(start)
  })
})
