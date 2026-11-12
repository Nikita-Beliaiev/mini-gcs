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
  type FlightLogResult,
} from './flightLog'
import { describeFlightLogError } from './flightLogErrorText'
import { RECORDING_WINDOW_MS } from './flightRecorder'
import styles from './FlightLogControls.module.css'

const RECORDING_WINDOW_MINUTES = RECORDING_WINDOW_MS / 60_000
const SAMPLE_TLOG_URL = `${import.meta.env.BASE_URL}samples/arducopter-sitl.tlog`

type OpenError = { kind: 'file'; fileName: string; error: FlightLogError } | { kind: 'sample' }

async function readLogFile(file: File): Promise<FlightLogResult> {
  const { isTlogFileName, readTlogFile } = await import('./tlogFile')
  if (isTlogFileName(file.name)) {
    return readTlogFile(file)
  }
  const { readFlightLogFile } = await import('./flightLogFile')
  return readFlightLogFile(file)
}

async function readSampleLog(): Promise<FlightLogResult | null> {
  try {
    const response = await fetch(SAMPLE_TLOG_URL)
    if (!response.ok) {
      return null
    }
    const { readTlogFile } = await import('./tlogFile')
    return await readTlogFile(await response.blob())
  } catch {
    return null
  }
}

export function FlightLogControls() {
  const messages = useMessages()
  const text = messages.flightLog
  const { startReplay } = useSession()
  const { recorder } = useLiveSession()
  const [openError, setOpenError] = useState<OpenError | null>(null)
  const [loadingSample, setLoadingSample] = useState(false)
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
    setOpenError(null)
    const result = await readLogFile(file)
    if (result.ok) {
      startReplay(result.log, { kind: 'file', name: file.name })
    } else {
      setOpenError({ kind: 'file', fileName: file.name, error: result.error })
    }
  }

  async function openSample(): Promise<void> {
    setOpenError(null)
    setLoadingSample(true)
    const result = await readSampleLog()
    setLoadingSample(false)
    if (result?.ok) {
      startReplay(result.log, { kind: 'sample' })
    } else {
      setOpenError({ kind: 'sample' })
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.[0]
    event.currentTarget.value = ''
    if (file) {
      void openFile(file)
    }
  }

  function describeOpenError(error: OpenError): string {
    return error.kind === 'sample'
      ? text.sampleError
      : text.fileError(error.fileName, describeFlightLogError(error.error, messages))
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
          accept=".json,.tlog,application/json"
          className={styles.fileInput}
          onChange={handleFileChange}
        />
      </label>
      <p className={styles.note}>{text.formats}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={buttonStyles.button}
          disabled={loadingSample}
          onClick={() => {
            void openSample()
          }}
        >
          {text.openSample}
        </button>
      </div>
      <p className={styles.error} aria-live="polite">
        {openError ? describeOpenError(openError) : null}
      </p>
    </div>
  )
}
