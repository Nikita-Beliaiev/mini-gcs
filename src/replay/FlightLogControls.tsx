import { useState, useSyncExternalStore, type ChangeEvent } from 'react'
import { useLiveSession, useSession } from '../session/sessionContext'
import { formatDuration } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { downloadTextFile } from './download'
import { createFlightLog, flightLogFileName, serializeFlightLog } from './flightLog'
import { RECORDING_WINDOW_MS } from './flightRecorder'
import styles from './FlightLogControls.module.css'

const RECORDING_SOURCE = 'Recording from this session'

const RECORDING_WINDOW_MINUTES = RECORDING_WINDOW_MS / 60_000

export function FlightLogControls() {
  const { startReplay } = useSession()
  const { recorder } = useLiveSession()
  const [fileError, setFileError] = useState<string | null>(null)
  const recorded = useSyncExternalStore(recorder.subscribe, () =>
    formatDuration(recorder.getDurationMs()),
  )
  const hasRecording = useSyncExternalStore(
    recorder.subscribe,
    () => recorder.getMessageCount() > 0,
  )

  function recordingLog() {
    return createFlightLog(recorder.getMessages(), new Date())
  }

  function download(): void {
    const log = recordingLog()
    downloadTextFile(serializeFlightLog(log), flightLogFileName(log.savedAt))
  }

  async function openFile(file: File): Promise<void> {
    setFileError(null)
    const { readFlightLogFile } = await import('./flightLogFile')
    const result = await readFlightLogFile(file)
    if (result.ok) {
      startReplay(result.log, file.name)
    } else {
      setFileError(`${file.name}: ${result.error}`)
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) {
      void openFile(file)
    }
  }

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
            startReplay(recordingLog(), RECORDING_SOURCE)
          }}
        >
          Replay recording
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={!hasRecording}
          onClick={download}
        >
          Download log
        </button>
      </div>
      <label className={styles.open}>
        Open a flight log
        <input
          type="file"
          accept=".json,application/json"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
      </label>
      <p className={styles.error} aria-live="polite">
        {fileError}
      </p>
    </div>
  )
}
