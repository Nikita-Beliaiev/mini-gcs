import type { LatLon } from '../geo/geo'
import { tilePixelAt, type TileAddress } from '../terrain/terrarium'

export interface AreaBounds {
  west: number
  south: number
  east: number
  north: number
}

export const DEMO_AREA_BOUNDS: AreaBounds = { west: 11.58, south: 43.05, east: 11.71, north: 43.14 }
export const AREA_MAP_MAX_ZOOM = 15
export const AREA_TERRAIN_MAX_ZOOM = 13

export const AREA_DIRECTORY = 'area'
export const AREA_MAP_FILE = 'val-dorcia.pmtiles'
export const AREA_TERRAIN_FILE = 'val-dorcia-terrain.pmtiles'
export const AREA_MANIFEST_FILE = 'manifest.json'

export function isInsideArea(point: LatLon, bounds: AreaBounds = DEMO_AREA_BOUNDS): boolean {
  return (
    point.lat >= bounds.south &&
    point.lat <= bounds.north &&
    point.lon >= bounds.west &&
    point.lon <= bounds.east
  )
}

export function tilesCovering(bounds: AreaBounds, zoom: number): TileAddress[] {
  const northWest = tilePixelAt({ lat: bounds.north, lon: bounds.west }, zoom).tile
  const southEast = tilePixelAt({ lat: bounds.south, lon: bounds.east }, zoom).tile
  const tiles: TileAddress[] = []
  for (let x = northWest.x; x <= southEast.x; x += 1) {
    for (let y = northWest.y; y <= southEast.y; y += 1) {
      tiles.push({ zoom, x, y })
    }
  }
  return tiles
}

export function boundsText({ west, south, east, north }: AreaBounds): string {
  return [west, south, east, north].join(',')
}
