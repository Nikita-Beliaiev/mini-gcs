import type { Map as MapLibreMap, RasterDEMSourceSpecification } from 'maplibre-gl'
import { TERRAIN_MAX_ZOOM, TERRAIN_TILE_SIZE, TERRAIN_TILE_URL } from '../terrain/terrarium'

const SHADING_SOURCE = 'terrain-shading'
const SURFACE_SOURCE = 'terrain-surface'
const SHADING_LAYER = 'terrain-shading'
const TERRAIN_EXAGGERATION = 1.5

export const TERRAIN_3D_PITCH = 60

const TERRAIN_ATTRIBUTION =
  '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Terrain: Mapzen, Copernicus EU-DEM, USGS, NOAA</a>'

function elevationSource(): RasterDEMSourceSpecification {
  return {
    type: 'raster-dem',
    tiles: [TERRAIN_TILE_URL],
    encoding: 'terrarium',
    tileSize: TERRAIN_TILE_SIZE,
    maxzoom: TERRAIN_MAX_ZOOM,
    attribution: TERRAIN_ATTRIBUTION,
  }
}

function firstLayerAboveAreas(map: MapLibreMap): string | undefined {
  const { layers } = map.getStyle()
  return layers.find((layer) => layer.type !== 'background' && layer.type !== 'fill')?.id
}

export function addTerrainLayers(map: MapLibreMap): void {
  map.addSource(SHADING_SOURCE, elevationSource())
  map.addSource(SURFACE_SOURCE, elevationSource())
  map.addLayer(
    {
      id: SHADING_LAYER,
      type: 'hillshade',
      source: SHADING_SOURCE,
      paint: {
        'hillshade-exaggeration': 0.9,
        'hillshade-shadow-color': 'rgb(0 0 0 / 0.9)',
        'hillshade-highlight-color': 'rgb(148 163 184 / 0.35)',
        'hillshade-accent-color': 'rgb(0 0 0 / 0.5)',
      },
    },
    firstLayerAboveAreas(map),
  )
}

export function showTerrainSurface(map: MapLibreMap, visible: boolean): void {
  map.setTerrain(visible ? { source: SURFACE_SOURCE, exaggeration: TERRAIN_EXAGGERATION } : null)
}
