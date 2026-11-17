import type { PMTiles } from 'pmtiles'
import { decodeTerrariumTile } from '../terrain/loadTerrariumTile'
import type { TileAddress } from '../terrain/terrarium'
import { AREA_TERRAIN_FILE } from './area'
import { areaFileUrl } from './areaFiles'

let archive: Promise<PMTiles> | null = null

function areaTerrain(): Promise<PMTiles> {
  archive ??= import('pmtiles').then(({ PMTiles }) => new PMTiles(areaFileUrl(AREA_TERRAIN_FILE)))
  return archive
}

export async function loadAreaTerrainTile({ zoom, x, y }: TileAddress): Promise<Float32Array> {
  const tile = await (await areaTerrain()).getZxy(zoom, x, y)
  if (!tile) {
    throw new Error('The area package has no terrain for this tile')
  }
  return decodeTerrariumTile(new Blob([tile.data]))
}
