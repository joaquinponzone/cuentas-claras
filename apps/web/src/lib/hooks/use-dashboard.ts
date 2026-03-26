import { useQuery } from '@tanstack/react-query'
import { dashboardApi } from '../api/dashboard-api'

export const DASHBOARD_KEYS = {
  summary: (month?: string) => ['dashboard', 'summary', month] as const,
  byCategory: (month?: string) => ['dashboard', 'byCategory', month] as const,
  upcoming: () => ['dashboard', 'upcoming'] as const,
}

export function useDashboardSummary(month?: string) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.summary(month),
    queryFn: () => dashboardApi.getSummary(month),
    placeholderData: (prev) => prev,
  })
}

export function useDashboardByCategory(month?: string) {
  return useQuery({
    queryKey: DASHBOARD_KEYS.byCategory(month),
    queryFn: () => dashboardApi.getByCategory(month),
    placeholderData: (prev) => prev,
  })
}

export function useRecurringUpcoming() {
  return useQuery({
    queryKey: DASHBOARD_KEYS.upcoming(),
    queryFn: () => dashboardApi.getUpcoming(),
  })
}
