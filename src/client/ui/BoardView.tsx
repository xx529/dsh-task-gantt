/**
 * The Gantt board — SCAFFOLD ONLY (see docs/TEAM-BRIEF.md §6).
 *
 * Owner: teammate `ui`. Canvas-free, SVG-free: lanes are CSS grid rows and
 * every bar is an absolutely positioned element, so the whole chart is
 * selectable text and screen-reader navigable.
 */
import { useEffect, useState } from 'react'
import type { TimelineResponse } from '../../shared/contract.ts'
import { fetchTimeline } from '../api.ts'
import { t } from '../i18n.ts'

export interface BoardViewProps {
  sessionId: string
  visible: boolean
}

export function BoardView({ sessionId, visible }: BoardViewProps): React.ReactNode {
  const [data, setData] = useState<TimelineResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!visible) return
    let cancelled = false
    fetchTimeline(sessionId)
      .then((value) => {
        if (!cancelled) {
          setData(value)
          setError(null)
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause))
      })
    return () => {
      cancelled = true
    }
  }, [sessionId, visible])

  if (error !== null) return <div role="alert">{`${t('errorTitle')}: ${error}`}</div>
  if (data === null) return <div>{t('loading')}</div>
  return <div data-dsh-task-gantt="">{`${data.lanes.length} lanes — TODO(ui)`}</div>
}
