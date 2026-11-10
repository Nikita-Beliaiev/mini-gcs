import type { CommandEnvelope } from '../protocol/commands'
import { parseJson } from '../protocol/shared'
import { parseTelemetryMessage, type TelemetryMessage } from '../protocol/telemetry'
import { createEmitter } from '../shared/emitter'
import type { ConnectionStatus, Transport } from './transport'

export interface SocketLike {
  readonly readyState: number
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  send: (data: string) => void
  close: () => void
}

const SOCKET_OPEN = 1

function openBrowserSocket(url: string): SocketLike {
  return new WebSocket(url)
}

export function createWebSocketTransport(
  url: string,
  openSocket: (url: string) => SocketLike = openBrowserSocket,
): Transport {
  const statusChanges = createEmitter()
  const messages = createEmitter<TelemetryMessage>()
  let socket: SocketLike | null = null
  let status: ConnectionStatus = 'disconnected'

  function setStatus(next: ConnectionStatus): void {
    if (next === status) {
      return
    }
    status = next
    statusChanges.emit()
  }

  function receive(data: unknown): void {
    if (typeof data !== 'string') {
      return
    }
    const message = parseTelemetryMessage(parseJson(data))
    if (!message) {
      return
    }
    if (message.type === 'heartbeat') {
      setStatus('connected')
    }
    messages.emit(message)
  }

  function connect(): void {
    if (socket) {
      return
    }
    const newSocket = openSocket(url)
    newSocket.onmessage = (event) => {
      if (socket === newSocket) {
        receive(event.data)
      }
    }
    newSocket.onclose = () => {
      if (socket === newSocket) {
        socket = null
        setStatus('disconnected')
      }
    }
    socket = newSocket
    setStatus('connecting')
  }

  function disconnect(): void {
    const closing = socket
    socket = null
    closing?.close()
    setStatus('disconnected')
  }

  return {
    connect,
    disconnect,
    send: (envelope: CommandEnvelope) => {
      if (socket?.readyState === SOCKET_OPEN) {
        socket.send(JSON.stringify(envelope))
      }
    },
    getStatus: () => status,
    subscribeStatus: statusChanges.subscribe,
    subscribeMessages: messages.subscribe,
  }
}
