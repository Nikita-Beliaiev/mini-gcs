import { lazy, Suspense, useId, useState } from 'react'
import buttonStyles from '../ui/button.module.css'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import styles from './MapPanel.module.css'

const MapView = lazy(() => import('./MapView'))

export function MapPanel() {
  const titleId = useId()
  const [followVehicle, setFollowVehicle] = useState(false)

  return (
    <section className={classNames(panelStyles.panel, styles.panel)} aria-labelledby={titleId}>
      <div className={styles.header}>
        <h2 id={titleId} className={panelStyles.title}>
          Map
        </h2>
        <button
          type="button"
          className={buttonStyles.button}
          aria-pressed={followVehicle}
          onClick={() => {
            setFollowVehicle((following) => !following)
          }}
        >
          Follow vehicle
        </button>
      </div>
      <Suspense fallback={<p className={styles.placeholder}>Loading map…</p>}>
        <MapView
          followVehicle={followVehicle}
          onUserPan={() => {
            setFollowVehicle(false)
          }}
        />
      </Suspense>
    </section>
  )
}
