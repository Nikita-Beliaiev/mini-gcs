import { normalizeDegrees, toDegrees, type LatLon } from '../geo/geo'
import type { FlightMode } from '../protocol/flightModes'
import type { GpsFix, TelemetryMessage } from '../protocol/telemetry'
import { arduCopterModeName } from './arduCopterModes'
import { decodeFrame, type MavlinkFrame } from './frame'
import type { MavlinkMessage, MissionItemInt } from './messages'

const MAV_TYPE_GCS = 6
const MAV_AUTOPILOT_INVALID = 8
const MAV_AUTOPILOT_ARDUPILOTMEGA = 3
const COPTER_TYPES = new Set([2, 3, 4, 13, 14, 15, 29])
const MAV_MODE_FLAG_SAFETY_ARMED = 0x80
const MISSION_TYPE_MISSION = 0
const MISSION_TYPE_FENCE = 1
const MISSION_ACCEPTED = 0
const NAV_COMMANDS_WITH_POSITION = new Set([16, 17, 18, 19, 21, 31, 82])
const FENCE_POLYGON_INCLUSION_VERTEX = 5001
const UNKNOWN_HEADING = 65535
const UNKNOWN_SATELLITES = 255
const MAX_WAYPOINTS = 100
const LINK_WINDOW_MS = 2000

type TelemetryBody = TelemetryMessage extends infer Message
  ? Message extends TelemetryMessage
    ? Omit<Message, 'seq' | 'timeMs'>
    : never
  : never

interface Transfer {
  from: number
  missionType: number
  count: number
  items: Map<number, MissionItemInt>
}

interface ClearRequest {
  from: number
  missionType: number
}

interface LinkSample {
  timeMs: number
  lost: number
}

export interface MavlinkTranslator {
  translate: (frame: MavlinkFrame, timeMs: number) => TelemetryMessage[]
}

function toLatLon(lat: number, lon: number): LatLon | null {
  const point = { lat: lat / 1e7, lon: lon / 1e7 }
  if (lat === 0 && lon === 0) {
    return null
  }
  if (Math.abs(point.lat) > 90 || Math.abs(point.lon) > 180) {
    return null
  }
  return point
}

function gpsFixFor(fixType: number): GpsFix {
  if (fixType >= 3) {
    return '3d'
  }
  return fixType === 2 ? '2d' : 'none'
}

function flightModeFor(autopilot: number, vehicleType: number, customMode: number): FlightMode {
  return autopilot === MAV_AUTOPILOT_ARDUPILOTMEGA && COPTER_TYPES.has(vehicleType)
    ? arduCopterModeName(customMode)
    : 'UNKNOWN'
}

function sortedItems(transfer: Transfer): MissionItemInt[] {
  return [...transfer.items.values()].sort((first, second) => first.seq - second.seq)
}

function missionRoute(items: readonly MissionItemInt[]): {
  waypoints: LatLon[]
  sequences: number[]
} {
  const waypoints: LatLon[] = []
  const sequences: number[] = []
  for (const item of items) {
    const point = toLatLon(item.x, item.y)
    if (item.seq === 0 || !point || !NAV_COMMANDS_WITH_POSITION.has(item.command)) {
      continue
    }
    if (waypoints.length < MAX_WAYPOINTS) {
      waypoints.push(point)
      sequences.push(item.seq)
    }
  }
  return { waypoints, sequences }
}

function fencePolygon(items: readonly MissionItemInt[]): LatLon[] | null {
  const vertices = items.filter((item) => item.command === FENCE_POLYGON_INCLUSION_VERTEX)
  const vertexCount = Math.round(vertices[0]?.param1 ?? 0)
  const polygon = vertices
    .slice(0, vertexCount)
    .map((item) => toLatLon(item.x, item.y))
    .filter((point) => point !== null)
  return polygon.length >= 3 && polygon.length <= MAX_WAYPOINTS ? polygon : null
}

