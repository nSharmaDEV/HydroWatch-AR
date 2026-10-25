import type { Language, Notice, Place } from './domain.js'
import { noticeMatchesPlace } from './place-catalog.js'
import type { HelpSource } from './help-requests.js'
import { readableDate } from './help-format.js'

function matching(place: Place, notices: Notice[]) {
  return notices.filter(n => place.kind === 'system' && n.agency === 'ADH' && n.kind === 'boil' && noticeMatchesPlace(place.id, n))
}
export function advisorySources(place: Place, notices: Notice[]): HelpSource[] {
  return matching(place, notices).map(n => ({ recordId: n.id, url: n.url, label: [n.agency, n.issued, n.area].filter(Boolean).join(' · ').slice(0, 300) }))
}
/** Editable source prose, never resident testimony. No URLs in the message. */
export function advisoryFacts(place: Place, notices: Notice[], current: boolean, sample: boolean, language: Language = 'en') {
  const es = language === 'es'
  return matching(place, notices).map(n => {
    const active = current && !n.lifted && n.liftStatus !== 'unknown'
    const problems = n.reason.split(/\n+/).map(s => s.trim()).filter(Boolean)
    return [sample ? (es ? 'EJEMPLO FICTICIO — no es un aviso real.' : 'FICTIONAL SAMPLE — not a real advisory.') : '',
      es ? `El aviso de ADH${n.issued ? ` del ${readableDate(n.issued, language)}` : ''}${n.area ? ` identifica la zona afectada como “${n.area}”` : ' no indica una zona afectada'}. ${active ? 'El aviso figura como activo en la consulta actual.' : 'Su estado actual no se ha verificado.'}`
        : `The ADH notice${n.issued ? ` dated ${readableDate(n.issued, language)}` : ''}${n.area ? ` identifies the affected area as “${n.area}”` : ' does not specify an affected area'}. ${active ? 'The notice is listed as active in the current source check.' : 'Its current status has not been verified.'}`,
      problems.length ? `${es ? 'El aviso indica' : 'The notice says'}:${problems.length > 1 ? '\n' + problems.map(s => `• “${s}”`).join('\n') : ` “${problems[0]}”.`}` : '',
      n.lifted ? (es ? `ADH publicó la fecha de levantamiento ${readableDate(n.lifted, language)}.` : `ADH published a lift date of ${readableDate(n.lifted, language)}.`) : '',
      n.guidance?.quote ? `${es ? 'Las instrucciones publicadas dicen' : 'The published instructions say'}: “${n.guidance.quote}”` : '',
    ].filter(Boolean).join('\n')
  }).join('\n\n')
}
