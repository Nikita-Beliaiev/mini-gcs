import { describe, expect, it, vi } from 'vitest'
import {
  attitudeMessage,
  commandAckMessage,
  geofenceMessage,
  heartbeatMessage,
  homeMessage,
  missionCurrentMessage,
  missionMessage,
  positionMessage,
  systemStatusMessage,
} from '../test/messages'
import { createTelemetryStore } from './telemetryStore'

function setup(historySize?: number) {
  const pendingFrames: (() => void)[] = []
  const store = createTelemetryStore({
    historySize,
    scheduleFrame: (callback) => {
      pendingFrames.push(callback)
    },
  })

  function runFrame(): void {
    for (const callback of pendingFrames.splice(0)) {
      callback()
    }
  }

  return { store, pendingFrames, runFrame }
}

describe('createTelemetryStore', () => {
  it('starts with no telemetry', () => {
    const { store } = setup()

    expect(store.getSnapshot()).toEqual({
      heartbeat: null,
      position: null,
      attitude: null,
      systemStatus: null,
      home: null,
      mission: null,
      missionCurrent: null,
      geofence: null,
    })
    expect(store.getPositionHistory()).toEqual([])
  })

  it('keeps the latest message of each type', () => {
    const { store, runFrame } = setup()
    const heartbeat = heartbeatMessage()
    const attitude = attitudeMessage({ rollDeg: 5 })
    const systemStatus = systemStatusMessage()
    const home = homeMessage()
    const mission = missionMessage()
    const missionCurrent = missionCurrentMessage()
    const geofence = geofenceMessage()
    const newerPosition = positionMessage({ seq: 2, altitudeM: 41 })

    for (const message of [
      heartbeat,
      positionMessage(),
      attitude,
      systemStatus,
      home,
      mission,
      missionCurrent,
      geofence,
      newerPosition,
    ]) {
      store.push(message)
    }
    runFrame()

    expect(store.getSnapshot()).toEqual({
      heartbeat,
      position: newerPosition,
      attitude,
      systemStatus,
      home,
      mission,
      missionCurrent,
      geofence,
    })
  })

  it('leaves command acknowledgements to the command sender', () => {
    const { store, runFrame } = setup()
    store.push(heartbeatMessage())
    runFrame()
    const snapshot = store.getSnapshot()

    store.push(commandAckMessage())
    runFrame()

    expect(store.getSnapshot()).toBe(snapshot)
  })

  it('publishes changes only on the next frame', () => {
    const { store, runFrame } = setup()

    store.push(heartbeatMessage())
    expect(store.getSnapshot().heartbeat).toBeNull()

    runFrame()
    expect(store.getSnapshot().heartbeat).not.toBeNull()
  })

  it('notifies subscribers once per frame however many messages arrive', () => {
    const { store, pendingFrames, runFrame } = setup()
    const listener = vi.fn()
    store.subscribe(listener)

    for (let seq = 1; seq <= 5; seq += 1) {
      store.push(positionMessage({ seq }))
    }
    expect(pendingFrames).toHaveLength(1)

    runFrame()
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('schedules no frame while nothing changes', () => {
    const { store, pendingFrames, runFrame } = setup()

    store.push(heartbeatMessage())
    runFrame()

    expect(pendingFrames).toHaveLength(0)
  })

  it('returns the same snapshot object until the next published change', () => {
    const { store, runFrame } = setup()
    store.push(heartbeatMessage())
    runFrame()
    const snapshot = store.getSnapshot()

    store.push(heartbeatMessage({ seq: 2 }))

    expect(store.getSnapshot()).toBe(snapshot)
  })

  it('keeps a bounded position history in arrival order', () => {
    const { store } = setup(3)

    for (let seq = 1; seq <= 5; seq += 1) {
      store.push(positionMessage({ seq }))
    }
    store.push(heartbeatMessage({ seq: 6 }))

    expect(store.getPositionHistory().map((position) => position.seq)).toEqual([3, 4, 5])
  })

  it('clears telemetry and history on reset', () => {
    const { store, runFrame } = setup()
    store.push(heartbeatMessage())
    store.push(positionMessage())
    runFrame()

    store.reset()
    runFrame()

    expect(store.getSnapshot().heartbeat).toBeNull()
    expect(store.getSnapshot().position).toBeNull()
    expect(store.getPositionHistory()).toEqual([])
  })
})
