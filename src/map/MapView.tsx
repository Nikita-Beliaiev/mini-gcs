import {
  type GeoJSONSource,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  setWorkerUrl,
} from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url'
import { useEffect, useEffectEvent, useRef } from 'react'
import type { LatLon } from '../geo/geo'
import { useGroundStation } from '../station/stationContext'
import { createTrailData, toLngLat } from './mapData'
import styles from './MapView.module.css'

export interface MapViewProps {
  followVehicle: boolean
  onUserPan: () => void
}

const MAP_STYLE_URL = 'https://tiles.openfreemap.org/styles/dark'
const TRAIL_SOURCE_ID = 'trail'
const TRAIL_COLOR = '#38bdf8'
const HOME_ZOOM = 15.5

setWorkerUrl(maplibreWorkerUrl)

function createMarkerElement(className: string | undefined, label: string): HTMLElement {
  const element = document.createElement('div')
  element.className = className ?? ''
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', label)
  return element
}

function createVehicleElement(): HTMLElement {
  const element = createMarkerElement(styles.vehicle, 'Vehicle')
  const arrow = document.createElement('div')
  arrow.className = styles.vehicleArrow ?? ''
  element.append(arrow)
  return element
}

function createHomeElement(): HTMLElement {
  const element = createMarkerElement(styles.home, 'Home')
  element.textContent = 'H'
  return element
}

function placeMarker(marker: Marker, map: MapLibreMap, point: LatLon | null): void {
  if (!point) {
    marker.remove()
    return
  }
  marker.setLngLat(toLngLat(point))
  if (!marker.getElement().isConnected) {
    marker.addTo(map)
  }
}

export default function MapView({ followVehicle, onUserPan }: MapViewProps) {
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

    const vehicleMarker = new Marker({ element: createVehicleElement(), rotationAlignment: 'map' })
    const homeMarker = new Marker({ element: createHomeElement() })
    let centeredOnHome = false
    let unsubscribe: (() => void) | null = null

    function render(): void {
      const { position, home } = telemetry.getSnapshot()

      const trailSource = map.getSource<GeoJSONSource>(TRAIL_SOURCE_ID)
      void trailSource?.setData(createTrailData(telemetry.getPositionHistory()))

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

    map.on('load', () => {
      map.addSource(TRAIL_SOURCE_ID, { type: 'geojson', data: createTrailData([]) })
      map.addLayer({
        id: TRAIL_SOURCE_ID,
        type: 'line',
        source: TRAIL_SOURCE_ID,
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: { 'line-color': TRAIL_COLOR, 'line-width': 2.5, 'line-opacity': 0.85 },
      })
      render()
      unsubscribe = telemetry.subscribe(render)
    })
    map.on('dragstart', () => {
      handleUserPan()
    })

    return () => {
      unsubscribe?.()
      map.remove()
    }
  }, [telemetry])

  return <div ref={containerRef} className={styles.map} />
}
