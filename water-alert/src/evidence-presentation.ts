import type { Language } from './domain'
import { issueCategoryLabel, type EvidenceIssue, type IssueCategory } from './evidence-model'

/** This is an open-record filter, not a present-day compliance determination. */
export function currentProblem(issue: EvidenceIssue): boolean {
  if (issue.resolution || /^(resolved|closed|corrected)$/i.test(issue.printedStatus?.label.en.trim() ?? '')) return false
  if (issue.period.through?.trim()) return false
  return !!dateKey(issue.period.from) || issue.period.currentAsPrinted === true || /^(ongoing|active|current|open|unaddressed)$/i.test(issue.printedStatus?.label.en.trim() ?? '')
}

function dateKey(value?: string): string {
  if (!value) return ''
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(value.trim())
  const iso = us ? `${us[3]}-${us[1].padStart(2, '0')}-${us[2].padStart(2, '0')}` : value.trim()
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return ''
  const date = new Date(`${iso}T12:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(iso) ? iso : ''
}

const groups: Record<IssueCategory, [string, string]> = {
  treatment: ['Treatment issues', 'Problemas de tratamiento'],
  monitoring: ['Monitoring issues', 'Problemas de monitoreo'],
  reporting: ['Reporting issues', 'Problemas de informes'],
  monitoringOrReporting: ['Monitoring or reporting issues', 'Problemas de monitoreo o informes'],
  publicNotice: ['Public notice issues', 'Problemas de avisos públicos'],
  licensing: ['Licensing issues', 'Problemas de licencias'],
  significantDeficiency: ['Inspection findings', 'Problemas de inspección'],
  consumerConfidence: ['Annual report issues', 'Problemas del informe anual'],
  waterQuality: ['Water quality issues', 'Problemas de calidad del agua'],
  upstreamSupplier: ['Upstream supplier issues', 'Problemas del proveedor de origen'],
  documentConflict: ['Conflicting records', 'Registros contradictorios'],
  other: ['Other issues', 'Otros problemas'],
}

export function problemHeading(issue: EvidenceIssue, language: Language): string {
  const es = language === 'es'
  if (issue.category === 'treatment' && /^dbp[12]\.treatment$/.test(issue.requirementKey)) return `${es ? 'Tratamiento de desinfección · Etapa' : 'Disinfection treatment · Stage'} ${issue.requirementKey.includes('2') ? '2' : '1'}`
  const known: Partial<Record<IssueCategory, [string, string]>> = {
    monitoring: ['Required monitoring', 'Monitoreo requerido'], reporting: ['Required reporting', 'Informes requeridos'],
    monitoringOrReporting: ['Monitoring or reporting', 'Monitoreo o informes'], licensing: ['Operator licensing', 'Licencia del operador'],
    publicNotice: ['Required public notice', 'Aviso público requerido'], consumerConfidence: ['Annual reporting', 'Informe anual'],
  }
  return known[issue.category]?.[es ? 1 : 0] ?? issue.requirement[language] ?? issueCategoryLabel(issue.category, language)
}

export function problemGroups(issues: EvidenceIssue[], language: Language): { key: IssueCategory; label: string; issues: EvidenceIssue[] }[] {
  return (Object.keys(groups) as IssueCategory[]).flatMap(key => {
    const matching = issues.filter(issue => issue.category === key).sort((a, b) => (dateKey(b.period.from) || dateKey(b.period.through)).localeCompare(dateKey(a.period.from) || dateKey(a.period.through)))
    return matching.length ? [{ key, label: groups[key][language === 'es' ? 1 : 0], issues: matching }] : []
  })
}
