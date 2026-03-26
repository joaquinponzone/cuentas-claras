export interface ParsedRow {
  rowIndex: number
  date: string | null
  amount: number | null
  type: 'expense' | 'income'
  category: string | null
  matchedCategoryId: string | null
  matchedCategoryName: string | null
  description: string | null
  source: string | null
  errors: string[]
  warnings: string[]
  isDuplicate: boolean
}

export interface ImportPreview {
  rows: ParsedRow[]
  summary: {
    totalRows: number
    validRows: number
    errorRows: number
    duplicateRows: number
    expenseCount: number
    incomeCount: number
  }
  detectedColumns: string[]
}

export interface ConfirmRow {
  date: string
  amount: number
  type: 'expense' | 'income'
  categoryId: string
  description?: string
  source?: string
}

export interface ConfirmResult {
  inserted: { expenses: number; incomes: number }
}
