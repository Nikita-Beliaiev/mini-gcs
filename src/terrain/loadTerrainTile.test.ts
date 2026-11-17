import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadAreaTerrainTile } from '../offline/loadAreaTerrainTile'
import { useMapSourceStore } from '../offline/mapSourceStore'
import { loadTerrainTile } from './loadTerrainTile'
import { loadTerrariumTile } from './loadTerrariumTile'

vi.mock('./loadTerrariumTile', () => ({ loadTerrariumTile: vi.fn() }))
vi.mock('../offline/loadAreaTerrainTile', () => ({ loadAreaTerrainTile: vi.fn() }))

const TILE = { zoom: 13, x: 4360, y: 3006 }
const ONLINE_HEIGHTS = new Float32Array([300])
const AREA_HEIGHTS = new Float32Array([310])

beforeEach(() => {
  vi.mocked(loadTerrariumTile).mockReset().mockResolvedValue(ONLINE_HEIGHTS)
  vi.mocked(loadAreaTerrainTile).mockReset().mockResolvedValue(AREA_HEIGHTS)
})

describe('loadTerrainTile', () => {
  it('loads terrain tiles over the network while online', async () => {
    expect(await loadTerrainTile(TILE)).toBe(ONLINE_HEIGHTS)
    expect(loadAreaTerrainTile).not.toHaveBeenCalled()
  })

  it('falls back to the area package when the network fails', async () => {
    vi.mocked(loadTerrariumTile).mockRejectedValue(new TypeError('Failed to fetch'))

    expect(await loadTerrainTile(TILE)).toBe(AREA_HEIGHTS)
  })

  it('reads the area package straight away when offline or asked to', async () => {
    useMapSourceStore.setState({ isOnline: false })
    expect(await loadTerrainTile(TILE)).toBe(AREA_HEIGHTS)

    useMapSourceStore.setState({ isOnline: true, preferArea: true })
    expect(await loadTerrainTile(TILE)).toBe(AREA_HEIGHTS)
    expect(loadTerrariumTile).not.toHaveBeenCalled()
  })
})
