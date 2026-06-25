import { test, expect, type Page } from "@playwright/test"
import { loginExpectingSuccess } from "../auth/auth-helpers"

/**
 * ABM (Alta - Baja - Modificación) de Empleados, todo como usuario Administrador.
 *
 * El flujo es secuencial sobre un mismo empleado: se crea, luego se edita y
 * finalmente se da de baja. Por eso usamos un único test con `test.step`.
 *
 * Los datos se generan con un sufijo único (timestamp) para no colisionar con
 * los empleados de ejemplo que la app siembra en localStorage.
 */

/** Navega a la vista "Empleados" estando ya logueado como admin. */
async function gotoEmpleados(page: Page) {
  await page.getByRole("button", { name: "Empleados" }).click()
  // La vista está lista cuando aparece el botón para crear empleados.
  await expect(page.getByRole("button", { name: "Nuevo Empleado" })).toBeVisible({
    timeout: 15000,
  })
}

test.describe("Admin - ABM de Empleados", () => {
  test.beforeEach(async ({ page }) => {
    await loginExpectingSuccess(page, "admin", "admin")
    await gotoEmpleados(page)
  })

  test("crea, edita y da de baja un empleado", async ({ page }) => {
    const sufijo = Date.now()
    const empleado = {
      nombre: "Playwright",
      apellido: `Test${sufijo}`,
      dni: String(sufijo).slice(-8),
      cuil: `20-${String(sufijo).slice(-8)}-9`,
      departamento: "Producción",
      cargo: "Tester QA",
    }
    const cargoEditado = "Supervisor de Pruebas"

    // Localiza la fila del empleado por su apellido único.
    const filaEmpleado = page.getByRole("row").filter({ hasText: empleado.apellido })

    await test.step("Alta: crea un empleado nuevo", async () => {
      await page.getByRole("button", { name: "Nuevo Empleado" }).click()

      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Registrar Nuevo Empleado")).toBeVisible()

      // Legajo, fecha de ingreso, estado (Activo) y jornada vienen por defecto.
      await dialog.getByLabel("DNI *").fill(empleado.dni)
      await dialog.getByLabel("CUIL *").fill(empleado.cuil)
      await dialog.getByLabel("Nombre *").fill(empleado.nombre)
      await dialog.getByLabel("Apellido *").fill(empleado.apellido)
      await dialog.getByLabel("Cargo *").fill(empleado.cargo)

      // Departamento es un Select de Radix; el primer "Seleccionar..." es Departamento.
      await dialog.getByRole("combobox").filter({ hasText: "Seleccionar..." }).first().click()
      await page.getByRole("option", { name: empleado.departamento }).click()

      await dialog.getByRole("button", { name: "Registrar Empleado" }).click()

      // El diálogo se cierra tras el alta.
      await expect(dialog).toBeHidden()

      // Filtra por el apellido único y verifica que el empleado aparece en la tabla.
      await page.getByPlaceholder("Buscar por nombre, legajo o DNI...").fill(empleado.apellido)
      await expect(filaEmpleado).toBeVisible()
      await expect(filaEmpleado).toContainText(empleado.nombre)
      await expect(filaEmpleado).toContainText(empleado.departamento)
      await expect(filaEmpleado).toContainText(empleado.cargo)
      await expect(filaEmpleado).toContainText("Activo")
    })

    await test.step("Modificación: edita el cargo del empleado", async () => {
      // Abre el menú de acciones de la fila y elige "Editar".
      await filaEmpleado.getByRole("button").click()
      await page.getByRole("menuitem", { name: "Editar" }).click()

      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Editar Empleado")).toBeVisible()

      const cargoInput = dialog.getByLabel("Cargo *")
      await cargoInput.clear()
      await cargoInput.fill(cargoEditado)

      await dialog.getByRole("button", { name: "Guardar Cambios" }).click()
      await expect(dialog).toBeHidden()

      // La tabla refleja el nuevo cargo.
      await expect(filaEmpleado).toContainText(cargoEditado)
      await expect(filaEmpleado).not.toContainText(empleado.cargo)
    })

    await test.step("Baja: da de baja al empleado (baja lógica)", async () => {
      await filaEmpleado.getByRole("button").click()
      await page.getByRole("menuitem", { name: "Dar de Baja" }).click()

      const dialog = page.getByRole("dialog")
      await expect(dialog.getByText("Dar de Baja al Empleado")).toBeVisible()
      await dialog.getByRole("button", { name: "Confirmar Baja" }).click()
      await expect(dialog).toBeHidden()

      // La baja es lógica: la fila sigue visible pero el estado pasa a "Inactivo".
      await expect(filaEmpleado).toBeVisible()
      await expect(filaEmpleado).toContainText("Inactivo")
    })
  })
})
