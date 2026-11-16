import { useId, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { describeCameraCommand } from '../camera/cameraCommandText'
import { groundHeightAboveHome } from '../camera/cameraGeometry'
import type { LatLon } from '../geo/geo'
import { formatMgrs } from '../geo/mgrs'
import { useMessages } from '../i18n/localeStore'
import { MAX_MARKS, type Mark } from '../marks/mark'
import { MarkForm } from '../marks/MarkForm'
import { useMarksStore } from '../marks/marksStore'
import { useConnectionStatus, useGroundStation, useTelemetry } from '../station/stationContext'
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

interface PointCardProps {
  canPointCamera: boolean
}

export function PointCard({ canPointCamera }: PointCardProps) {
  const selected = useMapPointsStore((state) => state.selected)

  return selected ? (
    <SelectedPointCard
      key={`${String(selected.lat)},${String(selected.lon)}`}
      point={selected}
      canPointCamera={canPointCamera}
    />
  ) : null
}

interface SelectedPointCardProps extends PointCardProps {
  point: LatLon
}

function SelectedPointCard({ point, canPointCamera }: SelectedPointCardProps) {
  const messages = useMessages()
  const text = messages.map.point
  const titleId = useId()
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const clearSelection = useMapPointsStore((state) => state.clearSelection)
  const terrain = useTerrain()
  const hasCamera = useTelemetry((state) => state.camera !== null)
  const fromHome = useTelemetry((state) =>
    state.home ? formatRangeAndBearing(state.home, point, messages.units) : NO_VALUE,
  )
  const fromVehicle = useTelemetry((state) =>
    state.position ? formatRangeAndBearing(state.position, point, messages.units) : NO_VALUE,
  )
  const markCount = useMarksStore((state) => state.marks.length)
  const [status, setStatus] = useState('')
  const [addingMark, setAddingMark] = useState(false)
  const addMarkButton = useRef<HTMLButtonElement>(null)
  const coordinates = formatCoordinates(point)
  const mgrs = formatMgrs(point)

  async function copy(value: string, success: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value)
      setStatus(success)
    } catch {
      setStatus(text.copyFailed)
    }
  }

  async function pointCamera(): Promise<void> {
    const { home } = station.telemetry.getSnapshot()
    const altitudeM = home ? groundHeightAboveHome(terrain, home)(point) : 0
    const result = await station.sendCommand({ type: 'lookAtPoint', ...point, altitudeM })
    setStatus(describeCameraCommand(result, text.cameraPointed, messages))
  }

  function openMarkForm(): void {
    if (markCount >= MAX_MARKS) {
      setStatus(messages.marks.full(MAX_MARKS))
      return
    }
    setStatus('')
    setAddingMark(true)
  }

  function closeMarkForm(added: Mark | null): void {
    flushSync(() => {
      setAddingMark(false)
      setStatus(added ? messages.marks.added(added.name) : '')
    })
    addMarkButton.current?.focus()
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
      {addingMark ? (
        <MarkForm point={point} onClose={closeMarkForm} />
      ) : (
        <dl className={styles.details}>
          <div className={styles.row}>
            <dt>{text.coordinates}</dt>
            <dd className={styles.value}>
              <span>{coordinates}</span>
              <button
                type="button"
                className={buttonStyles.button}
                aria-label={text.copyCoordinates}
                onClick={() => void copy(coordinates, text.copiedCoordinates)}
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
                  onClick={() => void copy(mgrs, text.copiedMgrs)}
                >
                  {text.copy}
                </button>
              ) : null}
            </dd>
          </div>
          <div className={styles.row}>
            <dt>{text.elevation}</dt>
            <dd className={styles.value}>
              {formatElevation(terrain.elevationAt(point), messages.units)}
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
      )}
      {addingMark ? null : (
        <div className={styles.actions}>
          <button
            ref={addMarkButton}
            type="button"
            className={buttonStyles.button}
            onClick={openMarkForm}
          >
            {messages.marks.add}
          </button>
          {canPointCamera && hasCamera ? (
            <button
              type="button"
              className={buttonStyles.button}
              disabled={!isConnected}
              onClick={() => void pointCamera()}
            >
              {text.pointCamera}
            </button>
          ) : null}
        </div>
      )}
      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </section>
  )
}
