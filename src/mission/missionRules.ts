import { distanceMeters, isPointInPolygon, type LatLon } from '../geo/geo'

export const MAX_MISSION_WAYPOINTS = 20
export const MAX_DISTANCE_FROM_HOME_M = 2000
export const MIN_GEOFENCE_VERTICES = 3
export const MAX_GEOFENCE_VERTICES = 20

export interface PlanIssue {
  pointIndex: number | null
  message: string
}

export function validateMission(
  waypoints: readonly LatLon[],
  home: LatLon,
  geofence: readonly LatLon[] | null,
): PlanIssue[] {
  const issues: PlanIssue[] = []

  if (waypoints.length === 0) {
    issues.push({ pointIndex: null, message: 'Add at least one waypoint' })
  }
  if (waypoints.length > MAX_MISSION_WAYPOINTS) {
    issues.push({
      pointIndex: null,
      message: `Use at most ${String(MAX_MISSION_WAYPOINTS)} waypoints`,
    })
  }

  waypoints.forEach((waypoint, index) => {
    const label = `Waypoint ${String(index + 1)}`
    if (distanceMeters(home, waypoint) > MAX_DISTANCE_FROM_HOME_M) {
      issues.push({
        pointIndex: index,
        message: `${label} is more than ${String(MAX_DISTANCE_FROM_HOME_M / 1000)} km from home`,
      })
    }
    if (geofence && !isPointInPolygon(waypoint, geofence)) {
      issues.push({ pointIndex: index, message: `${label} is outside the geofence` })
    }
  })

  return issues
}

export function validateGeofence(polygon: readonly LatLon[], home: LatLon): PlanIssue[] {
  const issues: PlanIssue[] = []

  if (polygon.length < MIN_GEOFENCE_VERTICES) {
    issues.push({
      pointIndex: null,
      message: `Add at least ${String(MIN_GEOFENCE_VERTICES)} vertices`,
    })
  }
  if (polygon.length > MAX_GEOFENCE_VERTICES) {
    issues.push({
      pointIndex: null,
      message: `Use at most ${String(MAX_GEOFENCE_VERTICES)} vertices`,
    })
  }
  if (polygon.length >= MIN_GEOFENCE_VERTICES && !isPointInPolygon(home, polygon)) {
    issues.push({ pointIndex: null, message: 'Home must be inside the geofence' })
  }

  return issues
}
