import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { uk } from '../i18n/uk'
import { systemStatusMessage } from '../test/messages'
import {
  formatArmed,
  formatCoordinates,
  formatDecimal,
  formatDistance,
  formatDuration,
  formatGps,
  formatHeading,
  formatLatency,
  formatSignedAngle,
  formatUtcTime,
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

describe('formatSignedAngle', () => {
  it.each([
    [12.4, '+12°'],
    [-9.6, '-10°'],
    [0.2, '0°'],
    [-0.2, '0°'],
  ])('shows %d degrees as %s', (degrees, expected) => {
    expect(formatSignedAngle(degrees)).toBe(expected)
  })

  it('shows a placeholder without a value', () => {
    expect(formatSignedAngle(undefined)).toBe(NO_VALUE)
  })
})

describe('formatLatency', () => {
  it('rounds to whole milliseconds', () => {
    expect(formatLatency(0.4)).toBe('<1 ms')
    expect(formatLatency(3.6)).toBe('4 ms')
    expect(formatLatency(120)).toBe('120 ms')
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
    expect(formatDistance(0, en.units)).toBe('0 m')
    expect(formatDistance(382.6, en.units)).toBe('383 m')
    expect(formatDistance(1000, en.units)).toBe('1.0 km')
    expect(formatDistance(2372, en.units)).toBe('2.4 km')
    expect(formatDistance(2372, uk.units)).toBe('2.4 км')
  })

  it('shows a placeholder without a value', () => {
    expect(formatDistance(undefined, en.units)).toBe(NO_VALUE)
  })
})

describe('formatCoordinates', () => {
  it('shows latitude and longitude with five decimals', () => {
    expect(formatCoordinates({ lat: 43.098211, lon: 11.6466 })).toBe('43.09821, 11.64660')
  })
})

describe('formatDuration', () => {
  it('shows minutes and seconds, rounding down', () => {
    expect(formatDuration(0)).toBe('0:00')
    expect(formatDuration(9_999)).toBe('0:09')
    expect(formatDuration(252_000)).toBe('4:12')
    expect(formatDuration(4_500_000)).toBe('75:00')
  })

  it('never shows a negative time', () => {
    expect(formatDuration(-500)).toBe('0:00')
  })
})

describe('formatUtcTime', () => {
  it('shows the date and the minute in UTC', () => {
    expect(formatUtcTime('2026-11-11T10:15:30.000Z')).toBe('2026-11-11 10:15 UTC')
  })
})
