import { signedAngleDifference } from '../geo/geo'
import { clamp } from '../shared/math'

export const CAMERA_STEP_DEG = 10
export const LOOK_AHEAD_TILT_DEG = -15

export type CameraMove = 'tiltUp' | 'tiltDown' | 'panLeft' | 'panRight' | 'lookDown' | 'lookAhead'

export interface CameraAngles {
  tiltDeg: number
  panDeg: number
}

export interface FramePosition {
  screenX: number
  screenY: number
}

function withTilt(angles: CameraAngles, tiltDeg: number): CameraAngles {
  return { tiltDeg: clamp(tiltDeg, -90, 0), panDeg: angles.panDeg }
}

function withPan(angles: CameraAngles, panDeg: number): CameraAngles {
  return { tiltDeg: angles.tiltDeg, panDeg: signedAngleDifference(0, panDeg) }
}

export function moveCamera(angles: CameraAngles, move: CameraMove): CameraAngles {
  switch (move) {
    case 'tiltUp':
      return withTilt(angles, angles.tiltDeg + CAMERA_STEP_DEG)
    case 'tiltDown':
      return withTilt(angles, angles.tiltDeg - CAMERA_STEP_DEG)
    case 'panLeft':
      return withPan(angles, angles.panDeg - CAMERA_STEP_DEG)
    case 'panRight':
      return withPan(angles, angles.panDeg + CAMERA_STEP_DEG)
    case 'lookDown':
      return { tiltDeg: -90, panDeg: 0 }
    case 'lookAhead':
      return { tiltDeg: LOOK_AHEAD_TILT_DEG, panDeg: 0 }
  }
}

export function framePosition(
  offsetX: number,
  offsetY: number,
  width: number,
  height: number,
): FramePosition {
  return {
    screenX: clamp((2 * offsetX) / width - 1, -1, 1),
    screenY: clamp(1 - (2 * offsetY) / height, -1, 1),
  }
}
