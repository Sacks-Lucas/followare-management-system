import { defineConfig, devices } from "@playwright/test"

/**
 * Configuración de Playwright para WorkForce Pro.
 *
 * La app usa `basePath: '/followare-management-system'` (ver next.config.mjs),
 * por lo que todas las rutas en dev se sirven bajo ese prefijo. Por eso el
 * `baseURL` incluye el basePath y los tests navegan con rutas relativas
 * (ej: page.goto("login")).
 */
const PORT = 3000
const BASE_PATH = "/followare-management-system"

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    // Trailing slash para que las rutas relativas conserven el basePath.
    baseURL: `http://localhost:${PORT}${BASE_PATH}/`,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Para correr en otros navegadores, descomentá estos proyectos.
    // Requieren que `npx playwright install` los haya instalado correctamente
    // (en algunos entornos Windows Firefox/WebKit pueden no levantar).
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
  ],

  // Levanta el servidor de Next automáticamente antes de correr los tests.
  webServer: {
    command: "npm run dev",
    url: `http://localhost:${PORT}${BASE_PATH}/login`,
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
})
