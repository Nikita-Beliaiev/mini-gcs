import { describe, expect, it } from 'vitest'
import { areaStyle } from './areaStyle'

const BASE = 'https://station.test/area/'
const PACKAGED_FONTS = ['Noto Sans Regular', 'Noto Sans Medium', 'Noto Sans Italic']

function fontsOf(style: ReturnType<typeof areaStyle>): Set<string> {
  const fonts = style.layers.flatMap((layer) =>
    layer.type === 'symbol' ? JSON.stringify(layer.layout?.['text-font'] ?? []) : [],
  )
  return new Set(fonts.flatMap((font) => font.match(/Noto Sans[^"]*/g) ?? []))
}

describe('areaStyle', () => {
  it('reads the map, fonts and sprites from the area package', () => {
    const style = areaStyle('dark', 'en', BASE)

    expect(style.glyphs).toBe('https://station.test/area/fonts/{fontstack}/{range}.pbf')
    expect(style.sprite).toBe('https://station.test/area/sprites/dark')
    expect(style.sources).toEqual({
      protomaps: { type: 'vector', url: 'pmtiles://https://station.test/area/val-dorcia.pmtiles' },
    })
    expect(style.layers.length).toBeGreaterThan(20)
  })

  it('needs no font that the package leaves out, in either language', () => {
    for (const lang of ['en', 'uk']) {
      for (const font of fontsOf(areaStyle('light', lang, BASE))) {
        expect(PACKAGED_FONTS, `${lang}: ${font}`).toContain(font)
      }
    }
  })
})
