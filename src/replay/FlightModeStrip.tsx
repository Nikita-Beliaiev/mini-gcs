import { useMemo } from 'react'
import { useReplaySession } from '../session/sessionContext'
import { classNames } from '../ui/classNames'
import { flightLogDurationMs } from './flightLog'
import { flightSegments, type SegmentKind } from './flightSegments'
import styles from './FlightModeStrip.module.css'

const KIND_ORDER: Record<SegmentKind, number> = {
  STANDBY: 0,
  TAKEOFF: 1,
  AUTO: 2,
  RTL: 3,
  LAND: 4,
  noLink: 5,
}

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
  const shownKinds = [...new Set(segments.map((segment) => segment.kind))].sort(
    (first, second) => KIND_ORDER[first] - KIND_ORDER[second],
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
            {kindLabel(kind)}
          </li>
        ))}
      </ul>
    </div>
  )
}
