import type {
  HeartbeatMessage,
  HomeMessage,
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
    ...overrides,
  }
}

export function homeMessage(overrides: Partial<HomeMessage> = {}): HomeMessage {
  return { type: 'home', seq: 1, timeMs: 0, lat: 43.095, lon: 11.645, ...overrides }
}
