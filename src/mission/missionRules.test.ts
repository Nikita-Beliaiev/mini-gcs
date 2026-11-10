import { describe, expect, it } from 'vitest'
import { destinationPoint } from '../geo/geo'
import { MAX_MISSION_WAYPOINTS, validateMission } from './missionRules'

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
    expect(validateMission([], HOME, null)).toEqual([
      { pointIndex: null, message: 'Add at least one waypoint' },
    ])
  })

  it('limits the number of waypoints', () => {
    const waypoints = Array.from({ length: MAX_MISSION_WAYPOINTS + 1 }, () => NEAR)

    expect(validateMission(waypoints, HOME, null)).toEqual([
      { pointIndex: null, message: 'Use at most 20 waypoints' },
    ])
  })

  it('flags waypoints too far from home', () => {
    expect(validateMission([NEAR, FAR], HOME, null)).toEqual([
      { pointIndex: 1, message: 'Waypoint 2 is more than 2 km from home' },
    ])
  })

  it('flags waypoints outside the geofence', () => {
    const outsideFence = destinationPoint(HOME, 0, 1200)

    expect(validateMission([NEAR, outsideFence], HOME, FENCE)).toEqual([
      { pointIndex: 1, message: 'Waypoint 2 is outside the geofence' },
    ])
  })
})
