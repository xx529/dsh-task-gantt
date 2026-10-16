/**
 * The `?` marker for `ask_user_question`, and the detail view behind it.
 *
 * The user: "当前对话过程中有提问的时候…在那一刻要有一个 ? 的 icon…点击问号可以看到问题的
 * 详情、状态、以及选择的结果".
 *
 * The risks this file exists for, all of them documented behaviours rather than guesses:
 *
 *   - `kind` is an open union that has grown twice. A `'question'` that no branch mentions
 *     renders as a plain teammate ARROW at the right instant, which looks like a transfer
 *     and is the opposite of what was asked for.
 *   - The marker's glyph colour is fought over by two generic glyph rules; the first
 *     attempt lost and rendered the question mark in the INVERTED ink (measured
 *     rgb(255,255,255) — invisible on the light panel).
 *   - Only three statuses exist. A timeout or cancel branch would be inventing states the
 *     journal cannot produce.
 *   - An empty `selected` is a REAL outcome (people type instead). Rendering it as "chose
 *     nothing" asserts something about the human that the data does not say.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import { decimateMarkers, MESSAGE_MARKER_MIN_GAP_PX } from '../src/client/ui/timeline-layout.ts'
import type { MessageSpan } from '../src/shared/contract.ts'

const GANTT = readFileSync(resolve(process.cwd(), 'src/client/ui/GanttChart.tsx'), 'utf8')
const LAYOUT = readFileSync(resolve(process.cwd(), 'src/client/ui/timeline-layout.ts'), 'utf8')
const STYLES = readFileSync(resolve(process.cwd(), 'src/client/ui/styles.ts'), 'utf8')
const LABELS = readFileSync(resolve(process.cwd(), 'src/client/ui/labels.ts'), 'utf8')
const BOARD = readFileSync(resolve(process.cwd(), 'src/client/ui/BoardView.tsx'), 'utf8')

describe('the question marker', () => {
  it('renders a question MARK, and the branch is REACHABLE, not merely present', () => {
    // The whole ask: "一个 ? 的 icon". An unhandled kind falls through to ArrowIcon.
    //
    // Anchored on the "else-if" form on purpose. A bare `marker.kind === 'question' ? (`
    // also occurs in the popover selection, so matching that alone left this test green
    // when the GLYPH branch was made unreachable (`false ? (…)`) — the dead JSX still
    // contains the span. Requiring the chain `) : <cond> ? (` pins the branch that the
    // glyph actually hangs off, and the span must follow it immediately.
    expect(GANTT).toContain(") : marker.kind === 'question' ? (")
    expect(GANTT).toMatch(/\) : marker\.kind === 'question' \? \(\s*\/\/[^\n]*\n(?:\s*\/\/[^\n]*\n)*?\s*<span className="dtg-msg-glyph dtg-msg-question-glyph" aria-hidden="true">\?<\/span>/)
  })

  it('is not classified as the human prompt, and not as an arrow', () => {
    // `isUser` is derived from the payload's addressing and is TRUE for a question (its
    // `to` is the user), which both mislabels it and drags in `.dtg-msg-user .dtg-msg-glyph`
    // — the rule that repainted the glyph white.
    expect(GANTT).toContain("const isQuestion = marker.kind === 'question'")
    expect(GANTT).toContain("if (isQuestion) classes.push('dtg-msg-question')")
    expect(GANTT).toContain("marker.kind !== 'turn' && marker.kind !== 'question' && !isUser")
  })

  it('anchors the GLYPH CENTRE on the time coordinate, derived from the box', () => {
    // An arrow anchors on its tip; a question mark has none, and a point event belongs
    // centre-on-the-instant. Half the box, not a typed-in number.
    expect(GANTT).toContain("marker.kind === 'question' ? marker.w / 2 : arrowMarker ? ARROW_TIP_INSET_PX : 0")
    expect(GANTT).toContain('left: marker.x - anchorInset,')
  })

  it('has all three statuses and NO invented fourth', () => {
    expect(GANTT).toContain('dtg-msg-q-${questionStatus}')
    for (const s of ['waiting', 'answered', 'failed']) {
      expect(LABELS).toContain(`questionStatus${s[0]?.toUpperCase()}${s.slice(1)}:`)
    }
    // The contract states there is no timeout state and no cancel event; a branch for
    // either would be a UI fiction.
    expect(GANTT).not.toMatch(/questionStatus(Timeout|Cancelled|Canceled)/)
    expect(STYLES).not.toMatch(/dtg-q-(timeout|cancel)/)
  })

  it('is the VIVID STATIC RED the user asked for, in every state', () => {
    // "这个问号要用红色 鲜艳的那种红". A static token, because a question's colour is not a
    // lane's and must not flip with the skin.
    expect(GANTT).toContain("? 'var(--dsw-static-red-600)'")
    for (const banned of ['--dsw-alias-state-error-primary', '--dsw-alias-brand-primary', '--dsw-alias-label-secondary']) {
      expect(GANTT, 'the question ink must not be state-tinted any more').not.toMatch(
        new RegExp("marker\\.kind === 'question'[\\s\\S]{0,200}" + banned.replace(/-/g, '\\-')),
      )
    }
    // ...and no LITERAL ink: a quoted hex would be one. (The prose comment does quote the
    // measured value when it documents the contrast, so match the code form only.)
    expect(GANTT, 'the ink must be the token, not a literal').not.toMatch(/'#[0-9a-f]{3,8}'/i)
  })

  it('the three states are told apart by SHAPE and MOTION, not by colour', () => {
    // Colour is now identical across states, so each state needs its own non-colour cue.
    expect(STYLES).toMatch(/\.dtg-msg-q-waiting \.dtg-msg-question-glyph \{\s*animation: dtg-q-pulse/)
    expect(STYLES).toMatch(/\.dtg-msg-q-failed \{\s*outline: 1px dashed currentColor;/)
    // answered gets NEITHER — nothing matches it beyond the shared `.dtg-msg-question`.
    expect(STYLES).not.toMatch(/\.dtg-msg-q-answered\s*\{/)
  })

  it('the glyph rule OUTRANKS the generic glyph rules', () => {
    // Measured failure: equal specificity + later source order painted the mark
    // rgb(255,255,255). Three classes is what makes the outcome independent of order.
    expect(STYLES).toContain('.dtg-msg.dtg-msg-question .dtg-msg-question-glyph')
    expect(STYLES).toMatch(/\.dtg-msg\.dtg-msg-question \.dtg-msg-question-glyph \{[^}]*color: inherit/)
  })

  it('the waiting pulse is declared AND switched off under reduced motion', () => {
    expect(STYLES).toContain('animation: dtg-q-pulse 1.6s ease-in-out infinite')
    expect(STYLES).toMatch(/@media \(prefers-reduced-motion: reduce\) \{\s*\.dtg-msg-q-waiting \.dtg-msg-question-glyph \{\s*animation: none;/)
  })

  it('failed keeps its dashed outline, now in the marker\'s own ink', () => {
    // currentColor rather than a second colour: the outline must read as a SHAPE cue, since
    // colour no longer separates the states.
    expect(STYLES).toMatch(/\.dtg-msg-q-failed \{\s*outline: 1px dashed currentColor;/)
  })

  it('the aria label describes a QUESTION, not a transfer', () => {
    expect(GANTT).toContain("uiLabel('questionAria'")
    expect(LABELS).toContain('questionAria:')
  })
})

describe('the question detail view', () => {
  it('renders every question in the call, up to four', () => {
    expect(GANTT).toContain('function QuestionPopoverBody')
    expect(GANTT).toMatch(/items\.map\(\(item, index\) =>/)
  })

  it('shows the CHOSEN LABELS, matched by value, never by index', () => {
    // `selected` holds option labels and the answers arrive out of order, so the render is
    // a direct pass over `selected` — there is no option list left to index into.
    expect(GANTT).toContain('{item.selected.map((label) => (')
    expect(GANTT).not.toMatch(/selected\[index\]|selected\.indexOf|\.selected\[\d/)
  })

  it('a multi-select answer shows EVERY chosen label, one chip each', () => {
    // The multi-select HINT is gone on purpose: showing two chips already says it, and the
    // user asked for the answer rather than for option metadata.
    expect(GANTT).toContain('dtg-q-choice')
    expect(GANTT).toContain('{item.selected.map((label) => (')
    expect(GANTT).not.toContain('questionMultiSelect')
  })

  it('an EMPTY selection is reported as data, never as "chose nothing"', () => {
    expect(GANTT).toContain("uiLabel('questionNoSelectionRecorded')")
    // The wording itself must describe the RESULT, not the person.
    const zh = /questionNoSelectionRecorded: '([^']+)'/.exec(LABELS)?.[1] ?? ''
    expect(zh).toContain('未记录')
    expect(zh).not.toMatch(/没有选择|没选|未选择/)
  })

  it('shows custom free text when the human typed instead of choosing', () => {
    expect(GANTT).toContain("uiLabel('questionCustomLabel')")
    expect(GANTT).toContain('item.custom')
  })

  it('an unparsed result shows the RAW text and never an empty selection', () => {
    expect(GANTT).toContain("question?.unparsed === true")
    expect(GANTT).toContain("uiLabel('questionUnparsed')")
    expect(GANTT).toContain('question.raw')
    // The unparsed branch must sit BEFORE the item list, so raw text wins.
    const unparsedAt = GANTT.indexOf("question?.unparsed === true")
    const listAt = GANTT.indexOf('items.map((item, index) =>')
    expect(unparsedAt).toBeGreaterThan(-1)
    expect(listAt).toBeGreaterThan(unparsedAt)
  })

  it('a failed call says the question never reached the human, and shows the code', () => {
    expect(GANTT).toContain("uiLabel('questionFailedHint')")
    expect(GANTT).toContain('question.errorCode')
    expect(GANTT).toContain('question.errorText')
  })

  it('does NOT re-read the journal for the result', () => {
    // Context compaction appends a second result for the same callId; the host resolves
    // one per callId and makes `unparsed` and `selected` mutually exclusive. Picking "the
    // last result" here is the bug that was already fixed upstream.
    expect(GANTT).not.toMatch(/results?\.at\(-1\)|lastResult|rawResults/)
  })

  it('every question key exists in BOTH locales', () => {
    const enSection = LABELS.slice(LABELS.indexOf('const en: Record'))
    const keys = ['questionRoute', 'questionAria', 'questionStatusWaiting', 'questionStatusAnswered',
      'questionStatusFailed', 'questionCustomLabel', 'questionAnswerLabel',
      'questionNoSelectionRecorded', 'questionUnparsed', 'questionRawLabel', 'questionFailedHint']
    for (const key of keys) {
      expect(new RegExp(key + ": '([^']+)'").exec(LABELS)?.[1], 'zh ' + key).toBeTruthy()
      expect(new RegExp(key + ": '([^']+)'").exec(enSection)?.[1], 'en ' + key).toBeTruthy()
    }
  })
})

/**
 * ONE SOURCE OF TRUTH for a question's detail.
 *
 * The first cut resolved the detail in the renderer, from the payload, keyed on
 * `laneId + time` — because the layout's marker rect did not carry it. That is a second
 * source of truth, and it disagrees with the first the moment the layout filters, re-times
 * or DECIMATES a marker: a marker dropped by decimation would still have had its detail
 * reachable at that instant, and the renderer would happily have shown a popover for a
 * marker that is not on screen.
 *
 * It now rides on the rect, copied from the span where the rect is built — which is after
 * decimation, so a dropped marker has no rect and therefore no detail.
 */
