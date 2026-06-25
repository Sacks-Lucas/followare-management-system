import { test, expect } from "@playwright/test"
import { loginExpectingSuccess } from "./auth-helpers"

/**
 * Login del usuario Empleado (empleado / empleado).
 *
 * Tras un login exitoso la app redirige a la vista "Mis Fichadas" y la TopBar
 * muestra "Empleado" como rol.
 */
test.describe("Login - Empleado", () => {
  test("inicia sesión con credenciales válidas (empleado/empleado)", async ({ page }) => {
    await loginExpectingSuccess(page, "empleado", "empleado")

    // La TopBar del dashboard muestra el menú de usuario con el rol "Empleado".
    await expect(page.getByRole("button", { name: /Empleado/ })).toBeVisible({
      timeout: 15000,
    })

    // El empleado ve su sección "Mis Fichadas" en el menú lateral.
    await expect(page.getByRole("button", { name: "Mis Fichadas" })).toBeVisible()
  })
})
