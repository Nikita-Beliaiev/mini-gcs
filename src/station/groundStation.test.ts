import { describe, expect, it } from 'vitest'
import { telemetryStoreWithoutFrames } from '../test/station'
import { createFakeTransport } from '../test/fakeTransport'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createGroundStation } from './groundStation'

function setup() {
  const transport = createFakeTransport()
  const station = createGroundStation(transport, telemetryStoreWithoutFrames())
  return { transport, station }
}

describe('createGroundStation', () => {
  it('feeds transport messages into the telemetry store', () => {
    const { transport, station } = setup()
    const heartbeat = heartbeatMessage()

    transport.receive(heartbeat)

    expect(station.telemetry.getSnapshot().heartbeat).toBe(heartbeat)
  })

  it('clears old telemetry before connecting', () => {
    const { transport, station } = setup()
    transport.receive(positionMessage())

    station.connect()

    expect(transport.getStatus()).toBe('connecting')
    expect(station.telemetry.getSnapshot().position).toBeNull()
    expect(station.telemetry.getPositionHistory()).toEqual([])
  })

  it('keeps telemetry when connect is called on a live link', () => {
    const { transport, station } = setup()
    station.connect()
    transport.setStatus('connected')
    transport.receive(positionMessage())

    station.connect()

    expect(station.telemetry.getSnapshot().position).not.toBeNull()
  })

  it('keeps the last known telemetry after disconnecting', () => {
    const { transport, station } = setup()
    station.connect()
    transport.receive(positionMessage())

    station.disconnect()

    expect(transport.getStatus()).toBe('disconnected')
    expect(station.telemetry.getSnapshot().position).not.toBeNull()
  })
})
