import { useMemo } from 'react'
import { flightModeSchema } from '../protocol/telemetry'
import { useReplaySession } from '../session/sessionContext'
import { classNames } from '../ui/classNames'
import { flightLogDurationMs } from './flightLog'
import { flightSegments, type SegmentKind } from './flightSegments'
import styles from './FlightModeStrip.module.css'

const KIND_ORDER: readonly SegmentKind[] = [...flightModeSchema.options, 'noLink']

function kindLabel(kind: SegmentKind): string {
  return kind === 'noLink' ? 'No link' : kind
}

function percentOf(partMs: number, wholeMs: number): string {
  return `${String(wholeMs > 0 ? (partMs / wholeMs) * 100 : 0)}%`
}

export function FlightModeStrip() {
  const { log } = useReplaySession()
  const durationMs = flightLogDurationMs(log.messages)
  const segments = useMemo(() => flightSegments(log.messages), [log])
  const shownKinds = KIND_ORDER.filter((kind) => segments.some((segment) => segment.kind === kind))

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
            {kindLabel(kind)}
          </li>
        ))}
      </ul>
    </div>
  )
}
