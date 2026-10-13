/**
 * The lane head is THREE rows (0.2.30), and only a working lane gets a word.
 *
 * ── SHAPE ──────────────────────────────────────────────────────────────────
 *   row 1  `.dtg-head-top`       identity pill + state mark (the spinner/glyph)
 *   row 2  `.dtg-head-meta`      the counts, ONE text node: `5 任务 · ✉ 259`
 *   row 3  `.dtg-head-activity`  the activity short word — a block row of its own
 *   (an idle/failed lane has rows 1-2 only: `laneActivity(lane).statusKey === null`)
 *
 * ── WHAT IS LOCKED, AND WHY IT IS POSITION- AND WORD-COUNT-AGNOSTIC ────────
 * This contract has moved three times: the status word started in the top row, moved INTO
 * the counts row as a chip (0.2.29-era), the counts briefly went COMPACT (`5 · ✉ 259`) to
 * fit that chip, and 0.2.30 gave the word its own row and brought the full wording back
 * (`5 任务 · ✉ 259`). Every one of those moves was a deliberate design change, not a
 * regression — so this file locks the STRUCTURE and the user-visible contract, never
 * "which row holds the word" or "how many words there are":
 *
 *  1. ROW SEQUENCE is exactly `[top, counts]` or `[top, counts, activity]`, decided by
 *     `laneActivity(lane).statusKey`: a working lane MUST have the third row, an idle one
 *     MUST NOT (a stray row is as wrong as a missing one).
 *  2. Each row is ONE line: no BLOCK-LEVEL descendant inside any row. The criterion is
 *     per-row on purpose — `.dtg-head-activity` is itself a block `div` (the user asked
 *     for the word *below* the counts), so a whole-head "everything is a span" rule would
 *     now be wrong.
 *  3. The counts row holds exactly ONE `.dtg-head-meta-text`, and that node is a single
 *     text string of the form `[N 任务, ✉ M].filter(present).join(' · ')` — the counts are
 *     never split, never wrapped in extra nodes.
 *  4. The counts text never contains a status or activity word, and no word node may be
 *     nested inside the counts row (that is what silently ellipsised the counts once:
 *     `clientWidth 54 < scrollWidth 62`).
 *  5. The activity row holds exactly ONE word span (`.dtg-head-status`), and the word it
 *     prints is the one `laneActivity` chose — an activity descriptor beats the generic
 *     status word.
 *  6. The full counts wording never disappears from the accessible name: the row `title`
 *     carries `countsFullLabel` (`N 个任务 · M 条消息`) whenever both counts are present.
 *
 * ── HOW IT IS ASSERTED (no renderer) ────────────────────────────────────────
 * `GanttChart` is CALLED with a fixture through the inert React stub that
 * `vitest.config.ts` aliases in. The stub returns `{ type, props }` and runs no effects,
 * so the tree is walked synchronously: fragments are flattened, function elements are
 * expanded by calling them (their hooks are inert), host elements are collected with
 * `className`/`children`. The head rows are found by class, so a navigable lane's
 * wrapping `<button>` does not matter.
 *
 * ── CALIBRATION ────────────────────────────────────────────────────────────
 * `metaProblems()` / `headProblems()` are the predicates the assertions above run on the
 * REAL tree; the calibration case feeds them hand-built broken trees (wrong row order, a
 * missing third row, a stray third row, a block-level descendant, two counts nodes, a
 * word folded into the counts, a word node nested in the counts row, two word spans).
 * Same code, so the teeth transfer. `src/**` is frozen for 0.2.30, so no source mutation.
 *
 * ── NOT LOCKED HERE ────────────────────────────────────────────────────────
 * The wording (that is `labels.ts`, guarded for zh/en parity by `tests/i18n.spec.ts`),
 * the descriptor→key table (that is `lane-activity.ts` / `tests/lane-activity.spec.ts`)
 * and the visual ellipsis (needs a renderer; the 0.2.30 measurement is
 * `name 88/88, status/activity 53/53, counts 50/50, namesTruncated = 0` at 480/420/300px,
 * docs/VALIDATION.md §1.24).
 */
