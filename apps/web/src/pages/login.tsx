import React, { useState, useEffect } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { useLogin } from '../lib/hooks/use-auth'
import { useAuth } from '../contexts/auth-context'
import type { LoginRequest } from '@cuentas-claras/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function LoginPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const loginMutation = useLogin()

  const [formData, setFormData] = useState<LoginRequest>({
    email: '',
    password: '',
  })

  const locationStateRef = React.useRef(location.state)

  useEffect(() => {
    if (loginMutation.isSuccess) {
      const from = (locationStateRef.current as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'
      navigate(from, { replace: true })
    }
  }, [loginMutation.isSuccess, navigate])

  if (isAuthenticated) {
    const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || '/dashboard'
    return <Navigate to={from} replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loginMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Iniciar sesión en Cuentas Claras
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          O{' '}
          <Link to="/register" className="font-medium text-primary hover:underline">
            crear una cuenta nueva
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {loginMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>{loginMutation.error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