describe('the question detail has ONE source', () => {
  it('the layout carries it on the marker rect', () => {
    expect(LAYOUT).toContain('question?: QuestionDetail')
    expect(LAYOUT).toContain("from '../../shared/contract.ts'")
    expect(LAYOUT).toMatch(/type QuestionDetail,/)
  })

  it('...copied from the span at the SINGLE rect construction point', () => {
    // If a second construction site appears, one of them will silently stop carrying it.
    const sites = LAYOUT.match(/MessageMarkerRect = \{/g) ?? []
    expect(sites, 'exactly one place builds a marker rect').toHaveLength(1)
    expect(LAYOUT).toContain('question: message.question,')
    // A plain copy, so `undefined` stays `undefined` — no normalisation, no default.
    expect(LAYOUT).not.toMatch(/question:\s*message\.question\s*\?\?/)
  })

  it('the renderer no longer re-derives it from the payload', () => {
    expect(GANTT).not.toContain('questionByLaneTime')
    // No second lookup keyed on the marker's coordinates.
    expect(GANTT).not.toMatch(/questionBy|questionFor|findQuestion/)
    // It reads the rect.
    expect(GANTT).toContain('const question = marker.question')
  })

  it('the MARKER component takes no question prop (no pass-through duplicate)', () => {
    // The component used to take `question` as a prop AND receive the rect; the duplicate
    // is what let the two drift. Checked on the DESTRUCTURING, because the marker's
    // `onHoverChange` legitimately renders a popover that takes `question` — so a textual
    // scan of the JSX element would match that nested call instead of the props.
    const start = GANTT.indexOf('function MessageMarker({')
    const destructuring = GANTT.slice(start, GANTT.indexOf('}: {', start))
    expect(destructuring, 'the marker must not take question as a prop').not.toMatch(/\bquestion\b/)
    expect(destructuring).toContain('marker')
    // ...and the detail is read off the rect inside the component.
    expect(GANTT).toContain('const question = marker.question')
  })

  it('an ordinary message is untouched: no question state is applied without one', () => {
    // `question` is undefined for every non-question kind, and the status/classes are read
    // through `marker.kind === 'question'` guards, so nothing changes for other markers.
    expect(GANTT).toMatch(/const question = marker\.question\n\s+const questionStatus = question\?\.status \?\? 'answered'/)
    expect(GANTT).toContain('if (isQuestion) {')
    expect(GANTT).toContain("const isQuestion = marker.kind === 'question'")
  })
})

/**
 * THE THINNING MUST NOT EAT A QUESTION.
 *
 * The defect: `decimateMarkers` picked a bucket's representative by TIME, so a message
 * within one 9px bucket of an ask won the slot and the `?` was never drawn. The host's own
 * rank cannot fix it — that rank only breaks ties inside the SAME millisecond, and across
 * 2308 real (message, question) pairs there are 0 exact ties while 35 sit inside the
 * 3.8-minute window a 9px gap spans at that scale. So the choice is made here.
 *
 * These assert BEHAVIOUR, never the rank table: a test that restated the table would pass
 * for any values in it. `1px == 1ms` below, so millisecond arithmetic reads as pixels.
 */
describe('thinning a lane never drops a question', () => {
  const LANE = 'lane-a'
  const laneIdOf = (sessionId: string): string | null => (sessionId === 'peer' ? 'lane-b' : LANE)
  const decimate = (list: MessageSpan[]) =>
    decimateMarkers(list, {
      windowStart: 0,
      msPerPx: 1,
      widthPx: 9 * 60_000,
      mode: 'markers',
      gapPx: MESSAGE_MARKER_MIN_GAP_PX,
      maxPerLane: 40,
      laneId: LANE,
      laneIdOf,
    })
  const from = (id: string) => ({ kind: 'teammate' as const, id, name: id })
  const message = (time: number, id = 'peer'): MessageSpan => ({ kind: 'message', time, end: time + 10, from: from(id), to: from('lead'), sessionId: id })
  const question = (time: number): MessageSpan => ({ kind: 'question', time, end: null, from: from('lead'), to: { kind: 'user', id: 'user', name: 'user' }, sessionId: LANE, question: { status: 'waiting', questions: [] } })
  const userPrompt = (time: number): MessageSpan => ({ kind: 'user-prompt', time, end: time, from: { kind: 'user', id: 'user', name: 'user' }, to: from('lead'), sessionId: LANE })
  const kindsKept = (list: MessageSpan[]) => decimate(list).indices.map((index) => list[index]?.kind)

  it('a question TWO MINUTES after a message still renders', () => {
    // The exact failing case: 120_000ms is ~4.8px at real zoom, inside the 9px bucket.
    const list = [message(1_000_000), question(1_120_000)]
    expect(kindsKept(list)).toContain('question')
  })

  it('a question 54.7 SECONDS after a user prompt still renders', () => {
    // The real shape of the collision in the logs: the thing that crowded the ask out was
    // an EARLIER user prompt, not a message.
    const list = [userPrompt(1_000_000), question(1_054_700)]
    expect(kindsKept(list)).toContain('question')
  })

  it('at the SAME instant the question wins', () => {
    const list = [message(1_000_000), question(1_000_000)]
    expect(kindsKept(list)).toEqual(['question'])
  })

  it('the dropped message is COUNTED, never silently gone', () => {
    // "+N must stay honest": the question surviving may not cost the message its place in
    // the omission count.
    const list = [message(1_000_000), question(1_120_000)]
    const out = decimate(list)
    expect(out.candidates).toBe(2)
    expect(out.droppedTotal).toBe(out.candidates - out.indices.length)
    expect(out.droppedTotal).toBeGreaterThan(0)
  })

  it('a lane with NO question is thinned exactly as before', () => {
    // The change must be inert where there is nothing to protect: two distant messages
    // both survive, and two within the gap collapse to one.
    expect(kindsKept([message(0, 'peer'), message(60_000, 'other')])).toHaveLength(2)
    const tight = decimate([message(0, 'peer'), message(4, 'other')])
    expect(tight.indices).toHaveLength(1)
    expect(tight.droppedTotal).toBe(1)
  })

  it('REGRESSION: a higher rank later in x must not drop an EARLIER marker', () => {
    // Processing winners in rank order broke the spacing cursor, which compared
    // `x - lastX < gap` and so read a negative delta as "too close": a turn at x=50 kept
    // first discarded a message at x=40 even though they are 10px apart. Asserted on the
    // distance, not on a kind table.
    const turn: MessageSpan = { kind: 'turn', time: 1_000, end: 1_100, from: from('lead'), sessionId: LANE }
    const msg = message(900)
    const out = decimateMarkers([msg, turn], {
      windowStart: 0, msPerPx: 1, widthPx: 60_000, mode: 'markers',
      gapPx: MESSAGE_MARKER_MIN_GAP_PX, maxPerLane: 40, laneId: LANE, laneIdOf,
    })
    expect(out.indices, '10px apart is outside the 9px gap').toHaveLength(2)
  })

  it('two questions still respect the spacing rule among themselves', () => {
    // A question beats other KINDS, not the geometry: two asks in the same slot still
    // collapse, or the `?` markers would overlap each other.
    const out = decimate([question(1_000_000), question(1_000_002)])
    expect(out.indices).toHaveLength(1)
  })

  it('a question is kept at its EXACT time (never re-dated to win)', () => {
    const list = [message(1_000_000), question(1_120_000)]
    const out = decimate(list)
    const kept = out.indices.map((index) => list[index] as MessageSpan)
    for (const span of kept) expect(span.time).toBe(span.kind === 'question' ? 1_120_000 : 1_000_000)
  })
})

/**
 * THE USER'S CONTENT REQUIREMENT, verbatim: "应该是显示 问题 + 答案…如果还在等待就是只有问题".
 *
 * The rejected version listed every option with its full description — the long
 * "read the source, read the docs, take notes, produce findings.md" text they called
 * "不合适". These lock what replaced it, and they assert the ABSENCE of the option list as
 * firmly as the presence of the answer.
 */
describe('the body shows the question and its answer, nothing else', () => {
  it('an ANSWERED question never renders the option list or its descriptions', () => {
    // No `item.options` walk survives anywhere in the body.
    expect(GANTT).not.toContain('item.options.map')
    expect(GANTT).not.toContain('option.description')
    expect(GANTT).not.toContain('dtg-q-option')
  })

  it('a WAITING question renders the questions with NO answer block and NO options', () => {
    // "只有问题": the waiting branch maps items to header + prompt and stops there.
    const waiting = GANTT.slice(GANTT.indexOf("status === 'waiting' ? ("), GANTT.indexOf("status === 'failed' ? ("))
    expect(waiting).toContain('dtg-q-prompt')
    expect(waiting).not.toContain('dtg-q-answer')
    expect(waiting).not.toContain('item.selected')
    expect(waiting).not.toContain('dtg-q-choice')
  })

  it('the waiting status reads 等待回复 in Chinese, which is the user\'s own wording', () => {
    const zh = /questionStatusWaiting: '([^']+)'/.exec(LABELS)?.[1]
    expect(zh).toBe('等待回复')
  })

  it('the answer block is labelled, so 问题 -> 答案 reads as a pair per question', () => {
    expect(GANTT).toContain("uiLabel('questionAnswerLabel')")
    expect(LABELS).toMatch(/questionAnswerLabel: '[^']+'/)
  })

  it('one block per question, so a 1-4 question call renders 1-4 pairs', () => {
    // The items map appears once per branch that can show answers, and each block is keyed.
    const blocks = GANTT.match(/className="dtg-q-item"/g) ?? []
    expect(blocks.length).toBeGreaterThanOrEqual(2) // waiting + answered paths
    expect(GANTT).toMatch(/className="dtg-q-item" key=\{item\.id === '' \? `q\$\{index\}` : item\.id\}/)
  })
})

