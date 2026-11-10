import { createTelemetryStore, type TelemetryStore } from '../telemetry/telemetryStore'
import type { Transport } from '../transport/transport'

export interface GroundStation {
  transport: Transport
  telemetry: TelemetryStore
  connect: () => void
  disconnect: () => void
}

export function createGroundStation(
  transport: Transport,
  telemetry: TelemetryStore = createTelemetryStore(),
): GroundStation {
  transport.subscribeMessages(telemetry.push)

  return {
    transport,
    telemetry,
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
