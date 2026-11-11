import { type Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { LatLon } from '../geo/geo'
import { toLngLat } from './mapData'
import styles from './MapView.module.css'

function createMarkerElement(className: string | undefined, label: string): HTMLElement {
  const element = document.createElement('div')
  element.className = className ?? ''
  element.setAttribute('role', 'img')
  element.setAttribute('aria-label', label)
  return element
}

export function createVehicleMarker(label: string): Marker {
  const element = createMarkerElement(styles.vehicle, label)
  const arrow = document.createElement('div')
  arrow.className = styles.vehicleArrow ?? ''
  element.append(arrow)
  return new Marker({ element, rotationAlignment: 'map' })
}

export function createHomeMarker(label: string): Marker {
  const element = createMarkerElement(styles.home, label)
  element.textContent = 'H'
  return new Marker({ element })
}

export function placeMarker(marker: Marker, map: MapLibreMap, point: LatLon | null): void {
  if (!point) {
    marker.remove()
    return
  }
  marker.setLngLat(toLngLat(point))
  if (!marker.getElement().isConnected) {
    marker.addTo(map)
  }
}

interface DraftMarkerOptions {
  className: string | undefined
  label: (index: number) => string
  text: (index: number) => string
  onMove: (id: string, position: LatLon) => void
}

export interface DraftMarkers {
  update: (points: readonly (LatLon & { id: string })[]) => void
  remove: () => void
}

export function createDraftMarkers(map: MapLibreMap, options: DraftMarkerOptions): DraftMarkers {
  let markers: Marker[] = []

  function remove(): void {
    for (const marker of markers) {
      marker.remove()
    }
    markers = []
  }

  function update(points: readonly (LatLon & { id: string })[]): void {
    remove()
    markers = points.map((point, index) => {
      const element = createMarkerElement(options.className, options.label(index))
      element.textContent = options.text(index)
      element.addEventListener('click', (event) => {
        event.stopPropagation()
      })

      const marker = new Marker({ element, draggable: true }).setLngLat(toLngLat(point)).addTo(map)
      marker.on('dragend', () => {
        const { lat, lng } = marker.getLngLat()
        options.onMove(point.id, { lat, lon: lng })
      })
      return marker
    })
  }

  return { update, remove }
}
