import { describe, expect, it } from 'vitest'
import {
  attitudeMessage,
  cameraMessage,
  commandAckMessage,
  geofenceMessage,
  heartbeatMessage,
  homeMessage,
  missionCurrentMessage,
  missionMessage,
  positionMessage,
  systemStatusMessage,
} from '../test/messages'
import { parseTelemetryMessage } from './telemetry'

describe('parseTelemetryMessage', () => {
  it.each([
    heartbeatMessage(),
    positionMessage(),
    attitudeMessage(),
    systemStatusMessage(),
    homeMessage(),
    missionMessage(),
    missionCurrentMessage(),
    geofenceMessage(),
    geofenceMessage({ polygon: [{ lat: 1, lon: 2 }] }),
    cameraMessage(),
    cameraMessage({ lookAt: { lat: 43.1, lon: 11.6 } }),
    commandAckMessage({ accepted: false, reason: 'Busy' }),
  ])('accepts a valid $type message', (message) => {
    expect(parseTelemetryMessage(message)).toEqual(message)
  })

  it.each([
    ['nothing', undefined],
    ['a string', 'heartbeat'],
    ['an unknown type', { ...heartbeatMessage(), type: 'selfDestruct' }],
    ['a missing field', { type: 'heartbeat', seq: 1, timeMs: 0, mode: 'AUTO' }],
    ['a wrong field type', { ...positionMessage(), altitudeM: '40' }],
    ['a value that is not a number', { ...positionMessage(), altitudeM: Number.NaN }],
    ['an unknown flight mode', { ...heartbeatMessage(), mode: 'HYPERSPACE' }],
    ['a latitude off the globe', { ...homeMessage(), lat: 123 }],
  ])('rejects %s', (_, data) => {
    expect(parseTelemetryMessage(data)).toBeNull()
  })

  it('accepts ArduCopter flight modes from a real autopilot', () => {
    expect(parseTelemetryMessage({ ...heartbeatMessage(), mode: 'LOITER' })).toMatchObject({
      mode: 'LOITER',
    })
  })

  it('drops fields the protocol does not know', () => {
    const parsed = parseTelemetryMessage({ ...heartbeatMessage(), injected: '<script>' })

    expect(parsed).toEqual(heartbeatMessage())
  })
})
