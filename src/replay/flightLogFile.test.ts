import { describe, expect, it } from 'vitest'
import { attitudeMessage, heartbeatMessage, positionMessage } from '../test/messages'
import { createFlightLog, serializeFlightLog } from './flightLog'
import { parseFlightLog, readFlightLogFile } from './flightLogFile'

const SAVED_AT = new Date('2026-11-11T10:15:30.000Z')

const messages = [
  heartbeatMessage({ timeMs: 1000 }),
  positionMessage({ timeMs: 1100 }),
  attitudeMessage({ timeMs: 4000 }),
]

function logText(overrides: Record<string, unknown> = {}): string {
  return JSON.stringify({
    ...(JSON.parse(serializeFlightLog(createFlightLog(messages, SAVED_AT))) as object),
    ...overrides,
  })
}

describe('flight log files', () => {
  it('reads back what was saved', () => {
    const result = parseFlightLog(serializeFlightLog(createFlightLog(messages, SAVED_AT)))

    expect(result).toEqual({
      ok: true,
      log: { savedAt: '2026-11-11T10:15:30.000Z', messages },
    })
  })

  it('puts messages in time order', () => {
    const result = parseFlightLog(logText({ messages: [...messages].reverse() }))

    expect(result.ok && result.log.messages).toEqual(messages)
  })

  it('rejects text that is not JSON', () => {
    expect(parseFlightLog('{ not json')).toEqual({ ok: false, error: 'notJson' })
  })

  it('rejects JSON that is not a flight log', () => {
    expect(parseFlightLog('{"name":"mini-gcs"}')).toEqual({
      ok: false,
      error: 'notFlightLog',
    })
    expect(parseFlightLog('null')).toEqual({ ok: false, error: 'notFlightLog' })
  })

  it('rejects a damaged log, another version and an empty log', () => {
    const damaged = logText({ messages: [{ type: 'position', seq: 1, timeMs: 'soon' }] })

    for (const text of [damaged, logText({ version: 2 }), logText({ messages: [] })]) {
      expect(parseFlightLog(text)).toEqual({ ok: false, error: 'invalid' })
    }
  })

  it('reads a file and refuses one that is too large', async () => {
    const file = new Blob([logText()])

    expect((await readFlightLogFile(file)).ok).toBe(true)
    expect(await readFlightLogFile(file, file.size - 1)).toEqual({
      ok: false,
      error: 'tooLarge',
    })
  })
})
