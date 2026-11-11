import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { renderWithStation } from '../test/render'
import { MapPanel } from './MapPanel'
import type { MapViewProps } from './MapView'

vi.mock('./MapView', () => ({
  default: ({ followVehicle, showPlanning, onUserPan }: MapViewProps) => (
    <div>
      <p>{followVehicle ? 'Map follows the vehicle' : 'Map is free'}</p>
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

  it('tells the map whether to show the plans', async () => {
    renderWithStation(<MapPanel showPlanning={false} />)

    expect(await screen.findByText('Plans hidden')).toBeInTheDocument()
  })
})
