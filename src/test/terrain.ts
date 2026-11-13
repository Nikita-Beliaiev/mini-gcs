import type { LatLon } from '../geo/geo'
import type { TerrainSampler } from '../terrain/terrainSampler'

export function fakeTerrain(elevationAt: (point: LatLon) => number | null): TerrainSampler {
  return {
    elevationAt,
    getVersion: () => 0,
    subscribe: () => () => undefined,
  }
}

export function flatTerrain(elevation: number): TerrainSampler {
  return fakeTerrain(() => elevation)
}