import { describe, expect, it } from 'vitest'
import type {
  LaneLiveActivity,
  MemberStatus,
  TimelineLane,
  TimelineResponse,
  TimelineTask,
} from '../src/shared/contract.ts'
import { t } from '../src/client/i18n.ts'
import { GanttChart } from '../src/client/ui/GanttChart.tsx'
import { laneActivity } from '../src/client/ui/lane-activity.ts'
import { uiLabel, uiMessages } from '../src/client/ui/labels.ts'
import { validTimeline } from './helpers/timeline-assert.ts'

/* --------------------------------------------------------------- the tree */

interface StubElement {
  type: unknown
  props: Record<string, unknown>
}

/** Flatten a stubbed element tree: expand fragments and CALL function elements. */
function expand(node: unknown, out: StubElement[], depth = 0): void {
  if (depth > 60 || node === null || node === undefined || typeof node === 'boolean') return
  if (Array.isArray(node)) {
    for (const child of node) expand(child, out, depth + 1)
    return
  }
  if (typeof node !== 'object') return
  const element = node as StubElement
  const props = element.props ?? {}
  if (typeof element.type === 'symbol') {
    expand(props.children, out, depth + 1)
    return
  }
  if (typeof element.type === 'function') {
    expand((element.type as (input: Record<string, unknown>) => unknown)(props), out, depth + 1)
    return
  }
  out.push(element)
  expand(props.children, out, depth + 1)
}

function treeOf(node: unknown): StubElement[] {
  const out: StubElement[] = []
  expand(node, out)
  return out
}

const classesOf = (element: StubElement): string =>
  typeof element.props.className === 'string' ? element.props.className : ''

const byClass = (tree: readonly StubElement[], className: string): StubElement[] =>
  tree.filter((element) => classesOf(element).split(' ').includes(className))

/** Every TEXT NODE in a subtree — attribute strings (`title`, `aria-label`) excluded. */
function textNodes(node: unknown): string[] {
  if (node === null || node === undefined || typeof node === 'boolean') return []
  if (typeof node === 'string') return [node]
  if (typeof node === 'number') return [String(node)]
  if (Array.isArray(node)) return node.flatMap((child) => textNodes(child))
  if (typeof node !== 'object') return []
  const element = node as StubElement
  if (typeof element.type === 'function') {
    return textNodes((element.type as (input: Record<string, unknown>) => unknown)(element.props ?? {}))
  }
  return textNodes((element.props ?? {}).children)
}

/* ------------------------------------------------------------ the fixture */

const START = 1_700_000_000_000
const NOW = START + 60_000

/**
 * Three lanes, covering the shapes that matter: working with both counts (three-row head),
 * idle with both counts, and a failed lane with only the message count.
 */
function headFixture(): TimelineResponse {
  const base = validTimeline()
  const template = base.lanes[0] as TimelineLane
  const taskTemplate = template.tasks[0] as TimelineTask
  const make = (
    id: string,
    status: MemberStatus,
    taskCount: number,
    messageCount: number,
    index: number,
  ): TimelineLane => ({
    ...template,
    id,
    name: id,
    status,
    spans: [{ kind: 'turn', start: START + 1_000, end: START + 20_000 }],
    messages: (template.messages as TimelineLane['messages'])
      .slice(0, Math.max(0, messageCount))
      .map((message, position) => ({ ...message, time: START + 2_000 + position, sessionId: `session-${index}` })),
    waits: [],
    tasks: Array.from({ length: taskCount }, (_, position) => ({
      ...taskTemplate,
      id: `task-${id}-${position}`,
      laneId: id,
      history: [{ time: START + 3_000 + position, action: 'created', revision: 1, sessionId: `session-${index}` }],
    })),
  })
  // Names deliberately avoid every status/activity word: a lane called "working" would
  // match the substring search below and make "printed exactly once" meaningless.
  const lanes = [
    make('alpha', 'running', 2, 2, 0),
    make('bravo', 'idle', 1, 1, 1),
    make('charlie', 'failed', 0, 1, 2),
  ]
  return {
    ...base,
    range: { start: START, end: NOW },
    live: false,
    lanes,
    tasks: lanes.flatMap((lane) => lane.tasks),
  }
}

