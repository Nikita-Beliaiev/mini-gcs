export function crcAccumulate(byte: number, crc: number): number {
  let mixed = (byte ^ crc) & 0xff
  mixed = (mixed ^ (mixed << 4)) & 0xff
  return ((crc >> 8) ^ (mixed << 8) ^ (mixed << 3) ^ (mixed >> 4)) & 0xffff
}

export function frameChecksum(bytes: Uint8Array, crcExtra: number): number {
  let crc = 0xffff
  for (const byte of bytes) {
    crc = crcAccumulate(byte, crc)
  }
  return crcAccumulate(crcExtra, crc)
}
