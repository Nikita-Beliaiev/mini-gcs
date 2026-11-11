import { describe, expect, it } from 'vitest'
import { en } from '../i18n/en'
import { uk } from '../i18n/uk'
import type { FlightLogError } from './flightLog'
import { describeFlightLogError } from './flightLogErrorText'

describe('describeFlightLogError', () => {
  it.each<[FlightLogError, string]>([
    ['tooLarge', 'The file is larger than 50 MB.'],
    ['notJson', 'The file is not valid JSON.'],
    ['notFlightLog', 'This file is not a Mini GCS flight log.'],
    ['invalid', 'The flight log is damaged or was saved by an unsupported version.'],
  ])('describes %s in English', (error, text) => {
    expect(describeFlightLogError(error, en)).toBe(text)
  })

  it('puts the size limit into the Ukrainian text', () => {
    expect(describeFlightLogError('tooLarge', uk)).toBe('Файл більший за 50 МБ.')
  })
})
