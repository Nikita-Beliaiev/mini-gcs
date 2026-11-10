import { useEffect } from 'react'
import { ConnectionControl } from '../connection/ConnectionControl'
import { MapPanel } from '../map/MapPanel'
import { useGroundStation } from '../station/stationContext'
import { TelemetryPanel } from '../telemetry/TelemetryPanel'
import styles from './App.module.css'

export function App() {
  const station = useGroundStation()

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
        <MapPanel />
        <TelemetryPanel />
      </main>
    </div>
  )
}
