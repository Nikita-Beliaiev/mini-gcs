import type { TelemetryMessage } from '../protocol/telemetry'

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

export interface Transport {
  connect: () => void
  disconnect: () => void
  getStatus: () => ConnectionStatus
  subscribeStatus: (listener: () => void) => () => void
  subscribeMessages: (listener: (message: TelemetryMessage) => void) => () => void
}
