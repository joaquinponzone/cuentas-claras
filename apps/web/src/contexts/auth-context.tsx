import React, { createContext, useContext, useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useCurrentUser, useLogout, AUTH_KEYS } from '../lib/hooks/use-auth'
import type { User } from '@cuentas-claras/shared'

interface AuthContextType {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  logout: () => void
  refetchUser: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const queryClient = useQueryClient()
  const { data: user, isLoading, refetch: refetchUser } = useCurrentUser()
  const logoutMutation = useLogout()

  const isAuthenticated = !!user

  const logout = () => {
    logoutMutation.mutate()
  }

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.query.state.error) {
        const error = event.query.state.error as { status?: number }
        if (error?.status === 401) {
          queryClient.setQueryData(AUTH_KEYS.currentUser, null)
        }
      }
    })

    return unsubscribe
  }, [queryClient])

  const value: AuthContextType = {
    user: user || null,
    isLoading,
    isAuthenticated,
    logout,
    refetchUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
