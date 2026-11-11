import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { heartbeatMessage } from '../test/messages'
import { createTestLiveSession, createTestReplaySession, renderWithSession } from '../test/session'
import { App } from './App'

vi.mock('../map/MapView', () => ({
  default: () => <p>Map view</p>,
}))

vi.mock('../charts/TimeSeriesChart', () => ({
  default: () => <figure>Chart</figure>,
}))

function renderLive() {
  const { session, transport } = createTestLiveSession()
  return { ...renderWithSession(<App />, session), transport }
}

describe('App', () => {
  it('shows the station title, the map and the telemetry panel', async () => {
    renderLive()

    expect(screen.getByRole('heading', { level: 1, name: 'Mini GCS' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Map' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Telemetry' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Controls' })).toBeInTheDocument()
    expect(await screen.findByText('Map view')).toBeInTheDocument()
  })

  it('connects to the vehicle on start', async () => {
    const { transport } = renderLive()
    await screen.findByText('Map view')

    expect(transport.getStatus()).toBe('connecting')
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…')
  })

  it('disconnects when the station closes', async () => {
    const { transport, unmount } = renderLive()
    await screen.findByText('Map view')

    unmount()

    expect(transport.getStatus()).toBe('disconnected')
  })

  it('shows a replay without the vehicle controls', async () => {
    const user = userEvent.setup()
    const { session } = createTestReplaySession([heartbeatMessage({ timeMs: 0, mode: 'LAND' })])
    const { returnToLive } = renderWithSession(<App />, session)
    await screen.findByText('Map view')

    expect(screen.getByRole('status')).toHaveTextContent('Replay')
    expect(screen.getByRole('group', { name: 'Flight mode' })).toHaveTextContent('LAND')
    expect(screen.queryByRole('region', { name: 'Controls' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Back to live' }))
    expect(returnToLive).toHaveBeenCalledOnce()
  })
})
