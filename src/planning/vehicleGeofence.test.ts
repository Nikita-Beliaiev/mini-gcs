import { describe, expect, it } from 'vitest'
import type { TelemetryState } from '../telemetry/telemetryStore'
import { geofenceMessage } from '../test/messages'
import { countOutside, describeVehicleGeofence, describeWaypointsOutside } from './vehicleGeofence'

const EMPTY: TelemetryState = {
  heartbeat: null,
  position: null,
  systemStatus: null,
  home: null,
  mission: null,
  missionCurrent: null,
  geofence: null,
}

const SQUARE = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 2 },
  { lat: 2, lon: 2 },
  { lat: 2, lon: 0 },
]

describe('describeVehicleGeofence', () => {
  it('waits for the vehicle to report its geofence', () => {
    expect(describeVehicleGeofence(EMPTY)).toBe('Waiting for the vehicle geofence')
  })

  it('says when the vehicle has no geofence', () => {
    const state = { ...EMPTY, geofence: geofenceMessage({ polygon: null }) }

    expect(describeVehicleGeofence(state)).toBe('No geofence on the vehicle')
  })

  it('counts the vertices of the vehicle geofence', () => {
    const state = { ...EMPTY, geofence: geofenceMessage({ polygon: SQUARE }) }

    expect(describeVehicleGeofence(state)).toBe('Vehicle geofence: 4 vertices')
  })
})

describe('countOutside', () => {
  it('counts the points outside the polygon', () => {
    const points = [
      { lat: 1, lon: 1 },
      { lat: 3, lon: 3 },
      { lat: -1, lon: 1 },
    ]

    expect(countOutside(points, SQUARE)).toBe(2)
  })
})

describe('describeWaypointsOutside', () => {
  it('agrees with the number of waypoints', () => {
    expect(describeWaypointsOutside(1)).toMatch(/^1 waypoint of the vehicle mission is outside/)
    expect(describeWaypointsOutside(3)).toMatch(/^3 waypoints of the vehicle mission are outside/)
  })
})
