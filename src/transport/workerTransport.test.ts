import { describe, expect, it, vi } from 'vitest'
import type { TelemetryMessage } from '../protocol/telemetry'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createWorkerTransport, type WorkerLike } from './workerTransport'

class FakeWorker implements WorkerLike {
  onmessage: WorkerLike['onmessage'] = null
  onerror: WorkerLike['onerror'] = null
  terminated = false

  terminate(): void {
    this.terminated = true
  }

  receive(message: TelemetryMessage): void {
    this.onmessage?.(new MessageEvent('message', { data: message }))
  }

  crash(): void {
    this.onerror?.(new ErrorEvent('error'))
  }
}

function setup() {
  const workers: FakeWorker[] = []
  const transport = createWorkerTransport(() => {
    const worker = new FakeWorker()
    workers.push(worker)
    return worker
  })
  return { transport, workers }
}

function onlyWorker(workers: FakeWorker[]): FakeWorker {
  const [worker] = workers
  if (!worker || workers.length !== 1) {
    throw new Error(`Expected exactly one worker, got ${String(workers.length)}`)
  }
  return worker
}

describe('createWorkerTransport', () => {
  it('starts disconnected without creating a worker', () => {
    const { transport, workers } = setup()

    expect(transport.getStatus()).toBe('disconnected')
    expect(workers).toHaveLength(0)
  })

  it('is connecting after connect and connected after the first heartbeat', () => {
    const { transport, workers } = setup()

    transport.connect()
    expect(transport.getStatus()).toBe('connecting')

    onlyWorker(workers).receive(positionMessage())
    expect(transport.getStatus()).toBe('connecting')

    onlyWorker(workers).receive(heartbeatMessage())
    expect(transport.getStatus()).toBe('connected')
  })

  it('forwards every message to subscribers', () => {
    const { transport, workers } = setup()
    const listener = vi.fn()
    transport.subscribeMessages(listener)
    transport.connect()

    const messages = [heartbeatMessage(), positionMessage()]
    for (const message of messages) {
      onlyWorker(workers).receive(message)
    }

    expect(listener.mock.calls).toEqual([[messages[0]], [messages[1]]])
  })

  it('notifies status subscribers only when the status changes', () => {
    const { transport, workers } = setup()
    const listener = vi.fn()
    transport.subscribeStatus(listener)

    transport.connect()
    onlyWorker(workers).receive(heartbeatMessage())
    onlyWorker(workers).receive(heartbeatMessage({ seq: 2 }))
    transport.disconnect()

    expect(listener).toHaveBeenCalledTimes(3)
  })

  it('keeps a single worker when connect is called twice', () => {
    const { transport, workers } = setup()

    transport.connect()
    transport.connect()

    expect(workers).toHaveLength(1)
  })

  it('terminates the worker on disconnect and ignores its late messages', () => {
    const { transport, workers } = setup()
    const listener = vi.fn()
    transport.subscribeMessages(listener)
    transport.connect()
    const worker = onlyWorker(workers)

    transport.disconnect()
    worker.receive(heartbeatMessage())

    expect(worker.terminated).toBe(true)
    expect(transport.getStatus()).toBe('disconnected')
    expect(listener).not.toHaveBeenCalled()
  })

  it('disconnects when the worker fails', () => {
    const { transport, workers } = setup()
    transport.connect()
    const worker = onlyWorker(workers)

    worker.crash()

    expect(worker.terminated).toBe(true)
    expect(transport.getStatus()).toBe('disconnected')
  })

  it('starts a fresh worker when reconnecting', () => {
    const { transport, workers } = setup()

    transport.connect()
    transport.disconnect()
    transport.connect()

    expect(workers).toHaveLength(2)
    expect(transport.getStatus()).toBe('connecting')
  })
})
