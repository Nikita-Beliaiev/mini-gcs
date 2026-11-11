import { useMessages } from '../i18n/localeStore'
import buttonStyles from '../ui/button.module.css'
import styles from './AlertList.module.css'
import { useAlertStore } from './alertStore'
import { describeAlert } from './alertText'

export function AlertList() {
  const text = useMessages()
  const alerts = useAlertStore((state) => state.alerts)
  const acknowledge = useAlertStore((state) => state.acknowledge)

  return (
    <section className={styles.alerts} aria-label={text.alerts.region} aria-live="polite">
      {alerts.length > 0 ? (
        <ul className={styles.list}>
          {alerts.map((alert) => {
            const message = describeAlert(alert.id, text)
            return (
              <li
                key={alert.id}
                className={styles.alert}
                data-severity={alert.severity}
                data-acknowledged={alert.acknowledged}
              >
                <span className={styles.severity}>{text.alerts.severity[alert.severity]}</span>
                <span
                  className={styles.message}
                  role={alert.severity === 'critical' && !alert.acknowledged ? 'alert' : undefined}
                >
                  {message}
                </span>
                {alert.acknowledged ? null : (
                  <button
                    type="button"
                    className={buttonStyles.button}
                    aria-label={text.alerts.acknowledgeAlert(message)}
                    onClick={() => {
                      acknowledge(alert.id)
                    }}
                  >
                    {text.alerts.acknowledge}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}
