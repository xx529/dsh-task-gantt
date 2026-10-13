/**
 * The lane head: the counts are ONE joined line, and only a WORKING lane gets a word.
 *
 * Both halves came out of real-machine feedback — the user asked for
 * 「状态，任务数量，消息数量」 on one line ("这样泳道图下方就会留有这么多的空位") and then
 * deleted the idle word ("「空闲」这个状态文本我觉得没必要了"). A screenshot is not a lock,
 * so this file pins the STRUCTURE. (The Lead's item B: these three facts were only ever
 * measured in a browser.)
 *
 * ── HOW IT IS ASSERTED (no renderer) ────────────────────────────────────────
 * `GanttChart` is CALLED with a fixture through the inert React stub that
 * `vitest.config.ts` aliases in. The stub returns `{ type, props }` and runs no
 * effects, so the tree is walked synchronously: fragments are flattened, function
 * elements are expanded by calling them (their hooks are inert), host elements are
 * collected with `className`/`children`.
 *
 * ── WHAT IS LOCKED, AND WHY IT IS POSITION- AND WORD-COUNT-AGNOSTIC ────────
 * The status WORD moved between rows twice while this file was being written (the top
 * row held it, then `GanttChart.tsx` moved it to the meta line as its own
 * `<span class="dtg-head-status">运行中 · </span>` prefix), and 0.2.30 then added the
 * host's ACTIVITY short word (either beside it or in its place, via the fallback chain
 * in `lane-activity.ts`) and made the counts COMPACT (`2 · ✉ 2`, with the full wording
 * `2 个任务 · 2 条消息` moved to the accessible name / row tooltip). Pinning "which row"
 * or "how many words" would lock a layout detail that is legitimately still moving.
 * What is locked instead is the user-visible contract:
 *
 *  1. `.dtg-head-meta-text` is ONE text node: `[任务数, 消息数].filter(present).join(' · ')`
 *     in that order. The task part is the BARE number (compact counts, 0.2.30) and the
 *     message part keeps its `✉` prefix — the only thing telling the two numbers apart
 *     once `任务`/`消息` moved into the tooltip. Splitting the counts into separate nodes
 *     fails here — that shape is exactly what the user's "one line" request was about.
 *  2. The meta ROW is `1 counts node + 0..2 WORD spans` (`.dtg-head-status` and/or
 *     `.dtg-head-activity`), every one of them an INLINE element (a `div` or any other
 *     block element would start a second line). Any other node fails. The assertion does
 *     not care which row the words live in, nor how many of the two are present.
 *  3. The counts TEXT NODE never contains a status or activity word (that would put the
 *     word back inside the truncating node and re-squeeze the numbers — measured once as
 *     `clientWidth 54 < scrollWidth 62`, i.e. silently ellipsised, docs/VALIDATION.md §1.24).
 *  4. The status/activity word appears exactly once among the row's TEXT NODES when
 *     `laneActivity(lane).statusKey !== null`, and zero times otherwise. The row's
 *     `title`/`aria-label` attributes are deliberately NOT counted — the accessible
 *     name is supposed to keep the word even on an idle lane.
 *  5. `.dtg-head-status` is emitted only for a working lane (its absence on the idle
 *     and failed lanes is the negative control).
 *  6. The compact counts do NOT lose the words: the row's accessible `title` carries
 *     `countsFullLabel` (`N 个任务 · M 条消息`) whenever both counts are present.
 *
 * ── CALIBRATION ────────────────────────────────────────────────────────────
 * `metaProblems()` / `metaRowProblems()` are the predicates the assertions above run on
 * the REAL tree; the calibration case feeds them hand-built broken trees. Same code,
 * so the teeth transfer (task-47 forbids editing `GanttChart.tsx` to demo a red).
 *
 * ── NOT LOCKED HERE ────────────────────────────────────────────────────────
 * The wording (that is `labels.ts`, guarded for zh/en parity by `tests/i18n.spec.ts`)
 * and the visual ellipsis (needs a renderer: the 0.2.30 measurement is
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
 * Three lanes, covering the three shapes that matter: working with both counts, idle
 * with both counts, and a failed lane with only the message count (the one-part `join`).
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
  // Names deliberately avoid every status word: a lane called "lane-working" would
  // match the substring `working` in the text-node search below and make the
  // "printed exactly once" assertion meaningless.
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

/** Every word the head could print for a state (the lane words and the status words). */
const STATUS_WORDS: string[] = [
  uiLabel('laneWorking'),
  uiLabel('laneProvisioning'),
  t('statusRunning'),
  t('statusIdle'),
  t('statusProvisioning'),
  t('statusFailed'),
].filter((word, index, all) => word !== '' && all.indexOf(word) === index)

