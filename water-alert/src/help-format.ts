import type { Language } from './domain.js'

/** Date-only display never shifts a resident's date into another time zone. */
export function readableDate(value: string | undefined | null, language: Language) {
  if (!value) return ''
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value)
  const normalized = us ? `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}` : value
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(normalized)
  if (!match) return value
  const date = new Date(`${match[1]}-${match[2]}-${match[3]}T12:00:00Z`)
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized.slice(0, 10)) return value
  return new Intl.DateTimeFormat(language === 'es' ? 'es' : 'en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }).format(date)
}

/** Presentation only: never changes supplier identity or recipient lookup. */
export function supplierDisplayName(name: string) {
  return name === name.toUpperCase() ? name.replace(/[A-Z][A-Z'’]*/g, word => ['ADH', 'ADEQ', 'LLC', 'USA', 'PWS'].includes(word) ? word : word[0] + word.slice(1).toLowerCase()) : name
}
