import { createContext, useContext } from 'react'
import type { FlightLog, FlightLogSource } from '../replay/flightLog'
import type { LiveSession, ReplaySession, StationSession } from './stationSession'

export interface SessionControls {
  session: StationSession
  startReplay: (log: FlightLog, source: FlightLogSource) => void
  returnToLive: () => void
}

export const SessionContext = createContext<SessionControls | null>(null)

export function useSession(): SessionControls {
  const controls = useContext(SessionContext)
  if (!controls) {
    throw new Error('useSession must be used inside SessionContext')
  }
  return controls
}

export function useLiveSession(): LiveSession {
  const { session } = useSession()
  if (session.kind !== 'live') {
    throw new Error('useLiveSession must be used in a live session')
  }
  return session
}

export function useReplaySession(): ReplaySession {
  const { session } = useSession()
  if (session.kind !== 'replay') {
    throw new Error('useReplaySession must be used in a replay session')
  }
  return session
}
