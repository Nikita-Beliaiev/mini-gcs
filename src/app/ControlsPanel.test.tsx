import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { usePlanningStore } from '../planning/planningStore'
import { renderWithStation } from '../test/render'
import { ControlsPanel } from './ControlsPanel'

describe('ControlsPanel', () => {
  it('offers mission, geofence and simulator controls as tabs', async () => {
    const user = userEvent.setup()
    renderWithStation(<ControlsPanel />)

    expect(screen.getByRole('region', { name: 'Controls' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'Mission' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Geofence' }))
    expect(screen.getByRole('tabpanel', { name: 'Geofence' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: 'Simulator' }))
    expect(screen.getByRole('tabpanel', { name: 'Simulator' })).toHaveTextContent(
      'These controls change the simulation, not the vehicle.',
    )
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
