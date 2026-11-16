import { toDegrees, toRadians } from '../geo/geo'

export const WIDE_VERTICAL_FOV_DEG = 36.87
export const FRAME_ASPECT = 16 / 9
export const ZOOM_STOPS_PER_S = 2

export interface FieldOfView {
  horizontalFovDeg: number
  verticalFovDeg: number
}

export function fieldOfViewAt(zoom: number): FieldOfView {
  const halfFrameHeight = Math.tan(toRadians(WIDE_VERTICAL_FOV_DEG / 2)) / zoom
  return {
    horizontalFovDeg: toDegrees(2 * Math.atan(FRAME_ASPECT * halfFrameHeight)),
    verticalFovDeg: toDegrees(2 * Math.atan(halfFrameHeight)),
  }
}

export function moveZoom(zoom: number, targetZoom: number, dtS: number): number {
  const maxFactor = 2 ** (ZOOM_STOPS_PER_S * dtS)
  return targetZoom > zoom
    ? Math.min(targetZoom, zoom * maxFactor)
    : Math.max(targetZoom, zoom / maxFactor)
}
