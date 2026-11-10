import { describe, expect, it } from 'vitest'
import { distanceMeters } from '../geo/geo'
import type { TelemetryMessage, TelemetryMessageType } from '../protocol/telemetry'
import { DEMO_HOME, DEMO_PATROL_ROUTE } from './demoArea'
import { createSimulator, gpsFixFor, type Simulator } from './simulator'

const TICK_MS = 50

type MessageOf<T extends TelemetryMessageType> = Extract<TelemetryMessage, { type: T }>

function createDemoSimulator(seed = 1): Simulator {
  return createSimulator({ home: DEMO_HOME, patrolRoute: DEMO_PATROL_ROUTE, seed })
}

function run(simulator: Simulator, seconds: number): TelemetryMessage[] {
  const messages: TelemetryMessage[] = []
  for (let elapsedMs = 0; elapsedMs < seconds * 1000; elapsedMs += TICK_MS) {
    messages.push(...simulator.step(TICK_MS))
  }
  return messages
}

function runUntil(
  simulator: Simulator,
  isDone: (message: TelemetryMessage) => boolean,
  maxSeconds: number,
): TelemetryMessage[] {
  const messages: TelemetryMessage[] = []
  for (let elapsedMs = 0; elapsedMs < maxSeconds * 1000; elapsedMs += TICK_MS) {
    for (const message of simulator.step(TICK_MS)) {
      messages.push(message)
      if (isDone(message)) {
        return messages
      }
    }
  }
  throw new Error(`Condition not met within ${String(maxSeconds)} s`)
}

function ofType<T extends TelemetryMessageType>(
  messages: TelemetryMessage[],
  type: T,
): MessageOf<T>[] {
  return messages.filter((message): message is MessageOf<T> => message.type === type)
}

function lastOfType<T extends TelemetryMessageType>(
  messages: TelemetryMessage[],
  type: T,
): MessageOf<T> {
  const message = ofType(messages, type).at(-1)
  if (!message) {
    throw new Error(`No ${type} message`)
  }
  return message
}

function isModeHeartbeat(mode: string) {
  return (message: TelemetryMessage) => message.type === 'heartbeat' && message.mode === mode
}

describe('gpsFixFor', () => {
  it.each([
    [0, 'none'],
    [3, 'none'],
    [4, '2d'],
    [5, '2d'],
    [6, '3d'],
    [17, '3d'],
  ])('reports %d satellites as %s', (satellites, fix) => {
    expect(gpsFixFor(satellites)).toBe(fix)
  })
})

describe('createSimulator', () => {
  it('rejects an empty patrol route', () => {
    expect(() => createSimulator({ home: DEMO_HOME, patrolRoute: [], seed: 1 })).toThrow()
  })

  it('emits every message type at its own rate', () => {
    const messages = run(createDemoSimulator(), 10)

    expect(ofType(messages, 'heartbeat')).toHaveLength(10)
    expect(ofType(messages, 'home')).toHaveLength(2)
    expect(ofType(messages, 'systemStatus')).toHaveLength(20)
    expect(ofType(messages, 'position')).toHaveLength(100)
  })

  it('numbers messages in order and stamps them with simulation time', () => {
    const messages = run(createDemoSimulator(), 5)

    expect(messages.map((message) => message.seq)).toEqual(messages.map((_, index) => index + 1))
    for (let index = 1; index < messages.length; index += 1) {
      expect(messages[index]?.timeMs).toBeGreaterThanOrEqual(messages[index - 1]?.timeMs ?? 0)
    }
  })

  it('produces the same flight for the same seed', () => {
    expect(run(createDemoSimulator(5), 30)).toEqual(run(createDemoSimulator(5), 30))
  })

  it('waits on the ground until GPS has a 3D fix', () => {
    const messages = run(createDemoSimulator(), 4)

    expect(lastOfType(messages, 'heartbeat')).toMatchObject({ mode: 'STANDBY', armed: false })
    expect(lastOfType(messages, 'systemStatus').gpsFix).not.toBe('3d')
    expect(lastOfType(messages, 'position').altitudeM).toBe(0)
  })

  it('arms, climbs to cruise altitude and starts the patrol', () => {
    const simulator = createDemoSimulator()
    const messages = runUntil(simulator, isModeHeartbeat('AUTO'), 60)

    expect(ofType(messages, 'heartbeat')).toContainEqual(
      expect.objectContaining({ mode: 'TAKEOFF', armed: true }),
    )
    expect(lastOfType(messages, 'systemStatus').gpsFix).toBe('3d')
    expect(lastOfType(messages, 'position').altitudeM).toBeCloseTo(40, 0)
  })

  it('flies through every patrol waypoint in order', () => {
    const simulator = createDemoSimulator()
    runUntil(simulator, isModeHeartbeat('AUTO'), 60)
    const positions = ofType(runUntil(simulator, isModeHeartbeat('RTL'), 400), 'position')

    const firstVisits = DEMO_PATROL_ROUTE.map((waypoint) =>
      positions.findIndex((position) => distanceMeters(position, waypoint) <= 12),
    )

    expect(firstVisits).not.toContain(-1)
    expect(firstVisits).toEqual([...firstVisits].sort((a, b) => a - b))
  })

  it('returns home on low battery, lands and flies again with a fresh battery', () => {
    const simulator = createDemoSimulator()

    const toRtl = runUntil(simulator, isModeHeartbeat('RTL'), 400)
    expect(lastOfType(toRtl, 'systemStatus').batteryPercent).toBeLessThanOrEqual(31)

    const toLanding = runUntil(simulator, isModeHeartbeat('STANDBY'), 200)
    const touchdown = lastOfType(toLanding, 'position')
    expect(lastOfType(toLanding, 'heartbeat').armed).toBe(false)
    expect(lastOfType(toLanding, 'systemStatus').batteryPercent).toBeGreaterThan(5)
    expect(touchdown.altitudeM).toBe(0)
    expect(distanceMeters(touchdown, DEMO_HOME)).toBeLessThan(5)

    runUntil(simulator, isModeHeartbeat('TAKEOFF'), 30)
    const afterTakeoff = run(simulator, 1)
    expect(lastOfType(afterTakeoff, 'systemStatus').batteryPercent).toBeGreaterThan(99)
  })

  it('reports a weaker link further from home', () => {
    const simulator = createDemoSimulator()
    const onGround = run(simulator, 3)
    const inFlight = runUntil(simulator, isModeHeartbeat('RTL'), 400)

    const statusAt = new Map(
      ofType(inFlight, 'systemStatus').map((status) => [status.timeMs, status]),
    )
    const farthest = ofType(inFlight, 'position')
      .filter((position) => statusAt.has(position.timeMs))
      .reduce((best, position) =>
        distanceMeters(position, DEMO_HOME) > distanceMeters(best, DEMO_HOME) ? position : best,
      )

    expect(lastOfType(onGround, 'systemStatus').linkQualityPercent).toBeGreaterThanOrEqual(98)
    expect(statusAt.get(farthest.timeMs)?.linkQualityPercent).toBeLessThan(95)
  })
})
