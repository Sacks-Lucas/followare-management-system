"use client"

import { useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useLMSData, type Fichada, type Novedad } from "@/lib/lms-data-context"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Upload, Download, FileText, AlertCircle, CheckCircle, Clock } from "lucide-react"

const tipoFichadaLabels: Record<Fichada["tipo"], string> = {
  entrada: "Entrada",
  salida: "Salida",
  inicioBreak: "Inicio Break",
  finBreak: "Fin Break",
}

const getStatusBadge = (
  novedad: Novedad | undefined,
  row: { tipo: string; status: string; esTardanza?: boolean }
) => {
  if (novedad) {
    if (novedad.estado === 'aprobada') {
      return (
        <div className="flex items-center gap-2 text-green-600">
          <CheckCircle className="h-4 w-4" />
          <span className="text-sm font-medium">Aprobado</span>
        </div>
      )
    }
    if (novedad.estado === 'rechazada') {
      return (
        <div className="flex items-center gap-2 text-red-600">
          <span className="text-sm font-medium">Rechazado</span>
        </div>
      )
    }
    return (
      <div className="flex items-center gap-2 text-orange-600">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">Pendiente</span>
      </div>
    )
  }

  if (row.status === "approved") {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">Aprobado</span>
      </div>
    )
  }

  if (row.status === "pending" || row.tipo === "ausencia" || row.tipo === "mediaAusencia") {
    return (
      <div className="flex items-center gap-2 text-orange-600">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">Pendiente</span>
      </div>
    )
  }

  if (row.tipo === "entrada" && row.esTardanza) {
    return (
      <div className="flex items-center gap-2 text-orange-600">
        <Clock className="h-4 w-4" />
        <span className="text-sm font-medium">Llegada tardía</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 text-gray-600">
      <span className="text-sm font-medium">Normal</span>
    </div>
  )
}

const parseTimeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(":").map((value) => Number(value))
  return hours * 60 + minutes
}

const formatMinutes = (minutes: number) => {
  const hours = Math.floor(Math.abs(minutes) / 60)
  const mins = Math.abs(minutes) % 60
  return `${hours}h ${mins}m`
}

const parseLocalDate = (fecha: string): Date => {
  const [year, month, day] = fecha.split("-").map((value) => Number(value))
  return new Date(year, month - 1, day)
}

