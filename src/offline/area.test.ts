import { describe, expect, it } from 'vitest'
import { DEMO_HOME, DEMO_PATROL_ROUTE } from '../simulator/demoArea'
import { boundsText, DEMO_AREA_BOUNDS, isInsideArea, tilesCovering } from './area'

describe('the offline area', () => {
  it('covers home, the patrol and the whole mission range around home', () => {
    expect(isInsideArea(DEMO_HOME)).toBe(true)
    expect(DEMO_PATROL_ROUTE.every((point) => isInsideArea(point))).toBe(true)
    expect(isInsideArea({ lat: DEMO_HOME.lat + 0.036, lon: DEMO_HOME.lon })).toBe(true)
    expect(isInsideArea({ lat: DEMO_HOME.lat, lon: DEMO_HOME.lon - 0.05 })).toBe(true)
  })

  it('leaves out points beyond its edges', () => {
    expect(isInsideArea({ lat: 43.2, lon: 11.645 })).toBe(false)
    expect(isInsideArea({ lat: 43.095, lon: 11.5 })).toBe(false)
  })

  it('lists the tiles that cover it at each zoom', () => {
    expect(tilesCovering(DEMO_AREA_BOUNDS, 0)).toEqual([{ zoom: 0, x: 0, y: 0 }])
    const tiles = tilesCovering(DEMO_AREA_BOUNDS, 13)
    expect(tiles).toHaveLength(16)
    expect(tiles[0]).toEqual({ zoom: 13, x: 4359, y: 3005 })
  })

  it('writes its bounds the way the pmtiles tool reads them', () => {
    expect(boundsText(DEMO_AREA_BOUNDS)).toBe('11.58,43.05,11.71,43.14')
  })
})
