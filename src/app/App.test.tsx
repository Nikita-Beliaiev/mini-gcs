import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { App } from './App'

describe('App', () => {
  it('shows the station title and a disconnected link status', () => {
    render(<App />)

    expect(screen.getByRole('heading', { level: 1, name: 'Mini GCS' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Disconnected')
  })

  it('renders every telemetry readout with an empty value', () => {
    render(<App />)

    const telemetry = screen.getByRole('complementary', { name: 'Telemetry' })
    const labels = within(telemetry)
      .getAllByRole('term')
      .map((term) => term.textContent)

    expect(labels).toEqual([
      'Altitude',
      'Ground speed',
      'Heading',
      'Battery',
      'GPS satellites',
      'Link quality',
    ])

    for (const value of within(telemetry).getAllByRole('definition')) {
      expect(value).toHaveTextContent(/^—/)
    }
  })
})
