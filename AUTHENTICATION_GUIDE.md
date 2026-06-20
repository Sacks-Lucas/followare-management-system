# Sistema de Autenticación - Guía de Implementación

## Descripción General

Se ha implementado un sistema de autenticación con 3 roles diferentes, cada uno con acceso diferenciado a las pantallas del sistema.

## Credenciales de Acceso

| Usuario | Contraseña | Rol | Acceso |
|---------|-----------|-----|--------|
| `admin` | `admin` | Administrador | Todas las pantallas |
| `empleado` | `empleado` | Empleado | Mis Fichadas (con upload de justificantes) |
| `contador` | `contador` | Contador | Cierre Mensual |

## Características Implementadas

### 1. Sistema de Autenticación (`lib/auth-context.tsx`)
- Contexto global de autenticación usando React Context
- Persistencia de sesión en `localStorage`
- Validación de credenciales

### 2. Página de Login (`app/login/page.tsx`)
- Interfaz limpia y responsive
- Muestra credenciales de prueba
- Validación de campos
- Manejo de errores

### 3. Rutas Protegidas (`components/protected-route.tsx`)
- Componente para proteger rutas según roles
- Redirección automática a login si no está autenticado
- Manejo de acceso denegado

### 4. Vista para Empleados (`components/dashboard/views/empleado-fichadas-view.tsx`)
- **Tabla de Fichadas**: Muestra registro de asistencia con:
  - Fecha
  - Hora de entrada
  - Hora de salida
  - Tipo (Normal, Llegada Tardía, Ausencia)
  - Estado (Aprobado, Pendiente, Rechazado)
  
- **Upload de Justificantes**:
  - Permite subir archivos (PDF, DOC, DOCX, JPG, PNG)
  - Solo para ausencias o llegadas tardías
  - Estados de carga y aprobación
  
- **Resumen del Mes**: Estadísticas de asistencia

### 5. Sidebar Actualizado (`components/dashboard/sidebar.tsx`)
- Menú dinámico según el rol del usuario
- Muestra información del usuario autenticado
- Botón de cerrar sesión funcional
- Navegación restringida por rol

### 6. TopBar Actualizado (`components/dashboard/top-bar.tsx`)
- Muestra información del usuario autenticado
- Botón de logout en el dropdown de perfil
- Iniciales del usuario en avatar

### 7. Página Principal Protegida (`app/page.tsx`)
- Redirige a login si no está autenticado
- Vista inicial según el rol:
  - **Admin**: Dashboard
  - **Empleado**: Mis Fichadas
  - **Contador**: Cierre Mensual
- Manejo de estados de carga

## Flujo de Autenticación

```
1. Usuario accede a la aplicación
   ↓
2. Si no está autenticado → Redirige a /login
   ↓
3. Usuario ingresa credenciales
   ↓
4. Si son válidas → Se guarda sesión en localStorage y se redirige a dashboard
   ↓
5. Dashboard muestra contenido según el rol del usuario
   ↓
6. Usuario puede cerrar sesión (sidebar o topbar)
   ↓
7. Sesión se limpia y se redirige a /login
```

## Acceso por Rol

### Administrador (admin)
- ✅ Dashboard
- ✅ Fichadas del Día
- ✅ Empleados
- ✅ Cierre Mensual

### Empleado (empleado)
- ✅ Mis Fichadas (vista personalizada)
  - Ver su registro de asistencia
  - Subir justificantes para ausencias/llegadas tardías
  - Ver estado de las justificaciones

### Contador (contador)
- ✅ Cierre Mensual

## Estructura de Archivos Creados

```
lib/
  └── auth-context.tsx         # Contexto de autenticación

app/
  └── login/
      └── page.tsx              # Página de login

components/
  ├── protected-route.tsx       # Componente de protección
  └── dashboard/
      ├── top-bar.tsx          # TopBar actualizado
      ├── sidebar.tsx          # Sidebar actualizado
      └── views/
          └── empleado-fichadas-view.tsx  # Vista para empleados
```

## Próximos Pasos (Opcional)

- [ ] Integrar base de datos para persistencia de usuarios
- [ ] Implementar recuperación de contraseña
- [ ] Agregar autenticación de dos factores (2FA)
- [ ] Implementar auditoria de acciones por usuario
- [ ] Integrar con servicios de almacenamiento para archivos
- [ ] Agregar rol de "Recursos Humanos" para revisar justificantes
- [ ] Implementar tokens JWT para mayor seguridad
- [ ] Agregar rate limiting en login
