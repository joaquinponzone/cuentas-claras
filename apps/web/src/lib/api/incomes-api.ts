import { apiRequest, buildQueryString } from '../api'
import type { Income, PaginatedResponse } from '@cuentas-claras/shared'

export interface IncomeFilters {
  month?: string
  categoryId?: string
  description?: string
  amountMin?: number
  amountMax?: number
  sortBy?: 'date' | 'amount'
  sortOrder?: 'asc' | 'desc'
  page?: number
}

export interface CreateIncomeData {
  categoryId: string
  amount: number
  date: string
  source?: string
  description?: string
}

export interface UpdateIncomeData {
  categoryId?: string
  amount?: number
  date?: string
  source?: string
  description?: string
}

export const incomesApi = {
  async getAll(params?: IncomeFilters): Promise<PaginatedResponse<Income>> {
    const qs = params ? buildQueryString(params as Record<string, unknown>) : ''
    return apiRequest<PaginatedResponse<Income>>(`/incomes${qs}`)
  },

  async create(data: CreateIncomeData): Promise<Income> {
    return apiRequest<Income>('/incomes', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async update(id: string, data: UpdateIncomeData): Promise<Income> {
    return apiRequest<Income>(`/incomes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    })
  },

  async remove(id: string): Promise<void> {
    return apiRequest<void>(`/incomes/${id}`, {
      method: 'DELETE',
    })
  },
}
