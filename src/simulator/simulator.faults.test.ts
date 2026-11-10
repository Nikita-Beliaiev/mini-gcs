import { describe, expect, it } from 'vitest'
import {
  createDemoSimulator,
  isModeHeartbeat,
  lastOfType,
  run,
  runUntil,
  sendCommand,
} from '../test/simulation'

describe('simulator faults', () => {
  it('drops every message for 10 s after a link loss', () => {
    const simulator = createDemoSimulator()
    const before = run(simulator, 2)

    const ack = sendCommand(simulator, { type: 'simulateFault', fault: 'linkLoss' })
    const during = run(simulator, 9.9)
    const after = run(simulator, 1)

    expect(ack).toMatchObject({ command: 'simulateFault', accepted: true })
    expect(during).toEqual([])
    expect(after.length).toBeGreaterThan(0)
    expect(after[0]?.seq).toBeGreaterThan((before.at(-1)?.seq ?? 0) + 1)
  })

  it('answers pings unless the link is lost', () => {
    const simulator = createDemoSimulator()

    expect(sendCommand(simulator, { type: 'ping' })).toMatchObject({
      command: 'ping',
      accepted: true,
    })

    sendCommand(simulator, { type: 'simulateFault', fault: 'linkLoss' })
    run(simulator, 1)
    expect(simulator.handleCommand({ commandId: 1, command: { type: 'ping' } })).toEqual([])
  })

  it('ignores vehicle commands during a link loss but keeps simulator controls', () => {
    const simulator = createDemoSimulator()
    sendCommand(simulator, { type: 'simulateFault', fault: 'linkLoss' })
    run(simulator, 1)

    const vehicleReplies = simulator.handleCommand({
      commandId: 1,
      command: { type: 'clearGeofence' },
    })
    const simulatorReplies = simulator.handleCommand({
      commandId: 2,
      command: { type: 'simulateFault', fault: 'gpsLoss' },
    })

    expect(vehicleReplies).toEqual([])
    expect(simulatorReplies).toHaveLength(1)
  })

  it('loses the GPS fix for 15 s and then reacquires it', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)

    sendCommand(simulator, { type: 'simulateFault', fault: 'gpsLoss' })
    const lost = run(simulator, 14)
    const recovered = run(simulator, 6)

    expect(lastOfType(lost, 'systemStatus')).toMatchObject({ gpsFix: 'none', gpsSatellites: 2 })
    expect(lastOfType(recovered, 'systemStatus').gpsFix).toBe('3d')
  })

  it('returns home after a sudden battery drop', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)

    sendCommand(simulator, { type: 'simulateFault', fault: 'batteryDrop' })
    const messages = runUntil(simulator, isModeHeartbeat('RTL'), 30)

    expect(lastOfType(messages, 'systemStatus').batteryPercent).toBeLessThanOrEqual(30.5)
  })
})
