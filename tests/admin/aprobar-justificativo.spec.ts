import { test, expect, type Page } from "@playwright/test"
import { loginExpectingSuccess } from "../auth/auth-helpers"

/**
 * Flujo completo: el empleado carga un justificativo de ausencia y el
 * Administrador lo aprueba desde la pestaña "Gestión de Novedades".
 *
 * El justificativo se persiste en localStorage (novedad tipo "justificativo",
 * estado "pendiente"), por eso al cerrar sesión como empleado y entrar como
 * admin en el mismo contexto, la novedad sigue disponible para aprobar.
 *
 * Sembramos fichadas vacías para que el empleado tenga ausencias deterministas.
 */

const FICHADAS_KEY = "lms-fichadas"
const EMPLEADO_NOMBRE = "Roberto López"

/** Fecha ISO (local) de un día laborable reciente, dentro de los últimos 30 días. */
function fechaLaborableReciente(diasAtras = 2): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - diasAtras)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1)
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/** Fuerza fichadas vacías antes de cargar la app (no toca las novedades). */
async function seedSinFichadas(page: Page) {
  await page.addInitScript((key) => {
    try {
      localStorage.setItem(key, "[]")
    } catch {}
  }, FICHADAS_KEY)
}

test.describe("Admin - Aprobación de justificativo", () => {
  test("el admin aprueba un justificativo cargado por el empleado", async ({ page }) => {
    await seedSinFichadas(page)

    // --- 1) El empleado carga el justificativo ---
    await loginExpectingSuccess(page, "empleado", "empleado")
    await expect(page.getByRole("heading", { name: "Mis Fichadas" })).toBeVisible({
      timeout: 15000,
    })

    const fecha = fechaLaborableReciente()
    await page.locator(`#file-aus-${fecha}`).setInputFiles({
      name: `certificado-${Date.now()}.pdf`,
      mimeType: "application/pdf",
      buffer: Buffer.from("documento de justificacion de prueba"),
    })
    await expect(
      page.getByText("Archivo cargado exitosamente. Pendiente de aprobación.")
    ).toBeVisible({ timeout: 10000 })

    // --- 2) Cierra sesión como empleado ---
    await page.getByRole("button", { name: "Cerrar Sesión" }).click()
    await expect(page).toHaveURL(/\/login/)

    // --- 3) Entra como admin y va a Gestión de Novedades ---
    await loginExpectingSuccess(page, "admin", "admin")
    await page.getByRole("button", { name: "Fichadas del Día" }).click()
    await page.getByRole("tab", { name: /Gestión de Novedades/ }).click()

    // La novedad del justificativo aparece pendiente.
    const fila = page
      .getByRole("row")
      .filter({ hasText: EMPLEADO_NOMBRE })
      .filter({ hasText: "Justificativo por ausencia" })
    await expect(fila).toBeVisible()
    await expect(fila).toContainText("Pendiente")

    // --- 4) Aprueba (el primer botón de acción de la fila es el check verde) ---
    await fila.getByRole("button").first().click()

    // La novedad queda aprobada y registra al autor "Admin".
    await expect(fila).toContainText("Aprobado")
    await expect(fila).toContainText("Admin")
  })
})
