import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { tasksApi } from '@/api/tasks.api'
import { queryKeys } from '@/lib/query-keys'
import type { PageResponse, TaskDto, TaskFilters, TaskStatus } from '@/types'

export const TASKS_PAGE_SIZE = 20

export type TaskPages = { pages: PageResponse<TaskDto>[]; pageParams: number[] }

/** Paginated tasks for one status column of a project board. */
export function useTasks(
  projectId: string,
  status: TaskStatus,
  filters: Omit<TaskFilters, 'status'>,
) {
  return useInfiniteQuery({
    queryKey: queryKeys.tasks(projectId, status, filters),
    queryFn: ({ pageParam }) =>
      tasksApi.list(projectId, { ...filters, status, page: pageParam, size: TASKS_PAGE_SIZE }),
    initialPageParam: 0,
    getNextPageParam: (last) => (last.last ? undefined : last.page + 1),
    placeholderData: keepPreviousData,
    enabled: !!projectId,
    select: (data) => ({
      tasks: data.pages.flatMap((p) => p.content),
      total: data.pages[0]?.totalElements ?? 0,
    }),
  })
}
