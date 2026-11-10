import type { CommandEnvelope } from '../protocol/commands'
import type { TelemetryMessage } from '../protocol/telemetry'
import { DEMO_HOME, DEMO_PATROL_ROUTE } from './demoArea'
import { createSimulator } from './simulator'

const TICK_MS = 20

const simulator = createSimulator({
  home: DEMO_HOME,
  defaultMission: DEMO_PATROL_ROUTE,
  seed: Date.now(),
})

function send(messages: TelemetryMessage[]): void {
  for (const message of messages) {
    postMessage(message)
  }
}

addEventListener('message', (event: MessageEvent<CommandEnvelope>) => {
  send(simulator.handleCommand(event.data))
})

setInterval(() => {
  send(simulator.step(TICK_MS))
}, TICK_MS)
