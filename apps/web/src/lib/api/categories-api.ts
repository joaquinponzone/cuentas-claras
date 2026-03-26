import { apiRequest } from '../api'
import type { Category } from '@cuentas-claras/shared'

interface CreateCategoryData {
  name: string
  type: 'expense' | 'income'
  icon?: string
}

export const categoriesApi = {
  async getAll(): Promise<Category[]> {
    return apiRequest<Category[]>('/categories')
  },

  async create(data: CreateCategoryData): Promise<Category> {
    return apiRequest<Category>('/categories', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  },

  async remove(id: string): Promise<void> {
    return apiRequest<void>(`/categories/${id}`, {
      method: 'DELETE',
    })
  },
}
