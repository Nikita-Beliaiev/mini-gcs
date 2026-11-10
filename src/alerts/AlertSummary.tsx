import styles from './AlertSummary.module.css'
import { useAlertStore } from './alertStore'

export function AlertSummary() {
  const count = useAlertStore((state) => state.alerts.length)
  const hasCritical = useAlertStore((state) =>
    state.alerts.some((alert) => alert.severity === 'critical'),
  )

  if (count === 0) {
    return <p className={styles.summary}>No active alerts</p>
  }
  return (
    <p className={styles.summary} data-severity={hasCritical ? 'critical' : 'warning'}>
      {count} active {count === 1 ? 'alert' : 'alerts'}
    </p>
  )
}
