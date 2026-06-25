import { test, expect } from "@playwright/test"
import { loginExpectingSuccess } from "./auth-helpers"

/**
 * Login del usuario Contador (contador / contador).
 *
 * Tras un login exitoso la app redirige a la vista "Cierre Mensual" y la TopBar
 * muestra "Contador" como rol.
 */
test.describe("Login - Contador", () => {
  test("inicia sesión con credenciales válidas (contador/contador)", async ({ page }) => {
    await loginExpectingSuccess(page, "contador", "contador")

    // La TopBar del dashboard muestra el menú de usuario con el rol "Contador".
    await expect(page.getByRole("button", { name: /Contador/ })).toBeVisible({
      timeout: 15000,
    })

    // El contador ve su sección "Cierre Mensual" en el menú lateral.
    await expect(page.getByRole("button", { name: "Cierre Mensual" })).toBeVisible()
  })
})
