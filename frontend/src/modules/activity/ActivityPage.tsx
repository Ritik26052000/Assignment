import { useQuery } from '@tanstack/react-query'
import { Activity, ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { projectsApi } from '@/api/projects.api'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspace } from '@/context/WorkspaceContext'
import { formatDateTime } from '@/lib/dates'
import { queryKeys } from '@/lib/query-keys'
import { STATUS_LABEL } from '@/lib/task-meta'
import { getInitials } from '@/lib/utils'
import type { TaskStatus } from '@/types'

function useProjectActivity(projectId: string | null) {
  return useQuery({
    queryKey: queryKeys.projectActivity(projectId ?? ''),
    queryFn: () => projectsApi.activity(projectId!),
    enabled: !!projectId,
  })
}

export function ActivityPage() {
  const { activeProjectId, openWorkspaceBoard } = useWorkspace()
  const {
    data: rows = [],
    isPending,
    isError,
    error,
    refetch,
  } = useProjectActivity(activeProjectId)

  if (!activeProjectId) {
    return (
      <EmptyState
        icon={Activity}
        title="No workspace selected"
        action={
          <Button asChild>
            <Link to="/projects">Browse projects</Link>
          </Button>
        }
      />
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Activity</h1>
        <Button variant="outline" onClick={() => openWorkspaceBoard(activeProjectId)}>
          Open board <ArrowRight />
        </Button>
      </div>

      {isPending ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading activity">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <ErrorState title="Couldn't load activity" error={error} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Activity}
          title="No activity yet"
          action={<Button onClick={() => openWorkspaceBoard(activeProjectId)}>Go to board</Button>}
        />
      ) : (
        <ol className="space-y-3">
          {rows.map((activity) => (
            <li
              key={activity.id}
              className="flex items-start gap-3 rounded-xl border bg-card px-4 py-3 shadow-xs"
            >
              <Avatar className="mt-0.5 size-9">
                <AvatarFallback className="bg-primary/15 text-xs font-semibold text-primary">
                  {getInitials(activity.actorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <span className="font-semibold">{activity.actorName}</span>
                  {' moved '}
                  <span className="font-semibold">{activity.taskTitle}</span>
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {activity.fromValue && (
                    <Badge variant="secondary">
                      {STATUS_LABEL[activity.fromValue as TaskStatus] ?? activity.fromValue}
                    </Badge>
                  )}
                  <ArrowRight className="size-3.5 text-muted-foreground" aria-hidden />
                  {activity.toValue && (
                    <Badge>
                      {STATUS_LABEL[activity.toValue as TaskStatus] ?? activity.toValue}
                    </Badge>
                  )}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  {formatDateTime(activity.createdAt)}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
