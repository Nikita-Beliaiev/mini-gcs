import { expect, type Locator, type Page } from '@playwright/test'

export async function openStation(page: Page, search = ''): Promise<void> {
  await page.goto(`./${search}`)
  await expect(page.getByRole('status')).toContainText('Connected', { timeout: 20_000 })
}

export function readout(page: Page, label: string): Locator {
  return page.getByRole('group', { name: label })
}

export async function waitForMode(page: Page, mode: string, timeout = 60_000): Promise<void> {
  await expect(readout(page, 'Flight mode')).toContainText(mode, { timeout })
}

export function mapCanvas(page: Page): Locator {
  return page.locator('canvas.maplibregl-canvas')
}

export async function clickMapFromCenter(page: Page, dx: number, dy: number): Promise<void> {
  const box = await mapCanvas(page).boundingBox()
  if (!box) {
    throw new Error('The map is not visible')
  }
  await mapCanvas(page).click({ position: { x: box.width / 2 + dx, y: box.height / 2 + dy } })
}

export async function waitForMapAtHome(page: Page): Promise<void> {
  await expect(page.getByRole('img', { name: 'Home' })).toBeVisible()
  await expect(page.getByRole('img', { name: 'Vehicle' })).toBeVisible()
}
