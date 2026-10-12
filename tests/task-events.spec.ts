/**
 * The task-transition rail: created / claimed / completed (and the rest) marked on the
 * task card.
 *
 * The user's ask: "每个任务的创建，认领，完成，也有有标记显示在任务卡的地方，找一个方便阅读
 * 又美观的方式". The marks are resolved by `taskEventMarks` OUTSIDE JSX, so this asserts the
 * same array the component renders rather than a second, drifting implementation.
 */
import { describe, expect, it } from 'vitest'
import type { TaskEvent, TimelineTask } from '../src/shared/contract.ts'
import { taskEventMarks } from '../src/client/ui/GanttChart.tsx'
import type { TaskCardRect } from '../src/client/ui/timeline-layout.ts'

function event(time: number, action: TaskEvent['action']): TaskEvent {
  return { time, action, revision: 1, sessionId: 'session-a' }
}

/** A card whose bar starts at x=40 and spans `durationMs` at `msPerPx`. */
function card(history: TaskEvent[], over: Partial<TaskCardRect> = {}): TaskCardRect {
  const at = history[0]?.time ?? 1_000
  return {
    laneId: 'lead',
    laneIndex: 0,
    task: {
      id: 't1',
      revision: history.length,
      laneId: 'lead',
      subject: 's',
      description: '',
      status: 'completed',
      blockedBy: [],
      writeScopes: [],
      ready: true,
      writeScopeWarnings: [],
      history,
    } satisfies TimelineTask,
    anchor: 'history',
    at,
    durationMs: 0,
    historyIndex: 0,
    x: 40,
    y: 0,
    h: 36,
    w: 100,
    barY: 13,
    barH: 10,
    viewX: 40,
    visible: true,
    live: false,
    labelPlacement: 'right',
    labelX: 143,
    labelY: 0,
    labelW: 100,
    labelH: 36,
  } as TaskCardRect
}

describe('every dated transition gets a mark, at its own time', () => {
  it('marks created, claimed and completed at the x their own times imply', () => {
    // 1000ms/px, so an event 200ms after the anchor sits 0.2px to the right. Small
    // numbers on purpose: a mark must not be rounded to "roughly the right place".
    const history = [event(10_000, 'created'), event(10_200, 'claimed'), event(10_500, 'completed')]
    const marks = taskEventMarks(card(history), 1_000)
    expect(marks.map((m) => m.action)).toEqual(['created', 'claimed', 'completed'])
    expect(marks.map((m) => m.x)).toEqual([40, 40.2, 40.5])
    // The words come from the panel's ONE transition vocabulary.
    expect(marks.map((m) => m.label)).toHaveLength(3)
    expect(new Set(marks.map((m) => m.label)).size, 'the three actions must not share a word').toBe(3)
  })

  it('gives every action a glyph, and the three the user named are distinct', () => {
    const all: TaskEvent['action'][] = ['created', 'claimed', 'completed', 'reopened', 'updated', 'observed']
    const marks = taskEventMarks(card(all.map((a, i) => event(10_000 + i * 1_000, a))), 1_000)
    expect(marks).toHaveLength(6)
    for (const mark of marks) expect(mark.glyph, `${mark.action} has no glyph`).not.toBe('')
    const named = marks.filter((m) => ['created', 'claimed', 'completed'].includes(m.action)).map((m) => m.glyph)
    expect(named).toHaveLength(3)
    expect(new Set(named).size, `created/claimed/completed share a glyph: ${named.join(' ')}`).toBe(3)
  })

  it('places a created+claimed pair at the same instant as TWO marks, not one', () => {
    // A real burst: team_task_create then an immediate claim. At the same x the second
    // would be painted exactly over the first and the reader would count one transition.
    const marks = taskEventMarks(card([event(10_000, 'created'), event(10_000, 'claimed')]), 1_000)
    expect(marks).toHaveLength(2)
    expect(marks[0]?.x).toBe(marks[1]?.x)
    expect(marks[0]?.top, 'the second mark must be staggered').not.toBe(marks[1]?.top)
  })

  it('marks nothing when the scale is unusable, instead of a mark at NaN', () => {
    // A mark at an infinite or NaN x paints nothing, and no screenshot review would
    // catch it. Refusing to emit is the honest failure.
    const history = [event(10_000, 'created')]
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(taskEventMarks(card(history), bad), `msPerPx=${String(bad)}`).toEqual([])
    }
  })

  it('keeps the rail clear of the bar it annotates', () => {
    // The rail must not sit ON the bar: TASK_BAR_HEIGHT is the measurement that has to
    // stay exactly proportional, so a glyph over it would either cover it or force it
    // taller. The check is positional rather than a comment.
    const rect = card([event(10_000, 'created')])
    const marks = taskEventMarks(rect, 1_000)
    const barBottom = rect.barY + rect.barH
    for (const mark of marks) {
      expect(mark.top, 'a transition mark must start below the bar').toBeGreaterThanOrEqual(barBottom)
    }
  })
})
