import { ArrowRight, FolderKanban, Plus } from 'lucide-react'
import { EmptyState } from '@/components/EmptyState'
import { ErrorState } from '@/components/ErrorState'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useWorkspace } from '@/context/WorkspaceContext'
import { CreateProjectDialog } from '@/modules/projects/CreateProjectDialog'
import {
  DeliveryPaceCard,
  OperationalReadinessCard,
  PriorityProfileCard,
  ProjectProgressCard,
  StatusMixCard,
  TaskPipelineCard,
  TopProjectsCard,
} from './components/DashboardCharts'
import { useWorkspaceDashboard } from './hooks/useWorkspaceDashboard'

function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading overview">
      <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[340px] rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-[300px] rounded-2xl" />
        ))}
      </div>
    </div>
  )
}

export function OverviewPage() {
  const { projects, isLoading, activeProjectId, openWorkspaceBoard } = useWorkspace()
  const dashboard = useWorkspaceDashboard(projects)

  if (isLoading) return <DashboardSkeleton />

  if (projects.length === 0) {
    return (
      <EmptyState icon={FolderKanban} title="No projects yet" action={<CreateProjectDialog />} />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CreateProjectDialog
          trigger={
            <Button variant="outline" size="sm">
              <Plus /> New project
            </Button>
          }
        />
        {activeProjectId && (
          <Button size="sm" onClick={() => openWorkspaceBoard(activeProjectId)}>
            Open board <ArrowRight />
          </Button>
        )}
      </div>

      {dashboard.isError ? (
        <ErrorState
          title="Couldn't load dashboard data"
          error={dashboard.error}
          onRetry={() => dashboard.refetch()}
        />
      ) : (
        <section aria-label="Analytics dashboard" className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-[1.35fr_1fr]">
            <DeliveryPaceCard
              data={dashboard.trend}
              summary={dashboard.trendSummary}
              isLoading={dashboard.isPending}
            />
            <TaskPipelineCard
              data={dashboard.statusPipeline}
              isLoading={dashboard.isPending}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <ProjectProgressCard
              data={dashboard.projectRows}
              totalOpen={dashboard.totalOpen}
              totalDone={dashboard.totalDone}
              completionRate={dashboard.kpis.completionRate}
              isLoading={dashboard.isPending}
            />
            <StatusMixCard
              data={dashboard.statusSlices}
              total={dashboard.kpis.total}
              isLoading={dashboard.isPending}
            />
            <PriorityProfileCard
              data={dashboard.priorityProfile}
              total={dashboard.sampledTaskCount}
              isLoading={dashboard.isPending}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <TopProjectsCard
              projects={projects}
              rows={dashboard.projectRows}
              activeProjectId={activeProjectId}
              onOpen={openWorkspaceBoard}
              isLoading={dashboard.isPending}
            />
            <OperationalReadinessCard
              dueBuckets={dashboard.dueBuckets}
              kpis={dashboard.kpis}
              isLoading={dashboard.isPending}
            />
          </div>
        </section>
      )}
    </div>
  )
}
