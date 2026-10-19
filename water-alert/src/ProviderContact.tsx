import { useId } from 'react'
import type { Language, Place } from './domain'
import { PROVIDER_CONTACTS } from './provider-contacts'

function ContactIcon({ name }: { name: 'phone' | 'mail' }) {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{name === 'phone' ? <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.8 2.1Z" /> : <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>}</svg>
}

const copy = {
  en: { title: 'Contact water provider', call: 'Call', email: 'Email provider', help: 'Ask whether your address is affected and what to do next.', opens: 'Opens your phone or email app. This website does not automatically call or email your provider.', source: 'Contact source: ADH directory', checked: 'Checked', missing: 'Contact details have not been verified for this supplier. Check your water bill or contact park management for the correct number.', match: 'Confirm this is the provider on your water bill.', directory: 'Directory-listed contact; hours and response times are not verified.' },
  es: { title: 'Contactar al proveedor de agua', call: 'Llamar', email: 'Enviar correo al proveedor', help: 'Pregunte si su dirección está afectada y qué debe hacer.', opens: 'Abre su aplicación de teléfono o correo. Este sitio no llama ni envía correos automáticamente a su proveedor.', source: 'Fuente del contacto: directorio de ADH', checked: 'Verificado', missing: 'No se han verificado los datos de contacto de este proveedor. Consulte su factura de agua o contacte a la administración del parque para obtener el número correcto.', match: 'Confirme que es el proveedor que aparece en su factura de agua.', directory: 'Contacto del directorio; no se han verificado los horarios ni los tiempos de respuesta.' },
}

export function ProviderContactProvenance({ place, language = 'en', sample = false }: { place: Place; language?: Language; sample?: boolean }) {
  if (sample || place.kind !== 'system') return null
  const t = copy[language]
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  return contact ? <details className="contact-provenance"><summary>{t.source}<span className="disclosure-icon" aria-hidden="true" /></summary><p>{t.help}</p><p className="quiet-note">{t.opens} {t.match}</p><a className="source-link" href={contact.sourceUrl} target="_blank" rel="noreferrer">{t.source} <span aria-hidden="true">↗</span></a><p className="quiet-note">{t.checked}: <time dateTime={contact.verifiedOn}>{contact.verifiedOn}</time>. {t.directory}</p></details> : <p className="quiet-note">{t.missing}</p>
}

export function ProviderContact({ place, language = 'en', sample = false }: { place: Place; language?: Language; sample?: boolean; compact?: boolean }) {
  const title = useId()
  if (sample || place.kind !== 'system') return null
  const t = copy[language]
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  return <section className="provider-contact" aria-labelledby={title}>
    <div className="contact-bar">
      <div className="contact-caption"><h3 id={title} aria-label={t.title}>{language === 'en' ? 'Service questions?' : '¿Preguntas del servicio?'}</h3>{contact ? <a className="contact-directory" href={contact.sourceUrl} target="_blank" rel="noopener noreferrer" aria-label={language === 'en' ? 'ADH directory contact (opens in a new tab)' : 'Contacto del directorio ADH (se abre en otra pestaña)'} title={`${t.checked}: ${contact.verifiedOn}. ${t.directory}`}>{language === 'en' ? 'ADH directory contact' : 'Contacto del directorio ADH'} <span aria-hidden="true">↗</span></a> : <p>{language === 'en' ? 'Check your water bill' : 'Consulte su factura'}</p>}</div>
      {contact ? <div className="provider-contact-actions" title={t.opens}>
        <a className="secondary" href={`tel:${contact.dial}`} aria-label={`${t.call} ${contact.phone}`}><ContactIcon name="phone" /><span className="contact-action-label">{contact.phone}</span></a>
        {contact.email ? <a className="secondary" href={`mailto:${contact.email}`} aria-label={`${t.email}: ${contact.email}`}><ContactIcon name="mail" /><span className="contact-action-label">{contact.email}</span></a> : <p className="quiet-note missing-email">{language === 'en' ? 'No verified email address is available for this supplier.' : 'No hay un correo electrónico verificado para este proveedor.'}</p>}
      </div> : null}
    </div>
    {!contact ? <p className="quiet-note">{t.missing}</p> : null}
  </section>
}
