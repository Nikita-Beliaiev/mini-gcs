import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { captureDownloads } from '../test/downloads'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createTestLiveSession, renderWithSession, TEST_LOG_SAVED_AT } from '../test/session'
import { createFlightLog, serializeFlightLog } from './flightLog'
import { parseFlightLog } from './flightLogFile'
import { FlightLogControls } from './FlightLogControls'

function setup() {
  const { session, transport } = createTestLiveSession()
  return { ...renderWithSession(<FlightLogControls />, session), transport }
}

describe('FlightLogControls', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('shows how much telemetry has been recorded', () => {
    const { transport } = setup()
    expect(screen.getByText('Recorded 0:00')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replay recording' })).toBeDisabled()

    act(() => {
      transport.receive(heartbeatMessage({ timeMs: 0 }))
      transport.receive(heartbeatMessage({ timeMs: 65_000 }))
    })

    expect(screen.getByText('Recorded 1:05')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Replay recording' })).toBeEnabled()
  })

  it('replays what has been recorded so far', async () => {
    const user = userEvent.setup()
    const { transport, startReplay } = setup()
    const recorded = [heartbeatMessage({ timeMs: 0 }), positionMessage({ timeMs: 100 })]
    act(() => {
      for (const message of recorded) {
        transport.receive(message)
      }
    })

    await user.click(screen.getByRole('button', { name: 'Replay recording' }))

    expect(startReplay).toHaveBeenCalledWith(expect.objectContaining({ messages: recorded }), {
      kind: 'recording',
    })
  })

  it('downloads the recording as a flight log file', async () => {
    const user = userEvent.setup()
    const { downloads } = captureDownloads()
    const { transport } = setup()
    const recorded = [heartbeatMessage({ timeMs: 0 }), positionMessage({ timeMs: 100 })]
    act(() => {
      for (const message of recorded) {
        transport.receive(message)
      }
    })

    await user.click(screen.getByRole('button', { name: 'Download log' }))

    const [download] = downloads
    expect(download?.fileName).toMatch(
      /^mini-gcs-flight-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/,
    )
    const result = parseFlightLog((await download?.blob.text()) ?? '')
    expect(result.ok && result.log.messages).toEqual(recorded)
  })

  it('opens a flight log file for replay', async () => {
    const user = userEvent.setup()
    const { startReplay } = setup()
    const log = createFlightLog([heartbeatMessage()], TEST_LOG_SAVED_AT)
    const file = new File([serializeFlightLog(log)], 'patrol.json', { type: 'application/json' })

    await user.upload(screen.getByLabelText('Open a flight log'), file)

    await waitFor(() => {
      expect(startReplay).toHaveBeenCalledWith(log, { kind: 'file', name: 'patrol.json' })
    })
  })

  it('explains why a file cannot be opened', async () => {
    const user = userEvent.setup()
    const { startReplay } = setup()
    const file = new File(['hello'], 'notes.json', { type: 'application/json' })

    await user.upload(screen.getByLabelText('Open a flight log'), file)

    expect(await screen.findByText('notes.json: The file is not valid JSON.')).toBeInTheDocument()
    expect(startReplay).not.toHaveBeenCalled()
  })
})
