"use client"

import { useState, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useLMSData } from "@/lib/lms-data-context"
import {
  FileText,
  Download,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  X,
  User,
  Building,
  Briefcase,
} from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
]

type PeriodoTipo = "15dias" | "30dias" | "mensual" | "personalizado"

export function CierreMensualView() {
  const {
    getCierreMensual,
    getCierrePorPeriodo,
    employees,
    getFichadasByMonth,
    getFichadasByPeriod,
    getNovedadesByEmployeeAndPeriod,
    getFichadasByEmployeeAndPeriod,
    getTurnoById,
    isLoaded,
  } = useLMSData()

  const currentDate = new Date()
  const years = Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - i)
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth())
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear())
  const [periodoTipo, setPeriodoTipo] = useState<PeriodoTipo>("mensual")
  const [fechaInicio, setFechaInicio] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date.toISOString().split("T")[0]
  })
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(null)

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  // Calculate period dates based on selection
  const getPeriodDates = (): { inicio: string; fin: string } => {
    const today = new Date()
    
    switch (periodoTipo) {
      case "15dias": {
        const inicio = new Date(today)
        inicio.setDate(today.getDate() - 15)
        return {
          inicio: inicio.toISOString().split("T")[0],
          fin: today.toISOString().split("T")[0],
        }
      }
      case "30dias": {
        const inicio = new Date(today)
        inicio.setDate(today.getDate() - 30)
        return {
          inicio: inicio.toISOString().split("T")[0],
          fin: today.toISOString().split("T")[0],
        }
      }
      case "mensual": {
        const inicio = new Date(selectedYear, selectedMonth, 1)
        const fin = new Date(selectedYear, selectedMonth + 1, 0)
        return {
          inicio: inicio.toISOString().split("T")[0],
          fin: fin.toISOString().split("T")[0],
        }
      }
      case "personalizado":
        return { inicio: fechaInicio, fin: fechaFin }
      default:
        return { inicio: fechaInicio, fin: fechaFin }
    }
  }

  const periodDates = getPeriodDates()

  // Get report data based on period type
  const reportData = useMemo(() => {
    if (periodoTipo === "mensual") {
      return getCierreMensual(selectedYear, selectedMonth)
    }
    return getCierrePorPeriodo(periodDates.inicio, periodDates.fin)
  }, [
    periodoTipo,
    selectedYear,
    selectedMonth,
    periodDates.inicio,
    periodDates.fin,
    getCierreMensual,
    getCierrePorPeriodo,
  ])

  const fichadasPeriodo = useMemo(() => {
    if (periodoTipo === "mensual") {
      return getFichadasByMonth(selectedYear, selectedMonth)
    }
    return getFichadasByPeriod(periodDates.inicio, periodDates.fin)
  }, [
    periodoTipo,
    selectedYear,
    selectedMonth,
    periodDates.inicio,
    periodDates.fin,
    getFichadasByMonth,
    getFichadasByPeriod,
  ])

  // Selected employee details
  const selectedEmployee = selectedEmployeeId
    ? employees.find((e) => e.id === selectedEmployeeId)
    : null

  const selectedEmployeeReport = selectedEmployeeId
    ? reportData.find((r) => r.empleadoId === selectedEmployeeId)
    : null

  const selectedEmployeeFichadas = useMemo(() => {
    if (!selectedEmployeeId) return []
    return getFichadasByEmployeeAndPeriod(
      selectedEmployeeId,
      periodDates.inicio,
      periodDates.fin
    ).sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))
  }, [selectedEmployeeId, periodDates.inicio, periodDates.fin, getFichadasByEmployeeAndPeriod])

  const selectedEmployeeNovedades = useMemo(() => {
    if (!selectedEmployeeId) return []
    return getNovedadesByEmployeeAndPeriod(
      selectedEmployeeId,
      periodDates.inicio,
      periodDates.fin
    )
  }, [selectedEmployeeId, periodDates.inicio, periodDates.fin, getNovedadesByEmployeeAndPeriod])

  // Calculate totals
  const totals = reportData.reduce(
    (acc, emp) => ({
      diasTrabajados: acc.diasTrabajados + emp.diasTrabajados,
      horasNormales: acc.horasNormales + emp.horasNormales,
      horasExtra: acc.horasExtra + emp.horasExtra,
      tardanzas: acc.tardanzas + emp.tardanzas,
      ausencias: acc.ausencias + emp.ausencias,
      licencias: acc.licencias + emp.licencias,
      suspensiones: acc.suspensiones + emp.suspensiones,
    }),
    {
      diasTrabajados: 0,
      horasNormales: 0,
      horasExtra: 0,
      tardanzas: 0,
      ausencias: 0,
      licencias: 0,
      suspensiones: 0,
    }
  )

  const handleExport = () => {
    const headers = [
      "Empleado",
      "Días Trabajados",
      "Horas Normales",
      "Horas Extra",
      "Tardanzas",
      "Ausencias",
      "Licencias",
      "Suspensiones",
    ]
    const rows = reportData.map((emp) => [
      emp.empleadoNombre,
      emp.diasTrabajados,
      emp.horasNormales,
      emp.horasExtra,
      emp.tardanzas,
      emp.ausencias,
      emp.licencias,
      emp.suspensiones,
    ])

    const periodoLabel =
      periodoTipo === "mensual"
        ? `${meses[selectedMonth]}_${selectedYear}`
        : `${periodDates.inicio}_a_${periodDates.fin}`

    const csvContent = [
      `Cierre del período: ${periodDates.inicio} a ${periodDates.fin}`,
      "",
      headers.join(","),
      ...rows.map((row) => row.join(",")),
      "",
      `Total,${totals.diasTrabajados},${totals.horasNormales},${totals.horasExtra},${totals.tardanzas},${totals.ausencias},${totals.licencias},${totals.suspensiones}`,
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const link = document.createElement("a")
    const url = URL.createObjectURL(blob)
    link.setAttribute("href", url)
    link.setAttribute("download", `cierre_${periodoLabel}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const formatDisplayDate = (value?: string): string => {
    if (!value) return ""
    const normalized = normalizeDateString(value)
    if (!normalized) return value
    const [year, month, day] = normalized.split("-")
    return `${day}/${month}/${year}`
  }

  const normalizeDateString = (value: string): string | undefined => {
    const rawValue = value.trim()
    if (!rawValue) return undefined

    const isoMatch = /^\d{4}-\d{2}-\d{2}$/.test(rawValue)
    if (isoMatch) return rawValue

    const parts = rawValue.split(/[\/\-]/).map((part) => part.trim())
    if (parts.length === 3) {
      let day = parts[0]
      let month = parts[1]
      let year = parts[2]

      if (year.length === 2) year = `20${year}`

      if (parts[0].length === 4) {
        year = parts[0]
        month = parts[1]
        day = parts[2]
      } else if (parts[2].length === 4) {
        const first = Number(parts[0])
        const second = Number(parts[1])
        if (second > 12) {
          day = parts[1]
          month = parts[0]
        } else {
          day = parts[0]
          month = parts[1]
        }
      }

      const parsed = new Date(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00`)
      return isNaN(parsed.getTime())
        ? undefined
        : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`
    }

    const parsed = new Date(rawValue)
    return isNaN(parsed.getTime()) ? undefined : parsed.toISOString().split("T")[0]
  }

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className={`space-y-6 ${selectedEmployeeId ? "flex-1" : "w-full"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cierre Mensual</h1>
            <p className="text-muted-foreground">
              Resumen de asistencia y horas trabajadas por período
            </p>
          </div>
          <Button onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar CSV
          </Button>
        </div>

        {/* Period Selector */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Seleccionar Período</CardTitle>
            <CardDescription>
              Elige el tipo de período para generar el reporte
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup
              value={periodoTipo}
              onValueChange={(v) => setPeriodoTipo(v as PeriodoTipo)}
              className="flex flex-wrap gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="15dias" id="15dias" />
                <Label htmlFor="15dias" className="cursor-pointer">
                  Últimos 15 días
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="30dias" id="30dias" />
                <Label htmlFor="30dias" className="cursor-pointer">
                  Últimos 30 días
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="mensual" id="mensual" />
                <Label htmlFor="mensual" className="cursor-pointer">
                  Mes completo
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="personalizado" id="personalizado" />
                <Label htmlFor="personalizado" className="cursor-pointer">
                  Personalizado
                </Label>
              </div>
            </RadioGroup>

            {periodoTipo === "mensual" && (
              <div className="flex gap-4">
                <div className="w-[200px]">
                  <Label className="text-xs text-muted-foreground">Mes</Label>
                  <Select
                    value={selectedMonth.toString()}
                    onValueChange={(v) => setSelectedMonth(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {meses.map((mes, index) => (
                        <SelectItem key={index} value={index.toString()}>
                          {mes}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-[120px]">
                  <Label className="text-xs text-muted-foreground">Año</Label>
                  <Select
                    value={selectedYear.toString()}
                    onValueChange={(v) => setSelectedYear(parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {periodoTipo === "personalizado" && (
              <div className="flex gap-4">
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Desde</Label>
                  <Input
                    type="date"
                    value={fechaInicio}
                    onChange={(e) => setFechaInicio(e.target.value)}
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground">Hasta</Label>
                  <Input
                    type="date"
                    value={fechaFin}
                    onChange={(e) => setFechaFin(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              Período seleccionado:{" "}
              <strong>
                {new Date(periodDates.inicio).toLocaleDateString("es-AR")} -{" "}
                {new Date(periodDates.fin).toLocaleDateString("es-AR")}
              </strong>
            </div>
          </CardContent>
        </Card>

        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-7">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Calendar className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Días Trabajados</p>
                  <p className="text-xl font-bold">{totals.diasTrabajados}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <Clock className="h-4 w-4 text-blue-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas Normales</p>
                  <p className="text-xl font-bold">{totals.horasNormales}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <TrendingUp className="h-4 w-4 text-green-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Horas Extra</p>
                  <p className="text-xl font-bold text-green-700">{totals.horasExtra}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-amber-100 p-2">
                  <AlertTriangle className="h-4 w-4 text-amber-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Tardanzas</p>
                  <p className="text-xl font-bold text-amber-700">{totals.tardanzas}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <FileText className="h-4 w-4 text-red-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ausencias</p>
                  <p className="text-xl font-bold text-red-700">{totals.ausencias}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <FileText className="h-4 w-4 text-purple-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Licencias</p>
                  <p className="text-xl font-bold text-purple-700">{totals.licencias}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-gray-100 p-2">
                  <Users className="h-4 w-4 text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Suspensiones</p>
                  <p className="text-xl font-bold text-gray-700">{totals.suspensiones}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Report Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Detalle por Empleado</CardTitle>
                <CardDescription>
                  Haz clic en un empleado para ver su detalle individual
                </CardDescription>
              </div>
              <p className="text-sm text-muted-foreground">
                Total de fichadas: {fichadasPeriodo.length}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Empleado</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead className="text-center">Hs. Norm.</TableHead>
                    <TableHead className="text-center">Hs. Extra</TableHead>
                    <TableHead className="text-center">Tardanzas</TableHead>
                    <TableHead className="text-center">Ausencias</TableHead>
                    <TableHead className="text-center">Licencias</TableHead>
                    <TableHead className="text-center">Susp.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportData.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={8}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No hay datos para el período seleccionado
                      </TableCell>
                    </TableRow>
                  ) : (
                    <>
                      {reportData.map((emp) => (
                        <TableRow
                          key={emp.empleadoId}
                          className={`cursor-pointer hover:bg-muted/50 ${
                            selectedEmployeeId === emp.empleadoId ? "bg-muted" : ""
                          }`}
                          onClick={() => setSelectedEmployeeId(emp.empleadoId)}
                        >
                          <TableCell className="font-medium">{emp.empleadoNombre}</TableCell>
                          <TableCell className="text-center">{emp.diasTrabajados}</TableCell>
                          <TableCell className="text-center">{emp.horasNormales}</TableCell>
                          <TableCell className="text-center">
                            {emp.horasExtra > 0 ? (
                              <span className="text-green-600 font-medium">
                                +{emp.horasExtra}
                              </span>
                            ) : (
                              emp.horasExtra
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {emp.tardanzas > 0 ? (
                              <span className="text-amber-600 font-medium">
                                {emp.tardanzas}
                              </span>
                            ) : (
                              emp.tardanzas
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {emp.ausencias > 0 ? (
                              <span className="text-red-600 font-medium">{emp.ausencias}</span>
                            ) : (
                              emp.ausencias
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {emp.licencias > 0 ? (
                              <span className="text-purple-600 font-medium">
                                {emp.licencias}
                              </span>
                            ) : (
                              emp.licencias
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            {emp.suspensiones > 0 ? (
                              <span className="text-gray-600 font-medium">
                                {emp.suspensiones}
                              </span>
                            ) : (
                              emp.suspensiones
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                      {/* Totals row */}
                      <TableRow className="bg-muted/50 font-semibold">
                        <TableCell>TOTAL</TableCell>
                        <TableCell className="text-center">{totals.diasTrabajados}</TableCell>
                        <TableCell className="text-center">{totals.horasNormales}</TableCell>
                        <TableCell className="text-center text-green-600">
                          +{totals.horasExtra}
                        </TableCell>
                        <TableCell className="text-center text-amber-600">
                          {totals.tardanzas}
                        </TableCell>
                        <TableCell className="text-center text-red-600">
                          {totals.ausencias}
                        </TableCell>
                        <TableCell className="text-center text-purple-600">
                          {totals.licencias}
                        </TableCell>
                        <TableCell className="text-center text-gray-600">
                          {totals.suspensiones}
                        </TableCell>
                      </TableRow>
                    </>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employee Detail Panel */}
      {selectedEmployeeId && selectedEmployee && selectedEmployeeReport && (
        <div className="w-[400px] space-y-4 shrink-0">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Detalle Individual</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedEmployeeId(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Info */}
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-lg font-semibold text-primary">
                    {selectedEmployee.nombre[0]}
                    {selectedEmployee.apellido[0]}
                  </span>
                </div>
                <div>
                  <p className="font-semibold">
                    {selectedEmployee.nombre} {selectedEmployee.apellido}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {selectedEmployee.cargo} - {selectedEmployee.departamento}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <span>{selectedEmployee.legajo}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {selectedEmployee.turnoId
                      ? getTurnoById(selectedEmployee.turnoId)?.nombre || "Sin turno"
                      : "Sin turno"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">Resumen del Período</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-primary/5 border">
                  <p className="text-xs text-muted-foreground">Días Trabajados</p>
                  <p className="text-2xl font-bold">
                    {selectedEmployeeReport.diasTrabajados}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                  <p className="text-xs text-muted-foreground">Horas Normales</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {selectedEmployeeReport.horasNormales}h
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-green-50 border border-green-100">
                  <p className="text-xs text-muted-foreground">Horas Extra</p>
                  <p className="text-2xl font-bold text-green-700">
                    +{selectedEmployeeReport.horasExtra}h
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <p className="text-xs text-muted-foreground">Tardanzas</p>
                  <p className="text-2xl font-bold text-amber-700">
                    {selectedEmployeeReport.tardanzas}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-red-50 border border-red-100">
                  <p className="text-xs text-muted-foreground">Ausencias</p>
                  <p className="text-2xl font-bold text-red-700">
                    {selectedEmployeeReport.ausencias}
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                  <p className="text-xs text-muted-foreground">Licencias</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {selectedEmployeeReport.licencias}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Novedades del período */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Novedades ({selectedEmployeeNovedades.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmployeeNovedades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin novedades en el período
                </p>
              ) : (
                <div className="space-y-2 max-h-[150px] overflow-y-auto">
                  {selectedEmployeeNovedades.map((novedad) => (
                    <div
                      key={novedad.id}
                      className="flex items-start gap-2 p-2 rounded-lg border bg-muted/30"
                    >
                      <Badge
                        variant="secondary"
                        className={`shrink-0 mt-0.5 text-xs ${
                          novedad.tipo === "tardanza"
                            ? "bg-amber-100 text-amber-800"
                            : novedad.tipo === "ausencia"
                            ? "bg-red-100 text-red-800"
                            : novedad.tipo === "horaExtra"
                            ? "bg-green-100 text-green-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {novedad.tipo}
                      </Badge>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs truncate">{novedad.descripcion}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(`${novedad.fecha}T00:00:00`).toLocaleDateString("es-AR")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas fichadas */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium">
                Últimas Fichadas ({selectedEmployeeFichadas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedEmployeeFichadas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin fichadas en el período
                </p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  <div className="grid grid-cols-[120px_90px_100px_90px] gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-muted-foreground border-b">
                    <span>Fecha</span>
                    <span>Hora</span>
                    <span>Tipo</span>
                    <span>Estado</span>
                  </div>
                  {selectedEmployeeFichadas.slice(0, 20).map((fichada) => (
                    <div
                      key={fichada.id}
                      className="grid grid-cols-[120px_90px_100px_90px] gap-2 items-center py-2 px-2 text-sm border-b last:border-0"
                    >
                      <span className="text-muted-foreground">{formatDisplayDate(fichada.fecha)}</span>
                      <span className="font-mono">{fichada.hora}</span>
                      <Badge variant="outline" className="text-xs">
                        {fichada.tipo === "entrada" ? "Entrada" : fichada.tipo === "salida" ? "Salida" : fichada.tipo}
                      </Badge>
                      <Badge
                        variant={fichada.esTardanza ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {fichada.esTardanza ? "Tarde" : "Normal"}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
