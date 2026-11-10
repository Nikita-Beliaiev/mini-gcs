import { expect, test } from '@playwright/test'
import { clickMapFromCenter, openStation, waitForMapAtHome, waitForMode } from './station'

const SQUARE_AROUND_HOME = [
  [-100, -100],
  [100, -100],
  [100, 100],
  [-100, 100],
] as const

test('uploads a geofence and brings the vehicle home when it flies out', async ({ page }) => {
  test.setTimeout(150_000)
  await openStation(page)
  await waitForMapAtHome(page)

  await page.getByRole('tab', { name: 'Geofence' }).click()
  await page.getByRole('button', { name: 'Edit on map' }).click()
  for (const [dx, dy] of SQUARE_AROUND_HOME) {
    await clickMapFromCenter(page, dx, dy)
  }
  await expect(
    page.getByRole('list', { name: 'Geofence vertices' }).getByRole('listitem'),
  ).toHaveCount(4)

  await page.getByRole('button', { name: 'Upload to vehicle' }).click()
  await expect(page.getByText('Accepted by the vehicle')).toBeVisible()
  await expect(page.getByText('Vehicle geofence: 4 vertices')).toBeVisible()

  await expect(page.getByRole('region', { name: 'Alerts' })).toContainText(
    'Vehicle is outside the geofence',
    { timeout: 90_000 },
  )
  await waitForMode(page, 'RTL', 10_000)
})
