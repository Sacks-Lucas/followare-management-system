"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"
import { parseLocalDate, toLocalISODate, todayLocalISODate } from "./date-utils"

// Types
export interface Turno {
  id: string
  nombre: string
  tipo: "fijo" | "rotativo" | "flexible" | "reducida"
  fechaInicio?: string // YYYY-MM-DD
  fechaFin?: string // YYYY-MM-DD
  toleranciaMinutos?: number
  toleranciaEntradaMinutos?: number
  toleranciaSalidaMinutos?: number
  umbralHorasExtra?: number
  // Para fijo
  horaEntrada?: string
  horaSalida?: string
  diasSemana?: number[] // 0=Domingo, 1=Lunes, etc
  // Para rotativo
  configuracionesDiarias?: {
    dia: number // 0-6
    horaEntrada: string
    horaSalida: string
  }[]
  // Para flexible
  horaEntradaInicio?: string
  horaEntradaFin?: string
  horaSalidaInicio?: string
  horaSalidaFin?: string
  horasTotales?: number // en horas
}

export type TipoJornada = "completa" | "parcial"
export type ModalidadFichada = "biometrico" | "manual" | "tarjeta" | "api" | "todas"

export interface Employee {
  id: string
  legajo: string
  nombre: string
  apellido: string
  dni: string
  cuil: string
  departamento: string
  cargo: string
  categoriaLaboral: string
  convenio?: string
  tipoJornada: TipoJornada
  fechaIngreso: string
  fechaBaja?: string
  estado: "activo" | "inactivo" | "licencia" | "suspendido"
  estadoTurno?: "actualizado" | "desactualizado"
  email: string
  telefono: string
  turnoId?: string
  diasDescanso: number[] // 0=Domingo, 1=Lunes, etc.
  modalidadFichada: ModalidadFichada
  turnoRotativo?: {
    turnos: string[]
    semanaActual: number
  }
  username?: string
  password?: string
}

export interface Contador {
  id: string
  legajo: string
  nombre: string
  apellido: string
  dni: string
  cuil: string
  email: string
  telefono: string
  estado: "activo" | "inactivo"
  username?: string
  password?: string
}

export const EMPLOYEES_KEY = "lms-employees"
export const CONTADORES_KEY = "lms-contadores"
export const RESERVED_USERNAMES = new Set(["admin", "contador", "empleado"])

export const normalizeUserCredential = (value: string) => {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, "")
    .trim()
}

export const generateEmployeeCredentials = (
  nombre: string,
  apellido: string,
  existingUsernames: Set<string> = new Set()
) => {
  const base = normalizeUserCredential(`${nombre}${apellido}`)
  let username = base || normalizeUserCredential(nombre)
  if (!username) username = "empleado"

  let uniqueUsername = username
  let suffix = 1
  while (
    RESERVED_USERNAMES.has(uniqueUsername.toLowerCase()) ||
    existingUsernames.has(uniqueUsername.toLowerCase())
  ) {
    uniqueUsername = `${username}${suffix}`
    suffix += 1
  }

  const password = uniqueUsername
  existingUsernames.add(uniqueUsername.toLowerCase())
  return { username: uniqueUsername, password }
}

export const ensureEmployeeCredentials = (employee: Employee, existingUsernames: Set<string>) => {
  const usernameLower = employee.username?.toLowerCase() ?? ""

  if (employee.username && employee.password && !existingUsernames.has(usernameLower)) {
    existingUsernames.add(usernameLower)
    return employee
  }

  const credentials = generateEmployeeCredentials(employee.nombre, employee.apellido, existingUsernames)
  return {
    ...employee,
    username: credentials.username,
    password: credentials.password,
  }
}

export type TipoFichada = "entrada" | "salida" | "inicioBreak" | "finBreak"
export type MetodoFichada = "biometrico" | "manual" | "api" | "tarjeta"
export type EstadoFichada = "ok" | "pendiente"

export interface Fichada {
  id: string
  empleadoId: string
  empleadoNombre: string
  tipo: TipoFichada
  fecha: string
  hora: string
  ubicacion?: string
  observaciones?: string
  metodo: MetodoFichada
  dispositivo?: string
  estado: EstadoFichada
  // Interpretación automática
  esTardanza?: boolean
  minutosExtra?: number
  minutosDescanso?: number
}

export type TipoNovedad =
  | "ausencia"
  | "mediaAusencia"
  | "fichaIncompleta"
  | "tardanza"
  | "horaExtra"
  | "licencia"
  | "feriado"
  | "justificativo"
  | "suspension"
  | "cambioTurno"
  | "vacaciones"
  | "enfermedad"

export interface Novedad {
  id: string
  empleadoId: string
  empleadoNombre: string
  tipo: TipoNovedad
  fecha: string
  fechaFin?: string
  descripcion: string
  aprobado: boolean
  aprobadoPor?: string
  fechaAprobacion?: string
  documentoAdjunto?: string
  turnoAnterior?: string
  turnoNuevo?: string
}

interface EmployeeStats {
  diasTrabajados: number
  horasNormales: number
  horasExtra: number
  tardanzas: number
  ausencias: number
  licencias: number
  suspensiones: number
}

interface LMSDataContextType {
  // Turnos
  turnos: Turno[]
  addTurno: (turno: Omit<Turno, "id">) => void
  updateTurno: (id: string, data: Partial<Turno>) => void
  deleteTurno: (id: string) => void
  getTurnoById: (id: string) => Turno | undefined

