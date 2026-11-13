import { mkdir, writeFile } from 'node:fs/promises'
import { chromium, type Locator, type Page } from '@playwright/test'
import { preview } from 'vite'
import { encodeGif, type Frame } from './gif'

const OUTPUT_PATH = 'docs/demo.gif'
const PORT = 4176
const VIEWPORT = { width: 1280, height: 1000 }
const FRAME_INTERVAL_MS = 160

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function showCursor(): void {
  window.addEventListener('DOMContentLoaded', () => {
    const cursor = document.createElement('div')
    cursor.style.cssText =
      'position:fixed;z-index:9999;left:-40px;top:-40px;width:20px;height:20px;margin:-10px 0 0 -10px;' +
      'border:2px solid #fff;border-radius:50%;background:rgb(56 189 248 / 0.45);pointer-events:none;' +
      'transition:transform 80ms'
    document.body.append(cursor)
    document.addEventListener(
      'mousemove',
      (event) => {
        cursor.style.left = `${String(event.clientX)}px`
        cursor.style.top = `${String(event.clientY)}px`
      },
      true,
    )
    document.addEventListener('mousedown', () => (cursor.style.transform = 'scale(0.7)'), true)
    document.addEventListener('mouseup', () => (cursor.style.transform = ''), true)
  })
}

function startRecording(page: Page) {
  const frames: Frame[] = []
  const recording = new AbortController()
  const loop = (async () => {
    while (!recording.signal.aborted) {
      const capturedAtMs = Date.now()
      frames.push({ png: await page.screenshot({ type: 'png' }), capturedAtMs })
      await delay(Math.max(0, FRAME_INTERVAL_MS - (Date.now() - capturedAtMs)))
    }
  })()

  return async () => {
    recording.abort()
    await loop
    return frames
  }
}

async function moveTo(page: Page, x: number, y: number): Promise<void> {
  await page.mouse.move(x, y, { steps: 12 })
}

async function clickLocator(page: Page, locator: Locator): Promise<void> {
  await locator.scrollIntoViewIfNeeded()
  const box = await locator.boundingBox()
  if (!box) {
    throw new Error('Nothing to click')
  }
  await moveTo(page, box.x + box.width / 2, box.y + box.height / 2)
  await delay(150)
  await page.mouse.down()
  await page.mouse.up()
}

async function clickMap(page: Page, dx: number, dy: number): Promise<void> {
  const box = await page
    .getByRole('region', { name: 'Map', exact: true })
    .and(page.locator('canvas'))
    .boundingBox()
  if (!box) {
    throw new Error('The map is not visible')
  }
  await moveTo(page, box.x + box.width / 2 + dx, box.y + box.height / 2 + dy)
  await delay(150)
  await page.mouse.down()
  await page.mouse.up()
  await delay(250)
}

async function playScenario(page: Page): Promise<void> {
  await delay(2500)

  await clickLocator(page, page.getByRole('button', { name: 'Draw route on map' }))
  await delay(500)
  await clickMap(page, 170, -60)
  await clickMap(page, 230, 110)
  await clickMap(page, 40, 160)
  await delay(600)

  await clickLocator(page, page.getByRole('button', { name: 'Upload to vehicle' }))
  await page.getByText('Accepted by the vehicle').waitFor()
  await delay(3500)

  await clickLocator(page, page.getByRole('tab', { name: 'Simulator' }))
  await delay(600)
  await clickLocator(page, page.getByRole('button', { name: 'Drop the link for 10 s' }))
  await page.getByRole('button', { name: /^Acknowledge: Link lost/ }).waitFor()
  await delay(1500)
  await clickLocator(page, page.getByRole('button', { name: /^Acknowledge: Link lost/ }))
  await delay(2000)
}

const server = await preview({ preview: { port: PORT, strictPort: true, host: '127.0.0.1' } })
const browser = await chromium.launch({ channel: 'chrome', args: ['--enable-unsafe-swiftshader'] })

try {
  const page = await browser.newPage({ viewport: VIEWPORT, locale: 'en-US' })
  await page.addInitScript(showCursor)
  await page.goto(`http://127.0.0.1:${String(PORT)}/`)
  await page
    .getByRole('group', { name: 'Flight mode' })
    .getByText('AUTO')
    .waitFor({ timeout: 60_000 })
  await delay(4000)

  const stopRecording = startRecording(page)
  let frames: Frame[] = []
  try {
    await playScenario(page)
  } finally {
    frames = await stopRecording()
  }
  const scrolledBy = await page.evaluate(() => window.scrollY)
  if (scrolledBy > 0) {
    throw new Error(`The page scrolled by ${String(scrolledBy)} px during the demo`)
  }

  const gif = encodeGif(frames)
  await mkdir('docs', { recursive: true })
  await writeFile(OUTPUT_PATH, gif)
  console.log(
    `Wrote ${OUTPUT_PATH}: ${String(frames.length)} frames, ${(gif.length / 1024 / 1024).toFixed(1)} MB`,
  )
} finally {
  await browser.close()
  await server.close()
}
