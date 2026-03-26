import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { expensesApi, type CreateExpenseData, type UpdateExpenseData, type ExpenseFilters } from '../api/expenses-api'

export const EXPENSE_KEYS = {
  all: ['expenses'] as const,
  list: (params?: ExpenseFilters) => ['expenses', 'list', params] as const,
}

export function useExpenses(params?: ExpenseFilters) {
  return useQuery({
    queryKey: EXPENSE_KEYS.list(params),
    queryFn: () => expensesApi.getAll(params),
    placeholderData: (prev) => prev,
  })
}

export function useCreateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateExpenseData) => expensesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

export function useUpdateExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateExpenseData }) =>
      expensesApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}

export function useDeleteExpense() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => expensesApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: EXPENSE_KEYS.all })
    },
  })
}
