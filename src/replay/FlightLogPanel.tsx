import { useId } from 'react'
import type { Messages } from '../i18n/en'
import { useLocale, useMessages } from '../i18n/localeStore'
import { useReplaySession } from '../session/sessionContext'
import { formatDuration, formatUtcTime } from '../telemetry/format'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { flightLogDurationMs, type FlightLogSource } from './flightLog'
import styles from './FlightLogPanel.module.css'

function describeSource(source: FlightLogSource, text: Messages['flightLog']): string {
  switch (source.kind) {
    case 'recording':
      return text.recordingSource
    case 'sample':
      return text.sampleName
    case 'file':
      return source.name
  }
}

export function FlightLogPanel() {
  const titleId = useId()
  const locale = useLocale()
  const text = useMessages().flightLog
  const { log, source } = useReplaySession()
  const details = [
    { term: text.source, value: describeSource(source, text) },
    { term: text.saved, value: formatUtcTime(log.savedAt) },
    { term: text.length, value: formatDuration(flightLogDurationMs(log.messages)) },
    { term: text.messages, value: log.messages.length.toLocaleString(locale) },
  ]

  return (
    <section className={classNames(panelStyles.panel, styles.flightLog)} aria-labelledby={titleId}>
      <h2 id={titleId} className={panelStyles.title}>
        {text.title}
      </h2>
      <dl className={styles.details}>
        {details.map(({ term, value }) => (
          <div key={term} className={styles.detail}>
            <dt className={styles.term}>{term}</dt>
            <dd className={styles.value}>{value}</dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>{text.commandsUnavailable}</p>
    </section>
  )
}
