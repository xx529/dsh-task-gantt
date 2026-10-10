/**
 * CLIENT half of dsh-task-gantt — SCAFFOLD ONLY (see docs/TEAM-BRIEF.md §6).
 *
 * Owner of this file: teammate `shell`. It registers the sidebar tab through
 * whatever better-sidebar service is present and renders <BoardView/>.
 */
import { createElement } from 'react'
import type { Context } from '@deepseek-ai/cordis'
import { TAB_TYPE_ID, type BetterSidebarTabService } from '../shared/contract.ts'
import { t } from './i18n.ts'
import { BoardView } from './ui/BoardView.tsx'

export const name = 'dsh-task-gantt'
export const inject: readonly string[] = []

export function apply(ctx: Context): void {
  const sidebar = ctx.get('betterSidebar') as BetterSidebarTabService | undefined
  if (sidebar === undefined) {
    ctx.logger?.warn?.('dsh-task-gantt: dsh-better-sidebar is not mounted; the Gantt tab stays dormant')
    return
  }
  ctx.effect(
    () =>
      sidebar.registerTab({
        id: TAB_TYPE_ID,
        title: () => t('tabTitle'),
        description: () => t('tabDescription'),
        order: 50,
        single: true,
        dedupeKey: () => TAB_TYPE_ID,
        component: ({ scope, visible }) => createElement(BoardView, { sessionId: scope.sessionId, visible }),
      }),
    'dsh-task-gantt: sidebar tab',
  )
}
