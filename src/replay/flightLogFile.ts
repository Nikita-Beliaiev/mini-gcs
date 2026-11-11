import { z } from 'zod'
import { parseJson } from '../protocol/shared'
import { telemetryMessageSchema } from '../protocol/telemetry'
import { FLIGHT_LOG_FORMAT, FLIGHT_LOG_VERSION, type FlightLog } from './flightLog'

export const MAX_FLIGHT_LOG_MESSAGES = 200_000
export const MAX_FLIGHT_LOG_BYTES = 50_000_000

export type FlightLogResult = { ok: true; log: FlightLog } | { ok: false; error: string }

export const FLIGHT_LOG_ERRORS = {
  tooLarge: `The file is larger than ${String(MAX_FLIGHT_LOG_BYTES / 1_000_000)} MB.`,
  notJson: 'The file is not valid JSON.',
  notFlightLog: 'This file is not a Mini GCS flight log.',
  invalid: 'The flight log is damaged or was saved by an unsupported version.',
}

const formatSchema = z.object({ format: z.literal(FLIGHT_LOG_FORMAT) })

const flightLogSchema = z.object({
  format: z.literal(FLIGHT_LOG_FORMAT),
  version: z.literal(FLIGHT_LOG_VERSION),
  savedAt: z.iso.datetime(),
  messages: z.array(telemetryMessageSchema).min(1).max(MAX_FLIGHT_LOG_MESSAGES),
})

function failure(error: string): FlightLogResult {
  return { ok: false, error }
}

export function parseFlightLog(text: string): FlightLogResult {
  const data = parseJson(text)
  if (data === undefined) {
    return failure(FLIGHT_LOG_ERRORS.notJson)
  }
  if (!formatSchema.safeParse(data).success) {
    return failure(FLIGHT_LOG_ERRORS.notFlightLog)
  }
  const result = flightLogSchema.safeParse(data)
  if (!result.success) {
    return failure(FLIGHT_LOG_ERRORS.invalid)
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
    return failure(FLIGHT_LOG_ERRORS.tooLarge)
  }
  return parseFlightLog(await file.text())
}
