import { useEffect, useId, useState } from 'react'
import { useMotionPresence } from './interface-motion'
import type { Language, Place } from './domain'
import { PROVIDER_CONTACTS } from './provider-contacts'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { SourceLink } from './components'
import { AnnualReportCard, CheckIconButton, calendarIcon, formatIsoDate, reportHasFindings, reportHeaderChip, useReportYear } from './AnnualWaterReport'
import { ANNUAL_REPORTS } from './annual-reports'
import { providerProfile } from './provider-profiles'
import { directorySystem } from './water-system-directory'
import { useReportCheck } from './report-check'
import { sourceTypeText, systemTypeText, useWaterSystemCheck } from './water-system-check'
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
  const shipped = showReports && Object.hasOwn(ANNUAL_REPORTS, place.id) ? ANNUAL_REPORTS[place.id] : undefined
  // Allow an on-demand refresh for every directory system. Shipped, hand-reviewed
  // reports remain authoritative and are never replaced by a device-local check.
  const check = useReportCheck(place.id, showReports && !!directorySystem(place.id))
  const reports = shipped ?? (check.report ? [check.report] : [])
  const { report, setYear } = useReportYear(reports)
  const chip = showReports ? reportHeaderChip(report, language) : null
  return <section className="provider-information">
    <div className="provider-info-header"><h3><button className="provider-info-toggle" aria-controls={id} aria-expanded={open} onClick={() => setOpen(v => !v)}><span className="provider-info-label">{language === 'es' ? 'Información del proveedor' : 'Provider information'}</span>{chip ? <span className={`status-pill ${reportHasFindings(report) ? 'status-pill-issues' : 'status-pill-clear'} provider-info-chip`}><Icon name="file-text" size={16} />{chip}</span> : null}<span className="disclosure-icon" aria-hidden="true" /></button></h3></div>
    <div ref={motion.ref} id={id} hidden={!motion.present} inert={!open} aria-hidden={!open || undefined} className="provider-info-content">
      {showReports ? <div className="provider-cards">
        <AnnualReportCard reports={reports} report={report} onYear={setYear} language={language} onAsk={onAsk} openSignal={openSignal} check={check} />
        <WaterSystemCard place={place} language={language} allowCheck />
      </div> : null}
    </div>
  </section>
}

/** Directory facts for one system. They are not readings or inspection findings. */
function WaterSystemCard({ place, language, title, Heading = 'h4', allowCheck = false }: { place: Place; language: Language; title?: string; Heading?: 'h2' | 'h4'; allowCheck?: boolean }) {
  const es = language === 'es'
  const profile = providerProfile(place.id)
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  // Offered only where no hand-verified profile exists, so it cannot replace one.
  const device = useWaterSystemCheck(place.id, allowCheck && !profile && !!directorySystem(place.id))
  const facts = profile ? {
    source: <>{profile.waterSource[language]} · <span lang="en">{profile.waterSummary.name}</span></>,
    sourceName: profile.sourceName, systemId: profile.systemId, systemType: profile.systemType[language],
    population: profile.population, inspection: profile.inspection[language], checkedOn: profile.verifiedOn,
  } : device.record ? {
    source: sourceTypeText(device.record.facts.sourceType)?.[language],
    sourceName: device.record.facts.sourceNames.join('; '),
    systemId: device.record.facts.systemId, systemType: systemTypeText(device.record.facts.systemType)?.[language],
    population: device.record.facts.population,
    inspection: device.record.facts.inspection ? formatIsoDate(device.record.facts.inspection, language) : undefined,
    checkedOn: device.record.checkedAt,
  } : undefined
  const profileUrl = contact?.sourceUrl ?? profile?.sourceUrl ?? device.record?.sourceUrl
  const canCheck = allowCheck && !profile
  return <article className="provider-card provider-system-card">
    <div className="provider-card-heading">
      <Heading>{title ?? (es ? 'Sistema de agua' : 'Water system')}</Heading>
      {facts ? null : <span className="status-pill status-pill-neutral">{es ? 'Aún no verificado' : 'Not yet verified'}</span>}
      {profileUrl || canCheck ? <><span className="profile-leader" aria-hidden="true" /><span className="provider-card-source">
        {canCheck ? <CheckIconButton onCheck={device.check} checking={device.status === 'checking'} label={facts
          ? es ? 'Volver a buscar los datos del sistema' : 'Check the system details again'
          : es ? 'Buscar los datos del sistema' : 'Check the system details'} /> : null}
        {profileUrl ? <SourceLink url={profileUrl}>{es ? 'Perfil de ADH' : 'ADH profile'}</SourceLink> : null}
      </span></> : null}
    </div>
    {facts ? <>
      <dl className="provider-card-facts">
        {facts.source ? <div className="provider-water-source"><dt>{es ? 'Fuente de agua' : 'Water source'}</dt><dd>{facts.source}</dd></div> : null}
        {facts.sourceName ? <div><dt>{es ? 'Nombre de la fuente' : 'Source name'}</dt><dd lang="en">{facts.sourceName}</dd></div> : null}
        <div className="provider-system-id"><dt>{es ? 'ID del sistema' : 'System ID'}</dt><dd>{facts.systemId}</dd></div>
        {facts.systemType ? <div><dt>{es ? 'Tipo de sistema' : 'System type'}</dt><dd>{facts.systemType}</dd></div> : null}
        {facts.population ? <div><dt>{es ? 'Personas atendidas' : 'People served'}</dt><dd>{formatCount(facts.population, language)}</dd></div> : null}
        {facts.inspection ? <div className="provider-inspection"><dt>{calendarIcon}{es ? 'Última inspección de ADH' : 'Last ADH inspection'}</dt><dd>{facts.inspection}</dd></div> : null}
      </dl>
      <p className="provider-card-note">{es ? `Directorio de ADH, revisado el ${formatIsoDate(facts.checkedOn, language)}.` : `ADH directory, checked ${formatIsoDate(facts.checkedOn, language)}.`}</p>
      {profile && profile.waterSummary.url !== profile.sourceUrl ? <p className="provider-card-links"><SourceLink url={profile.waterSummary.url}>{es ? `Referencia de la fuente de agua: ${profile.waterSummary.label.es}` : `Water source reference: ${profile.waterSummary.label.en}`}</SourceLink></p> : null}
    </> : null}
    {canCheck ? <p className="report-check-status" role="status" aria-live="polite">{device.status === 'mismatch'
      ? es ? 'La página del directorio de ADH para este identificador indica otro sistema, así que no se guardó nada.' : 'ADH’s directory page for this identifier lists a different system, so nothing was saved.'
      : device.status === 'incomplete'
      ? es ? 'No se pudo completar la verificación ahora. No cambió nada.' : 'The check couldn’t be completed just now. Nothing changed.'
      : ''}</p> : null}
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
