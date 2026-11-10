import { createTelemetryStore, type TelemetryStore } from '../telemetry/telemetryStore'
import type { Transport } from '../transport/transport'
import { createCommandSender, type SendCommand } from './commandSender'

export interface GroundStation {
  transport: Transport
  telemetry: TelemetryStore
  connect: () => void
  disconnect: () => void
  sendCommand: SendCommand
}

export function createGroundStation(
  transport: Transport,
  telemetry: TelemetryStore = createTelemetryStore(),
  sendCommand: SendCommand = createCommandSender(transport),
): GroundStation {
  transport.subscribeMessages(telemetry.push)

  return {
    transport,
    telemetry,
    sendCommand,
    connect() {
      if (transport.getStatus() !== 'disconnected') {
        return
      }
      telemetry.reset()
      transport.connect()
    },
    disconnect() {
      transport.disconnect()
    },
  }
}
