import type { LatLon } from '../geo/geo'
import type { Command } from '../protocol/commands'
import type { FlightMode, TelemetryMessage, TelemetryMessageType } from '../protocol/telemetry'
import { DEMO_HOME, DEMO_PATROL_ROUTE } from '../simulator/demoArea'
import { createSimulator, type Simulator } from '../simulator/simulator'

export const TICK_MS = 20

export type MessageOf<T extends TelemetryMessageType> = Extract<TelemetryMessage, { type: T }>

export function createDemoSimulator(
  defaultMission: readonly LatLon[] = DEMO_PATROL_ROUTE,
  seed = 1,
): Simulator {
  return createSimulator({ home: DEMO_HOME, defaultMission, seed })
}

export function run(simulator: Simulator, seconds: number): TelemetryMessage[] {
  const messages: TelemetryMessage[] = []
  for (let elapsedMs = 0; elapsedMs < seconds * 1000; elapsedMs += TICK_MS) {
    messages.push(...simulator.step(TICK_MS))
  }
  return messages
}

export function runUntil(
  simulator: Simulator,
  isDone: (message: TelemetryMessage) => boolean,
  maxSeconds: number,
): TelemetryMessage[] {
  const messages: TelemetryMessage[] = []
  for (let elapsedMs = 0; elapsedMs < maxSeconds * 1000; elapsedMs += TICK_MS) {
    for (const message of simulator.step(TICK_MS)) {
      messages.push(message)
      if (isDone(message)) {
        return messages
      }
    }
  }
  throw new Error(`Condition not met within ${String(maxSeconds)} s`)
}

export function ofType<T extends TelemetryMessageType>(
  messages: TelemetryMessage[],
  type: T,
): MessageOf<T>[] {
  return messages.filter((message): message is MessageOf<T> => message.type === type)
}

export function lastOfType<T extends TelemetryMessageType>(
  messages: TelemetryMessage[],
  type: T,
): MessageOf<T> {
  const message = ofType(messages, type).at(-1)
  if (!message) {
    throw new Error(`No ${type} message`)
  }
  return message
}

export function isModeHeartbeat(mode: FlightMode) {
  return (message: TelemetryMessage) => message.type === 'heartbeat' && message.mode === mode
}

let nextCommandId = 1

export function sendCommand(simulator: Simulator, command: Command): MessageOf<'commandAck'> {
  const commandId = nextCommandId
  nextCommandId += 1
  return lastOfType(simulator.handleCommand({ commandId, command }), 'commandAck')
}
