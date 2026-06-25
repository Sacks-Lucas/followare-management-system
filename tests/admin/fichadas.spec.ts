import { test, expect, type Page } from "@playwright/test"
import * as XLSX from "xlsx"
import { loginExpectingSuccess } from "../auth/auth-helpers"

/**
 * Tests de funcionalidades de Fichadas, todo como usuario Administrador:
 *   - Fichada Rápida (registro con un clic).
 *   - Nueva Fichada (alta manual vía formulario).
 *   - Importar Fichadas (carga masiva desde Excel).
 *
 * La app siembra un empleado activo por defecto: EMP005 - Roberto López (id "5"),
 * que usamos como sujeto de las fichadas.
 */

const EMPLEADO_LEGAJO = "EMP005"
const EMPLEADO_NOMBRE = "Roberto López"

/** Navega a la vista "Fichadas del Día" estando ya logueado como admin. */
async function gotoFichadas(page: Page) {
  await page.getByRole("button", { name: "Fichadas del Día" }).click()
  // La vista está lista cuando aparece el botón "Nueva Fichada".
  await expect(page.getByRole("button", { name: "Nueva Fichada" })).toBeVisible({
    timeout: 15000,
  })
}

/**
 * Crea una fichada manual desde el formulario "Nueva Fichada".
 * Al fijar la fecha, la tabla queda filtrada por esa misma fecha.
 */
async function crearFichadaManual(
  page: Page,
  opts: { tipo?: "Entrada" | "Salida"; fecha: string; hora: string; ubicacion: string }
) {
  await page.getByRole("button", { name: "Nueva Fichada" }).click()
  const dialog = page.getByRole("dialog")
  await expect(dialog.getByText("Registrar Nueva Fichada")).toBeVisible()

  // Empleado.
  await dialog.getByRole("combobox").filter({ hasText: "Seleccionar empleado" }).click()
  await page.getByRole("option", { name: new RegExp(EMPLEADO_NOMBRE) }).click()

  // Tipo de fichada (el combo arranca en "Entrada").
  if (opts.tipo && opts.tipo !== "Entrada") {
    await dialog.getByRole("combobox").filter({ hasText: "Entrada" }).click()
    await page.getByRole("option", { name: opts.tipo, exact: true }).click()
  }

  await dialog.locator('input[type="date"]').fill(opts.fecha)
  await dialog.locator('input[type="time"]').fill(opts.hora)
  await dialog.getByPlaceholder("Ej: Entrada Principal").fill(opts.ubicacion)

  await dialog.getByRole("button", { name: "Guardar Fichada" }).click()
  await expect(dialog).toBeHidden()
}

