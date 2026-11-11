import { act, fireEvent, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { heartbeatMessage } from '../test/messages'
import { createTestReplaySession, renderWithSession } from '../test/session'
import { ReplayBar } from './ReplayBar'

const thirtySecondFlight = Array.from({ length: 31 }, (_, second) =>
  heartbeatMessage({ seq: second, timeMs: second * 1000 }),
)

function setup() {
  const replay = createTestReplaySession(thirtySecondFlight)
  replay.session.station.connect()
  renderWithSession(<ReplayBar />, replay.session)
  return replay
}

function position(): HTMLElement {
  return screen.getByRole('slider', { name: 'Replay position' })
}

describe('ReplayBar', () => {
  it('shows where the replay is in the flight', () => {
    setup()

    expect(screen.getByRole('region', { name: 'Flight replay' })).toBeInTheDocument()
    expect(screen.getByText('0:00 / 0:30')).toBeInTheDocument()
    expect(position()).toHaveValue('0')
    expect(position()).toHaveAttribute('aria-valuetext', '0:00 of 0:30')
  })

  it('follows the playback', () => {
    const { runFrameAfter } = setup()

    act(() => {
      for (let frame = 0; frame < 8; frame += 1) {
        runFrameAfter(250)
      }
    })

    expect(screen.getByText('0:02 / 0:30')).toBeInTheDocument()
    expect(position()).toHaveValue('2')
  })

  it('pauses and plays', async () => {
    const user = userEvent.setup()
    const { session } = setup()

    await user.click(screen.getByRole('button', { name: 'Pause' }))
    expect(session.player.getState().isPlaying).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Play' }))
    expect(session.player.getState().isPlaying).toBe(true)
  })

  it('skips forward and back by ten seconds', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: 'Forward 10 s' }))
    await user.click(screen.getByRole('button', { name: 'Forward 10 s' }))
    expect(screen.getByText('0:20 / 0:30')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back 10 s' }))
    expect(screen.getByText('0:10 / 0:30')).toBeInTheDocument()
  })

  it('jumps to the position chosen on the timeline', () => {
    const { session } = setup()

    fireEvent.change(position(), { target: { value: '25' } })

    expect(session.player.getState().positionMs).toBe(25_000)
    expect(position()).toHaveAttribute('aria-valuetext', '0:25 of 0:30')
  })

  it('changes the playback speed', async () => {
    const user = userEvent.setup()
    const { session } = setup()
    const speeds = screen.getByRole('group', { name: 'Speed' })
    expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'true')

    await user.click(screen.getByRole('button', { name: '4×' }))

    expect(session.player.getState().speed).toBe(4)
    expect(speeds).toContainElement(screen.getByRole('button', { name: '4×' }))
    expect(screen.getByRole('button', { name: '4×' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '1×' })).toHaveAttribute('aria-pressed', 'false')
  })
})
