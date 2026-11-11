import { readFile } from 'node:fs/promises'
import { expect, test } from '@playwright/test'
import { openStation, readout, waitForMode } from './station'

test('replays the recording, seeks through it and returns to live', async ({ page }) => {
  await openStation(page)
  await waitForMode(page, 'TAKEOFF')
  await page.getByRole('tab', { name: 'Flight log' }).click()

  await page.getByRole('button', { name: 'Replay recording' }).click()

  await expect(page.getByRole('status')).toHaveText('Replay')
  await expect(page.getByRole('region', { name: 'Flight log' })).toContainText(
    'Recording from this session',
  )
  await page.getByRole('button', { name: 'Pause' }).click()
  const position = page.getByRole('slider', { name: 'Replay position' })

  await position.press('End')
  await waitForMode(page, 'TAKEOFF', 10_000)
  await expect(position).toHaveAttribute('aria-valuetext', /^(\d+:\d\d) of \1$/)

  await position.press('Home')
  await waitForMode(page, 'STANDBY', 10_000)
  await expect(position).toHaveAttribute('aria-valuetext', /^0:00 of /)

  await page.getByRole('button', { name: 'Back to live' }).click()
  await expect(page.getByRole('status')).toContainText('Connected', { timeout: 20_000 })
  await expect(page.getByRole('tab', { name: 'Flight log' })).toBeVisible()
})

test('downloads the recording and opens the file again', async ({ page }) => {
  await openStation(page)
  await waitForMode(page, 'TAKEOFF')
  await page.getByRole('tab', { name: 'Flight log' }).click()

  const downloadEvent = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Download log' }).click()
  const download = await downloadEvent
  const fileName = download.suggestedFilename()
  expect(fileName).toMatch(/^mini-gcs-flight-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/)

  await page.getByLabel('Open a flight log').setInputFiles({
    name: fileName,
    mimeType: 'application/json',
    buffer: await readFile(await download.path()),
  })

  await expect(page.getByRole('status')).toHaveText('Replay')
  await expect(page.getByRole('region', { name: 'Flight log' })).toContainText(fileName)
  await page.getByRole('button', { name: 'Pause' }).click()
  await page.getByRole('slider', { name: 'Replay position' }).press('End')
  await expect(readout(page, 'Flight mode')).toContainText('TAKEOFF')
})

test('explains why a file cannot be opened', async ({ page }) => {
  await openStation(page)
  await page.getByRole('tab', { name: 'Flight log' }).click()

  await page.getByLabel('Open a flight log').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('hello'),
  })

  await expect(page.getByText('notes.json: The file is not valid JSON.')).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Connected')
})
