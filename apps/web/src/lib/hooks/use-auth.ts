import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth-api'
import type { LoginRequest, RegisterRequest } from '@cuentas-claras/shared'

export const AUTH_KEYS = {
  currentUser: ['auth', 'currentUser'] as const,
}

export function useCurrentUser() {
  return useQuery({
    queryKey: AUTH_KEYS.currentUser,
    queryFn: authApi.getCurrentUser,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authApi.login(credentials),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_KEYS.currentUser, user)
    },
  })
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userData: RegisterRequest) => authApi.register(userData),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_KEYS.currentUser, user)
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: authApi.logout,
    onSuccess: () => {
      queryClient.setQueryData(AUTH_KEYS.currentUser, null)
      queryClient.clear()
    },
  })
}
