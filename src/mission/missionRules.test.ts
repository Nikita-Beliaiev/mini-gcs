import { describe, expect, it } from 'vitest'
import { destinationPoint } from '../geo/geo'
import { MAX_MISSION_WAYPOINTS, validateGeofence, validateMission } from './missionRules'

const HOME = { lat: 43.095, lon: 11.645 }
const NEAR = destinationPoint(HOME, 90, 500)
const FAR = destinationPoint(HOME, 90, 2500)
const FENCE = [
  destinationPoint(HOME, 315, 1000),
  destinationPoint(HOME, 45, 1000),
  destinationPoint(HOME, 135, 1000),
  destinationPoint(HOME, 225, 1000),
]

describe('validateMission', () => {
  it('accepts a short mission near home', () => {
    expect(validateMission([NEAR], HOME, null)).toEqual([])
  })

  it('needs at least one waypoint', () => {
    expect(validateMission([], HOME, null)).toEqual([{ code: 'noWaypoints', pointIndex: null }])
  })

  it('limits the number of waypoints', () => {
    const waypoints = Array.from({ length: MAX_MISSION_WAYPOINTS + 1 }, () => NEAR)

    expect(validateMission(waypoints, HOME, null)).toEqual([
      { code: 'tooManyWaypoints', pointIndex: null },
    ])
  })

  it('flags waypoints too far from home', () => {
    expect(validateMission([NEAR, FAR], HOME, null)).toEqual([
      { code: 'waypointTooFar', pointIndex: 1 },
    ])
  })

  it('flags waypoints outside the geofence', () => {
    const outsideFence = destinationPoint(HOME, 0, 1200)

    expect(validateMission([NEAR, outsideFence], HOME, FENCE)).toEqual([
      { code: 'waypointOutsideGeofence', pointIndex: 1 },
    ])
  })
})

describe('validateGeofence', () => {
  it('accepts a polygon around home', () => {
    expect(validateGeofence(FENCE, HOME)).toEqual([])
  })

  it('needs at least three vertices', () => {
    expect(validateGeofence(FENCE.slice(0, 2), HOME)).toEqual([
      { code: 'tooFewVertices', pointIndex: null },
    ])
  })

  it('limits the number of vertices', () => {
    const vertices = Array.from({ length: 21 }, (_, index) =>
      destinationPoint(HOME, index * (360 / 21), 800),
    )

    expect(validateGeofence(vertices, HOME)).toEqual([
      { code: 'tooManyVertices', pointIndex: null },
    ])
  })

  it('keeps home inside the geofence', () => {
    const elsewhere = FENCE.map((vertex) => destinationPoint(vertex, 90, 3000))

    expect(validateGeofence(elsewhere, HOME)).toEqual([
      { code: 'homeOutsideGeofence', pointIndex: null },
    ])
  })
})
