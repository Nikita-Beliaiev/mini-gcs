import { describe, expect, it } from 'vitest'
import { chooseLocale } from './localePreference'

const NOTHING = { requested: null, saved: null, browserLanguages: [] }

describe('chooseLocale', () => {
  it('follows a language asked for in the address first', () => {
    expect(chooseLocale({ requested: 'uk', saved: 'en', browserLanguages: ['en-US'] })).toBe('uk')
  })

  it('then remembers the visitor’s own choice', () => {
    expect(chooseLocale({ ...NOTHING, saved: 'uk', browserLanguages: ['en-US'] })).toBe('uk')
  })

  it('then takes the first supported browser language', () => {
    expect(chooseLocale({ ...NOTHING, browserLanguages: ['de-DE', 'uk-UA', 'en'] })).toBe('uk')
    expect(chooseLocale({ ...NOTHING, browserLanguages: ['en-GB', 'uk'] })).toBe('en')
  })

  it('ignores unsupported values and falls back to English', () => {
    expect(chooseLocale({ requested: 'xx', saved: 'fr', browserLanguages: ['pl-PL'] })).toBe('en')
    expect(chooseLocale(NOTHING)).toBe('en')
  })
})
