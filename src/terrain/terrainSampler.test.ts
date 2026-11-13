import { describe, expect, it, vi } from 'vitest'
import { DEMO_HOME } from '../simulator/demoArea'
import { createTerrainSampler, TERRAIN_RETRY_AFTER_MS } from './terrainSampler'
import { TERRAIN_TILE_SIZE, type TileAddress } from './terrarium'

interface PendingTile {
  tile: TileAddress
  resolve: (heights: Float32Array) => void
  reject: (error: Error) => void
}

function fakeTileLoader() {
  const requests: PendingTile[] = []
  const loadTile = (tile: TileAddress) =>
    new Promise<Float32Array>((resolve, reject) => {
      requests.push({ tile, resolve, reject })
    })
  return { requests, loadTile }
}

function flatTile(height: number): Float32Array {
  return new Float32Array(TERRAIN_TILE_SIZE * TERRAIN_TILE_SIZE).fill(height)
}

function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

const NEARBY = { lat: DEMO_HOME.lat + 0.0005, lon: DEMO_HOME.lon + 0.0005 }

describe('createTerrainSampler', () => {
  it('has no elevation until the tile loads, and requests each tile once', () => {
    const { requests, loadTile } = fakeTileLoader()
    const terrain = createTerrainSampler({ loadTile })

    expect(terrain.elevationAt(DEMO_HOME)).toBeNull()
    expect(terrain.elevationAt(NEARBY)).toBeNull()

    expect(requests.map((request) => request.tile)).toEqual([{ zoom: 13, x: 4360, y: 3007 }])
  })

  it('samples a loaded tile and tells subscribers', async () => {
    const { requests, loadTile } = fakeTileLoader()
    const terrain = createTerrainSampler({ loadTile })
    const listener = vi.fn()
    terrain.subscribe(listener)
    terrain.elevationAt(DEMO_HOME)

    requests[0]?.resolve(flatTile(302))
    await settle()

    expect(listener).toHaveBeenCalledOnce()
    expect(terrain.getVersion()).toBe(1)
    expect(terrain.elevationAt(DEMO_HOME)).toBe(302)
    expect(requests).toHaveLength(1)
  })

  it('reports no elevation for a tile that failed and tries it again later', async () => {
    const { requests, loadTile } = fakeTileLoader()
    let nowMs = 0
    const terrain = createTerrainSampler({ loadTile, now: () => nowMs })
    terrain.elevationAt(DEMO_HOME)

    requests[0]?.reject(new Error('offline'))
    await settle()
    nowMs = TERRAIN_RETRY_AFTER_MS - 1

    expect(terrain.elevationAt(DEMO_HOME)).toBeNull()
    expect(requests).toHaveLength(1)

    nowMs = TERRAIN_RETRY_AFTER_MS
    terrain.elevationAt(DEMO_HOME)
    expect(requests).toHaveLength(2)
  })

  it('has no elevation outside the Web Mercator map', () => {
    const { requests, loadTile } = fakeTileLoader()
    const terrain = createTerrainSampler({ loadTile })

    expect(terrain.elevationAt({ lat: 89, lon: 0 })).toBeNull()
    expect(requests).toHaveLength(0)
  })
})
