const COMPACT_ATTRIBUTION = '.maplibregl-ctrl-attrib.maplibregl-compact'

export function foldAttribution(container: HTMLElement): void {
  const attribution = container.querySelector(COMPACT_ATTRIBUTION)
  attribution?.classList.remove('maplibregl-compact-show')
  attribution?.removeAttribute('open')
}
