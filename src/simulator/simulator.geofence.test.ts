import { describe, expect, it } from 'vitest'
import { destinationPoint, type LatLon } from '../geo/geo'
import {
  createDemoSimulator,
  isModeHeartbeat,
  lastOfType,
  ofType,
  run,
  runUntil,
  sendCommand,
} from '../test/simulation'
import { DEMO_HOME } from './demoArea'

function squareAroundHome(halfDiagonalM: number): LatLon[] {
  return [45, 135, 225, 315].map((bearing) => destinationPoint(DEMO_HOME, bearing, halfDiagonalM))
}

describe('simulator geofence', () => {
  it('reports no geofence until one is uploaded', () => {
    const messages = run(createDemoSimulator(), 1)

    expect(lastOfType(messages, 'geofence').polygon).toBeNull()
    expect(lastOfType(messages, 'systemStatus').fenceBreached).toBe(false)
  })

  it('accepts a geofence around home and reports it', () => {
    const simulator = createDemoSimulator()
    const fence = squareAroundHome(1000)

    const ack = sendCommand(simulator, { type: 'uploadGeofence', polygon: fence })
    const messages = run(simulator, 0.05)

    expect(ack).toMatchObject({ command: 'uploadGeofence', accepted: true })
    expect(lastOfType(messages, 'geofence').polygon).toEqual(fence)
  })

  it('rejects a geofence that leaves home outside', () => {
    const simulator = createDemoSimulator()
    const elsewhere = squareAroundHome(300).map((vertex) => destinationPoint(vertex, 0, 2000))

    const ack = sendCommand(simulator, { type: 'uploadGeofence', polygon: elsewhere })

    expect(ack).toMatchObject({ accepted: false, reason: 'Home must be inside the geofence' })
  })

  it('rejects missions that leave the geofence', () => {
    const simulator = createDemoSimulator()
    sendCommand(simulator, { type: 'uploadGeofence', polygon: squareAroundHome(400) })

    const ack = sendCommand(simulator, {
      type: 'uploadMission',
      waypoints: [destinationPoint(DEMO_HOME, 90, 800)],
    })

    expect(ack).toMatchObject({ accepted: false, reason: 'Waypoint 1 is outside the geofence' })
  })

  it('returns home after flying out of the geofence', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)

    sendCommand(simulator, { type: 'uploadGeofence', polygon: squareAroundHome(250) })
    const aroundBreach = [...runUntil(simulator, isModeHeartbeat('RTL'), 60), ...run(simulator, 1)]
    const toLanding = runUntil(simulator, isModeHeartbeat('LAND'), 120)

    expect(ofType(aroundBreach, 'systemStatus').some((status) => status.fenceBreached)).toBe(true)
    expect(lastOfType(toLanding, 'systemStatus').fenceBreached).toBe(false)
  })

  it('removes the geofence on request', () => {
    const simulator = createDemoSimulator()
    sendCommand(simulator, { type: 'uploadGeofence', polygon: squareAroundHome(1000) })

    const ack = sendCommand(simulator, { type: 'clearGeofence' })
    const messages = run(simulator, 0.05)

    expect(ack).toMatchObject({ command: 'clearGeofence', accepted: true })
    expect(lastOfType(messages, 'geofence').polygon).toBeNull()
  })
})
