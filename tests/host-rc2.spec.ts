/**
 * DSH 0.2.2-rc.2 contract drift — host half.
 *
 * What changed in rc.2 (verified against the installed 0.2.2-rc.2 packages):
 *
 * - `agentTeams` lost `listMembers` and `tryMembership`. Teammates are
 *   subagents now; the roster is the parent-owned `subagent/catalog` plus the
 *   child's own session log.
 * - `subagent/catalog` v3 carries a short sibling `name`; the board's
 *   `TeamTaskView` carries `ownerId` next to `ownerName`, and `ownerName` is
 *   that subagent name/path (not the old `team/member` name).
 *
 * These tests pin the plugin's adaptation: no fake `listMembers` failure note,
 * the catalog `name` becomes the lane name and a name alias, and a task is
 * assigned by `ownerId` even when `ownerName` is a name the journal never saw.
 */
import { describe, expect, it } from 'vitest'
import type { Context } from '@deepseek-ai/cordis'
import { foldTeamEvents, type RawSessionEvent } from '../src/host/fold.ts'
import { buildTimeline } from '../src/host/timeline.ts'
import { fakeContext } from './helpers/fake-http.ts'
import { CHILD_SESSION_HEADER, SESSION_HEADER, subagentCatalogEvent, teammateSpans } from './helpers/session-fixtures.ts'
import { assertTimeline } from './helpers/timeline-assert.ts'

const ROOT = SESSION_HEADER.id as string
const MEMBER = CHILD_SESSION_HEADER.id as string
const T = 1_792_000_000_000

function rc2RootEvents(): RawSessionEvent[] {
  return [
    SESSION_HEADER,
    subagentCatalogEvent({
      seq: 2,
      time: T,
      childId: MEMBER,
      childCreatedAt: T - 10,
      version: 3,
      name: 'researcher',
      label: 'Audit the plugin against the new host',
    }),
  ]
}

/** The rc.2 `agentTeams` face: the board remains, the member roster is gone. */
function rc2Context(options: { withListMembers?: boolean; ownerName?: string } = {}): Context {
  const rootEvents = rc2RootEvents()
  const memberEvents = teammateSpans()
  const rootAgent = {
    id: ROOT,
    status: 'running',
    options: { model: 'deepseek-flash' },
    session: { header: SESSION_HEADER, snapshotEvents: () => rootEvents },
  }
  const memberAgent = {
    id: MEMBER,
    status: 'idle',
    options: { model: 'deepseek-flash' },
    session: { header: { id: MEMBER, parentSession: ROOT }, snapshotEvents: () => memberEvents },
  }
  const agents = {
    get: (id: string) => (id === ROOT ? rootAgent : id === MEMBER ? memberAgent : undefined),
    list: () => [rootAgent, memberAgent],
  }
  const teams = {
    listTasks: () => [
      {
        id: 'task-1',
        revision: 1,
        subject: 'verify rc.2',
        description: 'the board names the owner',
        status: 'in_progress',
        ownerId: MEMBER,
        ownerName: options.ownerName ?? 'researcher',
        blockedBy: [],
        writeScopes: [],
        ready: false,
        writeScopeWarnings: [],
      },
    ],
    ...(options.withListMembers === true
      ? {
          listMembers: () => [
            { id: ROOT, name: 'lead', role: 'lead', status: 'running' },
            { id: MEMBER, name: 'researcher', role: 'teammate', status: 'idle' },
          ],
        }
      : {}),
  }
  return fakeContext({
    get: (name) => (name === 'agents' ? agents : name === 'agentTeams' ? teams : undefined),
  })
}

describe('rc.2 roster: subagent/catalog v3 is the source of truth', () => {
  it('uses the sibling `name` as the lane name and keeps it as an owner alias', () => {
    const team = foldTeamEvents(rc2RootEvents(), ROOT)
    expect(team.memberById.get(MEMBER)?.name).toBe('researcher')
    expect(team.memberIdByName.get('researcher')).toBe(MEMBER)
  })

  it('does not read a catalog v1 event as having a sibling name', () => {
    const team = foldTeamEvents(
      [
        SESSION_HEADER,
        subagentCatalogEvent({ seq: 2, time: T, childId: MEMBER, childCreatedAt: T - 10, label: 'old label' }),
      ],
      ROOT,
    )
    expect(team.memberById.get(MEMBER)?.name).toBe('old label')
    expect(team.memberIdByName.has('old label')).toBe(false)
  })

  it('ignores the new `team/mode` event instead of inventing a member/task', () => {
    const team = foldTeamEvents(
      [SESSION_HEADER, { type: 'team/mode', seq: 1, time: T, data: { enabled: true } }],
      ROOT,
    )
    expect(team.members).toEqual([])
    expect(team.tasks).toEqual([])
  })
})

describe('rc.2 board: ownerId is the lane key', () => {
  it('assigns a task by ownerId when ownerName is a name the journal never carried', async () => {
    const value = await buildTimeline(rc2Context({ ownerName: 'researcher/child' }), ROOT)
    assertTimeline(value)
    expect(value.lanes.map((lane) => lane.name)).toContain('researcher')
    const task = value.tasks.find((candidate) => candidate.id === 'task-1')
    expect(task?.laneId).toBe(MEMBER)
  })

  it('does not report a `listMembers` failure just because rc.2 removed it', async () => {
    const value = await buildTimeline(rc2Context(), ROOT)
    assertTimeline(value)
    expect(value.notes.join('\n')).not.toMatch(/listMembers/)
    expect(value.lanes.length).toBeGreaterThanOrEqual(2)
  })

  it('still uses listMembers when the older host provides it', async () => {
    const value = await buildTimeline(rc2Context({ withListMembers: true }), ROOT)
    assertTimeline(value)
    expect(value.lanes.map((lane) => lane.name)).toContain('researcher')
  })
})
