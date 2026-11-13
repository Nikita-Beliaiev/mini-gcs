import { normalizeDegrees } from '../geo/geo'
import { clamp } from '../shared/math'
import type { CameraPose } from './cameraGeometry'

export const MAX_VIDEO_PITCH_DEG = 90
const MIN_CAMERA_HEIGHT_M = 2

export interface VideoCamera {
  lngLat: [longitude: number, latitude: number]
  altitudeM: number
  bearingDeg: number
  pitchDeg: number
  verticalFovDeg: number
}

export function videoCameraOf(pose: CameraPose, homeElevationM: number): VideoCamera {
  return {
    lngLat: [pose.position.lon, pose.position.lat],
    altitudeM: homeElevationM + Math.max(pose.altitudeM, MIN_CAMERA_HEIGHT_M),
    bearingDeg: normalizeDegrees(pose.azimuthDeg),
    pitchDeg: clamp(90 + pose.tiltDeg, 0, MAX_VIDEO_PITCH_DEG),
    verticalFovDeg: pose.verticalFovDeg,
  }
}
