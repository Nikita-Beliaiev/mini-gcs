import type { FlightLog, FlightLogSource } from '../replay/flightLog'
import { createFlightRecorder, type FlightRecorder } from '../replay/flightRecorder'
import {
  createReplayPlayer,
  type ReplayPlayer,
  type ReplayPlayerOptions,
} from '../replay/replayPlayer'
import { createGroundStation, type GroundStation } from '../station/groundStation'
import { createTelemetryStore, type TelemetryStore } from '../telemetry/telemetryStore'
import type { Transport } from '../transport/transport'

export interface LiveSession {
  kind: 'live'
  station: GroundStation
  recorder: FlightRecorder
}

export interface ReplaySession {
  kind: 'replay'
  station: GroundStation
  player: ReplayPlayer
  log: FlightLog
  source: FlightLogSource
}

export type StationSession = LiveSession | ReplaySession

export interface LiveSessionOptions {
  telemetry?: TelemetryStore
  recorder?: FlightRecorder
}

export interface ReplaySessionOptions extends Omit<ReplayPlayerOptions, 'onRewind'> {
  telemetry?: TelemetryStore
}

export function createLiveSession(
  transport: Transport,
  {
    telemetry = createTelemetryStore(),
    recorder = createFlightRecorder(),
  }: LiveSessionOptions = {},
): LiveSession {
  transport.subscribeMessages(recorder.record)
  return { kind: 'live', station: createGroundStation(transport, telemetry), recorder }
}

export function createReplaySession(
  log: FlightLog,
  source: FlightLogSource,
  { telemetry = createTelemetryStore(), ...playerOptions }: ReplaySessionOptions = {},
): ReplaySession {
  const player = createReplayPlayer(log, { ...playerOptions, onRewind: telemetry.reset })
  return {
    kind: 'replay',
    station: createGroundStation(player.transport, telemetry),
    player,
    log,
    source,
  }
}
