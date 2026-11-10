import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { TelemetryMessage } from '../protocol/telemetry'
import { createDemoVehicle, SIMULATION_TICK_MS, startSimulation } from './simulation'

describe('startSimulation', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('steps the vehicle on every tick and broadcasts what it reports', () => {
    const broadcast = vi.fn<(message: TelemetryMessage) => void>()
    const simulation = startSimulation(broadcast, createDemoVehicle(1))

    vi.advanceTimersByTime(SIMULATION_TICK_MS)
    const firstTick = broadcast.mock.calls.map(([message]) => message.type)
    vi.advanceTimersByTime(1000)

    expect(firstTick).toContain('heartbeat')
    expect(broadcast.mock.calls.filter(([message]) => message.type === 'attitude')).toHaveLength(51)
    simulation.stop()
  })

  it('returns command replies to the caller instead of broadcasting them', () => {
    const broadcast = vi.fn<(message: TelemetryMessage) => void>()
    const simulation = startSimulation(broadcast, createDemoVehicle(1))

    const replies = simulation.handleCommand({ commandId: 9, command: { type: 'ping' } })

    expect(replies).toMatchObject([{ type: 'commandAck', commandId: 9, accepted: true }])
    expect(broadcast).not.toHaveBeenCalled()
    simulation.stop()
  })

  it('stops stepping once stopped', () => {
    const broadcast = vi.fn<(message: TelemetryMessage) => void>()
    const simulation = startSimulation(broadcast, createDemoVehicle(1))

    simulation.stop()
    vi.advanceTimersByTime(5000)

    expect(broadcast).not.toHaveBeenCalled()
  })
})
