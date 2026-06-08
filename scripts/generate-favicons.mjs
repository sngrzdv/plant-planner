/**
 * Генерация чётких PNG из большого исходника или SVG.
 *
 * Вариант A (лучший): скачайте с Icons8 PNG 96 или 192 px → public/icon-source.png
 * Вариант B: используйте public/app-icon.svg (уже в проекте)
 *
 * Запуск: npm run icons
 */
import { mkdir, access, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '..', 'public')

const SIZES = [
  { name: 'favicon-16.png', size: 16 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-48.png', size: 48 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
]

async function exists(filePath) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

async function pickSource() {
  const pngSource = path.join(publicDir, 'icon-source.png')
  const svgSource = path.join(publicDir, 'app-icon.svg')

  if (await exists(pngSource)) {
    const meta = await sharp(pngSource).metadata()
    if ((meta.width ?? 0) < 48) {
      console.warn(
        `⚠ icon-source.png слишком мал (${meta.width}px). Скачайте 96–192 px с Icons8 для максимальной чёткости.`
      )
    }
    return sharp(pngSource)
  }

  if (await exists(svgSource)) {
    console.log('Используется app-icon.svg (вектор → чёткие PNG на любом размере)')
    return sharp(svgSource, { density: 300 })
  }

  throw new Error('Нет icon-source.png и app-icon.svg в public/')
}

async function main() {
  await mkdir(publicDir, { recursive: true })
  const pipeline = await pickSource()

  for (const { name, size } of SIZES) {
    const out = path.join(publicDir, name)
    await pipeline
      .clone()
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png({ compressionLevel: 9 })
      .toFile(out)
    console.log(`✓ ${name} (${size}×${size})`)
  }

  await pipeline
    .clone()
    .resize(32, 32)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'))

  console.log('✓ favicon.png (32×32, основной)')
  console.log('\nГотово. Обновите вкладку с Ctrl+F5.')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
