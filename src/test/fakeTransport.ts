import type { TelemetryMessage } from '../protocol/telemetry'
import { createEmitter } from '../shared/emitter'
import type { ConnectionStatus, Transport } from '../transport/transport'

export interface FakeTransport extends Transport {
  receive: (message: TelemetryMessage) => void
  setStatus: (status: ConnectionStatus) => void
}

export function createFakeTransport(): FakeTransport {
  const statusChanges = createEmitter()
  const messages = createEmitter<TelemetryMessage>()
  let status: ConnectionStatus = 'disconnected'

  function setStatus(next: ConnectionStatus): void {
    status = next
    statusChanges.emit()
  }

  return {
    connect: () => {
      setStatus('connecting')
    },
    disconnect: () => {
      setStatus('disconnected')
    },
    getStatus: () => status,
    subscribeStatus: statusChanges.subscribe,
    subscribeMessages: messages.subscribe,
    receive: messages.emit,
    setStatus,
  }
}