const data = headFixture()
const tree = treeOf(
  GanttChart({ data, visible: true, now: NOW, selectedTaskId: null, onSelectTask: () => undefined }),
)
const rows = tree.filter((element) => classesOf(element).split(' ').includes('dtg-head-row'))

/**
 * Every word the head could print for a state. The activity words come from the live
 * dictionary (not a hand-kept list), so a new `kind` cannot slip past; the `*Full`
 * variants are the tooltip phrasing and are included on purpose — none of them may reach
 * the counts node.
 */
const STATUS_WORDS: string[] = [
  uiLabel('laneWorking'),
  uiLabel('laneProvisioning'),
  t('statusRunning'),
  t('statusIdle'),
  t('statusProvisioning'),
  t('statusFailed'),
].filter((word, index, all) => word !== '' && all.indexOf(word) === index)

const ACTIVITY_WORDS: string[] = Object.entries(uiMessages())
  .filter(([key]) => key.startsWith('laneAct'))
  .map(([, value]) => value)

const ANY_WORDS: string[] = [...STATUS_WORDS, ...ACTIVITY_WORDS].filter(
  (word, index, all) => word !== '' && all.indexOf(word) === index,
)

/** The i18n key of each member status's word (the row's accessible name carries it). */
const STATUS_TEXT_KEY: Record<MemberStatus, Parameters<typeof t>[0]> = {
  running: 'statusRunning',
  idle: 'statusIdle',
  provisioning: 'statusProvisioning',
  failed: 'statusFailed',
}

/* ------------------------------------------------- the predicates under test */

/** The three rows of a lane head, in DOM order. */
const ROW_CLASSES = ['dtg-head-top', 'dtg-head-meta', 'dtg-head-activity'] as const
type RowClass = (typeof ROW_CLASSES)[number]

function rowClassOf(element: StubElement): RowClass | null {
  const tokens = classesOf(element).split(' ')
  return ROW_CLASSES.find((className) => tokens.includes(className)) ?? null
}

/** The row DIVs of one lane head, in DOM order (works through the navigable `<button>`). */
function headRowsOf(row: StubElement): StubElement[] {
  return treeOf(row.props.children).filter((element) => rowClassOf(element) !== null)
}

/** Rule 4: the counts node is ONE text node and carries no status/activity word. */
function metaProblems(children: unknown, words: readonly string[]): string[] {
  if (typeof children !== 'string') {
    return [`counts text is not ONE text node (got ${Array.isArray(children) ? 'an array' : typeof children})`]
  }
  return words
    .filter((word) => word !== '' && children.includes(word))
    .map((word) => `counts text carries the word "${word}"`)
}

/**
 * Rules 1–5 applied to one lane head. `expectActivity` comes from the REAL oracle
 * (`laneActivity(lane).statusKey !== null`), so a missing third row is red on a working
 * lane and a stray third row is red on an idle one.
 */
