import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { recurringApi, type CreateRecurringData, type UpdateRecurringData, type RecurringFilters } from '../api/recurring-api'

export const RECURRING_KEYS = {
  all: ['recurring'] as const,
  list: (params?: RecurringFilters) => ['recurring', 'list', params] as const,
}

export function useRecurring(params?: RecurringFilters) {
  return useQuery({
    queryKey: RECURRING_KEYS.list(params),
    queryFn: () => recurringApi.getAll(params),
  })
}

export function useCreateRecurring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateRecurringData) => recurringApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEYS.all })
    },
  })
}

export function useUpdateRecurring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateRecurringData }) =>
      recurringApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEYS.all })
    },
  })
}

export function useToggleRecurring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recurringApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEYS.all })
    },
  })
}

export function useDeleteRecurring() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => recurringApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: RECURRING_KEYS.all })
    },
  })
}
