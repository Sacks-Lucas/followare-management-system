"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KPICard } from "@/components/dashboard/kpi-card"
import { useLMSData, type TipoNovedad } from "@/lib/lms-data-context"
import { Users, UserCheck, Clock, AlertTriangle, ArrowUpRight, ArrowDownRight } from "lucide-react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"
import { Badge } from "@/components/ui/badge"

const tipoNovedadLabels: Record<TipoNovedad, string> = {
  ausencia: "Ausencia",
  tardanza: "Tardanza",
  horaExtra: "Hora Extra",
  licencia: "Licencia",
  feriado: "Feriado",
  justificativo: "Justificativo",
  suspension: "Suspensión",
  cambioTurno: "Cambio Turno",
  vacaciones: "Vacaciones",
  enfermedad: "Enfermedad",
}

const tipoNovedadColors: Record<TipoNovedad, string> = {
  ausencia: "bg-red-100 text-red-800",
  tardanza: "bg-amber-100 text-amber-800",
  horaExtra: "bg-green-100 text-green-800",
  licencia: "bg-blue-100 text-blue-800",
  feriado: "bg-purple-100 text-purple-800",
  justificativo: "bg-cyan-100 text-cyan-800",
  suspension: "bg-red-100 text-red-800",
  cambioTurno: "bg-indigo-100 text-indigo-800",
  vacaciones: "bg-teal-100 text-teal-800",
  enfermedad: "bg-orange-100 text-orange-800",
}

export function DashboardView() {
  const { getStats, fichadas, novedades, isLoaded } = useLMSData()
  
  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  const stats = getStats()

  // Generate chart data for last 7 days
  const chartData = []
  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split("T")[0]
    const dayFichadas = fichadas.filter((f) => f.fecha === dateStr)
    
    const presentes = new Set(
      dayFichadas.filter((f) => f.tipo === "entrada").map((f) => f.empleadoId)
    ).size
    
    const ausencias = stats.totalEmpleados - presentes
    
    chartData.push({
      day: date.toLocaleDateString("es-AR", { weekday: "short" }),
      Asistencias: presentes,
      Ausencias: Math.max(0, ausencias),
    })
  }

  // Get recent novedades
  const recentNovedades = novedades.slice(0, 5)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Resumen general del sistema de gestión laboral</p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Empleados"
          value={stats.totalEmpleados}
          icon={Users}
          trend={{ value: 2.5, label: "vs mes anterior", isPositive: true }}
        />
        <KPICard
          title="Presentes Hoy"
          value={stats.presentesHoy}
          icon={UserCheck}
          trend={{ value: 95, label: "% asistencia", isPositive: true }}
        />
        <KPICard
          title="Tardanzas Hoy"
          value={stats.tardanzas}
          icon={Clock}
          trend={{ value: 12, label: "vs ayer", isPositive: false }}
        />
        <KPICard
          title="Pendientes"
          value={stats.pendientes}
          icon={AlertTriangle}
          trend={{ value: 3, label: "novedades", isPositive: false }}
        />
      </div>

      {/* Charts and Alerts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Attendance Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Asistencias vs Ausencias</CardTitle>
            <p className="text-sm text-muted-foreground">Últimos 7 días</p>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis 
                    dataKey="day" 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    tick={{ fontSize: 12 }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px"
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="Asistencias" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                  <Bar 
                    dataKey="Ausencias" 
                    fill="hsl(var(--destructive))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Novedades Recientes</CardTitle>
            <p className="text-sm text-muted-foreground">Últimas inconsistencias registradas</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentNovedades.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No hay novedades recientes
                </p>
              ) : (
                recentNovedades.map((novedad) => (
                  <div
                    key={novedad.id}
                    className="flex items-start gap-4 rounded-lg border border-border p-4"
                  >
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      {novedad.tipo === "tardanza" || novedad.tipo === "ausencia" ? (
                        <ArrowDownRight className="h-5 w-5 text-destructive" />
                      ) : (
                        <ArrowUpRight className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">
                          {novedad.empleadoNombre}
                        </p>
                        <Badge variant="secondary" className={tipoNovedadColors[novedad.tipo]}>
                          {tipoNovedadLabels[novedad.tipo]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{novedad.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(novedad.fecha).toLocaleDateString("es-AR")}
                      </p>
                    </div>
                    {!novedad.aprobado && (
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        Pendiente
                      </Badge>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
