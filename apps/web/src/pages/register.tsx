import React, { useState, useEffect } from 'react'
import { Navigate, useNavigate, Link } from 'react-router-dom'
import { useRegister } from '../lib/hooks/use-auth'
import { useAuth } from '../contexts/auth-context'
import type { RegisterRequest } from '@cuentas-claras/shared'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'

export default function RegisterPage() {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const registerMutation = useRegister()

  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    name: '',
    password: '',
  })

  useEffect(() => {
    if (registerMutation.isSuccess) {
      navigate('/dashboard', { replace: true })
    }
  }, [registerMutation.isSuccess, navigate])

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    registerMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }))
  }

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold text-foreground">
          Crear cuenta en Cuentas Claras
        </h2>
        <p className="mt-2 text-center text-sm text-muted-foreground">
          O{' '}
          <Link to="/login" className="font-medium text-primary hover:underline">
            iniciar sesión en tu cuenta existente
          </Link>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
              />
            </div>

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
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            {registerMutation.error && (
              <Alert variant="destructive">
                <AlertDescription>{registerMutation.error.message}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={registerMutation.isPending}>
              {registerMutation.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
