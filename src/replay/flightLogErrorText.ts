import type { Messages } from '../i18n/en'
import { MAX_FLIGHT_LOG_BYTES, type FlightLogError } from './flightLog'

export function describeFlightLogError(error: FlightLogError, messages: Messages): string {
  const text = messages.flightLog.errors
  return error === 'tooLarge' ? text.tooLarge(MAX_FLIGHT_LOG_BYTES / 1_000_000) : text[error]
}
