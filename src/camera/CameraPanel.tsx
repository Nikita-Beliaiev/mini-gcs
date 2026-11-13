import { lazy, Suspense, useId, type MouseEvent } from 'react'
import { useMessages } from '../i18n/localeStore'
import { useMapPointsStore } from '../map/mapPointsStore'
import { useGroundStation, useTelemetry } from '../station/stationContext'
import { useTerrain } from '../terrain/terrainContext'
import { groundPointAt } from './cameraGeometry'
import { framePosition } from './cameraMoves'
import { CameraControls } from './CameraControls'
import { CameraHud } from './CameraHud'
import styles from './CameraPanel.module.css'
import { cameraView } from './cameraTarget'

const CameraVideo = lazy(() => import('./CameraVideo'))

interface CameraPanelProps {
  canControl: boolean
}

export function CameraPanel({ canControl }: CameraPanelProps) {
  const text = useMessages().camera
  const titleId = useId()
  const station = useGroundStation()
  const terrain = useTerrain()
  const hasCamera = useTelemetry((state) => state.camera !== null)
  const isTracking = useTelemetry((state) => Boolean(state.camera?.lookAt))

  function pickPoint(event: MouseEvent<HTMLButtonElement>): void {
    const bounds = event.currentTarget.getBoundingClientRect()
    const isKeyboard = event.detail === 0
    const { screenX, screenY } = isKeyboard
      ? { screenX: 0, screenY: 0 }
      : framePosition(
          event.clientX - bounds.left,
          event.clientY - bounds.top,
          bounds.width,
          bounds.height,
        )
    const view = cameraView(station.telemetry.getSnapshot(), terrain)
    const hit = view ? groundPointAt(view.pose, screenX, screenY, view.groundHeight) : null
    if (hit) {
      useMapPointsStore.getState().select(hit.point)
    }
  }

  return (
    <section className={styles.panel} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h3 id={titleId} className={styles.title}>
          {text.title}
        </h3>
        {isTracking ? <span className={styles.tracking}>{text.tracking}</span> : null}
      </div>
      {hasCamera ? (
        <div className={styles.screen}>
          <Suspense fallback={null}>
            <CameraVideo label={text.view} />
          </Suspense>
          <button
            type="button"
            className={styles.pick}
            aria-label={text.pick}
            title={text.pick}
            onClick={pickPoint}
          />
          <CameraHud />
        </div>
      ) : (
        <p className={styles.empty}>{text.noCamera}</p>
      )}
      {hasCamera && canControl ? <CameraControls /> : null}
      <p className={styles.caption}>{text.syntheticNote}</p>
    </section>
  )
}
