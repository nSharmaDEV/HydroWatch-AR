import { recipientRoutes, selectedRecipients, type HelpDraft } from './help-requests.js'
import { ISSUE_LABELS } from './help-questions.js'
import { readableDate, supplierDisplayName } from './help-format.js'
import { requiredReportEvidence } from './recovery-evidence.js'

const sentence = (s: string) => { const t = s.trim(); return t ? /[.!?]$/.test(t) ? t : `${t}.` : '' }
const stock: Record<string, string> = {
  'No water': 'I have no water', 'Lower pressure than usual': 'I have lower pressure than usual',
  'Service keeps stopping': 'I experienced interruptions in my water service', 'Service stops and starts': 'I experienced interruptions in my water service',
  'El servicio se interrumpe repetidamente': 'Experimenté interrupciones en el servicio de agua',
  'An unusual color': 'I observed an unusual color', 'An unusual smell': 'I noticed an unusual smell', 'Particles in the water': 'I observed particles in the water',
  'My usual water use is affected': 'My usual water use is affected', 'A charge I do not recognize': 'There is a charge I do not recognize',
  'No hay agua': 'No tengo agua', 'Menos presión de lo habitual': 'Tengo menos presión de lo habitual', 'Un color inusual': 'Observé un color inusual', 'Un olor inusual': 'Noté un olor inusual', 'Partículas en el agua': 'Observé partículas en el agua',
}
const actionStarts = /^(Restore |Share |Explain |Review |Clarify |Investigate |Provide )/
const spanishActions: Record<string, string> = {
  'Restablecer el servicio': 'restablezcan el servicio', 'Compartir una actualización': 'compartan una actualización', 'Explicar qué está pasando': 'expliquen qué está pasando',
  'Revisar el cargo': 'revisen el cargo', 'Explicar la factura': 'expliquen la factura', 'Explicar los próximos pasos disponibles': 'expliquen los próximos pasos disponibles',
  'Explicar cómo reportar esta observación': 'expliquen cómo reportar esta observación', 'Compartir orientación oficial pertinente': 'compartan orientación oficial pertinente', 'Explicar el próximo paso': 'expliquen el próximo paso',
  'Aclarar las instrucciones': 'aclaren las instrucciones', 'Explicar dónde se aplica el aviso': 'expliquen dónde se aplica el aviso', 'Explicar opciones de ayuda disponibles': 'expliquen opciones de ayuda disponibles',
  'Investigar la inquietud reportada': 'investiguen la inquietud reportada', 'Aclarar las instrucciones aplicables de uso del agua': 'aclaren las instrucciones aplicables de uso del agua',
}
const qualityObservations: Record<string, string> = { 'An unusual color': 'an unusual color', 'An unusual smell': 'an unusual smell', 'Particles in the water': 'particles in the water', 'Un color inusual': 'un color inusual', 'Un olor inusual': 'un olor inusual', 'Partículas en el agua': 'partículas en el agua' }
const list = (items: string[], language: 'en' | 'es') => new Intl.ListFormat(language, { type: 'conjunction' }).format(items)
/** Both outputs consume these same confirmed, conditionally applicable sections. */
export function confirmedSections(d: HelpDraft, language: 'en' | 'es') {
  const es = language === 'es', a = d.answers ?? {}, say = (en: string, spanish: string) => es ? spanish : en
  const detail = (value: string | undefined, en: string, spanish: string) => value?.trim() ? sentence(`${say(en, spanish)} ${value.trim()}`) : ''
  const timing = [detail(readableDate(a.began || a.noticed, language), a.approximate === 'Yes' ? 'I first noticed this around' : 'I first noticed this on', a.approximate === 'Yes' ? 'Lo noté aproximadamente el' : 'Lo noté el'), a.ongoing === 'Yes' ? say('The issue is ongoing.', 'El problema continúa.') : a.ongoing === 'No' ? say('The issue is no longer ongoing.', 'El problema ya no continúa.') : a.ongoing === 'Not sure' ? say('I am not sure whether the issue is ongoing.', 'No sé si el problema continúa.') : '', a.ongoing === 'No' ? detail(readableDate(a.ended, language), a.approximate === 'Yes' ? 'It ended around' : 'It ended on', a.approximate === 'Yes' ? 'Terminó aproximadamente el' : 'Terminó el') : '', detail(d.dates, 'Another relevant date is', 'Otra fecha pertinente es')].filter(Boolean).join(' ')
  const service = d.issue === 'service' || (d.issue === 'advisory' && a.advisoryService === 'Yes')
    const selectedObservations = Object.entries(d.wording?.report ?? {}).filter(([key]) => d.issue !== 'advisory' || a.advisoryService === 'Yes' || !key.startsWith('service')).map(([, text]) => text).filter(s => s.trim())
    const quality = selectedObservations.filter(text => qualityObservations[text])
    const noWater = selectedObservations.some(text => ['No water', 'No hay agua'].includes(text))
    const interruptions = selectedObservations.some(text => ['Service keeps stopping', 'Service stops and starts', 'El servicio se interrumpe repetidamente'].includes(text))
     const noWaterStatement = noWater && interruptions && a.frequency === 'At particular times' ? say('At particular times, my water service is interrupted and no water is available.', 'A ciertas horas, se interrumpe mi servicio de agua y no hay agua.') : noWater && a.frequency === 'At particular times' ? say('At particular times, no water is available.', 'A ciertas horas, no hay agua.') : noWater && a.frequency === 'Occasional' ? say('At times, no water is available.', 'A veces, no hay agua.') : noWater ? sentence(stock[selectedObservations.find(text => ['No water', 'No hay agua'].includes(text))!] ?? '') : ''
    const interruptionStatement = interruptions && !noWater ? sentence(`${stock[selectedObservations.find(text => ['Service keeps stopping', 'Service stops and starts', 'El servicio se interrumpe repetidamente'].includes(text))!] ?? ''}${a.frequency === 'At particular times' ? say(' at particular times', ' a ciertas horas') : a.frequency === 'Occasional' ? say(' occasionally', ' ocasionalmente') : ''}`) : ''
    const observations = [noWaterStatement, interruptionStatement, quality.length ? sentence(`${say('I observed', 'Observé')} ${list(quality.map(text => qualityObservations[text]), language)}`) : '', ...selectedObservations.filter(text => !qualityObservations[text] && !['No water', 'No hay agua', 'Service keeps stopping', 'Service stops and starts', 'El servicio se interrumpe repetidamente'].includes(text)).map(text => sentence(stock[text] ?? text))].filter(Boolean).join(' ')
   const frequencies: Record<string, [string, string]> = { Constant: ['I observed this constantly.', 'Lo observé constantemente.'], Occasional: ['I observed this occasionally.', 'Lo observé ocasionalmente.'], 'At particular times': ['I observed this at particular times.', 'Lo observé a ciertas horas.'] }
     const frequency = service || d.issue === 'quality' ? (noWater || interruptions) && ['At particular times', 'Occasional'].includes(a.frequency ?? '') ? '' : a.frequency && frequencies[a.frequency] ? say(...frequencies[a.frequency]) : detail(a.frequency, 'I observed this with the following frequency:', 'Lo observé con la siguiente frecuencia:') : ''
  const locations = new Intl.ListFormat(language, { type: 'conjunction' }).format(d.locations ?? [])
   const questionOnly = d.issue === 'advisory' && a.advisoryService !== 'Yes'
   const location = [detail(locations, questionOnly ? 'My question concerns' : 'I experienced this at', questionOnly ? 'Mi pregunta se refiere a' : 'Lo experimenté en'), detail(a.area, 'My previously reported area is', 'La zona que reporté antes es'), service ? detail(a.observationLocation, 'More specifically, I observed it at', 'Más específicamente, lo observé en') : ''].filter(Boolean).join(' ')
  const billing = d.issue === 'billing' ? [detail(a.chargeKind, 'My billing concern is', 'Mi inquietud sobre la factura es'), detail(a.billingPeriod, 'This concerns the billing period', 'Corresponde al período de facturación'), detail(a.amount, 'The amount in question is', 'El importe en cuestión es'), detail(a.charge, 'The item I am questioning is', 'El cargo que cuestiono es'), detail(a.tried, 'I have already tried', 'Ya intenté')].filter(Boolean).join(' ') : ''
  const contact = a.contacted === 'Yes' ? [say('I have contacted the provider about this.', 'Ya contacté al proveedor sobre esto.'), detail(readableDate(a.contactDate, language), 'The approximate contact date was', 'La fecha aproximada del contacto fue'), detail(a.contactMethod, 'I contacted them by', 'Los contacté por'), detail(a.contactResponse, 'My account of the response is:', 'Mi relato de la respuesta es:')].filter(Boolean).join(' ') : a.contacted === 'No' ? say('I have not contacted the provider about this.', 'No he contactado al proveedor sobre esto.') : ''
   const agencyOnly = recipientRoutes(d).includes('adh') && !recipientRoutes(d).includes('provider')
   const selectedRequests = Object.values(d.wording?.response ?? {}).filter(s => s.trim())
   const actions: string[] = [], custom: string[] = []
   for (const text of selectedRequests) {
     if (agencyOnly && ['Restore service', 'Restablecer el servicio'].includes(text)) actions.push(say('advise on how to pursue restoration of service with the provider', 'orienten sobre cómo solicitar al proveedor el restablecimiento del servicio'))
     else if (agencyOnly && ['Investigate the reported concern', 'Investigar la inquietud reportada'].includes(text)) actions.push(say('review the reported concern and advise on appropriate next steps within ADH’s role', 'revisen la inquietud reportada y orienten sobre los próximos pasos dentro de las funciones de ADH'))
     else if (spanishActions[text]) actions.push(spanishActions[text])
     else if (actionStarts.test(text)) actions.push(`${text[0].toLowerCase()}${text.slice(1).replace(/[.!?]+$/, '')}`)
     else custom.push(sentence(text))
   }
    const explanation = selectedRequests.some(text => ['Explain what is happening', 'Explicar qué está pasando'].includes(text))
    const update = selectedRequests.some(text => ['Share an update', 'Compartir una actualización'].includes(text))
     const directRequest = interruptions && explanation && update ? say('Could you explain what may be contributing to these interruptions and share any available update on next steps?', '¿Podrían explicar qué podría contribuir a estas interrupciones y compartir cualquier actualización disponible sobre los próximos pasos?') : ''
     const remainingActions = directRequest ? actions.filter(action => !['explain what is happening', 'share an update', 'expliquen qué está pasando', 'compartan una actualización'].includes(action)) : actions
     const requests = [directRequest, remainingActions.length ? sentence(`${say('Please', 'Por favor,')} ${list(remainingActions, language)}`) : '', ...custom, sentence(a.response ?? '')].filter(Boolean).join(' ')
  const requiredReportKeys = new Set(requiredReportEvidence(d.place, false).map(row => row.key))
  const facts = (d.facts ?? []).filter(f => requiredReportKeys.has(f.id)
    ? Boolean(f.text.trim())
    : !['billing','other','legal'].includes(d.issue) && f.included && Boolean(f.text.trim()) && (d.issue !== 'service' || f.kind !== 'historical'))
  const sourceNumbers = new Map<string, number[]>()
  facts.forEach((f, i) => new Set(f.sources.map(s => s.url)).forEach(url => sourceNumbers.set(url, [...(sourceNumbers.get(url) ?? []), i + 1])))
  if (!d.facts && d.context.trim()) (d.sources ?? []).forEach(s => { if (!sourceNumbers.has(s.url)) sourceNumbers.set(s.url, []) })
   const references = [...sourceNumbers].map(([url, numbers]) => {
     const labels = [...new Set(facts.flatMap(f => f.sources.filter(s => s.url === url).map(s => s.label)).filter(Boolean))]
     return `${numbers.length ? `[${numbers.join(', ')}] ` : ''}${labels.length ? `${labels.join('; ')}: ` : ''}${url}`
   }).join('\n')
    const records = facts.map((f, i) => {
      // Retained source prose can describe what was active when saved, not now.
       let text = f.text.trim()
       const legacyNotice = f.kind === 'saved' && !f.record ? text.match(/I['’]m writing about an active advisory issued ([^ ]+) for ([^.]+)\.?/i) : null
       if (legacyNotice) {
         const agency = f.sources.some(source => /^ADH(?:\s|$)/i.test(source.label ?? '')) ? 'ADH ' : ''
         const area = legacyNotice[2].trim().replace(/^“|”$/g, '')
         const issued = readableDate(legacyNotice[1], language)
         const summary = say(`The saved ${agency}notice${issued ? ` dated ${issued}` : ''} lists “${area}” as the affected area.`, `El aviso guardado${agency ? ' de ADH' : ''}${issued ? ` del ${issued}` : ''} indica “${area}” como zona afectada.`)
         text = [summary, text.slice(legacyNotice[0].length).trim()].filter(Boolean).join(' ')
       }
       text = text.replace(/I'm writing about /g, 'The record describes ').replace(/I’m writing about /g, 'The record describes ').replace(/Escribo acerca de /g, 'El registro describe ')
       .replace(f.kind === 'saved' ? /an active advisory/g : /$^/g, 'a saved notice, not verified as current')
       .replace(f.kind === 'saved' ? /un aviso activo/g : /$^/g, 'un aviso guardado, no verificado como actual')
       .replace(f.kind === 'saved' ? /The notice is listed as active in the current source check\./g : /$^/g, 'Its current status has not been verified.')
       .replace(f.kind === 'saved' ? /El aviso figura como activo en la consulta actual\./g : /$^/g, 'Su estado actual no se ha verificado.')
     const context = f.kind === 'historical' ? say('For historical context (not current status),', 'Como contexto histórico (no es el estado actual),') : say('For context,', 'Como contexto,')
        const relation = service && (observations || d.description.trim()) && f.record?.agency === 'ADH' && f.kind !== 'historical' ? interruptions ? say(' Could you confirm whether this notice relates to the interruptions I experienced and whether any advisory instructions currently apply?', ' ¿Podrían confirmar si este aviso se relaciona con las interrupciones que experimenté y si actualmente se aplican instrucciones del aviso?') : say(' Could you confirm whether this notice relates to my reported experience and whether any advisory instructions currently apply?', ' ¿Podrían confirmar si este aviso se relaciona con mi experiencia reportada y si actualmente se aplican instrucciones del aviso?') : ''
       if (f.record && f.record.agency === 'ADH') {
         const date = readableDate(f.record.date, language)
         const area = f.record.area?.trim()
         const problem = f.record.problem?.trim()
          const attribution = f.kind === 'historical' ? say(`ADH${f.record.year ? ` (${f.record.year})` : ''}`, `ADH${f.record.year ? ` (${f.record.year})` : ''}`) : say(`the ADH notice${date ? ` dated ${date}` : ''}`, `el aviso de ADH${date ? ` del ${date}` : ''}`)
          const metadata = [problem && !text.includes(problem) ? say(`Reported problem: ${problem}.`, `Problema publicado: ${problem}.`) : '', area && !text.includes(area) ? say(`Published affected area: ${area}.`, `Zona afectada publicada: ${area}.`) : '', f.record.status && !text.includes(f.record.status) ? say(`Source-recorded status: ${f.record.status}.`, `Estado registrado por la fuente: ${f.record.status}.`) : ''].filter(Boolean).join(' ')
          const status = f.kind === 'historical' ? '' : f.kind === 'saved' || !f.record.verified ? say(' Its current status has not been verified.', ' Su estado actual no se ha verificado.') : say(' It was listed as active in the source check for this draft.', ' Figuraba como activo en la consulta de la fuente para este borrador.')
           const attributed = text.toLocaleLowerCase().includes(attribution.toLocaleLowerCase())
           const sourceProse = attributed ? sentence(text.replace(/^The /, 'the ').replace(/^El /, 'el ')) : `${attribution}: ${sentence(text)}`
           return `${context} ${sourceProse}${metadata ? ` ${metadata}` : ''}${status}${relation} [${i + 1}]`
       }
       return `${context} ${sentence(text.replace(/^The /, 'the ').replace(/^El /, 'el '))}${f.kind === 'saved' && !/current status has not been verified|current status is unverified|estado actual no se ha verificado/.test(text) ? say(' Its current status has not been verified.', ' Su estado actual no se ha verificado.') : ''}${relation} [${i + 1}]`
   }).join('\n\n')
  return { timing, observations, frequency, location, billing, contact, requests, facts, references, records, description: sentence(d.description), signature: [d.residentName?.trim(), d.replyContact?.trim()].filter(Boolean).join('\n') }
}
export function answerFingerprint(d: HelpDraft) {
  const text = JSON.stringify([d.issue, d.place.id, d.description, d.dates, Object.entries(d.answers ?? {}).sort(), d.locations ?? [], d.wording ?? {}, d.facts ?? d.context, recipientRoutes(d), d.residentName ?? '', d.replyContact ?? '', d.attachments.map(a => [a.id,a.name,a.type])])
  let hash = 2166136261
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619)
  return `v1:${text.length}:${hash >>> 0}`
}
export function emailOutput(d: HelpDraft, language: 'en' | 'es', appendix = '') {
  const es = language === 'es', s = confirmedSections(d, language)
   const report = Object.values(d.wording?.report ?? {}), intermittent = (d.issue === 'service' || d.issue === 'advisory' && d.answers?.advisoryService === 'Yes') && report.some(v => ['Service keeps stopping', 'Service stops and starts', 'El servicio se interrumpe repetidamente'].includes(v))
    const specific = intermittent ? (es ? 'servicio de agua intermitente' : 'intermittent water service') : d.issue === 'service' && report.includes('No water') ? 'loss of water service' : d.issue === 'service' && report.includes('No hay agua') ? 'falta de servicio de agua' : d.issue === 'service' && report.includes('Lower pressure than usual') ? 'lower water pressure than usual' : d.issue === 'service' && report.includes('Menos presión de lo habitual') ? 'presión de agua más baja de lo habitual' : ''
    const supplier = supplierDisplayName(d.place.name)
    const opener: Record<HelpDraft['issue'], [string, string]> = {
      service: ['I’m writing about my water service', 'Le escribo sobre mi servicio de agua'],
      quality: ['I’m writing about water quality', 'Le escribo sobre la calidad del agua'],
      advisory: ['I’m writing with a question about a water advisory', 'Le escribo con una pregunta sobre un aviso de agua'],
      billing: ['I’m writing about my water bill', 'Le escribo sobre mi factura de agua'],
      other: ['I’m writing about a water concern', 'Le escribo sobre una inquietud relacionada con el agua'],
      legal: ['I’m writing with a question about available assistance', 'Le escribo con una pregunta sobre la ayuda disponible'],
    }
    const intro = `${es ? opener[d.issue][1] : opener[d.issue][0]} ${es ? 'con' : 'at'} ${supplier}.`
    const recipients = selectedRecipients(d)
    const greeting = recipients.length !== 1 ? (es ? 'Hola,' : 'Hello,')
      : recipients[0].route === 'provider' ? es ? `Hola, equipo de ${supplierDisplayName(recipients[0].name)},` : `Hello ${supplierDisplayName(recipients[0].name)} team,`
      : `${es ? 'Hola' : 'Hello'} ${supplierDisplayName(recipients[0].name)},`
    const experience = [s.observations, s.description, s.timing, s.location, s.frequency, s.billing].filter(Boolean).join(' ')
    const body = [greeting, intro, experience, s.contact, s.records || (!d.facts ? d.context.trim() : ''), appendix.trim(), s.requests, es ? 'Gracias.' : 'Thank you.', s.signature, s.references].filter(Boolean).join('\n\n')
      const concern = intermittent ? (es ? 'Interrupciones del servicio de agua' : 'Intermittent water service') : specific ? `${specific[0].toLocaleUpperCase()}${specific.slice(1)}` : ISSUE_LABELS[d.issue][es ? 1 : 0]
     const subject = `${concern} — ${supplier}`
   return { subject: subject.slice(0,200), body }
}
export function generateReport(d: HelpDraft, language: 'en' | 'es') {
  const es = language === 'es', s = confirmedSections(d, language), say = (en: string, spanish: string) => es ? spanish : en
  const section = (label: string, value: string) => value ? `${label}\n${value}` : ''
  return [say('Resident issue report', 'Reporte de un residente'), say('Resident account, not an agency inspection, investigation or determination of a violation.', 'Relato del residente, no una inspección, investigación ni determinación de una infracción.'), section(say('Supplier and issue', 'Proveedor y problema'), `${d.place.name}\n${ISSUE_LABELS[d.issue][es ? 1 : 0]}`), section(say('Resident-reported locations', 'Lugares reportados por el residente'), s.location), section(say('Timeline and ongoing status', 'Fechas y continuidad'), s.timing), section(say('Observations and frequency', 'Observaciones y frecuencia'), [s.observations,s.frequency].filter(Boolean).join(' ')), section(say('Additional description', 'Descripción adicional'), [s.description,s.billing].filter(Boolean).join(' ')), section(say('Prior contact — resident account', 'Contacto previo — relato del residente'), s.contact), section(say('Requested action', 'Respuesta solicitada'), s.requests), section(say('Agency records and historical findings', 'Registros oficiales y hallazgos históricos'), s.records || (!d.facts ? d.context.trim() : '')), section(say('Attachments (not bundled with this text)', 'Archivos (no incluidos en este texto)'), d.attachments.map(a => `${a.name} (${a.type})`).join('\n')), section(say('Source references', 'Fuentes'), s.references), section(say('Resident name and reply contact', 'Nombre y contacto del residente'), s.signature)].filter(Boolean).join('\n\n')
}
