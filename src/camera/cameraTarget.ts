import type { LatLon } from '../geo/geo'
import type { TelemetryState } from '../telemetry/telemetryStore'
import type { TerrainSampler } from '../terrain/terrainSampler'
import {
  cameraFootprint,
  cameraPoseOf,
  groundHeightAboveHome,
  groundPointAt,
  type CameraPose,
  type GroundHeight,
  type GroundHit,
} from './cameraGeometry'

export interface CameraTarget {
  pose: CameraPose
  groundHeight: GroundHeight
  footprint: LatLon[]
  center: GroundHit | null
}

const LEVEL_GROUND: GroundHeight = () => 0

export function cameraTarget(
  { position, camera, home }: Pick<TelemetryState, 'position' | 'camera' | 'home'>,
  terrain: Pick<TerrainSampler, 'elevationAt'>,
): CameraTarget | null {
  if (!position || !camera) {
    return null
  }
  const pose = cameraPoseOf(position, camera)
  const groundHeight = home ? groundHeightAboveHome(terrain, home) : LEVEL_GROUND
  return {
    pose,
    groundHeight,
    footprint: cameraFootprint(pose, groundHeight),
    center: groundPointAt(pose, 0, 0, groundHeight),
  }
}
