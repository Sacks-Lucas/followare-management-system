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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useLMSData,
  type TipoFichada,
  type MetodoFichada,
  type TipoNovedad,
} from "@/lib/lms-data-context"
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
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"

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

export function FichadasView() {
  const {
    employees,
    fichadas,
    addFichada,
    deleteFichada,
    getFichadasHoy,
    novedades,
    addNovedad,
    aprobarNovedad,
    deleteNovedad,
    getNovedadesPendientes,
    turnos,
    getTurnoById,
    isLoaded,
  } = useLMSData()

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isNovedadDialogOpen, setIsNovedadDialogOpen] = useState(false)
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split("T")[0])
  const [activeTab, setActiveTab] = useState("fichadas")

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
  const [novedadFecha, setNovedadFecha] = useState(new Date().toISOString().split("T")[0])
  const [novedadFechaFin, setNovedadFechaFin] = useState("")
  const [novedadDescripcion, setNovedadDescripcion] = useState("")

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  const fichadasHoy = getFichadasHoy()
  const novedadesPendientes = getNovedadesPendientes()
  const filteredFichadas = fichadas
    .filter((f) => f.fecha === filterDate)
    .sort((a, b) => b.hora.localeCompare(a.hora))

  // Calcular estadísticas de interpretación
  const tardanzasHoy = fichadasHoy.filter((f) => f.esTardanza).length
  const horasExtraHoy = fichadasHoy
    .filter((f) => f.minutosExtra && f.minutosExtra > 0)
    .reduce((sum, f) => sum + (f.minutosExtra || 0), 0)

  const handleSubmitFichada = (e: React.FormEvent) => {
    e.preventDefault()
    const employee = employees.find((emp) => emp.id === selectedEmployee)
    if (!employee) return

    addFichada({
      empleadoId: employee.id,
      empleadoNombre: `${employee.nombre} ${employee.apellido}`,
      tipo: tipoFichada,
      fecha: filterDate,
      hora: hora || new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      ubicacion: ubicacion || "Entrada Principal",
      observaciones,
      metodo: metodoFichada,
      dispositivo: dispositivo || undefined,
    })

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
      aprobado: false,
    })

    // Reset form
    setNovedadEmpleado("")
    setNovedadTipo("justificativo")
    setNovedadFecha(new Date().toISOString().split("T")[0])
    setNovedadFechaFin("")
    setNovedadDescripcion("")
    setIsNovedadDialogOpen(false)
  }

  const quickFichada = (tipo: TipoFichada, metodo: MetodoFichada = "biometrico") => {
    if (!selectedEmployee) return
    const employee = employees.find((emp) => emp.id === selectedEmployee)
    if (!employee) return

    addFichada({
      empleadoId: employee.id,
      empleadoNombre: `${employee.nombre} ${employee.apellido}`,
      tipo,
      fecha: new Date().toISOString().split("T")[0],
      hora: new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" }),
      ubicacion: "Entrada Principal",
      metodo,
    })
    setSelectedEmployee("")
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
            {novedadesPendientes.length > 0 && (
              <Badge variant="secondary" className="ml-2 bg-amber-100 text-amber-800">
                {novedadesPendientes.length}
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
                <Input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="w-auto"
                />
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
                      <TableHead className="w-[100px]">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {novedades.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No hay novedades registradas
                        </TableCell>
                      </TableRow>
                    ) : (
                      novedades.slice(0, 20).map((novedad) => (
                        <TableRow key={novedad.id}>
                          <TableCell className="font-mono">
                            {new Date(novedad.fecha).toLocaleDateString("es-AR")}
                            {novedad.fechaFin && (
                              <span className="text-muted-foreground">
                                {" "}
                                - {new Date(novedad.fechaFin).toLocaleDateString("es-AR")}
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
                            {novedad.aprobado ? (
                              <Badge
                                variant="outline"
                                className="border-green-300 text-green-700"
                              >
                                <Check className="mr-1 h-3 w-3" />
                                Aprobado
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
                          <TableCell>
                            <div className="flex gap-1">
                              {!novedad.aprobado && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => aprobarNovedad(novedad.id, "Admin")}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
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
                      ))
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
