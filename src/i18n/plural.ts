import type { Locale } from './locale'

export type PluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string }

const PLURAL_RULES: Record<Locale, Intl.PluralRules> = {
  en: new Intl.PluralRules('en'),
  uk: new Intl.PluralRules('uk'),
}

export function pluralize(locale: Locale, count: number, forms: PluralForms): string {
  return forms[PLURAL_RULES[locale].select(count)] ?? forms.other
}
