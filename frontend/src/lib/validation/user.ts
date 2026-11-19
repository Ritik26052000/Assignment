import { z } from 'zod'
import { emailSchema, nameSchema, passwordSchema } from './auth'

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
})
export type CreateUserFormValues = z.infer<typeof createUserSchema>

export const updateUserSchema = z
  .object({
    name: nameSchema,
    email: emailSchema,
    password: z.string().optional(),
  })
  .superRefine((values, ctx) => {
    const password = values.password?.trim() ?? ''
    if (!password) return
    const result = passwordSchema.safeParse(password)
    if (!result.success) {
      for (const issue of result.error.issues) {
        ctx.addIssue({ ...issue, path: ['password'] })
      }
    }
  })
export type UpdateUserFormValues = z.infer<typeof updateUserSchema>
