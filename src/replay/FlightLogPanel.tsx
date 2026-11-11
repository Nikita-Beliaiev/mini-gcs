import { useId } from 'react'
import { useReplaySession } from '../session/sessionContext'
import { formatDuration, formatUtcTime } from '../telemetry/format'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { flightLogDurationMs } from './flightLog'
import styles from './FlightLogPanel.module.css'

export function FlightLogPanel() {
  const titleId = useId()
  const { log, source } = useReplaySession()
  const details = [
    { term: 'Source', value: source },
    { term: 'Saved', value: formatUtcTime(log.savedAt) },
    { term: 'Length', value: formatDuration(flightLogDurationMs(log.messages)) },
    { term: 'Messages', value: log.messages.length.toLocaleString('en-US') },
  ]

  return (
    <section className={classNames(panelStyles.panel, styles.flightLog)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        Flight log
      </h2>
      <dl className={styles.details}>
        {details.map(({ term, value }) => (
          <div key={term} className={styles.detail}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>Commands are not available while replaying a flight.</p>
    </section>
  )
}
