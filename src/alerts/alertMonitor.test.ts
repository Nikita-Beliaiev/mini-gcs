import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { heartbeatMessage, systemStatusMessage } from '../test/messages'
import { createTestStation } from '../test/station'
import { startAlertMonitor } from './alertMonitor'
import { useAlertStore } from './alertStore'

function alertIds(): string[] {
  return useAlertStore.getState().alerts.map((alert) => alert.id)
}

function setup() {
  const { station, transport } = createTestStation()
  const stop = startAlertMonitor(station, { now: () => Date.now(), checkIntervalMs: 1000 })
  transport.setStatus('connected')
  transport.receive(heartbeatMessage())
  return { transport, stop }
}

describe('startAlertMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('raises a link alert when heartbeats stop and clears it when they return', () => {
    const { transport, stop } = setup()

    vi.advanceTimersByTime(3000)
    expect(alertIds()).toEqual([])

    vi.advanceTimersByTime(1000)
    expect(alertIds()).toEqual(['linkLost'])

    transport.receive(heartbeatMessage({ seq: 2 }))
    expect(alertIds()).toEqual([])
    stop()
  })

  it('does not report a lost link after an intentional disconnect', () => {
    const { transport, stop } = setup()

    transport.setStatus('disconnected')
    vi.advanceTimersByTime(10_000)

    expect(alertIds()).toEqual([])
    stop()
  })

  it('follows the telemetry as it arrives', () => {
    const { transport, stop } = setup()

    transport.receive(systemStatusMessage({ batteryPercent: 30 }))
    expect(alertIds()).toEqual(['batteryLow'])

    transport.receive(systemStatusMessage({ seq: 2, batteryPercent: 90 }))
    expect(alertIds()).toEqual([])
    stop()
  })

  it('stops checking once stopped', () => {
    const { stop } = setup()

    stop()
    vi.advanceTimersByTime(10_000)

    expect(alertIds()).toEqual([])
  })
})
