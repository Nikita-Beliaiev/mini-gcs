import { readFile } from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'
import { clickMapFromCenter, openStation, waitForMapAtHome, waitForMode } from './station'
import { serveFlatTerrain } from './terrain'

const ALPHA_COT =
  '<?xml version="1.0" encoding="UTF-8"?><event version="2.0" uid="tak-alpha" type="a-f-G-U-C-I" how="h-e" time="2026-11-16T09:30:00Z" start="2026-11-16T09:30:00Z" stale="2026-11-17T09:30:00Z"><point lat="43.0995" lon="11.6445" hae="9999999.0" ce="9999999.0" le="9999999.0"/><detail><contact callsign="Alpha"/></detail></event>'

function marksPanel(page: Page) {
  return page.getByRole('region', { name: 'Marks' })
}

async function addMark(page: Page, name: string, affiliation: string, type: string) {
  const card = page.getByRole('region', { name: 'Selected point' })
  await card.getByRole('button', { name: 'Add mark' }).click()
  await card.getByRole('textbox', { name: 'Name' }).fill(name)
  await card.getByRole('combobox', { name: 'Affiliation' }).selectOption({ label: affiliation })
  await card.getByRole('combobox', { name: 'Type' }).selectOption({ label: type })
  await card.getByRole('button', { name: 'Save mark' }).click()
  await expect(card).toContainText(`Mark “${name}” added`)
}

test.beforeEach(async ({ page }) => {
  await serveFlatTerrain(page, 300)
})

test('adds a mark on the map, keeps it after a reload, renames and removes it', async ({
  page,
}) => {
  await openStation(page)
  await waitForMapAtHome(page)

  await clickMapFromCenter(page, -150, 90)
  await addMark(page, 'Ford', 'Hostile', 'Vehicle')
  await expect(page.getByRole('img', { name: 'Ford: Vehicle (hostile)' })).toBeVisible()
  await expect(marksPanel(page)).toContainText('Vehicle (hostile)')

  await page.reload()
  await waitForMapAtHome(page)
  await expect(page.getByRole('img', { name: 'Ford: Vehicle (hostile)' })).toBeVisible()

  await marksPanel(page).getByRole('button', { name: 'Rename Ford' }).click()
  await marksPanel(page).getByRole('textbox', { name: 'New name' }).fill('Bridge')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('img', { name: 'Bridge: Vehicle (hostile)' })).toBeVisible()

  await marksPanel(page).getByRole('button', { name: 'Remove Bridge' }).click()
  await expect(marksPanel(page)).toContainText('No marks yet.')
  await expect(page.getByRole('img', { name: /^Bridge:/ })).toHaveCount(0)
})

test('marks the point under the crosshair of the camera view', async ({ page }) => {
  await openStation(page)
  await waitForMode(page, 'AUTO')

  const camera = page.getByRole('region', { name: 'Camera', exact: true })
  await camera.getByRole('button', { name: 'Pick a point in the camera view' }).focus()
  await page.keyboard.press('Enter')
  await addMark(page, 'Observed', 'Unknown', 'Ground track')

  await expect(marksPanel(page)).toContainText('Ground track (unknown)')
  await expect(page.getByRole('img', { name: 'Observed: Ground track (unknown)' })).toBeVisible()
})

test('exports marks as GeoJSON and CoT and imports a CoT event', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)
  await clickMapFromCenter(page, -150, 90)
  await addMark(page, 'Ford', 'Hostile', 'Vehicle')

  const geoJsonDownload = page.waitForEvent('download')
  await marksPanel(page).getByRole('button', { name: 'Download GeoJSON' }).click()
  const geoJsonFile = await geoJsonDownload
  expect(geoJsonFile.suggestedFilename()).toMatch(/^mini-gcs-marks-.+\.geojson$/)
  const geoJson = JSON.parse(await readFile(await geoJsonFile.path(), 'utf8')) as {
    features: { properties: { name: string; sidc: string } }[]
  }
  expect(geoJson.features.map(({ properties }) => properties)).toEqual([
    expect.objectContaining({ name: 'Ford', sidc: 'SHGPEV---------' }),
  ])

  const cotDownload = page.waitForEvent('download')
  await marksPanel(page).getByRole('button', { name: 'Download Ford as CoT' }).click()
  const cotFile = await cotDownload
  expect(cotFile.suggestedFilename()).toBe('Ford.cot')
  expect(await readFile(await cotFile.path(), 'utf8')).toContain('type="a-h-G-E-V"')

  await page.getByLabel('Import marks').setInputFiles({
    name: 'alpha.cot',
    mimeType: 'application/xml',
    buffer: Buffer.from(ALPHA_COT),
  })
  await expect(marksPanel(page)).toContainText('Imported 1 mark.')
  await expect(page.getByRole('img', { name: 'Alpha: Infantry (friend)' })).toBeVisible()
})
