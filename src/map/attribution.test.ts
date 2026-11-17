import { describe, expect, it } from 'vitest'
import { foldAttribution } from './attribution'

function mapContainer(attributionClass: string): HTMLElement {
  const container = document.createElement('div')
  const attribution = document.createElement('details')
  attribution.className = attributionClass
  attribution.setAttribute('open', '')
  container.append(attribution)
  return container
}

describe('foldAttribution', () => {
  it('folds an open compact attribution behind its button', () => {
    const container = mapContainer(
      'maplibregl-ctrl maplibregl-ctrl-attrib maplibregl-compact maplibregl-compact-show',
    )

    foldAttribution(container)

    const attribution = container.querySelector('details')
    expect(attribution).not.toHaveClass('maplibregl-compact-show')
    expect(attribution).not.toHaveAttribute('open')
  })

  it('leaves a full attribution open', () => {
    const container = mapContainer('maplibregl-ctrl maplibregl-ctrl-attrib')

    foldAttribution(container)

    expect(container.querySelector('details')).toHaveAttribute('open')
  })
})
