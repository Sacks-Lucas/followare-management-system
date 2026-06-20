"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import {
  Calculator,
  Search,
  UserPlus,
  Edit,
  Trash2,
  MoreHorizontal,
  Eye,
  EyeOff,
} from "lucide-react"
import { useLMSData, type Contador } from "@/lib/lms-data-context"
import { useAuth } from "@/lib/auth-context"
import { useToast } from "@/hooks/use-toast"

export function AccountantsView() {
  const { contadores, addContador, updateContador, deleteContador, isUsernameTaken, isLoaded } = useLMSData()
  const { user } = useAuth()
  const { toast } = useToast()
  const isAdmin = user?.role === "admin"

  const [searchTerm, setSearchTerm] = useState("")
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [editingContador, setEditingContador] = useState<Contador | null>(null)

  const [formData, setFormData] = useState({
    legajo: "",
    nombre: "",
    apellido: "",
    dni: "",
    cuil: "",
    email: "",
    telefono: "",
    username: "",
    password: "",
  })

  const showCreatedCredentialsToast = (contador: Contador) => {
    toast({
      title: "Contador creado",
      description: (
        <div>
          <strong>{contador.nombre} {contador.apellido}</strong>: {contador.username} / {contador.password}
        </div>
      ),
    })
  }

  if (!isLoaded) {
    return <div className="flex items-center justify-center h-64">Cargando...</div>
  }

  const filteredContadores = contadores.filter((contador) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      (contador.nombre?.toLowerCase() || "").includes(searchLower) ||
      (contador.apellido?.toLowerCase() || "").includes(searchLower) ||
      (contador.legajo?.toLowerCase() || "").includes(searchLower) ||
      (contador.dni || "").includes(searchTerm) ||
      (contador.username?.toLowerCase() || "").includes(searchLower)
    )
  })

  const generateLegajo = () => {
    const lastNumber = contadores.reduce((max, c) => {
      if (!c?.legajo) return max
      const num = parseInt(c.legajo.replace(/\D/g, "")) || 0
      return num > max ? num : max
    }, 0)
    return `CONT${String(lastNumber + 1).padStart(3, "0")}`
  }

  const resetForm = () => {
    setFormData({
      legajo: "",
      nombre: "",
      apellido: "",
      dni: "",
      cuil: "",
      email: "",
      telefono: "",
      username: "",
      password: "",
    })
    setEditingContador(null)
    setShowPassword(false)
  }

  const handleOpenCreate = () => {
    if (!isAdmin) return
    resetForm()
    setFormData((prev) => ({ ...prev, legajo: generateLegajo() }))
    setIsDialogOpen(true)
  }

  const handleEdit = (contador: Contador) => {
    setEditingContador(contador)
    setFormData({
      legajo: contador.legajo,
      nombre: contador.nombre,
      apellido: contador.apellido,
      dni: contador.dni,
      cuil: contador.cuil || "",
      email: contador.email || "",
      telefono: contador.telefono || "",
      username: contador.username || "",
      password: contador.password || "",
    })
    setShowPassword(false)
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    resetForm()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const desiredUsername = formData.username.trim()
    if (desiredUsername && isUsernameTaken(desiredUsername, editingContador?.id)) {
      toast({
        title: "Usuario no disponible",
        description: `El usuario "${desiredUsername}" ya está en uso. Elegí otro.`,
        variant: "destructive",
      })
      return
    }

    if (editingContador) {
      updateContador(editingContador.id, formData)
    } else {
      if (!isAdmin) {
        toast({
          title: "Acción no permitida",
          description: "Solo un administrador puede crear contadores.",
          variant: "destructive",
        })
        return
      }
      const created = addContador({ ...formData, estado: "activo" })
      showCreatedCredentialsToast(created)
    }

    handleCloseDialog()
  }

  const handleDelete = (contador: Contador) => {
    if (!isAdmin) return
    deleteContador(contador.id)
    toast({
      title: "Contador eliminado",
      description: `Se eliminó a ${contador.nombre} ${contador.apellido}.`,
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contadores</h1>
          <p className="text-muted-foreground">Usuarios con rol contador del sistema</p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, legajo, DNI o usuario..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Contadores Table */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Lista de Contadores
              </CardTitle>
              <CardDescription>
                {filteredContadores.length} contadores encontrados
              </CardDescription>
            </div>
            {isAdmin && (
              <Button onClick={handleOpenCreate}>
                <UserPlus className="mr-2 h-4 w-4" />
                Nuevo Contador
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
                <TableHead>CUIL</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredContadores.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron contadores
                  </TableCell>
                </TableRow>
              ) : (
                filteredContadores.map((contador) => (
                  <TableRow key={contador.id} className="hover:bg-muted/50">
                    <TableCell className="font-mono font-medium">{contador.legajo}</TableCell>
                    <TableCell>
                      {contador.nombre} {contador.apellido}
                    </TableCell>
                    <TableCell>{contador.dni}</TableCell>
                    <TableCell>{contador.cuil || "-"}</TableCell>
                    <TableCell>{contador.email || "-"}</TableCell>
                    <TableCell className="font-mono">{contador.username || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          contador.estado === "activo"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {contador.estado === "activo" ? "Activo" : "Inactivo"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(contador)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDelete(contador)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create / Edit Dialog */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) handleCloseDialog()
        }}
      >
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingContador ? "Editar Contador" : "Registrar Nuevo Contador"}
            </DialogTitle>
            <DialogDescription>
              Complete los datos personales y las credenciales de acceso del contador.
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, legajo: e.target.value }))}
                    placeholder="CONT001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dni">DNI *</Label>
                  <Input
                    id="dni"
                    value={formData.dni}
                    onChange={(e) => setFormData((prev) => ({ ...prev, dni: e.target.value }))}
                    placeholder="12345678"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cuil">CUIL *</Label>
                  <Input
                    id="cuil"
                    value={formData.cuil}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cuil: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, nombre: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="apellido">Apellido *</Label>
                  <Input
                    id="apellido"
                    value={formData.apellido}
                    onChange={(e) => setFormData((prev) => ({ ...prev, apellido: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData((prev) => ({ ...prev, telefono: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, username: e.target.value }))}
                    placeholder={editingContador ? "" : "Se genera automáticamente si lo dejás vacío"}
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
                      onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                      placeholder={editingContador ? "" : "Igual al usuario si la dejás vacía"}
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

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancelar
              </Button>
              <Button type="submit">
                {editingContador ? "Guardar Cambios" : "Registrar Contador"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
