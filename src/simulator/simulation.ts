import type { CommandEnvelope } from '../protocol/commands'
import type { TelemetryMessage } from '../protocol/telemetry'
import { DEMO_HOME, DEMO_PATROL_ROUTE } from './demoArea'
import { createSimulator, type Simulator } from './simulator'

export const SIMULATION_TICK_MS = 20

export interface RunningSimulation {
  handleCommand: (envelope: CommandEnvelope) => TelemetryMessage[]
  stop: () => void
}

export function createDemoVehicle(seed = Date.now()): Simulator {
  return createSimulator({ home: DEMO_HOME, defaultMission: DEMO_PATROL_ROUTE, seed })
}

export function startSimulation(
  broadcast: (message: TelemetryMessage) => void,
  simulator: Simulator = createDemoVehicle(),
  tickMs = SIMULATION_TICK_MS,
): RunningSimulation {
  const timer = setInterval(() => {
    for (const message of simulator.step(tickMs)) {
      broadcast(message)
    }
  }, tickMs)

  return {
    handleCommand: simulator.handleCommand,
    stop: () => {
      clearInterval(timer)
    },
  }
}
