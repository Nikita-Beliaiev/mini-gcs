import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { chromium } from '@playwright/test'

const SOURCE = 'public/favicon.svg'
const OUTPUT_DIRECTORY = 'public/icons'
const BACKGROUND = '#0b0f14'
const ICONS = [
  { file: 'icon-192.png', size: 192, padding: 0 },
  { file: 'icon-512.png', size: 512, padding: 0 },
  { file: 'icon-maskable-512.png', size: 512, padding: 0.1 },
]

const svg = Buffer.from(await readFile(SOURCE)).toString('base64')
const browser = await chromium.launch({ channel: 'chrome' })

try {
  const page = await browser.newPage()
  await mkdir(OUTPUT_DIRECTORY, { recursive: true })
  for (const icon of ICONS) {
    const inner = Math.round(icon.size * (1 - 2 * icon.padding))
    await page.setViewportSize({ width: icon.size, height: icon.size })
    await page.setContent(
      `<body style="margin:0;display:grid;place-items:center;height:100vh;background:${BACKGROUND}">` +
        `<img src="data:image/svg+xml;base64,${svg}" width="${String(inner)}" height="${String(inner)}"></body>`,
    )
    await page.locator('img').evaluate((image: HTMLImageElement) => image.decode())
    await writeFile(`${OUTPUT_DIRECTORY}/${icon.file}`, await page.screenshot({ type: 'png' }))
  }
  console.log(`Wrote ${String(ICONS.length)} icons to ${OUTPUT_DIRECTORY}`)
} finally {
  await browser.close()
}
