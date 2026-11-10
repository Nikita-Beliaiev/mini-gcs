import type { CommandEnvelope } from '../protocol/commands'
import { parseJson } from '../protocol/shared'
import { parseTelemetryMessage, type TelemetryMessage } from '../protocol/telemetry'
import { createEmitter } from '../shared/emitter'
import { reconnectDelayMs } from './backoff'
import type { ConnectionStatus, Transport } from './transport'

export interface SocketLike {
  readonly readyState: number
  onmessage: ((event: MessageEvent<unknown>) => void) | null
  onclose: ((event: CloseEvent) => void) | null
  send: (data: string) => void
  close: () => void
}

export interface WebSocketTransportOptions {
  openSocket?: (url: string) => SocketLike
  random?: () => number
}

const SOCKET_OPEN = 1

function openBrowserSocket(url: string): SocketLike {
  return new WebSocket(url)
}

export function createWebSocketTransport(
  url: string,
  { openSocket = openBrowserSocket, random = Math.random }: WebSocketTransportOptions = {},
): Transport {
  const statusChanges = createEmitter()
  const messages = createEmitter<TelemetryMessage>()
  let socket: SocketLike | null = null
  let status: ConnectionStatus = 'disconnected'
  let wantsConnection = false
  let reconnectAttempt = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

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
      reconnectAttempt = 0
      setStatus('connected')
    }
    messages.emit(message)
  }

  function scheduleReconnect(): void {
    reconnectAttempt += 1
    setStatus('reconnecting')
    reconnectTimer = setTimeout(
      () => {
        reconnectTimer = null
        openNewSocket()
      },
      reconnectDelayMs(reconnectAttempt, random),
    )
  }

  function openNewSocket(): void {
    const newSocket = openSocket(url)
    newSocket.onmessage = (event) => {
      if (socket === newSocket) {
        receive(event.data)
      }
    }
    newSocket.onclose = () => {
      if (socket === newSocket) {
        socket = null
        scheduleReconnect()
      }
    }
    socket = newSocket
  }

  function connect(): void {
    if (wantsConnection) {
      return
    }
    wantsConnection = true
    reconnectAttempt = 0
    setStatus('connecting')
    openNewSocket()
  }

  function disconnect(): void {
    wantsConnection = false
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }
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
