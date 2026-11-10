import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithStation } from '../test/render'
import { usePlanningStore } from './planningStore'
import { PlanningPanel } from './PlanningPanel'

describe('PlanningPanel', () => {
  it('offers mission and geofence planning as tabs', async () => {
    renderWithStation(<PlanningPanel />)

    expect(screen.getByRole('region', { name: 'Planning' })).toBeInTheDocument()
    expect(screen.getByRole('tabpanel', { name: 'Mission' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('tab', { name: 'Geofence' }))

    expect(screen.getByRole('tabpanel', { name: 'Geofence' })).toBeInTheDocument()
  })

  it('stops editing on the map when the tab changes', async () => {
    renderWithStation(<PlanningPanel />)
    act(() => {
      usePlanningStore.getState().setEditMode('mission')
    })

    await userEvent.click(screen.getByRole('tab', { name: 'Geofence' }))

    expect(usePlanningStore.getState().editMode).toBeNull()
  })
})
