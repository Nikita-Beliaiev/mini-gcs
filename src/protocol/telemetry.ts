import type { LatLon } from '../geo/geo'
import type { CommandType } from './commands'

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
  fenceBreached: boolean
}

export interface HomeMessage extends MessageHeader {
  type: 'home'
  lat: number
  lon: number
}

export interface MissionMessage extends MessageHeader {
  type: 'mission'
  missionId: number
  waypoints: LatLon[]
}

export interface MissionCurrentMessage extends MessageHeader {
  type: 'missionCurrent'
  missionId: number
  waypointIndex: number
}

export interface GeofenceMessage extends MessageHeader {
  type: 'geofence'
  polygon: LatLon[] | null
}

export interface CommandAckMessage extends MessageHeader {
  type: 'commandAck'
  commandId: number
  command: CommandType
  accepted: boolean
  reason: string | null
}

export type TelemetryMessage =
  | HeartbeatMessage
  | PositionMessage
  | SystemStatusMessage
  | HomeMessage
  | MissionMessage
  | MissionCurrentMessage
  | GeofenceMessage
  | CommandAckMessage

export type TelemetryMessageType = TelemetryMessage['type']
