import { render, screen } from '@testing-library/react'
import { TaskCard } from '@/components/TaskCard'
import { toDateInputValue } from '@/lib/dates'
import type { TaskDto } from '@/types'

const TASK_ID = '11111111-1111-1111-1111-111111111111'
const PROJECT_ID = '22222222-2222-2222-2222-222222222222'
const ASSIGNEE_ID = '33333333-3333-3333-3333-333333333333'

function daysFromNow(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toDateInputValue(d)
}

function makeTask(overrides: Partial<TaskDto> = {}): TaskDto {
  return {
    id: TASK_ID,
    projectId: PROJECT_ID,
    title: 'Write release notes',
    description: 'Summarise the changes for v1.2',
    status: 'TODO',
    priority: 'HIGH',
    dueDate: daysFromNow(5),
    assigneeId: ASSIGNEE_ID,
    assignee: { id: ASSIGNEE_ID, name: 'Ada Lovelace' },
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-01-01T00:00:00Z',
    ...overrides,
  }
}

describe('TaskCard', () => {
  it('renders title, description, priority and assignee', () => {
    render(<TaskCard task={makeTask()} />)

    expect(screen.getByRole('heading', { name: 'Write release notes' })).toBeInTheDocument()
    expect(screen.getByText('Summarise the changes for v1.2')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.getByText('Ada Lovelace')).toBeInTheDocument()
    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument()
  })

  it('shows overdue styling with text for a past due date', () => {
    render(<TaskCard task={makeTask({ dueDate: daysFromNow(-3) })} />)

    expect(screen.getByText(/overdue/i)).toBeInTheDocument()
  })

  it('does not mark DONE tasks as overdue', () => {
    render(<TaskCard task={makeTask({ status: 'DONE', dueDate: daysFromNow(-3) })} />)

    expect(screen.queryByText(/overdue/i)).not.toBeInTheDocument()
  })
})
