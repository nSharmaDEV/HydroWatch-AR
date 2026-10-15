import type { Language } from './domain'

function formatter(language: Language, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'es-US', { timeZone: 'America/Chicago', ...options })
}
export function checkDate(at: string, language: Language = 'en') {
  return formatter(language, { year: 'numeric', month: 'short', day: 'numeric' }).format(new Date(at))
}
export function checkTime(at: string, language: Language) {
  return formatter(language, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' }).format(new Date(at))
}
export function checkTimeRange(start: string, end: string, language: Language) {
  const f = formatter(language, { hour: 'numeric', minute: '2-digit', timeZoneName: 'short' })
  const a = f.formatToParts(new Date(start)), b = f.formatToParts(new Date(end))
  const part = (parts: Intl.DateTimeFormatPart[], type: string) => parts.find(p => p.type === type)?.value
  const sameZone = part(a, 'timeZoneName') === part(b, 'timeZoneName')
  const samePeriod = part(a, 'dayPeriod') === part(b, 'dayPeriod')
  // Keep both abbreviations across a daylight-saving transition, and both periods across noon.
  const first = a.filter(p => !(sameZone && p.type === 'timeZoneName') && !(sameZone && samePeriod && p.type === 'dayPeriod')).map(p => p.value).join('').trim()
  return `${first}–${f.format(new Date(end))}`.replace(/\s+/g, ' ')
}
