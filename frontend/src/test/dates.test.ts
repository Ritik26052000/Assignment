import { isOverdue } from '@/lib/dates'

describe('isOverdue', () => {
  const now = new Date(2026, 5, 15, 12, 0, 0)

  it('is true for past dates on open tasks', () => {
    expect(isOverdue('2026-06-14', 'TODO', now)).toBe(true)
    expect(isOverdue('2026-06-14', 'IN_PROGRESS', now)).toBe(true)
  })

  it('is false for today, future dates, missing dates and DONE tasks', () => {
    expect(isOverdue('2026-06-15', 'TODO', now)).toBe(false)
    expect(isOverdue('2026-06-16', 'TODO', now)).toBe(false)
    expect(isOverdue(null, 'TODO', now)).toBe(false)
    expect(isOverdue('2026-06-01', 'DONE', now)).toBe(false)
  })
})
