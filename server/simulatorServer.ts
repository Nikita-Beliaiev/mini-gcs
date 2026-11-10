import { once } from 'node:events'
import { WebSocket, WebSocketServer } from 'ws'
import { parseCommandEnvelope } from '../src/protocol/commands'
import { parseJson } from '../src/protocol/shared'
import type { TelemetryMessage } from '../src/protocol/telemetry'
import { startSimulation } from '../src/simulator/simulation'
import type { Simulator } from '../src/simulator/simulator'

export const DEFAULT_PORT = 8787
export const DEFAULT_HOST = '127.0.0.1'

export interface SimulatorServerOptions {
  port?: number
  host?: string
  simulator?: Simulator
}

export interface SimulatorServer {
  url: string
  close: () => Promise<void>
}

function send(socket: WebSocket, message: TelemetryMessage): void {
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }
}

export async function startSimulatorServer({
  port = DEFAULT_PORT,
  host = DEFAULT_HOST,
  simulator,
}: SimulatorServerOptions = {}): Promise<SimulatorServer> {
  const server = new WebSocketServer({ port, host })
  const simulation = startSimulation((message) => {
    for (const client of server.clients) {
      send(client, message)
    }
  }, simulator)

  server.on('connection', (socket) => {
    socket.on('message', (data, isBinary) => {
      if (isBinary || !Buffer.isBuffer(data)) {
        return
      }
      const envelope = parseCommandEnvelope(parseJson(data.toString('utf8')))
      if (!envelope) {
        return
      }
      for (const reply of simulation.handleCommand(envelope)) {
        send(socket, reply)
      }
    })
  })

  await once(server, 'listening')
  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Simulator server is not listening on a TCP port')
  }

  return {
    url: `ws://${host}:${String(address.port)}`,
    close: () =>
      new Promise((resolve, reject) => {
        simulation.stop()
        for (const client of server.clients) {
          client.terminate()
        }
        server.close((error) => {
          if (error) {
            reject(error)
          } else {
            resolve()
          }
        })
      }),
  }
}
