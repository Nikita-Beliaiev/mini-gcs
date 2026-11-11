import buttonStyles from '../ui/button.module.css'
import { LOCALES, type Locale } from './locale'
import { useLocale, useLocaleStore, useMessages } from './localeStore'
import styles from './LanguageSwitcher.module.css'

const LANGUAGES: Record<Locale, { short: string; name: string }> = {
  en: { short: 'EN', name: 'English' },
  uk: { short: 'УКР', name: 'Українська' },
}

export function LanguageSwitcher() {
  const text = useMessages().app
  const locale = useLocale()
  const setLocale = useLocaleStore((state) => state.setLocale)

  return (
    <div className={styles.languages} role="group" aria-label={text.language}>
      {LOCALES.map((option) => (
        <button
          key={option}
          type="button"
          lang={option}
          className={buttonStyles.button}
          title={LANGUAGES[option].name}
          aria-pressed={option === locale}
          onClick={() => {
            setLocale(option)
          }}
        >
          {LANGUAGES[option].short}
        </button>
      ))}
    </div>
  )
}
