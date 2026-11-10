import buttonStyles from '../ui/button.module.css'
import styles from './AlertList.module.css'
import { useAlertStore } from './alertStore'

const SEVERITY_LABELS = { critical: 'Critical', warning: 'Warning' } as const

export function AlertList() {
  const alerts = useAlertStore((state) => state.alerts)
  const acknowledge = useAlertStore((state) => state.acknowledge)

  return (
    <section className={styles.alerts} aria-label="Alerts" aria-live="polite">
      {alerts.length > 0 ? (
        <ul className={styles.list}>
          {alerts.map((alert) => (
            <li
              key={alert.id}
              className={styles.alert}
              data-severity={alert.severity}
              data-acknowledged={alert.acknowledged}
            >
              <span className={styles.severity}>{SEVERITY_LABELS[alert.severity]}</span>
              <span
                className={styles.message}
                role={alert.severity === 'critical' && !alert.acknowledged ? 'alert' : undefined}
              >
                {alert.message}
              </span>
              {alert.acknowledged ? null : (
                <button
                  type="button"
                  className={buttonStyles.button}
                  aria-label={`Acknowledge: ${alert.message}`}
                  onClick={() => {
                    acknowledge(alert.id)
                  }}
                >
                  Acknowledge
                </button>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
