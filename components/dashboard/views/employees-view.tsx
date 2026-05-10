"use client"

import { useState, useMemo, useRef } from "react"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useLMSData, type Employee, type TipoNovedad, type TipoJornada, type ModalidadFichada, type MetodoFichada, type TipoFichada } from "@/lib/lms-data-context"
import {
  Users,
  UserPlus,
  Search,
  Edit,
  X,
  Calendar,
  Clock,
  AlertTriangle,
  TrendingUp,
  FileText,
  UserMinus,
  Building,
  Briefcase,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { MoreHorizontal } from "lucide-react"
import * as XLSX from "xlsx"

const departamentos = [
  "Producción",
  "Administración",
  "Logística",
  "RRHH",
  "Ventas",
  "IT",
  "Mantenimiento",
]

const categoriasLaborales = [
  "Operario",
  "Operario Calificado",
  "Administrativo",
  "Profesional",
  "Supervisor",
  "Jefatura",
  "Gerencia",
]

const convenios = [
  "UOCRA",
  "Empleados de Comercio",
  "Bancarios",
  "Metalúrgicos (UOM)",
  "Gastronómicos",
  "Camioneros",
  "Ninguno",
]

const estadoColors: Record<Employee["estado"], string> = {
  activo: "bg-green-100 text-green-800",
  inactivo: "bg-gray-100 text-gray-800",
  licencia: "bg-amber-100 text-amber-800",
  suspendido: "bg-red-100 text-red-800",
}

const estadoLabels: Record<Employee["estado"], string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  licencia: "Licencia",
  suspendido: "Suspendido",
}