/**
 * Every ACTIVITY word, taken from the live dictionary rather than a hand-kept list, so a
 * new `kind` cannot slip past (0.2.30 added 14 of them; the `*Full` variants are the
 * tooltip phrasing and are included on purpose — none of them may reach the counts node).
 */
const ACTIVITY_WORDS: string[] = Object.entries(uiMessages())
  .filter(([key]) => key.startsWith('laneAct'))
  .map(([, value]) => value)

/** Status words + activity words, deduped: what the counts node must never contain. */
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

/** The class(es) the head may use for a WORD span (status word and/or activity word). */
const WORD_CLASSES = ['dtg-head-status', 'dtg-head-activity']

/** Rule 1 + 3: the counts node is ONE joined text node and carries no word. */
function metaProblems(children: unknown, words: readonly string[]): string[] {
  if (typeof children !== 'string') {
    return [`counts text is not ONE text node (got ${Array.isArray(children) ? 'an array' : typeof children})`]
  }
  return words
    .filter((word) => word !== '' && children.includes(word))
    .map((word) => `counts text carries the word "${word}"`)
}

/** Rules 1–3 applied to the meta ROW: `1 counts node + 0..2 inline WORD spans`, nothing else. */
function metaRowProblems(children: unknown, words: readonly string[]): string[] {
  const nodes = treeOf(children)
  const counts = byClass(nodes, 'dtg-head-meta-text')
  const wordSpans = nodes.filter((element) =>
    classesOf(element)
      .split(' ')
      .some((className) => WORD_CLASSES.includes(className)),
  )
  const problems: string[] = []
  if (counts.length !== 1) problems.push(`expected exactly ONE .dtg-head-meta-text, got ${counts.length}`)
  // 0..2 words: the status word and the activity short word may appear together or alone.
  if (wordSpans.length > 2) problems.push(`meta row holds ${wordSpans.length} word spans (at most 2: status + activity)`)
  const unexpected = nodes.filter((element) => !counts.includes(element) && !wordSpans.includes(element))
  if (unexpected.length !== 0) {
    problems.push(`meta row holds ${unexpected.length} element(s) that are neither counts nor a word`)
  }
  // "One visual line" is a property of the BOX MODEL, not of a node budget: every node in
  // the row must be an inline element, or the head wraps into the rows the user removed.
  const blocking = nodes.filter((element) => element.type !== 'span')
  if (blocking.length !== 0) {
    problems.push(`meta row holds ${blocking.length} non-inline node(s) (a block element breaks the line)`)
  }
  if (counts.length === 1) problems.push(...metaProblems((counts[0] as StubElement).props.children, words))
  return problems
}

const stubText = (className: string, children: unknown): StubElement => ({ type: 'span', props: { className, children } })

/* ------------------------------------------------------------------ specs */

