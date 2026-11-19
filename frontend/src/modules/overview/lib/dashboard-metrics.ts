import { isOverdue, parseLocalDate, toDateInputValue } from '@/lib/dates'
import { PRIORITY_LABEL, STATUS_LABEL } from '@/lib/task-meta'
import type {
  ProjectDto,
  ProjectSummaryDto,
  TaskDto,
  TaskPriority,
  TaskStatus,
} from '@/types'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/types'

export interface WorkspaceKpis {
  projectCount: number
  total: number
  overdue: number
  byStatus: Record<TaskStatus, number>
  completionRate: number
}

export interface NamedCount {
  key: string
  name: string
  value: number
  fill: string
  pct?: number
}

export interface ProjectLoadRow {
  projectId: string
  name: string
  shortName: string
  total: number
  open: number
  TODO: number
  IN_PROGRESS: number
  DONE: number
  overdue: number
  completionRate: number
}

export interface TrendPoint {
  date: string
  label: string
  created: number
  completed: number
}

export interface TrendSummary {
  peakCreated: number
  peakLabel: string
  inProgress: number
  completed: number
}

export const STATUS_CHART_COLORS: Record<TaskStatus, string> = {
  TODO: '#64748b',
  IN_PROGRESS: '#0ea5e9',
  DONE: '#0f766e',
}

export const PRIORITY_CHART_COLORS: Record<TaskPriority, string> = {
  LOW: '#94a3b8',
  MEDIUM: '#0ea5e9',
  HIGH: '#e11d48',
}

export const DUE_CHART_COLORS = {
  overdue: '#e11d48',
  today: '#f59e0b',
  week: '#0ea5e9',
  later: '#94a3b8',
} as const

export function aggregateSummaries(
  projects: ProjectDto[],
  summaries: Array<ProjectSummaryDto | undefined>,
): WorkspaceKpis {
  const byStatus: Record<TaskStatus, number> = {
    TODO: 0,
    IN_PROGRESS: 0,
    DONE: 0,
  }
  let total = 0
  let overdue = 0

  for (const summary of summaries) {
    if (!summary) continue
    total += summary.total
    overdue += summary.overdue
    for (const status of TASK_STATUSES) {
      byStatus[status] += summary.byStatus[status] ?? 0
    }
  }

  const completionRate = total === 0 ? 0 : Math.round((byStatus.DONE / total) * 100)

  return {
    projectCount: projects.length,
    total,
    overdue,
    byStatus,
    completionRate,
  }
}

export function statusPipeline(byStatus: Record<TaskStatus, number>): NamedCount[] {
  const total = TASK_STATUSES.reduce((sum, status) => sum + (byStatus[status] ?? 0), 0)
  return TASK_STATUSES.map((status) => {
    const value = byStatus[status] ?? 0
    return {
      key: status,
      name: STATUS_LABEL[status],
      value,
      fill: STATUS_CHART_COLORS[status],
      pct: total === 0 ? 0 : Math.round((value / total) * 100),
    }
  })
}

export function statusDistribution(byStatus: Record<TaskStatus, number>): NamedCount[] {
  return statusPipeline(byStatus).filter((row) => row.value > 0)
}

export function priorityDistribution(tasks: TaskDto[]): NamedCount[] {
  const counts: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
  for (const task of tasks) {
    counts[task.priority] += 1
  }
  const total = tasks.length
  return TASK_PRIORITIES.map((priority) => {
    const value = counts[priority]
    return {
      key: priority,
      name: PRIORITY_LABEL[priority],
      value,
      fill: PRIORITY_CHART_COLORS[priority],
      pct: total === 0 ? 0 : Math.round((value / total) * 100),
    }
  }).filter((row) => row.value > 0)
}

export function priorityProfile(tasks: TaskDto[]): NamedCount[] {
  const counts: Record<TaskPriority, number> = { LOW: 0, MEDIUM: 0, HIGH: 0 }
  for (const task of tasks) {
    counts[task.priority] += 1
  }
  const total = tasks.length
  return TASK_PRIORITIES.map((priority) => {
    const value = counts[priority]
    return {
      key: priority,
      name: PRIORITY_LABEL[priority],
      value,
      fill: PRIORITY_CHART_COLORS[priority],
      pct: total === 0 ? 0 : Math.round((value / total) * 100),
    }
  })
}

