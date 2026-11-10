import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { createGroundStation } from './station/groundStation'
import { GroundStationContext } from './station/stationContext'
import { simulatorServerUrl } from './transport/serverUrl'
import type { Transport } from './transport/transport'
import { createWorkerTransport } from './transport/workerTransport'
import './index.css'

async function createTransport(): Promise<Transport> {
  const serverUrl = simulatorServerUrl(window.location.search)
  if (serverUrl) {
    const { createWebSocketTransport } = await import('./transport/webSocketTransport')
    return createWebSocketTransport(serverUrl)
  }
  return createWorkerTransport(
    () =>
      new Worker(new URL('./simulator/simulator.worker.ts', import.meta.url), { type: 'module' }),
  )
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

const station = createGroundStation(await createTransport())

createRoot(rootElement).render(
  <StrictMode>
    <GroundStationContext value={station}>
      <App />
    </GroundStationContext>
  </StrictMode>,
)
