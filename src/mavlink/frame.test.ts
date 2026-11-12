import { describe, expect, it } from 'vitest'
import { decodeFrame, readFrame, type MavlinkFrame } from './frame'
import { MESSAGE_DEFINITIONS } from './messages'
import {
  expectedMessage,
  frameFixture,
  frameFixtures,
  signedMissionCurrent,
  v1Heartbeat,
} from '../test/mavlinkFrames'

function readWholeFrame(bytes: Uint8Array): MavlinkFrame {
  const result = readFrame(bytes, 0)
  if (result.kind !== 'frame') {
    throw new Error(`Expected a frame, got ${result.kind}`)
  }
  return result.frame
}

describe('readFrame and decodeFrame', () => {
  it.each(frameFixtures)('decode $label exactly as pymavlink encoded it', ({ bytes, fields }) => {
    const frame = readWholeFrame(bytes)

    expect(frame.version).toBe(2)
    expect(frame.length).toBe(bytes.length)
    expect(frame.systemId).toBe(1)
    expect(frame.componentId).toBe(1)
    expect(decodeFrame(frame)).toEqual(expectedMessage(fields))
  })

  it('zero-fills a MAVLink 2 payload that was truncated on the wire', () => {
    const frame = readWholeFrame(frameFixture('SYS_STATUS').bytes)

    expect(frame.payload.length).toBeLessThan(MESSAGE_DEFINITIONS.get(1)?.length ?? 0)
    expect(decodeFrame(frame)).toEqual({ name: 'SYS_STATUS', batteryRemaining: 87 })
  })

  it('reads a signed int8 battery level of -1 as unknown', () => {
    const frame = readWholeFrame(frameFixture('SYS_STATUS unknown battery').bytes)

    expect(decodeFrame(frame)).toEqual({ name: 'SYS_STATUS', batteryRemaining: -1 })
  })

  it('reads MAVLink 1 frames', () => {
    const frame = readWholeFrame(v1Heartbeat)

    expect(frame.version).toBe(1)
    expect(decodeFrame(frame)).toEqual({
      name: 'HEARTBEAT',
      customMode: 4,
      type: 2,
      autopilot: 3,
      baseMode: 89,
    })
  })

  it('includes the 13 signature bytes of a signed frame in its length', () => {
    const frame = readWholeFrame(signedMissionCurrent)

    expect(frame.length).toBe(signedMissionCurrent.length)
    expect(decodeFrame(frame)).toEqual({ name: 'MISSION_CURRENT', seq: 4 })
  })

  it('skips the checksum of messages it does not know and does not decode them', () => {
    const frame = readWholeFrame(frameFixture('VFR_HUD').bytes)

    expect(frame.checked).toBe(false)
    expect(decodeFrame(frame)).toBeNull()
  })

  it('rejects a frame whose checksum does not match', () => {
    const bytes = frameFixture('GLOBAL_POSITION_INT').bytes.slice()
    bytes[12] = (bytes[12] ?? 0) ^ 0xff

    expect(readFrame(bytes, 0)).toEqual({ kind: 'invalid' })
  })

  it('reports a frame cut off before its end as incomplete', () => {
    const bytes = frameFixture('ATTITUDE').bytes

    expect(readFrame(bytes.subarray(0, bytes.length - 1), 0)).toEqual({ kind: 'incomplete' })
    expect(readFrame(bytes.subarray(0, 4), 0)).toEqual({ kind: 'incomplete' })
  })

  it('rejects data that does not start with a MAVLink magic byte', () => {
    expect(readFrame(new Uint8Array([0x42, 0x00]), 0)).toEqual({ kind: 'invalid' })
  })

  it('reads a frame at an offset inside a larger buffer', () => {
    const fixture = frameFixture('HEARTBEAT').bytes
    const bytes = new Uint8Array([0, 0, 0, ...fixture])

    const result = readFrame(bytes, 3)

    expect(result.kind).toBe('frame')
  })
})
