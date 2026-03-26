import { apiRequest, buildQueryString } from '../api'
import type { RecurringExpense } from '@cuentas-claras/shared'

export interface RecurringFilters {
  isActive?: boolean
}

export interface CreateRecurringData {
  categoryId: string
  amount: number
  description?: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'annual'
  nextDueDate: string
}

export interface UpdateRecurringData {
  categoryId?: string
  amount?: number
  description?: string
  frequency?: 'weekly' | 'biweekly' | 'monthly' | 'annual'
  nextDueDate?: string
}

export const recurringApi = {
  async getAll(params?: RecurringFilters): Promise<RecurringExpense[]> {
    const qs = params ? buildQueryString(params as Record<string, unknown>) : ''
    return apiRequest<RecurringExpense[]>(`/recurring-expenses${qs}`)
  },

  async create(data: CreateRecurringData): Promise<RecurringExpense> {
    return apiRequest<RecurringExpense>('/recurring-expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: UpdateRecurringData): Promise<RecurringExpense> {
    return apiRequest<RecurringExpense>(`/recurring-expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async toggle(id: string): Promise<RecurringExpense> {
    return apiRequest<RecurringExpense>(`/recurring-expenses/${id}/toggle`, {
      method: 'PATCH',
    })
  },

  async remove(id: string): Promise<void> {
    return apiRequest<void>(`/recurring-expenses/${id}`, {
      method: 'DELETE',
    })
  },
}
