import { useId } from 'react'
import type { Language, Place } from './domain'
import { PROVIDER_CONTACTS } from './provider-contacts'

const copy = {
  en: { title: 'Contact water provider', call: 'Call', email: 'Email provider', help: 'Ask whether your address is affected and what to do next.', opens: 'Opens your phone or email app. This website does not send messages.', source: 'Contact source: ADH directory', checked: 'Checked', missing: 'Contact details have not been verified for this supplier. Check your water bill or contact park management for the correct number.', match: 'Confirm this is the provider on your water bill.', directory: 'Directory-listed contact; hours and response times are not verified.' },
  es: { title: 'Contactar al proveedor de agua', call: 'Llamar', email: 'Enviar correo al proveedor', help: 'Pregunte si su dirección está afectada y qué debe hacer.', opens: 'Abre su aplicación de teléfono o correo. Este sitio no envía mensajes.', source: 'Fuente del contacto: directorio de ADH', checked: 'Verificado', missing: 'No se han verificado los datos de contacto de este proveedor. Consulte su factura de agua o contacte a la administración del parque para obtener el número correcto.', match: 'Confirme que es el proveedor que aparece en su factura de agua.', directory: 'Contacto del directorio; no se han verificado los horarios ni los tiempos de respuesta.' },
}

export function ProviderContact({ place, language = 'en', sample = false }: { place: Place; language?: Language; sample?: boolean }) {
  const title = useId()
  if (sample || place.kind !== 'system') return null
  const t = copy[language]
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  return <section className="provider-contact" aria-labelledby={title}>
    <h3 id={title}>{t.title}</h3>
    {contact ? <>
      <p>{t.help}</p>
      <div className="actions provider-contact-actions">
        <a className="primary" href={`tel:${contact.dial}`}>{t.call} {contact.phone}</a>
        {contact.email ? <a className="secondary" href={`mailto:${contact.email}`}>{t.email}</a> : null}
      </div>
      <p className="quiet-note">{t.opens} {t.match}</p>
      <details><summary>{t.source}</summary><a className="source-link" href={contact.sourceUrl} target="_blank" rel="noreferrer">{t.source} <span aria-hidden="true">↗</span></a><p className="quiet-note">{t.checked}: <time dateTime={contact.verifiedOn}>{contact.verifiedOn}</time>. {t.directory}</p></details>
    </> : <p className="quiet-note">{t.missing}</p>}
  </section>
}
