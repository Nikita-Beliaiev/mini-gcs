import { describe, expect, it } from 'vitest'
import { cotFileName, markToCot, parseCotMarks } from './cotMarks'
import type { Mark } from './mark'
import type { ImportContext } from './markImport'

const FORD: Mark = {
  id: '3f2b8c1e-5d4a-4e7b-9c0d-1a2b3c4d5e6f',
  name: 'Ford <north> & "east"',
  lat: 43.0938,
  lon: 11.6398,
  affiliation: 'hostile',
  kind: 'vehicle',
  createdAt: '2026-11-16T10:05:00.000Z',
}

const NOW = new Date('2026-11-16T12:00:00Z')

const CONTEXT: ImportContext = { now: NOW, createId: () => 'new-id', untitled: 'Untitled mark' }

function event(attributes: string, content = ''): string {
  return `<event version="2.0" ${attributes}>${content}</event>`
}

describe('markToCot', () => {
  it('writes the mark as a Cursor on Target event that goes stale in a day', () => {
    const cot = new DOMParser().parseFromString(markToCot(FORD, NOW), 'application/xml')
    const root = cot.documentElement
    const point = root.querySelector('point')

    expect(markToCot(FORD, NOW)).toMatch(
      /^<\?xml version="1.0" encoding="UTF-8" standalone="yes"\?>\n<event /,
    )
    expect(root.getAttribute('uid')).toBe(FORD.id)
    expect(root.getAttribute('type')).toBe('a-h-G-E-V')
    expect(root.getAttribute('how')).toBe('h-g-i-g-o')
    expect(root.getAttribute('time')).toBe('2026-11-16T12:00:00.000Z')
    expect(root.getAttribute('stale')).toBe('2026-11-17T12:00:00.000Z')
    expect(point?.getAttribute('lat')).toBe('43.0938')
    expect(point?.getAttribute('lon')).toBe('11.6398')
    expect(point?.getAttribute('hae')).toBe('9999999.0')
    expect(root.querySelector('detail > contact')?.getAttribute('callsign')).toBe(FORD.name)
  })

  it('escapes the name instead of breaking the XML', () => {
    expect(markToCot(FORD, NOW)).toContain('callsign="Ford &lt;north&gt; &amp; &quot;east&quot;"')
  })

  it('names the file after the mark', () => {
    expect(cotFileName(FORD)).toBe('Ford-north-east.cot')
    expect(cotFileName({ ...FORD, name: 'Міст 2' })).toBe('Міст-2.cot')
    expect(cotFileName({ ...FORD, name: '***' })).toBe('mark.cot')
  })
})

describe('parseCotMarks', () => {
  it('reads back what the station writes', () => {
    expect(parseCotMarks(markToCot(FORD, NOW), CONTEXT)).toEqual({
      ok: true,
      marks: [{ ...FORD, createdAt: '2026-11-16T12:00:00.000Z' }],
      skipped: 0,
    })
  })

  it('reads an event from another TAK client', () => {
    const text = event(
      'uid="ANDROID-1.123" type="a-f-G-U-C-I-Z" how="h-e" time="2026-11-16T09:30:00Z"',
      '<point lat="43.1" lon="11.65" hae="300" ce="10" le="5"/><detail><contact callsign="Alpha 1"/></detail>',
    )

    expect(parseCotMarks(text, CONTEXT)).toEqual({
      ok: true,
      skipped: 0,
      marks: [
        {
          id: 'ANDROID-1.123',
          name: 'Alpha 1',
          lat: 43.1,
          lon: 11.65,
          affiliation: 'friend',
          kind: 'infantry',
          createdAt: '2026-11-16T09:30:00.000Z',
        },
      ],
    })
  })

  it('fills in a missing name, id and time', () => {
    const result = parseCotMarks(event('type="a-u-G"', '<point lat="43.1" lon="11.65"/>'), CONTEXT)

    expect(result.ok && result.marks[0]).toMatchObject({
      id: 'new-id',
      name: 'Untitled mark',
      createdAt: '2026-11-16T12:00:00.000Z',
    })
  })

  it('skips events that are not atoms or have no usable point', () => {
    const text = `<events>${[
      event('uid="a" type="a-n-G"', '<point lat="43.1" lon="11.65"/>'),
      event('uid="b" type="b-t-f"', '<point lat="43.1" lon="11.65"/>'),
      event('uid="c" type="a-h-G"', '<point lat="" lon="11.65"/>'),
      event('uid="d" type="a-h-G"', '<point lat="95" lon="11.65"/>'),
      event('uid="e" type="a-h-G"'),
    ].join('')}</events>`

    expect(parseCotMarks(text, CONTEXT)).toMatchObject({ ok: true, skipped: 4 })
  })

  it('refuses files that are not CoT or have no marks', () => {
    expect(parseCotMarks('<event', CONTEXT)).toEqual({ ok: false, error: 'notCot' })
    expect(parseCotMarks('<kml></kml>', CONTEXT)).toEqual({ ok: false, error: 'notCot' })
    expect(parseCotMarks(event('type="b-t-f"'), CONTEXT)).toEqual({ ok: false, error: 'noMarks' })
  })
})
