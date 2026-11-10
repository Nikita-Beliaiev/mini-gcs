import { expect, test } from '@playwright/test'
import { clickMapFromCenter, mapCanvas, openStation, waitForMapAtHome } from './station'

test('plans a mission on the map and uploads it to the vehicle', async ({ page }) => {
  await openStation(page)
  await waitForMapAtHome(page)

  await page.getByRole('button', { name: 'Edit on map' }).click()
  await clickMapFromCenter(page, 150, -100)
  await clickMapFromCenter(page, -150, -120)

  const waypoints = page.getByRole('list', { name: 'Mission waypoints' }).getByRole('listitem')
  await expect(waypoints).toHaveCount(2)

  const firstBeforeDrag = await waypoints.first().textContent()
  const canvasBox = await mapCanvas(page).boundingBox()
  if (!canvasBox) {
    throw new Error('The map is not visible')
  }
  await page.getByRole('img', { name: 'Draft waypoint 1' }).dragTo(mapCanvas(page), {
    targetPosition: { x: canvasBox.width / 2 + 220, y: canvasBox.height / 2 + 60 },
  })
  await expect(waypoints.first()).not.toHaveText(firstBeforeDrag ?? '')
  await expect(waypoints).toHaveCount(2)

  await page.getByRole('button', { name: 'Upload to vehicle' }).click()

  await expect(page.getByText('Accepted by the vehicle')).toBeVisible()
  await expect(page.getByText(/^Vehicle mission 2: 2 waypoints/)).toBeVisible()
})
