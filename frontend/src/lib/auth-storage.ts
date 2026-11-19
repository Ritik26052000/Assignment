export const TOKEN_KEY = 'taskflow.token'

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** Decode the `exp` claim (seconds) of a JWT without verifying it. */
export function getTokenExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
    const { exp } = JSON.parse(json) as { exp?: number }
    return typeof exp === 'number' ? exp * 1000 : null
  } catch {
    return null
  }
}

/** Tokens we can't decode are treated as valid; the server remains the source of truth. */
export function isTokenExpired(token: string, now: number = Date.now()): boolean {
  const expiry = getTokenExpiry(token)
  return expiry !== null && expiry <= now
}
