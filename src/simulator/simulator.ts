import { bearingDegrees, destinationPoint, distanceMeters, type LatLon } from '../geo/geo'
import type { FlightMode, GpsFix, TelemetryMessage } from '../protocol/telemetry'
import { approach, clamp, turnToward } from './motion'
import { createRandom, randomBetween } from './random'

export interface SimulatorConfig {
  home: LatLon
  patrolRoute: readonly LatLon[]
  seed: number
}

export interface Simulator {
  step: (dtMs: number) => TelemetryMessage[]
}

const CRUISE_ALTITUDE_M = 40
const CRUISE_SPEED_MS = 12
const ACCELERATION_MS2 = 2
const MAX_TURN_RATE_DEG_S = 60
const CLIMB_RATE_MS = 3
const DESCENT_RATE_MS = 1.5
const WAYPOINT_RADIUS_M = 10
const HOME_RADIUS_M = 2

const STANDBY_DURATION_MS = 5000
const BATTERY_DRAIN_PERCENT_PER_S = 0.3
const RTL_BATTERY_PERCENT = 30

const GPS_UPDATE_INTERVAL_MS = 1000
const GPS_MIN_SATELLITES = 11
const GPS_MAX_SATELLITES = 17
const GPS_JITTER_M = 0.3

const LINK_RANGE_M = 5000
const LINK_NOISE_PERCENT = 2

type ScheduledMessageType = 'heartbeat' | 'home' | 'systemStatus' | 'position'

const MESSAGE_SCHEDULE: readonly { type: ScheduledMessageType; intervalMs: number }[] = [
  { type: 'heartbeat', intervalMs: 1000 },
  { type: 'home', intervalMs: 5000 },
  { type: 'systemStatus', intervalMs: 500 },
  { type: 'position', intervalMs: 100 },
]

interface VehicleState {
  mode: FlightMode
  modeStartedAtMs: number
  armed: boolean
  position: LatLon
  altitudeM: number
  headingDeg: number
  groundSpeedMs: number
  batteryPercent: number
  gpsSatellites: number
  waypointIndex: number
}

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

export function createSimulator({ home, patrolRoute, seed }: SimulatorConfig): Simulator {
  if (patrolRoute.length === 0) {
    throw new Error('Patrol route needs at least one waypoint')
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
    batteryPercent: 100,
    gpsSatellites: 0,
    waypointIndex: 0,
  }
  const nextMessageAtMs: Record<ScheduledMessageType, number> = {
    heartbeat: 0,
    home: 0,
    systemStatus: 0,
    position: 0,
  }
  let timeMs = 0
  let sequence = 0
  let nextGpsUpdateAtMs = GPS_UPDATE_INTERVAL_MS

  function setMode(mode: FlightMode): void {
    vehicle.mode = mode
    vehicle.modeStartedAtMs = timeMs
  }

  function currentWaypoint(): LatLon {
    return patrolRoute[vehicle.waypointIndex] ?? home
  }

  function updateGps(): void {
    if (timeMs < nextGpsUpdateAtMs) {
      return
    }
    nextGpsUpdateAtMs += GPS_UPDATE_INTERVAL_MS

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
        if (vehicle.altitudeM >= CRUISE_ALTITUDE_M) {
          vehicle.waypointIndex = 0
          setMode('AUTO')
        }
        break
      case 'AUTO':
        if (vehicle.batteryPercent <= RTL_BATTERY_PERCENT) {
          setMode('RTL')
        } else if (distanceMeters(vehicle.position, currentWaypoint()) <= WAYPOINT_RADIUS_M) {
          vehicle.waypointIndex = (vehicle.waypointIndex + 1) % patrolRoute.length
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

  function guidance(): Guidance {
    switch (vehicle.mode) {
      case 'STANDBY':
      case 'LAND':
        return { target: null, altitudeM: 0, speedMs: 0 }
      case 'TAKEOFF':
        return { target: null, altitudeM: CRUISE_ALTITUDE_M, speedMs: 0 }
      case 'AUTO':
        return {
          target: currentWaypoint(),
          altitudeM: CRUISE_ALTITUDE_M,
          speedMs: CRUISE_SPEED_MS,
        }
      case 'RTL': {
        const distanceHome = distanceMeters(vehicle.position, home)
        const brakingSpeed = Math.sqrt(2 * ACCELERATION_MS2 * distanceHome)
        return {
          target: home,
          altitudeM: CRUISE_ALTITUDE_M,
          speedMs: Math.min(CRUISE_SPEED_MS, brakingSpeed),
        }
      }
    }
  }

  function updateMotion(dtS: number): void {
    const { target, altitudeM, speedMs } = guidance()

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

  function createMessage(type: ScheduledMessageType): TelemetryMessage {
    sequence += 1
    const header = { seq: sequence, timeMs }

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
      case 'systemStatus':
        return {
          type,
          ...header,
          batteryPercent: vehicle.batteryPercent,
          gpsSatellites: vehicle.gpsSatellites,
          gpsFix: gpsFixFor(vehicle.gpsSatellites),
          linkQualityPercent: linkQualityPercent(),
          fenceBreached: false,
        }
      case 'home':
        return { type, ...header, lat: home.lat, lon: home.lon }
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

  return {
    step(dtMs) {
      const dtS = dtMs / 1000
      timeMs += dtMs
      updateGps()
      updateMode()
      updateMotion(dtS)
      updateBattery(dtS)
      return collectDueMessages()
    },
  }
}