function headProblems(
  rowsInHead: readonly StubElement[],
  words: readonly string[],
  expectActivity: boolean,
): string[] {
  const problems: string[] = []
  const kinds = rowsInHead.map((row) => rowClassOf(row))
  const expected: ReadonlyArray<RowClass> = expectActivity
    ? ['dtg-head-top', 'dtg-head-meta', 'dtg-head-activity']
    : ['dtg-head-top', 'dtg-head-meta']
  if (kinds.join(',') !== expected.join(',')) {
    problems.push(`head rows are [${kinds.join(', ')}], expected [${expected.join(', ')}]`)
  }
  // Rule 2 — PER ROW: one line each. A row may be a block `div` itself (`.dtg-head-activity`
  // is designed as one); what may not happen is a block element INSIDE a row.
  for (const row of rowsInHead) {
    const blocking = treeOf(row.props.children).filter((element) => element.type !== 'span')
    if (blocking.length !== 0) {
      problems.push(`${rowClassOf(row)} holds ${blocking.length} block-level descendant(s)`)
    }
  }
  // Rule 3 + 4: row 2 is exactly the counts.
  const countsRows = rowsInHead.filter((row) => rowClassOf(row) === 'dtg-head-meta')
  if (countsRows.length !== 1) {
    problems.push(`expected exactly ONE counts row, got ${countsRows.length}`)
  } else {
    const inner = treeOf((countsRows[0] as StubElement).props.children)
    const counts = byClass(inner, 'dtg-head-meta-text')
    if (counts.length !== 1) {
      problems.push(`expected exactly ONE .dtg-head-meta-text, got ${counts.length}`)
    } else {
      problems.push(...metaProblems((counts[0] as StubElement).props.children, words))
    }
    const nestedWord = inner.filter(
      (element) =>
        rowClassOf(element) === 'dtg-head-activity' ||
        classesOf(element).split(' ').includes('dtg-head-status'),
    )
    if (nestedWord.length !== 0) problems.push('a word node lives inside the counts row')
  }
  // Rule 5: row 3 (when expected) is exactly one word span.
  if (expectActivity) {
    const activityRows = rowsInHead.filter((row) => rowClassOf(row) === 'dtg-head-activity')
    if (activityRows.length === 1) {
      const spans = byClass(treeOf((activityRows[0] as StubElement).props.children), 'dtg-head-status')
      if (spans.length !== 1) {
        problems.push(`expected exactly ONE word span in the activity row, got ${spans.length}`)
      }
    }
  }
  return problems
}

const stubSpan = (className: string, children: unknown): StubElement => ({
  type: 'span',
  props: { className, children },
})
const stubDiv = (className: string, children: unknown): StubElement => ({
  type: 'div',
  props: { className, children },
})

/* ------------------------------------------------------------------ specs */

