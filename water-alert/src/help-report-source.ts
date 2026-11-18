import type { Language } from './domain'

/** Shared by browser review and server-generated email; no device-storage dependency. */
export function reportSourceNote(method: string | undefined, language: Language) {
  if (method === 'structuredRecord') return language === 'es' ? 'Campos copiados del registro federal publicado; una persona no los ha revisado.' : 'Fields copied from the published federal record; not reviewed by a person.'
  if (method === 'aiSummarized') return language === 'es' ? 'Interpretación asistida por IA; consulta el informe original.' : 'AI-assisted interpretation; check the original report.'
  if (method === 'autoRead') return language === 'es' ? 'Lectura automática de tablas; consulta el informe original.' : 'Automatic table reading; check the original report.'
  return ''
}
