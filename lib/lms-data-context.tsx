"use client"

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react"

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
}

export type TipoFichada = "entrada" | "salida" | "inicioBreak" | "finBreak"
export type MetodoFichada = "biometrico" | "manual" | "api" | "tarjeta"

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
  addEmployee: (employee: Omit<Employee, "id">) => void
  updateEmployee: (id: string, data: Partial<Employee>) => void
  deleteEmployee: (id: string) => void
  darDeBajaEmployee: (id: string, fechaBaja: string) => void
  getEmployeeById: (id: string) => Employee | undefined
  assignTurno: (empleadoId: string, turnoId: string) => void
  assignTurnoRotativo: (empleadoId: string, turnoIds: string[]) => void
  getEmployeeStats: (empleadoId: string, fechaInicio: string, fechaFin: string) => EmployeeStats

  // Fichadas
  fichadas: Fichada[]
  addFichada: (fichada: Omit<Fichada, "id">) => void
  addFichadasMasivas: (fichadas: Omit<Fichada, "id">[]) => void
  deleteFichada: (id: string) => void
  getFichadasHoy: () => Fichada[]
  getFichadasByEmployee: (empleadoId: string) => Fichada[]
  getFichadasByEmployeeAndPeriod: (empleadoId: string, fechaInicio: string, fechaFin: string) => Fichada[]
  getFichadasByMonth: (year: number, month: number) => Fichada[]
  getFichadasByPeriod: (fechaInicio: string, fechaFin: string) => Fichada[]
  interpretarFichada: (fichada: Omit<Fichada, "id" | "esTardanza" | "minutosExtra">) => Omit<Fichada, "id">

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
const EMPLOYEES_KEY = "lms-employees"
const FICHADAS_KEY = "lms-fichadas"
const NOVEDADES_KEY = "lms-novedades"

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
    id: "1",
    legajo: "EMP001",
    nombre: "Juan",
    apellido: "Pérez",
    dni: "30456789",
    cuil: "20-30456789-5",
    departamento: "Producción",
    cargo: "Operario",
    categoriaLaboral: "Operario Calificado",
    convenio: "UOCRA",
    tipoJornada: "completa",
    fechaIngreso: "2022-03-15",
    estado: "activo",
    estadoTurno: "actualizado",
    email: "juan.perez@empresa.com",
    telefono: "1145678901",
    turnoId: "t5",
    diasDescanso: [0, 6],
    modalidadFichada: "biometrico"
  },
  {
    id: "2",
    legajo: "EMP002",
    nombre: "María",
    apellido: "González",
    dni: "31234567",
    cuil: "27-31234567-4",
    departamento: "Administración",
    cargo: "Contadora",
    categoriaLaboral: "Profesional",
    convenio: "Empleados de Comercio",
    tipoJornada: "completa",
    fechaIngreso: "2021-08-01",
    estado: "activo",
    estadoTurno: "actualizado",
    email: "maria.gonzalez@empresa.com",
    telefono: "1156789012",
    turnoId: "t4",
    diasDescanso: [0, 6],
    modalidadFichada: "todas"
  },
  {
    id: "3",
    legajo: "EMP003",
    nombre: "Carlos",
    apellido: "Rodríguez",
    dni: "29876543",
    cuil: "20-29876543-8",
    departamento: "Logística",
    cargo: "Supervisor",
    categoriaLaboral: "Supervisor",
    tipoJornada: "completa",
    fechaIngreso: "2020-01-10",
    estado: "activo",
    estadoTurno: "actualizado",
    email: "carlos.rodriguez@empresa.com",
    telefono: "1167890123",
    turnoId: "t1",
    diasDescanso: [0, 6],
    modalidadFichada: "biometrico"
  },
  {
    id: "4",
    legajo: "EMP004",
    nombre: "Ana",
    apellido: "Martínez",
    dni: "32109876",
    cuil: "27-32109876-2",
    departamento: "RRHH",
    cargo: "Analista RRHH",
    categoriaLaboral: "Administrativo",
    tipoJornada: "completa",
    fechaIngreso: "2023-02-20",
    estado: "licencia",
    estadoTurno: "actualizado",
    email: "ana.martinez@empresa.com",
    telefono: "1178901234",
    turnoId: "t4",
    diasDescanso: [0, 6],
    modalidadFichada: "todas"
  },
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
    modalidadFichada: "biometrico"
  },
]