describe('the lane head counts are ONE joined line', () => {
  it('renders one head row per lane (the tree walk works)', () => {
    expect(rows.length).toBe(data.lanes.length)
    expect(rows.length).toBe(3)
  })

  it.each([0, 1, 2])('lane %i: one counts node, joined with the middle dot', (index) => {
    const row = rows[index] as StubElement
    const inner = treeOf(row.props.children)
    const metaBoxes = byClass(inner, 'dtg-head-meta')
    expect(metaBoxes).toHaveLength(1)
    const metaBox = metaBoxes[0] as StubElement
    expect(metaRowProblems(metaBox.props.children, ANY_WORDS)).toEqual([])

    const lane = data.lanes[index] as TimelineLane
    // COMPACT counts (0.2.30): the task part is the BARE number, the message part keeps
    // `✉`. The words 任务/消息 live in the tooltip / accessible name (asserted below).
    const expected = [
      lane.tasks.length > 0 ? `${lane.tasks.length}` : null,
      (lane.messages?.length ?? 0) > 0 ? `✉ ${lane.messages?.length ?? 0}` : null,
    ]
      .filter((part) => part !== null)
      .join(' · ')
    const text = byClass(inner, 'dtg-head-meta-text')[0] as StubElement
    expect(text.props.children).toBe(expected)
  })

  it('keeps the two counts in ONE node, and only the working lane adds a prefix node', () => {
    const perLane = rows.map((row) => treeOf((row as StubElement).props.children))
    // Lane 0 is working: status prefix + counts. Lanes 1-2 are not: counts only.
    expect(byClass(perLane[0] as StubElement[], 'dtg-head-status')).toHaveLength(1)
    expect(byClass(perLane[0] as StubElement[], 'dtg-head-meta-text')).toHaveLength(1)
    for (const inner of [perLane[1] as StubElement[], perLane[2] as StubElement[]]) {
      expect(byClass(inner, 'dtg-head-status')).toHaveLength(0)
      expect(byClass(inner, 'dtg-head-meta-text')).toHaveLength(1)
    }
    // The single-parts case really exists (lane 2 has no tasks), so `join` is exercised.
    expect(String((byClass(perLane[2] as StubElement[], 'dtg-head-meta-text')[0] as StubElement).props.children)).not.toContain(' · ')
  })

  it('calibration: the predicates REJECT a split counts field, a stray node, a block node and a word-carrying text', () => {
    // Deliberately not achieved by editing GanttChart.tsx (task-47 forbids touching its
    // render logic); the predicates below are the very ones the assertions above run.
    expect(metaProblems([uiLabel('tasksLabel'), ' · ', '✉ 1'], ANY_WORDS)[0]).toContain('not ONE text node')
    expect(metaProblems(`3 · ✉ 1`, ANY_WORDS)).toEqual([])
    expect(metaProblems(`${STATUS_WORDS[0]} · 3`, ANY_WORDS)).toHaveLength(1)
    // An ACTIVITY word folded into the counts node is the same defect (0.2.30's new words).
    const activityWord = ACTIVITY_WORDS[0] as string
    expect(metaProblems(`${activityWord} · 3 · ✉ 1`, ANY_WORDS)).toHaveLength(1)

    // The counts split into two sibling nodes: the regression this file exists for.
    const split = [stubText('dtg-head-meta-text', '3'), stubText('dtg-head-meta-text', '✉ 1')]
    expect(metaRowProblems(split, ANY_WORDS).join(' | ')).toContain('exactly ONE .dtg-head-meta-text')
    // A third, unrelated node in the meta row.
    const extra = [
      stubText('dtg-head-status', '运行中 · '),
      stubText('dtg-head-meta-text', '3 · ✉ 1'),
      stubText('dtg-head-role', 'Lead'),
    ]
    expect(metaRowProblems(extra, ANY_WORDS).join(' | ')).toContain('neither counts nor a word')
    // A BLOCK node in the row: it would start a second line, which is the user's complaint.
    const blocked = [
      { type: 'div', props: { className: 'dtg-head-status', children: '运行中 · ' } } as StubElement,
      stubText('dtg-head-meta-text', '3 · ✉ 1'),
    ]
    expect(metaRowProblems(blocked, ANY_WORDS).join(' | ')).toContain('non-inline node')
    // Three word spans is one word too many (status + activity is the documented maximum).
    const threeWords = [
      stubText('dtg-head-status', '运行中 · '),
      stubText('dtg-head-activity', '分析中 · '),
      stubText('dtg-head-status', '准备中 · '),
      stubText('dtg-head-meta-text', '3 · ✉ 1'),
    ]
    expect(metaRowProblems(threeWords, ANY_WORDS).join(' | ')).toContain('at most 2: status + activity')
    // And EVERY honest shape passes: no word, one word, or both words — which is exactly
    // the freedom `0..2 word spans` buys, and why the rule is not "at most two nodes".
    const countsOnly = [stubText('dtg-head-meta-text', '3 · ✉ 1')]
    const oneWord = [stubText('dtg-head-status', '运行中 · '), stubText('dtg-head-meta-text', '3 · ✉ 1')]
    const bothWords = [
      stubText('dtg-head-status', '运行中 · '),
      stubText('dtg-head-activity', '分析中 · '),
      stubText('dtg-head-meta-text', '3 · ✉ 1'),
    ]
    expect(metaRowProblems(countsOnly, ANY_WORDS)).toEqual([])
    expect(metaRowProblems(oneWord, ANY_WORDS)).toEqual([])
    expect(metaRowProblems(bothWords, ANY_WORDS)).toEqual([])
  })

  it('keeps the full counts wording in the accessible name (compact row, complete tooltip)', () => {
    for (const [index, row] of rows.entries()) {
      const lane = data.lanes[index] as TimelineLane
      const tasks = lane.tasks.length
      const messages = lane.messages?.length ?? 0
      const title = String((row as StubElement).props.title)
      if (tasks > 0 && messages > 0) {
        expect(title, `${lane.id} row title`).toContain(uiLabel('countsFullLabel', { tasks, messages }))
      }
      // The compact node itself must NOT grow the words back (that is what overflowed).
      const counts = byClass(treeOf((row as StubElement).props.children), 'dtg-head-meta-text')[0] as StubElement
      expect(String(counts.props.children)).not.toContain(uiLabel('tasksLabel'))
    }
  })
})

