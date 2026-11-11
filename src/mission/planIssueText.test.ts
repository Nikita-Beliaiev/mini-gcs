import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { uk } from '../i18n/uk'
import type { PlanIssue } from './missionRules'
import { describePlanIssue } from './planIssueText'

describe('describePlanIssue', () => {
  it.each<[PlanIssue, string]>([
    [{ code: 'noWaypoints', pointIndex: null }, 'Add at least one waypoint'],
    [{ code: 'tooManyWaypoints', pointIndex: null }, 'Use at most 20 waypoints'],
    [{ code: 'waypointTooFar', pointIndex: 1 }, 'Waypoint 2 is more than 2 km from home'],
    [{ code: 'waypointOutsideGeofence', pointIndex: 1 }, 'Waypoint 2 is outside the geofence'],
    [{ code: 'tooFewVertices', pointIndex: null }, 'Add at least 3 vertices'],
    [{ code: 'tooManyVertices', pointIndex: null }, 'Use at most 20 vertices'],
    [{ code: 'homeOutsideGeofence', pointIndex: null }, 'Home must be inside the geofence'],
    [{ code: 'waitingForHome', pointIndex: null }, 'Waiting for the home position'],
  ])('describes %o in English', (issue, text) => {
    expect(describePlanIssue(issue, en)).toBe(text)
  })

  it('numbers waypoints from one in Ukrainian too', () => {
    expect(describePlanIssue({ code: 'waypointTooFar', pointIndex: 0 }, uk)).toBe(
      'Точка 1 далі ніж за 2 км від точки старту',
    )
  })
})
