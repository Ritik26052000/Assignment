import type { Location } from 'react-router-dom'

export interface RedirectState {
  from?: Pick<Location, 'pathname' | 'search' | 'hash'>
}

/** Where to go after authenticating: the originally requested page, else /overview. */
export function getRedirectTarget(state: unknown): string {
  const from = (state as RedirectState | null)?.from
  if (from?.pathname && from.pathname !== '/login' && from.pathname !== '/register') {
    return `${from.pathname}${from.search ?? ''}${from.hash ?? ''}`
  }
  return '/overview'
}
