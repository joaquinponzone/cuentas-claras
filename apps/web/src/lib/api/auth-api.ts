import { apiRequest } from '../api'
import type { User, LoginRequest, RegisterRequest } from '@cuentas-claras/shared'

export const authApi = {
  async login(credentials: LoginRequest): Promise<User> {
    return apiRequest<User>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
  },

  async register(userData: RegisterRequest): Promise<User> {
    return apiRequest<User>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  },

  async getCurrentUser(): Promise<User> {
    return apiRequest<User>('/auth/me')
  },

  async logout(): Promise<void> {
    return apiRequest<void>('/auth/logout', {
      method: 'POST',
    })
  },
}
