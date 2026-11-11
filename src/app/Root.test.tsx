import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { usePlanningStore } from '../planning/planningStore'
import type { FlightLog, FlightLogSource } from '../replay/flightLog'
import { heartbeatMessage } from '../test/messages'
import { createTestLiveSession, createTestReplaySession } from '../test/session'
import { Root } from './Root'

vi.mock('../map/MapView', () => ({
  default: () => <p>Map view</p>,
}))

vi.mock('../charts/TimeSeriesChart', () => ({
  default: () => <figure>Chart</figure>,
}))

function setup() {
  const { session, transport } = createTestLiveSession()
  render(
    <Root
      live={session}
      createReplay={(log: FlightLog, source: FlightLogSource) =>
        createTestReplaySession(log.messages, source).session
      }
    />,
  )
  return { transport }
}

function flightMode(): HTMLElement {
  return screen.getByRole('group', { name: 'Flight mode' })
}

describe('Root', () => {
  it('starts with the live station', async () => {
    const { transport } = setup()
    await screen.findByText('Map view')

    expect(transport.getStatus()).toBe('connecting')
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…')
  })

  it('replays the recording and goes back to live', async () => {
    const user = userEvent.setup()
    const { transport } = setup()
    await screen.findByText('Map view')
    act(() => {
      transport.setStatus('connected')
      transport.receive(heartbeatMessage({ timeMs: 0, mode: 'STANDBY' }))
      transport.receive(heartbeatMessage({ timeMs: 1000, mode: 'AUTO' }))
    })
    expect(flightMode()).toHaveTextContent('AUTO')

    await user.click(screen.getByRole('tab', { name: 'Flight log' }))
    await user.click(screen.getByRole('button', { name: 'Replay recording' }))

    expect(screen.getByRole('status')).toHaveTextContent('Replay')
    expect(transport.getStatus()).toBe('disconnected')
    expect(flightMode()).toHaveTextContent('STANDBY')

    await user.click(screen.getByRole('button', { name: 'Back to live' }))

    expect(screen.getByRole('status')).toHaveTextContent('Connecting…')
    expect(transport.getStatus()).toBe('connecting')
  })

  it('keeps the chosen language when switching to a replay and back', async () => {
    const user = userEvent.setup()
    const { transport } = setup()
    await screen.findByText('Map view')
    act(() => {
      transport.receive(heartbeatMessage())
    })
    await user.click(screen.getByRole('button', { name: 'УКР' }))

    await user.click(screen.getByRole('tab', { name: 'Журнал польоту' }))
    await user.click(screen.getByRole('button', { name: 'Відтворити запис' }))

    expect(screen.getByRole('status')).toHaveTextContent('Відтворення')
    expect(screen.getByRole('region', { name: 'Журнал польоту' })).toHaveTextContent(
      'Запис цього сеансу',
    )

    await user.click(screen.getByRole('button', { name: 'Повернутися до польоту' }))

    expect(screen.getByRole('status')).toHaveTextContent('Підключення…')
  })

  it('stops editing on the map when a replay starts', async () => {
    const user = userEvent.setup()
    const { transport } = setup()
    await screen.findByText('Map view')
    await user.click(screen.getByRole('tab', { name: 'Flight log' }))
    act(() => {
      transport.receive(heartbeatMessage())
      usePlanningStore.getState().setEditMode('mission')
    })

    await user.click(screen.getByRole('button', { name: 'Replay recording' }))

    expect(usePlanningStore.getState().editMode).toBeNull()
  })
})
