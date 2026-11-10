import { describe, expect, it } from 'vitest'
import { systemStatusMessage } from '../test/messages'
import {
  formatArmed,
  formatCoordinates,
  formatDecimal,
  formatDistance,
  formatGps,
  formatHeading,
  NO_VALUE,
} from './format'

describe('formatDecimal', () => {
  it('rounds to the requested number of digits', () => {
    expect(formatDecimal(40.26, 1)).toBe('40.3')
    expect(formatDecimal(87.5, 0)).toBe('88')
    expect(formatDecimal(0, 1)).toBe('0.0')
  })

  it('shows a placeholder without a value', () => {
    expect(formatDecimal(undefined, 1)).toBe(NO_VALUE)
  })
})

describe('formatHeading', () => {
  it.each([
    [0, '000°'],
    [7.4, '007°'],
    [45, '045°'],
    [270.2, '270°'],
    [359.6, '000°'],
  ])('shows %d degrees as %s', (heading, expected) => {
    expect(formatHeading(heading)).toBe(expected)
  })

  it('shows a placeholder without a value', () => {
    expect(formatHeading(undefined)).toBe(NO_VALUE)
  })
})

describe('formatArmed', () => {
  it('names the arming state', () => {
    expect(formatArmed(true)).toBe('Armed')
    expect(formatArmed(false)).toBe('Disarmed')
    expect(formatArmed(undefined)).toBe(NO_VALUE)
  })
})

describe('formatGps', () => {
  it('combines the fix type with the satellite count', () => {
    expect(formatGps(systemStatusMessage({ gpsFix: '3d', gpsSatellites: 14 }))).toBe('3D · 14')
    expect(formatGps(systemStatusMessage({ gpsFix: '2d', gpsSatellites: 4 }))).toBe('2D · 4')
    expect(formatGps(systemStatusMessage({ gpsFix: 'none', gpsSatellites: 0 }))).toBe('No fix · 0')
  })

  it('shows a placeholder without a status', () => {
    expect(formatGps(null)).toBe(NO_VALUE)
  })
})

describe('formatDistance', () => {
  it('uses metres below a kilometre and kilometres above', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(382.6)).toBe('383 m')
    expect(formatDistance(1000)).toBe('1.0 km')
    expect(formatDistance(2372)).toBe('2.4 km')
  })

  it('shows a placeholder without a value', () => {
    expect(formatDistance(undefined)).toBe(NO_VALUE)
  })
})

describe('formatCoordinates', () => {
  it('shows latitude and longitude with five decimals', () => {
    expect(formatCoordinates({ lat: 43.098211, lon: 11.6466 })).toBe('43.09821, 11.64660')
  })
})
