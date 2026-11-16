import { markIdSchema, type Mark } from './mark'

export interface ImportContext {
  now: Date
  createId: () => string
  untitled: string
}

export type MarksFileError = 'unsupported' | 'tooLarge' | 'notGeoJson' | 'notCot' | 'noMarks'

export type MarksImport =
  { ok: true; marks: Mark[]; skipped: number } | { ok: false; error: MarksFileError }

export function importFailure(error: MarksFileError): MarksImport {
  return { ok: false, error }
}

export function importResult(marks: Mark[], itemCount: number): MarksImport {
  return marks.length === 0
    ? importFailure('noMarks')
    : { ok: true, marks, skipped: itemCount - marks.length }
}

export function importedId(id: unknown, context: ImportContext): string {
  const parsed = markIdSchema.safeParse(typeof id === 'number' ? String(id) : id)
  return parsed.success ? parsed.data : context.createId()
}
