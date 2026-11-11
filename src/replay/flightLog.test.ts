import { describe, expect, it } from 'vitest'
import { attitudeMessage, heartbeatMessage, positionMessage } from '../test/messages'
import {
  createFlightLog,
  FLIGHT_LOG_FORMAT,
  FLIGHT_LOG_VERSION,
  flightLogDurationMs,
  flightLogFileName,
  serializeFlightLog,
} from './flightLog'

const messages = [
  heartbeatMessage({ timeMs: 1000 }),
  positionMessage({ timeMs: 1100 }),
  attitudeMessage({ timeMs: 4000 }),
]

describe('flight logs', () => {
  it('saves the format, the version, the save time and the messages', () => {
    const log = createFlightLog(messages, new Date('2026-11-11T10:15:30.000Z'))

    expect(JSON.parse(serializeFlightLog(log))).toEqual({
      format: FLIGHT_LOG_FORMAT,
      version: FLIGHT_LOG_VERSION,
      savedAt: '2026-11-11T10:15:30.000Z',
      messages,
    })
  })

  it('measures the time between the first and the last message', () => {
    expect(flightLogDurationMs(messages)).toBe(3000)
    expect(flightLogDurationMs([])).toBe(0)
  })

  it('names files after the save time', () => {
    expect(flightLogFileName('2026-11-11T10:15:30.000Z')).toBe(
      'mini-gcs-flight-2026-11-11T10-15-30.json',
    )
  })
})
