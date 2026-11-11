import { useMessages } from '../i18n/localeStore'
import { useConnectionStatus, useGroundStation } from '../station/stationContext'
import { formatLatency } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import styles from './ConnectionControl.module.css'
import { useLatencyStore } from './latencyStore'

export function ConnectionControl() {
  const messages = useMessages()
  const text = messages.connection
  const station = useGroundStation()
  const status = useConnectionStatus()
  const latencyMs = useLatencyStore((state) => state.latencyMs)
  const isOffline = status === 'disconnected'

  return (
    <div className={styles.connection}>
      <p className={styles.status} role="status">
        <span className={styles.dot} data-status={status} aria-hidden="true" />
        {text.status[status]}
        {status === 'connected' && latencyMs !== null
          ? ` · ${formatLatency(latencyMs, messages.units.milliseconds)}`
          : null}
      </p>
      <button
        type="button"
        className={buttonStyles.button}
        onClick={isOffline ? station.connect : station.disconnect}
      >
        {isOffline ? text.connect : text.disconnect}
      </button>
    </div>
  )
}
