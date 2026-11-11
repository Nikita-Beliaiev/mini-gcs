import { describe, expect, it } from 'vitest'
import type { Alert } from './alertRules'
import { reconcileAlerts, useAlertStore } from './alertStore'

const LINK_LOST: Alert = { id: 'linkLost', severity: 'critical' }
const BATTERY_LOW: Alert = { id: 'batteryLow', severity: 'warning' }

describe('reconcileAlerts', () => {
  it('raises new alerts unacknowledged at the current time', () => {
    expect(reconcileAlerts([], [LINK_LOST], 1000)).toEqual([
      { ...LINK_LOST, raisedAtMs: 1000, acknowledged: false },
    ])
  })

  it('keeps the original raise time and acknowledgement of a lasting alert', () => {
    const previous = [{ ...LINK_LOST, raisedAtMs: 1000, acknowledged: true }]

    const next = reconcileAlerts(previous, [BATTERY_LOW, LINK_LOST], 5000)

    expect(next).toEqual([
      { ...BATTERY_LOW, raisedAtMs: 5000, acknowledged: false },
      { ...LINK_LOST, raisedAtMs: 1000, acknowledged: true },
    ])
  })

  it('drops alerts whose condition has cleared', () => {
    const previous = [{ ...LINK_LOST, raisedAtMs: 1000, acknowledged: false }]

    expect(reconcileAlerts(previous, [], 2000)).toEqual([])
  })

  it('returns the same list when nothing changed', () => {
    const previous = [{ ...LINK_LOST, raisedAtMs: 1000, acknowledged: false }]

    expect(reconcileAlerts(previous, [LINK_LOST], 2000)).toBe(previous)
  })
})

describe('useAlertStore', () => {
  it('acknowledges one alert and raises it again after it clears', () => {
    const { applyEvaluation, acknowledge } = useAlertStore.getState()
    applyEvaluation([LINK_LOST, BATTERY_LOW], 1000)

    acknowledge('linkLost')
    expect(useAlertStore.getState().alerts.map((alert) => alert.acknowledged)).toEqual([
      true,
      false,
    ])

    applyEvaluation([BATTERY_LOW], 2000)
    applyEvaluation([LINK_LOST, BATTERY_LOW], 3000)
    expect(useAlertStore.getState().alerts[0]).toMatchObject({
      id: 'linkLost',
      acknowledged: false,
      raisedAtMs: 3000,
    })
  })

  it('clears every alert', () => {
    const { applyEvaluation, clear } = useAlertStore.getState()
    applyEvaluation([LINK_LOST, BATTERY_LOW], 1000)

    clear()

    expect(useAlertStore.getState().alerts).toEqual([])
  })
})
