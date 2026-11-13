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

type CameraState = Pick<TelemetryState, 'position' | 'camera' | 'home'>
type Elevation = Pick<TerrainSampler, 'elevationAt'>

export interface CameraView {
  pose: CameraPose
  groundHeight: GroundHeight
}

export interface CameraTarget extends CameraView {
  footprint: LatLon[]
  center: GroundHit | null
}

const LEVEL_GROUND: GroundHeight = () => 0

export function cameraView(
  { position, camera, home }: CameraState,
  terrain: Elevation,
): CameraView | null {
  if (!position || !camera) {
    return null
  }
  return {
    pose: cameraPoseOf(position, camera),
    groundHeight: home ? groundHeightAboveHome(terrain, home) : LEVEL_GROUND,
  }
}

export function cameraCenter(state: CameraState, terrain: Elevation): GroundHit | null {
  const view = cameraView(state, terrain)
  return view ? groundPointAt(view.pose, 0, 0, view.groundHeight) : null
}

export function cameraTarget(state: CameraState, terrain: Elevation): CameraTarget | null {
  const view = cameraView(state, terrain)
  if (!view) {
    return null
  }
  return {
    ...view,
    footprint: cameraFootprint(view.pose, view.groundHeight),
    center: groundPointAt(view.pose, 0, 0, view.groundHeight),
  }
}