describe('only a WORKING lane gets a status word', () => {
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
        expect(byClass(inner, 'dtg-head-status'), `${lane.id}: no status element (${activity.reason})`).toHaveLength(0)
        for (const word of STATUS_WORDS) {
          expect(texts.some((text) => text.includes(word)), `${lane.id} (${activity.reason}) must not print "${word}"`).toBe(false)
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
      // The accessible name keeps the word regardless of the visible treatment, so
      // hiding it from a lane that is not working must not hide it from a screen reader.
      const status = lane.status ?? 'idle'
      expect(String((row as StubElement).props.title), `${lane.id} row title`).toContain(t(STATUS_TEXT_KEY[status]))
    }
  })

  it('keeps the word out of the counts element while the row still shows it once', () => {
    const inner = treeOf((rows[0] as StubElement).props.children)
    const word = uiLabel('laneWorking')
    const status = byClass(inner, 'dtg-head-status')[0] as StubElement
    expect(String(status.props.children)).toContain(word)
    const counts = byClass(inner, 'dtg-head-meta-text')[0] as StubElement
    expect(String(counts.props.children)).not.toContain(word)
    // Negative control in the same shape: the idle lane has no such element at all.
    const idle = treeOf((rows[1] as StubElement).props.children)
    expect(byClass(idle, 'dtg-head-status')).toHaveLength(0)
  })
})

/* ------------------------------------------------------------------------- */
/* 0.2.30: the host's activity descriptor drives the visible word             */
/* ------------------------------------------------------------------------- */

/**
 * The host now ships `lane.activity` (`LaneLiveActivity`: `kind` + `detail` + `evidence`),
 * and `lane-activity.ts` turns the `kind` into a 2–4 character word (`laneActCommands` →
 * `运行命令`) with the fallback chain `activity → 运行中/启动中 → no word`.
 *
 * This block locks the VISIBLE half of that: when a descriptor is present the head prints
 * the ACTIVITY word (not the generic status word), the row still has exactly ONE word span
 * and ONE counts node, and the counts node stays counts-only. The descriptor→key mapping
 * itself belongs to `tests/lane-activity.spec.ts` (its owner); this file only asserts what
 * reaches the panel, so it does not duplicate that table.
 */
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
    return { ...base, range: { start: START, end: NOW }, live: false, lanes, tasks: lanes.flatMap((l) => l.tasks) }
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
  ] as const)('lane %i prints %s and nothing else in the word span', (index, key) => {
    const lane = activityData.lanes[index] as TimelineLane
    const activity = laneActivity(lane)
    const inner = treeOf((activityRows[index] as StubElement).props.children)
    const metaBox = byClass(inner, 'dtg-head-meta')[0] as StubElement
    expect(metaRowProblems(metaBox.props.children, ANY_WORDS)).toEqual([])

    const wordSpans = treeOf(metaBox.props.children).filter((element) =>
      classesOf(element)
        .split(' ')
        .some((className) => WORD_CLASSES.includes(className)),
    )
    expect(wordSpans, `${lane.id} has exactly one word span`).toHaveLength(1)
    const word = String((wordSpans[0] as StubElement).props.children)
    expect(word).toContain(uiLabel(key))
    expect(activity.statusKey).toBe(key)
    // The generic status word must NOT also be printed (that is the point of the activity
    // signal: one word, the most specific one).
    const other = key === 'laneWorking' ? uiLabel('laneActCommands') : uiLabel('laneWorking')
    expect(word).not.toContain(other)

    // …and the counts node stays counts-only, per rule 3.
    const counts = byClass(inner, 'dtg-head-meta-text')[0] as StubElement
    const expectedCounts = [
      lane.tasks.length > 0 ? `${lane.tasks.length}` : null,
      (lane.messages?.length ?? 0) > 0 ? `✉ ${lane.messages?.length ?? 0}` : null,
    ]
      .filter((part) => part !== null)
      .join(' · ')
    expect(String(counts.props.children)).toBe(expectedCounts)
    expect(expectedCounts).toContain('✉ ')
  })
})