  // Employees
  employees: Employee[]
  addEmployee: (employee: Omit<Employee, "id">) => Employee
  updateEmployee: (id: string, data: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
  darDeBajaEmployee: (id: string, fechaBaja: string) => void
  getEmployeeById: (id: string) => Employee | undefined
  assignTurno: (empleadoId: string, turnoId: string) => void
  // Contadores
  contadores: Contador[]
  addContador: (contador: Omit<Contador, "id">) => Contador
  updateContador: (id: string, data: Partial<Contador>) => void
  deleteContador: (id: string) => void
  isUsernameTaken: (username: string, excludeId?: string) => boolean
  assignTurnoRotativo: (empleadoId: string, turnoIds: string[]) => void
  getEmployeeStats: (empleadoId: string, fechaInicio: string, fechaFin: string) => EmployeeStats

  // Fichadas
  fichadas: Fichada[]
  addFichada: (fichada: Omit<Fichada, "id">) => { success: boolean; error?: string }
  addFichadasMasivas: (fichadas: Omit<Fichada, "id">[]) => void
  deleteFichada: (id: string) => void
  getFichadasHoy: () => Fichada[]
  getFichadasByEmployee: (empleadoId: string) => Fichada[]
  getFichadasByEmployeeAndPeriod: (empleadoId: string, fechaInicio: string, fechaFin: string) => Fichada[]
  getFichadasByMonth: (year: number, month: number) => Fichada[]
  getFichadasByPeriod: (fechaInicio: string, fechaFin: string) => Fichada[]
  interpretarFichada: (fichada: Omit<Fichada, "id" | "esTardanza" | "minutosExtra">) => Omit<Fichada, "id">
  actualizarEstadoFichada: (id: string, estado: EstadoFichada) => { success: boolean; error?: string }
  validarAlternancia: (empleadoId: string, fecha: string, tipo: TipoFichada, hora: string) => { valido: boolean; error?: string }
  detectarDuplicados: (empleadoId: string, fecha: string, tipo: TipoFichada, hora: string) => boolean

  // Novedades
  novedades: Novedad[]
  addNovedad: (novedad: Omit<Novedad, "id">) => void
  updateNovedad: (id: string, data: Partial<Novedad>) => void
  deleteNovedad: (id: string) => void
  aprobarNovedad: (id: string, aprobadoPor: string) => void
  getNovedadesByEmployee: (empleadoId: string) => Novedad[]
  getNovedadesByEmployeeAndPeriod: (empleadoId: string, fechaInicio: string, fechaFin: string) => Novedad[]
  getNovedadesPendientes: () => Novedad[]

  // Statistics
  getStats: () => {
    totalEmpleados: number
    presentesHoy: number
    tardanzas: number
    pendientes: number
    enLicencia: number
    suspendidos: number
  }

  // Monthly report
  getCierreMensual: (year: number, month: number) => {
    empleadoId: string
    empleadoNombre: string
    diasTrabajados: number
    horasNormales: number
    horasExtra: number
    tardanzas: number
    ausencias: number
    licencias: number
    suspensiones: number
  }[]

  getCierrePorPeriodo: (fechaInicio: string, fechaFin: string) => {
    empleadoId: string
    empleadoNombre: string
    diasTrabajados: number
    horasNormales: number
    horasExtra: number
    tardanzas: number
    ausencias: number
    licencias: number
    suspensiones: number
  }[]

  isLoaded: boolean
}

const LMSDataContext = createContext<LMSDataContextType | undefined>(undefined)

const TURNOS_KEY = "lms-turnos"
const FICHADAS_KEY = "lms-fichadas"
const NOVEDADES_KEY = "lms-novedades"
const STORAGE_VERSION_KEY = "lms-storage-version"
const STORAGE_VERSION = "1"

// Default turnos
const defaultTurnos: Turno[] = [
  {
    id: "t1",
    nombre: "Mañana",
    horaEntrada: "08:00",
    horaSalida: "16:00",
    toleranciaEntradaMinutos: 15,
    toleranciaSalidaMinutos: 15,
    umbralHorasExtra: 30,
    tipo: "fijo",
    diasSemana: [1, 2, 3, 4, 5]
  },
  {
    id: "t2",
    nombre: "Tarde",
    horaEntrada: "14:00",
    horaSalida: "22:00",
    toleranciaEntradaMinutos: 15,
    toleranciaSalidaMinutos: 15,
    umbralHorasExtra: 30,
    tipo: "fijo",
    diasSemana: [1, 2, 3, 4, 5]
  },
  {
    id: "t3",
    nombre: "Noche",
    horaEntrada: "22:00",
    horaSalida: "06:00",
    toleranciaEntradaMinutos: 15,
    toleranciaSalidaMinutos: 15,
    umbralHorasExtra: 30,
    tipo: "fijo",
    diasSemana: [1, 2, 3, 4, 5]
  },
  {
    id: "t4",
    nombre: "Administrativo",
    horaEntrada: "09:00",
    horaSalida: "18:00",
    toleranciaEntradaMinutos: 10,
    toleranciaSalidaMinutos: 10,
    umbralHorasExtra: 30,
    tipo: "fijo",
    diasSemana: [1, 2, 3, 4, 5]
  },
  {
    id: "t5",
    nombre: "Rotativo Semana",
    tipo: "rotativo",
    fechaInicio: "2026-01-01",
    fechaFin: "2026-12-31",
    toleranciaEntradaMinutos: 10,
    toleranciaSalidaMinutos: 10,
    umbralHorasExtra: 30,
    configuracionesDiarias: [
      { dia: 1, horaEntrada: "08:00", horaSalida: "16:00" }, // Lunes
      { dia: 2, horaEntrada: "08:00", horaSalida: "16:00" }, // Martes
      { dia: 3, horaEntrada: "14:00", horaSalida: "22:00" }, // Miércoles
      { dia: 4, horaEntrada: "14:00", horaSalida: "22:00" }, // Jueves
      { dia: 5, horaEntrada: "22:00", horaSalida: "06:00" }, // Viernes
    ]
  },
]

// Default mock data
const defaultEmployees: Employee[] = [
  {
    id: "5",
    legajo: "EMP005",
    nombre: "Roberto",
    apellido: "López",
    dni: "28765432",
    cuil: "20-28765432-1",
    departamento: "Producción",
    cargo: "Jefe de Planta",
    categoriaLaboral: "Jefatura",
    tipoJornada: "completa",
    fechaIngreso: "2019-05-01",
    estado: "activo",
    estadoTurno: "actualizado",
    email: "roberto.lopez@empresa.com",
    telefono: "1189012345",
    turnoId: "t1",
    diasDescanso: [0, 6],
    modalidadFichada: "biometrico",
    username: "empleado",
    password: "empleado",
  },
]

const defaultContadores: Contador[] = [
  {
    id: "contador-1",
    legajo: "CONT001",
    nombre: "Carlos",
    apellido: "Contreras",
    dni: "28111222",
    cuil: "20-28111222-3",
    email: "contador@empresa.com",
    telefono: "1144556677",
    estado: "activo",
    username: "contador",
    password: "contador",
  },
]

const generateDefaultFichadas = (): Fichada[] => {
  const fichadas: Fichada[] = []
  const today = new Date()
  const metodos: MetodoFichada[] = ["biometrico", "manual", "tarjeta"]

  // Generate some fichadas for today
  defaultEmployees.forEach((emp) => {
    const baseHour = 8 + Math.floor(Math.random() * 2)
    const baseMinute = Math.floor(Math.random() * 30)
    const esTardanza = baseHour > 8 || (baseHour === 8 && baseMinute > 15)

    fichadas.push({
      id: `f-today-${emp.id}-in`,
      empleadoId: emp.id,
      empleadoNombre: `${emp.nombre} ${emp.apellido}`,
      tipo: "entrada",
      fecha: toLocalISODate(today),
      hora: `${String(baseHour).padStart(2, "0")}:${String(baseMinute).padStart(2, "0")}`,
      ubicacion: "Entrada Principal",
      metodo: metodos[Math.floor(Math.random() * metodos.length)],
      esTardanza
    })
  })

  // Generate fichadas for the past 30 days
  for (let i = 1; i <= 30; i++) {
    const date = new Date(today)
    date.setDate(date.getDate() - i)
    const dateStr = toLocalISODate(date)

    if (date.getDay() === 0 || date.getDay() === 6) continue // Skip weekends

    defaultEmployees.forEach((emp) => {
      if (emp.estado === "licencia" && i < 5) return // Ana in license recently

      const isPresent = Math.random() > 0.1
      if (!isPresent) return

      const isLate = Math.random() > 0.8
      const entryHour = isLate ? 9 + Math.floor(Math.random() * 2) : 8
      const entryMinute = Math.floor(Math.random() * (isLate ? 30 : 15))

      fichadas.push({
        id: `f-${dateStr}-${emp.id}-in`,
        empleadoId: emp.id,
        empleadoNombre: `${emp.nombre} ${emp.apellido}`,
        tipo: "entrada",
        fecha: dateStr,
        hora: `${String(entryHour).padStart(2, "0")}:${String(entryMinute).padStart(2, "0")}`,
        ubicacion: "Entrada Principal",
        metodo: metodos[Math.floor(Math.random() * metodos.length)],
        esTardanza: isLate
      })

      const exitHour = 17 + Math.floor(Math.random() * 3)
      const minutosExtra = exitHour > 17 ? (exitHour - 17) * 60 : 0

      fichadas.push({
        id: `f-${dateStr}-${emp.id}-out`,
        empleadoId: emp.id,
        empleadoNombre: `${emp.nombre} ${emp.apellido}`,
        tipo: "salida",
        fecha: dateStr,
        hora: `${exitHour}:${String(Math.floor(Math.random() * 60)).padStart(2, "0")}`,
        ubicacion: "Entrada Principal",
        metodo: metodos[Math.floor(Math.random() * metodos.length)],
        minutosExtra
      })
    })
  }

  return fichadas
}

const defaultNovedades: Novedad[] = [
  {
    id: "n1",
    empleadoId: "1",
    empleadoNombre: "Juan Pérez",
    tipo: "tardanza",
    fecha: todayLocalISODate(),
    descripcion: "Llegó 45 minutos tarde por problemas de transporte",
    aprobado: false
  },
  {
    id: "n2",
    empleadoId: "3",
    empleadoNombre: "Carlos Rodríguez",
    tipo: "horaExtra",
    fecha: toLocalISODate(new Date(Date.now() - 86400000)),
    descripcion: "Realizó 2 horas extra para completar envío urgente",
    aprobado: true,
    aprobadoPor: "Admin",
    fechaAprobacion: toLocalISODate(new Date(Date.now() - 43200000))
  },
  {
    id: "n3",
    empleadoId: "5",
    empleadoNombre: "Roberto López",
    tipo: "ausencia",
    fecha: toLocalISODate(new Date(Date.now() - 172800000)),
    descripcion: "Ausente sin aviso previo",
    aprobado: false
  },
  {
    id: "n4",
    empleadoId: "4",
    empleadoNombre: "Ana Martínez",
    tipo: "licencia",
    fecha: toLocalISODate(new Date(Date.now() - 432000000)),
    fechaFin: toLocalISODate(new Date(Date.now() + 864000000)),
    descripcion: "Licencia por maternidad",
    aprobado: true,
    aprobadoPor: "RRHH",
    fechaAprobacion: toLocalISODate(new Date(Date.now() - 604800000))
  },
  {
    id: "n5",
    empleadoId: "2",
    empleadoNombre: "María González",
    tipo: "justificativo",
    fecha: toLocalISODate(new Date(Date.now() - 259200000)),
    descripcion: "Turno médico programado - Adjunta certificado",
    aprobado: true,
    aprobadoPor: "RRHH",
    documentoAdjunto: "certificado_medico.pdf"
  },
  {
    id: "n6",
    empleadoId: "1",
    empleadoNombre: "Juan Pérez",
    tipo: "cambioTurno",
    fecha: toLocalISODate(new Date(Date.now() - 604800000)),
    descripcion: "Cambio de turno mañana a tarde por necesidades operativas",
    aprobado: true,
    turnoAnterior: "Mañana",
    turnoNuevo: "Tarde"
  }
]

export function LMSDataProvider({ children }: { children: ReactNode }) {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [contadores, setContadores] = useState<Contador[]>([])
  const [fichadas, setFichadas] = useState<Fichada[]>([])
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const storedTurnos = localStorage.getItem(TURNOS_KEY)
    const storedEmployees = localStorage.getItem(EMPLOYEES_KEY)
    const storedFichadas = localStorage.getItem(FICHADAS_KEY)
    const storedNovedades = localStorage.getItem(NOVEDADES_KEY)

    if (storedTurnos) {
      try {
        const parsedTurnos = JSON.parse(storedTurnos)
        if (Array.isArray(parsedTurnos) && parsedTurnos.length > 0) {
          setTurnos(parsedTurnos)
        } else {
          setTurnos(defaultTurnos)
          localStorage.setItem(TURNOS_KEY, JSON.stringify(defaultTurnos))
        }
      } catch {
        setTurnos(defaultTurnos)
        localStorage.setItem(TURNOS_KEY, JSON.stringify(defaultTurnos))
      }
    } else {
      setTurnos(defaultTurnos)
      localStorage.setItem(TURNOS_KEY, JSON.stringify(defaultTurnos))
    }

    const loadEmployees = () => {
      if (storedEmployees) {
        try {
          const parsedEmployees = JSON.parse(storedEmployees)
          if (Array.isArray(parsedEmployees)) {
            const existingUsernames = new Set<string>()
            const employeesWithCredentials = parsedEmployees
              .map((emp) => {
                const defaultEmployee = defaultEmployees.find(
                  (defaultEmp) => defaultEmp.id === emp.id
                )
                if (defaultEmployee && emp.nombre === defaultEmployee.nombre && emp.apellido === defaultEmployee.apellido) {
                  return {
                    ...emp,
                    username: defaultEmployee.username,
                    password: defaultEmployee.password,
                  }
                }
                return emp
              })
              .map((emp) => ensureEmployeeCredentials(emp, existingUsernames))

            setEmployees(employeesWithCredentials)
            localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employeesWithCredentials))
            return
          }
        } catch {
          // fall through to defaults
        }
      }

