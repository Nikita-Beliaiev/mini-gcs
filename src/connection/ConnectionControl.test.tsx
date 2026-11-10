import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderWithStation } from '../test/render'
import { useLatencyStore } from './latencyStore'
import { ConnectionControl } from './ConnectionControl'

describe('ConnectionControl', () => {
  it('offers to connect while disconnected', () => {
    renderWithStation(<ConnectionControl />)

    expect(screen.getByRole('status')).toHaveTextContent('Disconnected')
    expect(screen.getByRole('button', { name: 'Connect' })).toBeInTheDocument()
  })

  it('walks through connecting, connected and back to disconnected', async () => {
    const user = userEvent.setup()
    const { transport } = renderWithStation(<ConnectionControl />)

    await user.click(screen.getByRole('button', { name: 'Connect' }))
    expect(screen.getByRole('status')).toHaveTextContent('Connecting…')

    act(() => {
      transport.setStatus('connected')
    })
    expect(screen.getByRole('status')).toHaveTextContent('Connected')

    await user.click(screen.getByRole('button', { name: 'Disconnect' }))
    expect(screen.getByRole('status')).toHaveTextContent('Disconnected')
    expect(transport.getStatus()).toBe('disconnected')
  })
})

describe('ConnectionControl latency', () => {
  it('shows the round-trip time while connected', () => {
    const { transport } = renderWithStation(<ConnectionControl />)

    act(() => {
      transport.setStatus('connected')
      useLatencyStore.getState().setLatency(3.4)
    })

    expect(screen.getByRole('status')).toHaveTextContent('Connected · 3 ms')
  })
})
