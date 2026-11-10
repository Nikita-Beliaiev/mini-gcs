import type { CommandEnvelope } from '../protocol/commands'
import type { TelemetryMessage } from '../protocol/telemetry'
import { createEmitter } from '../shared/emitter'
import type { ConnectionStatus, Transport } from './transport'

export interface WorkerLike {
  onmessage: ((event: MessageEvent<TelemetryMessage>) => void) | null
  onerror: ((event: ErrorEvent) => void) | null
  postMessage: (envelope: CommandEnvelope) => void
  terminate: () => void
}

export function createWorkerTransport(createWorker: () => WorkerLike): Transport {
  const statusChanges = createEmitter()
  const messages = createEmitter<TelemetryMessage>()
  let worker: WorkerLike | null = null
  let status: ConnectionStatus = 'disconnected'

  function setStatus(next: ConnectionStatus): void {
    if (next === status) {
      return
    }
    status = next
    statusChanges.emit()
  }

  function disconnect(): void {
    worker?.terminate()
    worker = null
    setStatus('disconnected')
  }

  function connect(): void {
    if (worker) {
      return
    }
    const newWorker = createWorker()
    newWorker.onmessage = (event) => {
      if (worker !== newWorker) {
        return
      }
      if (event.data.type === 'heartbeat') {
        setStatus('connected')
      }
      messages.emit(event.data)
    }
    newWorker.onerror = () => {
      if (worker === newWorker) {
        disconnect()
      }
    }
    worker = newWorker
    setStatus('connecting')
  }

  return {
    connect,
    disconnect,
    send: (envelope) => {
      worker?.postMessage(envelope)
    },
    getStatus: () => status,
    subscribeStatus: statusChanges.subscribe,
    subscribeMessages: messages.subscribe,
  }
}
