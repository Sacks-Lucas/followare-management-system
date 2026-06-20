"use client"

import { useState, Component, type ErrorInfo, type ReactNode, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { Sidebar, type ViewType } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/top-bar"
import { LMSDataProvider } from "@/lib/lms-data-context"
import { DashboardView } from "@/components/dashboard/views/dashboard-view"
import { FichadasView } from "@/components/dashboard/views/fichadas-view"
import { EmployeesView } from "@/components/dashboard/views/employees-view"
import { CierreMensualView } from "@/components/dashboard/views/cierre-mensual-view"
import { EmpleadoFichadasView } from "@/components/dashboard/views/empleado-fichadas-view"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertTriangle, RefreshCw } from "lucide-react"

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onReset?: () => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[v0] Error caught by boundary:", error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <Card className="m-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                Error al cargar la sección
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-muted-foreground">
                Ocurrió un error al renderizar esta sección. Esto puede deberse a datos
                corruptos en el almacenamiento local.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    this.setState({ hasError: false, error: null })
                    this.props.onReset?.()
                  }}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reintentar
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    localStorage.clear()
                    window.location.reload()
                  }}
                >
                  Limpiar datos y recargar
                </Button>
              </div>
              {this.state.error && (
                <pre className="mt-4 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-40">
                  {this.state.error.message}
                </pre>
              )}
            </CardContent>
          </Card>
        )
      )
    }
    return this.props.children
  }
}

const viewComponents: Record<ViewType, React.ComponentType> = {
  dashboard: DashboardView,
  fichadas: FichadasView,
  employees: EmployeesView,
  cierre: CierreMensualView,
  "empleado-fichadas": EmpleadoFichadasView,
}

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const [activeView, setActiveView] = useState<ViewType>("dashboard")
  const [resetKey, setResetKey] = useState(0)

  // Manejo de autenticación
  useEffect(() => {
    if (loading) return

    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    // Establecer vista inicial según el rol
    if (user?.role === "empleado") {
      setActiveView("empleado-fichadas")
    } else if (user?.role === "contador") {
      setActiveView("cierre")
    } else {
      setActiveView("dashboard")
    }
  }, [isAuthenticated, loading, user?.role, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  // Default to dashboard if view is invalid
  const validViews: ViewType[] = ["dashboard", "fichadas", "employees", "cierre", "empleado-fichadas"]
  const safeView = validViews.includes(activeView) ? activeView : "dashboard"
  const ActiveComponent = viewComponents[safeView] || DashboardView

  return (
    <LMSDataProvider>
      <div className="min-h-screen bg-background">
        <Sidebar activeView={safeView} onViewChange={setActiveView} />
        <div className="pl-64">
          <TopBar />
          <main className="p-6">
            <ErrorBoundary 
              key={`${safeView}-${resetKey}`}
              onReset={() => setResetKey((k) => k + 1)}
            >
              <ActiveComponent />
            </ErrorBoundary>
          </main>
        </div>
      </div>
    </LMSDataProvider>
  )
}