describe('the lane head rows: top / counts / activity', () => {
  it('renders one head row per lane (the tree walk works)', () => {
    expect(rows.length).toBe(data.lanes.length)
    expect(rows.length).toBe(3)
  })

  it.each([0, 1, 2])('lane %i: row sequence matches laneActivity, counts in ONE text node', (index) => {
    const lane = data.lanes[index] as TimelineLane
    const headRows = headRowsOf(rows[index] as StubElement)
    expect(headProblems(headRows, ANY_WORDS, laneActivity(lane).statusKey !== null)).toEqual([])

    // FULL wording (0.2.30): the words are back, now that the activity word has its own row.
    const expected = [
      lane.tasks.length > 0 ? `${lane.tasks.length} ${uiLabel('tasksLabel')}` : null,
      (lane.messages?.length ?? 0) > 0 ? `✉ ${lane.messages?.length ?? 0}` : null,
    ]
      .filter((part) => part !== null)
      .join(' · ')
    const countsRow = headRows.find((row) => rowClassOf(row) === 'dtg-head-meta') as StubElement
    const counts = byClass(treeOf(countsRow.props.children), 'dtg-head-meta-text')[0] as StubElement
    expect(counts.props.children).toBe(expected)
  })

  it('gives the activity word its OWN row, below the counts, never inside it', () => {
    const workingRows = headRowsOf(rows[0] as StubElement)
    expect(workingRows.map(rowClassOf)).toEqual(['dtg-head-top', 'dtg-head-meta', 'dtg-head-activity'])
    const countsRow = workingRows[1] as StubElement
    const activityRow = workingRows[2] as StubElement

    // DOM order: the word's row comes AFTER the counts row.
    const flat = treeOf((rows[0] as StubElement).props.children)
    expect(flat.indexOf(activityRow)).toBeGreaterThan(flat.indexOf(countsRow))
    // The word is a span in row 3; row 2 carries neither the span nor the row.
    expect(byClass(treeOf(activityRow.props.children), 'dtg-head-status')).toHaveLength(1)
    const countsSubtree = treeOf(countsRow.props.children)
    expect(countsSubtree.some((element) => classesOf(element).split(' ').includes('dtg-head-status'))).toBe(false)
    expect(countsSubtree.some((element) => rowClassOf(element) === 'dtg-head-activity')).toBe(false)

    // Idle lanes have no third row at all — the negative control for rule 1.
    expect(headRowsOf(rows[1] as StubElement).map(rowClassOf)).toEqual(['dtg-head-top', 'dtg-head-meta'])
    expect(headRowsOf(rows[2] as StubElement).map(rowClassOf)).toEqual(['dtg-head-top', 'dtg-head-meta'])
  })

  it('keeps the full counts wording in the accessible name', () => {
    for (const [index, row] of rows.entries()) {
      const lane = data.lanes[index] as TimelineLane
      const tasks = lane.tasks.length
      const messages = lane.messages?.length ?? 0
      if (tasks > 0 && messages > 0) {
        expect(String((row as StubElement).props.title), `${lane.id} row title`).toContain(
          uiLabel('countsFullLabel', { tasks, messages }),
        )
      }
    }
  })

  it('calibration: headProblems REJECTS every broken shape and ACCEPTS both honest ones', () => {
    // Deliberately NOT achieved by editing GanttChart.tsx (`src/**` is frozen for 0.2.30);
    // these predicates are the very ones the assertions above run on the real tree.
    const counts = stubSpan('dtg-head-meta-text', '3 任务 · ✉ 1')
    const word = stubSpan('dtg-head-status', '运行中')
    const honest3 = [
      stubDiv('dtg-head-top', null),
      stubDiv('dtg-head-meta', counts),
      stubDiv('dtg-head-activity', word),
    ]
    const honest2 = [stubDiv('dtg-head-top', null), stubDiv('dtg-head-meta', counts)]
    expect(headProblems(honest3, ANY_WORDS, true)).toEqual([])
    expect(headProblems(honest2, ANY_WORDS, false)).toEqual([])
    // The counts node must be a TEXT node: the same predicate the real tree is held to.
    expect(metaProblems([], ANY_WORDS)[0]).toContain('not ONE text node')

    // 1. wrong row order (the activity row above the counts).
    const swapped = [
      stubDiv('dtg-head-top', null),
      stubDiv('dtg-head-activity', word),
      stubDiv('dtg-head-meta', counts),
    ]
    expect(headProblems(swapped, ANY_WORDS, true).join(' | ')).toContain('head rows are')
    // 1b. a working lane MISSING its third row…
    expect(headProblems(honest2, ANY_WORDS, true).join(' | ')).toContain(
      'expected [dtg-head-top, dtg-head-meta, dtg-head-activity]',
    )
    // 1c. …and an idle lane with a STRAY third row.
    expect(headProblems(honest3, ANY_WORDS, false).join(' | ')).toContain('expected [dtg-head-top, dtg-head-meta]')
    // 2. a BLOCK element inside a row (it would start a second line inside that row).
    const blocky = [
      stubDiv('dtg-head-top', null),
      stubDiv('dtg-head-meta', [counts, stubDiv('dtg-head-extra', 'x')]),
    ]
    expect(headProblems(blocky, ANY_WORDS, false).join(' | ')).toContain('block-level descendant')
    // 3. the counts split into two sibling nodes.
    const split = [
      stubDiv('dtg-head-top', null),
      stubDiv('dtg-head-meta', [stubSpan('dtg-head-meta-text', '3 任务'), stubSpan('dtg-head-meta-text', '✉ 1')]),
    ]
    expect(headProblems(split, ANY_WORDS, false).join(' | ')).toContain('exactly ONE .dtg-head-meta-text')
    // 4. a word folded into the counts text… (the word is taken from the live dictionary:
    // the test env localises to `en`, so a hard-coded 运行中 would silently not match)
    const anyWord = ANY_WORDS[0] as string
    const folded = [
      stubDiv('dtg-head-top', null),
      stubDiv('dtg-head-meta', stubSpan('dtg-head-meta-text', `${anyWord} · 3 任务`)),
    ]
    expect(headProblems(folded, ANY_WORDS, false).join(' | ')).toContain('carries the word')
    // …and a word NODE nested inside the counts row.
    const nested = [stubDiv('dtg-head-top', null), stubDiv('dtg-head-meta', [counts, word])]
    expect(headProblems(nested, ANY_WORDS, false).join(' | ')).toContain('a word node lives inside the counts row')
    // 5. two word spans in the activity row (one word too many).
    const twoWords = [
      stubDiv('dtg-head-top', null),
      stubDiv('dtg-head-meta', counts),
      stubDiv('dtg-head-activity', [word, stubSpan('dtg-head-status', '分析中')]),
    ]
    expect(headProblems(twoWords, ANY_WORDS, true).join(' | ')).toContain('exactly ONE word span in the activity row')
  })
})

