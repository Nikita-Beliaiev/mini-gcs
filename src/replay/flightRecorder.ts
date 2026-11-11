import type { TelemetryMessage } from '../protocol/telemetry'
import { createEmitter } from '../shared/emitter'

export const RECORDING_WINDOW_MS = 10 * 60_000

export interface FlightRecorder {
  record: (message: TelemetryMessage) => void
  getMessages: () => TelemetryMessage[]
  getMessageCount: () => number
  getDurationMs: () => number
  subscribe: (listener: () => void) => () => void
}

export function createFlightRecorder(windowMs = RECORDING_WINDOW_MS): FlightRecorder {
  const changes = createEmitter()
  let messages: TelemetryMessage[] = []
  let firstIndex = 0

  function startOver(): void {
    messages = []
    firstIndex = 0
  }

  function dropOlderThan(cutoffMs: number): void {
    let first = messages[firstIndex]
    while (first && first.timeMs < cutoffMs) {
      firstIndex += 1
      first = messages[firstIndex]
    }
    if (firstIndex * 2 > messages.length) {
      messages = messages.slice(firstIndex)
      firstIndex = 0
    }
  }

  return {
    record(message) {
      if (message.type === 'commandAck') {
        return
      }
      const last = messages.at(-1)
      if (last && message.timeMs < last.timeMs) {
        startOver()
      }
      messages.push(message)
      dropOlderThan(message.timeMs - windowMs)
      changes.emit()
    },
    getMessages: () => messages.slice(firstIndex),
    getMessageCount: () => messages.length - firstIndex,
    getDurationMs() {
      const first = messages[firstIndex]
      const last = messages.at(-1)
      return first && last ? last.timeMs - first.timeMs : 0
    },
    subscribe: changes.subscribe,
  }
}
