import type { TaskStatus } from '@/types'

/** Parse a `yyyy-MM-dd` string as a local date (avoids UTC off-by-one). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function toDateInputValue(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return ''
  const date = value.length <= 10 ? parseLocalDate(value) : new Date(value)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** A task is overdue when its due date is before today and it is not DONE. */
export function isOverdue(
  dueDate: string | null | undefined,
  status: TaskStatus,
  now: Date = new Date(),
): boolean {
  if (!dueDate || status === 'DONE') return false
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  return parseLocalDate(dueDate).getTime() < today.getTime()
}
