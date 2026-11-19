import type { CreateProjectRequest, ProjectDto, ProjectSummaryDto, TaskActivityDto } from '@/types'
import { apiClient } from './client'

export const projectsApi = {
  list: () => apiClient.get<ProjectDto[]>('/projects').then((r) => r.data),

  get: (id: string) => apiClient.get<ProjectDto>(`/projects/${id}`).then((r) => r.data),

  create: (data: CreateProjectRequest) =>
    apiClient.post<ProjectDto>('/projects', data).then((r) => r.data),

  summary: (id: string) =>
    apiClient.get<ProjectSummaryDto>(`/projects/${id}/summary`).then((r) => r.data),

  activity: (id: string, limit = 40) =>
    apiClient
      .get<TaskActivityDto[]>(`/projects/${id}/activity`, { params: { limit } })
      .then((r) => r.data),
}
