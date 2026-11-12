import { readFrame, type MavlinkFrame } from './frame'

const TIMESTAMP_LENGTH = 8
const EARLIEST_TIME_US = Date.UTC(2000, 0, 1) * 1000
const LATEST_TIME_US = Date.UTC(2100, 0, 1) * 1000
const MAX_FORWARD_JUMP_US = 24 * 60 * 60 * 1_000_000
const MAX_BACKWARD_JUMP_US = 1_000_000

export interface TlogRecord {
  timeUs: number
  frame: MavlinkFrame
}

export interface TlogContents {
  records: TlogRecord[]
  skippedBytes: number
}

function isPlausibleTime(timeUs: number, previousUs: number | null): boolean {
  if (previousUs === null) {
    return timeUs >= EARLIEST_TIME_US && timeUs < LATEST_TIME_US
  }
  return timeUs >= previousUs - MAX_BACKWARD_JUMP_US && timeUs <= previousUs + MAX_FORWARD_JUMP_US
}

export function readTlog(bytes: Uint8Array): TlogContents {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const records: TlogRecord[] = []
  let previousUs: number | null = null
  let skippedBytes = 0
  let offset = 0

  while (offset + TIMESTAMP_LENGTH < bytes.length) {
    const timeUs = Number(view.getBigUint64(offset, false))
    const result = isPlausibleTime(timeUs, previousUs)
      ? readFrame(bytes, offset + TIMESTAMP_LENGTH)
      : ({ kind: 'invalid' } as const)

    if (result.kind === 'frame') {
      records.push({ timeUs, frame: result.frame })
      previousUs = timeUs
      offset += TIMESTAMP_LENGTH + result.frame.length
    } else {
      offset += 1
      skippedBytes += 1
    }
  }

  return { records, skippedBytes: skippedBytes + (bytes.length - offset) }
}
