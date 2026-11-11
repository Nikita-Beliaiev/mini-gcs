import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Root } from './app/Root'
import { startLocaleSync } from './i18n/localeSync'
import { createLiveSession } from './session/stationSession'
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

startLocaleSync()
const live = createLiveSession(await createTransport())

createRoot(rootElement).render(
  <StrictMode>
    <Root live={live} />
  </StrictMode>,
)
