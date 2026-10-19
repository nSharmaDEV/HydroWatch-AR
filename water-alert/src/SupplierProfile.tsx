import { useId, useState } from 'react'
import type { Language, Place } from './domain'
import { PROVIDER_CONTACTS } from './provider-contacts'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { SourceLink } from './components'

// Only these directory facts have been checked. Never infer another supplier's facts.
const leisureId = 'ADH:896ab9a415f10bb945ec2570f39dccaf46828714edb1d1e7dc7408f0bba94dcf'
function ProfileLinks({ place, language, sample, includeDirectory = true }: { place: Place; language: Language; sample: boolean; includeDirectory?: boolean }) {
  if (sample || place.kind !== 'system') return null
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  const es = language === 'es'
  return <div className="profile-links">{contact && includeDirectory ? <SourceLink url={contact.sourceUrl}>{es ? 'Perfil de ADH' : 'ADH profile'}</SourceLink> : null}<SourceLink url={RECOVERY_RESOURCES.annualReports}>{es ? 'Informes anuales de calidad del agua' : 'Annual water-quality reports'}</SourceLink></div>
}

export function SupplierInformation({ place, language, sample, onView }: { place: Place; language: Language; sample: boolean; onView: () => void }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  return <section className="provider-information">
    <div className="provider-info-header"><h3><button className="provider-info-toggle" aria-controls={id} aria-expanded={open} onClick={() => setOpen(v => !v)}>{language === 'es' ? 'Información del proveedor' : 'Provider information'}<span className="disclosure-icon" aria-hidden="true" /></button></h3></div>
    <div id={id} hidden={!open} className="provider-info-content"><ProfileLinks place={place} language={language} sample={sample} includeDirectory={false} /><SupplierProfile place={place} language={language} sample={sample} compact /><button className="text-button" onClick={onView}>{language === 'es' ? 'Detalles y herramientas del proveedor' : 'Supplier details & tools'}</button></div>
  </section>
}
export function SupplierProfile({ place, language, sample, compact = false }: { place: Place; language: Language; sample: boolean; compact?: boolean }) {
  if (sample || place.kind !== 'system') return null
  const es = language === 'es'
  return <section className="supplier-profile">{!compact ? <h2>{es ? 'Acerca de este sistema de agua' : 'About this water system'}</h2> : null}
    {place.id === leisureId ? <><dl className="profile-facts">
      <div><dt>{es ? 'ID del sistema' : 'System ID'}</dt><dd>747</dd></div>
      <div><dt>{es ? 'Fuente de agua' : 'Water source'}</dt><dd>{es ? 'Agua subterránea' : 'Groundwater'}</dd></div>
      <div><dt>{es ? 'Tipo de sistema' : 'System type'}</dt><dd>{es ? 'Sistema comunitario' : 'Community system'}</dd></div>
      <div><dt>{es ? 'Nombre de la fuente' : 'Source name'}</dt><dd lang="en">WELL #1</dd></div>
      <div><dt>{es ? 'Población minorista' : 'Retail population'}</dt><dd>113</dd></div>
      <div><dt>{es ? 'Última inspección registrada' : 'Last listed inspection'}</dt><dd>{es ? '5 de febrero de 2026' : 'Feb 5, 2026'}</dd></div>
    </dl></> : <p>{es ? 'No se ha verificado un perfil detallado para este sistema.' : 'A detailed profile has not been verified for this system.'}</p>}
    {!compact ? <ProfileLinks place={place} language={language} sample={sample} /> : null}
    <p className="quiet-note profile-limits">{place.id === leisureId ? es ? 'Directorio de ADH · Revisado el 14 de octubre de 2026. ' : 'ADH directory · Checked Oct 14, 2026. ' : ''}{es ? 'No son mediciones en vivo, resultados de inspección, conclusiones actuales de cumplimiento ni una calificación de seguridad. Para los informes anuales, confirma el sistema y el año.' : 'Not live readings, inspection results, current compliance findings, or a safety rating. For annual reports, confirm the system and year.'}</p>
  </section>
}
