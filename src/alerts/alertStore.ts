import { create } from 'zustand'
import type { Alert, AlertId } from './alertRules'

export interface ActiveAlert extends Alert {
  raisedAtMs: number
  acknowledged: boolean
}

interface AlertState {
  alerts: ActiveAlert[]
  applyEvaluation: (evaluated: readonly Alert[], nowMs: number) => void
  acknowledge: (id: AlertId) => void
  clear: () => void
}

function isSameAlert(active: ActiveAlert | undefined, alert: Alert): boolean {
  return (
    active?.id === alert.id &&
    active.severity === alert.severity &&
    active.message === alert.message
  )
}

export function reconcileAlerts(
  previous: ActiveAlert[],
  evaluated: readonly Alert[],
  nowMs: number,
): ActiveAlert[] {
  const unchanged =
    previous.length === evaluated.length &&
    evaluated.every((alert, index) => isSameAlert(previous[index], alert))
  if (unchanged) {
    return previous
  }

  return evaluated.map((alert) => {
    const existing = previous.find((active) => active.id === alert.id)
    return existing
      ? { ...existing, severity: alert.severity, message: alert.message }
      : { ...alert, raisedAtMs: nowMs, acknowledged: false }
  })
}

export const initialAlertData = { alerts: [] }

export const useAlertStore = create<AlertState>()((set) => ({
  ...initialAlertData,
  applyEvaluation: (evaluated, nowMs) => {
    set((state) => {
      const alerts = reconcileAlerts(state.alerts, evaluated, nowMs)
      return alerts === state.alerts ? state : { alerts }
    })
  },
  acknowledge: (id) => {
    set((state) => ({
      alerts: state.alerts.map((alert) =>
        alert.id === id ? { ...alert, acknowledged: true } : alert,
      ),
    }))
  },
  clear: () => {
    set(initialAlertData)
  },
}))
