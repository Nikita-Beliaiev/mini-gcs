import { expect, test } from '@playwright/test'
import { startSimulatorServer, type SimulatorServer } from '../server/simulatorServer'
import { openStation, readout } from './station'

let running: SimulatorServer | null = null

test.afterEach(async () => {
  await running?.close()
  running = null
})

test('flies with the WebSocket simulator and reconnects after it restarts', async ({ page }) => {
  running = await startSimulatorServer({ port: 0 })
  const { url } = running
  const status = page.getByRole('status')

  await openStation(page, `?server=${url}`)
  await expect(readout(page, 'Flight mode')).not.toContainText('—')

  await running.close()
  running = null
  await expect(status).toContainText('Reconnecting…')

  running = await startSimulatorServer({ port: Number(new URL(url).port) })
  await expect(status).toContainText('Connected', { timeout: 20_000 })
})
