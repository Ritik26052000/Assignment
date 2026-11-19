import { useQueries } from '@tanstack/react-query'
import { projectsApi } from '@/api/projects.api'
import { tasksApi } from '@/api/tasks.api'
import { queryKeys } from '@/lib/query-keys'
import type { ProjectDto, ProjectSummaryDto, TaskDto } from '@/types'
import {
  aggregateSummaries,
  buildTrendSeries,
  priorityDistribution,
  priorityProfile,
  projectLoadRows,
  statusDistribution,
  statusPipeline,
  summarizeTrend,
  upcomingDueRows,
} from '../lib/dashboard-metrics'

const TASK_SAMPLE_SIZE = 100

export function useWorkspaceDashboard(projects: ProjectDto[]) {
  const projectIds = projects.map((p) => p.id)

  const summaryQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: queryKeys.summary(id),
      queryFn: () => projectsApi.summary(id),
      enabled: projectIds.length > 0,
    })),
  })

  const taskQueries = useQueries({
    queries: projectIds.map((id) => ({
      queryKey: [...queryKeys.tasksRoot(id), 'dashboard'] as const,
      queryFn: () => tasksApi.list(id, { page: 0, size: TASK_SAMPLE_SIZE }),
      enabled: projectIds.length > 0,
    })),
  })

  const summaries = summaryQueries.map((q) => q.data as ProjectSummaryDto | undefined)
  const tasks: TaskDto[] = taskQueries.flatMap((q) => q.data?.content ?? [])

  const isPending =
    projectIds.length > 0 &&
    (summaryQueries.some((q) => q.isPending) || taskQueries.some((q) => q.isPending))

  const isError = summaryQueries.some((q) => q.isError) || taskQueries.some((q) => q.isError)
  const error =
    summaryQueries.find((q) => q.error)?.error ?? taskQueries.find((q) => q.error)?.error ?? null

  const kpis = aggregateSummaries(projects, summaries)
  const trend = buildTrendSeries(tasks)
  const projectRows = projectLoadRows(projects, summaries)
  const openTasks = kpis.byStatus.TODO + kpis.byStatus.IN_PROGRESS
  const totalOpen = projectRows.reduce((sum, row) => sum + row.open, 0)
  const totalDone = projectRows.reduce((sum, row) => sum + row.DONE, 0)

  return {
    kpis,
    statusSlices: statusDistribution(kpis.byStatus),
    statusPipeline: statusPipeline(kpis.byStatus),
    prioritySlices: priorityDistribution(tasks),
    priorityProfile: priorityProfile(tasks),
    projectRows,
    trend,
    trendSummary: summarizeTrend(trend, kpis.byStatus),
    dueBuckets: upcomingDueRows(tasks),
    openTasks,
    totalOpen,
    totalDone,
    sampledTaskCount: tasks.length,
    isPending,
    isError,
    error,
    refetch: () => {
      summaryQueries.forEach((q) => void q.refetch())
      taskQueries.forEach((q) => void q.refetch())
    },
  }
}
