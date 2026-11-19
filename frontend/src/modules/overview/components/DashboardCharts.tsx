import { AlertTriangle, ArrowRight, Users } from 'lucide-react'
import type { ReactElement, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { ProjectDto } from '@/types'
import type {
  NamedCount,
  ProjectLoadRow,
  TrendPoint,
  TrendSummary,
  WorkspaceKpis,
} from '../lib/dashboard-metrics'

const tooltipStyle = {
  borderRadius: 12,
  border: '1px solid oklch(0.91 0.01 145)',
  boxShadow: '0 8px 20px rgba(15, 23, 42, 0.08)',
  fontSize: 12,
  padding: '8px 10px',
}

const axisTick = { fontSize: 11, fill: 'oklch(0.52 0.02 150)' }
const gridStroke = 'oklch(0.93 0.006 145)'

function Panel({
  className,
  children,
}: {
  className?: string
  children: ReactNode
}) {
  return (
    <Card className={cn('h-full gap-4 rounded-2xl border-border/70 py-5 shadow-sm', className)}>
      {children}
    </Card>
  )
}

function PanelHeader({
  title,
  description,
  action,
}: {
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <CardHeader className="flex flex-row items-start justify-between gap-3 px-5">
      <div className="min-w-0 space-y-1">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </div>
      {action}
    </CardHeader>
  )
}

function ChartFrame({
  isLoading,
  empty,
  emptyLabel,
  height,
  children,
}: {
  isLoading?: boolean
  empty?: boolean
  emptyLabel: string
  height: number
  children: ReactElement
}) {
  if (isLoading) return <Skeleton className="w-full rounded-xl" style={{ height }} />
  if (empty) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground"
        style={{ height }}
      >
        {emptyLabel}
      </div>
    )
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  )
}

/** Area chart + footer metrics (reference: Requests & Review Pace). */
export function DeliveryPaceCard({
  data,
  summary,
  isLoading,
}: {
  data: TrendPoint[]
  summary: TrendSummary
  isLoading?: boolean
}) {
  const empty = !data.some((point) => point.created > 0 || point.completed > 0)

  return (
    <Panel>
      <PanelHeader title="Delivery pace" description="Tasks created across the last 14 days" />
      <CardContent className="space-y-4 px-5">
        <ChartFrame isLoading={isLoading} empty={empty} emptyLabel="No recent activity" height={220}>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
            <defs>
              <linearGradient id="createdFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0f766e" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#0f766e" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} minTickGap={28} />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area
              type="monotone"
              dataKey="created"
              name="Created"
              stroke="#0f766e"
              strokeWidth={2.5}
              fill="url(#createdFill)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ChartFrame>

        <div className="grid grid-cols-3 gap-3 border-t pt-4">
          <FooterStat
            label="Peak day"
            value={isLoading ? '—' : `${summary.peakCreated} tasks`}
            hint={summary.peakLabel}
          />
          <FooterStat label="In progress" value={isLoading ? '—' : String(summary.inProgress)} />
          <FooterStat label="Completed" value={isLoading ? '—' : String(summary.completed)} />
        </div>
      </CardContent>
    </Panel>
  )
}

