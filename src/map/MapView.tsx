import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useEffectEvent, useRef } from 'react'
import type { LatLon } from '../geo/geo'
import type { GeofenceMessage, MissionMessage } from '../protocol/telemetry'
import { usePlanningStore, type PlanTarget } from '../planning/planningStore'
import { activeWaypointIndex } from '../planning/vehicleMission'
import { useGroundStation } from '../station/stationContext'
import {
  createLineData,
  createPointData,
  createPolygonData,
  createRingData,
  toLngLat,
} from './mapData'
import { addMapLayers, setSourceData, SOURCES } from './mapLayers'
import { createDraftMarkers, createHomeMarker, createVehicleMarker, placeMarker } from './markers'
import styles from './MapView.module.css'

export interface MapViewProps {
  followVehicle: boolean
  showPlanning: boolean
  onUserPan: () => void
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const HOME_ZOOM = 15.5

setWorkerUrl(maplibreWorkerUrl)

export default function MapView({ followVehicle, showPlanning, onUserPan }: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { telemetry } = useGroundStation()
  const isFollowingVehicle = useEffectEvent(() => followVehicle)
  const handleUserPan = useEffectEvent(() => {
    onUserPan()
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const map = new MapLibreMap({
      container,
      style: MAP_STYLE_URL,
      center: [0, 20],
      zoom: 1.5,
      attributionControl: { compact: true },
    })
    map.addControl(new NavigationControl(), 'top-right')

    const vehicleMarker = createVehicleMarker()
    const homeMarker = createHomeMarker()
    const missionDraftMarkers = createDraftMarkers(map, {
      className: styles.draftWaypoint,
      label: (index) => `Draft waypoint ${String(index + 1)}`,
      text: (index) => String(index + 1),
      onMove: (id, position) => {
        usePlanningStore.getState().movePoint('mission', id, position)
      },
    })
    const geofenceDraftMarkers = createDraftMarkers(map, {
      className: styles.draftVertex,
      label: (index) => `Draft geofence vertex ${String(index + 1)}`,
      text: () => '',
      onMove: (id, position) => {
        usePlanningStore.getState().movePoint('geofence', id, position)
      },
    })
    const unsubscribers: (() => void)[] = []
    let centeredOnHome = false
    let shownMission: MissionMessage | null = null
    let shownActiveIndex: number | null = null
    let shownGeofence: GeofenceMessage | null = null
    let shownBreach = false

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

    function renderTelemetry(): void {
      const { position, home } = telemetry.getSnapshot()

      setSourceData(map, SOURCES.trail, createLineData(telemetry.getPositionHistory()))
      renderVehicleMission()
      renderVehicleGeofence()
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

    function applyEditMode(mode: PlanTarget | null): void {
      map.getCanvas().style.cursor = mode ? 'crosshair' : ''
      if (mode) {
        map.doubleClickZoom.disable()
      } else {
        map.doubleClickZoom.enable()
      }
    }

    map.on('load', () => {
      addMapLayers(map)
      renderTelemetry()
      unsubscribers.push(telemetry.subscribe(renderTelemetry))
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
      const { editMode, addPoint } = usePlanningStore.getState()
      if (showPlanning && editMode) {
        addPoint(editMode, { lat: event.lngLat.lat, lon: event.lngLat.lng })
      }
    })
    map.on('dragstart', () => {
      handleUserPan()
    })

    return () => {
      for (const unsubscribe of unsubscribers) {
        unsubscribe()
      }
      missionDraftMarkers.remove()
      geofenceDraftMarkers.remove()
      map.remove()
    }
  }, [telemetry, showPlanning])

  return <div ref={containerRef} className={styles.map} />
}
