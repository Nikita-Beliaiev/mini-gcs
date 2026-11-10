import { describe, expect, it } from 'vitest'
import type { TelemetryState } from '../telemetry/telemetryStore'
import { heartbeatMessage, missionCurrentMessage, missionMessage } from '../test/messages'
import { describeVehicleMission } from './vehicleMission'

const EMPTY: TelemetryState = {
  heartbeat: null,
  position: null,
  systemStatus: null,
  home: null,
  mission: null,
  missionCurrent: null,
  geofence: null,
}

describe('describeVehicleMission', () => {
  it('waits until the vehicle reports its mission', () => {
    expect(describeVehicleMission(EMPTY)).toBe('Waiting for the vehicle mission')
  })

  it('summarises the mission on the vehicle', () => {
    const state = { ...EMPTY, mission: missionMessage({ missionId: 3 }) }

    expect(describeVehicleMission(state)).toBe('Vehicle mission 3: 2 waypoints')
  })

  it('names the waypoint the vehicle is flying to in AUTO', () => {
    const state = {
      ...EMPTY,
      heartbeat: heartbeatMessage({ mode: 'AUTO' }),
      mission: missionMessage({ missionId: 3 }),
      missionCurrent: missionCurrentMessage({ missionId: 3, waypointIndex: 1 }),
    }

    expect(describeVehicleMission(state)).toBe('Vehicle mission 3: 2 waypoints, flying to WP 2')
  })

  it('leaves out progress outside AUTO', () => {
    const state = {
      ...EMPTY,
      heartbeat: heartbeatMessage({ mode: 'RTL' }),
      mission: missionMessage({ missionId: 3, waypoints: [{ lat: 1, lon: 1 }] }),
      missionCurrent: missionCurrentMessage({ missionId: 3, waypointIndex: 0 }),
    }

    expect(describeVehicleMission(state)).toBe('Vehicle mission 3: 1 waypoint')
  })
})
