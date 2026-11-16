import type { Messages } from '../i18n/en'
import { MAX_MARKS_FILE_BYTES } from './markFiles'
import type { MarksFileError } from './markImport'

export function describeMarksFileError(error: MarksFileError, messages: Messages): string {
  const text = messages.marks.errors
  return error === 'tooLarge' ? text.tooLarge(MAX_MARKS_FILE_BYTES / 1_000_000) : text[error]
}