test.describe("Admin - Fichadas", () => {
  test.beforeEach(async ({ page }) => {
    await loginExpectingSuccess(page, "admin", "admin")
    await gotoFichadas(page)
  })

  test("Fichada Rápida registra una entrada con un clic", async ({ page }) => {
    // Filas del empleado en la tabla de fichadas de hoy (puede haber del seed).
    const filasEmpleado = page.getByRole("row").filter({ hasText: EMPLEADO_NOMBRE })
    const cantidadInicial = await filasEmpleado.count()

    // Selecciona al empleado en el combo de "Fichada Rápida".
    await page.getByRole("combobox").first().click()
    await page.getByRole("option", { name: new RegExp(EMPLEADO_NOMBRE) }).click()

    // Registra la entrada con un clic.
    const botonEntrada = page.getByRole("button", { name: "Entrada" })
    await expect(botonEntrada).toBeEnabled()
    await botonEntrada.click()

    // Debe aparecer una fila más para el empleado, con el tipo "Entrada".
    await expect(filasEmpleado).toHaveCount(cantidadInicial + 1)
    await expect(
      page.getByRole("row").filter({ hasText: EMPLEADO_NOMBRE }).filter({ hasText: "Entrada" })
    ).not.toHaveCount(0)
  })

  test("Nueva Fichada registra una fichada manual desde el formulario", async ({ page }) => {
    // Fecha futura única para aislar la tabla (el filtro de fecha sigue al form).
    const fecha = "2031-03-15"
    const hora = "09:30"
    const ubicacion = `Test-NuevaFichada-${Date.now()}`

    await page.getByRole("button", { name: "Nueva Fichada" }).click()

    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Registrar Nueva Fichada")).toBeVisible()

    // Empleado (combo con placeholder "Seleccionar empleado").
    await dialog.getByRole("combobox").filter({ hasText: "Seleccionar empleado" }).click()
    await page.getByRole("option", { name: new RegExp(EMPLEADO_NOMBRE) }).click()

    // Fecha, hora y ubicación (labels sin htmlFor: se ubican por tipo/placeholder).
    await dialog.locator('input[type="date"]').fill(fecha)
    await dialog.locator('input[type="time"]').fill(hora)
    await dialog.getByPlaceholder("Ej: Entrada Principal").fill(ubicacion)

    await dialog.getByRole("button", { name: "Guardar Fichada" }).click()
    await expect(dialog).toBeHidden()

    // La tabla quedó filtrada por la fecha futura: solo muestra la fichada creada.
    const fila = page.getByRole("row").filter({ hasText: ubicacion })
    await expect(fila).toBeVisible()
    await expect(fila).toContainText(EMPLEADO_NOMBRE)
    await expect(fila).toContainText(hora)
    await expect(fila).toContainText("Entrada")
  })

  test("Importar Fichadas carga fichadas desde un Excel", async ({ page }) => {
    const fechaImport = "2032-03-15" // ISO que esperamos en la tabla
    const ubicacion = `Import-${Date.now()}`

    // Genera un Excel válido en memoria (fecha en formato dd/mm/aaaa).
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["Empleado ID", "Tipo", "Fecha", "Hora", "Metodo", "Ubicacion", "Observaciones"],
      [EMPLEADO_LEGAJO, "entrada", "15/03/2032", "08:15", "biometrico", ubicacion, ""],
    ])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "Fichadas")
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" }) as Buffer

    // Abre el diálogo de importación y sube el archivo.
    await page.getByRole("button", { name: "Importar Fichadas" }).click()
    const dialog = page.getByRole("dialog")
    await expect(dialog.getByText("Importar Fichadas desde Excel")).toBeVisible()

    await dialog.locator('input[type="file"]').setInputFiles({
      name: "fichadas.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    })

    // El preview valida la fila y habilita el botón de importar.
    await expect(dialog.getByText("Preview de Importación")).toBeVisible()
    await expect(dialog.getByText(EMPLEADO_NOMBRE)).toBeVisible()
    const botonImportar = dialog.getByRole("button", { name: /Importar 1 Fichadas/ })
    await expect(botonImportar).toBeEnabled()
    await botonImportar.click()
    await expect(dialog).toBeHidden()

    // Filtra la tabla por la fecha del import para ver la fichada cargada.
    await page.locator('input[type="date"]').fill(fechaImport)

    const fila = page.getByRole("row").filter({ hasText: ubicacion })
    await expect(fila).toBeVisible()
    await expect(fila).toContainText(EMPLEADO_NOMBRE)
    await expect(fila).toContainText("Entrada")
  })

  test("contabiliza llegadas tarde y horas extra según el turno asignado", async ({ page }) => {
    // El empleado tiene el turno "Mañana" (t1): entrada 08:00 (tolerancia 15min,
    // tarde si > 08:15) y salida 16:00 (tolerancia 15min, extra si > 16:15).
    // Usamos una fecha futura aislada para que el cálculo sea determinístico.
    const fecha = "2033-04-12"
    const sufijo = Date.now()
    const ubicacionTarde = `LlegadaTarde-${sufijo}`
    const ubicacionExtra = `HoraExtra-${sufijo}`

    await test.step("Llegada tarde: entrada 09:00 se marca como Tardanza", async () => {
      await crearFichadaManual(page, {
        tipo: "Entrada",
        fecha,
        hora: "09:00", // 45 min después del límite (08:15) -> tardanza
        ubicacion: ubicacionTarde,
      })

      const fila = page.getByRole("row").filter({ hasText: ubicacionTarde })
      await expect(fila).toBeVisible()
      await expect(fila).toContainText(EMPLEADO_NOMBRE)
      await expect(fila).toContainText("Entrada")
      // El motor interpreta la fichada y la contabiliza como tardanza.
      await expect(fila).toContainText("Tardanza")
    })

    await test.step("Hora extra: salida 17:00 contabiliza 45 min extra", async () => {
      await crearFichadaManual(page, {
        tipo: "Salida",
        fecha,
        hora: "17:00", // 45 min después del límite (16:15) -> 45 min extra
        ubicacion: ubicacionExtra,
      })

      const fila = page.getByRole("row").filter({ hasText: ubicacionExtra })
      await expect(fila).toBeVisible()
      await expect(fila).toContainText(EMPLEADO_NOMBRE)
      await expect(fila).toContainText("Salida")
      // El motor calcula y muestra las horas extra (0h 45m).
      await expect(fila).toContainText(/0h\s*45m/)
    })
  })

  test("genera media ausencia y ausencia total por horas insuficientes", async ({ page }) => {
    // La jornada esperada es 8h (480 min). Al registrar entrada + salida, el motor
    // calcula el % trabajado: <50% => Ausencia total, 50-99% => Media Ausencia.
    // Se autogeneran como novedades pendientes (no se cargan a mano).
    const novedadesTab = page.getByRole("tab", { name: /Gestión de Novedades/ })

    await test.step("Media ausencia: trabaja 75% de la jornada (6h)", async () => {
      const fecha = "2034-05-10"
      const sufijo = Date.now()
      // 08:00 -> 14:00 = 6h = 75% de 8h => media ausencia.
      await crearFichadaManual(page, { tipo: "Entrada", fecha, hora: "08:00", ubicacion: `MA-in-${sufijo}` })
      await crearFichadaManual(page, { tipo: "Salida", fecha, hora: "14:00", ubicacion: `MA-out-${sufijo}` })

      await novedadesTab.click()
      const fila = page
        .getByRole("row")
        .filter({ hasText: EMPLEADO_NOMBRE })
        .filter({ hasText: "Media ausencia: trabajó 75%" })
      await expect(fila).toBeVisible()
      await expect(fila).toContainText("Media Ausencia")
      await expect(fila).toContainText("Pendiente")
    })

    await test.step("Ausencia total: trabaja 25% de la jornada (2h)", async () => {
      const fecha = "2034-05-11"
      const sufijo = Date.now()
      // 08:00 -> 10:00 = 2h = 25% de 8h => ausencia total.
      await crearFichadaManual(page, { tipo: "Entrada", fecha, hora: "08:00", ubicacion: `AU-in-${sufijo}` })
      await crearFichadaManual(page, { tipo: "Salida", fecha, hora: "10:00", ubicacion: `AU-out-${sufijo}` })

      await novedadesTab.click()
      const fila = page
        .getByRole("row")
        .filter({ hasText: EMPLEADO_NOMBRE })
        .filter({ hasText: "Trabajó solo 25%" })
      await expect(fila).toBeVisible()
      await expect(fila).toContainText("Pendiente")
    })
  })

  test("detecta una doble fichada (entrada repetida) en Gestión de Novedades", async ({ page }) => {
    // Registramos dos veces la MISMA entrada (mismo empleado, fecha y hora).
    // La segunda, al caer dentro de los 2 minutos de tolerancia, el sistema la
    // marca como posible duplicado (estado "pendiente").
    const fecha = "2035-06-10"
    const sufijo = Date.now()
    await crearFichadaManual(page, { tipo: "Entrada", fecha, hora: "08:00", ubicacion: `Doble-A-${sufijo}` })
    await crearFichadaManual(page, { tipo: "Entrada", fecha, hora: "08:00", ubicacion: `Doble-B-${sufijo}` })

    // En "Fichadas del Día" -> "Gestión de Novedades" aparece la doble fichada.
    await page.getByRole("tab", { name: /Gestión de Novedades/ }).click()

    const fila = page
      .getByRole("row")
      .filter({ hasText: EMPLEADO_NOMBRE })
      .filter({ hasText: "Doble Fichada" })
    await expect(fila).toBeVisible()
    await expect(fila).toContainText("Entrada")
    await expect(fila).toContainText("posible duplicado")
    await expect(fila).toContainText("Pendiente")
  })
})
