import { useEffect, useId, useRef, useState } from 'react'
import { useMotionPresence } from './interface-motion'
import type { Language, Place } from './domain'
import { PROVIDER_CONTACTS } from './provider-contacts'
import { RECOVERY_RESOURCES } from './recovery-resources'
import { SourceLink } from './components'
import { calendarIcon, formatIsoDate } from './AnnualWaterReport'
import { helpReports } from './help-report-facts'
import { useEchoRecords } from './echo-check'
import { ProviderEvidenceSections } from './ProviderEvidence'
import { evidenceBadge, providerEvidence } from './provider-evidence'
import { providerProfile } from './provider-profiles'
import { directorySystem } from './water-system-directory'
import { useReportCheck } from './report-check'
import { sourceTypeText, systemTypeText, useWaterSystemCheck } from './water-system-check'
import { Icon } from './icons'

const formatCount = (value: string, language: Language) => Number.isFinite(Number(value)) ? Number(value).toLocaleString(language === 'es' ? 'es-US' : 'en-US') : value

export function SupplierInformation({ place, language, sample, onAsk, openSignal = 0 }: { place: Place; language: Language; sample: boolean; onView?: () => void; onAsk?: (key: string) => void; openSignal?: number }) {
  return <ProviderInformation key={place.id} place={place} language={language} showReports={!sample && place.kind === 'system'} onAsk={sample ? undefined : onAsk} openSignal={openSignal} />
}

/**
 * The collapsed header carries a dated badge counting **distinct historical
 * issues** across every record WAVE holds for this supplier — never a count of
 * documents, and never a reassuring zero when no record has been retrieved.
 * Historical findings never change the live advisory status above this panel.
 */
function ProviderInformation({ place, language, showReports, onAsk, openSignal }: { place: Place; language: Language; showReports: boolean; onAsk?: (key: string) => void; openSignal: number }) {
  const [open, setOpen] = useState(false)
  useEffect(() => { if (openSignal) setOpen(true) }, [openSignal])
  const motion = useMotionPresence(open, 'slide')
  const id = useId()
  // Allow an on-demand refresh for every directory system. Shipped, hand-reviewed
  // reports remain authoritative and are never replaced by a device-local check.
  const check = useReportCheck(place.id, showReports && !!directorySystem(place.id))
  const reports = helpReports(place, !showReports, check.report)
  const records = useEchoRecords(place.id, showReports)
  const refresh = useRef({ report: check.check, records: records.check })
  refresh.current = { report: check.check, records: records.check }
  useEffect(() => {
    if (!open || !showReports) return
    refresh.current.report()
    refresh.current.records()
  }, [open, showReports])
  const evidence = providerEvidence({
    place, sample: !showReports, reports,
    ...(records.records ? { echo: records.records } : {}),
    ...(records.status === 'none' || records.status === 'incomplete' || records.status === 'unsupported' ? { echoState: records.status } : {}),
    ...(records.checkedOn ? { echoCheckedOn: records.checkedOn } : {}),
  })
  // Zero shows only when records were read and reviewed; nothing retrieved shows no chip.
  const badge = showReports ? evidenceBadge(evidence, language) : undefined
  return <section className="provider-information">
    <div className="provider-info-header"><h3><button className="provider-info-toggle" aria-controls={id} aria-expanded={open} onClick={() => setOpen(v => !v)}><span className="provider-info-label">{language === 'es' ? 'Información del proveedor' : 'Provider information'}</span>{badge ? <span className={`status-pill ${evidence.issues.length ? 'status-pill-issues' : 'status-pill-clear'} provider-info-chip`}><Icon name="file-text" size={16} />{badge}<span className="sr-only">{evidence.issues.length
          ? language === 'es' ? '; hallazgos históricos en registros con fecha, no es el estado actual del agua.' : '; historical findings in dated records, not the current status of your water.'
          : language === 'es' ? '; en los registros con fecha que se leyeron; no es el estado actual del agua.' : '; in the dated records read; not the current status of your water.'}</span></span> : null}<span className="disclosure-icon" aria-hidden="true" /></button></h3></div>
    <div ref={motion.ref} id={id} hidden={!motion.present} inert={!open} aria-hidden={!open || undefined} className="provider-info-content">
      {showReports ? <ProviderEvidenceSections evidence={evidence} language={language} onAsk={onAsk}
        onCheckRecords={records.supported ? records.check : undefined} recordsStatus={records.status}
        reportCheck={directorySystem(place.id) ? { run: check.check, busy: check.status === 'checking', failed: check.status === 'incomplete' || check.status === 'ambiguous', message: reportCheckMessage(check.status, language), checkedOn: check.checkedOn } : undefined}>
        <WaterSystemCard place={place} language={language} allowCheck refreshOpen={open} federalPwsId={evidence.system.federalPwsId} />
      </ProviderEvidenceSections> : null}
    </div>
  </section>
}

function reportCheckMessage(status: string, language: Language) {
  const es = language === 'es'
  if (status === 'ambiguous') return es ? 'Más de un sistema de ADH coincidió con este nombre, así que no se enlazó nada.' : 'More than one ADH system matched this name, so nothing was linked.'
  if (status === 'incomplete') return es ? 'No se pudo completar la verificación ahora. No cambió nada.' : 'The check couldn’t be completed just now. Nothing changed.'
  if (status === 'checked') return es ? 'Verificación del informe completada.' : 'Annual report check complete.'
  return ''
}

