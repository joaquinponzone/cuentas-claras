export interface Category {
  id: string
  name: string
  type: 'expense' | 'income'
  icon: string | null
  isDefault: boolean
  userId: string | null
}
