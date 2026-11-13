import { expect, test } from '@playwright/test'
import {
  clickMapFromCenter,
  mapCanvas,
  openStation,
  readout,
  waitForMapAtHome,
  waitForMode,
} from './station'
import { serveFlatTerrain } from './terrain'

test.beforeEach(async ({ page }) => {
  await serveFlatTerrain(page, 300)
})

test('shows the altitude above the ground and above sea level', async ({ page }) => {
  await openStation(page)
  await waitForMode(page, 'AUTO')

  await expect(readout(page, 'Above home')).toContainText('80.0 m')
  await expect(readout(page, 'Above sea level')).toContainText('380.0 m')
  await expect(readout(page, 'Above ground')).toContainText('80.0 m')
})

test('reads coordinates under the cursor and inspects a clicked point', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openStation(page)
  await waitForMapAtHome(page)

  const box = await mapCanvas(page).boundingBox()
  if (!box) {
    throw new Error('The map is not visible')
  }
  await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 - 60)
  const cursor = page.getByRole('group', { name: 'Cursor position' })
  await expect(cursor).toContainText('Elevation 300 m')
  await expect(cursor).toContainText(/32T [A-Z]{2} \d{5} \d{5}/)

  await clickMapFromCenter(page, 80, -60)
  const card = page.getByRole('region', { name: 'Selected point' })
  await expect(card).toContainText('300 m')
  await expect(card).toContainText(/From home\s*\d+ m, \d{3}°/)

  await card.getByRole('button', { name: 'Copy coordinates' }).click()
  await expect(card).toContainText('Coordinates copied')
  expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(
    /^43\.\d{5}, 11\.\d{5}$/,
  )

  await card.getByRole('button', { name: 'Close' }).click()
  await expect(card).toBeHidden()
})

test('shows the terrain profile of a drawn route', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)

  await page.getByRole('button', { name: 'Draw route on map' }).click()
  await clickMapFromCenter(page, 120, -80)
  await clickMapFromCenter(page, -100, -120)
  await page.getByRole('button', { name: 'Done' }).click()

  const profile = page.getByRole('figure', { name: 'Terrain profile' })
  await expect(profile.locator('canvas')).toBeVisible()
  await expect(profile).toContainText(
    'Lowest clearance: 80 m above the ground, between home and WP 1.',
  )
})

test('raises the terrain in 3D', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)

  const terrain3d = page.getByRole('button', { name: '3D terrain' })
  await terrain3d.click()
  await expect(terrain3d).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('img', { name: 'Vehicle' })).toBeVisible()
})
