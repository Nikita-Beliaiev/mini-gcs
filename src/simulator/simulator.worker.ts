import { DEMO_HOME, DEMO_PATROL_ROUTE } from './demoArea'
import { createSimulator } from './simulator'

const TICK_MS = 50

const simulator = createSimulator({
  home: DEMO_HOME,
  patrolRoute: DEMO_PATROL_ROUTE,
  seed: Date.now(),
})

setInterval(() => {
  for (const message of simulator.step(TICK_MS)) {
    postMessage(message)
  }
}, TICK_MS)
