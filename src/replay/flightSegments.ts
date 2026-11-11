import { LINK_LOSS_TIMEOUT_MS } from '../alerts/alertRules'
import type { FlightMode, TelemetryMessage } from '../protocol/telemetry'

export type SegmentKind = FlightMode | 'noLink'

export interface FlightSegment {
  kind: SegmentKind
  startMs: number
  endMs: number
}

function addSegment(segments: FlightSegment[], segment: FlightSegment): void {
  const last = segments.at(-1)
  if (last?.kind === segment.kind && last.endMs === segment.startMs) {
    segments[segments.length - 1] = { ...last, endMs: segment.endMs }
    return
  }
  if (segment.endMs > segment.startMs) {
    segments.push(segment)
  }
}

export function flightSegments(
  messages: readonly TelemetryMessage[],
  linkLossMs = LINK_LOSS_TIMEOUT_MS,
): FlightSegment[] {
  const logStartMs = messages.at(0)?.timeMs ?? 0
  const durationMs = (messages.at(-1)?.timeMs ?? 0) - logStartMs
  const segments: FlightSegment[] = []
  let mode: FlightMode | null = null
  let modeStartMs = 0
  let lastHeartbeatMs = 0

  function closeMode(endMs: number): void {
    if (mode) {
      addSegment(segments, { kind: mode, startMs: modeStartMs, endMs })
    }
  }

  for (const message of messages) {
    if (message.type !== 'heartbeat') {
      continue
    }
    const atMs = message.timeMs - logStartMs
    if (mode && atMs - lastHeartbeatMs > linkLossMs) {
      closeMode(lastHeartbeatMs)
      addSegment(segments, { kind: 'noLink', startMs: lastHeartbeatMs, endMs: atMs })
      modeStartMs = atMs
    } else if (message.mode !== mode) {
      closeMode(atMs)
      modeStartMs = atMs
    }
    mode = message.mode
    lastHeartbeatMs = atMs
  }

  if (mode && durationMs - lastHeartbeatMs > linkLossMs) {
    closeMode(lastHeartbeatMs)
    addSegment(segments, { kind: 'noLink', startMs: lastHeartbeatMs, endMs: durationMs })
  } else {
    closeMode(durationMs)
  }
  return segments
}
