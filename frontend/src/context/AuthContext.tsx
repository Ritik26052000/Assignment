import { createContext, useContext } from 'react'
import type { LoginRequest, RegisterRequest, UserDto } from '@/types'

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated'

export interface AuthContextValue {
  user: UserDto | null
  status: AuthStatus
  isAuthenticated: boolean
  /** True while the session is being restored from a stored token. */
  isRestoring: boolean
  login: (credentials: LoginRequest) => Promise<UserDto>
  /** Creates the account and signs the user in. */
  register: (data: RegisterRequest) => Promise<UserDto>
  logout: () => void
  /** Keep the in-memory session in sync after a profile update. */
  setCurrentUser: (user: UserDto) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within an <AuthProvider>')
  return ctx
}
