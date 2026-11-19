import type { TaskFilters, TaskStatus } from '@/types'

export interface UsersListParams {
  search?: string
  page?: number
  size?: number
}

export const queryKeys = {
  users: ['users'] as const,
  usersList: (params: UsersListParams) => ['users', 'list', params] as const,
  projects: ['projects'] as const,
  project: (id: string) => ['projects', id] as const,
  summary: (projectId: string) => ['projects', projectId, 'summary'] as const,
  /** All task queries for a project (used for invalidation). */
  tasksRoot: (projectId: string) => ['projects', projectId, 'tasks'] as const,
  /** Tasks of one status column under a given filter set. */
  tasks: (projectId: string, status: TaskStatus, filters: Omit<TaskFilters, 'status'>) =>
    ['projects', projectId, 'tasks', status, filters] as const,
  activity: (taskId: string) => ['tasks', taskId, 'activity'] as const,
  projectActivity: (projectId: string) => ['projects', projectId, 'activity'] as const,
}
