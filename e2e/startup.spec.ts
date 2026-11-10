import { expect, test } from '@playwright/test'
import { openStation, readout, waitForMapAtHome, waitForMode } from './station'

test('connects to the simulated vehicle and shows it flying', async ({ page }) => {
  await openStation(page)

  await waitForMapAtHome(page)
  await expect(page.getByRole('img', { name: 'Attitude indicator' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Last 60 seconds' }).locator('canvas')).toHaveCount(
    3,
  )
  await expect(page.getByRole('status')).toContainText(/Connected · (<1|\d+) ms/)

  await waitForMode(page, 'AUTO')
  await expect(readout(page, 'Altitude')).toContainText('40.0 m')
  await expect(readout(page, 'Arming')).toContainText('Armed')
})
