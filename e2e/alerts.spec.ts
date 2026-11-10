import { expect, test } from '@playwright/test'
import { openStation, waitForMode } from './station'

test('raises a link loss alert, lets the operator acknowledge it and clears it', async ({
  page,
}) => {
  await openStation(page)
  await page.getByRole('tab', { name: 'Simulator' }).click()

  await page.getByRole('button', { name: 'Drop the link for 10 s' }).click()

  const alerts = page.getByRole('region', { name: 'Alerts' })
  await expect(alerts).toContainText('Link lost')
  await expect(page.getByText('1 active alert')).toBeVisible()

  const acknowledge = page.getByRole('button', { name: /^Acknowledge: Link lost/ })
  await acknowledge.click()
  await expect(acknowledge).toHaveCount(0)
  await expect(alerts).toContainText('Link lost')

  await expect(alerts).not.toContainText('Link lost', { timeout: 15_000 })
  await expect(page.getByText('No active alerts')).toBeVisible()
})

test('warns about a battery drop and returns home', async ({ page }) => {
  await openStation(page)
  await waitForMode(page, 'AUTO')
  await page.getByRole('tab', { name: 'Simulator' }).click()

  await page.getByRole('button', { name: 'Drain the battery to 32%' }).click()

  await expect(page.getByRole('region', { name: 'Alerts' })).toContainText('Battery below 35%')
  await waitForMode(page, 'RTL', 15_000)
})
