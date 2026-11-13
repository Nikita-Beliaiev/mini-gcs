import { toRadians, type LatLon } from '../geo/geo'
import { clamp } from '../shared/math'

export const TERRAIN_TILE_URL =
  'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'
export const TERRAIN_TILE_SIZE = 256
export const TERRAIN_MAX_ZOOM = 15

export interface TileAddress {
  zoom: number
  x: number
  y: number
}

export interface TilePixel {
  tile: TileAddress
  column: number
  row: number
}

export function terrainTileUrl({ zoom, x, y }: TileAddress): string {
  return TERRAIN_TILE_URL.replace('{z}', String(zoom))
    .replace('{x}', String(x))
    .replace('{y}', String(y))
}

export function terrariumHeight(red: number, green: number, blue: number): number {
  return red * 256 + green + blue / 256 - 32768
}

export function decodeTerrariumPixels(rgba: Uint8ClampedArray): Float32Array {
  const heights = new Float32Array(rgba.length / 4)
  for (let index = 0; index < heights.length; index += 1) {
    const offset = index * 4
    heights[index] = terrariumHeight(
      rgba[offset] ?? 0,
      rgba[offset + 1] ?? 0,
      rgba[offset + 2] ?? 0,
    )
  }
  return heights
}

export function tilePixelAt(point: LatLon, zoom: number): TilePixel {
  const worldSize = TERRAIN_TILE_SIZE * 2 ** zoom
  const latitude = toRadians(point.lat)
  const worldX = ((point.lon + 180) / 360) * worldSize
  const worldY =
    ((1 - Math.log(Math.tan(latitude) + 1 / Math.cos(latitude)) / Math.PI) / 2) * worldSize
  const x = Math.floor(worldX / TERRAIN_TILE_SIZE)
  const y = Math.floor(worldY / TERRAIN_TILE_SIZE)

  return {
    tile: { zoom, x, y },
    column: worldX - x * TERRAIN_TILE_SIZE,
    row: worldY - y * TERRAIN_TILE_SIZE,
  }
}

export function sampleHeight(heights: Float32Array, column: number, row: number): number {
  const last = TERRAIN_TILE_SIZE - 1
  const u = clamp(column - 0.5, 0, last)
  const v = clamp(row - 0.5, 0, last)
  const left = Math.floor(u)
  const top = Math.floor(v)
  const right = Math.min(left + 1, last)
  const bottom = Math.min(top + 1, last)
  const across = u - left
  const down = v - top

  const at = (pixelColumn: number, pixelRow: number) =>
    heights[pixelRow * TERRAIN_TILE_SIZE + pixelColumn] ?? 0
  const upper = at(left, top) * (1 - across) + at(right, top) * across
  const lower = at(left, bottom) * (1 - across) + at(right, bottom) * across
  return upper * (1 - down) + lower * down
}
