import type { Language } from './domain'

export const annualReportAiDisclaimer: Record<Language, { heading: string; body: string }> = {
  en: {
    heading: 'About annual reports',
    body: 'Annual-report summaries may be written automatically by AI and can contain errors. Summaries labelled “AI summary” were not checked by a person. Always check the original PDF. Annual reports describe a past year; they are not current water-safety status.',
  },
  es: {
    heading: 'Sobre los informes anuales',
    body: 'Los resúmenes de informes anuales pueden ser escritos automáticamente por IA y pueden contener errores. Los resúmenes marcados como “Resumen por IA” no fueron revisados por una persona. Consulte siempre el PDF original. Los informes anuales describen un año pasado; no indican el estado actual de seguridad del agua.',
  },
}

export function AnnualReportAiDisclaimer({ language, as: Heading = 'h3' }: { language: Language; as?: 'h2' | 'h3' }) {
  const text = annualReportAiDisclaimer[language]
  return <section className="annual-report-ai-disclaimer"><Heading>{text.heading}</Heading><p className="quiet-note">{text.body}</p></section>
}

export const annualReportAutoReadDisclaimer: Record<Language, { heading: string; body: string }> = {
  en: {
    heading: 'About automatic reads',
    body: 'These issues were copied by WAVE from the violations and deficiencies tables in the report’s own text, using fixed rules rather than a person or AI. The wording and dates are as ADH printed them, in English. WAVE reads only layouts it recognises and shows nothing when anything is unclear, but it can still make mistakes. Always check the original PDF. Annual reports describe a past year; they are not current water-safety status.',
  },
  es: {
    heading: 'Sobre las lecturas automáticas',
    body: 'WAVE copió estos problemas de las tablas de infracciones y deficiencias del texto del propio informe, con reglas fijas y sin una persona ni IA. La redacción y las fechas son las que imprimió ADH, en inglés. WAVE solo lee diseños que reconoce y no muestra nada si algo no está claro, pero aun así puede equivocarse. Consulte siempre el PDF original. Los informes anuales describen un año pasado; no indican el estado actual de seguridad del agua.',
  },
}

export function AnnualReportAutoReadDisclaimer({ language }: { language: Language }) {
  const text = annualReportAutoReadDisclaimer[language]
  return <section className="annual-report-ai-disclaimer"><h3>{text.heading}</h3><p className="quiet-note">{text.body}</p></section>
}
