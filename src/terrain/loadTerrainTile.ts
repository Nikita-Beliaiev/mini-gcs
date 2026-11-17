import { loadAreaTerrainTile } from '../offline/loadAreaTerrainTile'
import { useMapSourceStore, usesAreaPackage } from '../offline/mapSourceStore'
import { loadTerrariumTile } from './loadTerrariumTile'
import type { TileAddress } from './terrarium'

export async function loadTerrainTile(tile: TileAddress): Promise<Float32Array> {
  if (usesAreaPackage(useMapSourceStore.getState())) {
    return loadAreaTerrainTile(tile)
  }
  try {
    return await loadTerrariumTile(tile)
  } catch {
    return loadAreaTerrainTile(tile)
  }
}
