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
import { useAuth } from "@/lib/auth-context"
import { parseLocalDate, toLocalISODate, todayLocalISODate } from "@/lib/date-utils"
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
  Info,
  Eye,
  EyeOff,
} from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
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
  mediaAusencia: "",
  fichaIncompleta: ""
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
  mediaAusencia: "",
  fichaIncompleta: ""
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
  legajo: string
  nombre: string
  apellido: string
  dni: string
  cuil: string
  departamento: string
  cargo: string
  categoriaLaboral: string
  convenio: string
  tipoJornada: TipoJornada
  fechaIngreso?: string
  estado?: Employee["estado"]
  email: string
  telefono: string
  turnoId?: string
  diasDescanso: string
  modalidadFichada: ModalidadFichada
  error?: string
}

export function EmployeesView() {
  const {
    employees,
    addEmployee,
    updateEmployee,
    isUsernameTaken,
    darDeBajaEmployee,
    turnos,
    addTurno,
    assignTurno,
    assignTurnoRotativo,
    getEmployeeStats,
    getNovedadesByEmployeeAndPeriod,
    getFichadasByEmployeeAndPeriod,
    getTurnoById,
    isLoaded,
  } = useLMSData()

  const { user } = useAuth()
  const isAdmin = user?.role === "admin"

  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
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
    return toLocalISODate(date)
  })
  const [periodoFin, setPeriodoFin] = useState(() => {
    return todayLocalISODate()
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
    fechaIngreso: todayLocalISODate(),
    estado: "activo" as Employee["estado"],
    email: "",
    telefono: "",
    turnoId: "",
    diasDescanso: [0, 6] as number[],
    modalidadFichada: "todas" as ModalidadFichada,
    username: "",
    password: "",
  })

  // Turno form state
  const [turnoFormData, setTurnoFormData] = useState({
    nombre: "",
    tipo: "fijo" as "fijo" | "rotativo" | "flexible",
    toleranciaEntradaMinutos: 15,
    toleranciaSalidaMinutos: 15,
    umbralHorasExtra: 30,
    // Para fijo
    horaEntrada: "08:00",
    horaSalida: "16:00",
    diasSemana: [1, 2, 3, 4, 5],
    // Para rotativo
    fechaInicio: "",
    fechaFin: "",
    diasSemanaRotativo: [1, 2, 3, 4, 5],
    configuracionesDiarias: [] as { dia: number; horaEntrada: string; horaSalida: string }[],
    // Para flexible
    horaEntradaInicio: "08:00",
    horaEntradaFin: "10:00",
    horaSalidaInicio: "16:00",
    horaSalidaFin: "18:00",
    horasTotales: 8,
  })

  const [selectedTurnoId, setSelectedTurnoId] = useState("")
  const [selectedRotativoTurnos, setSelectedRotativoTurnos] = useState<string[]>([])
  const [turnoTipo, setTurnoTipo] = useState<"fijo" | "rotativo">("fijo")
  const [fechaBaja, setFechaBaja] = useState(todayLocalISODate())
  const { toast } = useToast()

  const showCreatedCredentialsToast = (createdEmployees: Employee | Employee[]) => {
    const items = Array.isArray(createdEmployees) ? createdEmployees : [createdEmployees]
    if (items.length === 0) return

    const description = (
      <div className="grid gap-1">
        {items.slice(0, 5).map((employee) => (
          <div key={employee.id}>
            <strong>{employee.nombre} {employee.apellido}</strong>: {employee.username} / {employee.password}
          </div>
        ))}
        {items.length > 5 && (
          <div>...y {items.length - 5} más empleado(s).</div>
        )}
      </div>
    )

    toast({
      title: items.length === 1 ? "Credenciales generadas" : `Se importaron ${items.length} empleados`,
      description,
    })
  }

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

    const desiredUsername = formData.username.trim()
    if (desiredUsername && isUsernameTaken(desiredUsername, editingEmployee?.id)) {
      toast({
        title: "Usuario no disponible",
        description: `El usuario "${desiredUsername}" ya está en uso. Elegí otro.`,
        variant: "destructive",
      })
      return
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, formData)
    } else {
      if (!isAdmin) {
        toast({
          title: "Acción no permitida",
          description: "Solo un administrador puede crear empleados.",
          variant: "destructive",
        })
        return
      }
      const createdEmployee = addEmployee(formData)
      showCreatedCredentialsToast(createdEmployee)
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
      fechaIngreso: todayLocalISODate(),
      estado: "activo",
      email: "",
      telefono: "",
      turnoId: "",
      diasDescanso: [0, 6],
      modalidadFichada: "todas",
      username: "",
      password: "",
    })
    setEditingEmployee(null)
    setShowPassword(false)
  }

  const handleOpenCreate = () => {
    if (!isAdmin) return
    resetForm()
    setFormData((prev) => ({ ...prev, legajo: generateLegajo() }))
    setIsDialogOpen(true)
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
      modalidadFichada: employee.modalidadFichada || "todas",
      username: employee.username || "",
      password: employee.password || "",
    })
    setShowPassword(false)
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
      tipo: "fijo",
      toleranciaEntradaMinutos: 15,
      toleranciaSalidaMinutos: 15,
      umbralHorasExtra: 30,
      horaEntrada: "08:00",
      horaSalida: "16:00",
      diasSemana: [1, 2, 3, 4, 5],
      fechaInicio: "",
      fechaFin: "",
      diasSemanaRotativo: [1, 2, 3, 4, 5],
      configuracionesDiarias: [],
      horaEntradaInicio: "08:00",
      horaEntradaFin: "10:00",
      horaSalidaInicio: "16:00",
      horaSalidaFin: "18:00",
      horasTotales: 8,
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
    if (!isAdmin) return
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
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as unknown[][]
        if (jsonData.length === 0) {
          throw new Error("Archivo vacío")
        }

        const normalizeHeader = (value: unknown) =>
          String(value || "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, "")

        const headerRow = jsonData[0] as unknown[]
        const headerIndex: Record<string, number> = {}
        headerRow.forEach((value, index) => {
          headerIndex[normalizeHeader(value)] = index
        })

        const findHeader = (aliases: string[]) => {
          const normalized = aliases.map(normalizeHeader)
          const found = normalized.find((key) => headerIndex[key] !== undefined)
          return found !== undefined ? headerIndex[found] : -1
        }

        const getCell = (row: unknown[], aliases: string[]) => {
          const idx = findHeader(aliases)
          return idx >= 0 ? row[idx] : undefined
        }

        const parseString = (value: unknown) => String(value ?? "").trim()

        const parseDiasDescanso = (value: unknown): string => {
          const text = parseString(value)
          return text || "0,6"
        }

        const parseDiasDescansoArray = (value: unknown): number[] => {
          const raw = parseDiasDescanso(value)
          const dayMap: Record<string, number> = {
            domingo: 0,
            dom: 0,
            d: 0,
            lunes: 1,
            lun: 1,
            l: 1,
            martes: 2,
            mar: 2,
            m: 2,
            miercoles: 3,
            miércoles: 3,
            mie: 3,
            mier: 3,
            w: 3,
            jueves: 4,
            jue: 4,
            j: 4,
            viernes: 5,
            vie: 5,
            v: 5,
            sabado: 6,
            sábado: 6,
            sab: 6,
            s: 6,
          }
          return Array.from(
            new Set(
              raw
                .split(/[,;|]/)
                .map((segment) => segment.trim().toLowerCase())
                .filter(Boolean)
                .map((value) => {
                  if (/^[0-6]$/.test(value)) return Number(value)
                  return dayMap[value]
                })
                .filter((value): value is number => typeof value === "number")
            )
          )
        }

        const mapToTipoJornada = (value: unknown): TipoJornada => {
          const normalized = parseString(value).toLowerCase()
          return normalized === "parcial" ? "parcial" : "completa"
        }

        const parseEstado = (value: unknown): Employee["estado"] | undefined => {
          const normalized = parseString(value).toLowerCase().trim()
          if (!normalized) return undefined
          if (normalized === "inactivo") return "inactivo"
          if (normalized === "licencia") return "licencia"
          if (normalized === "suspendido") return "suspendido"
          if (normalized === "activo") return "activo"
          return undefined
        }

        const mapToModalidadFichada = (value: unknown): ModalidadFichada => {
          const normalized = parseString(value).toLowerCase()
          if (normalized.includes("manual")) return "manual"
          if (normalized.includes("tarjeta")) return "tarjeta"
          if (normalized.includes("api")) return "api"
          if (normalized.includes("todas")) return "todas"
          return "biometrico"
        }

        const preview: ImportPreview[] = []
        const existingLegajos = new Set(employees.map((e) => e.legajo.toLowerCase()))
        const seenLegajos = new Set<string>()

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i] as unknown[]
          if (!row || row.length === 0) continue

          const legajo = parseString(getCell(row, ["legajo", "codigo", "file", "id"]))
          const nombre = parseString(getCell(row, ["nombre", "nombres"]))
          const apellido = parseString(getCell(row, ["apellido", "apellidos"]))
          const dni = parseString(getCell(row, ["dni"]))
          const cuil = parseString(getCell(row, ["cuil"]))
          const departamento = parseString(getCell(row, ["departamento", "area"]))
          const cargo = parseString(getCell(row, ["cargo", "puesto"]))
          const categoriaLaboral = parseString(getCell(row, ["categoria laboral", "categorialaboral", "categoria"]))
          const convenio = parseString(getCell(row, ["convenio"]))
          const tipoJornada = mapToTipoJornada(getCell(row, ["tipo jornada", "tipojornada", "jornada"]))
          const fechaIngresoCell = getCell(row, ["fecha ingreso", "fechaingreso", "ingreso"])
          const fechaIngreso = parseExcelDate(fechaIngresoCell)
          const estadoRaw = parseString(getCell(row, ["estado", "situacion"]))
          const estado = parseEstado(estadoRaw)
          const email = parseString(getCell(row, ["email", "correo", "correo electronico", "correoelectronico"]))
          const telefono = parseString(getCell(row, ["telefono", "teléfono", "celular"]))
          const turnoId = parseString(getCell(row, ["turno id", "turnoid", "turno"])) || undefined
          const diasDescansoValue = parseString(getCell(row, ["dias descanso", "diasdescanso", "descanso"]))
          const diasDescanso = diasDescansoValue || "0,6"
          const modalidadFichada = mapToModalidadFichada(getCell(row, ["modalidad fichada", "modalidadfichada", "modalidad"]))

          let error: string | undefined
          if (!legajo) {
            error = "Falta legajo"
          } else if (!nombre) {
            error = "Falta nombre"
          } else if (!apellido) {
            error = "Falta apellido"
          } else if (!dni) {
            error = "Falta DNI"
          } else if (!cuil) {
            error = "Falta CUIL"
          } else if (!fechaIngreso) {
            error = "Falta fecha de ingreso"
          } else if (!estadoRaw) {
            error = "Falta estado"
          } else if (!estado) {
            error = "Estado inválido"
          } else if (existingLegajos.has(legajo.toLowerCase())) {
            error = `Legajo ${legajo} ya existe`
          } else if (seenLegajos.has(legajo.toLowerCase())) {
            error = `Legajo ${legajo} está duplicado en el archivo`
          }

          seenLegajos.add(legajo.toLowerCase())

          preview.push({
            legajo,
            nombre,
            apellido,
            dni,
            cuil,
            departamento,
            cargo,
            categoriaLaboral,
            convenio,
            tipoJornada,
            fechaIngreso,
            estado,
            email,
            telefono,
            turnoId,
            diasDescanso,
            modalidadFichada,
            error,
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
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
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

      const parsed = parseLocalDate(`${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`)
      return isNaN(parsed.getTime())
        ? undefined
        : `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`
    }

    const parsed = parseLocalDate(rawValue)
    return isNaN(parsed.getTime()) ? undefined : toLocalISODate(parsed)
  }

  const formatDisplayDate = (value?: string): string => {
    if (!value) return ""
    const normalized = normalizeDateString(value)
    if (!normalized) return value
    const [year, month, day] = normalized.split("-")
    return `${day}/${month}/${year}`
  }

  const parseExcelDate = (value: unknown): string | undefined => {
    if (value === null || value === undefined) return undefined
    if (typeof value === "number") {
      const date = new Date((value - 25569) * 86400 * 1000)
      return isNaN(date.getTime()) ? undefined : toLocalISODate(date)
    }

    return normalizeDateString(String(value))
  }

  const handleConfirmImport = () => {
    if (!isAdmin) {
      toast({
        title: "Acción no permitida",
        description: "Solo un administrador puede importar empleados.",
        variant: "destructive",
      })
      return
    }
    setIsImporting(true)

    const validEmployees = importPreview
      .filter(
        (p): p is ImportPreview & { fechaIngreso: string; estado: Employee["estado"] } =>
          !p.error && p.fechaIngreso !== undefined && p.estado !== undefined
      )
      .map((p) => ({
        legajo: p.legajo,
        nombre: p.nombre,
        apellido: p.apellido,
        dni: p.dni,
        cuil: p.cuil,
        departamento: p.departamento,
        cargo: p.cargo,
        categoriaLaboral: p.categoriaLaboral,
        convenio: p.convenio || "",
        tipoJornada: p.tipoJornada,
        fechaIngreso: p.fechaIngreso,
        estado: p.estado,
      email: p.email,
      telefono: p.telefono,
      turnoId: p.turnoId || undefined,
      diasDescanso: (() => {
        const result = p.diasDescanso
          .split(/[,;|]/)
          .map((item) => item.trim())
          .filter(Boolean)
          .map((item) => {
            const normalized = item.toLowerCase()
            const map: Record<string, number> = {
              domingo: 0,
              dom: 0,
              lunes: 1,
              lun: 1,
              martes: 2,
              mar: 2,
              miercoles: 3,
              miércoles: 3,
              mie: 3,
              jueves: 4,
              jue: 4,
              viernes: 5,
              vie: 5,
              sabado: 6,
              sábado: 6,
              sab: 6,
            }
            if (/^[0-6]$/.test(item)) return Number(item)
            return map[normalized] ?? -1
          })
          .filter((value) => value >= 0)
        return result.length > 0 ? result : [0, 6]
      })(),
      modalidadFichada: p.modalidadFichada,
    }))

    if (validEmployees.length > 0) {
      const createdEmployees = validEmployees.map((employee) => addEmployee(employee))
      showCreatedCredentialsToast(createdEmployees)
    }

    setIsImporting(false)
    setIsImportDialogOpen(false)
    setImportPreview([])
    setImportFileName("")
  }

  const downloadExcelTemplate = () => {
    const templateData = [
      [
        "Legajo",
        "Nombre",
        "Apellido",
        "DNI",
        "CUIL",
        "Fecha Ingreso",
        "Estado",
        "Departamento",
        "Cargo",
        "Categoría Laboral",
        "Convenio",
        "Tipo Jornada",
      ],
      [
        "EMP006",
        "Laura",
        "Gómez",
        "30567890",
        "27-30567890-3",
        "02/01/2024",
        "activo",
        "Administración",
        "Analista",
        "Profesional",
        "Empleados de Comercio",
        "completa",
      ],
      [
        "EMP007",
        "Sebastián",
        "Rossi",
        "31234567",
        "20-31234567-8",
        "10/02/2024",
        "activo",
        "Producción",
        "Operario",
        "Operario Calificado",
        "UOCRA",
        "completa",
      ],
    ]

    const ws = XLSX.utils.aoa_to_sheet(templateData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Empleados")
    XLSX.writeFile(wb, "plantilla_empleados.xlsx")
  }

  const validImportCount = importPreview.filter((p) => !p.error).length
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
            {isAdmin && (
            <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              <Upload className="mr-2 h-4 w-4" />
              Importar Empleados
            </Button>
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
                Formato esperado: Legajo, Nombre, Apellido, DNI, CUIL, Fecha Ingreso (dd/mm/aaaa), Estado, Departamento, Cargo, Categoría Laboral, Convenio, Tipo Jornada.
              </TooltipContent>
            </Tooltip>
          </div>
          )}

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
                  <DialogDescription>
                    Visualiza los turnos existentes y crea nuevos turnos para asignar a tus empleados.
                  </DialogDescription>
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
                              {turno.fechaInicio && turno.fechaFin && (
                                <p className="text-xs text-muted-foreground">
                                  Vigente: {formatDisplayDate(turno.fechaInicio)} - {formatDisplayDate(turno.fechaFin)}
                                </p>
                              )}
                              {(turno.tipo === "fijo" || turno.tipo === "reducida") ? (
                                <>
                                  <p className="text-sm text-muted-foreground">
                                    {turno.horaEntrada} - {turno.horaSalida} | Tolerancia Entrada: {turno.toleranciaEntradaMinutos ?? 0}min | Salida: {turno.toleranciaSalidaMinutos ?? 0}min
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Umbral horas extra: {turno.umbralHorasExtra ?? 0}min
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Días: {turno.diasSemana?.map((d) => diasSemanaLabels[d]).join(", ")}
                                  </p>
                                </>
                              ) : (turno.tipo === "flexible") ? (
                                <>
                                  <p className="text-sm text-muted-foreground">
                                    Entrada: {turno.horaEntradaInicio} - {turno.horaEntradaFin} | Salida: {turno.horaSalidaInicio} - {turno.horaSalidaFin}
                                  </p>
                                  <p className="text-sm text-muted-foreground">
                                    Horas totales: {turno.horasTotales}h | Tolerancia Entrada: {turno.toleranciaEntradaMinutos ?? 0}min | Salida: {turno.toleranciaSalidaMinutos ?? 0}min
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    Días: {turno.diasSemana?.map((d) => diasSemanaLabels[d]).join(", ")}
                                  </p>
                                </>
                              ) : (
                                <>
                                  <p className="text-sm text-muted-foreground">
                                    Tolerancia Entrada: {turno.toleranciaEntradaMinutos ?? 0}min | Salida: {turno.toleranciaSalidaMinutos ?? 0}min | Umbral horas extra: {turno.umbralHorasExtra ?? 0}min
                                  </p>
                                  <div className="text-xs text-muted-foreground">
                                    {turno.configuracionesDiarias?.map((config) => (
                                      <div key={config.dia}>
                                        {diasSemanaLabels[config.dia]}: {config.horaEntrada} - {config.horaSalida}
                                      </div>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                            <Badge variant={(turno.tipo === "fijo" || turno.tipo === "reducida") ? "secondary" : turno.tipo === "rotativo" ? "outline" : "default"}>
                              {turno.tipo === "fijo" ? "Fijo" : turno.tipo === "reducida" ? "Reducida" : turno.tipo === "rotativo" ? "Rotativo" : "Flexible"}
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
                              setTurnoFormData((p) => ({ ...p, tipo: v as "fijo" | "rotativo" | "flexible" }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="fijo">Fijo</SelectItem>
                              <SelectItem value="rotativo">Rotativo</SelectItem>
                              <SelectItem value="flexible">Flexible con banda horaria</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Tolerancia Entrada (min)</Label>
                          <Input
                            type="number"
                            value={turnoFormData.toleranciaEntradaMinutos}
                            onChange={(e) =>
                              setTurnoFormData((p) => ({
                                ...p,
                                toleranciaEntradaMinutos: parseInt(e.target.value),
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Tolerancia Salida (min)</Label>
                          <Input
                            type="number"
                            value={turnoFormData.toleranciaSalidaMinutos}
                            onChange={(e) =>
                              setTurnoFormData((p) => ({
                                ...p,
                                toleranciaSalidaMinutos: parseInt(e.target.value),
                              }))
                            }
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Umbral Horas Extra (min)</Label>
                          <Input
                            type="number"
                            value={turnoFormData.umbralHorasExtra}
                            onChange={(e) =>
                              setTurnoFormData((p) => ({
                                ...p,
                                umbralHorasExtra: parseInt(e.target.value),
                              }))
                            }
                            required
                          />
                        </div>
                      </div>
                      {turnoFormData.tipo === "fijo" ? (
                        <>
                          <div className="grid grid-cols-2 gap-4">
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
                        </>
                      ) : (turnoFormData.tipo === "flexible") ? (
                        <>
                          <div className="grid grid-cols-4 gap-4">
                            <div className="space-y-2">
                              <Label>Rango Entrada Inicio</Label>
                              <Input
                                type="time"
                                value={turnoFormData.horaEntradaInicio}
                                onChange={(e) =>
                                  setTurnoFormData((p) => ({ ...p, horaEntradaInicio: e.target.value }))
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Rango Entrada Fin</Label>
                              <Input
                                type="time"
                                value={turnoFormData.horaEntradaFin}
                                onChange={(e) =>
                                  setTurnoFormData((p) => ({ ...p, horaEntradaFin: e.target.value }))
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Rango Salida Inicio</Label>
                              <Input
                                type="time"
                                value={turnoFormData.horaSalidaInicio}
                                onChange={(e) =>
                                  setTurnoFormData((p) => ({ ...p, horaSalidaInicio: e.target.value }))
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Rango Salida Fin</Label>
                              <Input
                                type="time"
                                value={turnoFormData.horaSalidaFin}
                                onChange={(e) =>
                                  setTurnoFormData((p) => ({ ...p, horaSalidaFin: e.target.value }))
                                }
                                required
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Horas Totales (horas)</Label>
                              <Input
                                type="number"
                                value={turnoFormData.horasTotales}
                                onChange={(e) =>
                                  setTurnoFormData((p) => ({
                                    ...p,
                                    horasTotales: parseFloat(e.target.value),
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
                        </>
                      ) : (
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Fecha Inicio</Label>
                              <Input
                                type="date"
                                value={turnoFormData.fechaInicio}
                                onChange={(e) =>
                                  setTurnoFormData((p) => ({ ...p, fechaInicio: e.target.value }))
                                }
                                required
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Fecha Fin</Label>
                              <Input
                                type="date"
                                value={turnoFormData.fechaFin}
                                onChange={(e) =>
                                  setTurnoFormData((p) => ({ ...p, fechaFin: e.target.value }))
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
                                    turnoFormData.diasSemanaRotativo.includes(index) ? "default" : "outline"
                                  }
                                  onClick={() => {
                                    const newDias = turnoFormData.diasSemanaRotativo.includes(index)
                                      ? turnoFormData.diasSemanaRotativo.filter((d) => d !== index)
                                      : [...turnoFormData.diasSemanaRotativo, index]
                                    // Limpiar configuraciones de días no seleccionados
                                    const newConfig = turnoFormData.configuracionesDiarias.filter(c => newDias.includes(c.dia))
                                    setTurnoFormData((p) => ({ ...p, diasSemanaRotativo: newDias, configuracionesDiarias: newConfig }))
                                  }}
                                >
                                  {dia}
                                </Button>
                              ))}
                            </div>
                          </div>
                          <Label>Horarios por Día</Label>
                          {turnoFormData.diasSemanaRotativo.map((dia) => {
                            const config = turnoFormData.configuracionesDiarias.find(c => c.dia === dia)
                            return (
                              <div key={dia} className="grid grid-cols-3 gap-4 items-center">
                                <span className="font-medium">{diasSemanaLabels[dia]}</span>
                                <Input
                                  type="time"
                                  placeholder="Entrada"
                                  value={config?.horaEntrada || ""}
                                  onChange={(e) => {
                                    const newConfig = turnoFormData.configuracionesDiarias.filter(c => c.dia !== dia)
                                    if (e.target.value) {
                                      newConfig.push({ dia, horaEntrada: e.target.value, horaSalida: config?.horaSalida || "" })
                                    }
                                    setTurnoFormData((p) => ({ ...p, configuracionesDiarias: newConfig }))
                                  }}
                                  required
                                />
                                <Input
                                  type="time"
                                  placeholder="Salida"
                                  value={config?.horaSalida || ""}
                                  onChange={(e) => {
                                    const newConfig = turnoFormData.configuracionesDiarias.filter(c => c.dia !== dia)
                                    if (e.target.value) {
                                      newConfig.push({ dia, horaEntrada: config?.horaEntrada || "", horaSalida: e.target.value })
                                    }
                                    setTurnoFormData((p) => ({ ...p, configuracionesDiarias: newConfig }))
                                  }}
                                  required
                                />
                              </div>
                            )
                          })}
                        </div>
                      )}
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

                  {/* Credenciales de Acceso */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                      Credenciales de Acceso
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="username">Usuario</Label>
                        <Input
                          id="username"
                          value={formData.username}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, username: e.target.value }))
                          }
                          placeholder={editingEmployee ? "" : "Se genera automáticamente si lo dejás vacío"}
                          autoComplete="off"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="password">Contraseña</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={formData.password}
                            onChange={(e) =>
                              setFormData((prev) => ({ ...prev, password: e.target.value }))
                            }
                            placeholder={editingEmployee ? "" : "Igual al usuario si la dejás vacía"}
                            autoComplete="new-password"
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
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
                                {turno.nombre}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
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
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1.5">
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lista de Empleados
                </CardTitle>
                <CardDescription>
                  {filteredEmployees.length} empleados encontrados
                </CardDescription>
              </div>
              {isAdmin && (
                <Button onClick={handleOpenCreate}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Nuevo Empleado
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Legajo</TableHead>
                  <TableHead>Nombre</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Usuario</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Jornada</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Estado Turno</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="font-mono">{emp.username || '-'}</TableCell>
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
                        <Badge variant={emp.estadoTurno === "actualizado" ? "secondary" : "destructive"}>
                          {emp.estadoTurno === "actualizado" ? "Actualizado" : "Desactualizado"}
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
                  {formatDisplayDate(selectedEmployee.fechaIngreso)}
                </div>
                <div>
                  <span className="text-muted-foreground">Turno:</span>{" "}
                  <Badge variant="outline">
                    {selectedEmployee.turnoId ? getTurnoById(selectedEmployee.turnoId)?.nombre : "Sin asignar"}
                  </Badge>
                </div>
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
                        <p className="text-xs text-muted-foreground">{formatDisplayDate(nov.fecha)}</p>
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
                  <div className="grid grid-cols-[120px_90px_100px_90px] gap-2 px-2 pb-2 text-xs uppercase tracking-wide text-muted-foreground border-b">
                    <span>Fecha</span>
                    <span>Hora</span>
                    <span>Tipo</span>
                    <span>Estado</span>
                  </div>
                  {selectedFichadas.map((fich) => (
                    <div
                      key={fich.id}
                      className="grid grid-cols-[120px_90px_100px_90px] gap-2 items-center py-2 px-2 text-sm border-b last:border-0"
                    >
                      <span className="text-muted-foreground">{formatDisplayDate(fich.fecha)}</span>
                      <span className="font-mono">{fich.hora}</span>
                      <Badge variant="outline" className="text-xs">
                        {fich.tipo === "entrada" ? "Entrada" : "Salida"}
                      </Badge>
                      <Badge
                        variant={fich.esTardanza ? "destructive" : "secondary"}
                        className="text-xs"
                      >
                        {fich.esTardanza ? "Tarde" : "Normal"}
                      </Badge>
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
                        {turno.nombre}
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
                        {turno.nombre}
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
              Importar Empleados desde Excel
            </DialogTitle>
            <DialogDescription>
              Archivo: {importFileName || "Ninguno"}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            <p className="font-medium">Formato de archivo esperado:</p>
            <p>Columnas obligatorias: Legajo, Nombre, Apellido, DNI, CUIL, Fecha Ingreso, Estado.</p>
            <p>Columnas opcionales: Departamento, Cargo, Categoría Laboral, Convenio, Tipo Jornada.</p>
          </div>
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
                    <TableHead>Legajo</TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Apellido</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Resultado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {importPreview.map((row, index) => (
                    <TableRow key={index} className={row.error ? "bg-red-50" : ""}>
                      <TableCell className="font-mono">{row.legajo}</TableCell>
                      <TableCell>{row.nombre}</TableCell>
                      <TableCell>{row.apellido}</TableCell>
                      <TableCell>{row.departamento}</TableCell>
                      <TableCell>{row.estado}</TableCell>
                      <TableCell>{row.email}</TableCell>
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
                  {isImporting ? "Importando..." : `Importar ${validImportCount} empleados`}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
