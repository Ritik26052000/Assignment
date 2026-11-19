import { useMutation, useQueryClient } from '@tanstack/react-query'
import { tasksApi } from '@/api/tasks.api'
import { queryKeys } from '@/lib/query-keys'
import type { TaskUpsertRequest } from '@/types'

function useInvalidateBoard(projectId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.tasksRoot(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.summary(projectId) }),
      queryClient.invalidateQueries({ queryKey: queryKeys.projectActivity(projectId) }),
    ])
}

export function useCreateTask(projectId: string) {
  const invalidate = useInvalidateBoard(projectId)
  return useMutation({
    mutationFn: (data: TaskUpsertRequest) => tasksApi.create(projectId, data),
    onSuccess: invalidate,
  })
}

export function useUpdateTask(projectId: string) {
  const invalidate = useInvalidateBoard(projectId)
  return useMutation({
    mutationFn: ({ taskId, data }: { taskId: string; data: TaskUpsertRequest }) =>
      tasksApi.update(taskId, data),
    onSuccess: invalidate,
  })
}

export function useDeleteTask(projectId: string) {
  const invalidate = useInvalidateBoard(projectId)
  return useMutation({
    mutationFn: (taskId: string) => tasksApi.remove(taskId),
    onSuccess: invalidate,
  })
}
