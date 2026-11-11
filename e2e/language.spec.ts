import { expect, test, type Page } from '@playwright/test'
import { openStation } from './station'

async function expectUkrainianStation(page: Page): Promise<void> {
  await expect(page.getByRole('status')).toContainText('Підключено', { timeout: 20_000 })
  await expect(page.locator('html')).toHaveAttribute('lang', 'uk')
  await expect(page.getByRole('tab', { name: 'Місія' })).toBeVisible()
}

test('opens in Ukrainian from a link and keeps a switch to English', async ({ page }) => {
  await page.goto('./?lang=uk')

  await expectUkrainianStation(page)
  await expect(page.getByRole('img', { name: 'Точка старту' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Наблизити' })).toBeVisible()
  await expect(page.getByRole('region', { name: 'Останні 60 секунд' })).toContainText('Висота, м')

  await page.getByRole('button', { name: 'EN' }).click()
  await expect(page).toHaveURL(/[?&]lang=en(&|$)/)
  await expect(page.getByRole('button', { name: 'Zoom in' })).toBeVisible()

  await page.reload()
  await expect(page.getByRole('status')).toContainText('Connected', { timeout: 20_000 })
  await expect(page.locator('html')).toHaveAttribute('lang', 'en')
})

test('remembers Ukrainian after a reload', async ({ page }) => {
  await openStation(page)

  await page.getByRole('button', { name: 'УКР' }).click()
  await expect(page.getByRole('tab', { name: 'Місія' })).toBeVisible()
  await page.reload()

  await expectUkrainianStation(page)
})

test.describe('with the browser set to Ukrainian', () => {
  test.use({ locale: 'uk-UA' })

  test('opens in Ukrainian', async ({ page }) => {
    await page.goto('./')

    await expectUkrainianStation(page)
  })
})
