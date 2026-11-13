import {
  decodeTerrariumPixels,
  TERRAIN_TILE_SIZE,
  terrainTileUrl,
  type TileAddress,
} from './terrarium'

export async function loadTerrariumTile(tile: TileAddress): Promise<Float32Array> {
  const response = await fetch(terrainTileUrl(tile))
  if (!response.ok) {
    throw new Error(`Terrain tile request failed with HTTP ${String(response.status)}`)
  }
  const image = await createImageBitmap(await response.blob(), {
    colorSpaceConversion: 'none',
    premultiplyAlpha: 'none',
  })
  try {
    if (image.width !== TERRAIN_TILE_SIZE || image.height !== TERRAIN_TILE_SIZE) {
      throw new Error('A terrain tile has an unexpected size')
    }
    const context = new OffscreenCanvas(TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE).getContext('2d')
    if (!context) {
      throw new Error('A 2D canvas is not available')
    }
    context.drawImage(image, 0, 0)
    const { data } = context.getImageData(0, 0, TERRAIN_TILE_SIZE, TERRAIN_TILE_SIZE)
    return decodeTerrariumPixels(data)
  } finally {
    image.close()
  }
}
