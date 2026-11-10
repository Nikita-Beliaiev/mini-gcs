import { useEffect } from 'react'
import { startAlertMonitor } from '../alerts/alertMonitor'
import { AlertSummary } from '../alerts/AlertSummary'
import { ConnectionControl } from '../connection/ConnectionControl'
import { MapPanel } from '../map/MapPanel'
import { ControlsPanel } from './ControlsPanel'
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

  useEffect(() => startAlertMonitor(station), [station])

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mini GCS</h1>
        <div className={styles.headerStatus}>
          <AlertSummary />
          <ConnectionControl />
        </div>
      </header>
      <main className={styles.main}>
        <MapPanel />
        <div className={styles.sidebar}>
          <TelemetryPanel />
          <ControlsPanel />
        </div>
      </main>
    </div>
  )
}
