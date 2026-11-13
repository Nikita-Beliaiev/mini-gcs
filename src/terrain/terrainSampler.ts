import type { LatLon } from '../geo/geo'
import { createEmitter } from '../shared/emitter'
import { sampleHeight, tilePixelAt, type TileAddress } from './terrarium'

export const TERRAIN_SAMPLE_ZOOM = 13
export const TERRAIN_RETRY_AFTER_MS = 30_000

export type LoadTerrainTile = (tile: TileAddress) => Promise<Float32Array>

export interface TerrainSampler {
  elevationAt: (point: LatLon) => number | null
  getVersion: () => number
  subscribe: (listener: () => void) => () => void
}

export interface TerrainSamplerOptions {
  loadTile: LoadTerrainTile
  zoom?: number
  retryAfterMs?: number
  now?: () => number
}

type TileEntry =
  | { status: 'loading' }
  | { status: 'ready'; heights: Float32Array }
  | { status: 'failed'; failedAtMs: number }

export const NO_TERRAIN: TerrainSampler = {
  elevationAt: () => null,
  getVersion: () => 0,
  subscribe: () => () => undefined,
}

function isInsideWorld({ zoom, x, y }: TileAddress): boolean {
  const tiles = 2 ** zoom
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && x < tiles && y >= 0 && y < tiles
}

export function createTerrainSampler({
  loadTile,
  zoom = TERRAIN_SAMPLE_ZOOM,
  retryAfterMs = TERRAIN_RETRY_AFTER_MS,
  now = () => performance.now(),
}: TerrainSamplerOptions): TerrainSampler {
  const tiles = new Map<string, TileEntry>()
  const changes = createEmitter()
  let version = 0

  function settle(key: string, entry: TileEntry): void {
    tiles.set(key, entry)
    version += 1
    changes.emit()
  }

  function load(key: string, tile: TileAddress): void {
    tiles.set(key, { status: 'loading' })
    loadTile(tile).then(
      (heights) => {
        settle(key, { status: 'ready', heights })
      },
      () => {
        settle(key, { status: 'failed', failedAtMs: now() })
      },
    )
  }

  function shouldLoad(entry: TileEntry | undefined): boolean {
    if (!entry) {
      return true
    }
    return entry.status === 'failed' && now() - entry.failedAtMs >= retryAfterMs
  }

  return {
    elevationAt(point) {
      const { tile, column, row } = tilePixelAt(point, zoom)
      if (!isInsideWorld(tile)) {
        return null
      }
      const key = `${String(tile.x)}/${String(tile.y)}`
      const entry = tiles.get(key)
      if (entry?.status === 'ready') {
        return sampleHeight(entry.heights, column, row)
      }
      if (shouldLoad(entry)) {
        load(key, tile)
      }
      return null
    },
    getVersion: () => version,
    subscribe: changes.subscribe,
  }
}
