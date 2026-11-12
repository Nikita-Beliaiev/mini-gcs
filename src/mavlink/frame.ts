import { frameChecksum } from './crc'
import { MESSAGE_DEFINITIONS, type MavlinkMessage } from './messages'

export const MAGIC_V1 = 0xfe
export const MAGIC_V2 = 0xfd

const V1_HEADER_LENGTH = 6
const V2_HEADER_LENGTH = 10
const CHECKSUM_LENGTH = 2
const SIGNATURE_LENGTH = 13
const SIGNED_FLAG = 0x01

export interface MavlinkFrame {
  version: 1 | 2
  sequence: number
  systemId: number
  componentId: number
  messageId: number
  payload: Uint8Array
  length: number
  checked: boolean
}

export type FrameReadResult =
  { kind: 'frame'; frame: MavlinkFrame } | { kind: 'incomplete' } | { kind: 'invalid' }

interface FrameLayout {
  version: 1 | 2
  headerLength: number
  payloadLength: number
  messageId: number
  sequence: number
  systemId: number
  componentId: number
  trailerLength: number
}

function readLayout(bytes: Uint8Array, offset: number): FrameLayout | null {
  const magic = bytes[offset]
  if (magic === MAGIC_V1) {
    if (offset + V1_HEADER_LENGTH > bytes.length) {
      return null
    }
    return {
      version: 1,
      headerLength: V1_HEADER_LENGTH,
      payloadLength: bytes[offset + 1] ?? 0,
      sequence: bytes[offset + 2] ?? 0,
      systemId: bytes[offset + 3] ?? 0,
      componentId: bytes[offset + 4] ?? 0,
      messageId: bytes[offset + 5] ?? 0,
      trailerLength: CHECKSUM_LENGTH,
    }
  }
  if (offset + V2_HEADER_LENGTH > bytes.length) {
    return null
  }
  const signed = ((bytes[offset + 2] ?? 0) & SIGNED_FLAG) !== 0
  return {
    version: 2,
    headerLength: V2_HEADER_LENGTH,
    payloadLength: bytes[offset + 1] ?? 0,
    sequence: bytes[offset + 4] ?? 0,
    systemId: bytes[offset + 5] ?? 0,
    componentId: bytes[offset + 6] ?? 0,
    messageId:
      (bytes[offset + 7] ?? 0) | ((bytes[offset + 8] ?? 0) << 8) | ((bytes[offset + 9] ?? 0) << 16),
    trailerLength: CHECKSUM_LENGTH + (signed ? SIGNATURE_LENGTH : 0),
  }
}

export function readFrame(bytes: Uint8Array, offset: number): FrameReadResult {
  const magic = bytes[offset]
  if (magic === undefined) {
    return { kind: 'incomplete' }
  }
  if (magic !== MAGIC_V1 && magic !== MAGIC_V2) {
    return { kind: 'invalid' }
  }

  const layout = readLayout(bytes, offset)
  if (!layout) {
    return { kind: 'incomplete' }
  }

  const payloadStart = offset + layout.headerLength
  const checksumStart = payloadStart + layout.payloadLength
  const frameLength = layout.headerLength + layout.payloadLength + layout.trailerLength
  if (offset + frameLength > bytes.length) {
    return { kind: 'incomplete' }
  }

  const definition = MESSAGE_DEFINITIONS.get(layout.messageId)
  if (definition) {
    const received = (bytes[checksumStart] ?? 0) | ((bytes[checksumStart + 1] ?? 0) << 8)
    const expected = frameChecksum(bytes.subarray(offset + 1, checksumStart), definition.crcExtra)
    if (received !== expected) {
      return { kind: 'invalid' }
    }
  }

  return {
    kind: 'frame',
    frame: {
      version: layout.version,
      sequence: layout.sequence,
      systemId: layout.systemId,
      componentId: layout.componentId,
      messageId: layout.messageId,
      payload: bytes.slice(payloadStart, checksumStart),
      length: frameLength,
      checked: definition !== undefined,
    },
  }
}

export function decodeFrame(frame: MavlinkFrame): MavlinkMessage | null {
  const definition = MESSAGE_DEFINITIONS.get(frame.messageId)
  if (!definition || !frame.checked) {
    return null
  }
  const payload = new Uint8Array(definition.length)
  payload.set(frame.payload.subarray(0, definition.length))
  return definition.decode(new DataView(payload.buffer))
}
