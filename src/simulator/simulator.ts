import {
  bearingDegrees,
  destinationPoint,
  distanceMeters,
  isPointInPolygon,
  signedAngleDifference,
  toDegrees,
  toRadians,
  type LatLon,
} from '../geo/geo'
import { en } from '../i18n/en'
import { MISSION_ALTITUDE_M, validateGeofence, validateMission } from '../mission/missionRules'
import { describePlanIssue } from '../mission/planIssueText'
import type { CommandEnvelope, SimulatedFault } from '../protocol/commands'
import type { SimulatorFlightMode } from '../protocol/flightModes'
import type { GpsFix, TelemetryMessage } from '../protocol/telemetry'
import { clamp } from '../shared/math'
import { approach, tiltForMotion, turnToward, type Tilt } from './motion'
import { createRandom, randomBetween } from './random'

export interface SimulatorConfig {
  home: LatLon
  defaultMission: readonly LatLon[]
  seed: number
}

export interface Simulator {
  step: (dtMs: number) => TelemetryMessage[]
  handleCommand: (envelope: CommandEnvelope) => TelemetryMessage[]
}

const CRUISE_SPEED_MS = 12
const ACCELERATION_MS2 = 2
const MAX_TURN_RATE_DEG_S = 60
const CLIMB_RATE_MS = 3
const DESCENT_RATE_MS = 1.5
const WAYPOINT_RADIUS_M = 10
const HOME_RADIUS_M = 2

const STANDBY_DURATION_MS = 5000
const BATTERY_DRAIN_PERCENT_PER_S = 0.15
const RTL_BATTERY_PERCENT = 30

const GPS_UPDATE_INTERVAL_MS = 1000
const GPS_MIN_SATELLITES = 11
const GPS_MAX_SATELLITES = 17
const GPS_JITTER_M = 0.3

const LINK_RANGE_M = 5000
const LINK_NOISE_PERCENT = 2

const TILT_RATE_DEG_S = 90
const VIBRATION_DEG = 0.3
const LEVEL: Tilt = { rollDeg: 0, pitchDeg: 0 }

const LINK_LOSS_DURATION_MS = 10_000
const GPS_LOSS_DURATION_MS = 15_000
const GPS_LOSS_SATELLITES = 2
const BATTERY_DROP_PERCENT = 32

const CAMERA_VERTICAL_FOV_DEG = 36.87
const CAMERA_ASPECT = 16 / 9
const CAMERA_HORIZONTAL_FOV_DEG = toDegrees(
  2 * Math.atan(CAMERA_ASPECT * Math.tan(toRadians(CAMERA_VERTICAL_FOV_DEG / 2))),
)
const DEFAULT_CAMERA_TILT_DEG = -15
const GIMBAL_RATE_DEG_S = 90

type ScheduledMessageType = Exclude<TelemetryMessage['type'], 'commandAck'>

const MESSAGE_SCHEDULE: readonly { type: ScheduledMessageType; intervalMs: number }[] = [
  { type: 'heartbeat', intervalMs: 1000 },
  { type: 'home', intervalMs: 5000 },
  { type: 'mission', intervalMs: 5000 },
  { type: 'missionCurrent', intervalMs: 1000 },
  { type: 'geofence', intervalMs: 5000 },
  { type: 'systemStatus', intervalMs: 500 },
  { type: 'position', intervalMs: 100 },
  { type: 'camera', intervalMs: 100 },
  { type: 'attitude', intervalMs: 20 },
]

interface VehicleState {
  mode: SimulatorFlightMode
  modeStartedAtMs: number
  armed: boolean
  position: LatLon
  altitudeM: number
  headingDeg: number
  groundSpeedMs: number
  rollDeg: number
  pitchDeg: number
  batteryPercent: number
  gpsSatellites: number
  waypointIndex: number
}

interface Mission {
  id: number
  waypoints: readonly LatLon[]
}

interface CameraAngles {
  tiltDeg: number
  panDeg: number
}

type CameraAim =
  | { kind: 'angles'; tiltDeg: number; panDeg: number }
  | { kind: 'point'; point: LatLon; altitudeM: number }

interface Guidance {
  target: LatLon | null
  altitudeM: number
  speedMs: number
}

export function gpsFixFor(satellites: number): GpsFix {
  if (satellites >= 6) {
    return '3d'
  }
  if (satellites >= 4) {
    return '2d'
  }
  return 'none'
}

