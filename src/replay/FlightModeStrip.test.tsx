import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { heartbeatMessage } from '../test/messages'
import { createTestReplaySession, renderWithSession } from '../test/session'
import { FlightModeStrip } from './FlightModeStrip'

describe('FlightModeStrip', () => {
  it('lists only the modes that appear in the flight, in mode order', () => {
    const { session } = createTestReplaySession([
      heartbeatMessage({ mode: 'AUTO', timeMs: 0 }),
      heartbeatMessage({ mode: 'AUTO', timeMs: 10_000 }),
      heartbeatMessage({ mode: 'TAKEOFF', timeMs: 11_000 }),
      heartbeatMessage({ mode: 'TAKEOFF', timeMs: 12_000 }),
    ])

    renderWithSession(<FlightModeStrip />, session)

    const labels = screen.getAllByRole('listitem', { hidden: true }).map((item) => item.textContent)
    expect(labels).toEqual(['TAKEOFF', 'AUTO', 'No link'])
  })

  it('shows ArduCopter flight modes from a real autopilot', () => {
    const { session } = createTestReplaySession([
      heartbeatMessage({ mode: 'STABILIZE', timeMs: 0 }),
      heartbeatMessage({ mode: 'GUIDED', timeMs: 1000 }),
      heartbeatMessage({ mode: 'AUTO', timeMs: 2000 }),
      heartbeatMessage({ mode: 'LOITER', timeMs: 3000 }),
      heartbeatMessage({ mode: 'LOITER', timeMs: 4000 }),
    ])

    renderWithSession(<FlightModeStrip />, session)

    const labels = screen.getAllByRole('listitem', { hidden: true }).map((item) => item.textContent)
    expect(labels).toEqual(['STABILIZE', 'AUTO', 'GUIDED', 'LOITER'])
  })
})
