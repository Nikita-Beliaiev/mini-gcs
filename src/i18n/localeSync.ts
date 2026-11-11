import type { Locale } from './locale'
import { chooseLocale, LOCALE_PARAM, LOCALE_STORAGE_KEY } from './localePreference'
import { useLocaleStore } from './localeStore'

function readSavedLocale(): string | null {
  try {
    return localStorage.getItem(LOCALE_STORAGE_KEY)
  } catch {
    return null
  }
}

function saveLocale(locale: Locale): boolean {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
    return true
  } catch {
    return false
  }
}

function updateAddress(locale: Locale): void {
  const url = new URL(window.location.href)
  if (url.searchParams.has(LOCALE_PARAM)) {
    url.searchParams.set(LOCALE_PARAM, locale)
    window.history.replaceState(window.history.state, '', url)
  }
}

export function startLocaleSync(): () => void {
  const locale = chooseLocale({
    requested: new URLSearchParams(window.location.search).get(LOCALE_PARAM),
    saved: readSavedLocale(),
    browserLanguages: navigator.languages,
  })
  useLocaleStore.getState().setLocale(locale)
  document.documentElement.lang = locale

  return useLocaleStore.subscribe((state, previous) => {
    if (state.locale === previous.locale) {
      return
    }
    document.documentElement.lang = state.locale
    saveLocale(state.locale)
    updateAddress(state.locale)
  })
}
