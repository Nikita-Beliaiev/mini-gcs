import { z } from 'zod'
import type { LatLon } from '../geo/geo'
import { latLonSchema } from '../protocol/shared'

export const AFFILIATIONS = ['friend', 'hostile', 'neutral', 'unknown'] as const
export const MARK_KINDS = ['ground', 'infantry', 'armour', 'artillery', 'vehicle', 'uav'] as const
export const MAX_MARKS = 200
export const MAX_MARK_NAME_LENGTH = 40
export const MAX_MARK_ID_LENGTH = 100

export const affiliationSchema = z.enum(AFFILIATIONS)
export const markKindSchema = z.enum(MARK_KINDS)
export const markIdSchema = z.string().trim().min(1).max(MAX_MARK_ID_LENGTH)

export type Affiliation = z.infer<typeof affiliationSchema>
export type MarkKind = z.infer<typeof markKindSchema>

export const markSchema = latLonSchema.extend({
  id: markIdSchema,
  name: z.string().min(1).max(MAX_MARK_NAME_LENGTH),
  affiliation: affiliationSchema,
  kind: markKindSchema,
  createdAt: z.iso.datetime(),
})

export type Mark = z.infer<typeof markSchema>

export interface MarkSymbol {
  affiliation: Affiliation
  kind: MarkKind
}

export interface MarkDraft extends LatLon, MarkSymbol {
  name: string
}

export function cleanMarkName(name: string): string {
  return name.trim().slice(0, MAX_MARK_NAME_LENGTH)
}

export function mergeMarks(current: readonly Mark[], incoming: readonly Mark[]): Mark[] {
  const incomingById = new Map(incoming.map((mark) => [mark.id, mark]))
  const updated = current.map((mark) => incomingById.get(mark.id) ?? mark)
  const currentIds = new Set(current.map((mark) => mark.id))
  const added = [...incomingById.values()].filter((mark) => !currentIds.has(mark.id))
  return [...updated, ...added]
}
