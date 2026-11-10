import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { commandAckMessage } from '../test/messages'
import { createTestStation } from '../test/station'
import { startLatencyMonitor } from './latencyMonitor'
import { useLatencyStore } from './latencyStore'

function setup() {
  let clockMs = 0
  const { station, transport } = createTestStation()
  const stop = startLatencyMonitor(station, { intervalMs: 2000, now: () => clockMs })
  return {
    transport,
    stop,
    advanceClock: (ms: number) => {
      clockMs += ms
    },
  }
}

function latency(): number | null {
  return useLatencyStore.getState().latencyMs
}

describe('startLatencyMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('pings as soon as the link is up and records the round trip', async () => {
    const { transport, stop, advanceClock } = setup()

    transport.setStatus('connected')
    const [ping] = transport.sent
    advanceClock(4)
    transport.receive(commandAckMessage({ commandId: ping?.commandId, command: 'ping' }))
    await vi.advanceTimersByTimeAsync(0)

    expect(ping?.command).toEqual({ type: 'ping' })
    expect(latency()).toBe(4)
    stop()
  })

  it('keeps a single ping in flight and forgets the latency when it gets no answer', async () => {
    const { transport, stop } = setup()
    useLatencyStore.getState().setLatency(7)
    transport.setStatus('connected')

    await vi.advanceTimersByTimeAsync(2000)
    expect(transport.sent).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(1000)
    expect(latency()).toBeNull()
    stop()
  })

  it('does not ping and shows no latency while disconnected', async () => {
    const { transport, stop } = setup()
    useLatencyStore.getState().setLatency(7)

    transport.setStatus('disconnected')
    await vi.advanceTimersByTimeAsync(10_000)

    expect(transport.sent).toEqual([])
    expect(latency()).toBeNull()
    stop()
  })
})
