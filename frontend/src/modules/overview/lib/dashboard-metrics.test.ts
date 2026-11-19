import type { ProjectDto, ProjectSummaryDto, TaskDto } from '@/types'
import {
  aggregateSummaries,
  buildTrendSeries,
  priorityDistribution,
  projectLoadRows,
  statusDistribution,
  upcomingDueRows,
} from './dashboard-metrics'

const project = (id: string, name: string): ProjectDto => ({
  id,
  name,
  description: null,
  ownerId: 'u1',
  createdAt: '2026-01-01T00:00:00Z',
})

const summary = (
  projectId: string,
  byStatus: ProjectSummaryDto['byStatus'],
  overdue = 0,
): ProjectSummaryDto => ({
  projectId,
  total: byStatus.TODO + byStatus.IN_PROGRESS + byStatus.DONE,
  overdue,
  byStatus,
})

const task = (partial: Partial<TaskDto> & Pick<TaskDto, 'id' | 'status' | 'priority'>): TaskDto => ({
  projectId: 'p1',
  title: 'Task',
  description: null,
  dueDate: null,
  assigneeId: null,
  assignee: null,
  createdAt: '2026-11-18T10:00:00Z',
  updatedAt: '2026-11-18T12:00:00Z',
  ...partial,
})

describe('dashboard-metrics', () => {
  it('aggregates summaries into workspace KPIs', () => {
    const kpis = aggregateSummaries(
      [project('p1', 'Alpha'), project('p2', 'Beta')],
      [
        summary('p1', { TODO: 2, IN_PROGRESS: 1, DONE: 1 }, 1),
        summary('p2', { TODO: 0, IN_PROGRESS: 2, DONE: 2 }, 0),
      ],
    )

    expect(kpis.total).toBe(8)
    expect(kpis.overdue).toBe(1)
    expect(kpis.byStatus).toEqual({ TODO: 2, IN_PROGRESS: 3, DONE: 3 })
    expect(kpis.completionRate).toBe(38)
  })

  it('builds chart-ready status and priority slices', () => {
    expect(
      statusDistribution({ TODO: 2, IN_PROGRESS: 0, DONE: 1 }).map((s) => s.key),
    ).toEqual(['TODO', 'DONE'])

    expect(
      priorityDistribution([
        task({ id: '1', status: 'TODO', priority: 'HIGH' }),
        task({ id: '2', status: 'DONE', priority: 'HIGH' }),
        task({ id: '3', status: 'TODO', priority: 'LOW' }),
      ]).map((s) => [s.key, s.value]),
    ).toEqual([
      ['LOW', 1],
      ['HIGH', 2],
    ])
  })

  it('orders project load by total tasks', () => {
    const rows = projectLoadRows(
      [project('p1', 'Small'), project('p2', 'Large')],
      [
        summary('p1', { TODO: 1, IN_PROGRESS: 0, DONE: 0 }),
        summary('p2', { TODO: 2, IN_PROGRESS: 2, DONE: 1 }),
      ],
    )
    expect(rows.map((r) => r.projectId)).toEqual(['p2', 'p1'])
  })

  it('buckets created and completed tasks into a trend series', () => {
    const now = new Date(2026, 10, 19) // Nov 19, 2026 local
    const series = buildTrendSeries(
      [
        task({
          id: '1',
          status: 'DONE',
          priority: 'MEDIUM',
          createdAt: '2026-11-18T09:00:00Z',
          updatedAt: '2026-11-19T09:00:00Z',
        }),
        task({
          id: '2',
          status: 'TODO',
          priority: 'LOW',
          createdAt: '2026-11-19T09:00:00Z',
          updatedAt: '2026-11-19T09:00:00Z',
        }),
      ],
      3,
      now,
    )

    expect(series).toHaveLength(3)
    expect(series.at(-1)?.date).toBe('2026-11-19')
    expect(series.reduce((sum, point) => sum + point.created, 0)).toBeGreaterThan(0)
  })

  it('groups open due dates into pressure buckets', () => {
    const now = new Date(2026, 10, 19)
    const buckets = upcomingDueRows(
      [
        task({ id: '1', status: 'TODO', priority: 'HIGH', dueDate: '2026-11-10' }),
        task({ id: '2', status: 'TODO', priority: 'MEDIUM', dueDate: '2026-11-19' }),
        task({ id: '3', status: 'IN_PROGRESS', priority: 'LOW', dueDate: '2026-11-22' }),
        task({ id: '4', status: 'DONE', priority: 'LOW', dueDate: '2026-11-01' }),
      ],
      now,
    )

    expect(buckets.find((b) => b.key === 'overdue')?.value).toBe(1)
    expect(buckets.find((b) => b.key === 'today')?.value).toBe(1)
    expect(buckets.find((b) => b.key === 'week')?.value).toBe(1)
  })
})
