import type { TelemetryState } from '../telemetry/telemetryStore'
import type { TerrainSampler } from './terrainSampler'

type VehiclePlacement = Pick<TelemetryState, 'position' | 'home'>
type Elevation = Pick<TerrainSampler, 'elevationAt'>

export function altitudeAboveSeaLevel(
  { position, home }: VehiclePlacement,
  terrain: Elevation,
): number | undefined {
  if (!position || !home) {
    return undefined
  }
  const homeElevation = terrain.elevationAt(home)
  return homeElevation === null ? undefined : homeElevation + position.altitudeM
}

export function altitudeAboveGround(
  placement: VehiclePlacement,
  terrain: Elevation,
): number | undefined {
  const aboveSeaLevel = altitudeAboveSeaLevel(placement, terrain)
  const ground = placement.position ? terrain.elevationAt(placement.position) : null
  return aboveSeaLevel === undefined || ground === null ? undefined : aboveSeaLevel - ground
}
