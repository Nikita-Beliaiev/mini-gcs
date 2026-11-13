import type { Page } from '@playwright/test'
import { PNG } from 'pngjs'

const TILE_SIZE = 256

function flatTerrariumTile(elevationM: number): Buffer {
  const encoded = elevationM + 32768
  const red = Math.floor(encoded / 256)
  const green = Math.floor(encoded % 256)
  const blue = Math.round((encoded % 1) * 256)
  const png = new PNG({ width: TILE_SIZE, height: TILE_SIZE })
  for (let offset = 0; offset < png.data.length; offset += 4) {
    png.data[offset] = red
    png.data[offset + 1] = green
    png.data[offset + 2] = blue
    png.data[offset + 3] = 255
  }
  return PNG.sync.write(png)
}

export async function serveFlatTerrain(page: Page, elevationM: number): Promise<void> {
  const tile = flatTerrariumTile(elevationM)
  await page.route('**/elevation-tiles-prod/terrarium/**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'image/png',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: tile,
    }),
  )
}
