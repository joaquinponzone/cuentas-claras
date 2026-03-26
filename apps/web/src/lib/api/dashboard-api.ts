import { apiRequest, buildQueryString } from '../api'
import type { CategoryBreakdown, DashboardSummary, RecurringUpcoming } from '@cuentas-claras/shared'

export const dashboardApi = {
  getSummary(month?: string): Promise<DashboardSummary> {
    const qs = month ? buildQueryString({ month }) : ''
    return apiRequest<DashboardSummary>(`/dashboard/summary${qs}`)
  },

  getByCategory(month?: string): Promise<CategoryBreakdown[]> {
    const qs = month ? buildQueryString({ month }) : ''
    return apiRequest<CategoryBreakdown[]>(`/dashboard/by-category${qs}`)
  },

  getUpcoming(): Promise<RecurringUpcoming[]> {
    return apiRequest<RecurringUpcoming[]>('/dashboard/recurring-upcoming')
  },
}
