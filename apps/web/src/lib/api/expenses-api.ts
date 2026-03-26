import { apiRequest, buildQueryString } from '../api'
import type { Expense, PaginatedResponse } from '@cuentas-claras/shared'

export interface ExpenseFilters {
  month?: string
  categoryId?: string
  description?: string
  amountMin?: number
  amountMax?: number
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
  page?: number
}

export interface CreateExpenseData {
  categoryId: string
  amount: number
  date: string
  description?: string
}

export interface UpdateExpenseData {
  categoryId?: string
  amount?: number
  date?: string
  description?: string
}

export const expensesApi = {
  async getAll(params?: ExpenseFilters): Promise<PaginatedResponse<Expense>> {
    const qs = params ? buildQueryString(params as Record<string, unknown>) : ''
    return apiRequest<PaginatedResponse<Expense>>(`/expenses${qs}`)
  },

  async create(data: CreateExpenseData): Promise<Expense> {
    return apiRequest<Expense>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: UpdateExpenseData): Promise<Expense> {
    return apiRequest<Expense>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async remove(id: string): Promise<void> {
    return apiRequest<void>(`/expenses/${id}`, {
      method: 'DELETE',
    })
  },
}
