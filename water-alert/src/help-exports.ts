import type { Language } from './domain'

/** Apply the sample boundary at export time; resident edits cannot remove it. */
export function exportedText(text: string, language: Language, sample: boolean) {
  if (!sample) return text
  const label = language === 'es'
    ? 'EJEMPLO — FICTICIO. No es un aviso real ni una solicitud enviada.'
    : 'SAMPLE — FICTIONAL. Not a real advisory or a sent request.'
  return `${label}\n\n${text}`
}
