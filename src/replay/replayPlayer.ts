import type { TelemetryMessage } from '../protocol/telemetry'
import { createEmitter } from '../shared/emitter'
import { clamp } from '../shared/math'
import type { ConnectionStatus, Transport } from '../transport/transport'
import { flightLogDurationMs, type FlightLog } from './flightLog'

export const PLAYBACK_SPEEDS = [1, 2, 4, 8] as const
export const MAX_FRAME_STEP_MS = 250
export const REPLAY_COMMAND_REASON = 'A replay cannot take commands'

export type PlaybackSpeed = (typeof PLAYBACK_SPEEDS)[number]

export interface PlaybackState {
  positionMs: number
  durationMs: number
  isPlaying: boolean
  speed: PlaybackSpeed
}

export interface ReplayPlayer {
  transport: Transport
  now: () => number
  getState: () => PlaybackState
  subscribe: (listener: () => void) => () => void
  play: () => void
  pause: () => void
  setSpeed: (speed: PlaybackSpeed) => void
  seek: (positionMs: number) => void
}

export interface ReplayPlayerOptions {
  onRewind?: () => void
  now?: () => number
  scheduleFrame?: (callback: () => void) => void
}

function scheduleAnimationFrame(callback: () => void): void {
  requestAnimationFrame(callback)
}

export function createReplayPlayer(
  log: FlightLog,
  {
    onRewind = () => undefined,
    now = () => performance.now(),
    scheduleFrame = scheduleAnimationFrame,
  }: ReplayPlayerOptions = {},
): ReplayPlayer {
  const { messages } = log
  const startMs = messages.at(0)?.timeMs ?? 0
  const durationMs = flightLogDurationMs(messages)
  const endMs = startMs + durationMs
  const statusChanges = createEmitter()
  const deliveries = createEmitter<TelemetryMessage>()
  const stateChanges = createEmitter()
  let status: ConnectionStatus = 'disconnected'
  let state: PlaybackState = { positionMs: 0, durationMs, isPlaying: false, speed: 1 }
  let replayTimeMs = startMs
  let nextIndex = 0
  let lastFrameAtMs = 0
  let isFrameScheduled = false

  function setStatus(next: ConnectionStatus): void {
    status = next
    statusChanges.emit()
  }

  function updateState(changes: Partial<PlaybackState>): void {
    state = { ...state, ...changes }
    stateChanges.emit()
  }

  function deliverUntil(targetMs: number): void {
    let next = messages[nextIndex]
    while (next && next.timeMs <= targetMs) {
      replayTimeMs = next.timeMs
      nextIndex += 1
      deliveries.emit(next)
      next = messages[nextIndex]
    }
    replayTimeMs = targetMs
  }

  function moveTo(targetMs: number): void {
    const clampedMs = clamp(targetMs, startMs, endMs)
    if (clampedMs < replayTimeMs) {
      onRewind()
      nextIndex = 0
    }
    deliverUntil(clampedMs)
    updateState({
      positionMs: clampedMs - startMs,
      isPlaying: state.isPlaying && clampedMs < endMs,
    })
  }

  function requestFrame(): void {
    if (isFrameScheduled || !state.isPlaying) {
      return
    }
    isFrameScheduled = true
    scheduleFrame(onFrame)
  }

  function onFrame(): void {
    isFrameScheduled = false
    if (!state.isPlaying) {
      return
    }
    const frameAtMs = now()
    const elapsedMs = Math.min(frameAtMs - lastFrameAtMs, MAX_FRAME_STEP_MS)
    lastFrameAtMs = frameAtMs
    moveTo(replayTimeMs + elapsedMs * state.speed)
    requestFrame()
  }

  function play(): void {
    if (status !== 'connected' || state.isPlaying) {
      return
    }
    if (replayTimeMs >= endMs) {
      moveTo(startMs)
    }
    lastFrameAtMs = now()
    updateState({ isPlaying: true })
    requestFrame()
  }

  function pause(): void {
    if (state.isPlaying) {
      updateState({ isPlaying: false })
    }
  }

  const transport: Transport = {
    connect() {
      if (status !== 'disconnected') {
        return
      }
      nextIndex = 0
      replayTimeMs = startMs
      setStatus('connected')
      moveTo(startMs)
      play()
    },
    disconnect() {
      pause()
      if (status !== 'disconnected') {
        setStatus('disconnected')
      }
    },
    send(envelope) {
      deliveries.emit({
        type: 'commandAck',
        seq: 0,
        timeMs: replayTimeMs,
        commandId: envelope.commandId,
        command: envelope.command.type,
        accepted: false,
        reason: REPLAY_COMMAND_REASON,
      })
    },
    getStatus: () => status,
    subscribeStatus: statusChanges.subscribe,
    subscribeMessages: deliveries.subscribe,
  }

  return {
    transport,
    now: () => replayTimeMs,
    getState: () => state,
    subscribe: stateChanges.subscribe,
    play,
    pause,
    setSpeed(speed) {
      updateState({ speed })
    },
    seek(positionMs) {
      moveTo(startMs + positionMs)
    },
  }
}