export function projectLoadRows(
  projects: ProjectDto[],
  summaries: Array<ProjectSummaryDto | undefined>,
): ProjectLoadRow[] {
  return projects
    .map((project, index) => {
      const summary = summaries[index]
      const TODO = summary?.byStatus.TODO ?? 0
      const IN_PROGRESS = summary?.byStatus.IN_PROGRESS ?? 0
      const DONE = summary?.byStatus.DONE ?? 0
      const total = summary?.total ?? TODO + IN_PROGRESS + DONE
      const open = TODO + IN_PROGRESS
      return {
        projectId: project.id,
        name: project.name,
        shortName: truncateLabel(project.name, 14),
        total,
        open,
        TODO,
        IN_PROGRESS,
        DONE,
        overdue: summary?.overdue ?? 0,
        completionRate: total === 0 ? 0 : Math.round((DONE / total) * 100),
      }
    })
    .sort((a, b) => b.total - a.total)
}

/** Last `days` calendar days: created tasks + completions inferred from DONE.updatedAt. */
export function buildTrendSeries(tasks: TaskDto[], days = 14, now = new Date()): TrendPoint[] {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  start.setDate(start.getDate() - (days - 1))

  const buckets = new Map<string, TrendPoint>()
  for (let i = 0; i < days; i++) {
    const day = new Date(start)
    day.setDate(start.getDate() + i)
    const key = toDateInputValue(day)
    buckets.set(key, {
      date: key,
      label: day.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      created: 0,
      completed: 0,
    })
  }

  for (const task of tasks) {
    const createdKey = toDateInputValue(new Date(task.createdAt))
    const createdBucket = buckets.get(createdKey)
    if (createdBucket) createdBucket.created += 1

    if (task.status === 'DONE') {
      const completedKey = toDateInputValue(new Date(task.updatedAt))
      const completedBucket = buckets.get(completedKey)
      if (completedBucket) completedBucket.completed += 1
    }
  }

  return Array.from(buckets.values())
}

export function summarizeTrend(
  trend: TrendPoint[],
  byStatus: Record<TaskStatus, number>,
): TrendSummary {
  let peakCreated = 0
  let peakLabel = '—'
  for (const point of trend) {
    if (point.created > peakCreated) {
      peakCreated = point.created
      peakLabel = point.label
    }
  }
  return {
    peakCreated,
    peakLabel,
    inProgress: byStatus.IN_PROGRESS ?? 0,
    completed: byStatus.DONE ?? 0,
  }
}

export function upcomingDueRows(tasks: TaskDto[], now = new Date()): NamedCount[] {
  const open = tasks.filter((task) => task.status !== 'DONE' && task.dueDate)
  const overdue = open.filter((task) => isOverdue(task.dueDate, task.status, now)).length
  const todayKey = toDateInputValue(now)
  const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7)

  let dueToday = 0
  let dueThisWeek = 0
  let later = 0

  for (const task of open) {
    if (!task.dueDate) continue
    if (isOverdue(task.dueDate, task.status, now)) continue
    const due = parseLocalDate(task.dueDate)
    const key = toDateInputValue(due)
    if (key === todayKey) {
      dueToday += 1
    } else if (due.getTime() <= weekEnd.getTime()) {
      dueThisWeek += 1
    } else {
      later += 1
    }
  }

  const rows = [
    { key: 'overdue', name: 'Overdue', value: overdue, fill: DUE_CHART_COLORS.overdue },
    { key: 'today', name: 'Due today', value: dueToday, fill: DUE_CHART_COLORS.today },
    { key: 'week', name: 'Next 7 days', value: dueThisWeek, fill: DUE_CHART_COLORS.week },
    { key: 'later', name: 'Later', value: later, fill: DUE_CHART_COLORS.later },
  ]
  const total = rows.reduce((sum, row) => sum + row.value, 0)
  return rows.map((row) => ({
    ...row,
    pct: total === 0 ? 0 : Math.round((row.value / total) * 100),
  }))
}

function truncateLabel(value: string, max: number): string {
  if (value.length <= max) return value
  return `${value.slice(0, max - 1)}…`
}
