import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TaskFormDialog } from '@/components/TaskFormDialog'

const users = [{ id: '11111111-1111-1111-1111-111111111111', name: 'Ada Lovelace' }]

describe('TaskFormDialog validation', () => {
  it('shows a validation error and does not submit when the title is empty', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(<TaskFormDialog open onOpenChange={() => {}} users={users} onSubmit={onSubmit} />)

    await user.click(screen.getByRole('button', { name: /create task/i }))

    expect(await screen.findByText('Title is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits trimmed values when valid', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)
    const onOpenChange = jest.fn()
    const user = userEvent.setup()

    render(<TaskFormDialog open onOpenChange={onOpenChange} users={users} onSubmit={onSubmit} />)

    await user.type(screen.getByLabelText('Title'), '  Ship it  ')
    await user.click(screen.getByRole('button', { name: /create task/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Ship it',
        status: 'TODO',
        priority: 'MEDIUM',
        dueDate: null,
        assigneeId: null,
      }),
    )
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})
