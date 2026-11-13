import { useId, useState } from 'react'
import type { LatLon } from '../geo/geo'
import { formatMgrs } from '../geo/mgrs'
import { useMessages } from '../i18n/localeStore'
import { useTelemetry } from '../station/stationContext'
import {
  formatCoordinates,
  formatElevation,
  formatRangeAndBearing,
  NO_VALUE,
} from '../telemetry/format'
import { useTerrain } from '../terrain/terrainContext'
import buttonStyles from '../ui/button.module.css'
import { useMapPointsStore } from './mapPointsStore'
import styles from './PointCard.module.css'

type CopyResult = 'copiedCoordinates' | 'copiedMgrs' | 'copyFailed'

interface CopyStatus {
  point: LatLon
  result: CopyResult
}

export function PointCard() {
  const messages = useMessages()
  const text = messages.map.point
  const titleId = useId()
  const selected = useMapPointsStore((state) => state.selected)
  const clearSelection = useMapPointsStore((state) => state.clearSelection)
  const terrain = useTerrain()
  const fromHome = useTelemetry((state) =>
    state.home && selected ? formatRangeAndBearing(state.home, selected, messages.units) : NO_VALUE,
  )
  const fromVehicle = useTelemetry((state) =>
    state.position && selected
      ? formatRangeAndBearing(state.position, selected, messages.units)
      : NO_VALUE,
  )
  const [copyStatus, setCopyStatus] = useState<CopyStatus | null>(null)

  if (!selected) {
    return null
  }
  const coordinates = formatCoordinates(selected)
  const mgrs = formatMgrs(selected)

  async function copy(value: string, point: LatLon, success: CopyResult): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setCopyStatus({ point, result: success })
    } catch {
      setCopyStatus({ point, result: 'copyFailed' })
    }
  }

  return (
    <section className={styles.card} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h3 id={titleId} className={styles.title}>
          {text.title}
        </h3>
        <button type="button" className={buttonStyles.button} onClick={clearSelection}>
          {text.close}
        </button>
      </div>
      <dl className={styles.details}>
        <div className={styles.row}>
          <dt>{text.coordinates}</dt>
          <dd className={styles.value}>
            <span>{coordinates}</span>
            <button
              type="button"
              className={buttonStyles.button}
              aria-label={text.copyCoordinates}
              onClick={() => void copy(coordinates, selected, 'copiedCoordinates')}
            >
              {text.copy}
            </button>
          </dd>
        </div>
        <div className={styles.row}>
          <dt>{text.mgrs}</dt>
          <dd className={styles.value}>
            <span>{mgrs ?? NO_VALUE}</span>
            {mgrs ? (
              <button
                type="button"
                className={buttonStyles.button}
                aria-label={text.copyMgrs}
                onClick={() => void copy(mgrs, selected, 'copiedMgrs')}
              >
                {text.copy}
              </button>
            ) : null}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>{text.elevation}</dt>
          <dd className={styles.value}>
            {formatElevation(terrain.elevationAt(selected), messages.units)}
          </dd>
        </div>
        <div className={styles.row}>
          <dt>{text.fromHome}</dt>
          <dd className={styles.value}>{fromHome}</dd>
        </div>
        <div className={styles.row}>
          <dt>{text.fromVehicle}</dt>
          <dd className={styles.value}>{fromVehicle}</dd>
        </div>
      </dl>
      <p className={styles.status} aria-live="polite">
        {copyStatus?.point === selected ? text[copyStatus.result] : null}
      </p>
    </section>
  )
}
