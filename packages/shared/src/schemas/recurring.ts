import { z } from 'zod'

export const createRecurringSchema = z.object({
  categoryId: z.string().uuid(),
  amount: z.number().positive(),
  description: z.string().optional(),
  frequency: z.enum(['weekly', 'biweekly', 'monthly', 'annual']),
  nextDueDate: z.string().datetime(),
})

export type CreateRecurringInput = z.infer<typeof createRecurringSchema>
