import { useId, type ReactNode } from 'react'
import type { Language } from './domain'
import { helpGuideStrings } from './help-guide-strings'

export const workspaceStrings = {
  en: { directions: 'What to do', work: 'Your workspace', more: 'More guidance', draft: 'Review your draft', session: 'Copy or download before leaving. Drafts and progress are not saved.', details: 'Privacy and session details', choose: 'Choose the issue you want to address. Only its guidance and draft will be shown.', requirements: 'Replace [details] and verify facts before sending. English template.', remaining: (n: number) => `${n} bracketed details to review`, reviewed: 'No bracketed details remain. Review your facts before sending.', confirmation: 'Keep your own record', confirmationItems: ['Save a copy of what you sent.', 'Keep the date, recipient and reference number.', 'Use the original reply channel for follow-up.'] },
  es: { directions: 'Qué hacer', work: 'Su espacio de trabajo', more: 'Más orientación', draft: 'Revisar su borrador', session: 'Copie o descargue antes de salir. No se guardan borradores ni progreso.', details: 'Privacidad y detalles de la sesión', choose: 'Elija el problema que desea abordar. Solo se mostrarán la orientación y el borrador pertinentes.', requirements: 'Complete [datos] y verifique los hechos antes de enviar. Plantilla en inglés.', remaining: (n: number) => `${n} datos entre corchetes por revisar`, reviewed: 'No quedan datos entre corchetes. Revise los hechos antes de enviar.', confirmation: 'Guarde su propio registro', confirmationItems: ['Guarde una copia de lo enviado.', 'Conserve la fecha, el destinatario y la referencia.', 'Use el canal original de respuesta para el seguimiento.'] },
}

/** Natural-height grid: expanded references and enlarged text can grow the page. */
export function HelpWorkspace({ language, directions, children }: { language: Language; directions: ReactNode; children: ReactNode }) {
  const id = useId(), t = workspaceStrings[language]
  return <div className="guide-step-content help-workspace">
    <section className="help-directions" aria-labelledby={`${id}-directions`}><h2 id={`${id}-directions`}>{t.directions}</h2>{directions}</section>
    <section className="help-work" aria-label={t.work}>{children}</section>
  </div>
}

export function HelpSessionNote({ language, children }: { language: Language; children?: ReactNode }) {
  const t = workspaceStrings[language]
  return <div className="help-session"><p className="quiet-note">{t.session}</p><details><summary>{t.details}</summary><p>{helpGuideStrings[language].loss}</p>{children}</details></div>
}
