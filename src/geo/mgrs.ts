import { forward } from 'mgrs'
import type { LatLon } from './geo'

const MGRS_SOUTH_LIMIT_DEG = -80
const MGRS_NORTH_LIMIT_DEG = 84
const METRE_DIGITS = 5
const REFERENCE_PATTERN = /^(\d{1,2}[C-X])([A-Z]{2})(\d{5})(\d{5})$/

export function formatMgrs(point: LatLon): string | null {
  if (point.lat < MGRS_SOUTH_LIMIT_DEG || point.lat > MGRS_NORTH_LIMIT_DEG) {
    return null
  }
  const match = REFERENCE_PATTERN.exec(forward([point.lon, point.lat], METRE_DIGITS))
  if (!match) {
    return null
  }
  const [, gridZone, square, easting, northing] = match
  return [gridZone, square, easting, northing].join(' ')
}
