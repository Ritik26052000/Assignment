import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageSkeleton } from '@/components/PageSkeleton'
import { useAuth } from '@/context/AuthContext'
import { getRedirectTarget } from '@/modules/auth/hooks/redirect'

/** Login/register pages: signed-in users are sent on to the app. */
export function PublicOnlyRoute() {
  const { isRestoring, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isRestoring) return <PageSkeleton />
  if (isAuthenticated) return <Navigate to={getRedirectTarget(location.state)} replace />
  return <Outlet />
}
