import { create } from 'zustand'
import { en, type Messages } from './en'
import { DEFAULT_LOCALE, type Locale } from './locale'
import { uk } from './uk'

export const MESSAGES: Record<Locale, Messages> = { en, uk }

interface LocaleState {
  locale: Locale
  setLocale: (locale: Locale) => void
}

export const initialLocaleData = { locale: DEFAULT_LOCALE }

export const useLocaleStore = create<LocaleState>()((set) => ({
  ...initialLocaleData,
  setLocale: (locale) => {
    set({ locale })
  },
}))

export function useLocale(): Locale {
  return useLocaleStore((state) => state.locale)
}

export function useMessages(): Messages {
  return MESSAGES[useLocale()]
}
