import type { Language, Place } from './domain'

// Display-only changes: never modify the retained agency record.
export function supplierCounty(county: string) {
  return county === county.toUpperCase() ? county.toLowerCase().replace(/\b[a-z]/g, c => c.toUpperCase()) : county
}

export function supplierArea(area: string, place: Place, language: Language) {
  const normalized = area.trim().replace(/\s+/g, ' ').toLowerCase()
  const name = place.name.trim().replace(/\s+/g, ' ').toLowerCase()
  // Exact equality only: exceptions, named streets and other suppliers stay intact.
  return normalized === 'entire system' || normalized === `${name} for the entire system`
    ? language === 'en' ? 'Entire system' : 'Todo el sistema'
    : area
}

export function supplierIssued(value: string | null | undefined, language: Language) {
  if (!value) return value
  // ADH's published numeric wall-clock format is not an instant. Preserve an
  // explicit zone if present; never derive one from the browser or retrieval time.
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4}) (\d{1,2}):(\d{2})(?::(\d{2}))? (AM|PM)(?: (CDT|CST|UTC|GMT))?$/i.exec(value.trim())
  if (!match) return value
  const [, month, day, year, hour, minute, second, period, zone] = match
  const date = new Date(Date.UTC(+year, +month - 1, +day))
  if (date.getUTCFullYear() !== +year || date.getUTCMonth() !== +month - 1 || date.getUTCDate() !== +day || +hour < 1 || +hour > 12 || +minute > 59 || +(second ?? 0) > 59) return value
  const dateText = new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(date)
  return `${dateText} · ${+hour}:${minute} ${period.toUpperCase()}${zone ? ` ${zone.toUpperCase()}` : ''}`
}
