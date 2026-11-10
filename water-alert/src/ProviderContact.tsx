import { useId } from 'react'
import { Icon } from './icons'
import type { Language, Place } from './domain'
import { providerContact } from './provider-contacts'
import { ADH_ENGINEERING_SOURCE } from './recovery-resources'

function ContactIcon({ name }: { name: 'phone' | 'mail' }) {
  return <Icon name={name} size={20} />
}

const copy = {
  en: { title: 'Contact water provider', call: 'Call', email: 'Email provider', help: 'Ask whether your address is affected and what to do next.', opens: 'Opens your phone or email app. This website does not automatically call or email your provider.', source: 'Contact source: ADH directory', checked: 'Checked', missing: 'Contact details have not been verified for this supplier. Check your water bill or contact park management for the correct number.', match: 'Confirm this is the provider on your water bill.', directory: 'Directory-listed contact; hours and response times are not verified.', epaEmail: 'Email source: EPA', epaSource: 'Contact source: EPA water-system record (directory only)', staff: 'a staff member’s listed address' },
  es: { title: 'Contactar al proveedor de agua', call: 'Llamar', email: 'Enviar correo al proveedor', help: 'Pregunte si su dirección está afectada y qué debe hacer.', opens: 'Abre su aplicación de teléfono o correo. Este sitio no llama ni envía correos automáticamente a su proveedor.', source: 'Fuente del contacto: directorio de ADH', checked: 'Verificado', missing: 'No se han verificado los datos de contacto de este proveedor. Consulte su factura de agua o contacte a la administración del parque para obtener el número correcto.', match: 'Confirme que es el proveedor que aparece en su factura de agua.', directory: 'Contacto del directorio; no se han verificado los horarios ni los tiempos de respuesta.', epaEmail: 'Fuente del correo: EPA', epaSource: 'Fuente del contacto: registro federal de la EPA (solo directorio)', staff: 'dirección de un empleado listada' },
}

export function ProviderContactProvenance({ place, language = 'en', sample = false }: { place: Place; language?: Language; sample?: boolean }) {
  if (sample || place.kind !== 'system') return null
  const t = copy[language]
  const contact = providerContact(place.id)
  return contact ? <details className="contact-provenance"><summary>{contact.phoneSource === 'EPA' ? t.epaSource : t.source}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.help}</p><p className="quiet-note">{t.opens} {t.match}</p><a className="source-link" href={contact.sourceUrl} target="_blank" rel="noreferrer">{contact.phoneSource === 'EPA' ? t.epaSource : t.source} <Icon name="external-link" size={16} /></a><p className="quiet-note">{t.checked}: <time dateTime={contact.verifiedOn}>{contact.verifiedOn}</time>. {t.directory}</p>{contact.email && contact.emailSource?.source === 'EPA' && contact.phoneSource !== 'EPA' ? <a className="source-link" href={contact.emailSource.url} target="_blank" rel="noreferrer">{t.epaEmail} <Icon name="external-link" size={16} /></a> : null}</details> : <p className="quiet-note">{t.missing}</p>
}

export function ProviderContact({ place, language = 'en', sample = false, compact = false, headingLevel = 3 }: { place: Place; language?: Language; sample?: boolean; compact?: boolean; headingLevel?: 2 | 3 }) {
  const title = useId()
  const Heading = headingLevel === 2 ? 'h2' : 'h3'
  if (sample || place.kind !== 'system') return null
  const t = copy[language]
  const contact = providerContact(place.id)
  const hasPhone = Boolean(contact?.phone && contact.dial)
  const hasEmail = Boolean(contact?.email)
  if (!hasPhone && !hasEmail) return <section className="provider-contact provider-contact-fallback" aria-labelledby={title}>
    <div className="contact-bar">
      <div className="contact-caption"><Heading id={title} aria-label={t.title}>{language === 'en' ? 'Service questions?' : '¿Preguntas del servicio?'}</Heading></div>
      <a className="source-link adh-contact-link" href={ADH_ENGINEERING_SOURCE} target="_blank" rel="noopener noreferrer">{language === 'en' ? 'Contact ADH' : 'Contactar a ADH'} <Icon name="external-link" size={16} /></a>
    </div>
  </section>
  return <section className={`provider-contact${compact ? ' provider-contact-compact' : ''}`} aria-labelledby={title}>
    <div className="contact-bar">
      <div className="contact-caption"><Heading id={title} aria-label={t.title}>{language === 'en' ? 'Service questions?' : '¿Preguntas del servicio?'}</Heading></div>
      <span className="contact-leader" aria-hidden="true" />
    {contact ? <div className="contact-sources">
      <a className="contact-directory" href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={contact.phoneSource === 'EPA' ? language === 'en' ? 'EPA water-system record (opens in a new tab)' : 'Registro federal de la EPA (se abre en otra pestaña)' : language === 'en' ? 'ADH directory contact (opens in a new tab)' : 'Contacto del directorio ADH (se abre en otra pestaña)'} title={`${t.checked}: ${contact.verifiedOn}. ${t.directory}`}>{contact.phoneSource === 'EPA' ? language === 'en' ? 'EPA water-system record' : 'Registro federal de la EPA' : language === 'en' ? 'ADH directory contact' : 'Contacto del directorio ADH'} <Icon name="external-link" size={16} /></a>
      {contact.email && contact.emailSource?.source === 'EPA' && contact.phoneSource !== 'EPA' ? <a className="contact-email-source" href={contact.emailSource.url} target="_blank" rel="noopener noreferrer" title={`${t.checked}: ${contact.emailSource.checkedOn}`}>{t.epaEmail}</a> : null}
    </div> : null}
    </div>
    <div className="provider-contact-actions" title={t.opens}>
      {hasPhone ? <a className="secondary" href={`tel:${contact!.dial}`} aria-label={`${t.call} ${contact!.phone}`} title={contact!.phone}><ContactIcon name="phone" /><span className="contact-action-label">{t.call}</span></a> : null}
      {hasEmail ? <a className="secondary" href={`mailto:${contact!.email}`} aria-label={`${t.email}: ${contact!.email}`} title={`${contact!.email}${contact!.emailKind === 'staff' ? ` — ${t.staff}` : ''}`}><ContactIcon name="mail" /><span className="contact-action-label">{language === 'en' ? 'Email' : 'Correo'}</span></a> : null}
    </div>
    {!contact ? <p className="quiet-note">{t.missing}</p> : null}
  </section>
}
