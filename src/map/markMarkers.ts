import { type Map as MapLibreMap, Marker } from 'maplibre-gl'
import type { Mark } from '../marks/mark'
import { SYMBOL_SIZE, type SymbolImagesModule } from '../marks/symbolLoader'
import { toLngLat } from './mapData'
import styles from './MapView.module.css'

interface MarkMarkerOptions {
  label: (mark: Mark) => string
  onClick: (mark: Mark) => void
}

export interface MarkMarkers {
  update: (marks: readonly Mark[], images: SymbolImagesModule) => void
  remove: () => void
}

export function createMarkMarkers(map: MapLibreMap, options: MarkMarkerOptions): MarkMarkers {
  let markers: Marker[] = []

  function remove(): void {
    for (const marker of markers) {
      marker.remove()
    }
    markers = []
  }

  function createMarker(mark: Mark, images: SymbolImagesModule): Marker {
    const image = images.symbolImage(mark, SYMBOL_SIZE)
    const element = document.createElement('div')
    element.className = styles.mark ?? ''
    element.setAttribute('role', 'img')
    element.setAttribute('aria-label', options.label(mark))

    const symbol = document.createElement('img')
    symbol.src = image.url
    symbol.alt = ''
    symbol.style.width = `${String(image.width)}px`
    symbol.style.height = `${String(image.height)}px`

    const name = document.createElement('span')
    name.className = styles.markName ?? ''
    name.textContent = mark.name

    element.append(symbol, name)
    element.addEventListener('click', (event) => {
      event.stopPropagation()
      options.onClick(mark)
    })

    return new Marker({ element, anchor: 'top-left', offset: [-image.anchor.x, -image.anchor.y] })
      .setLngLat(toLngLat(mark))
      .addTo(map)
  }

  function update(marks: readonly Mark[], images: SymbolImagesModule): void {
    remove()
    markers = marks.map((mark) => createMarker(mark, images))
  }

  return { update, remove }
}
