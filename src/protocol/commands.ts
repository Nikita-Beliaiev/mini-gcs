import type { LatLon } from '../geo/geo'

export type SimulatedFault = 'linkLoss' | 'gpsLoss' | 'batteryDrop'

export interface UploadMissionCommand {
  type: 'uploadMission'
  waypoints: LatLon[]
}

export interface UploadGeofenceCommand {
  type: 'uploadGeofence'
  polygon: LatLon[]
}

export interface ClearGeofenceCommand {
  type: 'clearGeofence'
}

export interface SimulateFaultCommand {
  type: 'simulateFault'
  fault: SimulatedFault
}

export type Command =
  UploadMissionCommand | UploadGeofenceCommand | ClearGeofenceCommand | SimulateFaultCommand

export type CommandType = Command['type']

export interface CommandEnvelope {
  commandId: number
  command: Command
}
