import type {
  PageResponse,
  TaskActivityDto,
  TaskDto,
  TaskFilters,
  TaskStatus,
  TaskUpsertRequest,
} from '@/types'
import { apiClient } from './client'

export interface ListTasksParams extends TaskFilters {
  page?: number
  size?: number
}

export const tasksApi = {
  list: (projectId: string, params: ListTasksParams = {}) =>
    apiClient
      .get<PageResponse<TaskDto>>(`/projects/${projectId}/tasks`, { params })
      .then((r) => r.data),

  create: (projectId: string, data: TaskUpsertRequest) =>
    apiClient.post<TaskDto>(`/projects/${projectId}/tasks`, data).then((r) => r.data),

  update: (taskId: string, data: TaskUpsertRequest) =>
    apiClient.put<TaskDto>(`/tasks/${taskId}`, data).then((r) => r.data),

  updateStatus: (taskId: string, status: TaskStatus) =>
    apiClient.patch<TaskDto>(`/tasks/${taskId}/status`, { status }).then((r) => r.data),

  remove: (taskId: string) => apiClient.delete<void>(`/tasks/${taskId}`).then(() => undefined),

  activity: (taskId: string) =>
    apiClient.get<TaskActivityDto[]>(`/tasks/${taskId}/activity`).then((r) => r.data),
}
