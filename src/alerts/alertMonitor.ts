import type { GroundStation } from '../station/groundStation'
import { evaluateAlerts } from './alertRules'
import { useAlertStore } from './alertStore'

export interface AlertMonitorOptions {
  now?: () => number
  checkIntervalMs?: number
}

export function startAlertMonitor(
  station: GroundStation,
  { now = () => performance.now(), checkIntervalMs = 1000 }: AlertMonitorOptions = {},
): () => void {
  const { transport, telemetry } = station
  let lastHeartbeatAtMs: number | null = null

  function evaluate(): void {
    const nowMs = now()
    const alerts = evaluateAlerts({
      telemetry: telemetry.getSnapshot(),
      connection: transport.getStatus(),
      msSinceHeartbeat: lastHeartbeatAtMs === null ? null : nowMs - lastHeartbeatAtMs,
    })
    useAlertStore.getState().applyEvaluation(alerts, nowMs)
  }

  const unsubscribers = [
    transport.subscribeMessages((message) => {
      if (message.type === 'heartbeat') {
        lastHeartbeatAtMs = now()
        evaluate()
      }
    }),
    transport.subscribeStatus(() => {
      if (transport.getStatus() !== 'connected') {
        lastHeartbeatAtMs = null
      }
      evaluate()
    }),
    telemetry.subscribe(evaluate),
  ]
  const timer = setInterval(evaluate, checkIntervalMs)
  evaluate()

  return () => {
    clearInterval(timer)
    for (const unsubscribe of unsubscribers) {
      unsubscribe()
    }
    useAlertStore.getState().clear()
  }
}
