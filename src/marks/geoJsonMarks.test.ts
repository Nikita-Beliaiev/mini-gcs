import { describe, expect, it } from 'vitest'
import {
  marksFileName,
  marksToGeoJson,
  MAX_GEOJSON_FEATURES,
  parseGeoJsonMarks,
  serializeMarksGeoJson,
} from './geoJsonMarks'
import type { Mark } from './mark'
import type { ImportContext } from './markImport'

const FORD: Mark = {
  id: 'ford',
  name: 'Ford',
  lat: 43.0938,
  lon: 11.6398,
  affiliation: 'hostile',
  kind: 'vehicle',
  createdAt: '2026-11-16T10:05:00.000Z',
}

const CONTEXT: ImportContext = {
  now: new Date('2026-11-16T12:00:00Z'),
  createId: () => 'new-id',
  untitled: 'Untitled mark',
}

function point(coordinates: unknown[], properties: unknown = {}, id?: unknown) {
  return { type: 'Feature', id, geometry: { type: 'Point', coordinates }, properties }
}

function collection(...features: unknown[]): string {
  return JSON.stringify({ type: 'FeatureCollection', features })
}

describe('marksToGeoJson', () => {
  it('writes each mark as a point feature in longitude, latitude order with its symbol code', () => {
    expect(marksToGeoJson([FORD])).toEqual({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          id: 'ford',
          geometry: { type: 'Point', coordinates: [11.6398, 43.0938] },
          properties: {
            name: 'Ford',
            affiliation: 'hostile',
            kind: 'vehicle',
            sidc: 'SHGPEV---------',
            createdAt: '2026-11-16T10:05:00.000Z',
          },
        },
      ],
    })
  })

  it('names the file after the time it was saved', () => {
    expect(marksFileName(new Date('2026-11-16T10:05:07.123Z'))).toBe(
      'mini-gcs-marks-2026-11-16T10-05-07.geojson',
    )
  })
})

describe('parseGeoJsonMarks', () => {
  it('reads back what the station writes', () => {
    expect(parseGeoJsonMarks(serializeMarksGeoJson([FORD]), CONTEXT)).toEqual({
      ok: true,
      marks: [FORD],
      skipped: 0,
    })
  })

  it('takes points from other tools as unknown ground tracks', () => {
    const result = parseGeoJsonMarks(
      collection(
        point([11.6, 43.1, 320], { name: '  Well  ', colour: 'red' }, 7),
        point([11.7, 43.2], null),
      ),
      CONTEXT,
    )

    expect(result).toEqual({
      ok: true,
      skipped: 0,
      marks: [
        {
          id: '7',
          name: 'Well',
          lat: 43.1,
          lon: 11.6,
          affiliation: 'unknown',
          kind: 'ground',
          createdAt: '2026-11-16T12:00:00.000Z',
        },
        expect.objectContaining({ id: 'new-id', name: 'Untitled mark', lat: 43.2 }),
      ],
    })
  })

  it('falls back field by field when a property has the wrong value', () => {
    const result = parseGeoJsonMarks(
      collection(point([11.6, 43.1], { name: 5, affiliation: 'ally', kind: 'infantry' })),
      CONTEXT,
    )

    expect(result.ok && result.marks[0]).toMatchObject({
      name: 'Untitled mark',
      affiliation: 'unknown',
      kind: 'infantry',
    })
  })

  it('reads a single feature', () => {
    const result = parseGeoJsonMarks(JSON.stringify(point([11.6, 43.1])), CONTEXT)

    expect(result.ok && result.marks).toHaveLength(1)
  })

  it('skips features that are not points or lie outside the globe', () => {
    const line = { type: 'Feature', geometry: { type: 'LineString', coordinates: [] } }

    const result = parseGeoJsonMarks(
      collection(point([11.6, 43.1]), line, point([43.1, 211.6]), point([11.6])),
      CONTEXT,
    )

    expect(result).toMatchObject({ ok: true, skipped: 3 })
  })

  it('refuses files that are not GeoJSON or have no points', () => {
    expect(parseGeoJsonMarks('not json', CONTEXT)).toEqual({ ok: false, error: 'notGeoJson' })
    expect(parseGeoJsonMarks('{"type":"Topology"}', CONTEXT)).toEqual({
      ok: false,
      error: 'notGeoJson',
    })
    expect(parseGeoJsonMarks(collection(), CONTEXT)).toEqual({ ok: false, error: 'noMarks' })
  })

  it('refuses collections with too many features', () => {
    const features = Array.from({ length: MAX_GEOJSON_FEATURES + 1 }, () => point([11.6, 43.1]))

    expect(parseGeoJsonMarks(collection(...features), CONTEXT)).toEqual({
      ok: false,
      error: 'notGeoJson',
    })
  })
})