const generateDefaultFichadas = (): Fichada[] => {
  const fichadas: Fichada[] = []
  const today = new Date()
  const metodos: MetodoFichada[] = ["biometrico", "manual", "tarjeta"]

  // Generate some fichadas for today
  defaultEmployees.slice(0, 4).forEach((emp) => {
    const baseHour = 8 + Math.floor(Math.random() * 2)
    const baseMinute = Math.floor(Math.random() * 30)
    const esTardanza = baseHour > 8 || (baseHour === 8 && baseMinute > 15)

    fichadas.push({
      id: `f-today-${emp.id}-in`,
      empleadoId: emp.id,
      empleadoNombre: `${emp.nombre} ${emp.apellido}`,
      tipo: "entrada",
      fecha: today.toISOString().split("T")[0],
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
    const dateStr = date.toISOString().split("T")[0]

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
    fecha: new Date().toISOString().split("T")[0],
    descripcion: "Llegó 45 minutos tarde por problemas de transporte",
    aprobado: false
  },
  {
    id: "n2",
    empleadoId: "3",
    empleadoNombre: "Carlos Rodríguez",
    tipo: "horaExtra",
    fecha: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    descripcion: "Realizó 2 horas extra para completar envío urgente",
    aprobado: true,
    aprobadoPor: "Admin",
    fechaAprobacion: new Date(Date.now() - 43200000).toISOString().split("T")[0]
  },
  {
    id: "n3",
    empleadoId: "5",
    empleadoNombre: "Roberto López",
    tipo: "ausencia",
    fecha: new Date(Date.now() - 172800000).toISOString().split("T")[0],
    descripcion: "Ausente sin aviso previo",
    aprobado: false
  },
  {
    id: "n4",
    empleadoId: "4",
    empleadoNombre: "Ana Martínez",
    tipo: "licencia",
    fecha: new Date(Date.now() - 432000000).toISOString().split("T")[0],
    fechaFin: new Date(Date.now() + 864000000).toISOString().split("T")[0],
    descripcion: "Licencia por maternidad",
    aprobado: true,
    aprobadoPor: "RRHH",
    fechaAprobacion: new Date(Date.now() - 604800000).toISOString().split("T")[0]
  },
  {
    id: "n5",
    empleadoId: "2",
    empleadoNombre: "María González",
    tipo: "justificativo",
    fecha: new Date(Date.now() - 259200000).toISOString().split("T")[0],
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
    fecha: new Date(Date.now() - 604800000).toISOString().split("T")[0],
    descripcion: "Cambio de turno mañana a tarde por necesidades operativas",
    aprobado: true,
    turnoAnterior: "Mañana",
    turnoNuevo: "Tarde"
  }
]

export function LMSDataProvider({ children }: { children: ReactNode }) {
  const [turnos, setTurnos] = useState<Turno[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [fichadas, setFichadas] = useState<Fichada[]>([])
  const [novedades, setNovedades] = useState<Novedad[]>([])
  const [isLoaded, setIsLoaded] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const storedTurnos = localStorage.getItem(TURNOS_KEY)
    const storedEmployees = localStorage.getItem(EMPLOYEES_KEY)
    const storedFichadas = localStorage.getItem(FICHADAS_KEY)
    const storedNovedades = localStorage.getItem(NOVEDADES_KEY)

    /*comentario*/
    /* if (storedTurnos) {
      try {
        setTurnos(JSON.parse(storedTurnos))
      } catch {
        setTurnos(defaultTurnos)
        localStorage.setItem(TURNOS_KEY, JSON.stringify(defaultTurnos))
      }
    } else {
      setTurnos(defaultTurnos)
      localStorage.setItem(TURNOS_KEY, JSON.stringify(defaultTurnos))
    }
    
    if (storedEmployees) {
      try {
        setEmployees(JSON.parse(storedEmployees))
      } catch {
        setEmployees(defaultEmployees)
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(defaultEmployees))
      }
    } else {
      setEmployees(defaultEmployees)
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(defaultEmployees))
    }
    
    if (storedFichadas) {
      try {
        setFichadas(JSON.parse(storedFichadas))
      } catch {
        const defaultFichadas = generateDefaultFichadas()
        setFichadas(defaultFichadas)
        localStorage.setItem(FICHADAS_KEY, JSON.stringify(defaultFichadas))
      }
    } else {
      const defaultFichadas = generateDefaultFichadas()
      setFichadas(defaultFichadas)
      localStorage.setItem(FICHADAS_KEY, JSON.stringify(defaultFichadas))
    }
    
    if (storedNovedades) {
      try {
        setNovedades(JSON.parse(storedNovedades))
      } catch {
        setNovedades(defaultNovedades)
        localStorage.setItem(NOVEDADES_KEY, JSON.stringify(defaultNovedades))
      }
    } else {
      setNovedades(defaultNovedades)
      localStorage.setItem(NOVEDADES_KEY, JSON.stringify(defaultNovedades))
    } */
    if (storedTurnos) {
      try {
        setTurnos(JSON.parse(storedTurnos))
      } catch {
        setTurnos([])
      }
    } else {
      setTurnos([])
    }

    if (storedEmployees) {
      try {
        setEmployees(JSON.parse(storedEmployees))
      } catch {
        setEmployees([])
      }
    } else {
      setEmployees([])
    }

    if (storedFichadas) {
      try {
        setFichadas(JSON.parse(storedFichadas))
      } catch {
        setFichadas([])
      }
    } else {
      setFichadas([])
    }

    if (storedNovedades) {
      try {
        setNovedades(JSON.parse(storedNovedades))
      } catch {
        setNovedades([])
      }
    } else {
      setNovedades([])
    }
    setIsLoaded(true)
  }, [])
  localStorage.clear()
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
          const fechaFin = turno.fechaFin ? new Date(turno.fechaFin) : null
          return !fechaFin || hoy <= fechaFin ? "actualizado" : "desactualizado"
        }
        return "actualizado"
      }

      if (emp.turnoRotativo && emp.turnoRotativo.turnos.length > 0) {
        const esValido = emp.turnoRotativo.turnos.every((turnoId) => {
          const turno = turnos.find((t) => t.id === turnoId)
          if (!turno || turno.tipo !== "rotativo") return false
          const fechaFin = turno.fechaFin ? new Date(turno.fechaFin) : null
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
    (employee: Omit<Employee, "id">) => {
      const estadoTurno = getEstadoTurno(employee)
      const newEmployee: Employee = { ...employee, id: crypto.randomUUID(), estadoTurno }
      setEmployees((prev) => [...prev, newEmployee])
    },
    [getEstadoTurno]
  )

  const updateEmployee = useCallback((id: string, data: Partial<Employee>) => {
    setEmployees((prev) => prev.map((emp) => (emp.id === id ? { ...emp, ...data } : emp)))
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
    const date = new Date(`${fecha}T00:00:00`)
    date.setHours(0, 0, 0, 0)
    return date
  }

  const formatDate = (date: Date): string => {
    return date.toISOString().split("T")[0]
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
    const today = toDate(new Date().toISOString().split("T")[0])

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
      const weekday = current.getDay()

      if (!employee.diasDescanso?.includes(weekday)) {
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
          const fechaFichada = new Date(fichada.fecha)
          const hoy = new Date()
          hoy.setHours(0, 0, 0, 0)
          const fechaInicio = turno.fechaInicio ? new Date(turno.fechaInicio) : null
          const fechaFin = turno.fechaFin ? new Date(turno.fechaFin) : null
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
    (fichada: Omit<Fichada, "id">) => {
      const interpretada = interpretarFichada(fichada)
      const newFichada: Fichada = { ...interpretada, id: crypto.randomUUID() }
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
    },
    [interpretarFichada, employees, turnos, checkUnderHoursWorked, fichadas, novedades]
  )

  const addFichadasMasivas = useCallback(
    (fichadasNuevas: Omit<Fichada, "id">[]) => {
      const nuevasFichadas: Fichada[] = fichadasNuevas.map((f) => ({
        ...interpretarFichada(f),
        id: crypto.randomUUID(),
      }))

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
    [interpretarFichada, employees, turnos, checkUnderHoursWorked, fichadas, novedades]
  )

  const deleteFichada = useCallback((id: string) => {
    setFichadas((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const getFichadasHoy = useCallback(() => {
    const today = new Date().toISOString().split("T")[0]
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
        const date = new Date(f.fecha)
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
          ? { ...n, aprobado: true, aprobadoPor, fechaAprobacion: new Date().toISOString().split("T")[0] }
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
    const today = new Date().toISOString().split("T")[0]
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
          const date = new Date(n.fecha)
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
