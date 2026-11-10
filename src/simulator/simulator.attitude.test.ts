import { describe, expect, it } from 'vitest'
import { destinationPoint } from '../geo/geo'
import { createDemoSimulator, isModeHeartbeat, ofType, run, runUntil } from '../test/simulation'
import { DEMO_HOME } from './demoArea'

const NORTH = destinationPoint(DEMO_HOME, 0, 300)
const RIGHT_TURN_MISSION = [NORTH, destinationPoint(NORTH, 90, 300)]
const LEFT_TURN_MISSION = [NORTH, destinationPoint(NORTH, 270, 300)]

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

describe('simulator attitude', () => {
  it('sits level and still on the ground', () => {
    const attitude = ofType(run(createDemoSimulator(), 3), 'attitude')

    expect(attitude.every((message) => message.rollDeg === 0 && message.pitchDeg === 0)).toBe(true)
  })

  it('leans forward when cruising straight', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)
    run(simulator, 15)

    const pitch = ofType(run(simulator, 5), 'attitude').map((message) => message.pitchDeg)

    expect(average(pitch)).toBeCloseTo(-9.6, 0)
  })

  it('banks right in a right turn and left in a left turn', () => {
    const rightTurn = ofType(
      runUntil(createDemoSimulator(RIGHT_TURN_MISSION), isModeHeartbeat('RTL'), 120),
      'attitude',
    )
    const leftTurn = ofType(
      runUntil(createDemoSimulator(LEFT_TURN_MISSION), isModeHeartbeat('RTL'), 120),
      'attitude',
    )

    expect(Math.max(...rightTurn.map((message) => message.rollDeg))).toBeGreaterThan(15)
    expect(Math.min(...leftTurn.map((message) => message.rollDeg))).toBeLessThan(-15)
  })

  it('reports the heading as yaw', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)
    const messages = run(simulator, 10)

    const yawAt = new Map(ofType(messages, 'attitude').map((message) => [message.timeMs, message]))
    for (const position of ofType(messages, 'position')) {
      expect(yawAt.get(position.timeMs)?.yawDeg).toBe(position.headingDeg)
    }
  })
})
