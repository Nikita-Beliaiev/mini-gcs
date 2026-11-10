import type { GroundStation } from '../station/groundStation'
import { useLatencyStore } from './latencyStore'

export interface LatencyMonitorOptions {
  intervalMs?: number
  now?: () => number
}

export function startLatencyMonitor(
  station: GroundStation,
  { intervalMs = 2000, now = () => performance.now() }: LatencyMonitorOptions = {},
): () => void {
  const { transport, sendCommand } = station
  const { setLatency } = useLatencyStore.getState()
  let isPingInFlight = false
  let isStopped = false

  async function ping(): Promise<void> {
    if (isPingInFlight || transport.getStatus() !== 'connected') {
      return
    }
    isPingInFlight = true
    const sentAtMs = now()
    const result = await sendCommand({ type: 'ping' })
    isPingInFlight = false
    if (!isStopped && transport.getStatus() === 'connected') {
      setLatency(result.status === 'accepted' ? now() - sentAtMs : null)
    }
  }

  const unsubscribe = transport.subscribeStatus(() => {
    if (transport.getStatus() === 'connected') {
      void ping()
    } else {
      setLatency(null)
    }
  })
  const timer = setInterval(() => {
    void ping()
  }, intervalMs)

  return () => {
    isStopped = true
    clearInterval(timer)
    unsubscribe()
  }
}
