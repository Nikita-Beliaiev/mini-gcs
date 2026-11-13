import { z } from 'zod'
import { latLonSchema, pointListSchema } from './shared'

export const commandTypeSchema = z.enum([
  'uploadMission',
  'uploadGeofence',
  'clearGeofence',
  'simulateFault',
  'ping',
  'pointCamera',
  'lookAtPoint',
])

export const simulatedFaultSchema = z.enum(['linkLoss', 'gpsLoss', 'batteryDrop'])

const uploadMissionCommandSchema = z.object({
  type: z.literal('uploadMission'),
  waypoints: pointListSchema,
})

const uploadGeofenceCommandSchema = z.object({
  type: z.literal('uploadGeofence'),
  polygon: pointListSchema,
})

const clearGeofenceCommandSchema = z.object({
  type: z.literal('clearGeofence'),
})

const simulateFaultCommandSchema = z.object({
  type: z.literal('simulateFault'),
  fault: simulatedFaultSchema,
})

const pingCommandSchema = z.object({
  type: z.literal('ping'),
})

const pointCameraCommandSchema = z.object({
  type: z.literal('pointCamera'),
  tiltDeg: z.number().min(-90).max(0),
  panDeg: z.number().min(-180).max(180),
})

const lookAtPointCommandSchema = z.object({
  type: z.literal('lookAtPoint'),
  ...latLonSchema.shape,
  altitudeM: z.number(),
})

export const commandSchema = z.discriminatedUnion('type', [
  uploadMissionCommandSchema,
  uploadGeofenceCommandSchema,
  clearGeofenceCommandSchema,
  simulateFaultCommandSchema,
  pingCommandSchema,
  pointCameraCommandSchema,
  lookAtPointCommandSchema,
])

export const commandEnvelopeSchema = z.object({
  commandId: z.number().int(),
  command: commandSchema,
})

export type SimulatedFault = z.infer<typeof simulatedFaultSchema>
export type UploadMissionCommand = z.infer<typeof uploadMissionCommandSchema>
export type UploadGeofenceCommand = z.infer<typeof uploadGeofenceCommandSchema>
export type ClearGeofenceCommand = z.infer<typeof clearGeofenceCommandSchema>
export type SimulateFaultCommand = z.infer<typeof simulateFaultCommandSchema>
export type PingCommand = z.infer<typeof pingCommandSchema>
export type PointCameraCommand = z.infer<typeof pointCameraCommandSchema>
export type LookAtPointCommand = z.infer<typeof lookAtPointCommandSchema>
export type Command = z.infer<typeof commandSchema>
export type CommandType = z.infer<typeof commandTypeSchema>
export type CommandEnvelope = z.infer<typeof commandEnvelopeSchema>

export function parseCommandEnvelope(data: unknown): CommandEnvelope | null {
  const result = commandEnvelopeSchema.safeParse(data)
  return result.success ? result.data : null
}
