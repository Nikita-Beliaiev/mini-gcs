import { z } from 'zod'
import { commandTypeSchema } from './commands'
import { latLonSchema, pointListSchema } from './shared'

export const flightModeSchema = z.enum(['STANDBY', 'TAKEOFF', 'AUTO', 'RTL', 'LAND'])

export const gpsFixSchema = z.enum(['none', '2d', '3d'])

const header = {
  seq: z.number().int(),
  timeMs: z.number(),
}

const heartbeatMessageSchema = z.object({
  type: z.literal('heartbeat'),
  ...header,
  mode: flightModeSchema,
  armed: z.boolean(),
})

const positionMessageSchema = z.object({
  type: z.literal('position'),
  ...header,
  ...latLonSchema.shape,
  altitudeM: z.number(),
  groundSpeedMs: z.number(),
  headingDeg: z.number(),
})

const attitudeMessageSchema = z.object({
  type: z.literal('attitude'),
  ...header,
  rollDeg: z.number(),
  pitchDeg: z.number(),
  yawDeg: z.number(),
})

const systemStatusMessageSchema = z.object({
  type: z.literal('systemStatus'),
  ...header,
  batteryPercent: z.number(),
  gpsSatellites: z.number().int(),
  gpsFix: gpsFixSchema,
  linkQualityPercent: z.number(),
  fenceBreached: z.boolean(),
})

const homeMessageSchema = z.object({
  type: z.literal('home'),
  ...header,
  ...latLonSchema.shape,
})

const missionMessageSchema = z.object({
  type: z.literal('mission'),
  ...header,
  missionId: z.number().int(),
  waypoints: pointListSchema,
})

const missionCurrentMessageSchema = z.object({
  type: z.literal('missionCurrent'),
  ...header,
  missionId: z.number().int(),
  waypointIndex: z.number().int(),
})

const geofenceMessageSchema = z.object({
  type: z.literal('geofence'),
  ...header,
  polygon: pointListSchema.nullable(),
})

const commandAckMessageSchema = z.object({
  type: z.literal('commandAck'),
  ...header,
  commandId: z.number().int(),
  command: commandTypeSchema,
  accepted: z.boolean(),
  reason: z.string().nullable(),
})

export const telemetryMessageSchema = z.discriminatedUnion('type', [
  heartbeatMessageSchema,
  positionMessageSchema,
  attitudeMessageSchema,
  systemStatusMessageSchema,
  homeMessageSchema,
  missionMessageSchema,
  missionCurrentMessageSchema,
  geofenceMessageSchema,
  commandAckMessageSchema,
])

export type FlightMode = z.infer<typeof flightModeSchema>
export type GpsFix = z.infer<typeof gpsFixSchema>
export type HeartbeatMessage = z.infer<typeof heartbeatMessageSchema>
export type PositionMessage = z.infer<typeof positionMessageSchema>
export type AttitudeMessage = z.infer<typeof attitudeMessageSchema>
export type SystemStatusMessage = z.infer<typeof systemStatusMessageSchema>
export type HomeMessage = z.infer<typeof homeMessageSchema>
export type MissionMessage = z.infer<typeof missionMessageSchema>
export type MissionCurrentMessage = z.infer<typeof missionCurrentMessageSchema>
export type GeofenceMessage = z.infer<typeof geofenceMessageSchema>
export type CommandAckMessage = z.infer<typeof commandAckMessageSchema>
export type TelemetryMessage = z.infer<typeof telemetryMessageSchema>
export type TelemetryMessageType = TelemetryMessage['type']

export function parseTelemetryMessage(data: unknown): TelemetryMessage | null {
  const result = telemetryMessageSchema.safeParse(data)
  return result.success ? result.data : null
}
