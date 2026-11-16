import { z } from 'zod'
import { parseJson } from '../protocol/shared'
import { MAX_MARKS, markSchema, type Mark } from './mark'
import { useMarksStore } from './marksStore'

export const MARKS_STORAGE_KEY = 'mini-gcs.marks'
const MARKS_STORAGE_VERSION = 1

const savedMarksSchema = z.object({
  version: z.literal(MARKS_STORAGE_VERSION),
  marks: z.array(z.unknown()).max(MAX_MARKS),
})

export function parseSavedMarks(text: string | null): Mark[] {
  const saved = savedMarksSchema.safeParse(parseJson(text ?? ''))
  if (!saved.success) {
    return []
  }
  return saved.data.marks.flatMap((mark) => {
    const result = markSchema.safeParse(mark)
    return result.success ? [result.data] : []
  })
}

export function serializeMarks(marks: readonly Mark[]): string {
  return JSON.stringify({ version: MARKS_STORAGE_VERSION, marks })
}

function readSavedMarks(): string | null {
  try {
    return localStorage.getItem(MARKS_STORAGE_KEY)
  } catch {
    return null
  }
}

function saveMarks(marks: readonly Mark[]): void {
  try {
    localStorage.setItem(MARKS_STORAGE_KEY, serializeMarks(marks))
  } catch {
    return
  }
}

export function startMarksSync(): () => void {
  useMarksStore.setState({ marks: parseSavedMarks(readSavedMarks()) })
  return useMarksStore.subscribe((state, previous) => {
    if (state.marks !== previous.marks) {
      saveMarks(state.marks)
    }
  })
}
