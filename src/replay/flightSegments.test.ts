import { describe, expect, it } from 'vitest'
import type { FlightMode } from '../protocol/telemetry'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { flightSegments } from './flightSegments'

function heartbeats(modes: readonly FlightMode[], startMs = 0) {
  return modes.map((mode, index) => heartbeatMessage({ mode, timeMs: startMs + index * 1000 }))
}

describe('flightSegments', () => {
  it('splits the flight where the mode changes', () => {
    const messages = heartbeats(['STANDBY', 'STANDBY', 'TAKEOFF', 'AUTO', 'AUTO'], 5000)

    expect(flightSegments(messages)).toEqual([
      { kind: 'STANDBY', startMs: 0, endMs: 2000 },
      { kind: 'TAKEOFF', startMs: 2000, endMs: 3000 },
      { kind: 'AUTO', startMs: 3000, endMs: 4000 },
    ])
  })

  it('runs the last mode to the end of the log', () => {
    const messages = [...heartbeats(['AUTO']), positionMessage({ timeMs: 2500 })]

    expect(flightSegments(messages)).toEqual([{ kind: 'AUTO', startMs: 0, endMs: 2500 }])
  })

  it('marks a gap in heartbeats as a lost link', () => {
    const messages = [
      heartbeatMessage({ mode: 'AUTO', timeMs: 0 }),
      heartbeatMessage({ mode: 'AUTO', timeMs: 1000 }),
      heartbeatMessage({ mode: 'AUTO', timeMs: 11_000 }),
      heartbeatMessage({ mode: 'RTL', timeMs: 12_000 }),
      positionMessage({ timeMs: 13_000 }),
    ]

    expect(flightSegments(messages)).toEqual([
      { kind: 'AUTO', startMs: 0, endMs: 1000 },
      { kind: 'noLink', startMs: 1000, endMs: 11_000 },
      { kind: 'AUTO', startMs: 11_000, endMs: 12_000 },
      { kind: 'RTL', startMs: 12_000, endMs: 13_000 },
    ])
  })

  it('marks a lost link at the end of the log', () => {
    const messages = [
      heartbeatMessage({ mode: 'LAND', timeMs: 0 }),
      positionMessage({ timeMs: 8000 }),
    ]

    expect(flightSegments(messages)).toEqual([{ kind: 'noLink', startMs: 0, endMs: 8000 }])
  })

  it('leaves out the time before the first heartbeat', () => {
    const messages = [positionMessage({ timeMs: 0 }), ...heartbeats(['AUTO', 'AUTO'], 2000)]

    expect(flightSegments(messages)).toEqual([{ kind: 'AUTO', startMs: 2000, endMs: 3000 }])
  })

  it('finds nothing without heartbeats', () => {
    expect(flightSegments([])).toEqual([])
    expect(flightSegments([positionMessage()])).toEqual([])
  })
})
