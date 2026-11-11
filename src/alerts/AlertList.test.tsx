import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { AlertList } from './AlertList'
import { AlertSummary } from './AlertSummary'
import { useAlertStore } from './alertStore'

const LINK_LOST = 'Link lost: no heartbeat for over 3 s'

function raiseAlerts(): void {
  act(() => {
    useAlertStore.getState().applyEvaluation(
      [
        { id: 'linkLost', severity: 'critical' },
        { id: 'batteryLow', severity: 'warning' },
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
    expect(items[0]).toHaveTextContent(`Critical${LINK_LOST}`)
    expect(items[1]).toHaveTextContent('WarningBattery below 35%')
    expect(screen.getByRole('alert')).toHaveTextContent(LINK_LOST)
  })

  it('keeps an acknowledged alert but stops pressing for attention', async () => {
    render(<AlertList />)
    raiseAlerts()

    await userEvent.click(screen.getByRole('button', { name: `Acknowledge: ${LINK_LOST}` }))

    expect(screen.getByText(LINK_LOST)).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: `Acknowledge: ${LINK_LOST}` }),
    ).not.toBeInTheDocument()
  })
})

describe('alerts in Ukrainian', () => {
  it('shows the alerts and the summary in the chosen language', () => {
    useLocaleStore.getState().setLocale('uk')
    render(
      <>
        <AlertSummary />
        <AlertList />
      </>,
    )

    raiseAlerts()

    expect(screen.getByText('2 активні сповіщення')).toBeInTheDocument()
    const items = within(screen.getByRole('region', { name: 'Сповіщення' })).getAllByRole(
      'listitem',
    )
    expect(items[0]).toHaveTextContent('КритичноЗв’язок втрачено: понад 3 с без heartbeat')
    expect(
      screen.getByRole('button', { name: 'Підтвердити: Заряд батареї нижче 35%' }),
    ).toBeInTheDocument()
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
