import { useMemo } from 'react'
import { useMessages } from '../i18n/localeStore'
import { FLIGHT_MODES } from '../protocol/flightModes'
import { useReplaySession } from '../session/sessionContext'
import { classNames } from '../ui/classNames'
import { flightLogDurationMs } from './flightLog'
import { flightSegments, type SegmentKind } from './flightSegments'
import styles from './FlightModeStrip.module.css'

function kindOrder(kind: SegmentKind): number {
  return kind === 'noLink' ? FLIGHT_MODES.length : FLIGHT_MODES.indexOf(kind)
}

function percentOf(partMs: number, wholeMs: number): string {
  return `${String(wholeMs > 0 ? (partMs / wholeMs) * 100 : 0)}%`
}

export function FlightModeStrip() {
  const text = useMessages().replay
  const { log } = useReplaySession()
  const durationMs = flightLogDurationMs(log.messages)
  const segments = useMemo(() => flightSegments(log.messages), [log])
  const shownKinds = [...new Set(segments.map((segment) => segment.kind))].sort(
    (first, second) => kindOrder(first) - kindOrder(second),
  )

  return (
    <div className={styles.modes} aria-hidden="true">
      <div className={styles.strip}>
        {segments.map((segment) => (
          <span
            key={segment.startMs}
            className={classNames(styles.segment, styles.kind)}
            data-kind={segment.kind}
            style={{
              left: percentOf(segment.startMs, durationMs),
              width: percentOf(segment.endMs - segment.startMs, durationMs),
            }}
          />
        ))}
      </div>
      <ul className={styles.legend}>
        {shownKinds.map((kind) => (
          <li key={kind} className={styles.legendItem}>
            <span className={classNames(styles.swatch, styles.kind)} data-kind={kind} />
            {kind === 'noLink' ? text.noLink : kind}
          </li>
        ))}
      </ul>
    </div>
  )
}
