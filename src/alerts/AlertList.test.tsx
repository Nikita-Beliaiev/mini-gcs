import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { AlertList } from './AlertList'
import { AlertSummary } from './AlertSummary'
import { useAlertStore } from './alertStore'

function raiseAlerts(): void {
  act(() => {
    useAlertStore.getState().applyEvaluation(
      [
        { id: 'linkLost', severity: 'critical', message: 'Link lost' },
        { id: 'batteryLow', severity: 'warning', message: 'Battery below 35%' },
      ],
      0,
    )
  })
}

describe('AlertList', () => {
  it('shows nothing while all is well', () => {
    render(<AlertList />)

    expect(screen.getByRole('region', { name: 'Alerts' })).toBeEmptyDOMElement()
  })

  it('lists active alerts with their severity and announces critical ones', () => {
    render(<AlertList />)

    raiseAlerts()

    const items = within(screen.getByRole('region', { name: 'Alerts' })).getAllByRole('listitem')
    expect(items[0]).toHaveTextContent('CriticalLink lost')
    expect(items[1]).toHaveTextContent('WarningBattery below 35%')
    expect(screen.getByRole('alert')).toHaveTextContent('Link lost')
  })

  it('keeps an acknowledged alert but stops pressing for attention', async () => {
    render(<AlertList />)
    raiseAlerts()

    await userEvent.click(screen.getByRole('button', { name: 'Acknowledge: Link lost' }))

    expect(screen.getByText('Link lost')).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Acknowledge: Link lost' })).not.toBeInTheDocument()
  })
})

describe('AlertSummary', () => {
  it('counts the active alerts', () => {
    render(<AlertSummary />)
    expect(screen.getByText('No active alerts')).toBeInTheDocument()

    raiseAlerts()

    expect(screen.getByText('2 active alerts')).toBeInTheDocument()
  })
})
