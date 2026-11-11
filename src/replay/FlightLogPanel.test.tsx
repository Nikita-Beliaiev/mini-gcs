import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useLocaleStore } from '../i18n/localeStore'
import { attitudeMessage, heartbeatMessage } from '../test/messages'
import { createTestReplaySession, renderWithSession } from '../test/session'
import { FlightLogPanel } from './FlightLogPanel'

const messages = [
  heartbeatMessage({ timeMs: 0 }),
  ...Array.from({ length: 1500 }, (_, index) => attitudeMessage({ timeMs: index * 50 })),
]

describe('FlightLogPanel', () => {
  it('describes the flight log being replayed', () => {
    const { session } = createTestReplaySession(messages, { kind: 'file', name: 'patrol.json' })

    renderWithSession(<FlightLogPanel />, session)

    const panel = screen.getByRole('region', { name: 'Flight log' })
    expect(panel).toHaveTextContent('Sourcepatrol.json')
    expect(panel).toHaveTextContent('Saved2026-11-11 10:00 UTC')
    expect(panel).toHaveTextContent('Length1:14')
    expect(panel).toHaveTextContent('Messages1,501')
    expect(panel).toHaveTextContent('Commands are not available while replaying a flight.')
  })

  it('describes the recording in Ukrainian', () => {
    useLocaleStore.getState().setLocale('uk')
    const { session } = createTestReplaySession(messages, { kind: 'recording' })

    renderWithSession(<FlightLogPanel />, session)

    const panel = screen.getByRole('region', { name: 'Журнал польоту' })
    expect(panel).toHaveTextContent('ДжерелоЗапис цього сеансу')
    expect(panel).toHaveTextContent('Повідомлень1 501')
    expect(panel).toHaveTextContent('Під час відтворення польоту команди недоступні.')
  })
})
