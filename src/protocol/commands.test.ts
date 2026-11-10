import { describe, expect, it } from 'vitest'
import { parseCommandEnvelope } from './commands'
import { MAX_POINTS_PER_MESSAGE, parseJson } from './shared'

describe('parseCommandEnvelope', () => {
  it.each([
    { commandId: 1, command: { type: 'ping' } },
    { commandId: 2, command: { type: 'clearGeofence' } },
    { commandId: 3, command: { type: 'simulateFault', fault: 'gpsLoss' } },
    { commandId: 4, command: { type: 'uploadMission', waypoints: [{ lat: 43.1, lon: 11.6 }] } },
    { commandId: 5, command: { type: 'uploadGeofence', polygon: [{ lat: 43.1, lon: 11.6 }] } },
  ])('accepts $command.type', (envelope) => {
    expect(parseCommandEnvelope(envelope)).toEqual(envelope)
  })

  it.each([
    ['no command id', { command: { type: 'ping' } }],
    ['a fractional command id', { commandId: 1.5, command: { type: 'ping' } }],
    ['an unknown command', { commandId: 1, command: { type: 'disarm' } }],
    ['an unknown fault', { commandId: 1, command: { type: 'simulateFault', fault: 'fire' } }],
    [
      'a waypoint off the globe',
      { commandId: 1, command: { type: 'uploadMission', waypoints: [{ lat: 0, lon: 200 }] } },
    ],
    [
      'too many points',
      {
        commandId: 1,
        command: {
          type: 'uploadMission',
          waypoints: Array.from({ length: MAX_POINTS_PER_MESSAGE + 1 }, () => ({ lat: 0, lon: 0 })),
        },
      },
    ],
  ])('rejects %s', (_, data) => {
    expect(parseCommandEnvelope(data)).toBeNull()
  })
})

describe('parseJson', () => {
  it('parses valid JSON and returns undefined for anything else', () => {
    expect(parseJson('{"a":1}')).toEqual({ a: 1 })
    expect(parseJson('{not json')).toBeUndefined()
  })
})
