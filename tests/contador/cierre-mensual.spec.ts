import { test, expect } from "@playwright/test"
import { readFileSync } from "node:fs"
import { loginExpectingSuccess } from "../auth/auth-helpers"

/**
 * Test del usuario Contador (contador / contador).
 *
 * Funcionalidad: generar un cierre mensual desde la vista "Cierre Mensual"
 * (la vista por defecto del contador) y exportarlo a CSV.
 *
 * El cierre se genera de forma reactiva al elegir el período. El reporte
 * incluye una fila por cada empleado (getCierreMensual mapea todos los
 * empleados), por lo que el empleado sembrado por defecto (Roberto López)
 * siempre aparece.
 */

const EMPLEADO_NOMBRE = "Roberto López"

test.describe("Contador - Cierre mensual", () => {
  test("genera un cierre mensual y lo exporta a CSV", async ({ page }) => {
    await loginExpectingSuccess(page, "contador", "contador")

    // El contador aterriza en "Cierre Mensual".
    await expect(page.getByRole("heading", { name: "Cierre Mensual" })).toBeVisible({
      timeout: 15000,
    })

    // Selecciona el período "Mes completo" para generar el cierre mensual.
    await page.getByRole("radio", { name: "Mes completo" }).click()

    // En modo mensual aparecen los selectores de Mes y Año.
    await expect(page.getByRole("combobox")).toHaveCount(2)

    // El reporte se genera: detalle por empleado + fila de totales.
    const filaEmpleado = page.getByRole("row").filter({ hasText: EMPLEADO_NOMBRE })
    await expect(filaEmpleado).toBeVisible()
    const filaTotal = page.getByRole("row").filter({ hasText: "TOTAL" })
    await expect(filaTotal).toBeVisible()

    // Exporta el cierre a CSV y captura la descarga.
    const downloadPromise = page.waitForEvent("download")
    await page.getByRole("button", { name: "Exportar CSV" }).click()
    const download = await downloadPromise

    // El archivo tiene el nombre del cierre mensual (cierre_<Mes>_<Año>.csv).
    expect(download.suggestedFilename()).toMatch(/^cierre_.+_\d{4}\.csv$/)

    // El contenido del CSV tiene el encabezado, el empleado y la fila de totales.
    const path = await download.path()
    const csv = readFileSync(path, "utf-8")
    expect(csv).toContain("Empleado,Días Trabajados")
    expect(csv).toContain(EMPLEADO_NOMBRE)
    expect(csv).toContain("Total,")
  })
})