describe('only a WORKING lane gets a word', () => {
  it('matches laneActivity for every lane, exactly once per working row', () => {
    expect(rows.length).toBe(3)
    for (const [index, row] of rows.entries()) {
      const lane = data.lanes[index] as TimelineLane
      const activity = laneActivity(lane)
      const inner = treeOf((row as StubElement).props.children)
      // ONE traversal of the row: iterating `inner` and calling `textNodes` per element
      // would count every nested node twice.
      const texts = textNodes((row as StubElement).props.children)
      if (activity.statusKey === null) {
        expect(byClass(inner, 'dtg-head-status'), `${lane.id}: no word (${activity.reason})`).toHaveLength(0)
        for (const word of ANY_WORDS) {
          expect(
            texts.some((text) => text.includes(word)),
            `${lane.id} (${activity.reason}) must not print "${word}"`,
          ).toBe(false)
        }
      } else {
        const word = uiLabel(activity.statusKey)
        expect(byClass(inner, 'dtg-head-status'), `${lane.id} is ${activity.reason}`).toHaveLength(1)
        expect(texts.filter((text) => text.includes(word)), `${lane.id} prints "${word}" once`).toHaveLength(1)
      }
    }
  })

  it('never folds the word into the counts node (the truncating node stays counts-only)', () => {
    for (const [index, row] of rows.entries()) {
      const lane = data.lanes[index] as TimelineLane
      const inner = treeOf((row as StubElement).props.children)
      const counts = byClass(inner, 'dtg-head-meta-text')[0] as StubElement
      for (const word of ANY_WORDS) {
        expect(String(counts.props.children).includes(word), `${lane.id} counts node`).toBe(false)
      }
      // The accessible name keeps the word regardless of the visible treatment, so hiding
      // it from a lane that is not working must not hide it from a screen reader.
      const status = lane.status ?? 'idle'
      expect(String((row as StubElement).props.title), `${lane.id} row title`).toContain(t(STATUS_TEXT_KEY[status]))
    }
  })

  it('prints the word in the activity row, and never in the counts row', () => {
    const inner = treeOf((rows[0] as StubElement).props.children)
    const word = uiLabel('laneWorking')
    const activityRow = inner.find((element) => rowClassOf(element) === 'dtg-head-activity') as StubElement
    expect(String(byClass(treeOf(activityRow.props.children), 'dtg-head-status')[0]?.props.children)).toContain(word)
    const countsRow = inner.find((element) => rowClassOf(element) === 'dtg-head-meta') as StubElement
    expect(byClass(treeOf(countsRow.props.children), 'dtg-head-status')).toHaveLength(0)
    expect(
      String((byClass(treeOf(countsRow.props.children), 'dtg-head-meta-text')[0] as StubElement).props.children),
    ).not.toContain(word)
    // Negative control in the same shape: the idle lane has no activity row at all.
    const idle = treeOf((rows[1] as StubElement).props.children)
    expect(byClass(idle, 'dtg-head-status')).toHaveLength(0)
  })
})