export function createSimulator({ home, defaultMission, seed }: SimulatorConfig): Simulator {
  if (validateMission(defaultMission, home, null).length > 0) {
    throw new Error('Default mission is not valid')
  }

  const random = createRandom(seed)
  const vehicle: VehicleState = {
    mode: 'STANDBY',
    modeStartedAtMs: 0,
    armed: false,
    position: home,
    altitudeM: 0,
    headingDeg: 0,
    groundSpeedMs: 0,
    rollDeg: 0,
    pitchDeg: 0,
    batteryPercent: 100,
    gpsSatellites: 0,
    waypointIndex: 0,
  }
  let mission: Mission = { id: 1, waypoints: defaultMission }
  let geofence: readonly LatLon[] | null = null
  let cameraAim: CameraAim = { kind: 'angles', tiltDeg: DEFAULT_CAMERA_TILT_DEG, panDeg: 0 }
  const gimbal: CameraAngles = { tiltDeg: DEFAULT_CAMERA_TILT_DEG, panDeg: 0 }
  const nextMessageAtMs: Record<ScheduledMessageType, number> = {
    heartbeat: 0,
    home: 0,
    mission: 0,
    missionCurrent: 0,
    geofence: 0,
    systemStatus: 0,
    position: 0,
    camera: 0,
    attitude: 0,
  }
  let timeMs = 0
  let sequence = 0
  let nextGpsUpdateAtMs = GPS_UPDATE_INTERVAL_MS
  let linkLostUntilMs = 0
  let gpsLostUntilMs = 0

  function setMode(mode: SimulatorFlightMode): void {
    vehicle.mode = mode
    vehicle.modeStartedAtMs = timeMs
  }

  function currentWaypoint(): LatLon {
    return mission.waypoints[vehicle.waypointIndex] ?? home
  }

  function isOutsideGeofence(): boolean {
    return geofence !== null && !isPointInPolygon(vehicle.position, geofence)
  }

  function updateGps(): void {
    if (timeMs < nextGpsUpdateAtMs) {
      return
    }
    nextGpsUpdateAtMs += GPS_UPDATE_INTERVAL_MS

    if (timeMs < gpsLostUntilMs) {
      vehicle.gpsSatellites = GPS_LOSS_SATELLITES
      return
    }
    if (vehicle.gpsSatellites < GPS_MIN_SATELLITES) {
      vehicle.gpsSatellites += 1
      return
    }
    const change = Math.round(randomBetween(random, -1, 1))
    vehicle.gpsSatellites = clamp(
      vehicle.gpsSatellites + change,
      GPS_MIN_SATELLITES,
      GPS_MAX_SATELLITES,
    )
  }

  function updateMode(): void {
    switch (vehicle.mode) {
      case 'STANDBY': {
        const standbyOver = timeMs - vehicle.modeStartedAtMs >= STANDBY_DURATION_MS
        if (standbyOver && gpsFixFor(vehicle.gpsSatellites) === '3d') {
          vehicle.batteryPercent = 100
          vehicle.armed = true
          setMode('TAKEOFF')
        }
        break
      }
      case 'TAKEOFF':
        if (vehicle.altitudeM >= MISSION_ALTITUDE_M) {
          vehicle.waypointIndex = 0
          setMode('AUTO')
        }
        break
      case 'AUTO':
        if (vehicle.batteryPercent <= RTL_BATTERY_PERCENT || isOutsideGeofence()) {
          setMode('RTL')
        } else if (distanceMeters(vehicle.position, currentWaypoint()) <= WAYPOINT_RADIUS_M) {
          advanceMission()
        }
        break
      case 'RTL':
        if (distanceMeters(vehicle.position, home) <= HOME_RADIUS_M) {
          setMode('LAND')
        }
        break
      case 'LAND':
        if (vehicle.altitudeM <= 0) {
          vehicle.armed = false
          setMode('STANDBY')
        }
        break
    }
  }

  function advanceMission(): void {
    if (vehicle.waypointIndex >= mission.waypoints.length - 1) {
      setMode('RTL')
      return
    }
    vehicle.waypointIndex += 1
  }

  function guidance(): Guidance {
    switch (vehicle.mode) {
      case 'STANDBY':
      case 'LAND':
        return { target: null, altitudeM: 0, speedMs: 0 }
      case 'TAKEOFF':
        return { target: null, altitudeM: MISSION_ALTITUDE_M, speedMs: 0 }
      case 'AUTO':
        return {
          target: currentWaypoint(),
          altitudeM: MISSION_ALTITUDE_M,
          speedMs: CRUISE_SPEED_MS,
        }
      case 'RTL': {
        const distanceHome = distanceMeters(vehicle.position, home)
        const brakingSpeed = Math.sqrt(2 * ACCELERATION_MS2 * distanceHome)
        return {
          target: home,
          altitudeM: MISSION_ALTITUDE_M,
          speedMs: Math.min(CRUISE_SPEED_MS, brakingSpeed),
        }
      }
    }
  }

  function updateMotion(dtS: number): void {
    const { target, altitudeM, speedMs } = guidance()
    const previousHeadingDeg = vehicle.headingDeg
    const previousSpeedMs = vehicle.groundSpeedMs

    const verticalRate = altitudeM > vehicle.altitudeM ? CLIMB_RATE_MS : DESCENT_RATE_MS
    vehicle.altitudeM = approach(vehicle.altitudeM, altitudeM, verticalRate * dtS)

    if (target) {
      vehicle.headingDeg = turnToward(
        vehicle.headingDeg,
        bearingDegrees(vehicle.position, target),
        MAX_TURN_RATE_DEG_S * dtS,
      )
    }
    vehicle.groundSpeedMs = approach(vehicle.groundSpeedMs, speedMs, ACCELERATION_MS2 * dtS)
    vehicle.position = destinationPoint(
      vehicle.position,
      vehicle.headingDeg,
      vehicle.groundSpeedMs * dtS,
    )

    const isFlying = vehicle.armed && vehicle.altitudeM > 0
    const tilt = isFlying
      ? tiltForMotion(
          vehicle.groundSpeedMs,
          signedAngleDifference(previousHeadingDeg, vehicle.headingDeg) / dtS,
          (vehicle.groundSpeedMs - previousSpeedMs) / dtS,
        )
      : LEVEL
    vehicle.rollDeg = approach(vehicle.rollDeg, tilt.rollDeg, TILT_RATE_DEG_S * dtS)
    vehicle.pitchDeg = approach(vehicle.pitchDeg, tilt.pitchDeg, TILT_RATE_DEG_S * dtS)
  }

  function aimAngles(): CameraAngles {
    if (cameraAim.kind === 'angles') {
      return cameraAim
    }
    const distance = distanceMeters(vehicle.position, cameraAim.point)
    const drop = vehicle.altitudeM - cameraAim.altitudeM
    return {
      tiltDeg: clamp(-toDegrees(Math.atan2(drop, distance)), -90, 0),
      panDeg: signedAngleDifference(
        vehicle.headingDeg,
        bearingDegrees(vehicle.position, cameraAim.point),
      ),
    }
  }

  function updateGimbal(dtS: number): void {
    const target = aimAngles()
    const maxStepDeg = GIMBAL_RATE_DEG_S * dtS
    gimbal.tiltDeg = approach(gimbal.tiltDeg, target.tiltDeg, maxStepDeg)
    gimbal.panDeg = signedAngleDifference(0, turnToward(gimbal.panDeg, target.panDeg, maxStepDeg))
  }

  function vibration(): number {
    return vehicle.armed ? randomBetween(random, -VIBRATION_DEG, VIBRATION_DEG) : 0
  }

  function updateBattery(dtS: number): void {
    if (vehicle.armed) {
      vehicle.batteryPercent = Math.max(
        0,
        vehicle.batteryPercent - BATTERY_DRAIN_PERCENT_PER_S * dtS,
      )
    }
  }

  function linkQualityPercent(): number {
    const distanceHome = distanceMeters(vehicle.position, home)
    const noise = randomBetween(random, -LINK_NOISE_PERCENT, LINK_NOISE_PERCENT)
    return clamp(100 * (1 - distanceHome / LINK_RANGE_M) + noise, 0, 100)
  }

  function nextHeader(): { seq: number; timeMs: number } {
    sequence += 1
    return { seq: sequence, timeMs }
  }

  function createMessage(type: ScheduledMessageType): TelemetryMessage {
    const header = nextHeader()

    switch (type) {
      case 'heartbeat':
        return { type, ...header, mode: vehicle.mode, armed: vehicle.armed }
      case 'position': {
        const reported = destinationPoint(
          vehicle.position,
          randomBetween(random, 0, 360),
          randomBetween(random, 0, GPS_JITTER_M),
        )
        return {
          type,
          ...header,
          lat: reported.lat,
          lon: reported.lon,
          altitudeM: vehicle.altitudeM,
          groundSpeedMs: vehicle.groundSpeedMs,
          headingDeg: vehicle.headingDeg,
        }
      }
      case 'attitude':
        return {
          type,
          ...header,
          rollDeg: vehicle.rollDeg + vibration(),
          pitchDeg: vehicle.pitchDeg + vibration(),
          yawDeg: vehicle.headingDeg,
        }
      case 'systemStatus':
        return {
          type,
          ...header,
          batteryPercent: vehicle.batteryPercent,
          gpsSatellites: vehicle.gpsSatellites,
          gpsFix: gpsFixFor(vehicle.gpsSatellites),
          linkQualityPercent: linkQualityPercent(),
          fenceBreached: isOutsideGeofence(),
        }
      case 'home':
        return { type, ...header, lat: home.lat, lon: home.lon }
      case 'mission':
        return { type, ...header, missionId: mission.id, waypoints: [...mission.waypoints] }
      case 'missionCurrent':
        return {
          type,
          ...header,
          missionId: mission.id,
          waypointIndex: vehicle.waypointIndex,
        }
      case 'geofence':
        return { type, ...header, polygon: geofence ? [...geofence] : null }
      case 'camera':
        return {
          type,
          ...header,
          tiltDeg: gimbal.tiltDeg,
          panDeg: gimbal.panDeg,
          horizontalFovDeg: CAMERA_HORIZONTAL_FOV_DEG,
          verticalFovDeg: CAMERA_VERTICAL_FOV_DEG,
          lookAt: cameraAim.kind === 'point' ? cameraAim.point : null,
        }
    }
  }

  function collectDueMessages(): TelemetryMessage[] {
    const messages: TelemetryMessage[] = []
    for (const { type, intervalMs } of MESSAGE_SCHEDULE) {
      if (timeMs >= nextMessageAtMs[type]) {
        messages.push(createMessage(type))
        nextMessageAtMs[type] = timeMs + intervalMs
      }
    }
    return messages
  }

  function acknowledge({ commandId, command }: CommandEnvelope, reason: string | null) {
    return {
      type: 'commandAck' as const,
      ...nextHeader(),
      commandId,
      command: command.type,
      accepted: reason === null,
      reason,
    }
  }

  function uploadMission(waypoints: readonly LatLon[]): string | null {
    const [firstIssue] = validateMission(waypoints, home, geofence)
    if (firstIssue) {
      return describePlanIssue(firstIssue, en)
    }
    mission = { id: mission.id + 1, waypoints: [...waypoints] }
    vehicle.waypointIndex = 0
    nextMessageAtMs.mission = timeMs
    nextMessageAtMs.missionCurrent = timeMs
    return null
  }

  function uploadGeofence(polygon: readonly LatLon[]): string | null {
    const [firstIssue] = validateGeofence(polygon, home)
    if (firstIssue) {
      return describePlanIssue(firstIssue, en)
    }
    geofence = [...polygon]
    nextMessageAtMs.geofence = timeMs
    return null
  }

  function clearGeofence(): null {
    geofence = null
    nextMessageAtMs.geofence = timeMs
    return null
  }

  function simulateFault(fault: SimulatedFault): null {
    switch (fault) {
      case 'linkLoss':
        linkLostUntilMs = timeMs + LINK_LOSS_DURATION_MS
        break
      case 'gpsLoss':
        gpsLostUntilMs = timeMs + GPS_LOSS_DURATION_MS
        vehicle.gpsSatellites = GPS_LOSS_SATELLITES
        break
      case 'batteryDrop':
        vehicle.batteryPercent = Math.min(vehicle.batteryPercent, BATTERY_DROP_PERCENT)
        break
    }
    return null
  }

  function aimCamera(aim: CameraAim): null {
    cameraAim = aim
    nextMessageAtMs.camera = timeMs
    return null
  }

  function isLinkLost(): boolean {
    return timeMs < linkLostUntilMs
  }

  return {
    step(dtMs) {
      if (dtMs <= 0) {
        return []
      }
      const dtS = dtMs / 1000
      timeMs += dtMs
      updateGps()
      updateMode()
      updateMotion(dtS)
      updateGimbal(dtS)
      updateBattery(dtS)
      const messages = collectDueMessages()
      return isLinkLost() ? [] : messages
    },
    handleCommand(envelope) {
      const { command } = envelope
      if (command.type === 'simulateFault') {
        return [acknowledge(envelope, simulateFault(command.fault))]
      }
      if (isLinkLost()) {
        return []
      }
      switch (command.type) {
        case 'uploadMission':
          return [acknowledge(envelope, uploadMission(command.waypoints))]
        case 'uploadGeofence':
          return [acknowledge(envelope, uploadGeofence(command.polygon))]
        case 'clearGeofence':
          return [acknowledge(envelope, clearGeofence())]
        case 'ping':
          return [acknowledge(envelope, null)]
        case 'pointCamera':
          return [
            acknowledge(
              envelope,
              aimCamera({ kind: 'angles', tiltDeg: command.tiltDeg, panDeg: command.panDeg }),
            ),
          ]
        case 'lookAtPoint':
          return [
            acknowledge(
              envelope,
              aimCamera({
                kind: 'point',
                point: { lat: command.lat, lon: command.lon },
                altitudeM: command.altitudeM,
              }),
            ),
          ]
      }
    },
  }
}
