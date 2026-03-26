export interface Income {
  id: string
  userId: string
  categoryId: string
  amount: number
  date: string
  source: string | null
  description: string | null
  createdAt: string
}
