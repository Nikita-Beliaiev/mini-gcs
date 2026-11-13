import { describe, expect, it } from 'vitest'
import { destinationPoint, distanceMeters, routeLengthMeters, type LatLon } from '../geo/geo'
import { DEMO_HOME } from '../simulator/demoArea'
import { buildRouteProfile } from './routeProfile'

const NORTH = destinationPoint(DEMO_HOME, 0, 500)
const NORTH_EAST = destinationPoint(NORTH, 90, 500)
const ROUTE = [DEMO_HOME, NORTH, NORTH_EAST, DEMO_HOME]
const HILLTOP = destinationPoint(NORTH, 90, 260)

const flat = { elevationAt: () => 300 }

function hillAt(top: LatLon, peakM: number) {
  return {
    elevationAt: (point: LatLon) => 300 + Math.max(0, peakM - distanceMeters(point, top) / 2),
  }
}

describe('buildRouteProfile', () => {
  it('samples the ground along the whole route from home and back', () => {
    const profile = buildRouteProfile(ROUTE, 80, flat)

    expect(profile?.flightAltitudeM).toBe(380)
    expect(profile?.samples[0]).toEqual({ distanceM: 0, groundM: 300, legIndex: 0 })
    expect(profile?.samples.at(-1)?.distanceM).toBeCloseTo(routeLengthMeters(ROUTE), 6)
    expect(profile?.samples.at(-1)?.legIndex).toBe(2)
    const distances = profile?.samples.map((sample) => sample.distanceM) ?? []
    expect(distances).toEqual([...distances].sort((a, b) => a - b))
    expect(new Set(distances).size).toBe(distances.length)
  })

  it('takes a sample at most every 20 m', () => {
    const profile = buildRouteProfile([DEMO_HOME, NORTH], 80, flat)
    const distances = profile?.samples.map((sample) => sample.distanceM) ?? []
    const gaps = distances.slice(1).map((distance, index) => distance - (distances[index] ?? 0))

    expect(Math.max(...gaps)).toBeLessThanOrEqual(20)
    expect(Math.min(...gaps)).toBeGreaterThan(19)
  })

  it('finds the lowest clearance and the leg it is on', () => {
    const profile = buildRouteProfile(ROUTE, 80, hillAt(HILLTOP, 65))

    expect(profile?.lowest.legIndex).toBe(1)
    expect(profile?.lowest.clearanceM).toBeCloseTo(15, 0)
    expect(profile?.lowest.distanceM).toBeCloseTo(760, -1)
  })

  it('reports a negative clearance when the route runs into the ground', () => {
    const profile = buildRouteProfile(ROUTE, 80, hillAt(HILLTOP, 100))

    expect(profile?.lowest.clearanceM).toBeCloseTo(-20, 0)
  })

  it('waits until every tile along the route has loaded, asking for all of them at once', () => {
    const asked: LatLon[] = []
    const southOnly = {
      elevationAt: (point: LatLon) => {
        asked.push(point)
        return point.lat < NORTH.lat - 0.001 ? 300 : null
      },
    }

    expect(buildRouteProfile(ROUTE, 80, southOnly)).toBeNull()
    expect(asked.length).toBeGreaterThan(70)
  })

  it('needs a route with at least one leg', () => {
    expect(buildRouteProfile([DEMO_HOME], 80, flat)).toBeNull()
    expect(buildRouteProfile([], 80, flat)).toBeNull()
  })
})
