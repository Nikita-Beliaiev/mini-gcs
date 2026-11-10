import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { destinationPoint } from '../geo/geo'
import { commandAckMessage, geofenceMessage, homeMessage, missionMessage } from '../test/messages'
import { renderWithStation } from '../test/render'
import { GeofencePanel } from './GeofencePanel'
import { usePlanningStore } from './planningStore'

const HOME = { lat: 43.095, lon: 11.645 }
const FENCE = [45, 135, 225, 315].map((bearing) => destinationPoint(HOME, bearing, 800))

function renderPanel() {
  const result = renderWithStation(<GeofencePanel />)
  act(() => {
    result.transport.setStatus('connected')
    result.transport.receive(homeMessage())
    result.transport.receive(geofenceMessage({ polygon: FENCE }))
  })
  return result
}

function vertices(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Geofence vertices' })).getAllByRole('listitem')
}

describe('GeofencePanel', () => {
  it('summarises the vehicle geofence and starts with an empty draft', () => {
    renderPanel()

    expect(screen.getByText('Vehicle geofence: 4 vertices')).toBeInTheDocument()
    expect(screen.getByText(/No vertices yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload to vehicle' })).toBeDisabled()
  })

  it('loads the vehicle geofence into the draft', async () => {
    renderPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Load from vehicle' }))

    expect(vertices()).toHaveLength(4)
    expect(vertices()[0]).toHaveTextContent('V 1')
    expect(screen.getByRole('button', { name: 'Upload to vehicle' })).toBeEnabled()
  })

  it('explains why a draft cannot be uploaded', () => {
    renderPanel()

    act(() => {
      usePlanningStore.getState().replacePoints('geofence', FENCE.slice(0, 2))
    })

    expect(screen.getByRole('list', { name: 'Geofence problems' })).toHaveTextContent(
      'Add at least 3 vertices',
    )
    expect(screen.getByRole('button', { name: 'Upload to vehicle' })).toBeDisabled()
  })

  it('warns when the vehicle mission would leave the new geofence', () => {
    const { transport } = renderPanel()
    const small = [45, 135, 225, 315].map((bearing) => destinationPoint(HOME, bearing, 100))

    act(() => {
      transport.receive(missionMessage({ waypoints: [destinationPoint(HOME, 0, 500)] }))
      usePlanningStore.getState().replacePoints('geofence', small)
    })

    expect(screen.getByText(/1 waypoint of the vehicle mission is outside/)).toBeInTheDocument()
  })

  it('uploads the draft geofence', async () => {
    const { transport } = renderPanel()
    await userEvent.click(screen.getByRole('button', { name: 'Load from vehicle' }))

    await userEvent.click(screen.getByRole('button', { name: 'Upload to vehicle' }))
    await act(async () => {
      transport.receive(commandAckMessage({ commandId: 1, command: 'uploadGeofence' }))
      await Promise.resolve()
    })

    expect(transport.sent[0]?.command).toEqual({ type: 'uploadGeofence', polygon: FENCE })
    expect(screen.getByText('Accepted by the vehicle')).toBeInTheDocument()
  })

  it('removes the geofence from the vehicle', async () => {
    const { transport } = renderPanel()

    await userEvent.click(screen.getByRole('button', { name: 'Remove from vehicle' }))

    expect(transport.sent[0]?.command).toEqual({ type: 'clearGeofence' })
  })
})
