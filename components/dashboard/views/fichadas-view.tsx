"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useLMSData,
  type TipoFichada,
  type MetodoFichada,
  type TipoNovedad,
} from "@/lib/lms-data-context"
import { parseLocalDate, toLocalISODate, todayLocalISODate } from "@/lib/date-utils"
import {
  Clock,
  LogIn,
  LogOut,
  Coffee,
  Trash2,
  Plus,
  AlertTriangle,
  Fingerprint,
  Keyboard,
  Wifi,
  CreditCard,
  FileText,
  Check,
  X,
  TrendingUp,
  Upload,
  Info,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import * as XLSX from "xlsx"

const tipoFichadaLabels: Record<TipoFichada, string> = {
  entrada: "Entrada",
  salida: "Salida",
  inicioBreak: "Inicio Break",
  finBreak: "Fin Break",
}

const tipoFichadaIcons: Record<TipoFichada, typeof LogIn> = {
  entrada: LogIn,
  salida: LogOut,
  inicioBreak: Coffee,
  finBreak: Coffee,
}

const tipoFichadaColors: Record<TipoFichada, string> = {
  entrada: "bg-green-100 text-green-800",
  salida: "bg-red-100 text-red-800",
  inicioBreak: "bg-amber-100 text-amber-800",
  finBreak: "bg-blue-100 text-blue-800",
}

const metodoFichadaLabels: Record<MetodoFichada, string> = {
  biometrico: "Biométrico",
  manual: "Manual",
  api: "API",
  tarjeta: "Tarjeta",
}

const metodoFichadaIcons: Record<MetodoFichada, typeof Fingerprint> = {
  biometrico: Fingerprint,
  manual: Keyboard,
  api: Wifi,
  tarjeta: CreditCard,
}

const tipoNovedadLabels: Record<TipoNovedad, string> = {
  ausencia: "Ausencia",
  tardanza: "Tardanza",
  horaExtra: "Hora Extra",
  licencia: "Licencia",
  feriado: "Feriado",
  justificativo: "Justificativo",
  suspension: "Suspensión",
  cambioTurno: "Cambio de Turno",
  vacaciones: "Vacaciones",
  enfermedad: "Enfermedad",
  mediaAusencia: "Media Ausencia",
  fichaIncompleta: "Ficha Incompleta"
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
  mediaAusencia: "bg-red-50 text-red-700",
  fichaIncompleta: "bg-yellow-100 text-yellow-800"
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

    const parsed = new Date(Number(year), Number(month) - 1, Number(day))
    return isNaN(parsed.getTime())
      ? undefined
      : toLocalISODate(parsed)
  }

  const parsed = parseLocalDate(rawValue)
  return isNaN(parsed.getTime()) ? undefined : toLocalISODate(parsed)
}

const parseExcelDate = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined
  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000)
    return isNaN(date.getTime()) ? undefined : toLocalISODate(date)
  }

  return normalizeDateString(String(value))
}

