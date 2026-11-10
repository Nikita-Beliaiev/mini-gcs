import { normalizeDegrees, type LatLon } from '../geo/geo'
import type { GpsFix, SystemStatusMessage } from '../protocol/telemetry'

export const NO_VALUE = '—'

const GPS_FIX_LABELS: Record<GpsFix, string> = {
  none: 'No fix',
  '2d': '2D',
  '3d': '3D',
}

export function formatDecimal(value: number | undefined, fractionDigits: number): string {
  return value === undefined ? NO_VALUE : value.toFixed(fractionDigits)
}

export function formatHeading(headingDeg: number | undefined): string {
  if (headingDeg === undefined) {
    return NO_VALUE
  }
  return `${String(normalizeDegrees(Math.round(headingDeg))).padStart(3, '0')}°`
}

export function formatArmed(armed: boolean | undefined): string {
  if (armed === undefined) {
    return NO_VALUE
  }
  return armed ? 'Armed' : 'Disarmed'
}

export function formatGps(status: SystemStatusMessage | null): string {
  if (!status) {
    return NO_VALUE
  }
  return `${GPS_FIX_LABELS[status.gpsFix]} · ${String(status.gpsSatellites)}`
}

export function formatDistance(meters: number | undefined): string {
  if (meters === undefined) {
    return NO_VALUE
  }
  if (meters < 1000) {
    return `${String(Math.round(meters))} m`
  }
  return `${(meters / 1000).toFixed(1)} km`
}

export function formatCoordinates(point: LatLon): string {
  return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`
}
