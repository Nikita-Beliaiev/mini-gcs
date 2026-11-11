import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeTransport } from '../test/fakeTransport'
import { commandAckMessage } from '../test/messages'
import { createCommandSender } from './commandSender'

function setup() {
  const transport = createFakeTransport()
  const sendCommand = createCommandSender(transport, 3000)
  return { transport, sendCommand }
}

describe('createCommandSender', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('wraps each command in an envelope with a new id', () => {
    const { transport, sendCommand } = setup()

    void sendCommand({ type: 'clearGeofence' })
    void sendCommand({ type: 'simulateFault', fault: 'gpsLoss' })

    expect(transport.sent).toEqual([
      { commandId: 1, command: { type: 'clearGeofence' } },
      { commandId: 2, command: { type: 'simulateFault', fault: 'gpsLoss' } },
    ])
  })

  it('resolves with the matching acknowledgement', async () => {
    const { transport, sendCommand } = setup()
    const first = sendCommand({ type: 'clearGeofence' })
    const second = sendCommand({ type: 'clearGeofence' })

    transport.receive(commandAckMessage({ commandId: 2, accepted: false, reason: 'Busy' }))
    transport.receive(commandAckMessage({ commandId: 1, accepted: true }))

    await expect(first).resolves.toEqual({ status: 'accepted' })
    await expect(second).resolves.toEqual({ status: 'rejected', reason: 'Busy' })
  })

  it('keeps a rejection without a reason for the station to describe', async () => {
    const { transport, sendCommand } = setup()
    const result = sendCommand({ type: 'clearGeofence' })

    transport.receive(commandAckMessage({ commandId: 1, accepted: false, reason: null }))

    await expect(result).resolves.toEqual({ status: 'rejected', reason: null })
  })

  it('reports no response when the vehicle stays silent', async () => {
    const { sendCommand } = setup()
    const result = sendCommand({ type: 'clearGeofence' })

    await vi.advanceTimersByTimeAsync(3000)

    await expect(result).resolves.toEqual({ status: 'noResponse' })
  })

  it('ignores an acknowledgement that arrives after the timeout', async () => {
    const { transport, sendCommand } = setup()
    const result = sendCommand({ type: 'clearGeofence' })
    await vi.advanceTimersByTimeAsync(3000)

    transport.receive(commandAckMessage({ commandId: 1, accepted: true }))

    await expect(result).resolves.toEqual({ status: 'noResponse' })
  })
})
