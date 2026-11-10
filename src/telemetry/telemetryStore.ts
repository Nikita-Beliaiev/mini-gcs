import type {
  AttitudeMessage,
  GeofenceMessage,
  HeartbeatMessage,
  HomeMessage,
  MissionCurrentMessage,
  MissionMessage,
  PositionMessage,
  SystemStatusMessage,
  TelemetryMessage,
} from '../protocol/telemetry'
import { createEmitter } from '../shared/emitter'
import { RingBuffer } from './ringBuffer'

export interface TelemetryState {
  heartbeat: HeartbeatMessage | null
  position: PositionMessage | null
  attitude: AttitudeMessage | null
  systemStatus: SystemStatusMessage | null
  home: HomeMessage | null
  mission: MissionMessage | null
  missionCurrent: MissionCurrentMessage | null
  geofence: GeofenceMessage | null
}

export interface TelemetryStore {
  push: (message: TelemetryMessage) => void
  reset: () => void
  getSnapshot: () => TelemetryState
  getPositionHistory: () => readonly PositionMessage[]
  getStatusHistory: () => readonly SystemStatusMessage[]
  subscribe: (listener: () => void) => () => void
}

export interface TelemetryStoreOptions {
  historySize?: number
  statusHistorySize?: number
  scheduleFrame?: (callback: () => void) => void
}

const DEFAULT_HISTORY_SIZE = 1200
const DEFAULT_STATUS_HISTORY_SIZE = 240

export const EMPTY_TELEMETRY_STATE: TelemetryState = {
  heartbeat: null,
  position: null,
  attitude: null,
  systemStatus: null,
  home: null,
  mission: null,
  missionCurrent: null,
  geofence: null,
}

function scheduleAnimationFrame(callback: () => void): void {
  requestAnimationFrame(callback)
}

function applyMessage(state: TelemetryState, message: TelemetryMessage): TelemetryState {
  switch (message.type) {
    case 'heartbeat':
      return { ...state, heartbeat: message }
    case 'position':
      return { ...state, position: message }
    case 'attitude':
      return { ...state, attitude: message }
    case 'systemStatus':
      return { ...state, systemStatus: message }
    case 'home':
      return { ...state, home: message }
    case 'mission':
      return { ...state, mission: message }
    case 'missionCurrent':
      return { ...state, missionCurrent: message }
    case 'geofence':
      return { ...state, geofence: message }
    case 'commandAck':
      return state
  }
}

export function createTelemetryStore({
  historySize = DEFAULT_HISTORY_SIZE,
  statusHistorySize = DEFAULT_STATUS_HISTORY_SIZE,
  scheduleFrame = scheduleAnimationFrame,
}: TelemetryStoreOptions = {}): TelemetryStore {
  const changes = createEmitter()
  const positionHistory = new RingBuffer<PositionMessage>(historySize)
  const statusHistory = new RingBuffer<SystemStatusMessage>(statusHistorySize)
  let latest = EMPTY_TELEMETRY_STATE
  let published = EMPTY_TELEMETRY_STATE
  let flushScheduled = false

  function flush(): void {
    flushScheduled = false
    published = latest
    changes.emit()
  }

  function scheduleFlush(): void {
    if (flushScheduled) {
      return
    }
    flushScheduled = true
    scheduleFrame(flush)
  }

  return {
    push(message) {
      latest = applyMessage(latest, message)
      if (message.type === 'position') {
        positionHistory.push(message)
      }
      if (message.type === 'systemStatus') {
        statusHistory.push(message)
      }
      scheduleFlush()
    },
    reset() {
      latest = EMPTY_TELEMETRY_STATE
      positionHistory.clear()
      statusHistory.clear()
      scheduleFlush()
    },
    getSnapshot: () => published,
    getPositionHistory: () => positionHistory.toArray(),
    getStatusHistory: () => statusHistory.toArray(),
    subscribe: changes.subscribe,
  }
}
