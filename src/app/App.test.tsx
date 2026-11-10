import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithStation } from '../test/render'
import { App } from './App'

describe('App', () => {
  it('shows the station title, the map and the telemetry panel', () => {
    renderWithStation(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Mini GCS' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Map' })).toBeInTheDocument()
    expect(screen.getByRole('complementary', { name: 'Telemetry' })).toBeInTheDocument()
  })

  it('connects to the vehicle on start', () => {
    const { transport } = renderWithStation(<App />)

    expect(transport.getStatus()).toBe('connecting')
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…')
  })

  it('disconnects when the station closes', () => {
    const { transport, unmount } = renderWithStation(<App />)

    unmount()

    expect(transport.getStatus()).toBe('disconnected')
  })
})
