import type { TelemetryState } from '../telemetry/telemetryStore'
import type { ConnectionStatus } from '../transport/transport'

export type AlertSeverity = 'warning' | 'critical'

export type AlertId =
  'linkLost' | 'geofenceBreach' | 'batteryCritical' | 'batteryLow' | 'gpsFixLost'

export interface Alert {
  id: AlertId
  severity: AlertSeverity
  message: string
}

export interface AlertInputs {
  telemetry: TelemetryState
  connection: ConnectionStatus
  msSinceHeartbeat: number | null
}

export const LINK_LOSS_TIMEOUT_MS = 3000
export const BATTERY_LOW_PERCENT = 35
export const BATTERY_CRITICAL_PERCENT = 20

export function evaluateAlerts({ telemetry, connection, msSinceHeartbeat }: AlertInputs): Alert[] {
  if (connection !== 'connected') {
    return []
  }

  const alerts: Alert[] = []
  const status = telemetry.systemStatus
  const isArmed = telemetry.heartbeat?.armed ?? false

  if (msSinceHeartbeat !== null && msSinceHeartbeat > LINK_LOSS_TIMEOUT_MS) {
    alerts.push({
      id: 'linkLost',
      severity: 'critical',
      message: `Link lost: no heartbeat for over ${String(LINK_LOSS_TIMEOUT_MS / 1000)} s`,
    })
  }
  if (status?.fenceBreached) {
    alerts.push({
      id: 'geofenceBreach',
      severity: 'critical',
      message: 'Vehicle is outside the geofence',
    })
  }
  if (status && status.batteryPercent <= BATTERY_CRITICAL_PERCENT) {
    alerts.push({
      id: 'batteryCritical',
      severity: 'critical',
      message: `Battery below ${String(BATTERY_CRITICAL_PERCENT)}%`,
    })
  } else if (status && status.batteryPercent <= BATTERY_LOW_PERCENT) {
    alerts.push({
      id: 'batteryLow',
      severity: 'warning',
      message: `Battery below ${String(BATTERY_LOW_PERCENT)}%`,
    })
  }
  if (status && isArmed && status.gpsFix !== '3d') {
    alerts.push({ id: 'gpsFixLost', severity: 'warning', message: 'GPS fix lost in flight' })
  }

  return alerts
}
