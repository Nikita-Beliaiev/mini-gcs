import { describe, expect, it, vi } from 'vitest'
import type { TelemetryMessage } from '../protocol/telemetry'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createFlightLog } from './flightLog'
import { createReplayPlayer, MAX_FRAME_STEP_MS, REPLAY_COMMAND_REASON } from './replayPlayer'

const START_MS = 10_000

const messages = [
  heartbeatMessage({ timeMs: START_MS, mode: 'STANDBY' }),
  positionMessage({ timeMs: START_MS + 1000 }),
  heartbeatMessage({ timeMs: START_MS + 2000, mode: 'TAKEOFF' }),
  positionMessage({ timeMs: START_MS + 3000 }),
  heartbeatMessage({ timeMs: START_MS + 4000, mode: 'AUTO' }),
]

function setup() {
  let clockMs = 0
  let frames: (() => void)[] = []
  const onRewind = vi.fn()
  const player = createReplayPlayer(createFlightLog(messages, new Date()), {
    onRewind,
    now: () => clockMs,
    scheduleFrame: (callback) => {
      frames.push(callback)
    },
  })
  const delivered: TelemetryMessage[] = []
  player.transport.subscribeMessages((message) => {
    delivered.push(message)
  })

  function runFrameAfter(elapsedMs: number): void {
    clockMs += elapsedMs
    const pending = frames
    frames = []
    for (const frame of pending) {
      frame()
    }
  }

  function deliveredTimes(): number[] {
    return delivered.map((message) => message.timeMs - START_MS)
  }

  return { player, delivered, deliveredTimes, runFrameAfter, onRewind }
}

describe('replay player', () => {
  it('connects at the start of the log and starts playing', () => {
    const { player, deliveredTimes } = setup()

    player.transport.connect()

    expect(player.transport.getStatus()).toBe('connected')
    expect(deliveredTimes()).toEqual([0])
    expect(player.getState()).toEqual({
      positionMs: 0,
      durationMs: 4000,
      isPlaying: true,
      speed: 1,
    })
  })

  it('delivers messages as playback time reaches them', () => {
    const { player, deliveredTimes, runFrameAfter } = setup()
    player.transport.connect()

    runFrameAfter(200)
    runFrameAfter(200)
    runFrameAfter(200)
    runFrameAfter(200)
    runFrameAfter(200)

    expect(deliveredTimes()).toEqual([0, 1000])
    expect(player.getState().positionMs).toBe(1000)
  })

  it('plays faster at a higher speed', () => {
    const { player, runFrameAfter } = setup()
    player.transport.connect()

    player.setSpeed(4)
    runFrameAfter(200)

    expect(player.getState().positionMs).toBe(800)
  })

  it('does not jump ahead after a long pause between frames', () => {
    const { player, runFrameAfter } = setup()
    player.transport.connect()

    runFrameAfter(30_000)

    expect(player.getState().positionMs).toBe(MAX_FRAME_STEP_MS)
  })

  it('pauses and resumes from where it stopped', () => {
    const { player, deliveredTimes, runFrameAfter } = setup()
    player.transport.connect()
    runFrameAfter(200)

    player.pause()
    runFrameAfter(200)
    expect(player.getState()).toMatchObject({ positionMs: 200, isPlaying: false })

    player.play()
    runFrameAfter(200)
    expect(player.getState()).toMatchObject({ positionMs: 400, isPlaying: true })
    expect(deliveredTimes()).toEqual([0])
  })

  it('stops at the end and starts over when played again', () => {
    const { player, deliveredTimes, runFrameAfter, onRewind } = setup()
    player.transport.connect()
    player.setSpeed(8)

    for (let frame = 0; frame < 5; frame += 1) {
      runFrameAfter(200)
    }
    expect(player.getState()).toMatchObject({ positionMs: 4000, isPlaying: false })
    expect(deliveredTimes()).toEqual([0, 1000, 2000, 3000, 4000])

    player.play()
    expect(onRewind).toHaveBeenCalledTimes(1)
    expect(player.getState()).toMatchObject({ positionMs: 0, isPlaying: true })
    expect(deliveredTimes()).toEqual([0, 1000, 2000, 3000, 4000, 0])
  })

  it('delivers the skipped messages when seeking forward', () => {
    const { player, deliveredTimes, onRewind } = setup()
    player.transport.connect()

    player.seek(3500)

    expect(deliveredTimes()).toEqual([0, 1000, 2000, 3000])
    expect(onRewind).not.toHaveBeenCalled()
    expect(player.getState().positionMs).toBe(3500)
  })

  it('rebuilds from the start when seeking back', () => {
    const { player, deliveredTimes, onRewind } = setup()
    player.transport.connect()
    player.seek(3500)

    player.seek(1500)

    expect(onRewind).toHaveBeenCalledTimes(1)
    expect(deliveredTimes()).toEqual([0, 1000, 2000, 3000, 0, 1000])
    expect(player.getState().positionMs).toBe(1500)
  })

  it('keeps seeks inside the log', () => {
    const { player } = setup()
    player.transport.connect()

    player.seek(99_000)
    expect(player.getState()).toMatchObject({ positionMs: 4000, isPlaying: false })

    player.seek(-5000)
    expect(player.getState().positionMs).toBe(0)
  })

  it('reports the time of each message while delivering it', () => {
    const { player } = setup()
    const clockAtDelivery: number[] = []
    player.transport.subscribeMessages(() => {
      clockAtDelivery.push(player.now() - START_MS)
    })
    player.transport.connect()

    player.seek(3500)

    expect(clockAtDelivery).toEqual([0, 1000, 2000, 3000])
    expect(player.now() - START_MS).toBe(3500)
  })

  it('stops playing when disconnected', () => {
    const { player, runFrameAfter } = setup()
    player.transport.connect()

    player.transport.disconnect()
    runFrameAfter(200)

    expect(player.transport.getStatus()).toBe('disconnected')
    expect(player.getState()).toMatchObject({ positionMs: 0, isPlaying: false })
  })

  it('answers every command with a rejection', () => {
    const { player, delivered } = setup()
    player.transport.connect()

    player.transport.send({ commandId: 7, command: { type: 'ping' } })

    expect(delivered.at(-1)).toMatchObject({
      type: 'commandAck',
      commandId: 7,
      command: 'ping',
      accepted: false,
      reason: REPLAY_COMMAND_REASON,
    })
  })

  it('tells subscribers when the playback changes', () => {
    const { player } = setup()
    const listener = vi.fn()
    player.subscribe(listener)
    player.transport.connect()
    listener.mockClear()

    player.setSpeed(2)
    player.pause()

    expect(listener).toHaveBeenCalledTimes(2)
  })
})
