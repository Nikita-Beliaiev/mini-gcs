import { createGroundStation, type GroundStation } from '../station/groundStation'
import { createTelemetryStore, type TelemetryStore } from '../telemetry/telemetryStore'
import { createFakeTransport, type FakeTransport } from './fakeTransport'

export function telemetryStoreWithoutFrames(): TelemetryStore {
  return createTelemetryStore({
    scheduleFrame: (callback) => {
      callback()
    },
  })
}

export function createTestStation(): { station: GroundStation; transport: FakeTransport } {
  const transport = createFakeTransport()
  return { station: createGroundStation(transport, telemetryStoreWithoutFrames()), transport }
}
