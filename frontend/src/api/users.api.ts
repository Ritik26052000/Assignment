import type { PageResponse, UserDto } from '@/types'
import { apiClient } from './client'

export interface CreateUserRequest {
  name: string
  email: string
  password: string
}

export interface UpdateUserRequest {
  name: string
  email: string
  password?: string | null
}

export interface ListUsersParams {
  search?: string
  page?: number
  size?: number
}

export const usersApi = {
  list: (params: ListUsersParams = {}) =>
    apiClient.get<PageResponse<UserDto>>('/users', { params }).then((r) => r.data),

  get: (id: string) => apiClient.get<UserDto>(`/users/${id}`).then((r) => r.data),

  create: (data: CreateUserRequest) =>
    apiClient.post<UserDto>('/users', data).then((r) => r.data),

  update: (id: string, data: UpdateUserRequest) =>
    apiClient.put<UserDto>(`/users/${id}`, data).then((r) => r.data),

  remove: (id: string) => apiClient.delete<void>(`/users/${id}`).then(() => undefined),
}
