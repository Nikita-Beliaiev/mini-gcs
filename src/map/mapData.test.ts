import { describe, expect, it } from 'vitest'
import { createLineData, createPointData, toLngLat } from './mapData'

const POINTS = [
  { lat: 43.095, lon: 11.645 },
  { lat: 43.096, lon: 11.646 },
  { lat: 43.097, lon: 11.645 },
]

describe('toLngLat', () => {
  it('puts longitude first, as GeoJSON and MapLibre expect', () => {
    expect(toLngLat({ lat: 43.095, lon: 11.645 })).toEqual([11.645, 43.095])
  })
})

describe('createLineData', () => {
  it('has no line until there are two points', () => {
    expect(createLineData([]).features).toEqual([])
    expect(createLineData(POINTS.slice(0, 1)).features).toEqual([])
  })

  it('draws one line through the points in order', () => {
    const line = createLineData(POINTS)

    expect(line.features).toHaveLength(1)
    expect(line.features[0]?.geometry.coordinates).toEqual([
      [11.645, 43.095],
      [11.646, 43.096],
      [11.645, 43.097],
    ])
  })
})

describe('createPointData', () => {
  it('creates one point per position and marks the highlighted one', () => {
    const points = createPointData(POINTS, 1)

    expect(points.features.map((feature) => feature.geometry.coordinates)).toEqual(
      POINTS.map(toLngLat),
    )
    expect(points.features.map((feature) => feature.properties.highlighted)).toEqual([
      false,
      true,
      false,
    ])
  })

  it('highlights nothing without an index', () => {
    const points = createPointData(POINTS, null)

    expect(points.features.some((feature) => feature.properties.highlighted)).toBe(false)
  })
})
