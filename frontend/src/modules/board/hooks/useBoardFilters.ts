import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SORT_OPTIONS } from '@/lib/task-meta'
import {
  ASSIGNEE_FILTER_UNASSIGNED,
  TASK_PRIORITIES,
  type TaskFilters,
  type TaskPriority,
} from '@/types'

export type BoardFilters = Omit<TaskFilters, 'status'>

/** Board filters live in the URL (?priority=&assigneeId=&sort=) so views are shareable. */
export function useBoardFilters() {
  const [params, setParams] = useSearchParams()

  const priorityParam = params.get('priority')
  const assigneeParam = params.get('assigneeId')
  const sortParam = params.get('sort')

  const filters = useMemo<BoardFilters>(() => {
    const priority = TASK_PRIORITIES.includes(priorityParam as TaskPriority)
      ? (priorityParam as TaskPriority)
      : undefined
    const assigneeId =
      assigneeParam === ASSIGNEE_FILTER_UNASSIGNED
        ? ASSIGNEE_FILTER_UNASSIGNED
        : assigneeParam && assigneeParam.length > 0
          ? assigneeParam
          : undefined
    const sort = SORT_OPTIONS.some((o) => o.value === sortParam)
      ? (sortParam ?? undefined)
      : undefined
    return { priority, assigneeId, sort }
  }, [priorityParam, assigneeParam, sortParam])

  const setFilters = useCallback(
    (patch: Partial<BoardFilters>) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === undefined || value === '') next.delete(key)
            else next.set(key, String(value))
          }
          return next
        },
        { replace: true },
      )
    },
    [setParams],
  )

  const clearFilters = useCallback(() => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        next.delete('priority')
        next.delete('assigneeId')
        next.delete('sort')
        return next
      },
      { replace: true },
    )
  }, [setParams])

  const hasActiveFilters = !!(filters.priority || filters.assigneeId !== undefined || filters.sort)

  return { filters, setFilters, clearFilters, hasActiveFilters }
}
