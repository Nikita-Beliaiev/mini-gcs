import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { commandAckMessage } from '../test/messages'
import { renderWithStation } from '../test/render'
import { FaultPanel } from './FaultPanel'

describe('FaultPanel', () => {
  it('offers the simulated faults only while connected', () => {
    const { transport } = renderWithStation(<FaultPanel />)

    expect(screen.getByRole('button', { name: 'Drop the link for 10 s' })).toBeDisabled()

    act(() => {
      transport.setStatus('connected')
    })

    expect(screen.getByRole('button', { name: 'Drop the link for 10 s' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Lose GPS for 15 s' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Drain the battery to 32%' })).toBeEnabled()
  })

  it('asks the simulator for the fault and confirms it started', async () => {
    const { transport } = renderWithStation(<FaultPanel />)
    act(() => {
      transport.setStatus('connected')
    })

    await userEvent.click(screen.getByRole('button', { name: 'Lose GPS for 15 s' }))
    await act(async () => {
      transport.receive(commandAckMessage({ commandId: 1, command: 'simulateFault' }))
      await Promise.resolve()
    })

    expect(transport.sent[0]?.command).toEqual({ type: 'simulateFault', fault: 'gpsLoss' })
    expect(screen.getByText('Started: Lose GPS for 15 s')).toBeInTheDocument()
  })
})
