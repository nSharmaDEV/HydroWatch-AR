import { isReportFactId, type HelpDraft, type HelpFact } from './help-requests.js'
import { hasPersonalConcern, reportQuestions } from './report-questions.js'

/** Use the saved evidence snapshot, not a later document check, when composing a letter. */
export function reportEmail(d: HelpDraft, facts: HelpFact[], language: 'en' | 'es') {
  const es = language === 'es', say = (en: string, spanish: string) => es ? spanish : en
  const response = d.wording?.response ?? {}
  // These requests are automatic; retain any previously saved custom question text.
  const stock = (key: string) => {
    const row = reportQuestions.find(row => row[0] === key)
    return !response[key]?.trim() || !!row && (row[1] === response[key] || row[2] === response[key])
  }
  const agency = (d.recipientRoutes ?? [d.route]).includes('adh') && !(d.recipientRoutes ?? [d.route]).includes('provider')
  const entries = facts.flatMap((fact, index) => {
    if (fact.kind !== 'historical' || !isReportFactId(fact.id)) return []
    const text = fact.text.trim().replace(/This is historical information, not an assessment of current status\./g, '').replace(/Es información histórica, no una evaluación del estado actual\./g, '').trim()
    const problem = fact.record?.problem ?? ''
    const snapshot = fact.record?.evidence
    if (snapshot) {
      const licensing = /licensing regulations|normas.*licencia/i.test(problem)
      const notice = /public education notice|aviso de educación pública/i.test(problem)
      const reporting = /monitor and\/or report sample results|monitorear.*reportar|monitorear.*informar/i.test(problem)
      const samples = /valid bacteriological samples|muestras bacteriológicas válidas/i.test(problem)
      const label = licensing ? say('Licensing', 'Licencia') : notice ? say('Public education notice', 'Aviso de educación pública') : reporting ? say('Monitoring/reporting', 'Monitoreo e informes') : samples ? say('Bacteriological sampling', 'Muestras bacteriológicas') : problem
      const outcome = snapshot.resolution || (snapshot.action ? say(`Reported action: ${snapshot.action}`, `Acción indicada: ${snapshot.action}`) : fact.record?.status ?? '')
      const question = snapshot.resolution
        ? say('Please confirm the documented correction and whether any requirements remain outstanding.', 'Confirmen la corrección documentada y si quedan requisitos pendientes.')
        : samples ? say('Were valid follow-up samples collected, and can you share the results?', '¿Se recogieron muestras de seguimiento válidas y pueden compartir los resultados?')
          : say('What does this finding mean, and has it been resolved?', '¿Qué significa este hallazgo y se ha resuelto?')
      const conflict = snapshot.conflicts ? say('The records disagree on printed dates or status; please clarify.', 'Los registros discrepan en fechas o estado impresos; aclárenlo, por favor.') : ''
      return [`- ${label} (${snapshot.period}): ${[outcome, conflict, stock('reportAddressed') ? question : ''].filter(Boolean).join(' ')} [${index + 1}]`]
    }
    // Compact only our known snapshot templates. Unknown/legacy prose stays intact.
    const templated = problem && text.includes(problem) && /^(The \d{4} report|El informe de \d{4}|I would like clarification of this finding|Quisiera aclarar el siguiente hallazgo)/.test(text)
    const remainder = templated ? text.slice(text.indexOf(problem) + problem.length)
      .replace(/^”?\./, '')
      .replace(/(?:The reported period (?:begins|ends) |El período indicado (?:comienza|termina) el |Reported period: |Período indicado: )[^.]*\./g, '')
      .replace(/The document prints “Current”; this is not current status\.|El documento imprime “Current”; no es el estado actual\.|“Current” as printed; not current status\.|“Current” al imprimirse; no es el estado actual\./g, '')
      .replace(/(?:The action reported in that document is: |La acción indicada en ese documento es: )“[^”]*”\./g, '')
      .replace(/The document lists no corrective action\.|El documento no enumera una acción correctiva\.|(?:Listed action: |Acción indicada: )[^.]*\./g, '').trim() : text
    if (!templated || remainder) return [`- ${text} [${index + 1}]`]
    const from = text.match(/(?:The reported period begins |El período indicado comienza el )([^.]*)\./)?.[1]
    const through = text.match(/(?:The reported period ends |El período indicado termina el )([^.]*)\./)?.[1]
    const period = text.match(/(?:Reported period: |Período indicado: )([^.]*)\./)?.[1]
      ?? (from ? through ? `${from} – ${through}` : say(`from ${from}`, `desde ${from}`) : '')
    const current = /“Current”/.test(text) ? say('“Current” as printed, not current status', '“Current” al imprimirse, no es el estado actual') : ''
    const dates = [fact.record?.year ?? fact.id.split(':')[0], period, current].filter(Boolean).join('; ')
    const action = text.match(/(?:The action reported in that document is: “|La acción indicada en ese documento es: “)(.*?)”\./)?.[1]
      ?? text.match(/(?:Listed action: |Acción indicada: )(.*?)\.$/)?.[1]
    const noAction = /no corrective action|no enumera una acción correctiva|^None listed$|^Ninguna indicada$/i.test(action ?? text)
    const licensing = /licensing regulations|normas.*licencia/i.test(problem)
    const notice = /public education notice|aviso de educación pública/i.test(problem)
    const reporting = /monitor and\/or report sample results|monitorear.*reportar|monitorear.*informar/i.test(problem)
    const samples = /valid bacteriological samples|muestras bacteriológicas válidas/i.test(problem)
    const resumed = /resum|reanud/i.test(action ?? '') && !/[.!?;]/.test(action ?? '')
    const label = licensing ? say('Licensing', 'Licencia') : notice ? say('Public education notice', 'Aviso de educación pública') : reporting ? say('Monitoring/reporting', 'Monitoreo e informes') : samples ? say('Bacteriological sampling', 'Muestras bacteriológicas') : problem
    const actionText = noAction ? say('No corrective action listed.', 'No se indica acción correctiva.') : action ? reporting && resumed ? say('Reporting resumed.', 'Se reanudó la presentación de informes.') : samples && resumed ? say('Monitoring resumed.', 'Se reanudó el monitoreo.') : say(`Reported action: ${action}.`, `Acción indicada: ${action}.`) : ''
    const question = licensing ? say('Which requirement was unmet, and has it been corrected?', '¿Qué requisito no se cumplió y se ha corregido?')
      : notice ? say('What violation required the notice, and was it provided?', '¿Qué infracción requería el aviso y se proporcionó?')
        : reporting ? say('Which monitoring or reporting requirements were missed, and have they since been completed?', '¿Qué requisitos de monitoreo o presentación de informes no se cumplieron y se han cumplido desde entonces?')
          : samples ? say('Were valid follow-up samples collected, and can you share the results?', '¿Se recogieron muestras de seguimiento válidas y pueden compartir los resultados?')
            : say('What does this finding mean, and has it been resolved?', '¿Qué significa este hallazgo y se ha resuelto?')
    return [`- ${label} (${dates}): ${[actionText, stock('reportAddressed') ? question : ''].filter(Boolean).join(' ')} [${index + 1}]`]
  })
  if (!entries.length) return ''
  const qualification = say('These are historical findings; please confirm their status today.', 'Son hallazgos históricos; confirmen su estado actual.')
  const actionRequest = agency
    ? say('Based on records available to ADH, please identify any outstanding requirements, planned corrective steps and completion dates, and advise how I can obtain supporting records.', 'Según los registros disponibles para ADH, indiquen los requisitos pendientes, las medidas correctivas y las fechas de finalización previstas, y cómo obtener documentos de respaldo.')
    : say('For anything outstanding, please provide the planned corrective steps and completion date, with supporting records for completed work.', 'Para cualquier asunto pendiente, indiquen las medidas correctivas y la fecha de finalización prevista, con documentos de respaldo del trabajo completado.')
  const relationship = hasPersonalConcern(d) && stock('reportRelationship') ? say('Are any findings related to my reported concern, or are they separate issues?', '¿Algún hallazgo se relaciona con mi inquietud reportada o son asuntos separados?') : ''
  const next = stock('reportNext') ? say('Please let me know whether residents need to take action. If a date is not available, when can I expect your next update?', 'Indiquen si los residentes deben tomar alguna medida. Si no hay una fecha disponible, ¿cuándo puedo esperar la próxima actualización?') : ''
  const noticeCopy = Object.values(response).some(text => ['Send me a copy of any notice about it', 'Enviarme una copia de cualquier aviso al respecto'].includes(text)) ? agency ? say('Please advise how I can obtain any required notice.', 'Indiquen cómo puedo obtener cualquier aviso requerido.') : say('Please include a copy of any required notice.', 'Incluyan una copia de cualquier aviso requerido.') : ''
  const custom = reportQuestions.filter(([key]) => !stock(key) && (key !== 'reportRelationship' || hasPersonalConcern(d))).map(([key]) => response[key].trim())
  const federal = facts.some(fact => fact.kind === 'historical' && isReportFactId(fact.id) && fact.record?.evidence?.federal)
  return [federal ? say('The official records list:', 'Los registros oficiales indican:') : say('The water-quality report lists:', 'El informe de calidad del agua indica:'), entries.join('\n'), [qualification, actionRequest, noticeCopy, relationship, next, ...custom].filter(Boolean).join(' ')].join('\n\n')
}
