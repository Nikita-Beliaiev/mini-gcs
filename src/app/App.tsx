import { useEffect, useId } from 'react'
import { ConnectionControl } from '../connection/ConnectionControl'
import { useGroundStation } from '../station/stationContext'
import { TelemetryPanel } from '../telemetry/TelemetryPanel'
import { classNames } from '../ui/classNames'
import panelStyles from '../ui/panel.module.css'
import styles from './App.module.css'

export function App() {
  const station = useGroundStation()
  const mapTitleId = useId()

  useEffect(() => {
    station.connect()
    return () => {
      station.disconnect()
    }
  }, [station])

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mini GCS</h1>
        <ConnectionControl />
      </header>
      <main className={styles.main}>
        <section className={classNames(panelStyles.panel, styles.map)} aria-labelledby={mapTitleId}>
          <h2 id={mapTitleId} className={panelStyles.title}>
            Map
          </h2>
          <p className={styles.placeholder}>Map view is coming next</p>
        </section>
        <TelemetryPanel />
      </main>
    </div>
  )
}
