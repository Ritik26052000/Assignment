export const TASK_STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]

export const TASK_PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'] as const
export type TaskPriority = (typeof TASK_PRIORITIES)[number]

export const ACTIVITY_TYPES = ['STATUS_CHANGED'] as const
export type ActivityType = (typeof ACTIVITY_TYPES)[number]

/** Backend query param: a user UUID or the literal `unassigned`. */
export const ASSIGNEE_FILTER_UNASSIGNED = 'unassigned' as const

export interface UserDto {
  id: string
  name: string
  email: string
  createdAt: string
}

export interface UserSummaryDto {
  id: string
  name: string
}

export interface ProjectDto {
  id: string
  name: string
  description: string | null
  ownerId: string
  createdAt: string
}

export interface TaskDto {
  id: string
  projectId: string
  title: string
  description: string | null
  status: TaskStatus
  priority: TaskPriority
  /** ISO date (yyyy-MM-dd) */
  dueDate: string | null
  assigneeId: string | null
  assignee: UserSummaryDto | null
  createdAt: string
  updatedAt: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
  last: boolean
}

export interface ProjectSummaryDto {
  projectId: string
  total: number
  overdue: number
  byStatus: Record<TaskStatus, number>
}

export interface TaskActivityDto {
  id: string
  taskId: string
  taskTitle: string
  type: ActivityType
  actorId: string
  actorName: string
  fromValue: string | null
  toValue: string | null
  createdAt: string
}

/* ---------- Requests ---------- */

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface LoginResponse {
  token: string
  tokenType: string
  expiresIn: number
  user: UserDto
}

export interface CreateProjectRequest {
  name: string
  description?: string
}

export interface TaskUpsertRequest {
  title: string
  description?: string | null
  status?: TaskStatus
  priority: TaskPriority
  dueDate?: string | null
  assigneeId?: string | null
}

export interface TaskFilters {
  status?: TaskStatus
  priority?: TaskPriority
  /** User UUID or the literal `unassigned` (backend query param). */
  assigneeId?: string
  sort?: string
}

/* ---------- Errors ---------- */

export interface FieldError {
  field: string
  message: string
}

export interface ApiErrorBody {
  timestamp: string
  status: number
  error: string
  code: string
  message: string
  path: string
  fieldErrors?: FieldError[]
}
