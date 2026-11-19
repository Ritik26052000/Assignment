import type { TaskPriority, TaskStatus } from '@/types'

export const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  DONE: 'Done',
}

export const PRIORITY_LABEL: Record<TaskPriority, string> = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
}

export const PRIORITY_STYLE: Record<TaskPriority, string> = {
  LOW: 'border-transparent bg-slate-100 text-slate-600',
  MEDIUM: 'border-transparent bg-sky-100 text-sky-700',
  HIGH: 'border-transparent bg-rose-100 text-rose-700',
}

export const STATUS_DOT: Record<TaskStatus, string> = {
  TODO: 'bg-slate-400',
  IN_PROGRESS: 'bg-sky-500',
  DONE: 'bg-blue-500',
}

export interface SortOption {
  value: string
  label: string
}

/** Spring-style `field,direction` sort expressions understood by the tasks endpoint. */
export const SORT_OPTIONS: SortOption[] = [
  { value: 'dueDate,asc', label: 'Due date: earliest' },
  { value: 'dueDate,desc', label: 'Due date: latest' },
  { value: 'priority,desc', label: 'Priority' },
]

export const DEFAULT_SORT = SORT_OPTIONS[0].value
