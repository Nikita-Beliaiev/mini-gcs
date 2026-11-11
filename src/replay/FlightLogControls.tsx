import { useState, useSyncExternalStore, type ChangeEvent } from 'react'
import { useMessages } from '../i18n/localeStore'
import { useLiveSession, useSession } from '../session/sessionContext'
import { formatDuration } from '../telemetry/format'
import buttonStyles from '../ui/button.module.css'
import { downloadTextFile } from './download'
import {
  createFlightLog,
  flightLogFileName,
  serializeFlightLog,
  type FlightLogError,
} from './flightLog'
import { describeFlightLogError } from './flightLogErrorText'
import { RECORDING_WINDOW_MS } from './flightRecorder'
import styles from './FlightLogControls.module.css'

const RECORDING_WINDOW_MINUTES = RECORDING_WINDOW_MS / 60_000

interface FileError {
  fileName: string
  error: FlightLogError
}

export function FlightLogControls() {
  const messages = useMessages()
  const text = messages.flightLog
  const { startReplay } = useSession()
  const { recorder } = useLiveSession()
  const [fileError, setFileError] = useState<FileError | null>(null)
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
      startReplay(result.log, { kind: 'file', name: file.name })
    } else {
      setFileError({ fileName: file.name, error: result.error })
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
      <p className={styles.note}>{text.note(RECORDING_WINDOW_MINUTES)}</p>
      <p className={styles.recorded}>{text.recorded(recorded)}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={!hasRecording}
          onClick={() => {
            startReplay(recordingLog(), { kind: 'recording' })
          }}
        >
          {text.replayRecording}
        </button>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={!hasRecording}
          onClick={download}
        >
          {text.download}
        </button>
      </div>
      <label className={styles.open}>
        {text.open}
        <input
          type="file"
          accept=".json,application/json"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
      </label>
      <p className={styles.error} aria-live="polite">
        {fileError
          ? text.fileError(fileError.fileName, describeFlightLogError(fileError.error, messages))
          : null}
      </p>
    </div>
  )
}
