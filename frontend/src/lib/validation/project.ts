import { z } from 'zod'

export const projectSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Project name is required')
    .max(100, 'Name must be at most 100 characters'),
  description: z.string().trim().max(1000, 'Description must be at most 1000 characters'),
})

export type ProjectFormValues = z.infer<typeof projectSchema>