const formatLocalDate = (fecha: string) => {
  return parseLocalDate(fecha).toLocaleDateString("es-ES", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

const toISODate = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function EmpleadoFichadasView() {
  const { user } = useAuth()
  const {
    getEmployeeById,
    getFichadasByEmployee,
    getNovedadesByEmployee,
    getTurnoById,
    addNovedad,
    isLoaded,
  } = useLMSData()

  const employeeId = useMemo(() => user?.employeeId ?? "5", [user?.employeeId])
  const employee = getEmployeeById(employeeId)

  const employeeFichadas = useMemo(
    () => (employee ? getFichadasByEmployee(employee.id) : []),
    [employee, getFichadasByEmployee]
  )

  const employeeNovedades = useMemo(
    () => (employee ? getNovedadesByEmployee(employee.id) : []),
    [employee, getNovedadesByEmployee]
  )

  const turno = useMemo(
    () => (employee?.turnoId ? getTurnoById(employee.turnoId) : undefined),
    [employee?.turnoId, getTurnoById]
  )

  const justificativosByDate = useMemo(() => {
    const map = new Map<string, Novedad>()
    employeeNovedades
      .filter((n) => n.tipo === "justificativo")
      .forEach((n) => map.set(n.fecha, n))
    return map
  }, [employeeNovedades])

  type EmpleadoRow = {
    id: string
    fecha: string
    hora: string
    tipo: Fichada["tipo"] | "ausencia" | "mediaAusencia"
    metodo: string
    ubicacion: string
    resultado: string
    status: "approved" | "pending" | "normal"
    justificativo?: Novedad
    ausenciaNovedad?: Novedad
    esTardanza?: boolean
    minutosExtra?: number
  }

  const employeeFichadasSorted = useMemo(
    () => [...employeeFichadas].sort((a, b) =>
      a.fecha === b.fecha ? a.hora.localeCompare(b.hora) : b.fecha.localeCompare(a.fecha)
    ),
    [employeeFichadas]
  )

  const actualRows = useMemo<EmpleadoRow[]>(
    () =>
      employeeFichadasSorted.map((f) => ({
        id: f.id,
        fecha: f.fecha,
        hora: f.hora,
        tipo: f.tipo,
        metodo: f.metodo,
        ubicacion: f.ubicacion || "",
        resultado: "",
        status: "normal" as const,
        esTardanza: f.esTardanza,
        minutosExtra: f.minutosExtra,
      })),
    [employeeFichadasSorted]
  )

  const [uploadingId, setUploadingId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  const isJustifiedNonAttendance = (n: Novedad) =>
    ["ausencia", "mediaAusencia", "licencia", "vacaciones", "enfermedad", "suspension", "feriado", "justificativo"].includes(
      n.tipo
    )

  const absenceNovedadesByDate = useMemo(() => {
    const map = new Map<string, Novedad>()
    employeeNovedades
      .filter((n) => n.tipo === "ausencia" || n.tipo === "mediaAusencia")
      .forEach((n) => map.set(n.fecha, n))
    return map
  }, [employeeNovedades])

  const attendanceDates = useMemo(
    () => new Set(employeeFichadas.filter((f) => f.tipo === "entrada").map((f) => f.fecha)),
    [employeeFichadas]
  )

  const nonAttendanceDates = useMemo(
    () => new Set(employeeNovedades.filter(isJustifiedNonAttendance).map((n) => n.fecha)),
    [employeeNovedades]
  )

  const absenceRows = useMemo<EmpleadoRow[]>(() => {
    if (!employee || !turno) return []

    const workDays = turno.diasSemana ?? [1, 2, 3, 4, 5]
    const rows: EmpleadoRow[] = []
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const start = new Date(today)
    start.setDate(start.getDate() - 30)

    const ingreso = parseLocalDate(employee.fechaIngreso)
    const rangeStart = ingreso > start ? ingreso : start

    const current = new Date(rangeStart)
    while (current <= today) {
      const dateStr = toISODate(current)
      const weekday = current.getDay()
      const isWorkday = workDays.includes(weekday) && !employee.diasDescanso?.includes(weekday)

      if (current >= ingreso && isWorkday && !attendanceDates.has(dateStr)) {
        const absenceNovedad = absenceNovedadesByDate.get(dateStr)
        const isJustified = nonAttendanceDates.has(dateStr)

        rows.push({
          id: `aus-${dateStr}`,
          fecha: dateStr,
          hora: "-",
          tipo: absenceNovedad?.tipo === "mediaAusencia" ? "mediaAusencia" : "ausencia",
          metodo: "-",
          ubicacion: "-",
          resultado: absenceNovedad ? "Ausencia registrada" : "Ausencia sin fichar",
          status: absenceNovedad?.estado === "aprobada" ? "approved" : isJustified ? "pending" : "pending",
          justificativo: justificativosByDate.get(dateStr),
          ausenciaNovedad: absenceNovedad,
        })
      }

      current.setDate(current.getDate() + 1)
    }

    return rows
  }, [employee, turno, attendanceDates, absenceNovedadesByDate, nonAttendanceDates, justificativosByDate])

  const visibleRows = useMemo(
    () => [...actualRows, ...absenceRows].sort((a, b) =>
      a.fecha === b.fecha ? (a.hora || "").localeCompare(b.hora || "") : b.fecha.localeCompare(a.fecha)
    ),
    [actualRows, absenceRows]
  )

  const getExpectedExitMinutes = (fecha: string): number | null => {
    if (!turno?.horaSalida) return null
    return parseTimeToMinutes(turno.horaSalida)
  }

  const isEarlyExit = (row: EmpleadoRow): boolean => {
    if (row.tipo !== "salida") return false
    const expectedExit = getExpectedExitMinutes(row.fecha)
    if (expectedExit === null) return false
    const actualExit = parseTimeToMinutes(row.hora)
    const tolerancia = turno?.toleranciaSalidaMinutos ?? turno?.toleranciaMinutos ?? 0
    return actualExit < expectedExit - tolerancia
  }

  const canUploadJustificativo = (row: EmpleadoRow): boolean => {
    if (!employee) return false
    if (justificativosByDate.has(row.fecha)) return false
    if (row.tipo === "entrada" && row.esTardanza) return true
    if (row.tipo === "salida" && isEarlyExit(row)) return true
    if (row.tipo === "ausencia" || row.tipo === "mediaAusencia") return true
    return false
  }

  const handleFileUpload = async (row: EmpleadoRow, file: File | null) => {
    if (!file || !employee) return

    setUploadingId(row.id)

    setTimeout(() => {
      addNovedad({
        empleadoId: employee.id,
        empleadoNombre: `${employee.nombre} ${employee.apellido}`,
        tipo: "justificativo",
        fecha: row.fecha,
        descripcion:
          row.tipo === "entrada"
            ? "Justificativo por llegada tardía"
            : row.tipo === "salida"
              ? "Justificativo por salida anticipada"
              : "Justificativo por ausencia",
        estado: "pendiente",
        documentoAdjunto: file.name,
      })
      setUploadingId(null)
      setSuccessMessage("Archivo cargado exitosamente. Pendiente de aprobación.")
      setTimeout(() => setSuccessMessage(""), 3000)
    }, 1500)
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case "entrada":
        return "Entrada"
      case "salida":
        return "Salida"
      case "inicioBreak":
        return "Inicio Break"
      case "finBreak":
        return "Fin Break"
      case "ausencia":
        return "Ausencia"
      case "mediaAusencia":
        return "Media ausencia"
      default:
        return "Registro"
    }
  }

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  if (!employee) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Empleado no encontrado</h1>
        <p className="text-muted-foreground mt-2">
          Inicia sesión con el usuario de empleado o configura el ID de empleado en la cuenta.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Mis Fichadas</h1>
        <p className="text-muted-foreground mt-2">
          Visualiza tu registro de asistencia y carga justificantes para llegadas tardías y salidas anticipadas.
        </p>
        <div className="mt-4 rounded-lg border bg-muted p-4">
          <p className="text-sm text-muted-foreground">Empleado</p>
          <p className="text-lg font-semibold">{employee.nombre} {employee.apellido}</p>
          <p className="text-sm text-muted-foreground">Turno fijo: Lunes a Viernes 08:00 - 16:00</p>
        </div>
      </div>

      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Registro de Asistencia</CardTitle>
          <CardDescription>Fichadas individuales del empleado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Hora</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Auditoría</TableHead>
                  <TableHead>Justificante</TableHead>
                  <TableHead>Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visibleRows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-10 text-muted-foreground">
                      No hay fichadas ni ausencias registradas en los últimos 30 días.
                    </TableCell>
                  </TableRow>
                ) : (
                  visibleRows.map((row) => {
                    const justificativo = justificativosByDate.get(row.fecha)
                    const absenceNovedad = row.ausenciaNovedad
                    const early = isEarlyExit(row)
                    const resultLabel = row.tipo === "entrada"
                      ? row.esTardanza
                        ? "Entrada tardía"
                        : "Entrada normal"
                      : row.tipo === "salida"
                        ? early
                          ? "Salida anticipada"
                          : row.minutosExtra && row.minutosExtra > 0
                            ? `Horas extra +${formatMinutes(row.minutosExtra)}`
                            : "Salida normal"
                        : row.resultado || "Ausencia"

                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium">
                          {formatLocalDate(row.fecha)}
                        </TableCell>
                        <TableCell>{row.hora}</TableCell>
                        <TableCell>{getTypeLabel(row.tipo)}</TableCell>
                        <TableCell>{row.metodo || "-"}</TableCell>
                        <TableCell>{row.ubicacion || "-"}</TableCell>
                        <TableCell>{resultLabel}</TableCell>
                        <TableCell>{getStatusBadge(justificativo, row)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {(justificativo?.estado !== 'pendiente' && justificativo?.modificadoPor && justificativo?.fechaModificacion) ||
                          (absenceNovedad?.estado !== 'pendiente' && absenceNovedad?.modificadoPor && absenceNovedad?.fechaModificacion) ? (
                            <div>
                              <div className="font-medium">{justificativo?.modificadoPor || absenceNovedad?.modificadoPor}</div>
                              <div>{new Date(justificativo?.fechaModificacion || absenceNovedad?.fechaModificacion || '').toLocaleDateString("es-AR")}</div>
                              <div>{new Date(justificativo?.fechaModificacion || absenceNovedad?.fechaModificacion || '').toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/50">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {justificativo ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <div className="text-sm">
                                <p className="font-medium text-blue-600">{justificativo.documentoAdjunto}</p>
                                <p className="text-xs text-muted-foreground">{justificativo.descripcion}</p>
                              </div>
                            </div>
                          ) : absenceNovedad ? (
                            <div className="flex items-center gap-2">
                              <FileText className="h-4 w-4 text-blue-600" />
                              <div className="text-sm">
                                <p className="font-medium text-blue-600">{absenceNovedad.descripcion}</p>
                                <p className="text-xs text-muted-foreground">{absenceNovedad.tipo}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Sin justificante</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {canUploadJustificativo(row) ? (
                            <>
                              <input
                                type="file"
                                id={`file-${row.id}`}
                                className="hidden"
                                onChange={(e) => handleFileUpload(row, e.target.files?.[0] || null)}
                                disabled={uploadingId === row.id}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                              />
                              <label htmlFor={`file-${row.id}`}>
                                <Button
                                  asChild
                                  variant="outline"
                                  size="sm"
                                  disabled={uploadingId === row.id}
                                  className="cursor-pointer"
                                >
                                  <span>
                                    <Upload className="mr-2 h-4 w-4" />
                                    {uploadingId === row.id ? "Subiendo..." : "Subir justificante"}
                                  </span>
                                </Button>
                              </label>
                            </>
                          ) : justificativo ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                console.log("Descargando:", justificativo.documentoAdjunto)
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              Descargar
                            </Button>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Resumen del Empleado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 border rounded-lg">
              <p className="text-sm text-muted-foreground">Entradas tardías</p>
              <p className="text-2xl font-bold">
                {employeeFichadasSorted.filter((f) => f.tipo === "entrada" && f.esTardanza).length}
              </p>
            </div>
            <div className="p-4 border rounded-lg border-red-200 bg-red-50">
              <p className="text-sm text-red-600">Salidas anticipadas</p>
              <p className="text-2xl font-bold text-red-700">
                {employeeFichadasSorted.filter((f) => f.tipo === "salida" && isEarlyExit(f)).length}
              </p>
            </div>
            <div className="p-4 border rounded-lg border-green-200 bg-green-50">
              <p className="text-sm text-green-600">Horas extra</p>
              <p className="text-2xl font-bold text-green-700">
                {employeeFichadasSorted.filter((f) => f.tipo === "salida" && f.minutosExtra && f.minutosExtra > 0).length}
              </p>
            </div>
            <div className="p-4 border rounded-lg border-orange-200 bg-orange-50">
              <p className="text-sm text-orange-600">Ausencias</p>
              <p className="text-2xl font-bold text-orange-700">
                {absenceRows.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Puedes subir justificantes para llegadas tardías o salidas anticipadas.
          La administración revisará y aprobará tu justificante.
        </AlertDescription>
      </Alert>
    </div>
  )
}
