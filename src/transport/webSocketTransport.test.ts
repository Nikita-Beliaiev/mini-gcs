import { describe, expect, it, vi } from 'vitest'
import { fakeSocketFactory } from '../test/fakeSocket'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createWebSocketTransport } from './webSocketTransport'

const URL = 'ws://127.0.0.1:8787/'

function setup() {
  const factory = fakeSocketFactory()
  const transport = createWebSocketTransport(URL, factory.openSocket)
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

  it('reports a disconnect when the server closes the connection', () => {
    const { transport, latest } = setup()
    transport.connect()
    latest().open()

    latest().dropConnection()

    expect(transport.getStatus()).toBe('disconnected')
  })
})
