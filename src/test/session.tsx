import { render } from '@testing-library/react'
import type { ReactElement } from 'react'
import { vi } from 'vitest'
import type { TelemetryMessage } from '../protocol/telemetry'
import { createFlightLog, type FlightLogSource } from '../replay/flightLog'
import { SessionContext, type SessionControls } from '../session/sessionContext'
import {
  createLiveSession,
  createReplaySession,
  type StationSession,
} from '../session/stationSession'
import { GroundStationContext } from '../station/stationContext'
import { createFakeTransport } from './fakeTransport'
import { createFakeFrames } from './frames'
import { telemetryStoreWithoutFrames } from './station'

export const TEST_LOG_SAVED_AT = new Date('2026-11-11T10:00:00.000Z')

export function createTestLiveSession() {
  const transport = createFakeTransport()
  const session = createLiveSession(transport, { telemetry: telemetryStoreWithoutFrames() })
  return { session, transport }
}

export function createTestReplaySession(
  messages: readonly TelemetryMessage[],
  source: FlightLogSource = { kind: 'file', name: 'flight.json' },
) {
  const frames = createFakeFrames()
  const session = createReplaySession(createFlightLog(messages, TEST_LOG_SAVED_AT), source, {
    telemetry: telemetryStoreWithoutFrames(),
    now: frames.now,
    scheduleFrame: frames.scheduleFrame,
  })
  return { session, runFrameAfter: frames.runFrameAfter }
}

export function renderWithSession(ui: ReactElement, session: StationSession) {
  const startReplay = vi.fn<SessionControls['startReplay']>()
  const returnToLive = vi.fn<SessionControls['returnToLive']>()
  const result = render(
    <SessionContext value={{ session, startReplay, returnToLive }}>
      <GroundStationContext value={session.station}>{ui}</GroundStationContext>
    </SessionContext>,
  )
  return { ...result, startReplay, returnToLive }
}
