import type { HelpRoute } from './help-requests'
import type { Language } from './domain'

/** Information about an office's scope, not a finding of jurisdiction or a submission. */
export function NextContactGuidance({ route, language }: { route: HelpRoute; language: Language }) {
  const es = language === 'es'
  if (route === 'adh') return <p className="quiet-note">{es ? 'ADH puede orientar sobre avisos y problemas de agua potable. No es un canal de facturación ni una garantía de investigación o solución.' : 'ADH can provide guidance about drinking-water advisories and concerns. It is not a billing channel or a guarantee of investigation or resolution.'}</p>
  if (route !== 'ag') return null
  return <p className="quiet-note">{es ? 'El formulario de quejas del Fiscal General es una vía de asistencia al consumidor, no una garantía de reembolso. La PSC solo regula ciertas empresas de agua; no regula empresas municipales, distritos de mejoras ni asociaciones de propietarios. Verifica si tu proveedor está cubierto antes de presentar una queja. ' : 'The Attorney General complaint form is a consumer-assistance option, not a guarantee of a refund. The PSC regulates only certain water utilities; it does not regulate municipal utilities, improvement districts or property owners’ associations. Check whether your supplier is covered before filing. '}<a href="https://apsc.arkansas.gov/filing-a-complaint/" target="_blank" rel="noreferrer">{es ? 'Guía de quejas de la PSC' : 'PSC complaint guidance'}</a>.</p>
}
