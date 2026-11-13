import { lazy, Suspense, useId } from 'react'
import { useMessages } from '../i18n/localeStore'
import { useTelemetry } from '../station/stationContext'
import { CameraHud } from './CameraHud'
import styles from './CameraPanel.module.css'

const CameraVideo = lazy(() => import('./CameraVideo'))

export function CameraPanel() {
  const text = useMessages().camera
  const titleId = useId()
  const hasCamera = useTelemetry((state) => state.camera !== null)
  const isTracking = useTelemetry((state) => Boolean(state.camera?.lookAt))

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
          <CameraHud />
        </div>
      ) : (
        <p className={styles.empty}>{text.noCamera}</p>
      )}
      <p className={styles.caption}>{text.syntheticNote}</p>
    </section>
  )
}
