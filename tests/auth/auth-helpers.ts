import { expect, type Page } from "@playwright/test"

/**
 * Helpers compartidos para los tests de autenticación.
 *
 * Credenciales válidas (definidas en lib/auth-context.tsx):
 *   admin    / admin     -> rol "admin"
 *   contador / contador  -> rol "contador"
 *   empleado / empleado  -> rol "empleado"
 */

/**
 * Completa el formulario de login y deja el botón listo para enviar.
 *
 * El formulario usa inputs controlados por React. Si se escribe antes de que
 * Next.js termine de hidratar, el estado se resetea y el botón "Iniciar Sesión"
 * queda deshabilitado. Por eso reintentamos el fill hasta que el valor persista.
 */
export async function fillLoginForm(page: Page, username: string, password: string) {
  // El basePath ya está incluido en baseURL, por eso usamos "login".
  await page.goto("login")
  await expect(page.getByText("WorkForce Pro")).toBeVisible()

  const usernameInput = page.getByPlaceholder("Ingrese su usuario")
  const passwordInput = page.getByPlaceholder("Ingrese su contraseña")
  const submit = page.getByRole("button", { name: "Iniciar Sesión" })

  // Reintenta hasta que React haya hidratado y conserve el valor escrito.
  await expect(async () => {
    await usernameInput.fill(username)
    await passwordInput.fill(password)
    await expect(usernameInput).toHaveValue(username)
    await expect(passwordInput).toHaveValue(password)
    await expect(submit).toBeEnabled()
  }).toPass()

  return submit
}

/**
 * Completa el formulario, envía y espera la redirección al dashboard.
 *
 * En modo dev, la primera navegación a "/" compila la ruta on-demand y puede
 * tardar. Reintentamos el submit si seguimos en /login y esperamos con timeout
 * amplio a que la app salga de la pantalla de login.
 */
export async function loginExpectingSuccess(page: Page, username: string, password: string) {
  await fillLoginForm(page, username, password)

  await expect(async () => {
    const submit = page.getByRole("button", { name: "Iniciar Sesión" })
    if (await submit.isVisible()) {
      await submit.click()
    }
    await expect(page).not.toHaveURL(/\/login/, { timeout: 3000 })
  }).toPass({ timeout: 30000 })
}
