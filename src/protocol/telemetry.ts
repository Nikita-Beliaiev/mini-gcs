export type FlightMode = 'STANDBY' | 'TAKEOFF' | 'AUTO' | 'RTL' | 'LAND'

export type GpsFix = 'none' | '2d' | '3d'

interface MessageHeader {
  seq: number
  timeMs: number
}

export interface HeartbeatMessage extends MessageHeader {
  type: 'heartbeat'
  mode: FlightMode
  armed: boolean
}

export interface PositionMessage extends MessageHeader {
  type: 'position'
  lat: number
  lon: number
  altitudeM: number
  groundSpeedMs: number
  headingDeg: number
}

export interface SystemStatusMessage extends MessageHeader {
  type: 'systemStatus'
  batteryPercent: number
  gpsSatellites: number
  gpsFix: GpsFix
  linkQualityPercent: number
}

export interface HomeMessage extends MessageHeader {
  type: 'home'
  lat: number
  lon: number
}

export type TelemetryMessage =
  HeartbeatMessage | PositionMessage | SystemStatusMessage | HomeMessage

export type TelemetryMessageType = TelemetryMessage['type']
