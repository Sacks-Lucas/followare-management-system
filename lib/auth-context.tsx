"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { EMPLOYEES_KEY, normalizeUserCredential, ensureEmployeeCredentials } from "./lms-data-context"

export type UserRole = "admin" | "empleado" | "contador"

export interface User {
  username: string
  role: UserRole
  employeeId?: string
}

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (username: string, password: string) => boolean
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Credenciales válidas
const VALID_USERS: Record<string, { password: string; role: UserRole; employeeId?: string }> = {
  admin: { password: "admin", role: "admin" },
  contador: { password: "contador", role: "contador" },
  empleado: { password: "empleado", role: "empleado", employeeId: "5" },
}

const loadStoredEmployees = (): Array<{ username: string; password: string; employeeId: string; nombre: string; apellido: string }> => {
  if (typeof window === "undefined") return []
  try {
    const stored = localStorage.getItem(EMPLOYEES_KEY)
    if (!stored) return []
    const employees = JSON.parse(stored)
    if (!Array.isArray(employees)) return []

    const existingUsernames = new Set<string>()
    return employees
      .map((emp) => ensureEmployeeCredentials(emp, existingUsernames))
      .filter((emp): emp is { username: string; password: string; employeeId: string; nombre: string; apellido: string } =>
        typeof emp.username === "string" &&
        typeof emp.password === "string" &&
        typeof emp.id === "string"
      )
      .map((emp) => ({
        username: emp.username,
        password: emp.password,
        employeeId: emp.id,
        nombre: emp.nombre,
        apellido: emp.apellido,
      }))
  } catch {
    return []
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Cargar usuario del localStorage al montar
  useEffect(() => {
    const savedUser = localStorage.getItem("auth_user")
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error("Error loading auth user:", error)
        localStorage.removeItem("auth_user")
      }
    }
    setLoading(false)
  }, [])

  const login = (username: string, password: string): boolean => {
    const validUser = VALID_USERS[username]
    const storedEmployees = loadStoredEmployees()
    const employeeMatch = storedEmployees.find(
      (emp) => normalizeUserCredential(emp.username).toLowerCase() === normalizeUserCredential(username).toLowerCase() &&
      emp.password === password
    )

    if (employeeMatch) {
      const newUser: User = {
        username: `${employeeMatch.nombre} ${employeeMatch.apellido}`,
        role: "empleado",
        employeeId: employeeMatch.employeeId,
      }
      setUser(newUser)
      localStorage.setItem("auth_user", JSON.stringify(newUser))
      return true
    }

    if (!validUser || validUser.password !== password) {
      return false
    }

    const displayName = validUser.role === "empleado" && validUser.employeeId
      ? (() => {
          const employee = storedEmployees.find((emp) => emp.employeeId === validUser.employeeId)
          return employee ? `${employee.nombre} ${employee.apellido}` : username
        })()
      : username

    const newUser: User = {
      username: displayName,
      role: validUser.role,
      employeeId: validUser.employeeId,
    }

    setUser(newUser)
    localStorage.setItem("auth_user", JSON.stringify(newUser))
    return true
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem("auth_user")
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