/** Directory facts for one system. They are not readings or inspection findings. */
function WaterSystemCard({ place, language, title, Heading = 'h4', allowCheck = false, refreshOpen = false, federalPwsId }: { place: Place; language: Language; title?: string; Heading?: 'h2' | 'h4'; allowCheck?: boolean; refreshOpen?: boolean; federalPwsId?: string }) {
  const es = language === 'es'
  const profile = providerProfile(place.id)
  const contact = Object.hasOwn(PROVIDER_CONTACTS, place.id) ? PROVIDER_CONTACTS[place.id] : undefined
  // Refresh directory fields without altering the shipped reference snapshot.
  const device = useWaterSystemCheck(place.id, allowCheck && !!directorySystem(place.id))
  const refresh = useRef(device.check)
  refresh.current = device.check
  useEffect(() => { if (refreshOpen && allowCheck && directorySystem(place.id)) refresh.current() }, [refreshOpen, allowCheck, place.id])
  const facts = device.record ? {
    source: sourceTypeText(device.record.facts.sourceType)?.[language],
    sourceName: device.record.facts.sourceNames.join('; '),
    systemId: device.record.facts.systemId, systemType: systemTypeText(device.record.facts.systemType)?.[language],
    population: device.record.facts.population,
    inspection: device.record.facts.inspection ? formatIsoDate(device.record.facts.inspection, language) : undefined,
    checkedOn: device.record.checkedAt,
  } : profile ? {
    source: <>{profile.waterSource[language]} · <span lang="en">{profile.waterSummary.name}</span></>,
    sourceName: profile.sourceName, systemId: profile.systemId, systemType: profile.systemType[language],
    population: profile.population, inspection: profile.inspection[language], checkedOn: profile.verifiedOn,
  } : undefined
  const profileUrl = contact?.sourceUrl ?? profile?.sourceUrl ?? device.record?.sourceUrl
  const canCheck = allowCheck && !!directorySystem(place.id)
  return <article className="provider-card provider-system-card">
    <div className="provider-card-heading">
      <Heading>{title ?? (es ? 'Sistema de agua' : 'Water system')}</Heading>
      {facts ? null : <span className="status-pill status-pill-neutral">{es ? 'Aún no verificado' : 'Not yet verified'}</span>}
      {profileUrl || canCheck ? <><span className="profile-leader" aria-hidden="true" /><span className="provider-card-source">
        {profileUrl ? <SourceLink url={profileUrl}>{es ? 'Perfil de ADH' : 'ADH profile'}</SourceLink> : null}
      </span></> : null}
    </div>
    {facts ? <>
      <dl className="provider-card-facts">
        {facts.source ? <div className="provider-water-source"><dt>{es ? 'Fuente de agua' : 'Water source'}</dt><dd>{facts.source}</dd></div> : null}
        {facts.sourceName ? <div><dt>{es ? 'Nombre de la fuente' : 'Source name'}</dt><dd lang="en">{facts.sourceName}</dd></div> : null}
        <div className="provider-system-id"><dt>{es ? 'ID del sistema' : 'System ID'}</dt><dd>{facts.systemId}</dd></div>
        {/* The published federal identifier, from WAVE's reviewed EPA directory snapshot. It never replaces the agency's own number. */}
        {federalPwsId ? <div className="provider-federal-id"><dt>{es ? 'ID federal PWS (verificado)' : 'Federal PWS ID (verified)'}</dt><dd>{federalPwsId}</dd></div> : null}
        {facts.systemType ? <div><dt>{es ? 'Tipo de sistema' : 'System type'}</dt><dd>{facts.systemType}</dd></div> : null}
        {facts.population ? <div><dt>{es ? 'Personas atendidas' : 'People served'}</dt><dd>{formatCount(facts.population, language)}</dd></div> : null}
        {facts.inspection ? <div className="provider-inspection"><dt>{calendarIcon}{es ? 'Última inspección de ADH' : 'Last ADH inspection'}</dt><dd>{facts.inspection}</dd></div> : null}
      </dl>
      <p className="provider-card-note">{es ? `Directorio de ADH, revisado el ${formatIsoDate(facts.checkedOn, language)}.` : `ADH directory, checked ${formatIsoDate(facts.checkedOn, language)}.`}</p>
      {profile && profile.waterSummary.url !== profile.sourceUrl ? <p className="provider-card-links"><SourceLink url={profile.waterSummary.url}>{es ? `Referencia de la fuente de agua: ${profile.waterSummary.label.es}` : `Water source reference: ${profile.waterSummary.label.en}`}</SourceLink></p> : null}
    </> : null}
    {canCheck ? <p className="report-check-status" role="status" aria-live="polite">{device.status === 'checking'
      ? es ? 'Buscando actualizaciones…' : 'Checking for updates…'
      : device.status === 'incomplete' || device.status === 'mismatch'
      ? es ? 'Error al actualizar; se conservaron los datos guardados.' : 'Update failed; saved details kept.'
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
