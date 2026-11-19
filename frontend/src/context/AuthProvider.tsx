import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { authApi } from '@/api/auth.api'
import { resetUnauthorizedGuard, setUnauthorizedHandler } from '@/api/client'
import { clearToken, getToken, isTokenExpired, setToken, TOKEN_KEY } from '@/lib/auth-storage'
import type { LoginRequest, RegisterRequest, UserDto } from '@/types'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'

/** Returns a usable stored token, clearing it when expired. */
function readValidToken(): string | null {
  const token = getToken()
  if (!token) return null
  if (isTokenExpired(token)) {
    clearToken()
    return null
  }
  return token
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [user, setUser] = useState<UserDto | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() =>
    readValidToken() ? 'loading' : 'unauthenticated',
  )

  const endSession = useCallback(() => {
    clearToken()
    setUser(null)
    setStatus('unauthenticated')
    queryClient.clear()
  }, [queryClient])

  /** Fetch the current user with the stored token (the caller sets the loading state). */
  const fetchSession = useCallback(async (isCancelled: () => boolean = () => false) => {
    resetUnauthorizedGuard()
    try {
      const me = await authApi.me()
      if (isCancelled()) return
      setUser(me)
      setStatus('authenticated')
    } catch {
      if (isCancelled()) return
      // 401s already cleared the token in the axios interceptor.
      setUser(null)
      setStatus('unauthenticated')
    }
  }, [])

  // Restore on mount.
  // (Initial status is already 'loading' when a usable token exists.)
  useEffect(() => {
    if (!getToken()) return
    let cancelled = false
    // State is only set after the async request resolves (restoring an external session).
    // oxlint-disable-next-line react/set-state-in-effect
    void fetchSession(() => cancelled)
    return () => {
      cancelled = true
    }
  }, [fetchSession])

  // API 401s end the session; routes then redirect to /login.
  useEffect(() => {
    setUnauthorizedHandler(endSession)
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  // Cross-tab login/logout.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.storageArea !== localStorage) return
      if (event.key !== null && event.key !== TOKEN_KEY) return
      if (!event.newValue) {
        setUser(null)
        setStatus('unauthenticated')
        queryClient.clear()
      } else if (event.newValue !== event.oldValue && readValidToken()) {
        // Another tab signed in: pick up its session.
        setStatus('loading')
        void fetchSession()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [queryClient, fetchSession])

  const login = useCallback(
    async (credentials: LoginRequest) => {
      const res = await authApi.login(credentials)
      queryClient.clear()
      setToken(res.token)
      resetUnauthorizedGuard()
      setUser(res.user)
      setStatus('authenticated')
      return res.user
    },
    [queryClient],
  )

  const register = useCallback(
    async (data: RegisterRequest) => {
      await authApi.register(data)
      return login({ email: data.email, password: data.password })
    },
    [login],
  )

  const logout = useCallback(() => {
    resetUnauthorizedGuard()
    endSession()
  }, [endSession])

  const setCurrentUser = useCallback((next: UserDto) => {
    setUser(next)
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      isAuthenticated: status === 'authenticated',
      isRestoring: status === 'loading',
      login,
      register,
      logout,
      setCurrentUser,
    }),
    [user, status, login, register, logout, setCurrentUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
