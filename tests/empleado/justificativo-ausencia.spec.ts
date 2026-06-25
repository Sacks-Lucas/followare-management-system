import { test, expect, type Page } from "@playwright/test"
import { loginExpectingSuccess } from "../auth/auth-helpers"

/**
 * Tests del usuario Empleado (empleado / empleado = Roberto López, id "5").
 *
 * Funcionalidad: el empleado carga un justificativo para una ausencia o una
 * media ausencia desde la vista "Mis Fichadas".
 *
 * En "Mis Fichadas" se genera una fila de ausencia por cada día laborable de
 * los últimos 30 días sin entrada fichada. Cada ausencia ofrece un botón
 * "Justificante" que sube un archivo y crea una novedad tipo "justificativo"
 * (pendiente de aprobación). Una fila se rotula "Media ausencia" si existe una
 * novedad mediaAusencia para esa fecha; si no, es "Ausencia".
 *
 * Para que el test sea determinístico sembramos las fichadas vacías en
 * localStorage: así TODOS los días laborables recientes quedan como ausencia.
 */

const FICHADAS_KEY = "lms-fichadas"
const NOVEDADES_KEY = "lms-novedades"
const EMPLEADO_ID = "5"
const EMPLEADO_NOMBRE = "Roberto López"

/** Fecha ISO (local) de un día laborable reciente, dentro de los últimos 30 días. */
function fechaLaborableReciente(diasAtras = 2): string {
  const d = new Date()
  d.setHours(12, 0, 0, 0) // evita bordes de medianoche / DST
  d.setDate(d.getDate() - diasAtras)
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() - 1) // retrocede hasta lunes-viernes
  }
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

/**
 * Siembra el estado inicial antes de cargar la app:
 *  - fichadas vacías => todos los días laborables recientes son ausencias.
 *  - novedades opcionales (ej: una mediaAusencia para rotular esa fila).
 */
async function seedDatos(page: Page, novedades: unknown[] = []) {
  await page.addInitScript(
    ({ fKey, nKey, novs }) => {
      try {
        localStorage.setItem(fKey, "[]")
        if (novs.length > 0) localStorage.setItem(nKey, JSON.stringify(novs))
      } catch {}
    },
    { fKey: FICHADAS_KEY, nKey: NOVEDADES_KEY, novs: novedades }
  )
}

/** Sube un archivo de justificativo a la fila de ausencia de la fecha dada. */
async function subirJustificativo(page: Page, fecha: string): Promise<string> {
  const nombreArchivo = `certificado-${Date.now()}.pdf`
  await page.locator(`#file-aus-${fecha}`).setInputFiles({
    name: nombreArchivo,
    mimeType: "application/pdf",
    buffer: Buffer.from("documento de justificacion de prueba"),
  })
  // La app confirma la carga (hay un delay simulado de ~1.5s antes del alta).
  await expect(
    page.getByText("Archivo cargado exitosamente. Pendiente de aprobación.")
  ).toBeVisible({ timeout: 10000 })
  return nombreArchivo
}

test.describe("Empleado - Justificativo de inasistencia", () => {
  test("carga un justificativo para una ausencia total", async ({ page }) => {
    await seedDatos(page) // fichadas vacías => ausencias
    await loginExpectingSuccess(page, "empleado", "empleado")
    await expect(page.getByRole("heading", { name: "Mis Fichadas" })).toBeVisible({
      timeout: 15000,
    })

    const fecha = fechaLaborableReciente()
    const filaAusencia = page.locator(`#file-aus-${fecha}`).locator("xpath=ancestor::tr")
    await expect(filaAusencia).toBeVisible()
    await expect(filaAusencia).toContainText("Ausencia")

    const nombreArchivo = await subirJustificativo(page, fecha)

    const fila = page.getByRole("row").filter({ hasText: nombreArchivo })
    await expect(fila).toBeVisible()
    await expect(fila).toContainText("Justificativo por ausencia")
    await expect(fila.getByRole("button", { name: "Descargar" })).toBeVisible()
  })

  test("carga un justificativo para una media ausencia", async ({ page }) => {
    const fecha = fechaLaborableReciente()
    // Sembramos una novedad de media ausencia para que esa fila se rotule así.
    await seedDatos(page, [
      {
        id: `seed-ma-${fecha}`,
        empleadoId: EMPLEADO_ID,
        empleadoNombre: EMPLEADO_NOMBRE,
        tipo: "mediaAusencia",
        fecha,
        descripcion: "Media ausencia registrada por el sistema",
        estado: "pendiente",
      },
    ])

    await loginExpectingSuccess(page, "empleado", "empleado")
    await expect(page.getByRole("heading", { name: "Mis Fichadas" })).toBeVisible({
      timeout: 15000,
    })

    const filaAusencia = page.locator(`#file-aus-${fecha}`).locator("xpath=ancestor::tr")
    await expect(filaAusencia).toBeVisible()
    await expect(filaAusencia).toContainText("Media ausencia")

    const nombreArchivo = await subirJustificativo(page, fecha)

    const fila = page.getByRole("row").filter({ hasText: nombreArchivo })
    await expect(fila).toBeVisible()
    await expect(fila).toContainText("Media ausencia")
    await expect(fila).toContainText("Justificativo por ausencia")
    await expect(fila.getByRole("button", { name: "Descargar" })).toBeVisible()
  })
})
