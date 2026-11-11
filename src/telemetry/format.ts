import { normalizeDegrees, type LatLon } from '../geo/geo'
import type { Messages } from '../i18n/en'
import type { GpsFix, SystemStatusMessage } from '../protocol/telemetry'

export const NO_VALUE = '—'

const GPS_FIX_LABELS: Record<Exclude<GpsFix, 'none'>, string> = {
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

export function formatSignedAngle(degrees: number | undefined): string {
  if (degrees === undefined) {
    return NO_VALUE
  }
  const rounded = Math.round(degrees)
  return `${rounded > 0 ? '+' : ''}${String(rounded === 0 ? 0 : rounded)}°`
}

export function formatLatency(latencyMs: number, unit: string): string {
  return latencyMs < 1 ? `<1 ${unit}` : `${String(Math.round(latencyMs))} ${unit}`
}

export function formatArmed(
  armed: boolean | undefined,
  labels: Pick<Messages['telemetry'], 'armed' | 'disarmed'>,
): string {
  if (armed === undefined) {
    return NO_VALUE
  }
  return armed ? labels.armed : labels.disarmed
}

export function formatGps(status: SystemStatusMessage | null, noFixLabel: string): string {
  if (!status) {
    return NO_VALUE
  }
  const fix = status.gpsFix === 'none' ? noFixLabel : GPS_FIX_LABELS[status.gpsFix]
  return `${fix} · ${String(status.gpsSatellites)}`
}

export function formatDistance(meters: number | undefined, units: Messages['units']): string {
  if (meters === undefined) {
    return NO_VALUE
  }
  if (meters < 1000) {
    return `${String(Math.round(meters))} ${units.meters}`
  }
  return `${(meters / 1000).toFixed(1)} ${units.kilometers}`
}

export function formatCoordinates(point: LatLon): string {
  return `${point.lat.toFixed(5)}, ${point.lon.toFixed(5)}`
}

export function formatUtcTime(isoTime: string): string {
  return `${isoTime.slice(0, 10)} ${isoTime.slice(11, 16)} UTC`
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes)}:${String(seconds).padStart(2, '0')}`
}
