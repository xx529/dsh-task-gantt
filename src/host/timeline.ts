/**
 * Timeline derivation — SCAFFOLD ONLY (see docs/TEAM-BRIEF.md §6, §3).
 *
 * Owner: teammate `host-data`. Replace every TODO with the real derivation:
 * resolve the team root, read the roster + board from `ctx.agentTeams`, read
 * each member's durable session log through `ctx.sessionPersistence` (falling
 * back to the live session), fold the events into spans and task history, and
 * return the frozen `TimelineResponse`.
 */
import type { Context } from '@deepseek-ai/cordis'
import { API_VERSION, type TimelineResponse } from '../shared/contract.ts'

/** Build the timeline for the session the panel was opened in. */
export async function buildTimeline(ctx: Context, sessionId: string): Promise<TimelineResponse> {
  // TODO(host-data): resolve the team root session, then fill this in.
  void ctx
  const now = Date.now()
  return {
    apiVersion: API_VERSION,
    sessionId,
    rootSessionId: sessionId,
    generatedAt: now,
    range: { start: now, end: null },
    lanes: [],
    tasks: [],
    source: 'live',
    notes: ['timeline derivation not implemented yet'],
  }
}
