import type { TelemetryMessage } from '../protocol/telemetry'
import { MAX_FLIGHT_LOG_MESSAGES, type FlightLogResult } from '../replay/flightLog'
import { readTlog } from './tlog'
import { createMavlinkTranslator } from './translator'

export function tlogToFlightLog(bytes: Uint8Array): FlightLogResult {
  const { records } = readTlog(bytes)
  const first = records.at(0)
  const last = records.at(-1)
  if (!first || !last) {
    return { ok: false, error: 'notTlog' }
  }

  const translator = createMavlinkTranslator()
  const messages: TelemetryMessage[] = []
  for (const record of records) {
    const timeMs = (record.timeUs - first.timeUs) / 1000
    for (const message of translator.translate(record.frame, timeMs)) {
      messages.push(message)
    }
  }

  if (!messages.some((message) => message.type === 'heartbeat')) {
    return { ok: false, error: 'notTlog' }
  }
  if (messages.length > MAX_FLIGHT_LOG_MESSAGES) {
    return { ok: false, error: 'tooLarge' }
  }
  return {
    ok: true,
    log: {
      savedAt: new Date(last.timeUs / 1000).toISOString(),
      messages: messages.toSorted((first, second) => first.timeMs - second.timeMs),
    },
  }
}
