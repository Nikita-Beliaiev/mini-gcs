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
import { InsetActions } from './InsetActions'
import { InsetResizeHandle } from './InsetResizeHandle'
import { INSET_SIZES, otherView, type MapPanelView } from './insetWindow'
import styles from './MapPanel.module.css'
import { PointCard } from './PointCard'

const MapView = lazy(() => import('./MapView'))

interface MapPanelProps {
  showPlanning: boolean
}

function insetWidthStyle(width: number): string {
  return `min(${String(width)}px, calc(100% - 120px))`
}

export function MapPanel({ showPlanning }: MapPanelProps) {
  const messages = useMessages()
  const text = messages.map
  const titleId = useId()
  const [followVehicle, setFollowVehicle] = useState(false)
  const [terrain3d, setTerrain3d] = useState(false)
  const [showCamera, setShowCamera] = useState(true)
  const [chosenMainView, setChosenMainView] = useState<MapPanelView>('map')
  const [insetWidths, setInsetWidths] = useState<Record<MapPanelView, number>>({
    camera: INSET_SIZES.camera.small,
    map: INSET_SIZES.map.small,
  })
  const isDrawing = usePlanningStore((state) => showPlanning && state.editMode !== null)
  const mainView = showCamera && !isDrawing ? chosenMainView : 'map'
  const isMapMain = mainView === 'map'

  function swapViews(): void {
    setChosenMainView(otherView(mainView))
  }

  function insetControls(view: MapPanelView) {
    const width = insetWidths[view]
    const resize = (next: number): void => {
      setInsetWidths((widths) => ({ ...widths, [view]: next }))
    }
    return {
      actions: <InsetActions view={view} width={width} onResize={resize} onSwap={swapViews} />,
      handle: <InsetResizeHandle view={view} width={width} onResize={resize} />,
    }
  }

  const mapInset = isMapMain ? null : insetControls('map')
  const cameraInset = isMapMain ? insetControls('camera') : null

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
        <div
          className={isMapMain ? styles.mainView : styles.mapInset}
          style={isMapMain ? undefined : { width: insetWidthStyle(insetWidths.map) }}
        >
          {mapInset ? (
            <div className={styles.insetHeader}>
              <span>{text.title}</span>
              {mapInset.actions}
            </div>
          ) : null}
          <Suspense fallback={<p className={styles.placeholder}>{text.loading}</p>}>
            <MapView
              followVehicle={followVehicle}
              showPlanning={showPlanning}
              terrain3d={terrain3d}
              isInset={!isMapMain}
              onUserPan={() => {
                setFollowVehicle(false)
              }}
            />
          </Suspense>
          {mapInset?.handle}
        </div>
        <CursorReadout />
        <PointCard canPointCamera={showPlanning} />
        {showCamera ? (
          <CameraPanel
            canControl={showPlanning}
            isMain={!isMapMain}
            width={cameraInset ? insetWidthStyle(insetWidths.camera) : undefined}
            windowActions={cameraInset?.actions}
            resizeHandle={cameraInset?.handle}
          />
        ) : null}
        <AlertList />
        {showPlanning ? <DrawingBanner /> : null}
      </div>
    </section>
  )
}
