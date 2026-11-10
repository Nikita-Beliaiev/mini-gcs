import type {
  CommandAckMessage,
  GeofenceMessage,
  HeartbeatMessage,
  HomeMessage,
  MissionCurrentMessage,
  MissionMessage,
  PositionMessage,
  SystemStatusMessage,
} from '../protocol/telemetry'

export function heartbeatMessage(overrides: Partial<HeartbeatMessage> = {}): HeartbeatMessage {
  return { type: 'heartbeat', seq: 1, timeMs: 0, mode: 'AUTO', armed: true, ...overrides }
}

export function positionMessage(overrides: Partial<PositionMessage> = {}): PositionMessage {
  return {
    type: 'position',
    seq: 1,
    timeMs: 0,
    lat: 43.095,
    lon: 11.645,
    altitudeM: 40,
    groundSpeedMs: 12,
    headingDeg: 90,
    ...overrides,
  }
}

export function systemStatusMessage(
  overrides: Partial<SystemStatusMessage> = {},
): SystemStatusMessage {
  return {
    type: 'systemStatus',
    seq: 1,
    timeMs: 0,
    batteryPercent: 80,
    gpsSatellites: 14,
    gpsFix: '3d',
    linkQualityPercent: 95,
    fenceBreached: false,
    ...overrides,
  }
}

export function homeMessage(overrides: Partial<HomeMessage> = {}): HomeMessage {
  return { type: 'home', seq: 1, timeMs: 0, lat: 43.095, lon: 11.645, ...overrides }
}

export function missionMessage(overrides: Partial<MissionMessage> = {}): MissionMessage {
  return {
    type: 'mission',
    seq: 1,
    timeMs: 0,
    missionId: 1,
    waypoints: [
      { lat: 43.098, lon: 11.646 },
      { lat: 43.096, lon: 11.65 },
    ],
    ...overrides,
  }
}

export function missionCurrentMessage(
  overrides: Partial<MissionCurrentMessage> = {},
): MissionCurrentMessage {
  return { type: 'missionCurrent', seq: 1, timeMs: 0, missionId: 1, waypointIndex: 0, ...overrides }
}

export function geofenceMessage(overrides: Partial<GeofenceMessage> = {}): GeofenceMessage {
  return { type: 'geofence', seq: 1, timeMs: 0, polygon: null, ...overrides }
}

export function commandAckMessage(overrides: Partial<CommandAckMessage> = {}): CommandAckMessage {
  return {
    type: 'commandAck',
    seq: 1,
    timeMs: 0,
    commandId: 1,
    command: 'uploadMission',
    accepted: true,
    reason: null,
    ...overrides,
  }
}
