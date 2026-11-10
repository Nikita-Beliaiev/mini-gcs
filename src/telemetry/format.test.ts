import { describe, expect, it } from 'vitest'
import { systemStatusMessage } from '../test/messages'
import { formatArmed, formatDecimal, formatGps, formatHeading, NO_VALUE } from './format'

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
