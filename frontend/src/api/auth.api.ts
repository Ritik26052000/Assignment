import type { LoginRequest, LoginResponse, RegisterRequest, UserDto } from '@/types'
import { apiClient } from './client'

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<UserDto>('/auth/register', data).then((r) => r.data),

  login: (data: LoginRequest) =>
    apiClient.post<LoginResponse>('/auth/login', data).then((r) => r.data),

  me: () => apiClient.get<UserDto>('/users/me').then((r) => r.data),
}
