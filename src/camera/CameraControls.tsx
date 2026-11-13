import { useState } from 'react'
import { useMessages } from '../i18n/localeStore'
import { useConnectionStatus, useGroundStation } from '../station/stationContext'
import buttonStyles from '../ui/button.module.css'
import { describeCameraCommand } from './cameraCommandText'
import { moveCamera, type CameraMove } from './cameraMoves'
import styles from './CameraPanel.module.css'

const ARROWS: readonly { move: CameraMove; symbol: string }[] = [
  { move: 'tiltUp', symbol: '↑' },
  { move: 'tiltDown', symbol: '↓' },
  { move: 'panLeft', symbol: '←' },
  { move: 'panRight', symbol: '→' },
]

const VIEWS: readonly CameraMove[] = ['lookAhead', 'lookDown']

export function CameraControls() {
  const messages = useMessages()
  const text = messages.camera
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const [status, setStatus] = useState('')

  async function move(cameraMove: CameraMove): Promise<void> {
    const camera = station.telemetry.getSnapshot().camera
    if (!camera) {
      return
    }
    const result = await station.sendCommand({
      type: 'pointCamera',
      ...moveCamera(camera, cameraMove),
    })
    setStatus(describeCameraCommand(result, '', messages))
  }

  return (
    <div className={styles.controls}>
      <div role="group" aria-label={text.controls} className={styles.buttons}>
        {ARROWS.map(({ move: cameraMove, symbol }) => (
          <button
            key={cameraMove}
            type="button"
            className={buttonStyles.button}
            aria-label={text.moves[cameraMove]}
            title={text.moves[cameraMove]}
            disabled={!isConnected}
            onClick={() => void move(cameraMove)}
          >
            {symbol}
          </button>
        ))}
        {VIEWS.map((cameraMove) => (
          <button
            key={cameraMove}
            type="button"
            className={buttonStyles.button}
            disabled={!isConnected}
            onClick={() => void move(cameraMove)}
          >
            {text.moves[cameraMove]}
          </button>
        ))}
      </div>
      <p className={styles.status} aria-live="polite">
        {status}
      </p>
    </div>
  )
}
