import { z } from 'zod'

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['expense', 'income']),
  icon: z.string().optional(),
})

export type CreateCategoryInput = z.infer<typeof createCategorySchema>
