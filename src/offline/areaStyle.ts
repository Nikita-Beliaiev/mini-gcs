import { layers, namedFlavor } from '@protomaps/basemaps'
import type { StyleSpecification } from 'maplibre-gl'
import { AREA_MAP_FILE } from './area'
import { areaBaseUrl } from './areaFiles'

export type AreaFlavor = 'dark' | 'light'

const AREA_SOURCE = 'protomaps'

export function areaStyle(
  flavor: AreaFlavor,
  lang: string,
  base = areaBaseUrl(),
): StyleSpecification {
  return {
    version: 8,
    glyphs: `${base}fonts/{fontstack}/{range}.pbf`,
    sprite: `${base}sprites/${flavor}`,
    sources: {
      [AREA_SOURCE]: { type: 'vector', url: `pmtiles://${base}${AREA_MAP_FILE}` },
    },
    layers: layers(AREA_SOURCE, namedFlavor(flavor), { lang }),
  }
}
