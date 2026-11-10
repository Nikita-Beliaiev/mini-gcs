import { useConnectionStatus, useGroundStation } from '../station/stationContext'
import type { ConnectionStatus } from '../transport/transport'
import buttonStyles from '../ui/button.module.css'
import styles from './ConnectionControl.module.css'

const STATUS_LABELS: Record<ConnectionStatus, string> = {
  disconnected: 'Disconnected',
  connecting: 'Connecting…',
  connected: 'Connected',
}

export function ConnectionControl() {
  const station = useGroundStation()
  const status = useConnectionStatus()
  const isOffline = status === 'disconnected'

  return (
    <div className={styles.connection}>
      <p className={styles.status} role="status">
        <span className={styles.dot} data-status={status} aria-hidden="true" />
        {STATUS_LABELS[status]}
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
