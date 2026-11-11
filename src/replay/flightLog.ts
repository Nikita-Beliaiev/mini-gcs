import type { TelemetryMessage } from '../protocol/telemetry'

export const FLIGHT_LOG_FORMAT = 'mini-gcs-flight-log'
export const FLIGHT_LOG_VERSION = 1
export const MAX_FLIGHT_LOG_BYTES = 50_000_000

export interface FlightLog {
  savedAt: string
  messages: readonly TelemetryMessage[]
}

export type FlightLogSource = { kind: 'recording' } | { kind: 'file'; name: string }

export type FlightLogError = 'tooLarge' | 'notJson' | 'notFlightLog' | 'invalid'

export function createFlightLog(messages: readonly TelemetryMessage[], savedAt: Date): FlightLog {
  return { savedAt: savedAt.toISOString(), messages }
}

export function serializeFlightLog(log: FlightLog): string {
  return JSON.stringify({
    format: FLIGHT_LOG_FORMAT,
    version: FLIGHT_LOG_VERSION,
    savedAt: log.savedAt,
    messages: log.messages,
  })
}

export function flightLogDurationMs(messages: readonly TelemetryMessage[]): number {
  const first = messages.at(0)
  const last = messages.at(-1)
  return first && last ? last.timeMs - first.timeMs : 0
}

export function flightLogFileName(savedAt: string): string {
  return `mini-gcs-flight-${savedAt.slice(0, 19).replaceAll(':', '-')}.json`
}
