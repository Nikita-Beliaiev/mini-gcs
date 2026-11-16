import { useState } from 'react'
import { useMessages } from '../i18n/localeStore'
import type { Command } from '../protocol/commands'
import { useConnectionStatus, useGroundStation, useTelemetry } from '../station/stationContext'
import buttonStyles from '../ui/button.module.css'
import { describeCameraCommand } from './cameraCommandText'
import { moveCamera, nextZoom, type CameraMove, type ZoomStep } from './cameraMoves'
import styles from './CameraPanel.module.css'

const ARROWS: readonly { move: CameraMove; symbol: string }[] = [
  { move: 'tiltUp', symbol: '↑' },
  { move: 'tiltDown', symbol: '↓' },
  { move: 'panLeft', symbol: '←' },
  { move: 'panRight', symbol: '→' },
]

const ZOOM_STEPS: readonly { step: ZoomStep; symbol: string }[] = [
  { step: 'zoomOut', symbol: '−' },
  { step: 'zoomIn', symbol: '+' },
]

const VIEWS: readonly CameraMove[] = ['lookAhead', 'lookDown']

export function CameraControls() {
  const messages = useMessages()
  const text = messages.camera
  const station = useGroundStation()
  const isConnected = useConnectionStatus() === 'connected'
  const zoom = useTelemetry((state) => state.camera?.zoom ?? 1)
  const [status, setStatus] = useState('')

  async function send(command: Command): Promise<void> {
    const result = await station.sendCommand(command)
    setStatus(describeCameraCommand(result, '', messages))
  }

  async function move(cameraMove: CameraMove): Promise<void> {
    const camera = station.telemetry.getSnapshot().camera
    if (camera) {
      await send({ type: 'pointCamera', ...moveCamera(camera, cameraMove) })
    }
  }

  async function zoomBy(step: ZoomStep): Promise<void> {
    const camera = station.telemetry.getSnapshot().camera
    if (camera) {
      await send({ type: 'zoomCamera', zoom: nextZoom(camera.zoom, step) })
    }
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
        {ZOOM_STEPS.map(({ step, symbol }) => (
          <button
            key={step}
            type="button"
            className={buttonStyles.button}
            aria-label={text[step]}
            title={text[step]}
            disabled={!isConnected || nextZoom(zoom, step) === zoom}
            onClick={() => void zoomBy(step)}
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
