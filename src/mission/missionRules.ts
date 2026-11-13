import { distanceMeters, isPointInPolygon, type LatLon } from '../geo/geo'

export const MISSION_ALTITUDE_M = 80
export const MAX_MISSION_WAYPOINTS = 20
export const MAX_DISTANCE_FROM_HOME_M = 2000
export const MIN_GEOFENCE_VERTICES = 3
export const MAX_GEOFENCE_VERTICES = 20

export type GeneralIssueCode =
  | 'noWaypoints'
  | 'tooManyWaypoints'
  | 'tooFewVertices'
  | 'tooManyVertices'
  | 'homeOutsideGeofence'
  | 'waitingForHome'

export type WaypointIssueCode = 'waypointTooFar' | 'waypointOutsideGeofence'

export type PlanIssue =
  { code: GeneralIssueCode; pointIndex: null } | { code: WaypointIssueCode; pointIndex: number }

export const WAITING_FOR_HOME: PlanIssue = { code: 'waitingForHome', pointIndex: null }

export function validateMission(
  waypoints: readonly LatLon[],
  home: LatLon,
  geofence: readonly LatLon[] | null,
): PlanIssue[] {
  const issues: PlanIssue[] = []

  if (waypoints.length === 0) {
    issues.push({ code: 'noWaypoints', pointIndex: null })
  }
  if (waypoints.length > MAX_MISSION_WAYPOINTS) {
    issues.push({ code: 'tooManyWaypoints', pointIndex: null })
  }

  waypoints.forEach((waypoint, index) => {
    if (distanceMeters(home, waypoint) > MAX_DISTANCE_FROM_HOME_M) {
      issues.push({ code: 'waypointTooFar', pointIndex: index })
    }
    if (geofence && !isPointInPolygon(waypoint, geofence)) {
      issues.push({ code: 'waypointOutsideGeofence', pointIndex: index })
    }
  })

  return issues
}

export function validateGeofence(polygon: readonly LatLon[], home: LatLon): PlanIssue[] {
  const issues: PlanIssue[] = []

  if (polygon.length < MIN_GEOFENCE_VERTICES) {
    issues.push({ code: 'tooFewVertices', pointIndex: null })
  }
  if (polygon.length > MAX_GEOFENCE_VERTICES) {
    issues.push({ code: 'tooManyVertices', pointIndex: null })
  }
  if (polygon.length >= MIN_GEOFENCE_VERTICES && !isPointInPolygon(home, polygon)) {
    issues.push({ code: 'homeOutsideGeofence', pointIndex: null })
  }

  return issues
}
