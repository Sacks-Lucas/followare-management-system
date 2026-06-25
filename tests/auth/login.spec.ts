import { test, expect } from "@playwright/test"
import { fillLoginForm, loginExpectingSuccess } from "./auth-helpers"

/**
 * Login del usuario Administrador (admin / admin).
 *
 * Tras un login exitoso la app redirige al dashboard y la TopBar muestra
 * "Administrador" como rol.
 */
test.describe("Login - Administrador", () => {
  test("inicia sesión con credenciales válidas (admin/admin)", async ({ page }) => {
    await loginExpectingSuccess(page, "admin", "admin")

    // La TopBar del dashboard muestra el menú de usuario con el rol "Administrador".
    await expect(page.getByRole("button", { name: /Administrador/ })).toBeVisible({
      timeout: 15000,
    })

    // El admin ve la sección "Dashboard" en el menú lateral.
    await expect(page.getByRole("button", { name: "Dashboard" })).toBeVisible()
  })

  test("muestra error con credenciales inválidas", async ({ page }) => {
    await fillLoginForm(page, "admin", "wrong-password")
    await page.getByRole("button", { name: "Iniciar Sesión" }).click()

    await expect(page.getByText("Usuario o contraseña incorrectos")).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })
})