/**
 * The red, measured — the task asks for "两种皮肤下 ? 的实际 ink 与对比度".
 *
 * The surface behind the mark is the marker's own 1.5px halo
 * (`box-shadow: 0 0 0 1.5px var(--dsw-alias-bg-layer-1)`), and the theme resolves that token
 * per skin:
 *
 *     light  --dsw-alias-bg-layer-1 -> --dsw-static-neutral-bluish-00  = #ffffff
 *     dark   --dsw-alias-bg-layer-1 -> --dsw-static-neutral-bluish-875 = #232324
 *
 * both read out of the shipped theme bundle. The ink is a STATIC token, so it is the same
 * value in both skins and only the surface changes.
 */
describe('the question mark is legible on both skins', () => {
  const rgb = (hex: string): [number, number, number] => {
    const h = hex.replace('#', '')
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]
  }
  const lum = ([r, g, b]: readonly [number, number, number]): number => {
    const f = (v: number): number => {
      const s = v / 255
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
    }
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
  }
  const contrast = (a: readonly [number, number, number], b: readonly [number, number, number]): number => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x) as [number, number]
    return (hi + 0.05) / (lo + 0.05)
  }
  const STATIC_RED_600 = '#ec1313'
  const SURFACE = { light: '#ffffff', dark: '#232324' } as const

  it('the ink is the static token, not a literal', () => {
    expect(GANTT).toContain("'var(--dsw-static-red-600)'")
  })

  it('clears the 3:1 non-text threshold on BOTH skins', () => {
    // 4.50:1 light, 3.49:1 dark — the dark skin is below the 4.5:1 TEXT threshold, which is
    // reported rather than hidden; 3:1 is the WCAG requirement for a graphical object.
    const light = contrast(rgb(STATIC_RED_600), rgb(SURFACE.light))
    const dark = contrast(rgb(STATIC_RED_600), rgb(SURFACE.dark))
    expect(light, `light ${light.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    expect(dark, `dark ${dark.toFixed(2)}:1`).toBeGreaterThanOrEqual(3)
    // The exact values are pinned so a theme change cannot quietly degrade them.
    expect(light).toBeCloseTo(4.5, 1)
    expect(dark).toBeCloseTo(3.49, 1)
  })
})

/**
 * THE POPOVER MUST FIT THE VIEWPORT, NOT THE PANEL.
 *
 * The user's screenshot showed the second question's prompt sliced in half: the popover
 * carried a hard `max-height: 200px`, while four answered questions need ~400-550px. The
 * fix has four load-bearing parts, and each was a real defect found while measuring.
 */
describe('the popover sizes itself to the viewport', () => {
  it('no fixed ceiling is left in the stylesheet', () => {
    // A CSS constant cannot know the room; leaving one in place would silently re-clamp.
    const popoverRules = STYLES.slice(STYLES.indexOf('.dtg-popover {'), STYLES.indexOf('.dtg-popover-title'))
    expect(popoverRules).not.toMatch(/max-height/)
    expect(popoverRules).toContain('overflow: auto')
  })

  it('clamps to the VIEWPORT, intersected with any containing block', () => {
    // Clamping to the panel alone is the trap the menu hit: a fixed overlay may overflow its
    // panel and stay visible, so the viewport is the real limit — and the ancestor box
    // matters only when a transform makes it a containing block that clips us.
    expect(GANTT).toContain('window.innerWidth')
    expect(GANTT).toContain('window.innerHeight')
    expect(GANTT).toMatch(/left: Math\.max\(viewport\.left, container\.left\)/)
    expect(GANTT).toMatch(/bottom: Math\.min\(viewport\.bottom, container\.bottom\)/)
    // ...and the geometry is taken in the popover's own coordinate space.
    expect(GANTT).toContain('overlaySpace(anchor)')
  })

  it('positions with `top`, never `bottom` (which is measured from the block)', () => {
    // The menu was misplaced by a `bottom` offset: it is measured from the containing
    // block's bottom edge, not the viewport's.
    expect(GANTT).not.toMatch(/style\.bottom|\bbottom: Math\.max\(0, bounds/)
    expect(GANTT).toMatch(/const style: CSSProperties = \{ left, top, width, maxHeight \}/)
  })

  it('measures the BORDER box, because that is what max-height bounds', () => {
    // Measured as scrollHeight instead, every popover came out 2px short and therefore
    // scrolled permanently — on a SINGLE question, which must never scroll.
    expect(GANTT).toContain('Math.ceil(element.getBoundingClientRect().height)')
    expect(GANTT).not.toContain('const height = element.scrollHeight')
  })

  it('snaps the visible height to a BLOCK boundary so no line is sliced', () => {
    // A scroll container always cuts somewhere; cutting between blocks is the only choice
    // that never slices a line of text.
    expect(GANTT).toContain('childBottoms')
    expect(GANTT).toMatch(/const snapped = fitting\.length > 0 \? Math\.max\(\.\.\.fitting\) : null/)
    expect(GANTT).toContain('POPOVER_INSET_TOP_PX')
  })

  it('measures before paint, so the position never jumps', () => {
    // useLayoutEffect runs after the DOM is built but before the browser paints, so the
    // measured render is the only one the user sees.
    const effect = GANTT.slice(GANTT.indexOf('function HoverPopover'), GANTT.indexOf('function HoverPopover') + 2000)
    expect(effect).toContain('useLayoutEffect')
  })
})

/**
 * ONE BODY, TWO PLACES — and the DETAIL PANEL is a second place.
 *
 * The user found the bottom detail panel showing only the generic fields (`lead → you`,
 * time, type, lane) with a body box holding the question text and NO answer or status. It
 * now renders the hover popover's own body, so the two cannot drift: the acceptance
 * condition for that change was that the SAME marker renders character-for-character
 * identical text in both places (verified in the browser — see the report), and these
 * locks keep the single implementation in place.
 */
describe('the question detail is shared between the popover and the detail panel', () => {
  it('the detail panel imports the SAME component the popover uses', () => {
    // Not a copy, not a second component: the same export from the same module.
    expect(BOARD).toContain("import { GanttChart, QuestionPopoverBody } from './GanttChart.tsx'")
    expect(GANTT).toContain('export function QuestionPopoverBody')
    expect(GANTT.match(/function QuestionPopoverBody/g) ?? [], 'exactly one implementation').toHaveLength(1)
  })

  it('both call sites pass the SAME three facts', () => {
    // lane name, the moment, and the detail. If one site gains a prop the other lacks, the
    // two renderings stop being comparable.
    // The call is self-closing and carries the three facts; the window is generous because
    // the popover's call site has a comment inside it.
    const ganttCall = GANTT.slice(GANTT.indexOf('<QuestionPopoverBody'), GANTT.indexOf('<QuestionPopoverBody') + 400)
    for (const prop of ['laneName=', 'when=', 'question=']) expect(ganttCall, prop).toContain(prop)
    expect(ganttCall).toContain('/>')
    const boardCall = BOARD.slice(BOARD.indexOf('<QuestionPopoverBody'), BOARD.indexOf('<QuestionPopoverBody') + 400)
    expect(boardCall).toContain('laneName={laneName}')
    expect(boardCall).toContain('when={detail.when}')
    expect(boardCall).toContain('question={message.question}')
    expect(boardCall).toContain('/>')
  })

  it('the detail panel renders it ONLY for a question marker', () => {
    expect(BOARD).toMatch(/message\.kind === 'question' && message\.question !== undefined \?/)
  })

  it('a NON-question marker keeps the generic body, byte for byte', () => {
    // The generic path must be untouched, including the three data attributes the PROXY
    // suite in filter-dom.spec.ts relies on.
    expect(BOARD).toContain('className="dtg-message-body"')
    expect(BOARD).toContain('data-message-body=""')
    expect(BOARD).toContain('data-message-body-length={detail.body.length}')
    expect(BOARD).toContain("data-message-has-body={detail.hasBody ? 'true' : 'false'}")
    expect(BOARD).toContain("{detail.hasBody ? detail.body : <span className=\"dtg-muted\">{uiLabel('messageNoBody')}</span>}")
    // ...and it sits on the ELSE branch of the question test, so a question never shows both.
    const branch = BOARD.slice(BOARD.indexOf("message.kind === 'question'"), BOARD.indexOf('className="dtg-message-body"'))
    expect(branch, 'the generic body must be the else branch').toContain(') : (')
  })

  it('the shared component is a PURE BODY: no overlay positioning leaks into the panel', () => {
    // The popover's clamp/flip/snap belongs to HoverPopover. Dragging it into a component
    // that also renders in the document flow would position a static region as if floating.
    const body = GANTT.slice(GANTT.indexOf('export function QuestionPopoverBody'))
    const end = body.indexOf('\n}\n')
    const source = body.slice(0, end)
    for (const forbidden of ['overlaySpace', 'maxHeight', 'useLayoutEffect', 'HoverPopover', 'position:']) {
      expect(source, `QuestionPopoverBody must not contain ${forbidden}`).not.toContain(forbidden)
    }
    // Matching the IMPORT and the ELEMENT, not the word: the comment in BoardView names
    // HoverPopover while explaining that the positioning deliberately stays there.
    expect(BOARD).not.toMatch(/import \{[^}]*HoverPopover/)
    expect(BOARD).not.toContain('<HoverPopover')
  })
})
