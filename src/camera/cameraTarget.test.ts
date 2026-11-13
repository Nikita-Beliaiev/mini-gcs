import { describe, expect, it } from 'vitest'
import { distanceMeters } from '../geo/geo'
import { DEMO_HOME } from '../simulator/demoArea'
import { cameraMessage, homeMessage, positionMessage } from '../test/messages'
import { fakeTerrain, flatTerrain } from '../test/terrain'
import { cameraTarget } from './cameraTarget'

const HOME = homeMessage(DEMO_HOME)
const POSITION = positionMessage({ ...DEMO_HOME, altitudeM: 80, headingDeg: 0 })
const NADIR = cameraMessage({ tiltDeg: -90, panDeg: 0 })

describe('cameraTarget', () => {
  it('needs a position and a camera', () => {
    const terrain = flatTerrain(300)

    expect(cameraTarget({ position: null, camera: NADIR, home: HOME }, terrain)).toBeNull()
    expect(cameraTarget({ position: POSITION, camera: null, home: HOME }, terrain)).toBeNull()
  })

  it('finds the footprint and the frame centre', () => {
    const target = cameraTarget({ position: POSITION, camera: NADIR, home: HOME }, flatTerrain(300))

    expect(target?.footprint).toHaveLength(4)
    expect(target?.center?.rangeM).toBeCloseTo(80, 1)
    expect(distanceMeters(DEMO_HOME, target?.center?.point ?? HOME)).toBeLessThan(0.1)
  })

  it('measures the ground under the vehicle from home', () => {
    const raisedUnderVehicle = fakeTerrain((point) => (point === HOME ? 300 : 320))

    const target = cameraTarget(
      { position: POSITION, camera: NADIR, home: HOME },
      raisedUnderVehicle,
    )

    expect(target?.center?.rangeM).toBeCloseTo(60, 1)
  })

  it('treats the ground as level with home before home is known', () => {
    const target = cameraTarget({ position: POSITION, camera: NADIR, home: null }, flatTerrain(500))

    expect(target?.center?.rangeM).toBeCloseTo(80, 1)
  })
})
