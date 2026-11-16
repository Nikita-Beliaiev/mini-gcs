import { describe, expect, it } from 'vitest'
import type { ImportContext } from './markImport'
import { readMarksFile } from './markFiles'

const CONTEXT: ImportContext = {
  now: new Date('2026-11-16T12:00:00Z'),
  createId: () => 'new-id',
  untitled: 'Untitled mark',
}

const GEOJSON = JSON.stringify({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: [11.65, 43.1] },
  properties: { name: 'Well' },
})

const COT = '<event uid="a" type="a-n-G"><point lat="43.1" lon="11.65"/></event>'

describe('readMarksFile', () => {
  it('reads GeoJSON and CoT files by their extension', async () => {
    const geoJson = await readMarksFile(new File([GEOJSON], 'marks.GeoJSON'), CONTEXT)
    const json = await readMarksFile(new File([GEOJSON], 'marks.json'), CONTEXT)
    const cot = await readMarksFile(new File([COT], 'mark.cot'), CONTEXT)
    const xml = await readMarksFile(new File([COT], 'mark.xml'), CONTEXT)

    expect(geoJson.ok && geoJson.marks[0]?.name).toBe('Well')
    expect(json.ok).toBe(true)
    expect(cot.ok && cot.marks[0]?.affiliation).toBe('neutral')
    expect(xml.ok).toBe(true)
  })

  it('refuses other files and files that are too large', async () => {
    expect(await readMarksFile(new File([GEOJSON], 'marks.kml'), CONTEXT)).toEqual({
      ok: false,
      error: 'unsupported',
    })
    expect(await readMarksFile(new File([GEOJSON], 'marks.geojson'), CONTEXT, 10)).toEqual({
      ok: false,
      error: 'tooLarge',
    })
  })
})