      const employeesWithCredentials = defaultEmployees.map((emp) =>
        ensureEmployeeCredentials(emp, new Set<string>())
      )
      setEmployees(employeesWithCredentials)
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employeesWithCredentials))
    }

    loadEmployees()

    const storedContadores = localStorage.getItem(CONTADORES_KEY)
    if (storedContadores) {
      try {
        const parsedContadores = JSON.parse(storedContadores)
        if (Array.isArray(parsedContadores)) {
          setContadores(parsedContadores)
        } else {
          setContadores(defaultContadores)
          localStorage.setItem(CONTADORES_KEY, JSON.stringify(defaultContadores))
        }
      } catch {
        setContadores(defaultContadores)
        localStorage.setItem(CONTADORES_KEY, JSON.stringify(defaultContadores))
      }
    } else {
      setContadores(defaultContadores)
      localStorage.setItem(CONTADORES_KEY, JSON.stringify(defaultContadores))
    }

    if (storedFichadas) {
      try {
        const parsedFichadas = JSON.parse(storedFichadas)
        if (Array.isArray(parsedFichadas)) {
          setFichadas(parsedFichadas)
        } else {
          setFichadas([])
          localStorage.setItem(FICHADAS_KEY, JSON.stringify([]))
        }
      } catch {
        setFichadas([])
        localStorage.setItem(FICHADAS_KEY, JSON.stringify([]))
      }
    } else {
      setFichadas([])
      localStorage.setItem(FICHADAS_KEY, JSON.stringify([]))
    }

    if (storedNovedades) {
      try {
        const parsedNovedades = JSON.parse(storedNovedades)
        if (Array.isArray(parsedNovedades)) {
          setNovedades(parsedNovedades)
        } else {
          setNovedades([])
          localStorage.setItem(NOVEDADES_KEY, JSON.stringify([]))
        }
      } catch {
        setNovedades([])
        localStorage.setItem(NOVEDADES_KEY, JSON.stringify([]))
      }
    } else {
      setNovedades([])
      localStorage.setItem(NOVEDADES_KEY, JSON.stringify([]))
    }

    setIsLoaded(true)
  }, [])
  //localStorage.clear()
  /*borrar hasta aca*/

  // Update employee turno status
  const getEstadoTurno = useCallback(
    (emp: Omit<Employee, "id"> | Employee): "actualizado" | "desactualizado" => {
      const hoy = new Date()
      hoy.setHours(0, 0, 0, 0)

      if (emp.turnoId) {
        const turno = turnos.find((t) => t.id === emp.turnoId)
        if (!turno) return "desactualizado"
        if (turno.tipo === "rotativo") {
          const fechaFin = turno.fechaFin ? parseLocalDate(turno.fechaFin) : null
          return !fechaFin || hoy <= fechaFin ? "actualizado" : "desactualizado"
        }
        return "actualizado"
      }

      if (emp.turnoRotativo && emp.turnoRotativo.turnos.length > 0) {
        const esValido = emp.turnoRotativo.turnos.every((turnoId) => {
          const turno = turnos.find((t) => t.id === turnoId)
          if (!turno || turno.tipo !== "rotativo") return false
          const fechaFin = turno.fechaFin ? parseLocalDate(turno.fechaFin) : null
          return !fechaFin || hoy <= fechaFin
        })
        return esValido ? "actualizado" : "desactualizado"
      }

      return "desactualizado"
    },
    [turnos]
  )

  useEffect(() => {
    if (isLoaded) {
      setEmployees((prev) => prev.map((emp) => ({ ...emp, estadoTurno: getEstadoTurno(emp) })))
    }
  }, [turnos, isLoaded, getEstadoTurno])

  // Save to localStorage whenever data changes
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(TURNOS_KEY, JSON.stringify(turnos))
    }
  }, [turnos, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(employees))
    }
  }, [employees, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(CONTADORES_KEY, JSON.stringify(contadores))
    }
  }, [contadores, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(FICHADAS_KEY, JSON.stringify(fichadas))
    }
  }, [fichadas, isLoaded])

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(NOVEDADES_KEY, JSON.stringify(novedades))
    }
  }, [novedades, isLoaded])

  // Turno functions
  const addTurno = useCallback((turno: Omit<Turno, "id">) => {
    const newTurno: Turno = { ...turno, id: crypto.randomUUID() }
    setTurnos((prev) => [...prev, newTurno])
  }, [])

  const updateTurno = useCallback((id: string, data: Partial<Turno>) => {
    setTurnos((prev) => prev.map((t) => (t.id === id ? { ...t, ...data } : t)))
  }, [])

  const deleteTurno = useCallback((id: string) => {
    setTurnos((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const getTurnoById = useCallback((id: string) => {
    return turnos.find((t) => t.id === id)
  }, [turnos])

  // Employee functions
  const addEmployee = useCallback(
    (employee: Omit<Employee, "id">): Employee => {
      const estadoTurno = getEstadoTurno(employee)
      const existingUsernames = new Set(
        [...employees, ...contadores]
          .map((u) => u.username?.toLowerCase())
          .filter((username): username is string => Boolean(username))
      )
      // Si el admin cargó usuario/contraseña, se respetan; si no, se autogeneran.
      const providedUsername = employee.username?.trim()
      const providedPassword = employee.password?.trim()
      const username =
        providedUsername ||
        generateEmployeeCredentials(employee.nombre, employee.apellido, existingUsernames).username
      const password = providedPassword || username
      const newEmployee: Employee = {
        ...employee,
        id: crypto.randomUUID(),
        estadoTurno,
        username,
        password,
      }
      setEmployees((prev) => [...prev, newEmployee])
      return newEmployee
    },
    [getEstadoTurno, employees, contadores]
  )

  const updateEmployee = useCallback((id: string, data: Partial<Employee>) => {
    setEmployees((prev) =>
      prev.map((emp) => {
        if (emp.id !== id) return emp

        // El admin controla las credenciales: si vienen con valor, se usan;
        // si llegan vacías, se conservan las existentes.
        const username = data.username?.trim() || emp.username
        const password = data.password?.trim() || emp.password

        return {
          ...emp,
          ...data,
          username,
          password,
        }
      })
    )
  }, [])

  const deleteEmployee = useCallback((id: string) => {
    setEmployees((prev) => prev.filter((emp) => emp.id !== id))
  }, [])

  const darDeBajaEmployee = useCallback((id: string, fechaBaja: string) => {
    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? { ...emp, estado: "inactivo", fechaBaja } : emp))
    )
  }, [])

  const getEmployeeById = useCallback((id: string) => {
    return employees.find((emp) => emp.id === id)
  }, [employees])

  // Valida que un usuario no esté tomado por otro empleado, contador o usuario reservado.
  const isUsernameTaken = useCallback(
    (username: string, excludeId?: string): boolean => {
      const normalized = normalizeUserCredential(username).toLowerCase()
      if (!normalized) return false

      // El registro en edición puede conservar su propio usuario (incluso si es reservado).
      const self = [...employees, ...contadores].find((u) => u.id === excludeId)
      if (self?.username && normalizeUserCredential(self.username).toLowerCase() === normalized) {
        return false
      }

      const taken = new Set<string>(RESERVED_USERNAMES)
      employees.forEach((e) => {
        if (e.id !== excludeId && e.username) taken.add(normalizeUserCredential(e.username).toLowerCase())
      })
      contadores.forEach((c) => {
        if (c.id !== excludeId && c.username) taken.add(normalizeUserCredential(c.username).toLowerCase())
      })
      return taken.has(normalized)
    },
    [employees, contadores]
  )

  // Contador functions
  const addContador = useCallback(
    (contador: Omit<Contador, "id">): Contador => {
      const existingUsernames = new Set(
        [...employees, ...contadores]
          .map((u) => u.username?.toLowerCase())
          .filter((username): username is string => Boolean(username))
      )
      // Si el admin cargó usuario/contraseña, se respetan; si no, se autogeneran.
      const providedUsername = contador.username?.trim()
      const providedPassword = contador.password?.trim()
      const username =
        providedUsername ||
        generateEmployeeCredentials(contador.nombre, contador.apellido, existingUsernames).username
      const password = providedPassword || username
      const newContador: Contador = {
        ...contador,
        id: crypto.randomUUID(),
        username,
        password,
      }
      setContadores((prev) => [...prev, newContador])
      return newContador
    },
    [employees, contadores]
  )

  const updateContador = useCallback((id: string, data: Partial<Contador>) => {
    setContadores((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c
        const username = data.username?.trim() || c.username
        const password = data.password?.trim() || c.password
        return { ...c, ...data, username, password }
      })
    )
  }, [])

  const deleteContador = useCallback((id: string) => {
    setContadores((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const assignTurno = useCallback(
    (empleadoId: string, turnoId: string) => {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === empleadoId
            ? {
                ...emp,
                turnoId,
                turnoRotativo: undefined,
                estadoTurno: getEstadoTurno({ ...emp, turnoId, turnoRotativo: undefined }),
              }
            : emp
        )
      )
    },
    [getEstadoTurno]
  )

  const assignTurnoRotativo = useCallback(
    (empleadoId: string, turnoIds: string[]) => {
      setEmployees((prev) =>
        prev.map((emp) =>
          emp.id === empleadoId
            ? {
                ...emp,
                turnoId: undefined,
                turnoRotativo: { turnos: turnoIds, semanaActual: 0 },
                estadoTurno: getEstadoTurno({ ...emp, turnoId: undefined, turnoRotativo: { turnos: turnoIds, semanaActual: 0 } }),
              }
            : emp
        )
      )
    },
    [getEstadoTurno]
  )

  const getEmployeeStats = useCallback(
    (empleadoId: string, fechaInicio: string, fechaFin: string): EmployeeStats => {
      const empFichadas = fichadas.filter(
        (f) => f.empleadoId === empleadoId && f.fecha >= fechaInicio && f.fecha <= fechaFin
      )
      const empNovedades = novedades.filter(
        (n) => n.empleadoId === empleadoId && n.fecha >= fechaInicio && n.fecha <= fechaFin
      )

      const diasTrabajados = new Set(
        empFichadas.filter((f) => f.tipo === "entrada").map((f) => f.fecha)
      ).size

      const horasNormales = diasTrabajados * 8

      const minutosExtraTotal = empFichadas
        .filter((f) => f.minutosExtra && f.minutosExtra > 0)
        .reduce((sum, f) => sum + (f.minutosExtra || 0), 0)
      const horasExtra = Math.floor(minutosExtraTotal / 60)

      const tardanzas = empFichadas.filter((f) => f.esTardanza).length

      const ausencias = getEmployeeExpectedAbsences(
        employees.find((emp) => emp.id === empleadoId)!,
        fechaInicio,
        fechaFin,
        empFichadas,
        empNovedades
      )
      const licencias = empNovedades.filter(
        (n) => n.tipo === "licencia" || n.tipo === "vacaciones" || n.tipo === "enfermedad"
      ).length
      const suspensiones = empNovedades.filter((n) => n.tipo === "suspension").length

      return { diasTrabajados, horasNormales, horasExtra, tardanzas, ausencias, licencias, suspensiones }
    },
    [employees, fichadas, novedades]
  )

  const parseTimeToMinutes = (time: string): number => {
    const parts = String(time)
      .trim()
      .split(":")
      .map((part) => Number(part.trim()))

    const hour = Number.isFinite(parts[0]) ? parts[0] : 0
    const minute = Number.isFinite(parts[1]) ? parts[1] : 0
    return hour * 60 + minute
  }

  const toDate = (fecha: string): Date => {
    return parseLocalDate(fecha)
  }

  const formatDate = (date: Date): string => {
    return toLocalISODate(date)
  }

  const isEmployeeWorkday = (employee: Employee, date: Date): boolean => {
    const weekday = date.getDay()

    if (employee.turnoId) {
      const turno = turnos.find((t) => t.id === employee.turnoId)
      if (turno) {
        const activeStart = turno.fechaInicio ? toDate(turno.fechaInicio) : undefined
        const activeEnd = turno.fechaFin ? toDate(turno.fechaFin) : undefined
        const withinRange = (!activeStart || date >= activeStart) && (!activeEnd || date <= activeEnd)

        if (withinRange) {
          if (turno.tipo === "fijo" && turno.diasSemana?.length) {
            return turno.diasSemana.includes(weekday)
          }
          if (turno.tipo === "rotativo" && turno.configuracionesDiarias?.length) {
            return turno.configuracionesDiarias.some((config) => config.dia === weekday)
          }
        }
      }
    }

    if (employee.diasDescanso?.length) {
      return !employee.diasDescanso.includes(weekday)
    }

    return true
  }

  const isJustifiedNonAttendance = (novedad: Novedad): boolean => {
    return ["licencia", "vacaciones", "enfermedad", "suspension", "feriado", "justificativo"].includes(
      novedad.tipo
    )
  }

  const getEmployeeExpectedAbsences = (
    employee: Employee,
    fechaInicio: string,
    fechaFin: string,
    empFichadas: Fichada[],
    empNovedades: Novedad[]
  ): number => {
    if (employee.estado !== "activo") return 0

    const ingreso = toDate(employee.fechaIngreso)
    const start = toDate(fechaInicio)
    const end = toDate(fechaFin)
    const today = toDate(todayLocalISODate())

    const periodStart = ingreso > start ? ingreso : start
    let periodEnd = end
    if (employee.fechaBaja) {
      const baja = toDate(employee.fechaBaja)
      periodEnd = baja < periodEnd ? baja : periodEnd
    }
    if (periodEnd > today) {
      periodEnd = today
    }
    if (periodEnd < periodStart) return 0

    const attendanceDates = new Set(
      empFichadas.filter((f) => f.tipo === "entrada").map((f) => f.fecha)
    )

    const nonAttendanceDates = new Set(
      empNovedades.filter(isJustifiedNonAttendance).map((n) => n.fecha)
    )

    let absences = 0
    const current = new Date(periodStart)

    while (current <= periodEnd) {
      const dateStr = formatDate(current)

      if (isEmployeeWorkday(employee, current)) {
        if (!attendanceDates.has(dateStr) && !nonAttendanceDates.has(dateStr)) {
          absences += 1
        }
      }

      current.setDate(current.getDate() + 1)
    }

    return absences
  }

  // Check for incomplete shifts (entrada sin salida)
  const checkIncompleteShifts = (empleadoId: string, fecha: string, currentFichadas: Fichada[]): Novedad | null => {
    const fichadasDelDia = currentFichadas.filter(f => f.empleadoId === empleadoId && f.fecha === fecha)
    const tieneEntrada = fichadasDelDia.some(f => f.tipo === "entrada")
    const tieneSalida = fichadasDelDia.some(f => f.tipo === "salida")
    
    if (tieneEntrada && !tieneSalida) {
      const employee = employees.find(e => e.id === empleadoId)
      const entrada = fichadasDelDia.find(f => f.tipo === "entrada")
      if (employee && entrada) {
        return {
          id: crypto.randomUUID(),
          empleadoId,
          empleadoNombre: employee.nombre + " " + employee.apellido,
          tipo: "fichaIncompleta",
          fecha,
          descripcion: `Entrada registrada a las ${entrada.hora} pero sin fichada de salida. Jornada incompleta.`,
          aprobado: false,
        }
      }
    }
    return null
  }

  // Check for insufficient hours worked (media ausencia/ausencia por horas)
  const checkUnderHoursWorked = (empleadoId: string, fecha: string, currentFichadas: Fichada[]): Novedad | null => {
    const employee = employees.find(e => e.id === empleadoId)
    if (!employee) return null

    const fichadasDelDia = currentFichadas.filter(f => f.empleadoId === empleadoId && f.fecha === fecha && (f.tipo === "entrada" || f.tipo === "salida"))
    
    if (fichadasDelDia.length < 2) return null // Necesita al menos entrada y salida

    const entrada = fichadasDelDia.find(f => f.tipo === "entrada")
    const salida = fichadasDelDia.find(f => f.tipo === "salida")
    
    if (!entrada || !salida) return null

    const minEntrada = parseTimeToMinutes(entrada.hora)
    const minSalida = parseTimeToMinutes(salida.hora)
    const minutosTrabajados = minSalida - minEntrada
    
    // Jornada esperada es 8 horas = 480 minutos
    const minutosEsperados = 480
    const porcentajeTrabajado = minutosTrabajados / minutosEsperados

    // Si trabajó menos del 50% = ausencia
    // Si trabajó 50-99% = media ausencia
    if (porcentajeTrabajado < 0.5) {
      return {
        id: crypto.randomUUID(),
        empleadoId,
        empleadoNombre: employee.nombre + " " + employee.apellido,
        tipo: "ausencia",
        fecha,
        descripcion: `Trabajó solo ${Math.round(porcentajeTrabajado * 100)}% de la jornada (${Math.floor(minutosTrabajados / 60)}h ${minutosTrabajados % 60}min)`,
        aprobado: false,
      }
    } else if (porcentajeTrabajado < 1) {
      return {
        id: crypto.randomUUID(),
        empleadoId,
        empleadoNombre: employee.nombre + " " + employee.apellido,
        tipo: "mediaAusencia",
        fecha,
        descripcion: `Media ausencia: trabajó ${Math.round(porcentajeTrabajado * 100)}% de la jornada (${Math.floor(minutosTrabajados / 60)}h ${minutosTrabajados % 60}min)`,
        aprobado: false,
      }
    }

    return null
  }

  // Funciones de validación de fichadas
  const detectarDuplicados = useCallback(
    (empleadoId: string, fecha: string, tipo: TipoFichada, hora: string): boolean => {
      const fichadasDelDia = fichadas.filter(
        (f) => f.empleadoId === empleadoId && f.fecha === fecha && f.tipo === tipo
      )

      if (fichadasDelDia.length === 0) return false

      // Convertir hora a minutos para comparación
      const horaMinutos = parseTimeToMinutes(hora)

      // Si hay fichadas del mismo tipo, verificar tolerancia de 2 minutos
      const esDuplicado = fichadasDelDia.some((f) => {
        const fichadaMinutos = parseTimeToMinutes(f.hora)
        const diferencia = Math.abs(horaMinutos - fichadaMinutos)
        return diferencia < 2
      })

      return esDuplicado
    },
    [fichadas]
  )

  const validarAlternancia = useCallback(
    (empleadoId: string, fecha: string, tipo: TipoFichada, hora: string): { valido: boolean; error?: string } => {
      const fichadasDelDia = fichadas.filter(
        (f) => f.empleadoId === empleadoId && f.fecha === fecha && (f.tipo === "entrada" || f.tipo === "salida")
      )

      if (fichadasDelDia.length === 0) {
        // Primera fichada del día
        if (tipo === "salida") {
          // Para salida como primera fichada, permitir si hay entrada del día anterior
          const diaAnterior = new Date(fecha)
          diaAnterior.setDate(diaAnterior.getDate() - 1)
          const fechaAnterior = diaAnterior.toISOString().split('T')[0]
          
          const fichadasDiaAnterior = fichadas.filter(
            (f) => f.empleadoId === empleadoId && f.fecha === fechaAnterior && (f.tipo === "entrada" || f.tipo === "salida")
          )
          
          const entradas = fichadasDiaAnterior.filter((f) => f.tipo === "entrada")
          const salidas = fichadasDiaAnterior.filter((f) => f.tipo === "salida")
          
          // Válido si hay entrada(s) en día anterior y más entradas que salidas (entrada sin salida)
          if (entradas.length > 0 && entradas.length > salidas.length) {
            return { valido: true }
          }
          
          return { valido: false, error: "La primera fichada del día debe ser de tipo Entrada (no hay entrada del día anterior)" }
        }
        return { valido: true }
      }

      const horaMinutos = parseTimeToMinutes(hora)

      if (tipo === "entrada") {
        // Nueva Entrada: Si es la primera del día, siempre es válida
        // Si es segunda o más, requiere Salida intermedia (la nueva entrada debe ser posterior a la última salida)
        const entradas = fichadasDelDia
          .filter((f) => f.tipo === "entrada")
          .map((f) => parseTimeToMinutes(f.hora))
          .sort((a, b) => a - b)
        const salidas = fichadasDelDia
          .filter((f) => f.tipo === "salida")
          .map((f) => parseTimeToMinutes(f.hora))
          .sort((a, b) => a - b)

        // Primera Entrada del día: siempre válida (la anterior podría estar en día anterior para turnos nocturnos)
        if (entradas.length === 0) {
          return { valido: true }
        }

        // Segunda Entrada o más: requiere Salida intermedia (debe ser posterior a la última salida)
        if (salidas.length === 0) {
          return { valido: false, error: "No se puede registrar una segunda Entrada sin una Salida previa" }
        }

        const ultimaSalida = salidas[salidas.length - 1]

        // La nueva entrada debe ser posterior a la última salida
        if (!(ultimaSalida < horaMinutos)) {
          return {
            valido: false,
            error: `Cronología inválida. La nueva Entrada debe ser posterior a la última Salida (${Math.floor(ultimaSalida / 60).toString().padStart(2, '0')}:${(ultimaSalida % 60).toString().padStart(2, '0')})`
          }
        }
      } else if (tipo === "salida") {
        // Nueva Salida: debe ser posterior a la última Entrada del día
        // Si no hay entrada en el día actual, puede ser salida de turno nocturno (entrada del día anterior)
        const entradas = fichadasDelDia
          .filter((f) => f.tipo === "entrada")
          .map((f) => parseTimeToMinutes(f.hora))
          .sort((a, b) => a - b)
        const salidas = fichadasDelDia
          .filter((f) => f.tipo === "salida")
          .map((f) => parseTimeToMinutes(f.hora))
          .sort((a, b) => a - b)

        // Si no hay entrada en el día actual, buscar si hay entrada sin cerrar del día anterior (turnos nocturnos)
        if (entradas.length === 0) {
          const diaAnterior = new Date(fecha)
          diaAnterior.setDate(diaAnterior.getDate() - 1)
          const fechaAnterior = diaAnterior.toISOString().split('T')[0]
          
          const fichadasDiaAnterior = fichadas.filter(
            (f) => f.empleadoId === empleadoId && f.fecha === fechaAnterior && (f.tipo === "entrada" || f.tipo === "salida")
          )
          
          const entradasDiaAnterior = fichadasDiaAnterior.filter((f) => f.tipo === "entrada")
          const salidasDiaAnterior = fichadasDiaAnterior.filter((f) => f.tipo === "salida")
          
          // Válido si hay entrada(s) en día anterior y más entradas que salidas (entrada sin salida)
          if (entradasDiaAnterior.length > 0 && entradasDiaAnterior.length > salidasDiaAnterior.length) {
            return { valido: true }
          }
          
          return { valido: false, error: "No se puede registrar una Salida sin una Entrada previa" }
        }

        const ultimaEntrada = entradas[entradas.length - 1]

        // La nueva salida debe ser posterior a la última entrada
        if (!(ultimaEntrada < horaMinutos)) {
          return {
            valido: false,
            error: `Cronología inválida. La Salida debe ser posterior a la última Entrada (${Math.floor(ultimaEntrada / 60).toString().padStart(2, '0')}:${(ultimaEntrada % 60).toString().padStart(2, '0')})`
          }
        }
      }

      return { valido: true }
    },
    [fichadas]
  )

  // Fichada functions
  const interpretarFichada = useCallback(
    (fichada: Omit<Fichada, "id" | "esTardanza" | "minutosExtra">): Omit<Fichada, "id"> => {
      const employee = employees.find((e) => e.id === fichada.empleadoId)
      let esTardanza = false
      let minutosExtra = 0

      if (employee?.turnoId && (fichada.tipo === "entrada" || fichada.tipo === "salida")) {
        const turno = turnos.find((t) => t.id === employee.turnoId)
        if (turno) {
          // Verificar si el turno es válido para la fecha
          const fechaFichada = parseLocalDate(fichada.fecha)
          const hoy = new Date()
          hoy.setHours(0, 0, 0, 0)
          const fechaInicio = turno.fechaInicio ? parseLocalDate(turno.fechaInicio) : null
          const fechaFin = turno.fechaFin ? parseLocalDate(turno.fechaFin) : null
          const esValido = (!fechaInicio || fechaFichada >= fechaInicio) && (!fechaFin || fechaFichada <= fechaFin)

          if (esValido) {
            let horaEntradaTurno: string | undefined
            let horaSalidaTurno: string | undefined

            if (turno.tipo === "fijo" || turno.tipo === "reducida") {
              horaEntradaTurno = turno.horaEntrada
              horaSalidaTurno = turno.horaSalida
            } else if (turno.tipo === "rotativo" && turno.configuracionesDiarias) {
              const diaSemana = fechaFichada.getDay() // 0=Domingo, 1=Lunes, etc
              const configDia = turno.configuracionesDiarias.find(c => c.dia === diaSemana)
              if (configDia) {
                horaEntradaTurno = configDia.horaEntrada
                horaSalidaTurno = configDia.horaSalida
              }
            } else if (turno.tipo === "flexible") {
              if (fichada.tipo === "entrada") {
                horaEntradaTurno = turno.horaEntradaFin // Para tardanza, usar el fin del rango
              } else if (fichada.tipo === "salida") {
                horaSalidaTurno = turno.horaSalidaFin // Para tolerancia de salida
              }
            }

            if (horaEntradaTurno && horaSalidaTurno) {
              const toleranciaEntrada =
                typeof turno.toleranciaEntradaMinutos === "number"
                  ? turno.toleranciaEntradaMinutos
                  : turno.toleranciaMinutos ?? 0
              const toleranciaSalida =
                typeof turno.toleranciaSalidaMinutos === "number"
                  ? turno.toleranciaSalidaMinutos
                  : turno.toleranciaMinutos ?? 0

              if (fichada.tipo === "entrada") {
                const turnoMinutos = parseTimeToMinutes(horaEntradaTurno) + toleranciaEntrada
                const fichadaMinutos = parseTimeToMinutes(fichada.hora)
                esTardanza = fichadaMinutos > turnoMinutos
              } else if (fichada.tipo === "salida") {
                if (turno.tipo === "flexible" && turno.horasTotales) {
                  // Para flexible, calcular horas trabajadas
                  const entradaHoy = fichadas.find(f =>
                    f.empleadoId === fichada.empleadoId &&
                    f.fecha === fichada.fecha &&
                    f.tipo === "entrada"
                  )
                  if (entradaHoy) {
                    const minutosEntrada = parseTimeToMinutes(entradaHoy.hora)
                    const minutosSalida = parseTimeToMinutes(fichada.hora)
                    const minutosTrabajados = minutosSalida - minutosEntrada
                    const minutosTotales = turno.horasTotales * 60
                    minutosExtra = Math.max(0, minutosTrabajados - minutosTotales)
                  }
                } else {
                  // Para fijo y rotativo, usar lógica existente
                  const turnoMinutos = parseTimeToMinutes(horaSalidaTurno) + toleranciaSalida
                  const fichadaMinutos = parseTimeToMinutes(fichada.hora)
                  minutosExtra = Math.max(0, fichadaMinutos - turnoMinutos)
                }
              }
            }
          }
        }
      }

      return { ...fichada, esTardanza, minutosExtra }
    },
    [employees, turnos]
  )

  const addFichada = useCallback(
    (fichada: Omit<Fichada, "id">): { success: boolean; error?: string } => {
      // Detectar duplicados PRIMERO
      const esDuplicado = detectarDuplicados(fichada.empleadoId, fichada.fecha, fichada.tipo, fichada.hora)

      // Si NO es duplicado, validar alternancia; si falla, devolver error atrapable por la UI
      if (!esDuplicado && (fichada.tipo === "entrada" || fichada.tipo === "salida")) {
        const validacion = validarAlternancia(fichada.empleadoId, fichada.fecha, fichada.tipo, fichada.hora)
        if (!validacion.valido) {
          return { success: false, error: validacion.error ?? "Fichada rechazada por regla de alternancia" }
        }
      }

      // Interpretar fichada
      const interpretada = interpretarFichada(fichada)

      // Si hay duplicado, marcar como pendiente; si no, respetar el estado original o usar "ok"
      const estadoFinal: EstadoFichada = esDuplicado ? "pendiente" : (fichada.estado || "ok")

      const newFichada: Fichada = { ...interpretada, id: crypto.randomUUID(), estado: estadoFinal }
      setFichadas((prev) => [newFichada, ...prev])

      // Auto-generate novedad for tardanza
      if (newFichada.esTardanza && newFichada.tipo === "entrada") {
        const novedadTardanza: Novedad = {
          id: crypto.randomUUID(),
          empleadoId: newFichada.empleadoId,
          empleadoNombre: newFichada.empleadoNombre,
          tipo: "tardanza",
          fecha: newFichada.fecha,
          descripcion: `Llegada tarde registrada a las ${newFichada.hora}`,
          aprobado: false,
        }
        setNovedades((prev) => [novedadTardanza, ...prev])
      }

      // Auto-generate novedad for hora extra
      if (newFichada.minutosExtra && newFichada.minutosExtra > 0 && newFichada.tipo === "salida") {
        const turno = employees
          .find((e) => e.id === newFichada.empleadoId)
          ?.turnoId
          ? turnos.find((t) => t.id === employees.find((e) => e.id === newFichada.empleadoId)?.turnoId!)
          : undefined
        const umbralHorasExtra = turno?.umbralHorasExtra ?? 30
        if (newFichada.minutosExtra > umbralHorasExtra) {
          const novedadExtra: Novedad = {
            id: crypto.randomUUID(),
            empleadoId: newFichada.empleadoId,
            empleadoNombre: newFichada.empleadoNombre,
            tipo: "horaExtra",
            fecha: newFichada.fecha,
            descripcion: `${Math.floor(newFichada.minutosExtra / 60)}h ${newFichada.minutosExtra % 60}min extra`,
            aprobado: false,
          }
          setNovedades((prev) => [novedadExtra, ...prev])
        }
      }

      // Auto-generate novedad for insufficient hours worked (ausencia/mediaAusencia)
      if (newFichada.tipo === "salida") {
        const allFichadas = [...fichadas, newFichada]
        const novedadAusencia = checkUnderHoursWorked(newFichada.empleadoId, newFichada.fecha, allFichadas)
        if (novedadAusencia) {
          // Verificar si ya existe una novedad de ausencia para este empleado en esta fecha
          const novedadExistente = novedades.find(
            n => n.empleadoId === newFichada.empleadoId &&
                 n.fecha === newFichada.fecha &&
                 (n.tipo === "ausencia" || n.tipo === "mediaAusencia")
          )

          if (!novedadExistente) {
            setNovedades((prev) => [novedadAusencia, ...prev])
          }
        }
      }

      return { success: true }
    },
    [interpretarFichada, employees, turnos, checkUnderHoursWorked, fichadas, novedades, validarAlternancia, detectarDuplicados]
  )

  const addFichadasMasivas = useCallback(
    (fichadasNuevas: Omit<Fichada, "id">[]) => {
      // Validar cada fichada: detectar duplicados PRIMERO, luego validar alternancia si no es duplicado
      const fichadasValidadas = fichadasNuevas.filter((f) => {
        const esDuplicado = detectarDuplicados(f.empleadoId, f.fecha, f.tipo, f.hora)
        
        // Si NO es duplicado, validar alternancia
        if (!esDuplicado && (f.tipo === "entrada" || f.tipo === "salida")) {
          const validacion = validarAlternancia(f.empleadoId, f.fecha, f.tipo, f.hora)
          if (!validacion.valido) {
            console.warn(`Fichada rechazada - ${validacion.error}`)
            return false
          }
        }
        return true
      })

      const nuevasFichadas: Fichada[] = fichadasValidadas.map((f) => {
        const interpretada = interpretarFichada(f)
        const esDuplicado = detectarDuplicados(f.empleadoId, f.fecha, f.tipo, f.hora)
        const estado: EstadoFichada = esDuplicado ? "pendiente" : "ok"
        return {
          ...interpretada,
          id: crypto.randomUUID(),
          estado,
        }
      })

      const nuevasNovedades: Novedad[] = []

      nuevasFichadas.forEach((newFichada) => {
        if (newFichada.esTardanza && newFichada.tipo === "entrada") {
          nuevasNovedades.push({
            id: crypto.randomUUID(),
            empleadoId: newFichada.empleadoId,
            empleadoNombre: newFichada.empleadoNombre,
            tipo: "tardanza",
            fecha: newFichada.fecha,
            descripcion: `Llegada tarde registrada a las ${newFichada.hora}`,
            aprobado: false,
          })
        }

        if (newFichada.minutosExtra && newFichada.minutosExtra > 0 && newFichada.tipo === "salida") {
          const employee = employees.find((e) => e.id === newFichada.empleadoId)
          const turno = employee?.turnoId
            ? turnos.find((t) => t.id === employee.turnoId)
            : undefined
          const umbralHorasExtra = turno?.umbralHorasExtra ?? 30
          if (newFichada.minutosExtra > umbralHorasExtra) {
            nuevasNovedades.push({
              id: crypto.randomUUID(),
              empleadoId: newFichada.empleadoId,
              empleadoNombre: newFichada.empleadoNombre,
              tipo: "horaExtra",
              fecha: newFichada.fecha,
              descripcion: `${Math.floor(newFichada.minutosExtra / 60)}h ${newFichada.minutosExtra % 60}min extra`,
              aprobado: false,
            })
          }
        }
      })

      // Combinar fichadas existentes con las nuevas para verificar ausencias
      const allFichadas = [...fichadas, ...nuevasFichadas]

      // Verificar ausencias por horas insuficientes para cada empleado que tenga fichadas nuevas
      const empleadosConFichadasNuevas = [...new Set(nuevasFichadas.map(f => f.empleadoId))]
      
      empleadosConFichadasNuevas.forEach(empleadoId => {
        const fechasUnicas = [...new Set(nuevasFichadas.filter(f => f.empleadoId === empleadoId).map(f => f.fecha))]
        
        fechasUnicas.forEach(fecha => {
          const novedadAusencia = checkUnderHoursWorked(empleadoId, fecha, allFichadas)
          if (novedadAusencia) {
            // Verificar si ya existe una novedad de ausencia para este empleado en esta fecha
            const novedadExistente = [...novedades, ...nuevasNovedades].find(
              n => n.empleadoId === empleadoId && 
                   n.fecha === fecha && 
                   (n.tipo === "ausencia" || n.tipo === "mediaAusencia")
            )
            
            if (!novedadExistente) {
              nuevasNovedades.push(novedadAusencia)
            }
          }
        })
      })

      setFichadas((prev) => [...nuevasFichadas, ...prev])
      if (nuevasNovedades.length > 0) {
        setNovedades((prev) => [...nuevasNovedades, ...prev])
      }
    },
    [interpretarFichada, employees, turnos, checkUnderHoursWorked, fichadas, novedades, validarAlternancia, detectarDuplicados]
  )

  const deleteFichada = useCallback((id: string) => {
    setFichadas((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const getFichadasHoy = useCallback(() => {
    const today = todayLocalISODate()
    return fichadas.filter((f) => f.fecha === today).sort((a, b) => b.hora.localeCompare(a.hora))
  }, [fichadas])

  const getFichadasByEmployee = useCallback(
    (empleadoId: string) => {
      return fichadas.filter((f) => f.empleadoId === empleadoId)
    },
    [fichadas]
  )

  const getFichadasByEmployeeAndPeriod = useCallback(
    (empleadoId: string, fechaInicio: string, fechaFin: string) => {
      return fichadas.filter(
        (f) => f.empleadoId === empleadoId && f.fecha >= fechaInicio && f.fecha <= fechaFin
      )
    },
    [fichadas]
  )

  const getFichadasByMonth = useCallback(
    (year: number, month: number) => {
      return fichadas.filter((f) => {
        const date = parseLocalDate(f.fecha)
        return date.getFullYear() === year && date.getMonth() === month
      })
    },
    [fichadas]
  )

  const getFichadasByPeriod = useCallback(
    (fechaInicio: string, fechaFin: string) => {
      return fichadas.filter((f) => f.fecha >= fechaInicio && f.fecha <= fechaFin)
    },
    [fichadas]
  )

  const actualizarEstadoFichada = useCallback(
    (id: string, estado: EstadoFichada): { success: boolean; error?: string } => {
      const fichada = fichadas.find((f) => f.id === id)
      if (!fichada) return { success: false, error: "Fichada no encontrada" }

      // Validar alternancia cronológica estricta al aprobar (no limitada a un día)
      if (estado === "ok" && (fichada.tipo === "entrada" || fichada.tipo === "salida")) {
        const fichadaDt = fichada.fecha + " " + fichada.hora

        // Todas las fichadas ok del empleado (entrada/salida), ordenadas cronológicamente
        const fichadasOkOrdenadas = fichadas
          .filter((f) =>
            f.id !== id &&
            f.empleadoId === fichada.empleadoId &&
            (f.tipo === "entrada" || f.tipo === "salida") &&
            f.estado === "ok"
          )
          .sort((a, b) => (a.fecha + " " + a.hora).localeCompare(b.fecha + " " + b.hora))

        // Última fichada válida ANTERIOR al horario de la que se quiere aprobar
        const fichadasAnteriores = fichadasOkOrdenadas.filter(
          (f) => (f.fecha + " " + f.hora) < fichadaDt
        )
        const ultimaAnterior = fichadasAnteriores.length > 0
          ? fichadasAnteriores[fichadasAnteriores.length - 1]
          : null

        if (fichada.tipo === "entrada") {
          // No se puede aprobar Entrada si la última fichada ok anterior fue también Entrada
          if (ultimaAnterior && ultimaAnterior.tipo === "entrada") {
            return {
              success: false,
              error: "Inconsistencia cronológica: falta fichada intermedia para mantener la alternancia Entrada/Salida",
            }
          }
        } else if (fichada.tipo === "salida") {
          // No se puede aprobar Salida si no hay Entrada ok previa, o si la última ok anterior fue también Salida
          if (!ultimaAnterior || ultimaAnterior.tipo === "salida") {
            return {
              success: false,
              error: "Inconsistencia cronológica: falta fichada intermedia para mantener la alternancia Entrada/Salida",
            }
          }
        }
      }

      // Preservar trazabilidad: solo se actualiza el estado; los datos crudos originales no se mutan
      setFichadas((prev) => prev.map((f) => (f.id === id ? { ...f, estado } : f)))
      return { success: true }
    },
    [fichadas]
  )

  // Novedad functions
  const addNovedad = useCallback((novedad: Omit<Novedad, "id">) => {
    const newNovedad: Novedad = { ...novedad, id: crypto.randomUUID() }
    setNovedades((prev) => [newNovedad, ...prev])
  }, [])

  const updateNovedad = useCallback((id: string, data: Partial<Novedad>) => {
    setNovedades((prev) => prev.map((n) => (n.id === id ? { ...n, ...data } : n)))
  }, [])

  const deleteNovedad = useCallback((id: string) => {
    setNovedades((prev) => prev.filter((n) => n.id !== id))
  }, [])

  const aprobarNovedad = useCallback((id: string, aprobadoPor: string) => {
    setNovedades((prev) =>
      prev.map((n) =>
        n.id === id
          ? { ...n, aprobado: true, aprobadoPor, fechaAprobacion: todayLocalISODate() }
          : n
      )
    )
  }, [])

  const getNovedadesByEmployee = useCallback(
    (empleadoId: string) => {
      return novedades.filter((n) => n.empleadoId === empleadoId)
    },
    [novedades]
  )

  const getNovedadesByEmployeeAndPeriod = useCallback(
    (empleadoId: string, fechaInicio: string, fechaFin: string) => {
      return novedades.filter(
        (n) => n.empleadoId === empleadoId && n.fecha >= fechaInicio && n.fecha <= fechaFin
      )
    },
    [novedades]
  )

  const getNovedadesPendientes = useCallback(() => {
    return novedades.filter((n) => !n.aprobado)
  }, [novedades])

  // Statistics
  const getStats = useCallback(() => {
    const today = todayLocalISODate()
    const fichadasHoy = fichadas.filter((f) => f.fecha === today)

    const presentesHoy = new Set(
      fichadasHoy.filter((f) => f.tipo === "entrada").map((f) => f.empleadoId)
    ).size

    const tardanzas = fichadasHoy.filter((f) => f.esTardanza).length

    const pendientes = novedades.filter((n) => !n.aprobado).length
    const enLicencia = employees.filter((e) => e.estado === "licencia").length
    const suspendidos = employees.filter((e) => e.estado === "suspendido").length

    return {
      totalEmpleados: employees.filter((e) => e.estado === "activo").length,
      presentesHoy,
      tardanzas,
      pendientes,
      enLicencia,
      suspendidos,
    }
  }, [employees, fichadas, novedades])

  // Monthly report calculation
  const getCierreMensual = useCallback(
    (year: number, month: number) => {
      const fichadasMes = getFichadasByMonth(year, month)

      return employees.map((emp) => {
        const empFichadas = fichadasMes.filter((f) => f.empleadoId === emp.id)
        const empNovedades = novedades.filter((n) => {
          const date = parseLocalDate(n.fecha)
          return n.empleadoId === emp.id && date.getFullYear() === year && date.getMonth() === month
        })

        const diasTrabajados = new Set(
          empFichadas.filter((f) => f.tipo === "entrada").map((f) => f.fecha)
        ).size

        const horasNormales = diasTrabajados * 8

        const minutosExtraTotal = empFichadas
          .filter((f) => f.minutosExtra && f.minutosExtra > 0)
          .reduce((sum, f) => sum + (f.minutosExtra || 0), 0)
        const horasExtra = Math.floor(minutosExtraTotal / 60)

        const tardanzas = empFichadas.filter((f) => f.esTardanza).length
        const ausencias = getEmployeeExpectedAbsences(
          emp,
          `${year}-${String(month + 1).padStart(2, "0")}-01`,
          `${year}-${String(month + 1).padStart(2, "0")}-${String(
            new Date(year, month + 1, 0).getDate()
          ).padStart(2, "0")}`,
          empFichadas,
          empNovedades
        )
        const licencias = empNovedades.filter(
          (n) => n.tipo === "licencia" || n.tipo === "vacaciones" || n.tipo === "enfermedad"
        ).length
        const suspensiones = empNovedades.filter((n) => n.tipo === "suspension").length

        return {
          empleadoId: emp.id,
          empleadoNombre: `${emp.nombre} ${emp.apellido}`,
          diasTrabajados,
          horasNormales,
          horasExtra,
          tardanzas,
          ausencias,
          licencias,
          suspensiones,
        }
      })
    },
    [employees, getFichadasByMonth, novedades]
  )

  const getCierrePorPeriodo = useCallback(
    (fechaInicio: string, fechaFin: string) => {
      const fichadasPeriodo = getFichadasByPeriod(fechaInicio, fechaFin)

      return employees.map((emp) => {
        const empFichadas = fichadasPeriodo.filter((f) => f.empleadoId === emp.id)
        const empNovedades = novedades.filter(
          (n) => n.empleadoId === emp.id && n.fecha >= fechaInicio && n.fecha <= fechaFin
        )

        const diasTrabajados = new Set(
          empFichadas.filter((f) => f.tipo === "entrada").map((f) => f.fecha)
        ).size

        const horasNormales = diasTrabajados * 8

        const minutosExtraTotal = empFichadas
          .filter((f) => f.minutosExtra && f.minutosExtra > 0)
          .reduce((sum, f) => sum + (f.minutosExtra || 0), 0)
        const horasExtra = Math.floor(minutosExtraTotal / 60)

        const tardanzas = empFichadas.filter((f) => f.esTardanza).length
        const ausencias = getEmployeeExpectedAbsences(
          emp,
          fechaInicio,
          fechaFin,
          empFichadas,
          empNovedades
        )
        const licencias = empNovedades.filter(
          (n) => n.tipo === "licencia" || n.tipo === "vacaciones" || n.tipo === "enfermedad"
        ).length
        const suspensiones = empNovedades.filter((n) => n.tipo === "suspension").length

        return {
          empleadoId: emp.id,
          empleadoNombre: `${emp.nombre} ${emp.apellido}`,
          diasTrabajados,
          horasNormales,
          horasExtra,
          tardanzas,
          ausencias,
          licencias,
          suspensiones,
        }
      })
    },
    [employees, getFichadasByPeriod, novedades]
  )

  return (
    <LMSDataContext.Provider
      value={{
        turnos,
        addTurno,
        updateTurno,
        deleteTurno,
        getTurnoById,
        employees,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        darDeBajaEmployee,
        getEmployeeById,
        assignTurno,
        assignTurnoRotativo,
        getEmployeeStats,
        contadores,
        addContador,
        updateContador,
        deleteContador,
        isUsernameTaken,
        fichadas,
        addFichada,
        addFichadasMasivas,
        deleteFichada,
        getFichadasHoy,
        getFichadasByEmployee,
        getFichadasByEmployeeAndPeriod,
        getFichadasByMonth,
        getFichadasByPeriod,
        interpretarFichada,
        actualizarEstadoFichada,
        validarAlternancia,
        detectarDuplicados,
        novedades,
        addNovedad,
        updateNovedad,
        deleteNovedad,
        aprobarNovedad,
        getNovedadesByEmployee,
        getNovedadesByEmployeeAndPeriod,
        getNovedadesPendientes,
        getStats,
        getCierreMensual,
        getCierrePorPeriodo,
        isLoaded,
      }}
    >
      {children}
    </LMSDataContext.Provider>
  )
}

export function useLMSData() {
  const context = useContext(LMSDataContext)
  if (context === undefined) {
    throw new Error("useLMSData must be used within a LMSDataProvider")
  }
  return context
}
