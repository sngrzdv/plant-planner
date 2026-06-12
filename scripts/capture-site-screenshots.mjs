/**
 * Снимает скриншоты всех основных страниц «Мой огород».
 *
 * Требуется: npx playwright install chromium
 * Env: DEMO_EMAIL, DEMO_PASSWORD, опционально SCREENSHOT_BASE_URL
 */
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const OUT_DIR = path.join(__dirname, '..', 'docs', 'screenshots')
const BASE_URL = (process.env.SCREENSHOT_BASE_URL || 'https://plant-planner-nu.vercel.app').replace(/\/$/, '')
const EMAIL = process.env.DEMO_EMAIL
const PASSWORD = process.env.DEMO_PASSWORD

async function loadPlaywright() {
  try {
    return await import('playwright')
  } catch {
    console.error(`
Playwright не установлен. Выполните:

  npx playwright install chromium
  npm install -D playwright

Затем снова: npm run screenshots
`)
    process.exit(1)
  }
}

async function shot(page, name, url, { waitMs = 2000, fullPage = true } = {}) {
  const target = url.startsWith('http') ? url : `${BASE_URL}${url}`
  console.log(`  → ${name}: ${target}`)
  await page.goto(target, { waitUntil: 'networkidle', timeout: 60_000 })
  await page.waitForTimeout(waitMs)
  await page.screenshot({
    path: path.join(OUT_DIR, `${name}.png`),
    fullPage,
  })
}

async function login(page) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' })
  await page.fill('#login-email', EMAIL)
  await page.fill('#login-password', PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 })
}

async function discoverDynamicRoutes(page) {
  const routes = []
  await page.goto(`${BASE_URL}/catalog`, { waitUntil: 'networkidle' })
  const plantLink = await page.locator('a[href^="/plant/"]').first().getAttribute('href').catch(() => null)
  if (plantLink) routes.push({ name: '11-plant-detail', url: plantLink })

  await page.goto(`${BASE_URL}/gardens`, { waitUntil: 'networkidle' })
  const gardenView = await page.locator('a[href^="/garden/"]:not([href*="/edit"])').first().getAttribute('href').catch(() => null)
  if (gardenView) {
    routes.push({ name: '12-garden-view', url: gardenView })
    routes.push({ name: '13-garden-edit', url: `${gardenView}/edit` })
  }
  const bedEdit = await page.locator('a[href^="/bed/"]').first().getAttribute('href').catch(() => null)
  if (bedEdit) routes.push({ name: '14-bed-editor', url: bedEdit })

  return routes
}

async function main() {
  if (!EMAIL || !PASSWORD) {
    console.error(`
Укажите тестовый аккаунт в .env:

  DEMO_EMAIL=test@example.com
  DEMO_PASSWORD=secret

Аккаунт не будет закоммичен — только локально.
`)
    process.exit(1)
  }

  const { chromium } = await loadPlaywright()
  await mkdir(OUT_DIR, { recursive: true })

  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })

  const publicPages = [
    { name: '01-login', url: '/login' },
    { name: '02-register', url: '/register' },
    { name: '03-guide', url: '/guide' },
    { name: '04-terms', url: '/terms' },
    { name: '05-privacy', url: '/privacy' },
  ]

  console.log(`Базовый URL: ${BASE_URL}\nПубличные страницы:`)
  for (const p of publicPages) {
    await shot(page, p.name, p.url)
  }

  console.log('\nВход и защищённые страницы:')
  await login(page)

  const authPages = [
    { name: '06-dashboard', url: '/dashboard' },
    { name: '07-gardens', url: '/gardens' },
    { name: '08-catalog', url: '/catalog' },
    { name: '09-pots', url: '/pots' },
    { name: '10-reminders', url: '/reminders' },
    { name: '15-lunar', url: '/lunar' },
    { name: '16-profile', url: '/profile' },
  ]

  for (const p of authPages) {
    await shot(page, p.name, p.url)
  }

  const dynamic = await discoverDynamicRoutes(page)
  for (const p of dynamic) {
    await shot(page, p.name, p.url, { waitMs: 3000 })
  }

  await page.goto(`${BASE_URL}/admin`, { waitUntil: 'networkidle' })
  const isAdmin = !(await page.locator('text=Доступ запрещён').isVisible().catch(() => false))
  if (isAdmin) {
    await shot(page, '17-admin', '/admin', { waitMs: 2500 })
  } else {
    console.log('  (пропуск /admin — не админ)')
  }

  await browser.close()

  const manifest = {
    generatedAt: new Date().toISOString(),
    baseUrl: BASE_URL,
    files: [...publicPages, ...authPages, ...dynamic].map((p) => `${p.name}.png`),
  }
  await writeFile(path.join(OUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2))

  console.log(`\nГотово. Скриншоты: ${OUT_DIR}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
