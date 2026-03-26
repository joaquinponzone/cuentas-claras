export interface Expense {
  id: string
  userId: string
  groupId: string | null
  categoryId: string
  amount: number
  date: string
  description: string | null
  createdAt: string
}
