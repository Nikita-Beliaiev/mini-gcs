import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { usePlanningStore } from '../planning/planningStore'
import { renderWithStation } from '../test/render'
import { createTestLiveSession, renderWithSession } from '../test/session'
import { ControlsPanel } from './ControlsPanel'

describe('ControlsPanel', () => {
  it('offers mission, geofence, simulator and flight log controls as tabs', async () => {
    const user = userEvent.setup()
    renderWithSession(<ControlsPanel />, createTestLiveSession().session)

    expect(screen.getByRole('region', { name: 'Controls' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'Mission' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Geofence' }))
    expect(screen.getByRole('tabpanel', { name: 'Geofence' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Simulator' }))
    expect(screen.getByRole('tabpanel', { name: 'Simulator' })).toHaveTextContent(
      'These controls change the simulation, not the vehicle.',
    )

    await user.click(screen.getByRole('tab', { name: 'Flight log' }))
    expect(screen.getByRole('tabpanel', { name: 'Flight log' })).toHaveTextContent('Recorded 0:00')
  })

  it('stops editing on the map when the tab changes', async () => {
    renderWithStation(<ControlsPanel />)
    act(() => {
      usePlanningStore.getState().setEditMode('mission')
    })

    await userEvent.click(screen.getByRole('tab', { name: 'Geofence' }))

    expect(usePlanningStore.getState().editMode).toBeNull()
  })
})
