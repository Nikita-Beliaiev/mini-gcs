import { describe, expect, it } from 'vitest'
import {
  createLineData,
  createPointData,
  createPolygonData,
  createRingData,
  toLngLat,
} from './mapData'

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

describe('createRingData', () => {
  it('closes the line once there are three points', () => {
    const coordinates = createRingData(POINTS).features[0]?.geometry.coordinates

    expect(coordinates).toEqual([
      [11.645, 43.095],
      [11.646, 43.096],
      [11.645, 43.097],
      [11.645, 43.095],
    ])
  })

  it('keeps an open line for two points', () => {
    expect(createRingData(POINTS.slice(0, 2)).features[0]?.geometry.coordinates).toHaveLength(2)
  })
})

describe('createPolygonData', () => {
  it('builds a closed polygon with the breach flag', () => {
    const polygon = createPolygonData(POINTS, true)

    expect(polygon.features[0]?.properties.breached).toBe(true)
    expect(polygon.features[0]?.geometry.coordinates[0]).toHaveLength(4)
  })

  it('is empty without a polygon', () => {
    expect(createPolygonData(null, false).features).toEqual([])
    expect(createPolygonData(POINTS.slice(0, 2), false).features).toEqual([])
  })
})
