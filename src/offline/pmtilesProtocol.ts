import { addProtocol } from 'maplibre-gl'
import { Protocol } from 'pmtiles'

let isRegistered = false

export function registerPmtilesProtocol(): void {
  if (!isRegistered) {
    addProtocol('pmtiles', new Protocol({ metadata: true }).tile)
    isRegistered = true
  }
}
