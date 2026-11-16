import type { FeatureCollection, Point } from 'geojson'
import { z } from 'zod'
import { parseJson } from '../protocol/shared'
import {
  affiliationSchema,
  cleanMarkName,
  markKindSchema,
  type Affiliation,
  type Mark,
  type MarkKind,
} from './mark'
import { symbolCode } from './markCodes'
import {
  importedId,
  importFailure,
  importResult,
  type ImportContext,
  type MarksImport,
} from './markImport'

export const MAX_GEOJSON_FEATURES = 1000

export interface MarkProperties {
  name: string
  affiliation: Affiliation
  kind: MarkKind
  sidc: string
  createdAt: string
}

const featureCollectionSchema = z.object({
  type: z.literal('FeatureCollection'),
  features: z.array(z.unknown()).max(MAX_GEOJSON_FEATURES),
})

const singleFeatureSchema = z.object({ type: z.literal('Feature') })

const pointFeatureSchema = z.object({
  type: z.literal('Feature'),
  id: z.union([z.string(), z.number()]).optional(),
  geometry: z.object({
    type: z.literal('Point'),
    coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)], z.number()),
  }),
  properties: z.record(z.string(), z.unknown()).nullable().optional(),
})

const propertiesSchema = z.object({
  name: z.string().optional().catch(undefined),
  affiliation: affiliationSchema.optional().catch(undefined),
  kind: markKindSchema.optional().catch(undefined),
  createdAt: z.iso.datetime().optional().catch(undefined),
})

export function marksToGeoJson(marks: readonly Mark[]): FeatureCollection<Point, MarkProperties> {
  return {
    type: 'FeatureCollection',
    features: marks.map((mark) => ({
      type: 'Feature',
      id: mark.id,
      geometry: { type: 'Point', coordinates: [mark.lon, mark.lat] },
      properties: {
        name: mark.name,
        affiliation: mark.affiliation,
        kind: mark.kind,
        sidc: symbolCode(mark),
        createdAt: mark.createdAt,
      },
    })),
  }
}

export function serializeMarksGeoJson(marks: readonly Mark[]): string {
  return `${JSON.stringify(marksToGeoJson(marks), null, 2)}\n`
}

export function marksFileName(savedAt: Date): string {
  return `mini-gcs-marks-${savedAt.toISOString().slice(0, 19).replaceAll(':', '-')}.geojson`
}

function readFeatures(data: unknown): unknown[] | null {
  const collection = featureCollectionSchema.safeParse(data)
  if (collection.success) {
    return collection.data.features
  }
  return singleFeatureSchema.safeParse(data).success ? [data] : null
}

function readFeature(feature: unknown, context: ImportContext): Mark | null {
  const parsed = pointFeatureSchema.safeParse(feature)
  if (!parsed.success) {
    return null
  }
  const [lon, lat] = parsed.data.geometry.coordinates
  const properties = propertiesSchema.parse(parsed.data.properties ?? {})
  return {
    id: importedId(parsed.data.id, context),
    name: cleanMarkName(properties.name ?? '') || context.untitled,
    lat,
    lon,
    affiliation: properties.affiliation ?? 'unknown',
    kind: properties.kind ?? 'ground',
    createdAt: properties.createdAt ?? context.now.toISOString(),
  }
}

export function parseGeoJsonMarks(text: string, context: ImportContext): MarksImport {
  const features = readFeatures(parseJson(text))
  if (!features) {
    return importFailure('notGeoJson')
  }
  const marks = features.flatMap((feature) => {
    const mark = readFeature(feature, context)
    return mark ? [mark] : []
  })
  return importResult(marks, features.length)
}
