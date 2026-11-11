import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { EMPTY_TELEMETRY_STATE } from '../telemetry/telemetryStore'
import { heartbeatMessage, missionCurrentMessage, missionMessage } from '../test/messages'
import { activeWaypointIndex, describeVehicleMission } from './vehicleMission'

const EMPTY = EMPTY_TELEMETRY_STATE

describe('describeVehicleMission', () => {
  it('waits until the vehicle reports its mission', () => {
    expect(describeVehicleMission(EMPTY, en)).toBe('Waiting for the vehicle mission')
  })

  it('summarises the mission on the vehicle', () => {
    const state = { ...EMPTY, mission: missionMessage({ missionId: 3 }) }

    expect(describeVehicleMission(state, en)).toBe('Vehicle mission 3: 2 waypoints')
  })

  it('names the waypoint the vehicle is flying to in AUTO', () => {
    const state = {
      ...EMPTY,
      heartbeat: heartbeatMessage({ mode: 'AUTO' }),
      mission: missionMessage({ missionId: 3 }),
      missionCurrent: missionCurrentMessage({ missionId: 3, waypointIndex: 1 }),
    }

    expect(describeVehicleMission(state, en)).toBe('Vehicle mission 3: 2 waypoints, flying to WP 2')
  })

  it('leaves out progress outside AUTO', () => {
    const state = {
      ...EMPTY,
      heartbeat: heartbeatMessage({ mode: 'RTL' }),
      mission: missionMessage({ missionId: 3, waypoints: [{ lat: 1, lon: 1 }] }),
      missionCurrent: missionCurrentMessage({ missionId: 3, waypointIndex: 0 }),
    }

    expect(describeVehicleMission(state, en)).toBe('Vehicle mission 3: 1 waypoint')
  })
})

describe('activeWaypointIndex', () => {
  it('is the reported waypoint while the vehicle flies its mission in AUTO', () => {
    const state = {
      ...EMPTY,
      heartbeat: heartbeatMessage({ mode: 'AUTO' }),
      mission: missionMessage({ missionId: 2 }),
      missionCurrent: missionCurrentMessage({ missionId: 2, waypointIndex: 1 }),
    }

    expect(activeWaypointIndex(state)).toBe(1)
  })

  it('is null outside AUTO or for an outdated mission', () => {
    const flying = {
      ...EMPTY,
      heartbeat: heartbeatMessage({ mode: 'AUTO' }),
      mission: missionMessage({ missionId: 2 }),
      missionCurrent: missionCurrentMessage({ missionId: 2, waypointIndex: 1 }),
    }
    const outdated = { ...flying, missionCurrent: missionCurrentMessage({ missionId: 1 }) }
    const returning = { ...flying, heartbeat: heartbeatMessage({ mode: 'RTL' }) }

    expect(activeWaypointIndex(outdated)).toBeNull()
    expect(activeWaypointIndex(returning)).toBeNull()
  })
})
