import { createContext, useContext, useSyncExternalStore } from 'react'
import type { TelemetryState } from '../telemetry/telemetryStore'
import type { ConnectionStatus } from '../transport/transport'
import type { GroundStation } from './groundStation'

export const GroundStationContext = createContext<GroundStation | null>(null)

export function useGroundStation(): GroundStation {
  const station = useContext(GroundStationContext)
  if (!station) {
    throw new Error('useGroundStation must be used inside GroundStationContext')
  }
  return station
}

export function useTelemetry<T>(selector: (state: TelemetryState) => T): T {
  const { telemetry } = useGroundStation()
  return useSyncExternalStore(telemetry.subscribe, () => selector(telemetry.getSnapshot()))
}

export function useConnectionStatus(): ConnectionStatus {
  const { transport } = useGroundStation()
  return useSyncExternalStore(transport.subscribeStatus, transport.getStatus)
}
