import { describe, expect, it } from 'vitest'
import { DEMO_HOME } from '../simulator/demoArea'
import { formatMgrs } from './mgrs'

describe('formatMgrs', () => {
  it('writes the demo home in UTM zone 32, latitude band T, to the metre', () => {
    expect(formatMgrs(DEMO_HOME)).toBe('32T QN 15262 74760')
  })

  it('separates the grid zone, the 100 km square, the easting and the northing', () => {
    expect(formatMgrs({ lat: -33.8568, lon: 151.2153 })).toMatch(/^56H [A-Z]{2} \d{5} \d{5}$/)
    expect(formatMgrs({ lat: 38.889484, lon: -77.035278 })).toMatch(/^18S UJ \d{5} \d{5}$/)
  })

  it('has no reference in the polar regions MGRS leaves to UPS', () => {
    expect(formatMgrs({ lat: 84.5, lon: 10 })).toBeNull()
    expect(formatMgrs({ lat: -80.5, lon: 10 })).toBeNull()
  })
})
