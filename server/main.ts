import { DEFAULT_PORT, startSimulatorServer } from './simulatorServer'

const port = Number(process.env.SIM_PORT ?? DEFAULT_PORT)
const server = await startSimulatorServer({ port })

console.log(`Simulator is running at ${server.url}`)
console.log(`Open the station with ?server=${server.url}`)

process.on('SIGINT', () => {
  void server.close().then(() => {
    process.exit(0)
  })
})
