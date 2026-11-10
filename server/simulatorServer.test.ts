import { afterEach, describe, expect, it } from 'vitest'
import { WebSocket } from 'ws'
import { parseJson } from '../src/protocol/shared'
import { parseTelemetryMessage, type TelemetryMessage } from '../src/protocol/telemetry'
import { startSimulatorServer, type SimulatorServer } from './simulatorServer'

const servers: SimulatorServer[] = []
const sockets: WebSocket[] = []

afterEach(async () => {
  for (const socket of sockets.splice(0)) {
    socket.terminate()
  }
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

async function startServer(): Promise<SimulatorServer> {
  const server = await startSimulatorServer({ port: 0 })
  servers.push(server)
  return server
}

interface Client {
  socket: WebSocket
  received: TelemetryMessage[]
  waitFor: (isWanted: (message: TelemetryMessage) => boolean) => Promise<TelemetryMessage>
}

async function connect(url: string): Promise<Client> {
  const socket = new WebSocket(url)
  sockets.push(socket)
  const received: TelemetryMessage[] = []
  const waiters: {
    isWanted: (message: TelemetryMessage) => boolean
    resolve: (message: TelemetryMessage) => void
  }[] = []

  socket.on('message', (data) => {
    const message = Buffer.isBuffer(data)
      ? parseTelemetryMessage(parseJson(data.toString('utf8')))
      : null
    if (!message) {
      throw new Error('Server sent a message that does not follow the protocol')
    }
    received.push(message)
    for (const waiter of [...waiters]) {
      if (waiter.isWanted(message)) {
        waiters.splice(waiters.indexOf(waiter), 1)
        waiter.resolve(message)
      }
    }
  })
  await new Promise((resolve) => socket.once('open', resolve))

  return {
    socket,
    received,
    waitFor: (isWanted) =>
      new Promise((resolve) => {
        waiters.push({ isWanted, resolve })
      }),
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

describe('startSimulatorServer', () => {
  it('listens on the local machine only', async () => {
    const server = await startServer()

    expect(server.url).toMatch(/^ws:\/\/127\.0\.0\.1:\d+$/)
  })

  it('streams telemetry to every connected client', async () => {
    const server = await startServer()
    const first = await connect(server.url)
    const second = await connect(server.url)

    const isHeartbeat = (message: TelemetryMessage) => message.type === 'heartbeat'

    await expect(first.waitFor(isHeartbeat)).resolves.toMatchObject({ type: 'heartbeat' })
    await expect(second.waitFor(isHeartbeat)).resolves.toMatchObject({ type: 'heartbeat' })
  })

  it('answers a command only to the client that sent it', async () => {
    const server = await startServer()
    const asking = await connect(server.url)
    const watching = await connect(server.url)

    asking.socket.send(JSON.stringify({ commandId: 5, command: { type: 'ping' } }))
    const ack = await asking.waitFor((message) => message.type === 'commandAck')
    await delay(100)

    expect(ack).toMatchObject({ commandId: 5, command: 'ping', accepted: true })
    expect(watching.received.some((message) => message.type === 'commandAck')).toBe(false)
  })

  it('ignores malformed commands and keeps serving', async () => {
    const server = await startServer()
    const client = await connect(server.url)

    client.socket.send('not json')
    client.socket.send(JSON.stringify({ commandId: 1, command: { type: 'selfDestruct' } }))
    client.socket.send(JSON.stringify({ commandId: 2, command: { type: 'ping' } }))
    const ack = await client.waitFor((message) => message.type === 'commandAck')

    expect(ack).toMatchObject({ commandId: 2 })
  })
})
