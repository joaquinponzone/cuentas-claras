import { useMutation, useQueryClient } from '@tanstack/react-query'
import { importApi } from '../api/import-api'
import type { ConfirmRow } from '@cuentas-claras/shared'

export function useParseImport() {
  return useMutation({
    mutationFn: ({ file, defaultType }: { file: File; defaultType: string }) =>
      importApi.parse(file, defaultType),
  })
}

export function useConfirmImport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (rows: ConfirmRow[]) => importApi.confirm(rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] })
      queryClient.invalidateQueries({ queryKey: ['incomes'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })
}
