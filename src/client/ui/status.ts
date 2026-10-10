/**
 * Status / role / transition wording shared by the chart and the details panel.
 *
 * Kept next to `labels.ts` so the board has ONE vocabulary: a status is always
 * a word (from `src/client/i18n.ts`, owned by `shell`) plus a glyph — never a
 * colour alone (accessibility rule of task-4).
 */
import type { MemberStatus, TaskEvent, TaskStatus, TimelineLane } from '../../shared/contract.ts'
import { t } from '../i18n.ts'
import { uiLabel } from './labels.ts'

const TASK_STATUS_TEXT: Record<TaskStatus, () => string> = {
  pending: () => t('statusPending'),
  in_progress: () => t('statusInProgress'),
  completed: () => t('statusCompleted'),
  deleted: () => t('statusCompleted'),
}

const MEMBER_STATUS_TEXT: Record<MemberStatus, () => string> = {
  running: () => t('statusRunning'),
  idle: () => t('statusIdle'),
  provisioning: () => t('statusProvisioning'),
  failed: () => t('statusFailed'),
}

const ROLE_TEXT: Record<TimelineLane['role'], () => string> = {
  lead: () => t('lead'),
  teammate: () => t('teammate'),
  unknown: () => t('unassigned'),
}

/** Non-colour redundancy for every state the panel paints. */
export const STATUS_GLYPH: Record<string, string> = {
  running: '▶',
  idle: '⏸',
  provisioning: '…',
  failed: '✕',
  pending: '○',
  in_progress: '▶',
  completed: '✓',
  deleted: '⌫',
}

/** The word for a shared-task status. */
export function taskStatusText(status: TaskStatus | undefined): string {
  if (status === undefined) return '—'
  return (TASK_STATUS_TEXT[status] ?? ((): string => '—'))()
}

/** The word for a roster lane status (`undefined` for the `unassigned` lane). */
export function memberStatusText(status: MemberStatus | undefined): string {
  if (status === undefined) return '—'
  return (MEMBER_STATUS_TEXT[status] ?? ((): string => '—'))()
}

/** The word for a lane role. */
export function roleText(role: TimelineLane['role']): string {
  return (ROLE_TEXT[role] ?? ROLE_TEXT.unknown)()
}

/** The word for one dated task transition. */
export function historyActionText(action: TaskEvent['action']): string {
  switch (action) {
    case 'created':
      return uiLabel('histCreated')
    case 'claimed':
      return uiLabel('histClaimed')
    case 'completed':
      return uiLabel('histCompleted')
    case 'reopened':
      return uiLabel('histReopened')
    case 'observed':
      return uiLabel('histObserved')
    default:
      return uiLabel('histUpdated')
  }
}
