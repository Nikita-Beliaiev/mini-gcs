import { afterEach, describe, expect, it, vi } from 'vitest'
import { LOCALE_STORAGE_KEY } from './localePreference'
import { useLocaleStore } from './localeStore'
import { startLocaleSync } from './localeSync'

function openAt(path: string): void {
  window.history.replaceState(null, '', path)
}

function setLocale(locale: 'en' | 'uk'): void {
  useLocaleStore.getState().setLocale(locale)
}

afterEach(() => {
  openAt('/')
  localStorage.clear()
  document.documentElement.lang = 'en'
  vi.restoreAllMocks()
})

describe('startLocaleSync', () => {
  it('starts in the language asked for in the address', () => {
    openAt('/?lang=uk')

    const stop = startLocaleSync()

    expect(useLocaleStore.getState().locale).toBe('uk')
    expect(document.documentElement.lang).toBe('uk')
    stop()
  })

  it('starts in the browser language when nothing else is known', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['uk-UA', 'en'])

    const stop = startLocaleSync()

    expect(useLocaleStore.getState().locale).toBe('uk')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
    stop()
  })

  it('remembers a language the visitor picks', () => {
    const stop = startLocaleSync()

    setLocale('uk')
    stop()

    expect(document.documentElement.lang).toBe('uk')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('uk')
  })

  it('starts in the remembered language next time', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'uk')

    const stop = startLocaleSync()

    expect(useLocaleStore.getState().locale).toBe('uk')
    stop()
  })

  it('keeps the address in step when it names the language', () => {
    openAt('/?lang=uk&server=ws://localhost:8787')
    const stop = startLocaleSync()

    setLocale('en')

    expect(new URLSearchParams(window.location.search).get('lang')).toBe('en')
    expect(new URLSearchParams(window.location.search).get('server')).toBe('ws://localhost:8787')
    stop()
  })

  it('leaves an address without a language alone', () => {
    openAt('/?server=ws://localhost:8787')
    const stop = startLocaleSync()

    setLocale('uk')

    expect(window.location.search).toBe('?server=ws://localhost:8787')
    stop()
  })

  it('stops following the store when stopped', () => {
    const stop = startLocaleSync()
    stop()

    setLocale('uk')

    expect(document.documentElement.lang).toBe('en')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull()
  })
})
