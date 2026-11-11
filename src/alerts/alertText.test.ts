import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { uk } from '../i18n/uk'
import type { AlertId } from './alertRules'
import { describeAlert } from './alertText'

describe('describeAlert', () => {
  it.each<[AlertId, string]>([
    ['linkLost', 'Link lost: no heartbeat for over 3 s'],
    ['geofenceBreach', 'Vehicle is outside the geofence'],
    ['batteryCritical', 'Battery below 20%'],
    ['batteryLow', 'Battery below 35%'],
    ['gpsFixLost', 'GPS fix lost in flight'],
  ])('describes %s in English', (id, text) => {
    expect(describeAlert(id, en)).toBe(text)
  })

  it('puts the thresholds into the Ukrainian text', () => {
    expect(describeAlert('batteryCritical', uk)).toBe('Заряд батареї нижче 20%')
  })
})
