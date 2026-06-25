import { test, expect, type Page } from "@playwright/test"
import * as XLSX from "xlsx"
import { loginExpectingSuccess } from "../auth/auth-helpers"

/**
 * Importación de empleados desde Excel (como Administrador) y verificación de
 * que el empleado importado puede iniciar sesión.
 *
 * La importación NO toma usuario/contraseña del Excel: el sistema los autogenera
 * (password = username). Por eso leemos el usuario generado de la tabla y lo
 * usamos como credencial para el login.
 */

/** Navega a la vista "Empleados" estando ya logueado como admin. */
async function gotoEmpleados(page: Page) {
  await page.getByRole("button", { name: "Empleados" }).click()
  await expect(page.getByRole("button", { name: "Importar Empleados" })).toBeVisible({
    timeout: 15000,
  })
}

test.describe("Admin - Importar empleados", () => {
  test("importa un empleado y este puede iniciar sesión", async ({ page }) => {
    await loginExpectingSuccess(page, "admin", "admin")
    await gotoEmpleados(page)

    const sufijo = Date.now()
    const empleado = {
      legajo: `IMP${sufijo}`,
      nombre: "Importado",
      apellido: `Test${sufijo}`,
      dni: String(sufijo).slice(-8),
      cuil: `20-${String(sufijo).slice(-8)}-9`,
    }

    // Genera un Excel válido en memoria (columnas obligatorias + fecha dd/mm/aaaa).
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Legajo", "Nombre", "Apellido", "DNI", "CUIL", "Fecha Ingreso", "Estado", "Departamento", "Cargo"],
      [empleado.legajo, empleado.nombre, empleado.apellido, empleado.dni, empleado.cuil, "01/03/2024", "activo", "Producción", "Operario"],
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Empleados")
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer

    // Sube el archivo al input de importación (abre el diálogo de preview).
    await page.locator('input[type="file"]').setInputFiles({
      name: "empleados.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    })

    // El preview valida la fila.
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Importar Empleados desde Excel")).toBeVisible()
    await expect(dialog.getByText("1 válidos")).toBeVisible()
    await expect(dialog.getByText(empleado.nombre)).toBeVisible()

    await dialog.getByRole("button", { name: /Importar 1 empleados/ }).click()
    await expect(dialog).toBeHidden()

    // Busca el empleado importado y lee el usuario autogenerado (col. "Usuario").
    await page.getByPlaceholder("Buscar por nombre, legajo o DNI...").fill(empleado.apellido)
    const fila = page.getByRole("row").filter({ hasText: empleado.apellido })
    await expect(fila).toBeVisible()
    const username = (await fila.getByRole("cell").nth(4).textContent())?.trim() ?? ""
    expect(username.length).toBeGreaterThan(0)

    // Cierra sesión como admin.
    await page.getByRole("button", { name: "Cerrar Sesión" }).click()
    await expect(page).toHaveURL(/\/login/)

    // El empleado importado inicia sesión (password = username autogenerado).
    await loginExpectingSuccess(page, username, username)

    // Aterriza en su vista "Mis Fichadas" con su nombre.
    await expect(page.getByRole("heading", { name: "Mis Fichadas" })).toBeVisible({
      timeout: 15000,
    })
    await expect(
      page.getByRole("main").getByText(`${empleado.nombre} ${empleado.apellido}`)
    ).toBeVisible()
  })
})
