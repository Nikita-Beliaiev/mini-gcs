import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fakeSocketFactory } from '../test/fakeSocket'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createWebSocketTransport } from './webSocketTransport'

const URL = 'ws://127.0.0.1:8787/'

function setup() {
  const factory = fakeSocketFactory()
  const transport = createWebSocketTransport(URL, {
    openSocket: factory.openSocket,
    random: () => 0.5,
  })
  const listener = vi.fn()
  transport.subscribeMessages(listener)
  return { ...factory, transport, listener }
}

describe('createWebSocketTransport', () => {
  it('opens a socket to the server on connect and is connected after the first heartbeat', () => {
    const { transport, latest } = setup()

    transport.connect()
    expect(latest().url).toBe(URL)
    expect(transport.getStatus()).toBe('connecting')

    latest().open()
    latest().receiveJson(heartbeatMessage())
    expect(transport.getStatus()).toBe('connected')
  })

  it('forwards valid messages to subscribers', () => {
    const { transport, latest, listener } = setup()
    transport.connect()

    latest().receiveJson(positionMessage({ altitudeM: 12 }))

    expect(listener).toHaveBeenCalledWith(positionMessage({ altitudeM: 12 }))
  })

  it('drops data that does not follow the protocol', () => {
    const { transport, latest, listener } = setup()
    transport.connect()

    latest().receive('not json')
    latest().receive(new ArrayBuffer(8))
    latest().receiveJson({ type: 'heartbeat', mode: 'AUTO' })
    latest().receiveJson({ ...positionMessage(), altitudeM: 'high' })

    expect(listener).not.toHaveBeenCalled()
    expect(transport.getStatus()).toBe('connecting')
  })

  it('sends commands as JSON once the socket is open', () => {
    const { transport, latest } = setup()
    transport.connect()
    const envelope = { commandId: 3, command: { type: 'ping' as const } }

    transport.send(envelope)
    latest().open()
    transport.send(envelope)

    expect(latest().sent).toEqual([JSON.stringify(envelope)])
  })

  it('closes the socket on disconnect and ignores anything it still delivers', () => {
    const { transport, latest, listener } = setup()
    transport.connect()
    const socket = latest()

    transport.disconnect()
    socket.receiveJson(heartbeatMessage())

    expect(socket.closed).toBe(true)
    expect(transport.getStatus()).toBe('disconnected')
    expect(listener).not.toHaveBeenCalled()
  })
})

describe('createWebSocketTransport reconnect', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  function connectAndDrop() {
    const context = setup()
    context.transport.connect()
    context.latest().open()
    context.latest().receiveJson(heartbeatMessage())
    context.latest().dropConnection()
    return context
  }

  it('reconnects after a growing pause when the server drops', () => {
    const { transport, sockets, latest } = connectAndDrop()
    expect(transport.getStatus()).toBe('reconnecting')

    vi.advanceTimersByTime(999)
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(2)

    latest().dropConnection()
    vi.advanceTimersByTime(1999)
    expect(sockets).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(sockets).toHaveLength(3)
  })

  it('is connected again after the first heartbeat and starts over with short pauses', () => {
    const { transport, sockets, latest } = connectAndDrop()
    vi.advanceTimersByTime(1000)

    latest().open()
    latest().receiveJson(heartbeatMessage({ seq: 2 }))
    expect(transport.getStatus()).toBe('connected')

    latest().dropConnection()
    vi.advanceTimersByTime(1000)
    expect(sockets).toHaveLength(3)
  })

  it('keeps retrying at most every 10 s while the server is down', () => {
    const { sockets, latest } = connectAndDrop()

    for (const pauseMs of [1000, 2000, 4000, 8000, 10_000, 10_000]) {
      vi.advanceTimersByTime(pauseMs)
      latest().dropConnection()
    }

    expect(sockets).toHaveLength(7)
  })

  it('stops reconnecting after a manual disconnect', () => {
    const { transport, sockets } = connectAndDrop()

    transport.disconnect()
    vi.advanceTimersByTime(30_000)

    expect(transport.getStatus()).toBe('disconnected')
    expect(sockets).toHaveLength(1)
  })
})
