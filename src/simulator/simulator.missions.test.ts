import { describe, expect, it } from 'vitest'
import { destinationPoint, distanceMeters, type LatLon } from '../geo/geo'
import type { PositionMessage } from '../protocol/telemetry'
import {
  createDemoSimulator,
  isModeHeartbeat,
  lastOfType,
  ofType,
  run,
  runUntil,
  sendCommand,
} from '../test/simulation'
import { DEMO_HOME, DEMO_PATROL_ROUTE } from './demoArea'

const SHORT_MISSION = [destinationPoint(DEMO_HOME, 90, 200), destinationPoint(DEMO_HOME, 0, 200)]
const UPLOADED_WAYPOINT = destinationPoint(DEMO_HOME, 135, 600)

function visits(positions: PositionMessage[], waypoint: LatLon): boolean {
  return positions.some((position) => distanceMeters(position, waypoint) <= 12)
}

describe('simulator missions', () => {
  it('reports its mission and the waypoint it is flying to', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)
    const messages = run(simulator, 90)

    expect(lastOfType(messages, 'mission')).toMatchObject({
      missionId: 1,
      waypoints: DEMO_PATROL_ROUTE,
    })
    const indexes = ofType(messages, 'missionCurrent').map((current) => current.waypointIndex)
    expect(indexes).toContain(1)
    expect(indexes).toEqual([...indexes].sort((a, b) => a - b))
  })

  it('flies through every waypoint in order', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)
    const positions = ofType(runUntil(simulator, isModeHeartbeat('RTL'), 400), 'position')

    const firstVisits = DEMO_PATROL_ROUTE.map((waypoint) =>
      positions.findIndex((position) => distanceMeters(position, waypoint) <= 12),
    )

    expect(firstVisits).not.toContain(-1)
    expect(firstVisits).toEqual([...firstVisits].sort((a, b) => a - b))
  })

  it('returns home after the last waypoint', () => {
    const simulator = createDemoSimulator(SHORT_MISSION)

    const messages = runUntil(simulator, isModeHeartbeat('RTL'), 200)

    expect(lastOfType(messages, 'systemStatus').batteryPercent).toBeGreaterThan(80)
    expect(lastOfType(messages, 'missionCurrent').waypointIndex).toBe(1)
  })

  it('accepts an uploaded mission and flies it on the next takeoff', () => {
    const simulator = createDemoSimulator()

    const ack = sendCommand(simulator, { type: 'uploadMission', waypoints: [UPLOADED_WAYPOINT] })
    const nextMessages = run(simulator, 0.05)
    const flight = runUntil(simulator, isModeHeartbeat('RTL'), 200)

    expect(ack).toMatchObject({ command: 'uploadMission', accepted: true, reason: null })
    expect(lastOfType(nextMessages, 'mission')).toMatchObject({
      missionId: 2,
      waypoints: [UPLOADED_WAYPOINT],
    })
    expect(visits(ofType(flight, 'position'), UPLOADED_WAYPOINT)).toBe(true)
  })

  it('switches to an uploaded mission in flight', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)

    sendCommand(simulator, { type: 'uploadMission', waypoints: [UPLOADED_WAYPOINT] })
    const flight = runUntil(simulator, isModeHeartbeat('RTL'), 200)

    expect(visits(ofType(flight, 'position'), UPLOADED_WAYPOINT)).toBe(true)
    expect(visits(ofType(flight, 'position'), DEMO_PATROL_ROUTE[1] ?? DEMO_HOME)).toBe(false)
    expect(lastOfType(flight, 'missionCurrent').missionId).toBe(2)
  })

  it('rejects an invalid mission and keeps the current one', () => {
    const simulator = createDemoSimulator()
    run(simulator, 1)

    const ack = sendCommand(simulator, { type: 'uploadMission', waypoints: [] })
    const messages = run(simulator, 6)

    expect(ack).toMatchObject({ accepted: false, reason: 'Add at least one waypoint' })
    expect(lastOfType(messages, 'mission').missionId).toBe(1)
  })
})
