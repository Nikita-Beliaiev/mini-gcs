import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { attitudeMessage, heartbeatMessage } from '../test/messages'
import { createTestReplaySession, renderWithSession } from '../test/session'
import { FlightLogPanel } from './FlightLogPanel'

describe('FlightLogPanel', () => {
  it('describes the flight log being replayed', () => {
    const messages = [
      heartbeatMessage({ timeMs: 0 }),
      ...Array.from({ length: 1500 }, (_, index) => attitudeMessage({ timeMs: index * 50 })),
    ]
    const { session } = createTestReplaySession(messages, 'patrol.json')

    renderWithSession(<FlightLogPanel />, session)

    const panel = screen.getByRole('region', { name: 'Flight log' })
    expect(panel).toHaveTextContent('Sourcepatrol.json')
    expect(panel).toHaveTextContent('Saved2026-11-11 10:00 UTC')
    expect(panel).toHaveTextContent('Length1:14')
    expect(panel).toHaveTextContent('Messages1,501')
    expect(panel).toHaveTextContent('Commands are not available while replaying a flight.')
  })
})
