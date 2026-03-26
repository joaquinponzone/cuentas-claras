"use client"

import * as React from "react"
import {
  ArrowDownCircleIcon,
  ArrowUpCircleIcon,
  LayoutDashboardIcon,
  TagIcon,
  UploadIcon,
  UsersIcon,
  WalletIcon,
} from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuth } from "@/contexts/auth-context"

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboardIcon },
  { title: "Gastos", url: "/expenses", icon: ArrowDownCircleIcon },
  { title: "Ingresos", url: "/incomes", icon: ArrowUpCircleIcon },
  { title: "Categorías", url: "/categories", icon: TagIcon },
  { title: "Grupos", url: "/groups", icon: UsersIcon },
  { title: "Importar", url: "/import", icon: UploadIcon },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, logout } = useAuth()

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="/dashboard">
                <WalletIcon className="h-5 w-5" />
                <span className="text-base font-semibold">Cuentas Claras</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>
      <SidebarFooter>
        {user && <NavUser user={user} onLogout={logout} />}
      </SidebarFooter>
    </Sidebar>
  )
}
