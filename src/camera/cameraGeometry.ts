import { destinationPoint, toDegrees, toRadians, type LatLon } from '../geo/geo'
import type { CameraMessage, PositionMessage } from '../protocol/telemetry'
import type { TerrainSampler } from '../terrain/terrainSampler'

const MARCH_STEP_M = 10
const MAX_RANGE_M = 3000
const REFINE_STEPS = 10
export const FAR_GROUND_M = 1500

export interface CameraPose {
  position: LatLon
  altitudeM: number
  azimuthDeg: number
  tiltDeg: number
  horizontalFovDeg: number
  verticalFovDeg: number
}

export interface Direction {
  east: number
  north: number
  up: number
}

export interface GroundHit {
  point: LatLon
  rangeM: number
}

export type GroundHeight = (point: LatLon) => number

export function cameraPoseOf(position: PositionMessage, camera: CameraMessage): CameraPose {
  return {
    position,
    altitudeM: position.altitudeM,
    azimuthDeg: position.headingDeg + camera.panDeg,
    tiltDeg: camera.tiltDeg,
    horizontalFovDeg: camera.horizontalFovDeg,
    verticalFovDeg: camera.verticalFovDeg,
  }
}

export function groundHeightAboveHome(
  terrain: Pick<TerrainSampler, 'elevationAt'>,
  home: LatLon,
): GroundHeight {
  const homeElevation = terrain.elevationAt(home)
  return (point) => {
    const elevation = homeElevation === null ? null : terrain.elevationAt(point)
    return homeElevation === null || elevation === null ? 0 : elevation - homeElevation
  }
}

export function rayDirection(pose: CameraPose, screenX: number, screenY: number): Direction {
  const azimuth = toRadians(pose.azimuthDeg)
  const tilt = toRadians(pose.tiltDeg)
  const across = screenX * Math.tan(toRadians(pose.horizontalFovDeg / 2))
  const along = screenY * Math.tan(toRadians(pose.verticalFovDeg / 2))

  const east =
    Math.sin(azimuth) * Math.cos(tilt) +
    across * Math.cos(azimuth) -
    along * Math.sin(azimuth) * Math.sin(tilt)
  const north =
    Math.cos(azimuth) * Math.cos(tilt) -
    across * Math.sin(azimuth) -
    along * Math.cos(azimuth) * Math.sin(tilt)
  const up = Math.sin(tilt) + along * Math.cos(tilt)
  const length = Math.hypot(east, north, up)
  return { east: east / length, north: north / length, up: up / length }
}

function pointAlong(pose: CameraPose, direction: Direction, rangeM: number): LatLon {
  const bearing = toDegrees(Math.atan2(direction.east, direction.north))
  const horizontal = Math.hypot(direction.east, direction.north) * rangeM
  return destinationPoint(pose.position, bearing, horizontal)
}

export function groundIntersection(
  pose: CameraPose,
  direction: Direction,
  groundHeight: GroundHeight,
): GroundHit | null {
  const clearanceAt = (rangeM: number) =>
    pose.altitudeM + direction.up * rangeM - groundHeight(pointAlong(pose, direction, rangeM))

  let clearRangeM = 0
  for (let rangeM = MARCH_STEP_M; rangeM <= MAX_RANGE_M; rangeM += MARCH_STEP_M) {
    if (clearanceAt(rangeM) > 0) {
      clearRangeM = rangeM
      continue
    }
    let hitRangeM = rangeM
    for (let step = 0; step < REFINE_STEPS; step += 1) {
      const middleM = (clearRangeM + hitRangeM) / 2
      if (clearanceAt(middleM) > 0) {
        clearRangeM = middleM
      } else {
        hitRangeM = middleM
      }
    }
    return { point: pointAlong(pose, direction, hitRangeM), rangeM: hitRangeM }
  }
  return null
}

export function groundPointAt(
  pose: CameraPose,
  screenX: number,
  screenY: number,
  groundHeight: GroundHeight,
): GroundHit | null {
  return groundIntersection(pose, rayDirection(pose, screenX, screenY), groundHeight)
}

const CORNERS = [
  [-1, 1],
  [1, 1],
  [1, -1],
  [-1, -1],
] as const

export function cameraFootprint(pose: CameraPose, groundHeight: GroundHeight): LatLon[] {
  return CORNERS.map(([screenX, screenY]) => {
    const direction = rayDirection(pose, screenX, screenY)
    const hit = groundIntersection(pose, direction, groundHeight)
    if (hit) {
      return hit.point
    }
    const horizontal = Math.hypot(direction.east, direction.north)
    return pointAlong(pose, direction, FAR_GROUND_M / horizontal)
  })
}
