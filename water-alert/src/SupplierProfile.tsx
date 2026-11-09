import { useEffect, useId, useState } from 'react'
import { useMotionPresence } from './interface-motion'
import type { Language, Place } from './domain'
import { PROVIDER_CONTACTS } from './provider-contacts'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { SourceLink } from './components'
import { AnnualReportCard, calendarIcon, formatIsoDate, reportHeaderChip, useReportYear } from './AnnualWaterReport'
import { ANNUAL_REPORTS } from './annual-reports'
import { providerProfile } from './provider-profiles'
import { Icon } from './icons'

const formatCount = (value: string, language: Language) => Number.isFinite(Number(value)) ? Number(value).toLocaleString(language === 'es' ? 'es-US' : 'en-US') : value

export function SupplierInformation({ place, language, sample, onAsk, openSignal = 0 }: { place: Place; language: Language; sample: boolean; onView?: () => void; onAsk?: (key: string) => void; openSignal?: number }) {
  return <ProviderInformation key={place.id} place={place} language={language} showReports={!sample && place.kind === 'system'} onAsk={sample ? undefined : onAsk} openSignal={openSignal} />
}

// The selected report year lives here so the collapsed header can show a
// dated chip when that report lists findings.
function ProviderInformation({ place, language, showReports, onAsk, openSignal }: { place: Place; language: Language; showReports: boolean; onAsk?: (key: string) => void; openSignal: number }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (openSignal) setOpen(true) }, [openSignal])
  const motion = useMotionPresence(open, 'slide')
  const id = useId()
  const reports = showReports && Object.hasOwn(ANNUAL_REPORTS, place.id) ? ANNUAL_REPORTS[place.id] : []
  const { report, setYear } = useReportYear(reports)
  const chip = showReports ? reportHeaderChip(report, language) : null
  return <section className="provider-information">
    <div className="provider-info-header"><h3><button className="provider-info-toggle" aria-controls={id} aria-expanded={open} onClick={() => setOpen(v => !v)}><span className="provider-info-label">{language === 'es' ? 'Información del proveedor' : 'Provider information'}</span>{chip ? <span className="status-pill status-pill-issues provider-info-chip"><Icon name="file-text" size={16} />{chip}</span> : null}<span className="disclosure-icon" aria-hidden="true" /></button></h3></div>
    <div ref={motion.ref} id={id} hidden={!motion.present} inert={!open} aria-hidden={!open || undefined} className="provider-info-content">
      {showReports ? <div className="provider-cards">
        <AnnualReportCard reports={reports} report={report} onYear={setYear} language={language} onAsk={onAsk} openSignal={openSignal} />
        <WaterSystemCard place={place} language={language} />
      </div> : null}
    </div>
  </section>
}

/** Directory facts for one system. They are not readings or inspection findings. */
function WaterSystemCard({ place, language, title, Heading = 'h4' }: { place: Place; language: Language; title?: string; Heading?: 'h2' | 'h4' }) {
  const es = language === 'es'
  const profile = providerProfile(place.id)
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  const profileUrl = contact?.sourceUrl ?? profile?.sourceUrl
  return <article className="provider-card provider-system-card">
    <div className="provider-card-heading">
      <Heading>{title ?? (es ? 'Sistema de agua' : 'Water system')}</Heading>
      {profile ? null : <span className="status-pill status-pill-neutral">{es ? 'Aún no verificado' : 'Not yet verified'}</span>}
      {profileUrl ? <><span className="profile-leader" aria-hidden="true" /><span className="provider-card-source"><SourceLink url={profileUrl}>{es ? 'Perfil de ADH' : 'ADH profile'}</SourceLink></span></> : null}
    </div>
    {profile ? <>
      <dl className="provider-card-facts">
        <div className="provider-water-source"><dt>{es ? 'Fuente de agua' : 'Water source'}</dt><dd>{profile.waterSource[language]} · <span lang="en">{profile.waterSummary.name}</span></dd></div>
        <div><dt>{es ? 'Nombre de la fuente' : 'Source name'}</dt><dd lang="en">{profile.sourceName}</dd></div>
        <div className="provider-system-id"><dt>{es ? 'ID del sistema' : 'System ID'}</dt><dd>{profile.systemId}</dd></div>
        <div><dt>{es ? 'Tipo de sistema' : 'System type'}</dt><dd>{profile.systemType[language]}</dd></div>
        <div><dt>{es ? 'Personas atendidas' : 'People served'}</dt><dd>{formatCount(profile.population, language)}</dd></div>
        <div className="provider-inspection"><dt>{calendarIcon}{es ? 'Última inspección de ADH' : 'Last ADH inspection'}</dt><dd>{profile.inspection[language]}</dd></div>
      </dl>
      <p className="provider-card-note">{es ? `Directorio de ADH, revisado el ${formatIsoDate(profile.verifiedOn, language)}.` : `ADH directory, checked ${formatIsoDate(profile.verifiedOn, language)}.`}</p>
      {profile.waterSummary.url !== profile.sourceUrl ? <p className="provider-card-links"><SourceLink url={profile.waterSummary.url}>{es ? `Referencia de la fuente de agua: ${profile.waterSummary.label.es}` : `Water source reference: ${profile.waterSummary.label.en}`}</SourceLink></p> : null}
    </> : null}
  </article>
}

export function SupplierProfile({ place, language, sample }: { place: Place; language: Language; sample: boolean }) {
  if (sample || place.kind !== 'system') return null
  const es = language === 'es'
  return <section className="supplier-profile">
    <WaterSystemCard place={place} language={language} Heading="h2" title={es ? 'Acerca de este sistema de agua' : 'About this water system'} />
    <p className="provider-card-links"><SourceLink url={RECOVERY_RESOURCES.annualReports}>{es ? 'Informes anuales de calidad del agua' : 'Annual water-quality reports'}</SourceLink></p>
  </section>
}
