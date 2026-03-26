export interface User {
  id: string
  email: string
  name: string
  currency: string
  timezone: string
  telegramChatId: string | null
  createdAt: string
  updatedAt: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
}
