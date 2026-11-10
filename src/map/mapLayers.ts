import type { GeoJSON } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

export const SOURCES = {
  vehicleMissionLine: 'vehicle-mission-line',
  draftMissionLine: 'draft-mission-line',
  trail: 'trail',
  vehicleMissionPoints: 'vehicle-mission-points',
} as const

export type SourceId = (typeof SOURCES)[keyof typeof SOURCES]

const COLORS = {
  trail: '#38bdf8',
  vehicleMission: '#94a3b8',
  activeWaypoint: '#38bdf8',
  draft: '#c084fc',
  outline: '#0b0f14',
}

export function addMapLayers(map: MapLibreMap): void {
  for (const id of Object.values(SOURCES)) {
    map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }

  map.addLayer({
    id: SOURCES.vehicleMissionLine,
    type: 'line',
    source: SOURCES.vehicleMissionLine,
    layout: { 'line-join': 'round' },
    paint: { 'line-color': COLORS.vehicleMission, 'line-width': 2, 'line-opacity': 0.7 },
  })
  map.addLayer({
    id: SOURCES.draftMissionLine,
    type: 'line',
    source: SOURCES.draftMissionLine,
    paint: { 'line-color': COLORS.draft, 'line-width': 2, 'line-dasharray': [2, 2] },
  })
  map.addLayer({
    id: SOURCES.trail,
    type: 'line',
    source: SOURCES.trail,
    layout: { 'line-cap': 'round', 'line-join': 'round' },
    paint: { 'line-color': COLORS.trail, 'line-width': 2.5, 'line-opacity': 0.85 },
  })
  map.addLayer({
    id: SOURCES.vehicleMissionPoints,
    type: 'circle',
    source: SOURCES.vehicleMissionPoints,
    paint: {
      'circle-radius': ['case', ['get', 'highlighted'], 7, 4],
      'circle-color': [
        'case',
        ['get', 'highlighted'],
        COLORS.activeWaypoint,
        COLORS.vehicleMission,
      ],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': COLORS.outline,
    },
  })
}

export function setSourceData(map: MapLibreMap, id: SourceId, data: GeoJSON): void {
  void map.getSource<GeoJSONSource>(id)?.setData(data)
}
