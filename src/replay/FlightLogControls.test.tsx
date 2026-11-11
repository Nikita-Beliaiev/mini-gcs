import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createTestLiveSession, renderWithSession } from '../test/session'
import { FlightLogControls } from './FlightLogControls'

function setup() {
  const { session, transport } = createTestLiveSession()
  return { ...renderWithSession(<FlightLogControls />, session), transport }
}

describe('FlightLogControls', () => {
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

    expect(startReplay).toHaveBeenCalledWith(
      expect.objectContaining({ messages: recorded }),
      'Recording from this session',
    )
  })
})
