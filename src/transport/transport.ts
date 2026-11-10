import type { CommandEnvelope } from '../protocol/commands'
import type { TelemetryMessage } from '../protocol/telemetry'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface Transport {
  connect: () => void
  disconnect: () => void
  send: (envelope: CommandEnvelope) => void
  getStatus: () => ConnectionStatus
  subscribeStatus: (listener: () => void) => () => void
  subscribeMessages: (listener: (message: TelemetryMessage) => void) => () => void
}
