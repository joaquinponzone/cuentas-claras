export interface RecurringExpense {
  id: string
  userId: string
  categoryId: string
  amount: number
  description: string | null
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual'
  nextDueDate: string
  isActive: boolean
  createdAt: string
}
