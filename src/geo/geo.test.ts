import { describe, expect, it } from 'vitest'
import {
  bearingDegrees,
  destinationPoint,
  distanceMeters,
  normalizeDegrees,
  signedAngleDifference,
} from './geo'

const ORIGIN = { lat: 0, lon: 0 }
const ONE_DEGREE_ON_EQUATOR_M = 111_195

describe('normalizeDegrees', () => {
  it.each([
    [0, 0],
    [90, 90],
    [360, 0],
    [370, 10],
    [-90, 270],
    [-450, 270],
  ])('maps %d to %d', (input, expected) => {
    expect(normalizeDegrees(input)).toBe(expected)
  })
})

describe('signedAngleDifference', () => {
  it.each([
    [10, 30, 20],
    [30, 10, -20],
    [350, 10, 20],
    [10, 350, -20],
    [0, 180, 180],
  ])('turning from %d to %d is %d degrees', (from, to, expected) => {
    expect(signedAngleDifference(from, to)).toBe(expected)
  })
})

describe('distanceMeters', () => {
  it('is zero for the same point', () => {
    expect(distanceMeters(ORIGIN, ORIGIN)).toBe(0)
  })

  it('measures one degree along the equator and along a meridian', () => {
    expect(distanceMeters(ORIGIN, { lat: 0, lon: 1 })).toBeCloseTo(ONE_DEGREE_ON_EQUATOR_M, -1)
    expect(distanceMeters(ORIGIN, { lat: 1, lon: 0 })).toBeCloseTo(ONE_DEGREE_ON_EQUATOR_M, -1)
  })

  it('shrinks the length of a longitude degree towards the poles', () => {
    const atSixtyNorth = distanceMeters({ lat: 60, lon: 0 }, { lat: 60, lon: 1 })

    expect(atSixtyNorth).toBeCloseTo(ONE_DEGREE_ON_EQUATOR_M / 2, -2)
  })
})

describe('bearingDegrees', () => {
  it.each([
    [{ lat: 1, lon: 0 }, 0],
    [{ lat: 0, lon: 1 }, 90],
    [{ lat: -1, lon: 0 }, 180],
    [{ lat: 0, lon: -1 }, 270],
  ])('points from the origin to %o at %d degrees', (target, expected) => {
    expect(bearingDegrees(ORIGIN, target)).toBeCloseTo(expected, 6)
  })
})

describe('destinationPoint', () => {
  it('lands at the requested distance and bearing', () => {
    const start = { lat: 43.0675, lon: 11.629 }
    const end = destinationPoint(start, 37, 500)

    expect(distanceMeters(start, end)).toBeCloseTo(500, 6)
    expect(bearingDegrees(start, end)).toBeCloseTo(37, 4)
  })

  it('stays in place for a zero distance', () => {
    const start = { lat: 43.0675, lon: 11.629 }
    const end = destinationPoint(start, 120, 0)

    expect(end.lat).toBeCloseTo(start.lat, 12)
    expect(end.lon).toBeCloseTo(start.lon, 12)
  })
})
