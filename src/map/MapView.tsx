import { Map as MapLibreMap, NavigationControl, type CameraOptions } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useEffectEvent, useRef } from 'react'
import { cameraTarget } from '../camera/cameraTarget'
import type { LatLon } from '../geo/geo'
import { useMessages } from '../i18n/localeStore'
import type {
  CameraMessage,
  GeofenceMessage,
  MissionMessage,
  PositionMessage,
} from '../protocol/telemetry'
import { usePlanningStore, type PlanTarget } from '../planning/planningStore'
import { activeWaypointIndex } from '../planning/vehicleMission'
import { useGroundStation } from '../station/stationContext'
import { useTerrain } from '../terrain/terrainContext'
import {
  createLineData,
  createPointData,
  createPolygonData,
  createRingData,
  toLngLat,
} from './mapData'
import { addMapLayers, setSourceData, SOURCES } from './mapLayers'
import { createDraftMarkers, createHomeMarker, createVehicleMarker, placeMarker } from './markers'
import { useMapPointsStore } from './mapPointsStore'
import { addTerrainLayers, showTerrainSurface, TERRAIN_3D_PITCH } from './terrainLayers'
import './maplibreWorker'
import styles from './MapView.module.css'

export interface MapViewProps {
  followVehicle: boolean
  showPlanning: boolean
  terrain3d: boolean
  onUserPan: () => void
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const HOME_ZOOM = 15.5
const WORLD_VIEW: CameraOptions = { center: [0, 20], zoom: 1.5 }

export default function MapView({
  followVehicle,
  showPlanning,
  terrain3d,
  onUserPan,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const lastViewRef = useRef<CameraOptions | null>(null)
  const loadedMapRef = useRef<MapLibreMap | null>(null)
  const messages = useMessages()
  const { telemetry } = useGroundStation()
  const terrain = useTerrain()
  const isFollowingVehicle = useEffectEvent(() => followVehicle)
  const isTerrain3d = useEffectEvent(() => terrain3d)
  const handleUserPan = useEffectEvent(() => {
    onUserPan()
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const lastView = lastViewRef.current
    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      ...(lastView ?? WORLD_VIEW),
      locale: messages.map.controls,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl(), 'top-right')

    const vehicleMarker = createVehicleMarker(messages.map.vehicle)
    const homeMarker = createHomeMarker(messages.map.home)
    const missionDraftMarkers = createDraftMarkers(map, {
      className: styles.draftWaypoint,
      label: (index) => messages.planning.mission.draftMarker(index + 1),
      text: (index) => String(index + 1),
      onMove: (id, position) => {
        usePlanningStore.getState().movePoint('mission', id, position)
      },
    })
    const geofenceDraftMarkers = createDraftMarkers(map, {
      className: styles.draftVertex,
      label: (index) => messages.planning.geofence.draftMarker(index + 1),
      text: () => '',
      onMove: (id, position) => {
        usePlanningStore.getState().movePoint('geofence', id, position)
      },
    })
    const unsubscribers: (() => void)[] = []
    let centeredOnHome = lastView !== null
    let shownMission: MissionMessage | null = null
    let shownActiveIndex: number | null = null
    let shownGeofence: GeofenceMessage | null = null
    let shownBreach = false
    let shownCameraPosition: PositionMessage | null = null
    let shownCamera: CameraMessage | null = null

    function renderVehicleGeofence(): void {
      const { geofence, systemStatus } = telemetry.getSnapshot()
      const breached = systemStatus?.fenceBreached ?? false
      if (geofence === shownGeofence && breached === shownBreach) {
        return
      }
      setSourceData(
        map,
        SOURCES.vehicleGeofence,
        createPolygonData(geofence?.polygon ?? null, breached),
      )
      shownGeofence = geofence
      shownBreach = breached
    }

    function renderVehicleMission(): void {
      const state = telemetry.getSnapshot()
      const activeIndex = activeWaypointIndex(state)
      if (state.mission === shownMission && activeIndex === shownActiveIndex) {
        return
      }
      const waypoints = state.mission?.waypoints ?? []
      setSourceData(map, SOURCES.vehicleMissionLine, createLineData(waypoints))
      setSourceData(map, SOURCES.vehicleMissionPoints, createPointData(waypoints, activeIndex))
      shownMission = state.mission
      shownActiveIndex = activeIndex
    }

    function renderCamera(): void {
      const state = telemetry.getSnapshot()
      if (state.position === shownCameraPosition && state.camera === shownCamera) {
        return
      }
      shownCameraPosition = state.position
      shownCamera = state.camera
      const target = cameraTarget(state, terrain)
      setSourceData(
        map,
        SOURCES.cameraFootprint,
        createPolygonData(target?.footprint ?? null, false),
      )
      setSourceData(
        map,
        SOURCES.cameraSight,
        createLineData(
          target?.center && state.position ? [state.position, target.center.point] : [],
        ),
      )
    }

    function renderTelemetry(): void {
      const { position, home } = telemetry.getSnapshot()

      setSourceData(map, SOURCES.trail, createLineData(telemetry.getPositionHistory()))
      renderVehicleMission()
      renderVehicleGeofence()
      renderCamera()
      placeMarker(homeMarker, map, home)
      placeMarker(vehicleMarker, map, position)
      if (position) {
        vehicleMarker.setRotation(position.headingDeg)
      }

      if (home && !centeredOnHome) {
        map.jumpTo({ center: toLngLat(home), zoom: HOME_ZOOM })
        centeredOnHome = true
      }
      if (position && isFollowingVehicle()) {
        map.setCenter(toLngLat(position))
      }
    }

    function renderMissionDraft(points: readonly (LatLon & { id: string })[]): void {
      setSourceData(map, SOURCES.draftMissionLine, createLineData(points))
      missionDraftMarkers.update(points)
    }

    function renderGeofenceDraft(points: readonly (LatLon & { id: string })[]): void {
      setSourceData(map, SOURCES.draftGeofence, createRingData(points))
      geofenceDraftMarkers.update(points)
    }

    function renderSelectedPoint(point: LatLon | null): void {
      setSourceData(map, SOURCES.selectedPoint, createPointData(point ? [point] : [], null))
    }

    function applyEditMode(mode: PlanTarget | null): void {
      map.getCanvas().style.cursor = mode ? 'crosshair' : ''
      if (mode) {
        useMapPointsStore.getState().clearSelection()
        map.doubleClickZoom.disable()
      } else {
        map.doubleClickZoom.enable()
      }
    }

    map.on('load', () => {
      addTerrainLayers(map)
      showTerrainSurface(map, isTerrain3d())
      addMapLayers(map)
      loadedMapRef.current = map
      renderTelemetry()
      unsubscribers.push(telemetry.subscribe(renderTelemetry))
      renderSelectedPoint(useMapPointsStore.getState().selected)
      unsubscribers.push(
        useMapPointsStore.subscribe((state, previous) => {
          if (state.selected !== previous.selected) {
            renderSelectedPoint(state.selected)
          }
        }),
      )
      if (!showPlanning) {
        return
      }

      const planning = usePlanningStore.getState()
      renderMissionDraft(planning.drafts.mission)
      renderGeofenceDraft(planning.drafts.geofence)
      applyEditMode(planning.editMode)
      unsubscribers.push(
        usePlanningStore.subscribe((state, previous) => {
          if (state.drafts.mission !== previous.drafts.mission) {
            renderMissionDraft(state.drafts.mission)
          }
          if (state.drafts.geofence !== previous.drafts.geofence) {
            renderGeofenceDraft(state.drafts.geofence)
          }
          if (state.editMode !== previous.editMode) {
            applyEditMode(state.editMode)
          }
        }),
      )
    })
    map.on('click', (event) => {
      const point = { lat: event.lngLat.lat, lon: event.lngLat.lng }
      const { editMode, addPoint } = usePlanningStore.getState()
      if (showPlanning && editMode) {
        addPoint(editMode, point)
      } else {
        useMapPointsStore.getState().select(point)
      }
    })
    map.on('mousemove', (event) => {
      useMapPointsStore.getState().setCursor({ lat: event.lngLat.lat, lon: event.lngLat.lng })
    })
    map.on('mouseout', () => {
      useMapPointsStore.getState().setCursor(null)
    })
    map.on('dragstart', () => {
      handleUserPan()
    })

    return () => {
      loadedMapRef.current = null
      lastViewRef.current = centeredOnHome
        ? {
            center: map.getCenter(),
            zoom: map.getZoom(),
            bearing: map.getBearing(),
            pitch: map.getPitch(),
          }
        : null
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
      useMapPointsStore.getState().setCursor(null)
      missionDraftMarkers.remove()
      geofenceDraftMarkers.remove()
      map.remove()
    }
  }, [telemetry, terrain, showPlanning, messages])

  useEffect(() => {
    const map = loadedMapRef.current
    if (!map) {
      return
    }
    showTerrainSurface(map, terrain3d)
    map.easeTo({ pitch: terrain3d ? TERRAIN_3D_PITCH : 0 })
  }, [terrain3d])

  return <div ref={containerRef} className={styles.map} />
}
