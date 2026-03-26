import { z } from 'zod'

export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
})

export const addMemberSchema = z.object({
  email: z.string().email().optional(),
  inviteCode: z.string().optional(),
})

export type CreateGroupInput = z.infer<typeof createGroupSchema>
export type AddMemberInput = z.infer<typeof addMemberSchema>
