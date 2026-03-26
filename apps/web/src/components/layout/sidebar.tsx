import React from 'react'
import { NavLink } from 'react-router-dom'
import { LayoutDashboard, ArrowDownCircle, ArrowUpCircle, Tag, RefreshCw, LogOut } from 'lucide-react'
import { useAuth } from '../../contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'

const navItems = [
  { path: '/dashboard', label: 'Dashboard', Icon: LayoutDashboard },
  { path: '/expenses', label: 'Gastos', Icon: ArrowDownCircle },
  { path: '/incomes', label: 'Ingresos', Icon: ArrowUpCircle },
  { path: '/categories', label: 'Categorías', Icon: Tag },
  { path: '/recurring', label: 'Recurrentes', Icon: RefreshCw },
]

export function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="w-64 bg-card border-r border-border flex flex-col shrink-0">
      <div className="p-6 border-b border-border">
        <h1 className="text-lg font-bold text-foreground">Cuentas Claras</h1>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(({ path, label, Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4">
        <Separator className="mb-4" />
        <p className="text-sm font-medium text-foreground truncate">{user?.name}</p>
        <p className="text-xs text-muted-foreground truncate mb-3">{user?.email}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  )
}
