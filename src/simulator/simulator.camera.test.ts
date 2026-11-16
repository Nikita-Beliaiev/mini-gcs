import { describe, expect, it } from 'vitest'
import {
  bearingDegrees,
  destinationPoint,
  distanceMeters,
  signedAngleDifference,
  toDegrees,
} from '../geo/geo'
import {
  createDemoSimulator,
  isModeHeartbeat,
  lastOfType,
  ofType,
  run,
  runUntil,
  sendCommand,
} from '../test/simulation'
import { DEMO_HOME } from './demoArea'

describe('simulator camera', () => {
  it('reports a forward-looking camera ten times a second', () => {
    const messages = run(createDemoSimulator(), 1)

    expect(ofType(messages, 'camera')).toHaveLength(10)
    const camera = lastOfType(messages, 'camera')
    expect(camera).toMatchObject({ tiltDeg: -15, panDeg: 0, zoom: 1, lookAt: null })
    expect(camera.verticalFovDeg).toBeCloseTo(36.87, 2)
    expect(camera.horizontalFovDeg).toBeCloseTo(61.3, 1)
  })

  it('turns the gimbal towards commanded angles at most 90° a second', () => {
    const simulator = createDemoSimulator()
    run(simulator, 1)

    const ack = sendCommand(simulator, { type: 'pointCamera', tiltDeg: -90, panDeg: -60 })
    const cameras = ofType(run(simulator, 1.5), 'camera')
    const steps = cameras.slice(1).map((camera, index) => {
      const previous = cameras[index] ?? camera
      return {
        tiltDeg: Math.abs(camera.tiltDeg - previous.tiltDeg),
        panDeg: Math.abs(camera.panDeg - previous.panDeg),
      }
    })

    expect(ack.accepted).toBe(true)
    expect(Math.max(...steps.map((step) => step.tiltDeg))).toBeCloseTo(9, 6)
    expect(Math.max(...steps.map((step) => step.panDeg))).toBeCloseTo(9, 6)
    expect(cameras.at(-1)).toMatchObject({ tiltDeg: -90, panDeg: -60, lookAt: null })
  })

  it('zooms the lens by at most two stops a second and narrows the view', () => {
    const simulator = createDemoSimulator()
    run(simulator, 1)

    const ack = sendCommand(simulator, { type: 'zoomCamera', zoom: 8 })
    const cameras = ofType(run(simulator, 2), 'camera')
    const ratios = cameras
      .slice(1)
      .map((camera, index) => camera.zoom / (cameras[index]?.zoom ?? camera.zoom))

    expect(ack.accepted).toBe(true)
    expect(Math.max(...ratios)).toBeCloseTo(2 ** 0.2, 6)
    expect(cameras.at(-1)?.zoom).toBe(8)
    expect(cameras.at(-1)?.horizontalFovDeg).toBeCloseTo(8.47, 2)
  })

  it('keeps looking at a point while the vehicle flies', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)
    const target = destinationPoint(DEMO_HOME, 135, 300)

    sendCommand(simulator, { type: 'lookAtPoint', ...target, altitudeM: 0 })
    run(simulator, 3)

    for (const seconds of [1, 5, 10]) {
      const messages = run(simulator, seconds)
      const camera = lastOfType(messages, 'camera')
      const position = lastOfType(messages, 'position')
      const expectedTiltDeg = -toDegrees(
        Math.atan2(position.altitudeM, distanceMeters(position, target)),
      )
      const expectedPanDeg = signedAngleDifference(
        position.headingDeg,
        bearingDegrees(position, target),
      )

      expect(camera.lookAt).toEqual(target)
      expect(Math.abs(camera.tiltDeg - expectedTiltDeg)).toBeLessThan(2)
      expect(Math.abs(signedAngleDifference(camera.panDeg, expectedPanDeg))).toBeLessThan(3)
    }
  })

  it('stops looking at a point when given angles again', () => {
    const simulator = createDemoSimulator()
    sendCommand(simulator, { type: 'lookAtPoint', ...DEMO_HOME, altitudeM: 0 })
    run(simulator, 1)

    sendCommand(simulator, { type: 'pointCamera', tiltDeg: -20, panDeg: 0 })

    expect(lastOfType(run(simulator, 1), 'camera')).toMatchObject({
      tiltDeg: -20,
      panDeg: 0,
      lookAt: null,
    })
  })
})
