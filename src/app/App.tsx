import { useEffect } from 'react'
import { startAlertMonitor } from '../alerts/alertMonitor'
import { AlertSummary } from '../alerts/AlertSummary'
import { ChartsPanel } from '../charts/ChartsPanel'
import { ConnectionControl } from '../connection/ConnectionControl'
import { startLatencyMonitor } from '../connection/latencyMonitor'
import { MapPanel } from '../map/MapPanel'
import { ReplayStatus } from '../replay/ReplayStatus'
import { useSession } from '../session/sessionContext'
import { TelemetryPanel } from '../telemetry/TelemetryPanel'
import { ControlsPanel } from './ControlsPanel'
import styles from './App.module.css'

export function App() {
  const { session } = useSession()
  const isLive = session.kind === 'live'

  useEffect(() => {
    session.station.connect()
    return () => {
      session.station.disconnect()
    }
  }, [session])

  useEffect(
    () =>
      startAlertMonitor(
        session.station,
        session.kind === 'replay' ? { now: session.player.now } : undefined,
      ),
    [session],
  )

  useEffect(
    () => (session.kind === 'live' ? startLatencyMonitor(session.station) : undefined),
    [session],
  )

  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <h1 className={styles.title}>Mini GCS</h1>
        <div className={styles.headerStatus}>
          <AlertSummary />
          {isLive ? <ConnectionControl /> : <ReplayStatus />}
        </div>
      </header>
      <main className={styles.main}>
        <div className={styles.primary}>
          <MapPanel showPlanning={isLive} />
          <ChartsPanel />
        </div>
        <div className={styles.sidebar}>
          <TelemetryPanel />
          {isLive ? <ControlsPanel /> : null}
        </div>
      </main>
    </div>
  )
}
