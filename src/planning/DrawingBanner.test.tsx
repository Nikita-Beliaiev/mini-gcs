import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { DrawingBanner } from './DrawingBanner'
import { usePlanningStore } from './planningStore'

function startDrawing(target: 'mission' | 'geofence'): void {
  act(() => {
    usePlanningStore.getState().setEditMode(target)
  })
}

describe('DrawingBanner', () => {
  it('stays empty until drawing starts', () => {
    render(<DrawingBanner />)

    expect(screen.queryByRole('button', { name: 'Done' })).not.toBeInTheDocument()
  })

  it('explains how to draw the route and ends drawing on Done', async () => {
    const user = userEvent.setup()
    render(<DrawingBanner />)
    startDrawing('mission')

    expect(screen.getByText(/^Drawing the route: click the map/)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Done' }))

    expect(usePlanningStore.getState().editMode).toBeNull()
    expect(screen.queryByText(/^Drawing the route/)).not.toBeInTheDocument()
  })

  it('explains how to draw the geofence in Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    render(<DrawingBanner />)
    startDrawing('geofence')

    expect(screen.getByText(/^Малювання геозони: клацніть на карті/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Готово' })).toBeInTheDocument()
  })
})
