import { test, expect, type Page } from "@playwright/test"
import { loginExpectingSuccess } from "../auth/auth-helpers"

/**
 * ABM (Alta - Baja - Modificación) de Contadores, todo como usuario Administrador.
 *
 * El flujo es secuencial sobre un mismo contador: se crea, luego se edita y
 * finalmente se elimina. Por eso usamos un único test con `test.step`.
 *
 * A diferencia de los empleados (baja lógica), la baja de un contador es un
 * borrado físico: la fila desaparece de la tabla.
 *
 * Los datos se generan con un sufijo único (timestamp) para no colisionar con
 * los contadores que la app pueda tener sembrados en localStorage.
 */

/** Navega a la vista "Contadores" estando ya logueado como admin. */
async function gotoContadores(page: Page) {
  await page.getByRole("button", { name: "Contadores" }).click()
  // La vista está lista cuando aparece el botón para crear contadores.
  await expect(page.getByRole("button", { name: "Nuevo Contador" })).toBeVisible({
    timeout: 15000,
  })
}

test.describe("Admin - ABM de Contadores", () => {
  test.beforeEach(async ({ page }) => {
    await loginExpectingSuccess(page, "admin", "admin")
    await gotoContadores(page)
  })

  test("crea, edita y elimina un contador", async ({ page }) => {
    const sufijo = Date.now()
    const contador = {
      nombre: "Playwright",
      apellido: `Contador${sufijo}`,
      dni: String(sufijo).slice(-8),
      cuil: `20-${String(sufijo).slice(-8)}-9`,
      email: `contador${sufijo}@test.com`,
    }
    const emailEditado = `contador${sufijo}.editado@test.com`

    // Localiza la fila del contador por su apellido único.
    const filaContador = page.getByRole("row").filter({ hasText: contador.apellido })

    await test.step("Alta: crea un contador nuevo", async () => {
      await page.getByRole("button", { name: "Nuevo Contador" }).click()

      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Registrar Nuevo Contador")).toBeVisible()

      // El legajo se autogenera; el usuario/contraseña se generan si quedan vacíos.
      await dialog.getByLabel("DNI *").fill(contador.dni)
      await dialog.getByLabel("CUIL *").fill(contador.cuil)
      await dialog.getByLabel("Nombre *").fill(contador.nombre)
      await dialog.getByLabel("Apellido *").fill(contador.apellido)
      await dialog.getByLabel("Email").fill(contador.email)

      await dialog.getByRole("button", { name: "Registrar Contador" }).click()

      // El diálogo se cierra tras el alta.
      await expect(dialog).toBeHidden()

      // Filtra por el apellido único y verifica que el contador aparece en la tabla.
      await page.getByPlaceholder("Buscar por nombre, legajo, DNI o usuario...").fill(contador.apellido)
      await expect(filaContador).toBeVisible()
      await expect(filaContador).toContainText(contador.nombre)
      await expect(filaContador).toContainText(contador.dni)
      await expect(filaContador).toContainText(contador.email)
      await expect(filaContador).toContainText("Activo")
    })

    await test.step("Modificación: edita el email del contador", async () => {
      // Abre el menú de acciones de la fila y elige "Editar".
      await filaContador.getByRole("button").click()
      await page.getByRole("menuitem", { name: "Editar" }).click()

      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Editar Contador")).toBeVisible()

      const emailInput = dialog.getByLabel("Email")
      await emailInput.clear()
      await emailInput.fill(emailEditado)

      await dialog.getByRole("button", { name: "Guardar Cambios" }).click()
      await expect(dialog).toBeHidden()

      // La tabla refleja el nuevo email.
      await expect(filaContador).toContainText(emailEditado)
      await expect(filaContador).not.toContainText(contador.email)
    })

    await test.step("Baja: elimina al contador (borrado físico)", async () => {
      await filaContador.getByRole("button").click()
      await page.getByRole("menuitem", { name: "Eliminar" }).click()

      // El borrado es físico: la fila ya no aparece en la tabla.
      await expect(filaContador).toHaveCount(0)
    })
  })
})
