import { describe, expect, it } from 'vitest'
import type { LatLon } from '../geo/geo'
import { homeMessage, positionMessage } from '../test/messages'
import { altitudeAboveGround, altitudeAboveSeaLevel } from './vehicleAltitudes'

const HOME = homeMessage({ lat: 43.095, lon: 11.645 })
const OVER_HILL = positionMessage({ lat: 43.09, lon: 11.65, altitudeM: 80 })

const hillside = {
  elevationAt: (point: LatLon) => (point.lat === HOME.lat ? 302 : 340),
}
const noTerrain = { elevationAt: () => null }

describe('vehicle altitudes', () => {
  it('adds the altitude above home to the elevation of home', () => {
    expect(altitudeAboveSeaLevel({ position: OVER_HILL, home: HOME }, hillside)).toBe(382)
  })

  it('subtracts the ground under the vehicle', () => {
    expect(altitudeAboveGround({ position: OVER_HILL, home: HOME }, hillside)).toBe(42)
  })

  it('has no value without a position, a home or terrain', () => {
    expect(altitudeAboveSeaLevel({ position: null, home: HOME }, hillside)).toBeUndefined()
    expect(altitudeAboveGround({ position: OVER_HILL, home: null }, hillside)).toBeUndefined()
    expect(altitudeAboveSeaLevel({ position: OVER_HILL, home: HOME }, noTerrain)).toBeUndefined()
    expect(altitudeAboveGround({ position: OVER_HILL, home: HOME }, noTerrain)).toBeUndefined()
  })

  it('has no height above ground while the ground under the vehicle is unknown', () => {
    const onlyHome = { elevationAt: (point: LatLon) => (point.lat === HOME.lat ? 302 : null) }

    expect(altitudeAboveSeaLevel({ position: OVER_HILL, home: HOME }, onlyHome)).toBe(382)
    expect(altitudeAboveGround({ position: OVER_HILL, home: HOME }, onlyHome)).toBeUndefined()
  })
})
