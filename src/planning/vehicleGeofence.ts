import { isPointInPolygon, type LatLon } from '../geo/geo'
import type { TelemetryState } from '../telemetry/telemetryStore'

export function describeVehicleGeofence(state: TelemetryState): string {
  const { geofence } = state
  if (!geofence) {
    return 'Waiting for the vehicle geofence'
  }
  if (!geofence.polygon) {
    return 'No geofence on the vehicle'
  }
  return `Vehicle geofence: ${String(geofence.polygon.length)} vertices`
}

export function countOutside(points: readonly LatLon[], polygon: readonly LatLon[]): number {
  return points.filter((point) => !isPointInPolygon(point, polygon)).length
}

export function describeWaypointsOutside(count: number): string {
  const subject = count === 1 ? '1 waypoint' : `${String(count)} waypoints`
  const verb = count === 1 ? 'is' : 'are'
  return `${subject} of the vehicle mission ${verb} outside this geofence. The vehicle will return home when it crosses the border.`
}
