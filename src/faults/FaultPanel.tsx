import { useState } from 'react'
import type { SimulatedFault } from '../protocol/commands'
import { useConnectionStatus, useGroundStation } from '../station/stationContext'
import buttonStyles from '../ui/button.module.css'
import styles from './FaultPanel.module.css'

const FAULTS: readonly { fault: SimulatedFault; label: string }[] = [
  { fault: 'linkLoss', label: 'Drop the link for 10 s' },
  { fault: 'gpsLoss', label: 'Lose GPS for 15 s' },
  { fault: 'batteryDrop', label: 'Drain the battery to 32%' },
]

export function FaultPanel() {
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const [lastResult, setLastResult] = useState<string | null>(null)

  async function inject(fault: SimulatedFault, label: string): Promise<void> {
    const result = await station.sendCommand({ type: 'simulateFault', fault })
    setLastResult(result.status === 'accepted' ? `Started: ${label}` : `Failed: ${label}`)
  }

  return (
    <div className={styles.faults}>
      <p className={styles.note}>
        These controls change the simulation, not the vehicle. Use them to see how the station
        reacts to failures.
      </p>
      <ul className={styles.list}>
        {FAULTS.map(({ fault, label }) => (
          <li key={fault}>
            <button
              type="button"
              className={buttonStyles.button}
              disabled={!isConnected}
              onClick={() => {
                void inject(fault, label)
              }}
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.note} aria-live="polite">
        {lastResult}
      </p>
    </div>
  )
}
