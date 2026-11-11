import { useState } from 'react'
import { useMessages } from '../i18n/localeStore'
import type { SimulatedFault } from '../protocol/commands'
import { useConnectionStatus, useGroundStation } from '../station/stationContext'
import buttonStyles from '../ui/button.module.css'
import styles from './FaultPanel.module.css'

const FAULTS: readonly SimulatedFault[] = ['linkLoss', 'gpsLoss', 'batteryDrop']

interface FaultResult {
  fault: SimulatedFault
  started: boolean
}

export function FaultPanel() {
  const text = useMessages().faults
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const [lastResult, setLastResult] = useState<FaultResult | null>(null)

  async function inject(fault: SimulatedFault): Promise<void> {
    const result = await station.sendCommand({ type: 'simulateFault', fault })
    setLastResult({ fault, started: result.status === 'accepted' })
  }

  return (
    <div className={styles.faults}>
      <p className={styles.note}>{text.note}</p>
      <ul className={styles.list}>
        {FAULTS.map((fault) => (
          <li key={fault}>
            <button
              type="button"
              className={buttonStyles.button}
              disabled={!isConnected}
              onClick={() => {
                void inject(fault)
              }}
            >
              {text[fault]}
            </button>
          </li>
        ))}
      </ul>
      <p className={styles.note} aria-live="polite">
        {lastResult
          ? (lastResult.started ? text.started : text.failed)(text[lastResult.fault])
          : null}
      </p>
    </div>
  )
}
