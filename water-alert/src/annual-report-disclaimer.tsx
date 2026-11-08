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
