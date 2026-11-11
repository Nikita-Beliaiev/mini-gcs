import { useMessages } from '../i18n/localeStore'
import styles from './AlertSummary.module.css'
import { useAlertStore } from './alertStore'

export function AlertSummary() {
  const text = useMessages()
  const count = useAlertStore((state) => state.alerts.length)
  const hasCritical = useAlertStore((state) =>
    state.alerts.some((alert) => alert.severity === 'critical'),
  )

  if (count === 0) {
    return <p className={styles.summary}>{text.alerts.none}</p>
  }
  return (
    <p className={styles.summary} data-severity={hasCritical ? 'critical' : 'warning'}>
      {text.alerts.active(count)}
    </p>
  )
}
