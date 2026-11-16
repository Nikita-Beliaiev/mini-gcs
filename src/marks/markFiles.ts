import { parseCotMarks } from './cotMarks'
import { parseGeoJsonMarks } from './geoJsonMarks'
import { importFailure, type ImportContext, type MarksImport } from './markImport'

export const MAX_MARKS_FILE_BYTES = 1_000_000
export const MARKS_FILE_ACCEPT = '.geojson,.json,.cot,.xml'

const GEOJSON_EXTENSIONS = ['.geojson', '.json']
const COT_EXTENSIONS = ['.cot', '.xml']

function hasExtension(fileName: string, extensions: readonly string[]): boolean {
  const name = fileName.toLowerCase()
  return extensions.some((extension) => name.endsWith(extension))
}

export async function readMarksFile(
  file: File,
  context: ImportContext,
  maxBytes = MAX_MARKS_FILE_BYTES,
): Promise<MarksImport> {
  const isGeoJson = hasExtension(file.name, GEOJSON_EXTENSIONS)
  if (!isGeoJson && !hasExtension(file.name, COT_EXTENSIONS)) {
    return importFailure('unsupported')
  }
  if (file.size > maxBytes) {
    return importFailure('tooLarge')
  }
  const text = await file.text()
  return isGeoJson ? parseGeoJsonMarks(text, context) : parseCotMarks(text, context)
}
