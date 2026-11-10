import type { FeatureCollection, LineString, Point } from 'geojson'
import type { LatLon } from '../geo/geo'

export type LngLat = [longitude: number, latitude: number]

export function toLngLat(point: LatLon): LngLat {
  return [point.lon, point.lat]
}

export function createLineData(points: readonly LatLon[]): FeatureCollection<LineString> {
  if (points.length < 2) {
    return { type: 'FeatureCollection', features: [] }
  }
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: points.map(toLngLat) },
      },
    ],
  }
}

export function createPointData(
  points: readonly LatLon[],
  highlightedIndex: number | null,
): FeatureCollection<Point, { highlighted: boolean }> {
  return {
    type: 'FeatureCollection',
    features: points.map((point, index) => ({
      type: 'Feature',
      properties: { highlighted: index === highlightedIndex },
      geometry: { type: 'Point', coordinates: toLngLat(point) },
    })),
  }
}
