import { expect, test, type Page } from '@playwright/test'
import { clickMapFromCenter, openStation, waitForMapAtHome, waitForMode } from './station'
import { serveFlatTerrain } from './terrain'

function cameraPanel(page: Page) {
  return page.getByRole('region', { name: 'Camera', exact: true })
}

test.beforeEach(async ({ page }) => {
  await serveFlatTerrain(page, 300)
})

test('shows a synthetic camera view with its angles and frame centre', async ({ page }) => {
  await openStation(page)
  await waitForMode(page, 'AUTO')

  const camera = cameraPanel(page)
  await expect(camera.locator('canvas')).toBeVisible()
  await expect(camera.locator('[data-aimed="true"]')).toBeVisible()
  await expect(camera).toContainText('Tilt -15° Pan 0°')
  await expect(camera).toContainText(/32T [A-Z]{2} \d{5} \d{5} · Range 309 m/)
  await expect(camera).toContainText('Synthetic view')
})

test('steers the camera and keeps a clicked point in view', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)
  const camera = cameraPanel(page)

  await camera.getByRole('button', { name: 'Look down' }).click()
  await expect(camera).toContainText('Tilt -90° Pan 0°')
  await camera.getByRole('button', { name: 'Tilt up' }).click()
  await expect(camera).toContainText('Tilt -80° Pan 0°')

  await clickMapFromCenter(page, -150, 100)
  const card = page.getByRole('region', { name: 'Selected point' })
  await card.getByRole('button', { name: 'Point camera here' }).click()

  await expect(card).toContainText('The camera keeps this point in view')
  await expect(camera).toContainText('Tracking a point')
})

test('marks the ground point under the crosshair of the camera view', async ({ page }) => {
  await openStation(page)
  await waitForMode(page, 'AUTO')

  const pick = cameraPanel(page).getByRole('button', { name: 'Pick a point in the camera view' })
  await pick.focus()
  await page.keyboard.press('Enter')

  const card = page.getByRole('region', { name: 'Selected point' })
  await expect(card).toContainText(/From vehicle\s*(29\d|30\d|31\d) m/)
})

test('replays the camera without its controls', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)

  await page.getByRole('tab', { name: 'Flight log' }).click()
  await page.getByRole('button', { name: 'Replay recording' }).click()
  await expect(page.getByRole('status')).toHaveText('Replay')

  const camera = cameraPanel(page)
  await expect(camera).toContainText('Tilt -15° Pan 0°')
  await expect(camera.getByRole('group', { name: 'Camera controls' })).toHaveCount(0)
})
