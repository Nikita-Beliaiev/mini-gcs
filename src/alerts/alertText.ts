import type { Messages } from '../i18n/en'
import {
  BATTERY_CRITICAL_PERCENT,
  BATTERY_LOW_PERCENT,
  LINK_LOSS_TIMEOUT_MS,
  type AlertId,
} from './alertRules'

export function describeAlert(id: AlertId, messages: Messages): string {
  const text = messages.alerts
  switch (id) {
    case 'linkLost':
      return text.linkLost(LINK_LOSS_TIMEOUT_MS / 1000)
    case 'geofenceBreach':
      return text.geofenceBreach
    case 'batteryCritical':
      return text.batteryBelow(BATTERY_CRITICAL_PERCENT)
    case 'batteryLow':
      return text.batteryBelow(BATTERY_LOW_PERCENT)
    case 'gpsFixLost':
      return text.gpsFixLost
  }
}
