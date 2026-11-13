import { lazy, Suspense, useId, useState } from 'react'
import { AlertList } from '../alerts/AlertList'
import { CameraPanel } from '../camera/CameraPanel'
import { useMessages } from '../i18n/localeStore'
import { DrawingBanner } from '../planning/DrawingBanner'
import { usePlanningStore } from '../planning/planningStore'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import { CursorReadout } from './CursorReadout'
import styles from './MapPanel.module.css'
import { PointCard } from './PointCard'

const MapView = lazy(() => import('./MapView'))

interface MapPanelProps {
  showPlanning: boolean
}

export function MapPanel({ showPlanning }: MapPanelProps) {
  const messages = useMessages()
  const text = messages.map
  const titleId = useId()
  const [followVehicle, setFollowVehicle] = useState(false)
  const [terrain3d, setTerrain3d] = useState(false)
  const [showCamera, setShowCamera] = useState(true)
  const isDrawing = usePlanningStore((state) => showPlanning && state.editMode !== null)

  return (
    <section className={classNames(panelStyles.panel, styles.panel)} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={panelStyles.title}>
          {text.title}
        </h2>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={buttonStyles.button}
            aria-pressed={showCamera}
            onClick={() => {
              setShowCamera((shown) => !shown)
            }}
          >
            {messages.camera.title}
          </button>
          <button
            type="button"
            className={buttonStyles.button}
            aria-pressed={terrain3d}
            onClick={() => {
              setTerrain3d((shown) => !shown)
            }}
          >
            {text.terrain3d}
          </button>
          <button
            type="button"
            className={buttonStyles.button}
            aria-pressed={followVehicle}
            onClick={() => {
              setFollowVehicle((following) => !following)
            }}
          >
            {text.followVehicle}
          </button>
        </div>
      </div>
      <div className={styles.mapArea} data-drawing={isDrawing}>
        <Suspense fallback={<p className={styles.placeholder}>{text.loading}</p>}>
          <MapView
            followVehicle={followVehicle}
            showPlanning={showPlanning}
            terrain3d={terrain3d}
            onUserPan={() => {
              setFollowVehicle(false)
            }}
          />
        </Suspense>
        <CursorReadout />
        <PointCard />
        {showCamera ? <CameraPanel /> : null}
        <AlertList />
        {showPlanning ? <DrawingBanner /> : null}
      </div>
    </section>
  )
}
