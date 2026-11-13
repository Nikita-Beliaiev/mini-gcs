import { useMemo, useState } from 'react'
import { usePlanningStore } from '../planning/planningStore'
import { SessionContext, type SessionControls } from '../session/sessionContext'
import {
  createReplaySession,
  type LiveSession,
  type ReplaySession,
  type StationSession,
} from '../session/stationSession'
import type { FlightLog, FlightLogSource } from '../replay/flightLog'
import { GroundStationContext } from '../station/stationContext'
import { TerrainContext } from '../terrain/terrainContext'
import { NO_TERRAIN, type TerrainSampler } from '../terrain/terrainSampler'
import { App } from './App'

interface RootProps {
  live: LiveSession
  createReplay?: (log: FlightLog, source: FlightLogSource) => ReplaySession
  terrain?: TerrainSampler
}

interface ShownSession {
  session: StationSession
  key: number
}

export function Root({
  live,
  createReplay = createReplaySession,
  terrain = NO_TERRAIN,
}: RootProps) {
  const [shown, setShown] = useState<ShownSession>({ session: live, key: 0 })

  const controls = useMemo<SessionControls>(() => {
    function show(session: StationSession): void {
      usePlanningStore.getState().setEditMode(null)
      setShown((current) => ({ session, key: current.key + 1 }))
    }

    return {
      session: shown.session,
      startReplay: (log, source) => {
        show(createReplay(log, source))
      },
      returnToLive: () => {
        show(live)
      },
    }
  }, [shown.session, live, createReplay])

  return (
    <TerrainContext value={terrain}>
      <SessionContext value={controls}>
        <GroundStationContext value={shown.session.station}>
          <App key={shown.key} />
        </GroundStationContext>
      </SessionContext>
    </TerrainContext>
  )
}
