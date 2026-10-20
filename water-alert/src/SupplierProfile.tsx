import { useId, useState } from 'react'
import type { Language, Place } from './domain'
import { PROVIDER_CONTACTS } from './provider-contacts'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { SourceLink } from './components'
import { AnnualWaterReport } from './AnnualWaterReport'
import { ANNUAL_REPORTS } from './annual-reports'
import { providerProfile } from './provider-profiles'

function ProfileLinks({ place, language, sample, includeDirectory = true }: { place: Place; language: Language; sample: boolean; includeDirectory?: boolean }) {
  if (sample || place.kind !== 'system') return null
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  const es = language === 'es'
  return <div className="profile-links">{contact && includeDirectory ? <SourceLink url={contact.sourceUrl}>{es ? 'Perfil de ADH' : 'ADH profile'}</SourceLink> : null}<SourceLink url={RECOVERY_RESOURCES.annualReports}>{es ? 'Informes anuales de calidad del agua' : 'Annual water-quality reports'}</SourceLink></div>
}

export function SupplierInformation({ place, language, sample }: { place: Place; language: Language; sample: boolean; onView?: () => void }) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const profile = providerProfile(place.id)
  return <section className="provider-information">
    <div className="provider-info-header"><h3><button className="provider-info-toggle" aria-controls={id} aria-expanded={open} onClick={() => setOpen(v => !v)}>{language === 'es' ? 'Información del proveedor' : 'Provider information'}<span className="disclosure-icon" aria-hidden="true" /></button></h3></div>
    <div id={id} hidden={!open} className="provider-info-content">
      {!sample && place.kind === 'system' ? <>
        <AnnualWaterReport key={`report-${place.id}`} reports={Object.hasOwn(ANNUAL_REPORTS, place.id) ? ANNUAL_REPORTS[place.id] : []} language={language} />
        <section className="provider-water-source">
          <h4>{language === 'es' ? 'De dónde viene tu agua' : 'Where your water comes from'}</h4>
          {profile ? <>
            <p>{profile.waterSummary.intro[language]} <span lang="en">{profile.waterSummary.name}</span>.</p>
            <SourceLink url={profile.waterSummary.url}>{profile.waterSummary.label[language]}</SourceLink>
            <p>{language === 'es' ? `Aproximadamente ${profile.population} personas atendidas (directorio de ADH).` : `About ${profile.population} people served (ADH directory).`}</p>
          </> : <p>{language === 'es' ? 'Aún no se ha verificado la fuente de agua de este proveedor.' : 'This provider’s water source has not yet been verified.'}</p>}
        </section>
        <details className="provider-more" key={place.id}><summary>{language === 'es' ? 'Más detalles del proveedor' : 'More provider details'}<span className="disclosure-icon" aria-hidden="true" /></summary>
          <SupplierProfile place={place} language={language} sample={sample} compact />
          <ProfileLinks place={place} language={language} sample={sample} />
        </details>
      </> : null}
    </div>
  </section>
}
export function SupplierProfile({ place, language, sample, compact = false }: { place: Place; language: Language; sample: boolean; compact?: boolean }) {
  if (sample || place.kind !== 'system') return null
  const es = language === 'es'
  const profile = providerProfile(place.id)
  return <section className="supplier-profile">{!compact ? <h2>{es ? 'Acerca de este sistema de agua' : 'About this water system'}</h2> : null}
    {profile ? <><dl className="profile-facts">
      <div><dt>{es ? 'ID del sistema' : 'System ID'}</dt><dd>{profile.systemId}</dd></div>
      <div><dt>{es ? 'Fuente de agua' : 'Water source'}</dt><dd>{profile.waterSource[language]}</dd></div>
      <div><dt>{es ? 'Tipo de sistema' : 'System type'}</dt><dd>{profile.systemType[language]}</dd></div>
      <div><dt>{es ? 'Nombre de la fuente' : 'Source name'}</dt><dd lang="en">{profile.sourceName}</dd></div>
      <div><dt>{es ? 'Población minorista' : 'Retail population'}</dt><dd>{profile.population}</dd></div>
      <div><dt>{es ? 'Última inspección registrada' : 'Last listed inspection'}</dt><dd>{profile.inspection[language]}</dd></div>
    </dl></> : <p>{es ? 'No se ha verificado un perfil detallado para este sistema.' : 'A detailed profile has not been verified for this system.'}</p>}
    {!compact ? <ProfileLinks place={place} language={language} sample={sample} /> : null}
    <p className="quiet-note profile-limits">{profile ? <>{es ? 'Directorio de ADH · Revisado el ' : 'ADH directory · Checked '}<time dateTime={profile.verifiedOn}>{new Intl.DateTimeFormat(es ? 'es-US' : 'en-US', { timeZone: 'UTC', year: 'numeric', month: es ? 'long' : 'short', day: 'numeric' }).format(new Date(`${profile.verifiedOn}T00:00:00Z`))}</time>. </> : null}{es ? 'No son mediciones en vivo, resultados de inspección, conclusiones actuales de cumplimiento ni una calificación de seguridad. Para los informes anuales, confirma el sistema y el año.' : 'Not live readings, inspection results, current compliance findings, or a safety rating. For annual reports, confirm the system and year.'}</p>
  </section>
}
