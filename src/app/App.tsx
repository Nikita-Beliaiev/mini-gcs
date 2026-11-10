import { useEffect } from 'react'
import { startAlertMonitor } from '../alerts/alertMonitor'
import { AlertSummary } from '../alerts/AlertSummary'
import { ChartsPanel } from '../charts/ChartsPanel'
import { ConnectionControl } from '../connection/ConnectionControl'
import { startLatencyMonitor } from '../connection/latencyMonitor'
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

  useEffect(() => startLatencyMonitor(station), [station])

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
        <div className={styles.primary}>
          <MapPanel />
          <ChartsPanel />
        </div>
        <div className={styles.sidebar}>
          <TelemetryPanel />
          <ControlsPanel />
        </div>
      </main>
    </div>
  )
}
