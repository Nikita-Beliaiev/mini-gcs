import { useConnectionStatus, useGroundStation } from '../station/stationContext'
import { formatLatency } from '../telemetry/format'
import type { ConnectionStatus } from '../transport/transport'
import buttonStyles from '../ui/button.module.css'
import styles from './ConnectionControl.module.css'
import { useLatencyStore } from './latencyStore'

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
  reconnecting: 'Reconnecting…',
}

export function ConnectionControl() {
  const station = useGroundStation()
  const status = useConnectionStatus()
  const latencyMs = useLatencyStore((state) => state.latencyMs)
  const isOffline = status === 'disconnected'

  return (
    <div className={styles.connection}>
      <p className={styles.status} role="status">
        <span className={styles.dot} data-status={status} aria-hidden="true" />
        {STATUS_LABELS[status]}
        {status === 'connected' && latencyMs !== null ? ` · ${formatLatency(latencyMs)}` : null}
      </p>
      <button
        type="button"
        className={buttonStyles.button}
        onClick={isOffline ? station.connect : station.disconnect}
      >
        {isOffline ? 'Connect' : 'Disconnect'}
      </button>
    </div>
  )
}