function FooterStat({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint?: string
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 truncate text-sm font-semibold tabular-nums">{value}</p>
      {hint && hint !== '—' && (
        <p className="truncate text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

/** Horizontal pipeline bars (reference: Request Pipeline). */
export function TaskPipelineCard({
  data,
  isLoading,
}: {
  data: NamedCount[]
  isLoading?: boolean
}) {
  const max = Math.max(...data.map((row) => row.value), 1)

  return (
    <Panel>
      <PanelHeader title="Task pipeline" description="Where every task stands" />
      <CardContent className="px-5">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </div>
        ) : data.every((row) => row.value === 0) ? (
          <div className="flex h-[220px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No tasks yet
          </div>
        ) : (
          <ul className="space-y-4">
            {data.map((row) => (
              <li key={row.key} className="grid grid-cols-[7.5rem_1fr_2rem] items-center gap-3">
                <span className="truncate text-sm text-muted-foreground">{row.name}</span>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-[width] duration-500"
                    style={{
                      width: `${Math.max(4, (row.value / max) * 100)}%`,
                      backgroundColor: row.fill,
                    }}
                  />
                </div>
                <span className="text-right text-sm font-semibold tabular-nums">{row.value}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Panel>
  )
}

/** Grouped bars + coverage badge (reference: Funding Progress). */
export function ProjectProgressCard({
  data,
  totalOpen,
  totalDone,
  completionRate,
  isLoading,
}: {
  data: ProjectLoadRow[]
  totalOpen: number
  totalDone: number
  completionRate: number
  isLoading?: boolean
}) {
  const empty = data.length === 0 || data.every((row) => row.total === 0)

  return (
    <Panel>
      <PanelHeader
        title="Project progress"
        description="Open vs completed tasks"
        action={
          <Badge className="bg-teal-600/15 text-teal-800 hover:bg-teal-600/15">
            {isLoading ? '—' : `${completionRate}% done`}
          </Badge>
        }
      />
      <CardContent className="space-y-4 px-5">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Open tasks</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {isLoading ? '—' : totalOpen}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold tracking-tight tabular-nums">
              {isLoading ? '—' : totalDone}
            </p>
          </div>
        </div>

        <ChartFrame isLoading={isLoading} empty={empty} emptyLabel="No project tasks yet" height={200}>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -18, bottom: 0 }} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={gridStroke} />
            <XAxis dataKey="shortName" tick={axisTick} tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tick={axisTick} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={tooltipStyle}
              cursor={{ fill: 'oklch(0.96 0.008 145)' }}
              labelFormatter={(_, payload) => {
                const row = payload?.[0]?.payload as ProjectLoadRow | undefined
                return row?.name ?? ''
              }}
            />
            <Bar dataKey="open" name="Open" fill="#0f766e" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="DONE" name="Done" fill="#5eead4" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ChartFrame>
      </CardContent>
    </Panel>
  )
}

/** Donut with center total (reference: Asset Mix). */
export function StatusMixCard({
  data,
  total,
  isLoading,
}: {
  data: NamedCount[]
  total: number
  isLoading?: boolean
}) {
  return (
    <Panel>
      <PanelHeader title="Status mix" description="Share of all workspace tasks" />
      <CardContent className="px-5">
        <div className="relative">
          <ChartFrame isLoading={isLoading} empty={data.length === 0} emptyLabel="No tasks yet" height={180}>
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={78}
                paddingAngle={3}
                strokeWidth={0}
              >
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ChartFrame>
          {!isLoading && data.length > 0 && (
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold tabular-nums">{total}</span>
              <span className="text-[11px] text-muted-foreground">tasks</span>
            </div>
          )}
        </div>

        {!isLoading && data.length > 0 && (
          <ul className="mt-3 space-y-2">
            {data.map((entry) => (
              <li key={entry.key} className="flex items-center justify-between gap-3 text-sm">
                <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                  <span
                    className="size-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: entry.fill }}
                    aria-hidden
                  />
                  <span className="truncate">{entry.name}</span>
                </span>
                <span className="font-semibold tabular-nums">{entry.pct ?? 0}%</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Panel>
  )
}

/** Priority bars + callout (reference: Criticality Profile). */
export function PriorityProfileCard({
  data,
  total,
  isLoading,
}: {
  data: NamedCount[]
  total: number
  isLoading?: boolean
}) {
  const lead = [...data].sort((a, b) => b.value - a.value)[0]

  return (
    <Panel>
      <PanelHeader title="Priority profile" description="How urgent the backlog is" />
      <CardContent className="space-y-5 px-5">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex h-[180px] items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
            No tasks yet
          </div>
        ) : (
          <>
            <ul className="space-y-4">
              {data.map((row) => (
                <li key={row.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{row.name}</span>
                    <span className="font-semibold tabular-nums">{row.pct ?? 0}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-[width] duration-500"
                      style={{ width: `${row.pct ?? 0}%`, backgroundColor: row.fill }}
                    />
                  </div>
                </li>
              ))}
            </ul>

            {lead && (
              <div className="flex items-start gap-3 rounded-xl bg-teal-50 px-3.5 py-3 text-sm text-teal-900">
                <Users className="mt-0.5 size-4 shrink-0 text-teal-700" aria-hidden />
                <p>
                  <span className="font-semibold">{lead.name} lead:</span> {lead.value} of {total}{' '}
                  tasks
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Panel>
  )
}

/** Bottom-left projects list (reference: Top Locations). */
export function TopProjectsCard({
  projects,
  rows,
  activeProjectId,
  onOpen,
  isLoading,
}: {
  projects: ProjectDto[]
  rows: ProjectLoadRow[]
  activeProjectId: string | null
  onOpen: (projectId: string) => void
  isLoading?: boolean
}) {
  return (
    <Panel>
      <PanelHeader
        title="Top projects"
        description="Jump into a board"
        action={
          <Button variant="ghost" size="sm" className="h-8 px-2 text-teal-700" asChild>
            <Link to="/projects">View list</Link>
          </Button>
        }
      />
      <CardContent className="px-5">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <ul className="divide-y">
            {projects.slice(0, 5).map((project) => {
              const row = rows.find((p) => p.projectId === project.id)
              return (
                <li key={project.id}>
                  <button
                    type="button"
                    onClick={() => onOpen(project.id)}
                    className="flex w-full items-center gap-3 py-3 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{project.name}</span>
                        {project.id === activeProjectId && (
                          <Badge variant="secondary" className="shrink-0">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                        {row?.total ?? 0} tasks · {row?.completionRate ?? 0}% done
                      </p>
                    </div>
                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </CardContent>
    </Panel>
  )
}

/** Bottom-right readiness / due pressure (reference: Operational Readiness). */
export function OperationalReadinessCard({
  dueBuckets,
  kpis,
  isLoading,
}: {
  dueBuckets: NamedCount[]
  kpis: WorkspaceKpis
  isLoading?: boolean
}) {
  const overdue = dueBuckets.find((row) => row.key === 'overdue')?.value ?? kpis.overdue
  const dueSoon =
    (dueBuckets.find((row) => row.key === 'today')?.value ?? 0) +
    (dueBuckets.find((row) => row.key === 'week')?.value ?? 0)

  return (
    <Panel>
      <PanelHeader
        title="Operational readiness"
        description="Deadlines and backlog health"
      />
      <CardContent className="space-y-5 px-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-muted/30 px-3.5 py-3">
                <p className="text-xs text-muted-foreground">Overdue</p>
                <p
                  className={cn(
                    'mt-1 text-2xl font-bold tabular-nums',
                    overdue > 0 && 'text-rose-600',
                  )}
                >
                  {overdue}
                </p>
              </div>
              <div className="rounded-xl border bg-muted/30 px-3.5 py-3">
                <p className="text-xs text-muted-foreground">Due in 7 days</p>
                <p className="mt-1 text-2xl font-bold tabular-nums">{dueSoon}</p>
              </div>
            </div>

            <ul className="space-y-3">
              {dueBuckets.map((row) => (
                <li key={row.key} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-3">
                  <span className="truncate text-sm text-muted-foreground">{row.name}</span>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(row.pct ?? 0, row.value > 0 ? 6 : 0)}%`,
                        backgroundColor: row.fill,
                      }}
                    />
                  </div>
                  <span className="text-right text-sm font-semibold tabular-nums">{row.value}</span>
                </li>
              ))}
              {dueBuckets.length === 0 && (
                <li className="rounded-xl border border-dashed px-3 py-6 text-center text-sm text-muted-foreground">
                  No open tasks with due dates
                </li>
              )}
            </ul>

            {overdue > 0 && (
              <div className="flex items-start gap-3 rounded-xl bg-rose-50 px-3.5 py-3 text-sm text-rose-800">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                <p>
                  <span className="font-semibold">{overdue} overdue</span> task
                  {overdue === 1 ? '' : 's'} need attention before new work piles up.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Panel>
  )
}
