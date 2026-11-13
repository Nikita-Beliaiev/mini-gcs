import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'
import { clickMapFromCenter, openStation, waitForMapAtHome } from './station'
import { serveFlatTerrain } from './terrain'

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

test('meets WCAG 2.2 AA checks in Ukrainian while drawing a route', async ({ page }) => {
  await page.goto('./?lang=uk')
  await expect(page.getByRole('status')).toContainText('Підключено', { timeout: 20_000 })
  await expect(page.getByRole('img', { name: 'Точка старту' })).toBeVisible()

  await page.getByRole('button', { name: 'Намалювати маршрут на карті' }).click()
  await expect(page.getByText(/^Малювання маршруту/)).toBeVisible()

  expect(await violations(page)).toEqual([])
})

test('meets WCAG 2.2 AA checks with a selected point and a terrain profile', async ({ page }) => {
  await serveFlatTerrain(page, 300)
  await openStation(page)
  await waitForMapAtHome(page)

  await page.getByRole('button', { name: 'Draw route on map' }).click()
  await clickMapFromCenter(page, 120, -80)
  await page.getByRole('button', { name: 'Done' }).click()
  await clickMapFromCenter(page, -100, 60)
  await expect(page.getByRole('region', { name: 'Selected point' })).toBeVisible()
  await expect(
    page.getByRole('figure', { name: 'Terrain profile' }).locator('canvas'),
  ).toBeVisible()

  expect(await violations(page)).toEqual([])
})

test('meets WCAG 2.2 AA checks on the flight log tab and during a replay', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)
  await page.getByRole('tab', { name: 'Flight log' }).click()
  expect(await violations(page)).toEqual([])

  await page.getByRole('button', { name: 'Replay recording' }).click()
  await expect(page.getByRole('status')).toHaveText('Replay')
  await waitForMapAtHome(page)
  expect(await violations(page)).toEqual([])
})
