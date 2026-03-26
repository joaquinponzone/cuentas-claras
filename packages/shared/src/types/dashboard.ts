export interface DashboardSummary {
  totalExpenses: number
  totalIncomes: number
  balance: number
  expenseVariation: number | null
  incomeVariation: number | null
  avgDailyExpense: number
  month: string
}

export interface CategoryBreakdown {
  categoryId: string
  categoryName: string
  total: number
  percentage: number
}

export interface RecurringUpcoming {
  id: string
  description: string | null
  categoryName: string
  amount: number
  frequency: string
  nextDueDate: string
  daysUntilDue: number
}
