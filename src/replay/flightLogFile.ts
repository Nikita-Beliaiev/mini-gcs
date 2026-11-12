import { z } from 'zod'
import { parseJson } from '../protocol/shared'
import { telemetryMessageSchema } from '../protocol/telemetry'
import {
  FLIGHT_LOG_FORMAT,
  FLIGHT_LOG_VERSION,
  MAX_FLIGHT_LOG_BYTES,
  MAX_FLIGHT_LOG_MESSAGES,
  type FlightLogError,
  type FlightLogResult,
} from './flightLog'

const formatSchema = z.object({ format: z.literal(FLIGHT_LOG_FORMAT) })

const flightLogSchema = z.object({
  format: z.literal(FLIGHT_LOG_FORMAT),
  version: z.literal(FLIGHT_LOG_VERSION),
  savedAt: z.iso.datetime(),
  messages: z.array(telemetryMessageSchema).min(1).max(MAX_FLIGHT_LOG_MESSAGES),
})

function failure(error: FlightLogError): FlightLogResult {
  return { ok: false, error }
}

export function parseFlightLog(text: string): FlightLogResult {
  const data = parseJson(text)
  if (data === undefined) {
    return failure('notJson')
  }
  if (!formatSchema.safeParse(data).success) {
    return failure('notFlightLog')
  }
  const result = flightLogSchema.safeParse(data)
  if (!result.success) {
    return failure('invalid')
  }
  return {
    ok: true,
    log: {
      savedAt: result.data.savedAt,
      messages: result.data.messages.toSorted((first, second) => first.timeMs - second.timeMs),
    },
  }
}

export async function readFlightLogFile(
  file: Blob,
  maxBytes = MAX_FLIGHT_LOG_BYTES,
): Promise<FlightLogResult> {
  if (file.size > maxBytes) {
    return failure('tooLarge')
  }
  return parseFlightLog(await file.text())
}
