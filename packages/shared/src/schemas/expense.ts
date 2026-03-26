import { z } from 'zod'

export const createExpenseSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  description: z.string().optional(),
  groupId: z.string().uuid().optional(),
})

export const updateExpenseSchema = createExpenseSchema.partial()

export type CreateExpenseInput = z.infer<typeof createExpenseSchema>
export type UpdateExpenseInput = z.infer<typeof updateExpenseSchema>
