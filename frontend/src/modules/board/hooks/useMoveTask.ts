import {
  useMutation,
  useQueryClient,
  type InfiniteData,
  type QueryKey,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { tasksApi } from '@/api/tasks.api'
import { queryKeys } from '@/lib/query-keys'
import { STATUS_LABEL } from '@/lib/task-meta'
import type { PageResponse, ProjectSummaryDto, TaskDto, TaskStatus } from '@/types'

type TaskInfinite = InfiniteData<PageResponse<TaskDto>, number>

interface MoveVariables {
  task: TaskDto
  status: TaskStatus
}

interface MoveContext {
  snapshots: [QueryKey, TaskInfinite | undefined][]
  summary: ProjectSummaryDto | undefined
}

/** Remove a task from every loaded page and keep the column total in sync. */
function removeTask(data: TaskInfinite, taskId: string): TaskInfinite {
  let removed = 0
  const pages = data.pages.map((page) => {
    const content = page.content.filter((t) => t.id !== taskId)
    removed += page.content.length - content.length
    return { ...page, content }
  })
  if (removed > 0 && pages.length > 0) {
    pages[0] = { ...pages[0], totalElements: Math.max(0, pages[0].totalElements - removed) }
  }
  return { ...data, pages }
}

/**
 * Change a task's status with an optimistic update across the board caches
 * (source column, target column, and summary), rolled back on failure.
 */
export function useMoveTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation<TaskDto, Error, MoveVariables, MoveContext>({
    mutationFn: ({ task, status }) => tasksApi.updateStatus(task.id, status),

    onMutate: async ({ task, status }) => {
      const root = queryKeys.tasksRoot(projectId)
      await queryClient.cancelQueries({ queryKey: root })
      await queryClient.cancelQueries({ queryKey: queryKeys.summary(projectId) })

      const snapshots = queryClient.getQueriesData<TaskInfinite>({ queryKey: root })
      const summary = queryClient.getQueryData<ProjectSummaryDto>(queryKeys.summary(projectId))

      const from = task.status
      const moved: TaskDto = { ...task, status, updatedAt: new Date().toISOString() }

      // Source column: remove.
      queryClient.setQueriesData<TaskInfinite>({ queryKey: [...root, from] }, (data) =>
        data ? removeTask(data, task.id) : data,
      )

      // Target column: insert at the top of the first page.
      queryClient.setQueriesData<TaskInfinite>({ queryKey: [...root, status] }, (data) => {
        if (!data || data.pages.length === 0) return data
        const [first, ...rest] = data.pages
        if (first.content.some((t) => t.id === task.id)) return data
        return {
          ...data,
          pages: [
            {
              ...first,
              content: [moved, ...first.content],
              totalElements: first.totalElements + 1,
            },
            ...rest,
          ],
        }
      })

      // Summary counts.
      if (summary && from !== status) {
        queryClient.setQueryData<ProjectSummaryDto>(queryKeys.summary(projectId), {
          ...summary,
          byStatus: {
            ...summary.byStatus,
            [from]: Math.max(0, summary.byStatus[from] - 1),
            [status]: summary.byStatus[status] + 1,
          },
        })
      }

      return { snapshots, summary }
    },

    onError: (_error, { task, status }, context) => {
      context?.snapshots.forEach(([key, data]) => queryClient.setQueryData(key, data))
      if (context?.summary) queryClient.setQueryData(queryKeys.summary(projectId), context.summary)
      toast.error(
        `Couldn't move "${task.title}" to ${STATUS_LABEL[status]}. Changes were reverted.`,
      )
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasksRoot(projectId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary(projectId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.projectActivity(projectId) })
    },
  })
}
