import { distanceMeters, type LatLon } from '../geo/geo'
import type { TerrainSampler } from './terrainSampler'

export const PROFILE_STEP_M = 20
export const MIN_TERRAIN_CLEARANCE_M = 20

export interface ProfileSample {
  distanceM: number
  groundM: number
  legIndex: number
}

export interface RouteProfile {
  samples: ProfileSample[]
  flightAltitudeM: number
  lowest: ProfileSample & { clearanceM: number }
}

function pointBetween(from: LatLon, to: LatLon, fraction: number): LatLon {
  return {
    lat: from.lat + (to.lat - from.lat) * fraction,
    lon: from.lon + (to.lon - from.lon) * fraction,
  }
}

function sampleRoute(
  route: readonly LatLon[],
  terrain: Pick<TerrainSampler, 'elevationAt'>,
  stepM: number,
): ProfileSample[] | null {
  const samples: ProfileSample[] = []
  let complete = true
  let legStartM = 0

  for (let legIndex = 0; legIndex < route.length - 1; legIndex += 1) {
    const from = route[legIndex]
    const to = route[legIndex + 1]
    if (!from || !to) {
      continue
    }
    const legLengthM = distanceMeters(from, to)
    const steps = Math.max(1, Math.ceil(legLengthM / stepM))
    for (let step = legIndex === 0 ? 0 : 1; step <= steps; step += 1) {
      const fraction = step / steps
      const groundM = terrain.elevationAt(pointBetween(from, to, fraction))
      if (groundM === null) {
        complete = false
      } else {
        samples.push({ distanceM: legStartM + legLengthM * fraction, groundM, legIndex })
      }
    }
    legStartM += legLengthM
  }

  return complete ? samples : null
}

export function buildRouteProfile(
  route: readonly LatLon[],
  altitudeAboveHomeM: number,
  terrain: Pick<TerrainSampler, 'elevationAt'>,
  stepM = PROFILE_STEP_M,
): RouteProfile | null {
  const home = route[0]
  if (!home || route.length < 2) {
    return null
  }
  const homeElevation = terrain.elevationAt(home)
  const samples = sampleRoute(route, terrain, stepM)
  const highest = samples?.reduce((top, sample) => (sample.groundM > top.groundM ? sample : top))
  if (homeElevation === null || !samples || !highest) {
    return null
  }

  const flightAltitudeM = homeElevation + altitudeAboveHomeM
  return {
    samples,
    flightAltitudeM,
    lowest: { ...highest, clearanceM: flightAltitudeM - highest.groundM },
  }
}
