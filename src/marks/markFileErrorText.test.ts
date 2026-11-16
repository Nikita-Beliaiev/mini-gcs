import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { uk } from '../i18n/uk'
import { describeMarksFileError } from './markFileErrorText'

describe('describeMarksFileError', () => {
  it('names the size limit of a marks file', () => {
    expect(describeMarksFileError('tooLarge', en)).toBe('The file is larger than 1 MB.')
    expect(describeMarksFileError('tooLarge', uk)).toBe('Файл більший за 1 МБ.')
  })

  it('explains the other errors', () => {
    expect(describeMarksFileError('notCot', en)).toBe('The file is not a Cursor on Target event.')
    expect(describeMarksFileError('unsupported', uk)).toBe(
      'Потрібен файл .geojson, .json, .cot або .xml.',
    )
  })
})
