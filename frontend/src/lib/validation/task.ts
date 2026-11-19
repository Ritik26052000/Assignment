import { z } from 'zod'
import { TASK_PRIORITIES, TASK_STATUSES } from '@/types'

export const taskSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Title is required')
    .max(120, 'Title must be at most 120 characters'),
  description: z.string().trim().max(2000, 'Description must be at most 2000 characters'),
  status: z.enum(TASK_STATUSES),
  priority: z.enum(TASK_PRIORITIES),
  /** yyyy-MM-dd or empty string */
  dueDate: z
    .string()
    .refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v), 'Enter a valid date'),
  /** user id as string, or '' for unassigned */
  assigneeId: z.string(),
})

export type TaskFormValues = z.infer<typeof taskSchema>
