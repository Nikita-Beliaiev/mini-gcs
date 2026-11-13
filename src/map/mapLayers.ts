import type { GeoJSON } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

export const SOURCES = {
  cameraFootprint: 'camera-footprint',
  cameraSight: 'camera-sight',
  vehicleGeofence: 'vehicle-geofence',
  draftGeofence: 'draft-geofence',
  vehicleMissionLine: 'vehicle-mission-line',
  draftMissionLine: 'draft-mission-line',
  trail: 'trail',
  vehicleMissionPoints: 'vehicle-mission-points',
  selectedPoint: 'selected-point',
} as const

export type SourceId = (typeof SOURCES)[keyof typeof SOURCES]

const COLORS = {
  trail: '#38bdf8',
  vehicleMission: '#94a3b8',
  activeWaypoint: '#38bdf8',
  draft: '#c084fc',
  geofence: '#34d399',
  breach: '#f87171',
  selectedPoint: '#fbbf24',
  camera: '#f472b6',
  outline: '#0b0f14',
}

export function addMapLayers(map: MapLibreMap): void {
  for (const id of Object.values(SOURCES)) {
    map.addSource(id, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  }

  const geofenceColor = ['case', ['get', 'breached'], COLORS.breach, COLORS.geofence] as [
    'case',
    ['get', string],
    string,
    string,
  ]

  map.addLayer({
    id: `${SOURCES.vehicleGeofence}-fill`,
    type: 'fill',
    source: SOURCES.vehicleGeofence,
    paint: {
      'fill-color': geofenceColor,
      'fill-opacity': ['case', ['get', 'breached'], 0.18, 0.08],
    },
  })
  map.addLayer({
    id: `${SOURCES.vehicleGeofence}-outline`,
    type: 'line',
    source: SOURCES.vehicleGeofence,
    paint: { 'line-color': geofenceColor, 'line-width': 2 },
  })
  map.addLayer({
    id: `${SOURCES.cameraFootprint}-fill`,
    type: 'fill',
    source: SOURCES.cameraFootprint,
    paint: { 'fill-color': COLORS.camera, 'fill-opacity': 0.08 },
  })
  map.addLayer({
    id: `${SOURCES.cameraFootprint}-outline`,
    type: 'line',
    source: SOURCES.cameraFootprint,
    paint: { 'line-color': COLORS.camera, 'line-width': 1.5, 'line-opacity': 0.8 },
  })
  map.addLayer({
    id: SOURCES.cameraSight,
    type: 'line',
    source: SOURCES.cameraSight,
    paint: { 'line-color': COLORS.camera, 'line-width': 1, 'line-dasharray': [2, 2] },
  })
  map.addLayer({
    id: SOURCES.draftGeofence,
    type: 'line',
    source: SOURCES.draftGeofence,
    paint: { 'line-color': COLORS.draft, 'line-width': 2, 'line-dasharray': [1, 2] },
  })
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
  map.addLayer({
    id: SOURCES.selectedPoint,
    type: 'circle',
    source: SOURCES.selectedPoint,
    paint: {
      'circle-radius': 6,
      'circle-color': 'rgba(0, 0, 0, 0)',
      'circle-stroke-width': 2.5,
      'circle-stroke-color': COLORS.selectedPoint,
    },
  })
}

export function setSourceData(map: MapLibreMap, id: SourceId, data: GeoJSON): void {
  void map.getSource<GeoJSONSource>(id)?.setData(data)
}
