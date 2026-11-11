import { useSyncExternalStore } from 'react'
import { useLiveSession, useSession } from '../session/sessionContext'
import { formatDuration } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { createFlightLog } from './flightLog'
import { RECORDING_WINDOW_MS } from './flightRecorder'
import styles from './FlightLogControls.module.css'

const RECORDING_SOURCE = 'Recording from this session'

const RECORDING_WINDOW_MINUTES = RECORDING_WINDOW_MS / 60_000

export function FlightLogControls() {
  const { startReplay } = useSession()
  const { recorder } = useLiveSession()
  const recorded = useSyncExternalStore(recorder.subscribe, () =>
    formatDuration(recorder.getDurationMs()),
  )
  const hasRecording = useSyncExternalStore(
    recorder.subscribe,
    () => recorder.getMessageCount() > 0,
  )

  return (
    <div className={styles.flightLog}>
      <p className={styles.note}>
        The station records the last {RECORDING_WINDOW_MINUTES} minutes of telemetry, like a flight
        recorder.
      </p>
      <p className={styles.recorded}>Recorded {recorded}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={!hasRecording}
          onClick={() => {
            startReplay(createFlightLog(recorder.getMessages(), new Date()), RECORDING_SOURCE)
          }}
        >
          Replay recording
        </button>
      </div>
    </div>
  )
}