export function FichadasView() {
  const {
    employees,
    fichadas,
    addFichada,
    addFichadasMasivas,
    deleteFichada,
    getFichadasHoy,
    novedades,
    addNovedad,
    gestionarEstadoNovedad,
    deleteNovedad,
    getNovedadesPendientes,
    actualizarEstadoFichada,
    turnos,
    getTurnoById,
    isLoaded,
  } = useLMSData()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNovedadDialogOpen, setIsNovedadDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [filterDate, setFilterDate] = useState(todayLocalISODate())
  const [activeTab, setActiveTab] = useState("fichadas")

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState("")
  const [successMessage, setSuccessMessage] = useState("")

  const showError = (msg: string) => {
    setErrorMessage(msg)
    setTimeout(() => setErrorMessage(""), 6000)
  }
  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(""), 3000)
  }

  // Form state for fichada
  const [selectedEmployee, setSelectedEmployee] = useState("")
  const [tipoFichada, setTipoFichada] = useState<TipoFichada>("entrada")
  const [metodoFichada, setMetodoFichada] = useState<MetodoFichada>("manual")
  const [hora, setHora] = useState("")
  const [ubicacion, setUbicacion] = useState("")
  const [observaciones, setObservaciones] = useState("")
  const [dispositivo, setDispositivo] = useState("")

  // Form state for novedad
  const [novedadEmpleado, setNovedadEmpleado] = useState("")
  const [novedadTipo, setNovedadTipo] = useState<TipoNovedad>("justificativo")
  const [novedadFecha, setNovedadFecha] = useState(todayLocalISODate())
  const [novedadFechaFin, setNovedadFechaFin] = useState("")
  const [novedadDescripcion, setNovedadDescripcion] = useState("")

  // Import state
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<any[]>([])
  const [importErrors, setImportErrors] = useState<string[]>([])

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  const fichadasHoy = getFichadasHoy()
  const novedadesPendientes = getNovedadesPendientes()
  const filteredFichadas = fichadas
    .filter((f) => f.fecha === filterDate)
    .sort((a, b) => b.hora.localeCompare(a.hora))

  // Fichadas marcadas como posibles duplicados, pendientes de resolución por el admin
  const fichadasPendientes = fichadas
    .filter((f) => f.estado === "pendiente")
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))

  // Calcular estadísticas de interpretación
  const tardanzasHoy = fichadasHoy.filter((f) => f.esTardanza).length
  const horasExtraHoy = fichadasHoy
    .filter((f) => f.minutosExtra && f.minutosExtra > 0)
    .reduce((sum, f) => sum + (f.minutosExtra || 0), 0)

  const handleSubmitFichada = (e: React.FormEvent) => {
    e.preventDefault()
    const employee = employees.find((emp) => emp.id === selectedEmployee)
    if (!employee) return

    // Validar que se ingresó hora
    if (!hora) {
      alert("Debe ingresar la hora de la fichada")
      return
    }

    console.log("Registrando fichada:", {
      empleadoId: employee.id,
      empleadoNombre: `${employee.nombre} ${employee.apellido}`,
      tipo: tipoFichada,
      fecha: filterDate,
      hora: hora,
      ubicacion: ubicacion || "Entrada Principal",
      observaciones,
      metodo: metodoFichada,
      dispositivo: dispositivo || undefined,
      estado: "ok" as const
    })

    const result = addFichada({
      empleadoId: employee.id,
      empleadoNombre: `${employee.nombre} ${employee.apellido}`,
      tipo: tipoFichada,
      fecha: filterDate,
      hora: hora,
      ubicacion: ubicacion || "Entrada Principal",
      observaciones: observaciones || undefined,
      metodo: metodoFichada,
      dispositivo: dispositivo || undefined,
      estado: "ok",
    })

    if (!result.success) {
      showError(result.error ?? "No se pudo registrar la fichada")
      return
    }

    // Reset form
    setSelectedEmployee("")
    setTipoFichada("entrada")
    setMetodoFichada("manual")
    setHora("")
    setUbicacion("")
    setObservaciones("")
    setDispositivo("")
    setIsDialogOpen(false)
  }

  const handleSubmitNovedad = (e: React.FormEvent) => {
    e.preventDefault()
    const employee = employees.find((emp) => emp.id === novedadEmpleado)
    if (!employee) return

    addNovedad({
      empleadoId: employee.id,
      empleadoNombre: `${employee.nombre} ${employee.apellido}`,
      tipo: novedadTipo,
      fecha: novedadFecha,
      fechaFin: novedadFechaFin || undefined,
      descripcion: novedadDescripcion,
      estado: "pendiente",
    })

    // Reset form
    setNovedadEmpleado("")
    setNovedadTipo("justificativo")
    setNovedadFecha(todayLocalISODate())
    setNovedadFechaFin("")
    setNovedadDescripcion("")
    setIsNovedadDialogOpen(false)
  }

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFile(file)
    setImportErrors([])

    const reader = new FileReader()
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: "array" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        // Skip header row
        const rows = jsonData.slice(1) as any[][]

        const preview = rows.map((row, index) => {
          const empleadoId = row[0]?.toString().trim()
          const tipo = row[1]?.toString().trim().toLowerCase()
          const fecha = parseExcelDate(row[2])
          const hora = row[3]?.toString().trim()
          const metodo = row[4]?.toString().trim().toLowerCase() || "manual"
          const ubicacion = row[5]?.toString().trim() || "Importado"
          const observaciones = row[6]?.toString().trim() || ""

          const employee = employees.find((emp) => emp.id === empleadoId || emp.legajo === empleadoId)
          const empleadoNombre = employee ? `${employee.nombre} ${employee.apellido}` : "Empleado no encontrado"

          return {
            empleadoId: employee ? employee.id : empleadoId,
            empleadoNombre,
            tipo,
            fecha,
            hora,
            metodo,
            ubicacion,
            observaciones,
            valid: !!employee && ["entrada", "salida", "iniciobreak", "finbreak"].includes(tipo) && !!fecha,
          }
        })

        setImportPreview(preview)
      } catch (error) {
        setImportErrors(["Error al procesar el archivo Excel"])
      }
    }
    reader.readAsArrayBuffer(file)
  }

  const handleImportFichadas = () => {
    const validFichadas = importPreview.filter((p) => p.valid).map((p) => ({
      empleadoId: p.empleadoId,
      empleadoNombre: p.empleadoNombre,
      tipo: p.tipo as TipoFichada,
      fecha: p.fecha,
      hora: p.hora,
      ubicacion: p.ubicacion,
      observaciones: p.observaciones,
      metodo: p.metodo as MetodoFichada,
    }))

    if (validFichadas.length > 0) {
      addFichadasMasivas(validFichadas)
    }

    setIsImportDialogOpen(false)
    setImportFile(null)
    setImportPreview([])
    setImportErrors([])
  }

  const quickFichada = (tipo: TipoFichada, metodo: MetodoFichada = "biometrico") => {
    if (!selectedEmployee) return
    const employee = employees.find((emp) => emp.id === selectedEmployee)
    if (!employee) return

    const result = addFichada({
      empleadoId: employee.id,
      empleadoNombre: `${employee.nombre} ${employee.apellido}`,
      tipo,
      fecha: todayLocalISODate(),
      hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      ubicacion: "Entrada Principal",
      metodo,
    })
    if (!result.success) {
      showError(result.error ?? "No se pudo registrar la fichada")
    }
    setSelectedEmployee("")
  }

  // Aprobar una fichada pendiente (doble fichada): valida alternancia cronológica antes de cambiar a "ok"
  const handleAprobarFichadaPendiente = (id: string) => {
    const result = actualizarEstadoFichada(id, "ok")
    if (!result.success) {
      showError(result.error ?? "No se pudo aprobar la fichada")
    } else {
      showSuccess("Fichada aprobada correctamente.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Fichadas del Día</h1>
          <p className="text-muted-foreground">
            Registro de ingresos, egresos y gestión de novedades
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isNovedadDialogOpen} onOpenChange={setIsNovedadDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <FileText className="mr-2 h-4 w-4" />
                Nueva Novedad
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Registrar Novedad</DialogTitle>
                <DialogDescription>
                  Ingresa los datos de la novedad para actualizar el estado del empleado.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitNovedad} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select value={novedadEmpleado} onValueChange={setNovedadEmpleado}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter((e) => e.estado !== "inactivo")
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.legajo} - {emp.nombre} {emp.apellido}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tipo de Novedad</Label>
                  <Select
                    value={novedadTipo}
                    onValueChange={(v) => setNovedadTipo(v as TipoNovedad)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="justificativo">Justificativo</SelectItem>
                      <SelectItem value="licencia">Licencia</SelectItem>
                      <SelectItem value="vacaciones">Vacaciones</SelectItem>
                      <SelectItem value="enfermedad">Enfermedad</SelectItem>
                      <SelectItem value="suspension">Suspensión</SelectItem>
                      <SelectItem value="ausencia">Ausencia</SelectItem>
                      <SelectItem value="cambioTurno">Cambio de Turno</SelectItem>
                      <SelectItem value="horaExtra">Hora Extra</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha Inicio</Label>
                    <Input
                      type="date"
                      value={novedadFecha}
                      onChange={(e) => setNovedadFecha(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Fecha Fin (opcional)</Label>
                    <Input
                      type="date"
                      value={novedadFechaFin}
                      onChange={(e) => setNovedadFechaFin(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Descripción / Motivo</Label>
                  <Textarea
                    value={novedadDescripcion}
                    onChange={(e) => setNovedadDescripcion(e.target.value)}
                    placeholder="Detalle de la novedad..."
                    rows={3}
                    required
                  />
                </div>

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsNovedadDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!novedadEmpleado}>
                    Registrar Novedad
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nueva Fichada
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Registrar Nueva Fichada</DialogTitle>
                <DialogDescription>
                  Completa los datos de la fichada para registrar entrada, salida o break.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmitFichada} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Empleado</Label>
                  <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar empleado" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees
                        .filter((e) => e.estado === "activo")
                        .map((emp) => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.legajo} - {emp.nombre} {emp.apellido}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tipo de Fichada</Label>
                    <Select
                      value={tipoFichada}
                      onValueChange={(v) => setTipoFichada(v as TipoFichada)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="entrada">Entrada</SelectItem>
                        <SelectItem value="salida">Salida</SelectItem>
                        <SelectItem value="inicioBreak">Inicio Break</SelectItem>
                        <SelectItem value="finBreak">Fin Break</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Método de Registro</Label>
                    <Select
                      value={metodoFichada}
                      onValueChange={(v) => setMetodoFichada(v as MetodoFichada)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="biometrico">Biométrico</SelectItem>
                        <SelectItem value="tarjeta">Tarjeta</SelectItem>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="api">API</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fecha</Label>
                    <Input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Hora</Label>
                    <Input
                      type="time"
                      value={hora}
                      onChange={(e) => setHora(e.target.value)}
                      placeholder="HH:MM"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Ubicación</Label>
                    <Input
                      value={ubicacion}
                      onChange={(e) => setUbicacion(e.target.value)}
                      placeholder="Ej: Entrada Principal"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Dispositivo</Label>
                    <Input
                      value={dispositivo}
                      onChange={(e) => setDispositivo(e.target.value)}
                      placeholder="Ej: Terminal 01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Observaciones</Label>
                  <Textarea
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    placeholder="Opcional"
                    rows={2}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={!selectedEmployee}>
                    Guardar Fichada
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Mensajes de feedback para el admin */}
      {errorMessage && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800 font-medium">{errorMessage}</AlertDescription>
        </Alert>
      )}
      {successMessage && (
        <Alert className="border-green-200 bg-green-50">
          <Check className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 font-medium">{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Fichada Rápida</CardTitle>
          <CardDescription>
            Selecciona un empleado y registra su fichada con un clic
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex-1 min-w-[250px]">
              <Label>Empleado</Label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar empleado" />
                </SelectTrigger>
                <SelectContent>
                  {employees
                    .filter((e) => e.estado === "activo")
                    .map((emp) => {
                      const turno = emp.turnoId ? getTurnoById(emp.turnoId) : null
                      return (
                        <SelectItem key={emp.id} value={emp.id}>
                          {emp.legajo} - {emp.nombre} {emp.apellido}
                          {turno && (
                            <span className="text-muted-foreground ml-2">
                              ({turno.nombre})
                            </span>
                          )}
                        </SelectItem>
                      )
                    })}
                </SelectContent>
              </Select>
            </div>
            <Button
              variant="outline"
              className="border-green-300 text-green-700 hover:bg-green-50"
              onClick={() => quickFichada("entrada")}
              disabled={!selectedEmployee}
            >
              <LogIn className="mr-2 h-4 w-4" />
              Entrada
            </Button>
            <Button
              variant="outline"
              className="border-red-300 text-red-700 hover:bg-red-50"
              onClick={() => quickFichada("salida")}
              disabled={!selectedEmployee}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Salida
            </Button>
            <Button
              variant="outline"
              className="border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => quickFichada("inicioBreak")}
              disabled={!selectedEmployee}
            >
              <Coffee className="mr-2 h-4 w-4" />
              Break
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stats - Motor de Interpretación */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <LogIn className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Entradas Hoy</p>
                <p className="text-2xl font-bold">
                  {fichadasHoy.filter((f) => f.tipo === "entrada").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-red-100 p-3">
                <LogOut className="h-5 w-5 text-red-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salidas Hoy</p>
                <p className="text-2xl font-bold">
                  {fichadasHoy.filter((f) => f.tipo === "salida").length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-amber-100 p-3">
                <AlertTriangle className="h-5 w-5 text-amber-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tardanzas</p>
                <p className="text-2xl font-bold text-amber-700">{tardanzasHoy}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-green-100 p-3">
                <TrendingUp className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Horas Extra</p>
                <p className="text-2xl font-bold text-green-700">
                  {Math.floor(horasExtraHoy / 60)}h {horasExtraHoy % 60}m
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-blue-100 p-3">
                <FileText className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Novedades Pend.</p>
                <p className="text-2xl font-bold text-blue-700">
                  {novedadesPendientes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="fichadas">Registro de Fichadas</TabsTrigger>
          <TabsTrigger value="novedades">
            Gestión de Novedades
            {(novedadesPendientes.length + fichadasPendientes.length) > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
                {novedadesPendientes.length + fichadasPendientes.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="fichadas" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Registro de Fichadas</CardTitle>
                  <CardDescription>
                    Interpretación automática de tardanzas y horas extra según turno asignado
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-auto"
                  />
                  <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                    <div className="flex items-center gap-2">
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Upload className="mr-2 h-4 w-4" />
                        Importar Fichadas
                      </Button>
                    </DialogTrigger>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Formato esperado: Empleado ID, Tipo, Fecha (dd/mm/aaaa), Hora, Método (opcional), Ubicación (opcional), Observaciones (opcional).
                      </TooltipContent>
                    </Tooltip>
                  </div>
                    <DialogContent className="sm:max-w-[800px]">
                      <DialogHeader>
                        <DialogTitle>Importar Fichadas desde Excel</DialogTitle>
                        <DialogDescription>
                          Sube un archivo Excel con las fichadas a importar. El archivo debe tener las columnas: Empleado ID, Tipo, Fecha, Hora, Método (opcional), Ubicación (opcional), Observaciones (opcional).
                          <br />
                          <a href="/plantilla_fichadas.xlsx" download className="text-blue-600 underline">
                            Descargar plantilla de ejemplo
                          </a>
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Archivo Excel</Label>
                          <Input
                            type="file"
                            accept=".xlsx,.xls"
                            onChange={handleImportFileChange}
                          />
                        </div>
                        {importPreview.length > 0 && (
                          <div className="space-y-2">
                            <Label>Preview de Importación</Label>
                            <div className="max-h-60 overflow-y-auto border rounded p-2">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Empleado</TableHead>
                                    <TableHead>Tipo</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Hora</TableHead>
                                    <TableHead>Estado</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {importPreview.slice(0, 10).map((p, index) => (
                                    <TableRow key={index}>
                                      <TableCell>{p.empleadoNombre}</TableCell>
                                      <TableCell>{p.tipo}</TableCell>
                                      <TableCell>{p.fecha}</TableCell>
                                      <TableCell>{p.hora}</TableCell>
                                      <TableCell>
                                        {p.valid ? (
                                          <Badge variant="outline" className="border-green-300 text-green-700">
                                            <Check className="mr-1 h-3 w-3" />
                                            OK
                                          </Badge>
                                        ) : (
                                          <Badge variant="outline" className="border-red-300 text-red-700">
                                            <X className="mr-1 h-3 w-3" />
                                            Error
                                          </Badge>
                                        )}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              {importPreview.length > 10 && (
                                <p className="text-sm text-muted-foreground mt-2">
                                  Mostrando 10 de {importPreview.length} filas...
                                </p>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Válidas: {importPreview.filter(p => p.valid).length} | Errores: {importPreview.filter(p => !p.valid).length}
                            </div>
                          </div>
                        )}
                        {importErrors.length > 0 && (
                          <div className="space-y-2">
                            <Label className="text-red-600">Errores</Label>
                            <ul className="text-sm text-red-600">
                              {importErrors.map((error, index) => (
                                <li key={index}>• {error}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            setIsImportDialogOpen(false)
                            setImportFile(null)
                            setImportPreview([])
                            setImportErrors([])
                          }}
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={handleImportFichadas}
                          disabled={importPreview.filter(p => p.valid).length === 0}
                        >
                          Importar {importPreview.filter(p => p.valid).length} Fichadas
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Hora</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Método</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Ubicación</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFichadas.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No hay fichadas registradas para esta fecha
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredFichadas.map((fichada) => {
                        const TipoIcon = tipoFichadaIcons[fichada.tipo] || Clock
                        const MetodoIcon = metodoFichadaIcons[fichada.metodo] || Keyboard
                        return (
                          <TableRow key={fichada.id}>
                            <TableCell className="font-mono font-medium">
                              {fichada.hora || "-"}
                            </TableCell>
                            <TableCell>{fichada.empleadoNombre || "Sin nombre"}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className={tipoFichadaColors[fichada.tipo] || "bg-gray-100 text-gray-800"}
                              >
                                <TipoIcon className="mr-1 h-3 w-3" />
                                {tipoFichadaLabels[fichada.tipo] || fichada.tipo}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <MetodoIcon className="h-4 w-4" />
                                <span className="text-sm">
                                  {metodoFichadaLabels[fichada.metodo] || fichada.metodo}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {fichada.esTardanza ? (
                                <Badge variant="outline" className="border-amber-300 text-amber-700">
                                  <AlertTriangle className="mr-1 h-3 w-3" />
                                  Tardanza
                                </Badge>
                              ) : fichada.minutosExtra && fichada.minutosExtra > 0 ? (
                                <Badge variant="outline" className="border-green-300 text-green-700">
                                  <TrendingUp className="mr-1 h-3 w-3" />+
                                  {Math.floor(fichada.minutosExtra / 60)}h{" "}
                                  {fichada.minutosExtra % 60}m
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="border-green-300 text-green-700">
                                  <Check className="mr-1 h-3 w-3" />
                                  OK
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {fichada.ubicacion || "-"}
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteFichada(fichada.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
        </TabsContent>

        <TabsContent value="novedades" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Gestión de Novedades</CardTitle>
                  <CardDescription>
                    Licencias, justificativos, suspensiones y otras novedades
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Empleado</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Auditoría</TableHead>
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {novedades.length === 0 && fichadasPendientes.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No hay novedades registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {/* Dobles fichadas pendientes de resolución */}
                        {fichadasPendientes.map((fichada) => (
                          <TableRow
                            key={fichada.id}
                            className="bg-amber-50/60 dark:bg-amber-950/20 border-l-4 border-l-amber-400"
                          >
                            <TableCell className="font-mono">
                              {parseLocalDate(fichada.fecha).toLocaleDateString("es-AR")}
                            </TableCell>
                            <TableCell className="font-medium">{fichada.empleadoNombre}</TableCell>
                            <TableCell>
                              <Badge
                                variant="secondary"
                                className="bg-orange-100 text-orange-800"
                              >
                                <AlertTriangle className="mr-1 h-3 w-3" />
                                Doble Fichada &middot; {tipoFichadaLabels[fichada.tipo]}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate text-muted-foreground text-sm">
                              {tipoFichadaLabels[fichada.tipo]} a las {fichada.hora} &mdash; marcada como posible duplicado
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-amber-300 text-amber-700"
                              >
                                Pendiente
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleAprobarFichadaPendiente(fichada.id)}
                                  title="Aprobar fichada"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                  onClick={() => deleteFichada(fichada.id)}
                                  title="Rechazar y eliminar fichada duplicada"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}

                        {/* Novedades regulares */}
                        {novedades.slice(0, 20).map((novedad) => (
                        <TableRow key={novedad.id}>
                          <TableCell className="font-mono">
                            {parseLocalDate(novedad.fecha).toLocaleDateString("es-AR")}
                            {novedad.fechaFin && (
                              <span className="text-muted-foreground">
                                {" "}
                                - {parseLocalDate(novedad.fechaFin).toLocaleDateString("es-AR")}
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            {novedad.empleadoNombre}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={tipoNovedadColors[novedad.tipo]}
                            >
                              {tipoNovedadLabels[novedad.tipo]}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-[300px] truncate">
                            {novedad.descripcion}
                          </TableCell>
                          <TableCell>
                            {novedad.estado === 'aprobada' ? (
                              <Badge
                                variant="outline"
                                className="border-green-300 text-green-700"
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Aprobado
                              </Badge>
                            ) : novedad.estado === 'rechazada' ? (
                              <Badge
                                variant="outline"
                                className="border-red-300 text-red-700"
                              >
                                Rechazado
                              </Badge>
                            ) : (
                              <Badge
                                variant="outline"
                                className="border-amber-300 text-amber-700"
                              >
                                Pendiente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {novedad.estado !== 'pendiente' && novedad.modificadoPor && novedad.fechaModificacion ? (
                              <>
                                <div>{novedad.modificadoPor}</div>
                                <div>
                                  {new Date(novedad.fechaModificacion).toLocaleDateString("es-AR")} {new Date(novedad.fechaModificacion).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
                                </div>
                              </>
                            ) : (
                              <span className="text-muted-foreground/50">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              {novedad.estado === 'pendiente' && (
                                <>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => gestionarEstadoNovedad(novedad.id, "aprobada", "Admin")}
                                  >
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => gestionarEstadoNovedad(novedad.id, "rechazada", "Admin")}
                                  >
                                    <span>✕</span>
                                  </Button>
                                </>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                onClick={() => deleteNovedad(novedad.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
