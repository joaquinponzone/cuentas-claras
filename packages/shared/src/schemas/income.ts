import { z } from 'zod'

export const createIncomeSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().datetime(),
  source: z.string().optional(),
  description: z.string().optional(),
})

export const updateIncomeSchema = createIncomeSchema.partial()

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>
export type UpdateIncomeInput = z.infer<typeof updateIncomeSchema>
