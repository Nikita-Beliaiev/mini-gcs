import { latLonSchema } from '../protocol/shared'
import { cleanMarkName, type Mark } from './mark'
import { cotType, readCotType } from './markCodes'
import {
  importedId,
  importFailure,
  importResult,
  type ImportContext,
  type MarksImport,
} from './markImport'

export const COT_STALE_MS = 24 * 60 * 60 * 1000
const UNKNOWN_COT_VALUE = '9999999.0'
const XML_DECLARATION = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'

function setAttributes(element: Element, attributes: Record<string, string>): void {
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, value)
  }
}

export function markToCot(mark: Mark, now: Date): string {
  const cot = document.implementation.createDocument(null, 'event', null)
  setAttributes(cot.documentElement, {
    version: '2.0',
    uid: mark.id,
    type: cotType(mark),
    how: 'h-g-i-g-o',
    time: now.toISOString(),
    start: now.toISOString(),
    stale: new Date(now.getTime() + COT_STALE_MS).toISOString(),
  })
  const point = cot.createElement('point')
  setAttributes(point, {
    lat: String(mark.lat),
    lon: String(mark.lon),
    hae: UNKNOWN_COT_VALUE,
    ce: UNKNOWN_COT_VALUE,
    le: UNKNOWN_COT_VALUE,
  })
  const detail = cot.createElement('detail')
  const contact = cot.createElement('contact')
  contact.setAttribute('callsign', mark.name)
  detail.append(contact)
  cot.documentElement.append(point, detail)
  return `${XML_DECLARATION}\n${new XMLSerializer().serializeToString(cot)}\n`
}

export function cotFileName(mark: Mark): string {
  const slug = mark.name.replaceAll(/[^\p{L}\p{N}]+/gu, '-').replaceAll(/^-|-$/g, '')
  return `${slug || 'mark'}.cot`
}

function readNumber(value: string | null | undefined): number {
  return value?.trim() ? Number(value) : Number.NaN
}

function readTime(value: string | null): string | null {
  const time = value ? new Date(value) : null
  return time && !Number.isNaN(time.getTime()) ? time.toISOString() : null
}

function readEvent(event: Element, context: ImportContext): Mark | null {
  const symbol = readCotType(event.getAttribute('type') ?? '')
  const point = Array.from(event.children).find((child) => child.tagName === 'point')
  const position = latLonSchema.safeParse({
    lat: readNumber(point?.getAttribute('lat')),
    lon: readNumber(point?.getAttribute('lon')),
  })
  if (!symbol || !position.success) {
    return null
  }
  const callsign = event.querySelector('detail > contact')?.getAttribute('callsign') ?? ''
  return {
    id: importedId(event.getAttribute('uid'), context),
    name: cleanMarkName(callsign) || context.untitled,
    lat: position.data.lat,
    lon: position.data.lon,
    affiliation: symbol.affiliation,
    kind: symbol.kind,
    createdAt: readTime(event.getAttribute('time')) ?? context.now.toISOString(),
  }
}

export function parseCotMarks(text: string, context: ImportContext): MarksImport {
  const cot = new DOMParser().parseFromString(text, 'application/xml')
  const events = Array.from(cot.getElementsByTagName('event'))
  if (cot.getElementsByTagName('parsererror').length > 0 || events.length === 0) {
    return importFailure('notCot')
  }
  const marks = events.flatMap((event) => {
    const mark = readEvent(event, context)
    return mark ? [mark] : []
  })
  return importResult(marks, events.length)
}
