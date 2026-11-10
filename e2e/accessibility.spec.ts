import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { openStation, waitForMapAtHome } from './station'

const WCAG_AA = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

async function violations(page: Page): Promise<string[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_AA).analyze()
  return results.violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} (${violation.nodes.map((node) => node.target.join(' ')).join(', ')})`,
  )
}

test('meets WCAG 2.2 AA checks on every control tab and with an alert raised', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)
  await expect(page.getByRole('region', { name: 'Last 60 seconds' }).locator('canvas')).toHaveCount(
    3,
  )

  expect(await violations(page)).toEqual([])

  await page.getByRole('tab', { name: 'Geofence' }).click()
  expect(await violations(page)).toEqual([])

  await page.getByRole('tab', { name: 'Simulator' }).click()
  await page.getByRole('button', { name: 'Drop the link for 10 s' }).click()
  await expect(page.getByRole('region', { name: 'Alerts' })).toContainText('Link lost')
  expect(await violations(page)).toEqual([])
})
