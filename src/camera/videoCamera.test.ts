import { describe, expect, it } from 'vitest'
import { DEMO_HOME } from '../simulator/demoArea'
import type { CameraPose } from './cameraGeometry'
import { videoCameraOf } from './videoCamera'

const POSE: CameraPose = {
  position: DEMO_HOME,
  altitudeM: 80,
  azimuthDeg: 370,
  tiltDeg: -35,
  horizontalFovDeg: 61.3,
  verticalFovDeg: 36.87,
}

describe('videoCameraOf', () => {
  it('places the map camera where the vehicle camera is, above sea level', () => {
    expect(videoCameraOf(POSE, 302)).toEqual({
      lngLat: [DEMO_HOME.lon, DEMO_HOME.lat],
      altitudeM: 382,
      bearingDeg: 10,
      pitchDeg: 55,
      verticalFovDeg: 36.87,
    })
  })

  it('measures the map pitch from straight down', () => {
    expect(videoCameraOf({ ...POSE, tiltDeg: -90 }, 302).pitchDeg).toBe(0)
    expect(videoCameraOf({ ...POSE, tiltDeg: 0 }, 302).pitchDeg).toBe(90)
  })

  it('keeps the camera above the ground while the vehicle stands at home', () => {
    expect(videoCameraOf({ ...POSE, altitudeM: 0 }, 302).altitudeM).toBe(304)
  })
})
