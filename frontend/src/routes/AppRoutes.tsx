import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/AppShell'
import { PageSkeleton } from '@/components/PageSkeleton'
import { NotFoundPage } from './NotFoundPage'
import { ProtectedRoute } from './ProtectedRoute'
import { PublicOnlyRoute } from './PublicOnlyRoute'

const LoginPage = lazy(() =>
  import('@/modules/auth/LoginPage').then((m) => ({ default: m.LoginPage })),
)
const RegisterPage = lazy(() =>
  import('@/modules/auth/RegisterPage').then((m) => ({ default: m.RegisterPage })),
)
const OverviewPage = lazy(() =>
  import('@/modules/overview/OverviewPage').then((m) => ({ default: m.OverviewPage })),
)
const ProjectsPage = lazy(() =>
  import('@/modules/projects/ProjectsPage').then((m) => ({ default: m.ProjectsPage })),
)
const BoardPage = lazy(() =>
  import('@/modules/board/BoardPage').then((m) => ({ default: m.BoardPage })),
)
const TeamPage = lazy(() =>
  import('@/modules/team/TeamPage').then((m) => ({ default: m.TeamPage })),
)
const ActivityPage = lazy(() =>
  import('@/modules/activity/ActivityPage').then((m) => ({ default: m.ActivityPage })),
)
const SettingsPage = lazy(() =>
  import('@/modules/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })),
)

/** Single source of truth for every frontend route. */
export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/" element={<Navigate to="/overview" replace />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/overview" element={<OverviewPage />} />
            <Route path="/projects" element={<ProjectsPage />} />
            <Route path="/projects/:id" element={<BoardPage />} />
            <Route path="/team" element={<TeamPage />} />
            <Route path="/activity" element={<ActivityPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
