import type { FeatureCollection, LineString } from 'geojson'
import type { LatLon } from '../geo/geo'

export type LngLat = [longitude: number, latitude: number]

export function toLngLat(point: LatLon): LngLat {
  return [point.lon, point.lat]
}

export function createTrailData(points: readonly LatLon[]): FeatureCollection<LineString> {
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
