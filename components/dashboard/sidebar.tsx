"use client"

import { cn } from "@/lib/utils"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Clock,
  FileText,
  HelpCircle,
  LogOut,
  Building2,
} from "lucide-react"

export type ViewType = "dashboard" | "fichadas" | "employees" | "cierre" | "empleado-fichadas"

const navigation: { name: string; view: ViewType; icon: typeof LayoutDashboard; roles: string[] }[] = [
  { name: "Dashboard", view: "dashboard", icon: LayoutDashboard, roles: ["admin"] },
  { name: "Fichadas del Día", view: "fichadas", icon: Clock, roles: ["admin"] },
  { name: "Empleados", view: "employees", icon: Users, roles: ["admin"] },
  { name: "Cierre Mensual", view: "cierre", icon: FileText, roles: ["admin", "contador"] },
  { name: "Mis Fichadas", view: "empleado-fichadas", icon: Clock, roles: ["empleado"] },
]

interface SidebarProps {
  activeView: ViewType
  onViewChange: (view: ViewType) => void
}

export function Sidebar({ activeView, onViewChange }: SidebarProps) {
  const { user, logout } = useAuth()
  const router = useRouter()

  // Filtrar navegación según el rol
  const filteredNavigation = navigation.filter(
    (item) => user && item.roles.includes(user.role)
  )

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-sidebar text-sidebar-foreground">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-sidebar-border px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-sidebar-foreground">WorkForce Pro</h1>
            <p className="text-xs text-sidebar-foreground/60">Sistema de Gestión Laboral</p>
          </div>
        </div>

        {/* User Info */}
        {user && (
          <div className="border-b border-sidebar-border px-6 py-4">
            <p className="text-xs text-sidebar-foreground/60">Sesión iniciada como:</p>
            <p className="text-sm font-semibold text-sidebar-foreground capitalize">{user.username}</p>
            <span className="inline-block mt-2 text-xs bg-sidebar-accent text-sidebar-accent-foreground px-2 py-1 rounded">
              {user.role === "empleado" ? "Empleado" : user.role === "contador" ? "Contador" : "Administrador"}
            </span>
          </div>
        )}

        {/* Main Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
            Menú Principal
          </p>
          {filteredNavigation.map((item) => {
            const isActive = activeView === item.view
            return (
              <button
                key={item.name}
                onClick={() => onViewChange(item.view)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </button>
            )
          })}
        </nav>

        {/* Secondary Navigation */}
        <div className="border-t border-sidebar-border px-3 py-4 space-y-2">
          <button
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <HelpCircle className="h-5 w-5" />
            Ayuda y Soporte
          </button>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <LogOut className="h-5 w-5" />
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  )
}
