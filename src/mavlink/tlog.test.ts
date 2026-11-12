import { describe, expect, it } from 'vitest'
import { flightTlogBytes } from '../test/mavlinkFlight'
import { frameFixture } from '../test/mavlinkFrames'
import { readTlog } from './tlog'

const START_US = Date.UTC(2026, 10, 12, 10) * 1000

function record(timeUs: number, frame: Uint8Array): Uint8Array {
  const bytes = new Uint8Array(8 + frame.length)
  new DataView(bytes.buffer).setBigUint64(0, BigInt(timeUs), false)
  bytes.set(frame, 8)
  return bytes
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const bytes = new Uint8Array(parts.reduce((total, part) => total + part.length, 0))
  let offset = 0
  for (const part of parts) {
    bytes.set(part, offset)
    offset += part.length
  }
  return bytes
}

describe('readTlog', () => {
  it('reads timestamped frames written one after another', () => {
    const heartbeat = frameFixture('HEARTBEAT').bytes
    const attitude = frameFixture('ATTITUDE').bytes

    const { records, skippedBytes } = readTlog(
      concat(record(START_US, heartbeat), record(START_US + 20_000, attitude)),
    )

    expect(records.map((entry) => [entry.timeUs, entry.frame.messageId])).toEqual([
      [START_US, 0],
      [START_US + 20_000, 30],
    ])
    expect(skippedBytes).toBe(0)
  })

  it('skips garbage between records and finds the next frame', () => {
    const heartbeat = frameFixture('HEARTBEAT').bytes
    const garbage = new Uint8Array([0xfd, 0x09, 0x00, 0x13, 0x37])

    const { records, skippedBytes } = readTlog(
      concat(record(START_US, heartbeat), garbage, record(START_US + 1000, heartbeat)),
    )

    expect(records).toHaveLength(2)
    expect(skippedBytes).toBe(garbage.length)
  })

  it('ignores a record whose timestamp jumps implausibly far', () => {
    const heartbeat = frameFixture('HEARTBEAT').bytes
    const twoDaysUs = 2 * 24 * 60 * 60 * 1_000_000

    const { records } = readTlog(
      concat(record(START_US, heartbeat), record(START_US + twoDaysUs, heartbeat)),
    )

    expect(records).toHaveLength(1)
  })

  it('counts a record cut off at the end of the file as skipped', () => {
    const attitude = frameFixture('ATTITUDE').bytes
    const full = record(START_US, attitude)

    const { records, skippedBytes } = readTlog(concat(full, full.subarray(0, 20)))

    expect(records).toHaveLength(1)
    expect(skippedBytes).toBe(20)
  })

  it('finds nothing in a file that is not a tlog', () => {
    const { records } = readTlog(new TextEncoder().encode('{"format":"mini-gcs-flight-log"}'))

    expect(records).toEqual([])
  })

  it('reads every record of the recorded flight fixture', () => {
    const { records, skippedBytes } = readTlog(flightTlogBytes())

    expect(records.length).toBeGreaterThan(30)
    expect(skippedBytes).toBe(7 + 5)
  })
})
