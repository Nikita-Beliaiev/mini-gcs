import { describe, expect, it } from 'vitest'
import { createTrailData, toLngLat } from './mapData'

describe('toLngLat', () => {
  it('puts longitude first, as GeoJSON and MapLibre expect', () => {
    expect(toLngLat({ lat: 43.095, lon: 11.645 })).toEqual([11.645, 43.095])
  })
})

describe('createTrailData', () => {
  it('has no line until there are two points', () => {
    expect(createTrailData([]).features).toEqual([])
    expect(createTrailData([{ lat: 43.095, lon: 11.645 }]).features).toEqual([])
  })

  it('draws one line through the points in order', () => {
    const trail = createTrailData([
      { lat: 43.095, lon: 11.645 },
      { lat: 43.096, lon: 11.646 },
      { lat: 43.097, lon: 11.645 },
    ])

    expect(trail.features).toHaveLength(1)
    expect(trail.features[0]?.geometry.coordinates).toEqual([
      [11.645, 43.095],
      [11.646, 43.096],
      [11.645, 43.097],
    ])
  })
})
