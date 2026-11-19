import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { PageSkeleton } from '@/components/PageSkeleton'
import { useAuth } from '@/context/AuthContext'

/** Renders nested routes only for authenticated users. */
export function ProtectedRoute() {
  const { isRestoring, isAuthenticated } = useAuth()
  const location = useLocation()

  if (isRestoring) return <PageSkeleton />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  return <Outlet />
}
