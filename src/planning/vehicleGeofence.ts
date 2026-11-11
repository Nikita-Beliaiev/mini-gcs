import { isPointInPolygon, type LatLon } from '../geo/geo'
import type { Messages } from '../i18n/en'
import type { TelemetryState } from '../telemetry/telemetryStore'

export function describeVehicleGeofence(state: TelemetryState, messages: Messages): string {
  const text = messages.planning.geofence
  const { geofence } = state
  if (!geofence) {
    return text.waitingForVehicle
  }
  if (!geofence.polygon) {
    return text.noneOnVehicle
  }
  return text.onVehicle(geofence.polygon.length)
}

export function countOutside(points: readonly LatLon[], polygon: readonly LatLon[]): number {
  return points.filter((point) => !isPointInPolygon(point, polygon)).length
}
