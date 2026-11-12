import flightTlogUrl from '../mavlink/fixtures/flight.tlog?inline'
import transfersTlogUrl from '../mavlink/fixtures/transfers.tlog?inline'

function dataUrlBytes(url: string): Uint8Array<ArrayBuffer> {
  const base64 = url.slice(url.indexOf(',') + 1)
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

export function flightTlogBytes(): Uint8Array<ArrayBuffer> {
  return dataUrlBytes(flightTlogUrl)
}

export function transfersTlogBytes(): Uint8Array<ArrayBuffer> {
  return dataUrlBytes(transfersTlogUrl)
}
