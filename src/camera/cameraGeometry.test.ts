import { describe, expect, it } from 'vitest'
import { bearingDegrees, destinationPoint, distanceMeters, type LatLon } from '../geo/geo'
import { cameraMessage, homeMessage, positionMessage } from '../test/messages'
import { fakeTerrain } from '../test/terrain'
import { DEMO_HOME } from '../simulator/demoArea'
import {
  cameraFootprint,
  cameraPoseOf,
  FAR_GROUND_M,
  groundHeightAboveHome,
  groundPointAt,
  rayDirection,
  type CameraPose,
} from './cameraGeometry'

const HALF_WIDTH_TAN = Math.tan((61.3 / 2) * (Math.PI / 180))
const HALF_HEIGHT_TAN = Math.tan((36.87 / 2) * (Math.PI / 180))

function pose(overrides: Partial<CameraPose> = {}): CameraPose {
  return {
    position: DEMO_HOME,
    altitudeM: 80,
    azimuthDeg: 0,
    tiltDeg: -90,
    horizontalFovDeg: 61.3,
    verticalFovDeg: 36.87,
    ...overrides,
  }
}

const flat = () => 0

function offsetFromHome(point: LatLon): { east: number; north: number } {
  const distance = distanceMeters(DEMO_HOME, point)
  const bearing = (bearingDegrees(DEMO_HOME, point) * Math.PI) / 180
  return { east: distance * Math.sin(bearing), north: distance * Math.cos(bearing) }
}

describe('cameraPoseOf', () => {
  it('turns the camera with the vehicle heading', () => {
    const camera = cameraPoseOf(
      positionMessage({ headingDeg: 90, altitudeM: 80 }),
      cameraMessage({ panDeg: -30, tiltDeg: -45 }),
    )

    expect(camera).toMatchObject({ azimuthDeg: 60, tiltDeg: -45, altitudeM: 80 })
  })
})

describe('rayDirection', () => {
  it('points the centre of the frame along the camera axis', () => {
    expect(rayDirection(pose({ azimuthDeg: 90, tiltDeg: 0 }), 0, 0)).toEqual({
      east: 1,
      north: expect.closeTo(0, 9) as number,
      up: 0,
    })
  })

  it('tilts the top of the frame up and the right edge to the right', () => {
    const level = pose({ tiltDeg: 0 })

    expect(rayDirection(level, 0, 1).up).toBeGreaterThan(0)
    expect(rayDirection(level, 1, 0).east).toBeGreaterThan(0)
  })
})

describe('groundPointAt on flat ground', () => {
  it('looks straight down from a nadir camera', () => {
    const hit = groundPointAt(pose(), 0, 0, flat)

    expect(hit?.rangeM).toBeCloseTo(80, 1)
    expect(distanceMeters(DEMO_HOME, hit?.point ?? DEMO_HOME)).toBeLessThan(0.1)
  })

  it('finds the frame centre ahead of a tilted camera', () => {
    const hit = groundPointAt(pose({ azimuthDeg: 45, tiltDeg: -35 }), 0, 0, flat)
    const tilt = (35 * Math.PI) / 180

    expect(hit?.rangeM).toBeCloseTo(80 / Math.sin(tilt), 1)
    expect(distanceMeters(DEMO_HOME, hit?.point ?? DEMO_HOME)).toBeCloseTo(80 / Math.tan(tilt), 1)
    expect(bearingDegrees(DEMO_HOME, hit?.point ?? DEMO_HOME)).toBeCloseTo(45, 1)
  })

  it('finds nothing above the horizon', () => {
    expect(groundPointAt(pose({ tiltDeg: -5 }), 0, 1, flat)).toBeNull()
  })
})

describe('groundPointAt over terrain', () => {
  it('stops at a slope in front of the camera', () => {
    const cliff = (point: LatLon) => (offsetFromHome(point).north > 60 ? 70 : 0)

    const hit = groundPointAt(pose({ tiltDeg: -20 }), 0, 0, cliff)

    expect(offsetFromHome(hit?.point ?? DEMO_HOME).north).toBeCloseTo(60, 0)
    expect(hit?.rangeM).toBeCloseTo(60 / Math.cos((20 * Math.PI) / 180), 0)
  })

  it('passes over a low step and lands on top of it', () => {
    const step = (point: LatLon) => (offsetFromHome(point).north > 60 ? 40 : 0)

    const hit = groundPointAt(pose({ tiltDeg: -20 }), 0, 0, step)

    expect(offsetFromHome(hit?.point ?? DEMO_HOME).north).toBeCloseTo(
      40 / Math.tan((20 * Math.PI) / 180),
      0,
    )
  })
})

describe('cameraFootprint', () => {
  it('is a rectangle under a nadir camera', () => {
    const corners = cameraFootprint(pose(), flat).map(offsetFromHome)

    expect(corners.map(({ east, north }) => [east, north])).toEqual([
      [expect.closeTo(-80 * HALF_WIDTH_TAN, 0), expect.closeTo(80 * HALF_HEIGHT_TAN, 0)],
      [expect.closeTo(80 * HALF_WIDTH_TAN, 0), expect.closeTo(80 * HALF_HEIGHT_TAN, 0)],
      [expect.closeTo(80 * HALF_WIDTH_TAN, 0), expect.closeTo(-80 * HALF_HEIGHT_TAN, 0)],
      [expect.closeTo(-80 * HALF_WIDTH_TAN, 0), expect.closeTo(-80 * HALF_HEIGHT_TAN, 0)],
    ])
  })

  it('reaches out to a far distance where the frame shows the sky', () => {
    const corners = cameraFootprint(pose({ tiltDeg: -5 }), flat)

    expect(distanceMeters(DEMO_HOME, corners[0] ?? DEMO_HOME)).toBeCloseTo(FAR_GROUND_M, 0)
    expect(distanceMeters(DEMO_HOME, corners[3] ?? DEMO_HOME)).toBeLessThan(FAR_GROUND_M)
  })
})

describe('groundHeightAboveHome', () => {
  const home = homeMessage(DEMO_HOME)
  const north = destinationPoint(DEMO_HOME, 0, 200)

  it('measures the ground from the elevation of home', () => {
    const terrain = fakeTerrain((point) => (point.lat === home.lat ? 300 : 340))

    expect(groundHeightAboveHome(terrain, home)(north)).toBe(40)
  })

  it('treats the ground as level with home where the terrain is unknown', () => {
    expect(
      groundHeightAboveHome(
        fakeTerrain(() => null),
        home,
      )(north),
    ).toBe(0)
  })
})
