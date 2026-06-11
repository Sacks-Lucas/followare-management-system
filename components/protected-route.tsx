"use client"

import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { type UserRole } from "@/lib/auth-context"
import { ReactNode } from "react"

interface ProtectedRouteProps {
  children: ReactNode
  requiredRoles?: UserRole[]
}

export function ProtectedRoute({
  children,
  requiredRoles,
}: ProtectedRouteProps) {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    router.push("/login")
    return null
  }

  if (requiredRoles && user && !requiredRoles.includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Acceso Denegado
          </h1>
          <p className="text-muted-foreground mb-4">
            No tienes permiso para acceder a esta página
          </p>
          <button
            onClick={() => router.push("/")}
            className="text-blue-600 hover:underline"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
