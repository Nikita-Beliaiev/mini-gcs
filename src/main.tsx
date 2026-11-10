import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './app/App'
import { createGroundStation } from './station/groundStation'
import { GroundStationContext } from './station/stationContext'
import { createWorkerTransport } from './transport/workerTransport'
import './index.css'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element #root not found')
}

const station = createGroundStation(
  createWorkerTransport(
    () =>
      new Worker(new URL('./simulator/simulator.worker.ts', import.meta.url), { type: 'module' }),
  ),
)

createRoot(rootElement).render(
  <StrictMode>
    <GroundStationContext value={station}>
      <App />
    </GroundStationContext>
  </StrictMode>,
)