export function createMavlinkTranslator(): MavlinkTranslator {
  let vehicle: { systemId: number; componentId: number } | null = null
  let sequence = 0
  let missionId = 0
  let missionSequences: number[] = []
  let transfer: Transfer | null = null
  let clearRequest: ClearRequest | null = null
  let lastFrameSequence: number | null = null
  const linkSamples: LinkSample[] = []
  let batteryPercent: number | null = null
  let gpsSatellites = 0
  let gpsFix: GpsFix = 'none'
  let fenceBreached = false
  let yawDeg = 0

  function stamp(body: TelemetryBody, timeMs: number): TelemetryMessage {
    sequence += 1
    return { ...body, seq: sequence, timeMs }
  }

  function linkQualityPercent(timeMs: number): number {
    while (linkSamples.length > 0 && (linkSamples[0]?.timeMs ?? timeMs) < timeMs - LINK_WINDOW_MS) {
      linkSamples.shift()
    }
    const lost = linkSamples.reduce((total, sample) => total + sample.lost, 0)
    const received = linkSamples.length
    return received === 0 ? 0 : Math.round((received / (received + lost)) * 100)
  }

  function trackLink(frame: MavlinkFrame, timeMs: number): void {
    const lost = lastFrameSequence === null ? 0 : (frame.sequence - lastFrameSequence - 1) & 0xff
    lastFrameSequence = frame.sequence
    linkSamples.push({ timeMs, lost })
  }

  function commitTransfer(finished: Transfer): TelemetryBody[] {
    const items = sortedItems(finished)
    if (finished.missionType === MISSION_TYPE_MISSION) {
      const route = missionRoute(items)
      missionId += 1
      missionSequences = route.sequences
      return [{ type: 'mission', missionId, waypoints: route.waypoints }]
    }
    if (finished.missionType === MISSION_TYPE_FENCE) {
      return [{ type: 'geofence', polygon: fencePolygon(items) }]
    }
    return []
  }

  function commitClear(missionType: number): TelemetryBody[] {
    if (missionType === MISSION_TYPE_MISSION) {
      missionId += 1
      missionSequences = []
      return [{ type: 'mission', missionId, waypoints: [] }]
    }
    return missionType === MISSION_TYPE_FENCE ? [{ type: 'geofence', polygon: null }] : []
  }

  function handleMissionTraffic(
    message: MavlinkMessage,
    senderId: number,
    vehicleId: number,
  ): TelemetryBody[] {
    switch (message.name) {
      case 'MISSION_COUNT': {
        if (senderId === vehicleId || message.targetSystem === vehicleId) {
          transfer = {
            from: senderId,
            missionType: message.missionType,
            count: message.count,
            items: new Map(),
          }
        }
        return []
      }
      case 'MISSION_ITEM_INT': {
        if (transfer?.from === senderId && transfer.missionType === message.missionType) {
          transfer.items.set(message.seq, message)
        }
        return []
      }
      case 'MISSION_CLEAR_ALL': {
        if (message.targetSystem === vehicleId) {
          clearRequest = { from: senderId, missionType: message.missionType }
        }
        return []
      }
      case 'MISSION_ACK': {
        const accepted = message.type === MISSION_ACCEPTED
        if (
          transfer &&
          transfer.from !== senderId &&
          transfer.missionType === message.missionType
        ) {
          const finished = transfer
          transfer = null
          return accepted && finished.items.size === finished.count ? commitTransfer(finished) : []
        }
        if (clearRequest && clearRequest.from !== senderId) {
          const { missionType } = clearRequest
          clearRequest = null
          return accepted && missionType === message.missionType ? commitClear(missionType) : []
        }
        return []
      }
      default:
        return []
    }
  }

  function handleVehicleMessage(message: MavlinkMessage, timeMs: number): TelemetryBody[] {
    switch (message.name) {
      case 'HEARTBEAT':
        return [
          {
            type: 'heartbeat',
            mode: flightModeFor(message.autopilot, message.type, message.customMode),
            armed: (message.baseMode & MAV_MODE_FLAG_SAFETY_ARMED) !== 0,
          },
        ]
      case 'GLOBAL_POSITION_INT': {
        const point = toLatLon(message.lat, message.lon)
        if (!point) {
          return []
        }
        return [
          {
            type: 'position',
            ...point,
            altitudeM: message.relativeAlt / 1000,
            groundSpeedMs: Math.hypot(message.vx, message.vy) / 100,
            headingDeg: message.hdg === UNKNOWN_HEADING ? yawDeg : message.hdg / 100,
          },
        ]
      }
      case 'ATTITUDE':
        yawDeg = normalizeDegrees(toDegrees(message.yaw))
        return [
          {
            type: 'attitude',
            rollDeg: toDegrees(message.roll),
            pitchDeg: toDegrees(message.pitch),
            yawDeg,
          },
        ]
      case 'GPS_RAW_INT':
        gpsSatellites =
          message.satellitesVisible === UNKNOWN_SATELLITES ? 0 : message.satellitesVisible
        gpsFix = gpsFixFor(message.fixType)
        return []
      case 'FENCE_STATUS':
        fenceBreached = message.breachStatus !== 0
        return []
      case 'SYS_STATUS':
        if (message.batteryRemaining >= 0) {
          batteryPercent = message.batteryRemaining
        }
        return [
          {
            type: 'systemStatus',
            batteryPercent: batteryPercent ?? 100,
            gpsSatellites,
            gpsFix,
            linkQualityPercent: linkQualityPercent(timeMs),
            fenceBreached,
          },
        ]
      case 'HOME_POSITION': {
        const point = toLatLon(message.latitude, message.longitude)
        return point ? [{ type: 'home', ...point }] : []
      }
      case 'MISSION_CURRENT': {
        const waypointIndex = missionSequences.findIndex((seq) => seq >= message.seq)
        return missionId > 0 && waypointIndex >= 0
          ? [{ type: 'missionCurrent', missionId, waypointIndex }]
          : []
      }
      default:
        return []
    }
  }

  function translate(frame: MavlinkFrame, timeMs: number): TelemetryMessage[] {
    const message = decodeFrame(frame)
    if (!vehicle) {
      if (
        message?.name !== 'HEARTBEAT' ||
        message.type === MAV_TYPE_GCS ||
        message.autopilot === MAV_AUTOPILOT_INVALID
      ) {
        return []
      }
      vehicle = { systemId: frame.systemId, componentId: frame.componentId }
    }

    const fromVehicle =
      frame.systemId === vehicle.systemId && frame.componentId === vehicle.componentId
    if (fromVehicle) {
      trackLink(frame, timeMs)
    }
    if (!message) {
      return []
    }

    const bodies = [
      ...handleMissionTraffic(message, frame.systemId, vehicle.systemId),
      ...(fromVehicle ? handleVehicleMessage(message, timeMs) : []),
    ]
    return bodies.map((body) => stamp(body, timeMs))
  }

  return { translate }
}
