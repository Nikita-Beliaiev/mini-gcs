import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { usePlanningStore } from '../planning/planningStore'
import { renderWithStation } from '../test/render'
import { MapPanel } from './MapPanel'
import type { MapViewProps } from './MapView'

vi.mock('./MapView', () => ({
  default: ({ followVehicle, showPlanning, terrain3d, onUserPan }: MapViewProps) => (
    <div>
      <p>{followVehicle ? 'Map follows the vehicle' : 'Map is free'}</p>
      <p>{terrain3d ? 'Terrain in 3D' : 'Flat map'}</p>
      <p>{showPlanning ? 'Plans shown' : 'Plans hidden'}</p>
      <button type="button" onClick={onUserPan}>
        Drag map
      </button>
    </div>
  ),
}))

describe('MapPanel', () => {
  it('shows the map once it has loaded', async () => {
    renderWithStation(<MapPanel showPlanning />)

    expect(screen.getByRole('region', { name: 'Map' })).toBeInTheDocument()
    expect(await screen.findByText('Map is free')).toBeInTheDocument()
  })

  it('toggles following the vehicle', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    const follow = screen.getByRole('button', { name: 'Follow vehicle' })
    await screen.findByText('Map is free')

    expect(follow).toHaveAttribute('aria-pressed', 'false')

    await user.click(follow)
    expect(follow).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Map follows the vehicle')).toBeInTheDocument()

    await user.click(follow)
    expect(follow).toHaveAttribute('aria-pressed', 'false')
  })

  it('stops following when the user drags the map', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')

    await user.click(screen.getByRole('button', { name: 'Follow vehicle' }))
    await user.click(screen.getByRole('button', { name: 'Drag map' }))

    expect(screen.getByRole('button', { name: 'Follow vehicle' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
    expect(screen.getByText('Map is free')).toBeInTheDocument()
  })

  it('shows the terrain in 3D on request', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    const terrain3d = screen.getByRole('button', { name: '3D terrain' })
    await screen.findByText('Flat map')

    expect(terrain3d).toHaveAttribute('aria-pressed', 'false')

    await user.click(terrain3d)
    expect(terrain3d).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Terrain in 3D')).toBeInTheDocument()

    await user.click(terrain3d)
    expect(screen.getByText('Flat map')).toBeInTheDocument()
  })

  it('shows and hides the camera', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')
    const camera = screen.getByRole('button', { name: 'Camera' })

    expect(camera).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('region', { name: 'Camera' })).toBeInTheDocument()

    await user.click(camera)
    expect(camera).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByRole('region', { name: 'Camera' })).not.toBeInTheDocument()
  })

  it('swaps the map and the camera between the main view and the small window', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')

    expect(screen.getByRole('slider', { name: 'Camera window size' })).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Map window size' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Swap the map and the camera' }))
    expect(screen.getByRole('slider', { name: 'Map window size' })).toBeInTheDocument()
    expect(screen.queryByRole('slider', { name: 'Camera window size' })).not.toBeInTheDocument()
    expect(screen.getByText('Map is free')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Swap the map and the camera' }))
    expect(screen.getByRole('slider', { name: 'Camera window size' })).toBeInTheDocument()
  })

  it('enlarges and shrinks the small window', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')
    const size = screen.getByRole('slider', { name: 'Camera window size' })

    expect(size).toHaveAttribute('aria-valuenow', '280')
    await user.click(screen.getByRole('button', { name: 'Enlarge the camera window' }))
    expect(size).toHaveAttribute('aria-valuenow', '560')
    await user.click(screen.getByRole('button', { name: 'Shrink the camera window' }))
    expect(size).toHaveAttribute('aria-valuenow', '280')
  })

  it('resizes the small window from the keyboard', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')
    const size = screen.getByRole('slider', { name: 'Camera window size' })

    size.focus()
    await user.keyboard('{ArrowUp}{ArrowUp}')
    expect(size).toHaveAttribute('aria-valuenow', '360')
    expect(size).toHaveAttribute('aria-valuetext', '360 px')
    await user.keyboard('{End}')
    expect(size).toHaveAttribute('aria-valuenow', '960')
  })

  it('keeps each window size when the views are swapped', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')

    await user.click(screen.getByRole('button', { name: 'Enlarge the camera window' }))
    await user.click(screen.getByRole('button', { name: 'Swap the map and the camera' }))
    expect(screen.getByRole('slider', { name: 'Map window size' })).toHaveAttribute(
      'aria-valuenow',
      '320',
    )
    await user.click(screen.getByRole('button', { name: 'Swap the map and the camera' }))

    expect(screen.getByRole('slider', { name: 'Camera window size' })).toHaveAttribute(
      'aria-valuenow',
      '560',
    )
  })

  it('brings the map back to the main view for drawing or without the camera', async () => {
    const user = userEvent.setup()
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')
    await user.click(screen.getByRole('button', { name: 'Swap the map and the camera' }))

    act(() => {
      usePlanningStore.getState().setEditMode('mission')
    })
    expect(screen.queryByRole('slider', { name: 'Map window size' })).not.toBeInTheDocument()
    act(() => {
      usePlanningStore.getState().setEditMode(null)
    })
    expect(screen.getByRole('slider', { name: 'Map window size' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Camera' }))
    expect(screen.queryByRole('slider', { name: 'Map window size' })).not.toBeInTheDocument()
  })

  it('names the windows in Ukrainian', async () => {
    useLocaleStore.getState().setLocale('uk')
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')

    expect(screen.getByRole('button', { name: 'Збільшити вікно камери' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Розмір вікна камери' })).toHaveAttribute(
      'aria-valuetext',
      '280 пкс',
    )
    expect(
      screen.getByRole('button', { name: 'Поміняти карту й камеру місцями' }),
    ).toBeInTheDocument()
  })

  it('tells the map whether to show the plans', async () => {
    renderWithStation(<MapPanel showPlanning={false} />)

    expect(await screen.findByText('Plans hidden')).toBeInTheDocument()
  })

  it('explains drawing on the map while a plan is being drawn', async () => {
    renderWithStation(<MapPanel showPlanning />)
    await screen.findByText('Map is free')

    act(() => {
      usePlanningStore.getState().setEditMode('mission')
    })

    expect(screen.getByText(/^Drawing the route/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('shows no drawing help when plans are hidden', async () => {
    renderWithStation(<MapPanel showPlanning={false} />)
    await screen.findByText('Plans hidden')

    act(() => {
      usePlanningStore.getState().setEditMode('mission')
    })

    expect(screen.queryByText(/^Drawing the route/)).not.toBeInTheDocument()
  })
})