const novedadColors: Record<TipoNovedad, string> = {
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

const novedadLabels: Record<TipoNovedad, string> = {
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

const modalidadFichadaLabels: Record<ModalidadFichada, string> = {
  biometrico: "Biométrico",
  manual: "Manual",
  tarjeta: "Tarjeta",
  api: "API",
  todas: "Todas las modalidades",
}

const diasSemanaLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

interface ImportPreview {
  fecha: string
  hora: string
  metodo: MetodoFichada
  tipo: TipoFichada
  legajo: string
  empleadoNombre: string
  observaciones?: string
  empleadoId?: string
  error?: string
}

export function EmployeesView() {
  const {
    employees,
    addEmployee,
    updateEmployee,
    darDeBajaEmployee,
    turnos,
    addTurno,
    assignTurno,
    assignTurnoRotativo,
    getEmployeeStats,
    getNovedadesByEmployeeAndPeriod,
    getFichadasByEmployeeAndPeriod,
    getTurnoById,
    addFichadasMasivas,
    isLoaded,
  } = useLMSData()

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isTurnoDialogOpen, setIsTurnoDialogOpen] = useState(false)
  const [isBajaDialogOpen, setIsBajaDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [filterDepartamento, setFilterDepartamento] = useState<string>("all")
  const [filterEstado, setFilterEstado] = useState<string>("all")
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null)
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null)
  const [assigningTurnoEmployee, setAssigningTurnoEmployee] = useState<Employee | null>(null)

  // Import state
  const [importPreview, setImportPreview] = useState<ImportPreview[]>([])
  const [importFileName, setImportFileName] = useState("")
  const [isImporting, setIsImporting] = useState(false)

  // Period for stats
  const [periodoInicio, setPeriodoInicio] = useState(() => {
    const date = new Date()
    date.setDate(1)
    return date.toISOString().split("T")[0]
  })
  const [periodoFin, setPeriodoFin] = useState(() => {
    return new Date().toISOString().split("T")[0]
  })

  // Form state - Extended
  const [formData, setFormData] = useState({
    legajo: "",
    nombre: "",
    apellido: "",
    dni: "",
    cuil: "",
    departamento: "",
    cargo: "",
    categoriaLaboral: "",
    convenio: "",
    tipoJornada: "completa" as TipoJornada,
    fechaIngreso: new Date().toISOString().split("T")[0],
    estado: "activo" as Employee["estado"],
    email: "",
    telefono: "",
    turnoId: "",
    diasDescanso: [0, 6] as number[],
    modalidadFichada: "biometrico" as ModalidadFichada,
  })

  // Turno form state
  const [turnoFormData, setTurnoFormData] = useState({
    nombre: "",
    horaEntrada: "08:00",
    horaSalida: "16:00",
    toleranciaMinutos: 15,
    tipo: "fijo" as "fijo" | "rotativo",
    diasSemana: [1, 2, 3, 4, 5],
  })

  const [selectedTurnoId, setSelectedTurnoId] = useState("")
  const [selectedRotativoTurnos, setSelectedRotativoTurnos] = useState<string[]>([])
  const [turnoTipo, setTurnoTipo] = useState<"fijo" | "rotativo">("fijo")
  const [fechaBaja, setFechaBaja] = useState(new Date().toISOString().split("T")[0])

  // Selected employee stats
  const selectedStats = useMemo(() => {
    if (!selectedEmployee) return null
    return getEmployeeStats(selectedEmployee.id, periodoInicio, periodoFin)
  }, [selectedEmployee, periodoInicio, periodoFin, getEmployeeStats])

  const selectedNovedades = useMemo(() => {
    if (!selectedEmployee) return []
    return getNovedadesByEmployeeAndPeriod(selectedEmployee.id, periodoInicio, periodoFin)
  }, [selectedEmployee, periodoInicio, periodoFin, getNovedadesByEmployeeAndPeriod])

  const selectedFichadas = useMemo(() => {
    if (!selectedEmployee) return []
    return getFichadasByEmployeeAndPeriod(selectedEmployee.id, periodoInicio, periodoFin)
      .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.hora.localeCompare(a.hora))
      .slice(0, 20)
  }, [selectedEmployee, periodoInicio, periodoFin, getFichadasByEmployeeAndPeriod])

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  const filteredEmployees = employees.filter((emp) => {
    if (!emp || !emp.nombre || !emp.apellido) return false
    
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch =
      (emp.nombre?.toLowerCase() || "").includes(searchLower) ||
      (emp.apellido?.toLowerCase() || "").includes(searchLower) ||
      (emp.legajo?.toLowerCase() || "").includes(searchLower) ||
      (emp.dni || "").includes(searchTerm)
    const matchesDepartamento =
      filterDepartamento === "all" || emp.departamento === filterDepartamento
    const matchesEstado = filterEstado === "all" || emp.estado === filterEstado
    return matchesSearch && matchesDepartamento && matchesEstado
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, formData)
    } else {
      addEmployee(formData)
    }

    resetForm()
    setIsDialogOpen(false)
  }

  const resetForm = () => {
    setFormData({
      legajo: "",
      nombre: "",
      apellido: "",
      dni: "",
      cuil: "",
      departamento: "",
      cargo: "",
      categoriaLaboral: "",
      convenio: "",
      tipoJornada: "completa",
      fechaIngreso: new Date().toISOString().split("T")[0],
      estado: "activo",
      email: "",
      telefono: "",
      turnoId: "",
      diasDescanso: [0, 6],
      modalidadFichada: "biometrico",
    })
    setEditingEmployee(null)
  }

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee)
    setFormData({
      legajo: employee.legajo,
      nombre: employee.nombre,
      apellido: employee.apellido,
      dni: employee.dni,
      cuil: employee.cuil || "",
      departamento: employee.departamento,
      cargo: employee.cargo,
      categoriaLaboral: employee.categoriaLaboral || "",
      convenio: employee.convenio || "",
      tipoJornada: employee.tipoJornada || "completa",
      fechaIngreso: employee.fechaIngreso,
      estado: employee.estado,
      email: employee.email,
      telefono: employee.telefono,
      turnoId: employee.turnoId || "",
      diasDescanso: employee.diasDescanso || [0, 6],
      modalidadFichada: employee.modalidadFichada || "biometrico",
    })
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleAssignTurno = () => {
    if (!assigningTurnoEmployee) return
    if (turnoTipo === "fijo" && selectedTurnoId) {
      assignTurno(assigningTurnoEmployee.id, selectedTurnoId)
    } else if (turnoTipo === "rotativo" && selectedRotativoTurnos.length > 0) {
      assignTurnoRotativo(assigningTurnoEmployee.id, selectedRotativoTurnos)
    }
    setAssigningTurnoEmployee(null)
    setSelectedTurnoId("")
    setSelectedRotativoTurnos([])
    setTurnoTipo("fijo")
  }

  const handleBaja = () => {
    if (!editingEmployee) return
    darDeBajaEmployee(editingEmployee.id, fechaBaja)
    setIsBajaDialogOpen(false)
    setEditingEmployee(null)
  }

  const handleAddTurno = (e: React.FormEvent) => {
    e.preventDefault()
    addTurno(turnoFormData)
    setTurnoFormData({
      nombre: "",
      horaEntrada: "08:00",
      horaSalida: "16:00",
      toleranciaMinutos: 15,
      tipo: "fijo",
      diasSemana: [1, 2, 3, 4, 5],
    })
    setIsTurnoDialogOpen(false)
  }

  const generateLegajo = () => {
    const lastNumber = employees.reduce((max, emp) => {
      if (!emp?.legajo) return max
      const num = parseInt(emp.legajo.replace(/\D/g, "")) || 0
      return num > max ? num : max
    }, 0)
    return `EMP${String(lastNumber + 1).padStart(3, "0")}`
  }

  // Excel Import Functions
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImportFileName(file.name)
    const reader = new FileReader()

    reader.onload = (event) => {
      try {
        const data = event.target?.result
        const workbook = XLSX.read(data, { type: "binary" })
        const sheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as string[][]

        // Skip header row and process data
        const preview: ImportPreview[] = []
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length < 6) continue

          const fecha = parseExcelDate(row[0])
          const hora = parseExcelTime(row[1])
          const formaRegistro = String(row[2] || "").toLowerCase()
          const tipoRegistro = String(row[3] || "").toLowerCase()
          const legajo = String(row[4] || "").trim()
          const nombreCompleto = String(row[5] || "").trim()
          const observaciones = row[6] ? String(row[6]) : undefined

          // Map forma de registro to MetodoFichada
          let metodo: MetodoFichada = "manual"
          if (formaRegistro.includes("local") || formaRegistro.includes("biom")) {
            metodo = "biometrico"
          } else if (formaRegistro.includes("tarjeta")) {
            metodo = "tarjeta"
          } else if (formaRegistro.includes("api")) {
            metodo = "api"
          }

          // Map tipo de registro to TipoFichada
          let tipo: TipoFichada = "entrada"
          if (tipoRegistro.includes("salida") || tipoRegistro.includes("egreso")) {
            tipo = "salida"
          }

          // Find employee by legajo
          const emp = employees.find((e) => e.legajo.toLowerCase() === legajo.toLowerCase())

          preview.push({
            fecha,
            hora,
            metodo,
            tipo,
            legajo,
            empleadoNombre: nombreCompleto,
            observaciones,
            empleadoId: emp?.id,
            error: !emp ? `Empleado con legajo ${legajo} no encontrado` : undefined,
          })
        }

        setImportPreview(preview)
        setIsImportDialogOpen(true)
      } catch (error) {
        console.error("[v0] Error parsing Excel file:", error)
        alert("Error al leer el archivo Excel. Verifica el formato.")
      }
    }

    reader.readAsBinaryString(file)
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const parseExcelDate = (value: unknown): string => {
    if (!value) return new Date().toISOString().split("T")[0]
    
    // If it's a number (Excel serial date)
    if (typeof value === "number") {
      const date = new Date((value - 25569) * 86400 * 1000)
      return date.toISOString().split("T")[0]
    }
    
    // If it's a string in format DD/MM/YYYY or similar
    const strValue = String(value)
    const parts = strValue.split(/[\/\-]/)
    if (parts.length === 3) {
      const day = parts[0].padStart(2, "0")
      const month = parts[1].padStart(2, "0")
      const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2]
      return `${year}-${month}-${day}`
    }
    
    return new Date().toISOString().split("T")[0]
  }

  const parseExcelTime = (value: unknown): string => {
    if (!value) return "08:00"
    
    // If it's a decimal (Excel time)
    if (typeof value === "number") {
      const totalMinutes = Math.round(value * 24 * 60)
      const hours = Math.floor(totalMinutes / 60)
      const minutes = totalMinutes % 60
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`
    }
    
    // If it's a string
    const strValue = String(value)
    if (strValue.includes(":")) {
      const parts = strValue.split(":")
      return `${parts[0].padStart(2, "0")}:${parts[1].padStart(2, "0")}`
    }
    
    return "08:00"
  }

  const handleConfirmImport = () => {
    setIsImporting(true)
    
    const validFichadas = importPreview
      .filter((p) => p.empleadoId && !p.error)
      .map((p) => ({
        empleadoId: p.empleadoId!,
        empleadoNombre: p.empleadoNombre,
        tipo: p.tipo,
        fecha: p.fecha,
        hora: p.hora,
        metodo: p.metodo,
        observaciones: p.observaciones,
      }))

    if (validFichadas.length > 0) {
      addFichadasMasivas(validFichadas)
    }

    setIsImporting(false)
    setIsImportDialogOpen(false)
    setImportPreview([])
    setImportFileName("")
  }

  const downloadExcelTemplate = () => {
    const templateData = [
      ["Fecha", "Hora", "Forma de Registro", "Tipo de Registro", "Legajo", "Empleado", "Observaciones"],
      ["15/01/2024", "08:00", "Local", "Entrada", "EMP001", "Juan Pérez", ""],
      ["15/01/2024", "17:00", "Local", "Salida", "EMP001", "Juan Pérez", ""],
      ["15/01/2024", "08:15", "Manual", "Entrada", "EMP002", "María González", "Llegada tardía justificada"],
    ]
    
    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Fichadas")
    XLSX.writeFile(wb, "plantilla_fichadas.xlsx")
  }

  const validImportCount = importPreview.filter((p) => p.empleadoId && !p.error).length
  const errorImportCount = importPreview.filter((p) => p.error).length

  return (
    <div className="flex gap-6">
      {/* Main content */}
      <div className={`space-y-6 ${selectedEmployee ? "flex-1" : "w-full"}`}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Empleados</h1>
            <p className="text-muted-foreground">Gestión del personal de la empresa</p>
          </div>
          <div className="flex gap-2">
            {/* Import Excel Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".xlsx,.xls"
              className="hidden"
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Excel
            </Button>

            <Dialog open={isTurnoDialogOpen} onOpenChange={setIsTurnoDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Clock className="mr-2 h-4 w-4" />
                  Gestionar Turnos
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Gestión de Turnos</DialogTitle>
                </DialogHeader>
                <Tabs defaultValue="list">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="list">Turnos Existentes</TabsTrigger>
                    <TabsTrigger value="new">Nuevo Turno</TabsTrigger>
                  </TabsList>
                  <TabsContent value="list" className="space-y-4 pt-4">
                    {turnos.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No hay turnos definidos
                      </p>
                    ) : (
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {turnos.map((turno) => (
                          <div
                            key={turno.id}
                            className="flex items-center justify-between p-3 border rounded-lg"
                          >
                            <div>
                              <p className="font-medium">{turno.nombre}</p>
                              <p className="text-sm text-muted-foreground">
                                {turno.horaEntrada} - {turno.horaSalida} | Tolerancia:{" "}
                                {turno.toleranciaMinutos}min
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {turno.diasSemana.map((d) => diasSemanaLabels[d]).join(", ")}
                              </p>
                            </div>
                            <Badge variant={turno.tipo === "fijo" ? "secondary" : "outline"}>
                              {turno.tipo === "fijo" ? "Fijo" : "Rotativo"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                  <TabsContent value="new" className="pt-4">
                    <form onSubmit={handleAddTurno} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Nombre del Turno</Label>
                          <Input
                            value={turnoFormData.nombre}
                            onChange={(e) =>
                              setTurnoFormData((p) => ({ ...p, nombre: e.target.value }))
                            }
                            placeholder="Ej: Turno Mañana"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={turnoFormData.tipo}
                            onValueChange={(v) =>
                              setTurnoFormData((p) => ({ ...p, tipo: v as "fijo" | "rotativo" }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fijo">Fijo</SelectItem>
                              <SelectItem value="rotativo">Rotativo</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Hora Entrada</Label>
                          <Input
                            type="time"
                            value={turnoFormData.horaEntrada}
                            onChange={(e) =>
                              setTurnoFormData((p) => ({ ...p, horaEntrada: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Hora Salida</Label>
                          <Input
                            type="time"
                            value={turnoFormData.horaSalida}
                            onChange={(e) =>
                              setTurnoFormData((p) => ({ ...p, horaSalida: e.target.value }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tolerancia (min)</Label>
                          <Input
                            type="number"
                            value={turnoFormData.toleranciaMinutos}
                            onChange={(e) =>
                              setTurnoFormData((p) => ({
                                ...p,
                                toleranciaMinutos: parseInt(e.target.value),
                              }))
                            }
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Días de la Semana</Label>
                        <div className="flex gap-2">
                          {diasSemanaLabels.map((dia, index) => (
                            <Button
                              key={index}
                              type="button"
                              size="sm"
                              variant={
                                turnoFormData.diasSemana.includes(index) ? "default" : "outline"
                              }
                              onClick={() => {
                                const newDias = turnoFormData.diasSemana.includes(index)
                                  ? turnoFormData.diasSemana.filter((d) => d !== index)
                                  : [...turnoFormData.diasSemana, index]
                                setTurnoFormData((p) => ({ ...p, diasSemana: newDias }))
                              }}
                            >
                              {dia}
                            </Button>
                          ))}
                        </div>
                      </div>
                      <Button type="submit" className="w-full">
                        Crear Turno
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>

            <Dialog
              open={isDialogOpen}
              onOpenChange={(open) => {
                if (open) {
                  resetForm()
                  setFormData((prev) => ({ ...prev, legajo: generateLegajo() }))
                  setIsDialogOpen(true)
                } else {
                  handleCloseDialog()
                }
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nuevo Empleado
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingEmployee ? "Editar Empleado" : "Registrar Nuevo Empleado"}
                  </DialogTitle>
                  <DialogDescription>
                    Complete todos los datos del empleado. La baja lógica preserva el historial.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-4">
                  {/* Datos Personales */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Datos Personales
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="legajo">Legajo *</Label>
                        <Input
                          id="legajo"
                          value={formData.legajo}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, legajo: e.target.value }))
                          }
                          placeholder="EMP001"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dni">DNI *</Label>
                        <Input
                          id="dni"
                          value={formData.dni}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, dni: e.target.value }))
                          }
                          placeholder="12345678"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cuil">CUIL *</Label>
                        <Input
                          id="cuil"
                          value={formData.cuil}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, cuil: e.target.value }))
                          }
                          placeholder="20-12345678-9"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="nombre">Nombre *</Label>
                        <Input
                          id="nombre"
                          value={formData.nombre}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="apellido">Apellido *</Label>
                        <Input
                          id="apellido"
                          value={formData.apellido}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, apellido: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={formData.email}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, email: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input
                          id="telefono"
                          value={formData.telefono}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, telefono: e.target.value }))
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Datos Laborales */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Datos Laborales
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="fechaIngreso">Fecha de Ingreso *</Label>
                        <Input
                          id="fechaIngreso"
                          type="date"
                          value={formData.fechaIngreso}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, fechaIngreso: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Estado *</Label>
                        <Select
                          value={formData.estado}
                          onValueChange={(v) =>
                            setFormData((prev) => ({
                              ...prev,
                              estado: v as Employee["estado"],
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="activo">Activo</SelectItem>
                            <SelectItem value="inactivo">Inactivo</SelectItem>
                            <SelectItem value="licencia">Licencia</SelectItem>
                            <SelectItem value="suspendido">Suspendido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Departamento *</Label>
                        <Select
                          value={formData.departamento}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, departamento: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {departamentos.map((dep) => (
                              <SelectItem key={dep} value={dep}>
                                {dep}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cargo">Cargo *</Label>
                        <Input
                          id="cargo"
                          value={formData.cargo}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, cargo: e.target.value }))
                          }
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Categoría Laboral *</Label>
                        <Select
                          value={formData.categoriaLaboral}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, categoriaLaboral: v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {categoriasLaborales.map((cat) => (
                              <SelectItem key={cat} value={cat}>
                                {cat}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Convenio Aplicable</Label>
                        <Select
                          value={formData.convenio || "Ninguno"}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, convenio: v === "Ninguno" ? "" : v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar..." />
                          </SelectTrigger>
                          <SelectContent>
                            {convenios.map((conv) => (
                              <SelectItem key={conv} value={conv}>
                                {conv}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Jornada y Horarios */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Jornada y Horarios
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Tipo de Jornada *</Label>
                        <Select
                          value={formData.tipoJornada}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, tipoJornada: v as TipoJornada }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="completa">Jornada Completa</SelectItem>
                            <SelectItem value="parcial">Jornada Parcial</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Horario Asignado</Label>
                        <Select
                          value={formData.turnoId || "sin_turno"}
                          onValueChange={(v) =>
                            setFormData((prev) => ({ ...prev, turnoId: v === "sin_turno" ? "" : v }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar turno..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sin_turno">Sin turno asignado</SelectItem>
                            {turnos.map((turno) => (
                              <SelectItem key={turno.id} value={turno.id}>
                                {turno.nombre} ({turno.horaEntrada} - {turno.horaSalida})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Días de Descanso</Label>
                      <div className="flex gap-2">
                        {diasSemanaLabels.map((dia, index) => (
                          <Button
                            key={index}
                            type="button"
                            size="sm"
                            variant={formData.diasDescanso.includes(index) ? "default" : "outline"}
                            onClick={() => {
                              const newDias = formData.diasDescanso.includes(index)
                                ? formData.diasDescanso.filter((d) => d !== index)
                                : [...formData.diasDescanso, index]
                              setFormData((prev) => ({ ...prev, diasDescanso: newDias }))
                            }}
                          >
                            {dia}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Modalidad de Fichada Habilitada *</Label>
                      <Select
                        value={formData.modalidadFichada}
                        onValueChange={(v) =>
                          setFormData((prev) => ({ ...prev, modalidadFichada: v as ModalidadFichada }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="biometrico">Solo Biométrico</SelectItem>
                          <SelectItem value="tarjeta">Solo Tarjeta</SelectItem>
                          <SelectItem value="manual">Solo Manual</SelectItem>
                          <SelectItem value="api">Solo API</SelectItem>
                          <SelectItem value="todas">Todas las modalidades</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <DialogFooter className="gap-2 sm:gap-0">
                    {editingEmployee && (
                      <Button
                        type="button"
                        variant="destructive"
                        onClick={() => {
                          setIsBajaDialogOpen(true)
                        }}
                      >
                        <UserMinus className="mr-2 h-4 w-4" />
                        Dar de Baja
                      </Button>
                    )}
                    <Button type="button" variant="outline" onClick={handleCloseDialog}>
                      Cancelar
                    </Button>
                    <Button type="submit">
                      {editingEmployee ? "Guardar Cambios" : "Registrar Empleado"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre, legajo o DNI..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>
              <Select value={filterDepartamento} onValueChange={setFilterDepartamento}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {departamentos.map((dep) => (
                    <SelectItem key={dep} value={dep}>
                      {dep}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterEstado} onValueChange={setFilterEstado}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="licencia">Licencia</SelectItem>
                  <SelectItem value="suspendido">Suspendido</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Empleados
            </CardTitle>
            <CardDescription>
              {filteredEmployees.length} empleados encontrados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      No se encontraron empleados
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => (
                    <TableRow
                      key={emp.id}
                      className={`cursor-pointer hover:bg-muted/50 ${
                        selectedEmployee?.id === emp.id ? "bg-muted" : ""
                      }`}
                      onClick={() => setSelectedEmployee(emp)}
                    >
                      <TableCell className="font-mono font-medium">{emp.legajo}</TableCell>
                      <TableCell>
                        {emp.nombre} {emp.apellido}
                      </TableCell>
                      <TableCell>{emp.dni}</TableCell>
                      <TableCell>{emp.departamento}</TableCell>
                      <TableCell>{emp.cargo}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {emp.tipoJornada === "completa" ? "Completa" : "Parcial"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={estadoColors[emp.estado] || "bg-gray-100"}>
                          {estadoLabels[emp.estado] || emp.estado}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                handleEdit(emp)
                              }}
                            >
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation()
                                setAssigningTurnoEmployee(emp)
                              }}
                            >
                              <Clock className="mr-2 h-4 w-4" />
                              Asignar Turno
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingEmployee(emp)
                                setIsBajaDialogOpen(true)
                              }}
                            >
                              <UserMinus className="mr-2 h-4 w-4" />
                              Dar de Baja
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Employee Detail Panel */}
      {selectedEmployee && (
        <div className="w-[450px] space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {selectedEmployee.nombre} {selectedEmployee.apellido}
                  </CardTitle>
                  <CardDescription>
                    {selectedEmployee.legajo} | {selectedEmployee.cargo}
                  </CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setSelectedEmployee(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Employee Info */}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">DNI:</span> {selectedEmployee.dni}
                </div>
                <div>
                  <span className="text-muted-foreground">CUIL:</span> {selectedEmployee.cuil || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Departamento:</span>{" "}
                  {selectedEmployee.departamento}
                </div>
                <div>
                  <span className="text-muted-foreground">Categoría:</span>{" "}
                  {selectedEmployee.categoriaLaboral || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Convenio:</span>{" "}
                  {selectedEmployee.convenio || "Sin convenio"}
                </div>
                <div>
                  <span className="text-muted-foreground">Jornada:</span>{" "}
                  {selectedEmployee.tipoJornada === "completa" ? "Completa" : "Parcial"}
                </div>
                <div>
                  <span className="text-muted-foreground">Fichada:</span>{" "}
                  {modalidadFichadaLabels[selectedEmployee.modalidadFichada] || "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Ingreso:</span>{" "}
                  {selectedEmployee.fechaIngreso}
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Turno:</span>
                {selectedEmployee.turnoId ? (
                  <Badge variant="outline">
                    {getTurnoById(selectedEmployee.turnoId)?.nombre || "Sin asignar"}
                  </Badge>
                ) : (
                  <span>Sin asignar</span>
                )}
              </div>

              {/* Period Selector */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Desde</Label>
                  <Input
                    type="date"
                    value={periodoInicio}
                    onChange={(e) => setPeriodoInicio(e.target.value)}
                    className="h-8"
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Hasta</Label>
                  <Input
                    type="date"
                    value={periodoFin}
                    onChange={(e) => setPeriodoFin(e.target.value)}
                    className="h-8"
                  />
                </div>
              </div>

              {/* Stats */}
              {selectedStats && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Días Trabajados</span>
                    </div>
                    <p className="text-xl font-bold">{selectedStats.diasTrabajados}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <span className="text-xs text-muted-foreground">Horas Normales</span>
                    </div>
                    <p className="text-xl font-bold">{selectedStats.horasNormales}h</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-xs text-muted-foreground">Horas Extra</span>
                    </div>
                    <p className="text-xl font-bold text-green-600">{selectedStats.horasExtra}h</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-muted-foreground">Tardanzas</span>
                    </div>
                    <p className="text-xl font-bold text-amber-600">{selectedStats.tardanzas}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-600" />
                      <span className="text-xs text-muted-foreground">Ausencias</span>
                    </div>
                    <p className="text-xl font-bold text-red-600">{selectedStats.ausencias}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-muted-foreground">Licencias</span>
                    </div>
                    <p className="text-xl font-bold text-blue-600">{selectedStats.licencias}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Novedades del Empleado */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Novedades del Período</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedNovedades.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin novedades en este período
                </p>
              ) : (
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {selectedNovedades.map((nov) => (
                    <div key={nov.id} className="flex items-start gap-2 p-2 border rounded-lg">
                      <Badge className={novedadColors[nov.tipo] || "bg-gray-100"} variant="secondary">
                        {novedadLabels[nov.tipo] || nov.tipo}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">{nov.fecha}</p>
                        <p className="text-sm truncate">{nov.descripcion}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Últimas Fichadas */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Últimas Fichadas</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedFichadas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Sin fichadas en este período
                </p>
              ) : (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {selectedFichadas.map((fich) => (
                    <div
                      key={fich.id}
                      className="flex items-center justify-between py-1 text-sm border-b last:border-0"
                    >
                      <span className="text-muted-foreground">{fich.fecha}</span>
                      <span className="font-mono">{fich.hora}</span>
                      <Badge variant="outline" className="text-xs">
                        {fich.tipo === "entrada" ? "Entrada" : "Salida"}
                      </Badge>
                      {fich.esTardanza && (
                        <Badge variant="destructive" className="text-xs">
                          Tarde
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Assign Turno Dialog */}
      <Dialog open={!!assigningTurnoEmployee} onOpenChange={() => setAssigningTurnoEmployee(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Asignar Turno a {assigningTurnoEmployee?.nombre} {assigningTurnoEmployee?.apellido}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Tipo de Asignación</Label>
              <Select value={turnoTipo} onValueChange={(v) => setTurnoTipo(v as "fijo" | "rotativo")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fijo">Turno Fijo</SelectItem>
                  <SelectItem value="rotativo">Turno Rotativo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {turnoTipo === "fijo" ? (
              <div className="space-y-2">
                <Label>Seleccionar Turno</Label>
                <Select value={selectedTurnoId} onValueChange={setSelectedTurnoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar turno..." />
                  </SelectTrigger>
                  <SelectContent>
                    {turnos.map((turno) => (
                      <SelectItem key={turno.id} value={turno.id}>
                        {turno.nombre} ({turno.horaEntrada} - {turno.horaSalida})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Seleccionar Turnos para Rotación</Label>
                <div className="space-y-2">
                  {turnos.map((turno) => (
                    <div key={turno.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`rot-${turno.id}`}
                        checked={selectedRotativoTurnos.includes(turno.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedRotativoTurnos((prev) => [...prev, turno.id])
                          } else {
                            setSelectedRotativoTurnos((prev) => prev.filter((id) => id !== turno.id))
                          }
                        }}
                        className="h-4 w-4"
                      />
                      <label htmlFor={`rot-${turno.id}`} className="text-sm">
                        {turno.nombre} ({turno.horaEntrada} - {turno.horaSalida})
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setAssigningTurnoEmployee(null)}>
                Cancelar
              </Button>
              <Button onClick={handleAssignTurno}>Asignar Turno</Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Baja Dialog */}
      <Dialog open={isBajaDialogOpen} onOpenChange={setIsBajaDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dar de Baja al Empleado</DialogTitle>
            <DialogDescription>
              La baja lógica preserva todo el historial del empleado. Los registros históricos nunca
              se borran.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Fecha de Baja</Label>
              <Input
                type="date"
                value={fechaBaja}
                onChange={(e) => setFechaBaja(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBajaDialogOpen(false)}>
                Cancelar
              </Button>
              <Button variant="destructive" onClick={handleBaja}>
                Confirmar Baja
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import Excel Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5" />
              Importar Fichadas desde Excel
            </DialogTitle>
            <DialogDescription>
              Archivo: {importFileName}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">{validImportCount} válidos</span>
              </div>
              {errorImportCount > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <XCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">{errorImportCount} con errores</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Hora</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Legajo</TableHead>
                    <TableHead>Empleado</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((row, index) => (
                    <TableRow key={index} className={row.error ? "bg-red-50" : ""}>
                      <TableCell>{row.fecha}</TableCell>
                      <TableCell>{row.hora}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{row.metodo}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.tipo === "entrada" ? "default" : "secondary"}>
                          {row.tipo === "entrada" ? "Entrada" : "Salida"}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono">{row.legajo}</TableCell>
                      <TableCell>{row.empleadoNombre}</TableCell>
                      <TableCell>
                        {row.error ? (
                          <span className="text-xs text-red-600">{row.error}</span>
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex items-center justify-between">
              <Button variant="outline" size="sm" onClick={downloadExcelTemplate}>
                <Download className="mr-2 h-4 w-4" />
                Descargar Plantilla
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleConfirmImport} disabled={validImportCount === 0 || isImporting}>
                  {isImporting ? "Importando..." : `Importar ${validImportCount} fichadas`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
