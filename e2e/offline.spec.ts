import { expect, test } from '@playwright/test'
import { openStation, readout, waitForMapAtHome } from './station'
import { serveFlatTerrain } from './terrain'

test.use({ serviceWorkers: 'allow' })

test('opens without a network from the saved area', async ({ page, context }) => {
  await serveFlatTerrain(page, 300)
  await openStation(page)
  await waitForMapAtHome(page)

  const offline = page.getByRole('region', { name: 'Offline map' })
  await expect(offline).toContainText('The station opens without a network.', {
    timeout: 30_000,
  })
  await offline.getByRole('button', { name: 'Save the area for offline use' }).click()
  await expect(offline).toContainText(/The area is saved: \d+\.\d MB/, { timeout: 30_000 })

  const failedAreaRequests: string[] = []
  const externalRequests: string[] = []
  page.on('requestfailed', (request) => {
    if (request.url().includes('/area/')) {
      failedAreaRequests.push(request.url())
    }
  })
  page.on('request', (request) => {
    if (!request.url().startsWith('http://127.0.0.1')) {
      externalRequests.push(new URL(request.url()).host)
    }
  })

  await context.setOffline(true)
  await page.reload()

  await expect(page.getByRole('status')).toContainText('Connected', { timeout: 20_000 })
  await expect(page.getByText('No network', { exact: true })).toBeVisible()
  await waitForMapAtHome(page)
  await expect(offline).toContainText('No network: the map and terrain come from the area package.')
  await expect(offline).toContainText('The area is saved')
  await expect(readout(page, 'Above sea level')).toContainText(/\d{3}\.\d\s*m/, {
    timeout: 20_000,
  })
  await expect(page.locator('.maplibregl-ctrl-attrib-inner').first()).toContainText('OpenStreetMap')
  await expect(page.locator('.maplibregl-ctrl-attrib-inner').first()).not.toContainText(
    'OpenFreeMap',
  )
  expect(failedAreaRequests).toEqual([])
  expect(new Set(externalRequests)).toEqual(new Set())
})
