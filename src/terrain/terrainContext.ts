import { createContext, useContext, useSyncExternalStore } from 'react'
import { NO_TERRAIN, type TerrainSampler } from './terrainSampler'

export const TerrainContext = createContext<TerrainSampler>(NO_TERRAIN)

export function useTerrain(): TerrainSampler {
  const terrain = useContext(TerrainContext)
  useSyncExternalStore(terrain.subscribe, terrain.getVersion)
  return terrain
}
