import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { incomesApi, type CreateIncomeData, type UpdateIncomeData, type IncomeFilters } from '../api/incomes-api'

export const INCOME_KEYS = {
  all: ['incomes'] as const,
  list: (params?: IncomeFilters) => ['incomes', 'list', params] as const,
}

export function useIncomes(params?: IncomeFilters) {
  return useQuery({
    queryKey: INCOME_KEYS.list(params),
    queryFn: () => incomesApi.getAll(params),
    placeholderData: (prev) => prev,
  })
}

export function useCreateIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateIncomeData) => incomesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCOME_KEYS.all })
    },
  })
}

export function useUpdateIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateIncomeData }) =>
      incomesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCOME_KEYS.all })
    },
  })
}

export function useDeleteIncome() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => incomesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: INCOME_KEYS.all })
    },
  })
}
