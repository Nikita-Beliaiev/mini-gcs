import type { Messages } from '../i18n/en'
import {
  MAX_DISTANCE_FROM_HOME_M,
  MAX_GEOFENCE_VERTICES,
  MAX_MISSION_WAYPOINTS,
  MIN_GEOFENCE_VERTICES,
  type PlanIssue,
} from './missionRules'

export function describePlanIssue(issue: PlanIssue, messages: Messages): string {
  const text = messages.planIssues
  switch (issue.code) {
    case 'noWaypoints':
      return text.noWaypoints
    case 'tooManyWaypoints':
      return text.tooManyWaypoints(MAX_MISSION_WAYPOINTS)
    case 'waypointTooFar':
      return text.waypointTooFar(issue.pointIndex + 1, MAX_DISTANCE_FROM_HOME_M / 1000)
    case 'waypointOutsideGeofence':
      return text.waypointOutsideGeofence(issue.pointIndex + 1)
    case 'tooFewVertices':
      return text.tooFewVertices(MIN_GEOFENCE_VERTICES)
    case 'tooManyVertices':
      return text.tooManyVertices(MAX_GEOFENCE_VERTICES)
    case 'homeOutsideGeofence':
      return text.homeOutsideGeofence
    case 'waitingForHome':
      return text.waitingForHome
  }
}
