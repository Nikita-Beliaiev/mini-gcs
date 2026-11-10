import { act, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { usePlanningStore } from './planningStore'
import {
  commandAckMessage,
  heartbeatMessage,
  homeMessage,
  missionCurrentMessage,
  missionMessage,
} from '../test/messages'
import { renderWithStation } from '../test/render'
import type { FakeTransport } from '../test/fakeTransport'
import { MissionPanel } from './MissionPanel'

function renderPanel() {
  const result = renderWithStation(<MissionPanel />)
  act(() => {
    result.transport.setStatus('connected')
    result.transport.receive(homeMessage())
    result.transport.receive(missionMessage())
  })
  return result
}

function waypoints(): HTMLElement[] {
  return within(screen.getByRole('list', { name: 'Mission waypoints' })).getAllByRole('listitem')
}

async function loadVehicleMission() {
  await userEvent.click(screen.getByRole('button', { name: 'Load from vehicle' }))
}

async function acknowledge(transport: FakeTransport, accepted: boolean, reason: string | null) {
  const [envelope] = transport.sent
  await act(async () => {
    transport.receive(
      commandAckMessage({
        commandId: envelope?.commandId,
        command: 'uploadMission',
        accepted,
        reason,
      }),
    )
    await Promise.resolve()
  })
}

describe('MissionPanel', () => {
  it('explains how to start while the draft is empty', () => {
    renderPanel()

    expect(screen.getByText(/No waypoints yet/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Upload to vehicle' })).toBeDisabled()
  })

  it('summarises the mission the vehicle is flying', () => {
    const { transport } = renderPanel()

    act(() => {
      transport.receive(heartbeatMessage({ mode: 'AUTO' }))
      transport.receive(missionCurrentMessage({ waypointIndex: 1 }))
    })

    expect(screen.getByText('Vehicle mission 1: 2 waypoints, flying to WP 2')).toBeInTheDocument()
  })

  it('loads the vehicle mission into the draft', async () => {
    renderPanel()

    await loadVehicleMission()

    expect(waypoints()).toHaveLength(2)
    expect(waypoints()[0]).toHaveTextContent('WP 1')
    expect(waypoints()[0]).toHaveTextContent('43.09800, 11.64600')
    expect(screen.getByText(/^Route .* from home and back$/)).toBeInTheDocument()
  })

  it('reorders and removes waypoints', async () => {
    const user = userEvent.setup()
    renderPanel()
    await loadVehicleMission()

    await user.click(screen.getByRole('button', { name: 'Move waypoint 2 up' }))
    expect(waypoints()[0]).toHaveTextContent('43.09600, 11.65000')

    await user.click(screen.getByRole('button', { name: 'Remove waypoint 1' }))
    expect(waypoints()).toHaveLength(1)
    expect(waypoints()[0]).toHaveTextContent('43.09800, 11.64600')
  })

  it('points out problems and blocks the upload', () => {
    renderPanel()

    act(() => {
      usePlanningStore.getState().replacePoints('mission', [{ lat: 43.2, lon: 11.645 }])
    })

    expect(waypoints()[0]).toHaveTextContent('Waypoint 1 is more than 2 km from home')
    expect(screen.getByRole('button', { name: 'Upload to vehicle' })).toBeDisabled()
  })

  it('uploads the draft and shows that the vehicle accepted it', async () => {
    const { transport } = renderPanel()
    await loadVehicleMission()

    await userEvent.click(screen.getByRole('button', { name: 'Upload to vehicle' }))

    expect(transport.sent[0]?.command).toEqual({
      type: 'uploadMission',
      waypoints: missionMessage().waypoints,
    })
    expect(screen.getByText('Uploading…')).toBeInTheDocument()

    await acknowledge(transport, true, null)

    expect(screen.getByText('Accepted by the vehicle')).toBeInTheDocument()
  })

  it('shows why the vehicle rejected the mission', async () => {
    const { transport } = renderPanel()
    await loadVehicleMission()

    await userEvent.click(screen.getByRole('button', { name: 'Upload to vehicle' }))
    await acknowledge(transport, false, 'Waypoint 2 is outside the geofence')

    expect(screen.getByText('Rejected: Waypoint 2 is outside the geofence')).toBeInTheDocument()
  })

  it('does not upload while the link is down', async () => {
    const { transport } = renderPanel()
    await loadVehicleMission()

    act(() => {
      transport.setStatus('disconnected')
    })

    expect(screen.getByRole('button', { name: 'Upload to vehicle' })).toBeDisabled()
  })
})
