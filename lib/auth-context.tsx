"use client"

import { createContext, useContext, useState, useEffect, ReactNode } from "react"

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
  empleado: { password: "empleado", role: "empleado", employeeId: "5" },
  contador: { password: "contador", role: "contador" },
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
    
    if (!validUser || validUser.password !== password) {
      return false
    }

    const newUser: User = {
      username: validUser.role === "empleado" ? "Roberto Pérez" : username,
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