/* ------------------------------------------------------------------------- */
/* 0.2.30: the host's activity descriptor drives the visible word             */
/* ------------------------------------------------------------------------- */

describe('the activity short word is what the head prints when the host sends one', () => {
  const ACTIVITY: LaneLiveActivity = {
    kind: 'commands',
    detail: 'pnpm run typecheck',
    toolName: 'run_command',
    evidence: 'running-tool',
  }

  function activityFixture(): TimelineResponse {
    const base = validTimeline()
    const template = base.lanes[0] as TimelineLane
    const lane = (id: string, activity: LaneLiveActivity | null, index: number): TimelineLane => ({
      ...template,
      id,
      name: id,
      status: 'running',
      activity,
      messages: (template.messages as TimelineLane['messages']).map((message, position) => ({
        ...message,
        time: START + 2_000 + position,
        sessionId: `session-${index}`,
      })),
    })
    const lanes = [lane('delta', ACTIVITY, 0), lane('echo', null, 1)]
    return {
      ...base,
      range: { start: START, end: NOW },
      live: false,
      lanes,
      tasks: lanes.flatMap((entry) => entry.tasks),
    }
  }

  const activityData = activityFixture()
  const activityRows = treeOf(
    GanttChart({
      data: activityData,
      visible: true,
      now: NOW,
      selectedTaskId: null,
      onSelectTask: () => undefined,
    }),
  ).filter((element) => classesOf(element).split(' ').includes('dtg-head-row'))

  it('renders both lanes and both words are real dictionary entries', () => {
    expect(activityRows).toHaveLength(2)
    expect(uiLabel('laneActCommands')).not.toBe('')
    expect(uiLabel('laneWorking')).not.toBe('')
    expect(uiLabel('laneActCommands')).not.toBe(uiLabel('laneWorking'))
  })

  it.each([
    [0, 'laneActCommands'],
    [1, 'laneWorking'],
  ] as const)('lane %i prints %s in its activity row and nothing else', (index, key) => {
    const lane = activityData.lanes[index] as TimelineLane
    const activity = laneActivity(lane)
    const headRows = headRowsOf(activityRows[index] as StubElement)
    expect(headProblems(headRows, ANY_WORDS, activity.statusKey !== null)).toEqual([])

    const activityRow = headRows[2] as StubElement
    expect(rowClassOf(activityRow)).toBe('dtg-head-activity')
    const wordSpans = byClass(treeOf(activityRow.props.children), 'dtg-head-status')
    expect(wordSpans, `${lane.id} has exactly one word span`).toHaveLength(1)
    const word = String((wordSpans[0] as StubElement).props.children)
    expect(word).toContain(uiLabel(key))
    expect(activity.statusKey).toBe(key)
    // The generic status word must NOT also be printed: one word, the most specific one.
    const other = key === 'laneWorking' ? uiLabel('laneActCommands') : uiLabel('laneWorking')
    expect(word).not.toContain(other)

    // …and the counts row stays counts-only, per rule 4 (full wording, 0.2.30).
    const countsRow = headRows[1] as StubElement
    const counts = String(
      (byClass(treeOf(countsRow.props.children), 'dtg-head-meta-text')[0] as StubElement).props.children,
    )
    expect(counts).toContain(uiLabel('tasksLabel'))
    for (const candidate of ANY_WORDS) expect(counts.includes(candidate), `${lane.id} counts node`).toBe(false)
  })
})
