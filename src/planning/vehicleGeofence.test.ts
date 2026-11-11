import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { EMPTY_TELEMETRY_STATE } from '../telemetry/telemetryStore'
import { geofenceMessage } from '../test/messages'
import { countOutside, describeVehicleGeofence } from './vehicleGeofence'

const EMPTY = EMPTY_TELEMETRY_STATE

const SQUARE = [
  { lat: 0, lon: 0 },
  { lat: 0, lon: 2 },
  { lat: 2, lon: 2 },
  { lat: 2, lon: 0 },
]

describe('describeVehicleGeofence', () => {
  it('waits for the vehicle to report its geofence', () => {
    expect(describeVehicleGeofence(EMPTY, en)).toBe('Waiting for the vehicle geofence')
  })

  it('says when the vehicle has no geofence', () => {
    const state = { ...EMPTY, geofence: geofenceMessage({ polygon: null }) }

    expect(describeVehicleGeofence(state, en)).toBe('No geofence on the vehicle')
  })

  it('counts the vertices of the vehicle geofence', () => {
    const state = { ...EMPTY, geofence: geofenceMessage({ polygon: SQUARE }) }

    expect(describeVehicleGeofence(state, en)).toBe('Vehicle geofence: 4 vertices')
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
