import { DEFAULT_LOCALE, isLocale, type Locale } from './locale'

export const LOCALE_PARAM = 'lang'
export const LOCALE_STORAGE_KEY = 'mini-gcs.locale'

interface LocaleSources {
  requested: string | null
  saved: string | null
  browserLanguages: readonly string[]
}

function baseLanguage(languageTag: string): string {
  return languageTag.toLowerCase().split('-')[0] ?? ''
}

export function chooseLocale({ requested, saved, browserLanguages }: LocaleSources): Locale {
  if (isLocale(requested)) {
    return requested
  }
  if (isLocale(saved)) {
    return saved
  }
  return browserLanguages.map(baseLanguage).find(isLocale) ?? DEFAULT_LOCALE
}
