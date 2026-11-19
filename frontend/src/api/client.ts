import axios from 'axios'
import { toast } from 'sonner'
import { clearToken, getToken } from '@/lib/auth-storage'
import { config } from '@/lib/config'
import { normalizeError } from '@/lib/errors'

export const apiClient = axios.create({
  baseURL: config.apiUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

/* ---------- 401 handling ---------- */

type UnauthorizedHandler = () => void

let unauthorizedHandler: UnauthorizedHandler | null = null
let handlingUnauthorized = false

/** AuthProvider registers a callback so the SPA can redirect without a full reload. */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | null) {
  unauthorizedHandler = handler
}

/** Re-arm the 401 guard (call after a successful login/register). */
export function resetUnauthorizedGuard() {
  handlingUnauthorized = false
}

const PUBLIC_AUTH_PATHS = ['/auth/login', '/auth/register']

function isPublicAuthRequest(url: string | undefined) {
  return !!url && PUBLIC_AUTH_PATHS.some((p) => url.includes(p))
}

/* ---------- Interceptors ---------- */

apiClient.interceptors.request.use((request) => {
  const token = getToken()
  if (token) request.headers.set('Authorization', `Bearer ${token}`)
  return request
})

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const apiError = normalizeError(error)

    if (
      apiError.status === 401 &&
      axios.isAxiosError(error) &&
      !isPublicAuthRequest(error.config?.url)
    ) {
      const hadToken = !!getToken()
      clearToken()

      if (!handlingUnauthorized) {
        handlingUnauthorized = true
        if (hadToken) toast.error('Your session has expired. Please sign in again.')
        if (unauthorizedHandler) {
          unauthorizedHandler()
        } else if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }
    }

    return Promise.reject(apiError)
  },
)
