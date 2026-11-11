import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { startAlertMonitor } from '../alerts/alertMonitor'
import { useAlertStore } from '../alerts/alertStore'
import type { TelemetryMessage } from '../protocol/telemetry'
import { heartbeatMessage, positionMessage } from '../test/messages'
import { createTestLiveSession, createTestReplaySession } from '../test/session'

const positions = Array.from({ length: 5 }, (_, index) =>
  positionMessage({ seq: index, timeMs: index * 1000 }),
)

function alertIds(): string[] {
  return useAlertStore.getState().alerts.map((alert) => alert.id)
}

describe('live session', () => {
  it('records everything the vehicle sends', () => {
    const { session, transport } = createTestLiveSession()
    const heartbeat = heartbeatMessage()

    transport.receive(heartbeat)

    expect(session.recorder.getMessages()).toEqual([heartbeat])
    expect(session.station.telemetry.getSnapshot().heartbeat).toBe(heartbeat)
  })
})

describe('replay session', () => {
  it('plays the log into the station telemetry', () => {
    const { session } = createTestReplaySession(positions)
    session.station.connect()

    session.player.seek(2500)

    expect(session.station.telemetry.getSnapshot().position).toBe(positions[2])
    expect(session.station.telemetry.getPositionHistory()).toEqual(positions.slice(0, 3))
  })

  it('rebuilds the telemetry when seeking back', () => {
    const { session } = createTestReplaySession(positions)
    session.station.connect()
    session.player.seek(4000)

    session.player.seek(1000)

    expect(session.station.telemetry.getSnapshot().position).toBe(positions[1])
    expect(session.station.telemetry.getPositionHistory()).toEqual(positions.slice(0, 2))
  })
})

describe('alerts during a replay', () => {
  const linkLossLog: TelemetryMessage[] = [
    heartbeatMessage({ timeMs: 0 }),
    heartbeatMessage({ timeMs: 1000 }),
    ...Array.from({ length: 16 }, (_, index) => positionMessage({ timeMs: 500 * (index + 1) })),
    heartbeatMessage({ timeMs: 9000 }),
  ].sort((first, second) => first.timeMs - second.timeMs)

  function setup() {
    const replay = createTestReplaySession(linkLossLog)
    const { station, player } = replay.session
    const stop = startAlertMonitor(station, { now: player.now })
    station.connect()
    return { ...replay, stop }
  }

  function playFor(runFrameAfter: (elapsedMs: number) => void, ms: number): void {
    for (let elapsedMs = 0; elapsedMs < ms; elapsedMs += 250) {
      runFrameAfter(250)
    }
  }

  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('raises a recorded link loss when the replay reaches it', () => {
    const { runFrameAfter, stop } = setup()

    playFor(runFrameAfter, 4000)
    expect(alertIds()).toEqual([])

    playFor(runFrameAfter, 500)
    expect(alertIds()).toEqual(['linkLost'])

    playFor(runFrameAfter, 4500)
    expect(alertIds()).toEqual([])
    stop()
  })

  it('does not report a lost link while the replay is paused', () => {
    const { session, runFrameAfter, stop } = setup()
    playFor(runFrameAfter, 1500)

    session.player.pause()
    vi.advanceTimersByTime(10_000)

    expect(alertIds()).toEqual([])
    stop()
  })
})
