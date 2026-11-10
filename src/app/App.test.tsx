import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithStation } from '../test/render'
import { App } from './App'

vi.mock('../map/MapView', () => ({
  default: () => <p>Map view</p>,
}))

vi.mock('../charts/TimeSeriesChart', () => ({
  default: () => <figure>Chart</figure>,
}))

describe('App', () => {
  it('shows the station title, the map and the telemetry panel', async () => {
    renderWithStation(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Mini GCS' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Map' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Telemetry' })).toBeInTheDocument()
    expect(await screen.findByText('Map view')).toBeInTheDocument()
  })

  it('connects to the vehicle on start', async () => {
    const { transport } = renderWithStation(<App />)
    await screen.findByText('Map view')

    expect(transport.getStatus()).toBe('connecting')
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…')
  })

  it('disconnects when the station closes', async () => {
    const { transport, unmount } = renderWithStation(<App />)
    await screen.findByText('Map view')

    unmount()

    expect(transport.getStatus()).toBe('disconnected')
  })
})
