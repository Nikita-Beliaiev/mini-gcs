import { describe, expect, it } from 'vitest'
import { crcAccumulate, frameChecksum } from './crc'

describe('crcAccumulate', () => {
  it('computes CRC-16/MCRF4XX, the X.25 variant MAVLink uses', () => {
    const bytes = new TextEncoder().encode('123456789')
    const crc = bytes.reduce((current, byte) => crcAccumulate(byte, current), 0xffff)

    expect(crc).toBe(0x6f91)
  })
})

describe('frameChecksum', () => {
  it('adds the message CRC_EXTRA byte after the frame bytes', () => {
    const bytes = new Uint8Array([1, 2, 3])
    const withoutExtra = bytes.reduce((current, byte) => crcAccumulate(byte, current), 0xffff)

    expect(frameChecksum(bytes, 50)).toBe(crcAccumulate(50, withoutExtra))
  })
})
