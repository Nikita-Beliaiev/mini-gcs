import { describe, expect, it } from 'vitest'
import type { TelemetryMessage } from '../protocol/telemetry'
import { flightTlogBytes, transfersTlogBytes } from '../test/mavlinkFlight'
import { frameFixture } from '../test/mavlinkFrames'
import { readFrame } from './frame'
import { tlogToFlightLog } from './tlogFlightLog'
import { createMavlinkTranslator } from './translator'

function flightMessages(bytes: Uint8Array): readonly TelemetryMessage[] {
  const result = tlogToFlightLog(bytes)
  if (!result.ok) {
    throw new Error(`Expected a flight log, got ${result.error}`)
  }
  return result.log.messages
}

function ofType<Type extends TelemetryMessage['type']>(
  messages: readonly TelemetryMessage[],
  type: Type,
): Extract<TelemetryMessage, { type: Type }>[] {
  return messages.filter(
    (message): message is Extract<TelemetryMessage, { type: Type }> => message.type === type,
  )
}

describe('MAVLink translator on a recorded flight', () => {
  const messages = flightMessages(flightTlogBytes())

  it('produces station messages in the order the vehicle sent them', () => {
    expect(messages.map((message) => message.type)).toEqual([
      'heartbeat',
      'home',
      'systemStatus',
      'heartbeat',
      'position',
      'attitude',
      'mission',
      'geofence',
      'heartbeat',
      'missionCurrent',
      'missionCurrent',
      'systemStatus',
      'geofence',
    ])
    expect(messages.map((message) => message.seq)).toEqual(messages.map((_, index) => index + 1))
  })

  it('times messages from the start of the log', () => {
    expect(messages.at(0)?.timeMs).toBe(10)
    expect(messages.at(-1)?.timeMs).toBe(2110)
  })

  it('names ArduCopter flight modes and reads the armed flag', () => {
    expect(ofType(messages, 'heartbeat').map(({ mode, armed }) => [mode, armed])).toEqual([
      ['STABILIZE', false],
      ['GUIDED', true],
      ['AUTO', true],
    ])
  })

  it('skips the zero position sent before a GPS fix and converts units', () => {
    const [position] = ofType(messages, 'position')

    expect(position).toMatchObject({
      lat: 43.0951,
      lon: 11.6452,
      altitudeM: 12,
      groundSpeedMs: 5,
      headingDeg: 90,
    })
  })

  it('converts attitude from radians and keeps yaw between 0 and 360 degrees', () => {
    const [attitude] = ofType(messages, 'attitude')

    expect(attitude?.rollDeg).toBeCloseTo(5.73, 2)
    expect(attitude?.pitchDeg).toBeCloseTo(-2.86, 2)
    expect(attitude?.yawDeg).toBeCloseTo(270, 3)
  })

  it('rebuilds the mission from an accepted upload, leaving out home and takeoff', () => {
    expect(ofType(messages, 'mission')).toMatchObject([
      {
        missionId: 1,
        waypoints: [
          { lat: 43.098211, lon: 11.646601 },
          { lat: 43.096047, lon: 11.650353 },
        ],
      },
    ])
  })

  it('maps the current mission item to the waypoint the vehicle is flying to', () => {
    expect(
      ofType(messages, 'missionCurrent').map(({ missionId, waypointIndex }) => [
        missionId,
        waypointIndex,
      ]),
    ).toEqual([
      [1, 0],
      [1, 1],
    ])
  })

  it('rebuilds the geofence from an accepted upload and clears it on request', () => {
    expect(ofType(messages, 'geofence').map(({ polygon }) => polygon)).toEqual([
      [
        { lat: 43.1, lon: 11.64 },
        { lat: 43.1, lon: 11.655 },
        { lat: 43.09, lon: 11.655 },
      ],
      null,
    ])
  })

  it('combines battery, GPS, fence and link quality into system status', () => {
    expect(ofType(messages, 'systemStatus')).toMatchObject([
      {
        batteryPercent: 95,
        gpsSatellites: 9,
        gpsFix: '3d',
        linkQualityPercent: 100,
        fenceBreached: false,
      },
      {
        batteryPercent: 94,
        gpsSatellites: 9,
        gpsFix: '3d',
        linkQualityPercent: 89,
        fenceBreached: true,
      },
    ])
  })

  it('saves the log with the time of its last record', () => {
    const result = tlogToFlightLog(flightTlogBytes())

    expect(result.ok && result.log.savedAt).toBe('2026-11-12T10:00:02.120Z')
  })
})

describe('MAVLink translator on mission transfers', () => {
  it('keeps a mission downloaded from the vehicle and ignores rejected or incomplete uploads', () => {
    const messages = flightMessages(transfersTlogBytes())

    expect(ofType(messages, 'mission')).toMatchObject([
      { missionId: 1, waypoints: [{ lat: 43.097, lon: 11.647 }] },
    ])
  })
})

describe('createMavlinkTranslator', () => {
  function translateFixture(label: string) {
    const result = readFrame(frameFixture(label).bytes, 0)
    if (result.kind !== 'frame') {
      throw new Error('Expected a frame')
    }
    return createMavlinkTranslator().translate(result.frame, 0)
  }

  it('does not apply ArduCopter mode names to other vehicles', () => {
    expect(translateFixture('HEARTBEAT plane')).toMatchObject([
      { type: 'heartbeat', mode: 'UNKNOWN', armed: true },
    ])
  })

  it('waits for a vehicle heartbeat before translating anything', () => {
    expect(translateFixture('GLOBAL_POSITION_INT')).toEqual([])
  })
})

describe('tlogToFlightLog', () => {
  it('rejects a file without MAVLink frames', () => {
    expect(tlogToFlightLog(new TextEncoder().encode('not a telemetry log at all'))).toEqual({
      ok: false,
      error: 'notTlog',
    })
  })
})
