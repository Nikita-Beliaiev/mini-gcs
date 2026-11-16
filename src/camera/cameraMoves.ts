import { signedAngleDifference } from '../geo/geo'
import { MAX_CAMERA_ZOOM } from '../protocol/commands'
import { clamp } from '../shared/math'

export const CAMERA_STEP_DEG = 10
export const LOOK_AHEAD_TILT_DEG = -15
export const ZOOM_LEVELS: readonly number[] = [1, 2, 4, MAX_CAMERA_ZOOM]

export type CameraMove = 'tiltUp' | 'tiltDown' | 'panLeft' | 'panRight' | 'lookDown' | 'lookAhead'
export type ZoomStep = 'zoomIn' | 'zoomOut'

export interface CameraAngles {
  tiltDeg: number
  panDeg: number
}

export interface CameraReading extends CameraAngles {
  zoom: number
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

export function moveCamera(camera: CameraReading, move: CameraMove): CameraAngles {
  const stepDeg = CAMERA_STEP_DEG / camera.zoom
  switch (move) {
    case 'tiltUp':
      return withTilt(camera, camera.tiltDeg + stepDeg)
    case 'tiltDown':
      return withTilt(camera, camera.tiltDeg - stepDeg)
    case 'panLeft':
      return withPan(camera, camera.panDeg - stepDeg)
    case 'panRight':
      return withPan(camera, camera.panDeg + stepDeg)
    case 'lookDown':
      return { tiltDeg: -90, panDeg: 0 }
    case 'lookAhead':
      return { tiltDeg: LOOK_AHEAD_TILT_DEG, panDeg: 0 }
  }
}

export function nextZoom(zoom: number, step: ZoomStep): number {
  return step === 'zoomIn'
    ? (ZOOM_LEVELS.find((level) => level > zoom) ?? MAX_CAMERA_ZOOM)
    : (ZOOM_LEVELS.findLast((level) => level < zoom) ?? 1)
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
