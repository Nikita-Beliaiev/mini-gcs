import type { CommandEnvelope } from '../protocol/commands'
import { startSimulation } from './simulation'

const simulation = startSimulation((message) => {
  postMessage(message)
})

addEventListener('message', (event: MessageEvent<CommandEnvelope>) => {
  for (const reply of simulation.handleCommand(event.data)) {
    postMessage(reply)
  }
})
