import { periodMonth, text, type EvidenceCitation, type EvidenceConflict, type EvidenceIssue, type ReviewMethod } from './evidence-model'

/**
 * Conservative grouping of one-record findings into distinct historical issues.
 *
 * The rules below are deliberately reluctant. Showing two records for one
 * incident is a smaller harm than telling a resident that two separate
 * incidents are the same one, or that a different system's record is theirs.
 *
 *  1. Never join findings from different systems, and never join an upstream
 *     supplier's finding to the resident's provider.
 *  2. Two records that each carry the publisher's own reference number join
 *     only when those references match. Two different numbers are two records.
 *  3. A record without a reference number joins one that has it only on a full
 *     agreement of system, requirement and reported period.
 *  4. A record that could equally match more than one group is never merged.
 *     It stays on its own and both sides carry a cross-reference.
 *  5. Merging never resolves a disagreement. Differing printed dates, statuses
 *     and wording are preserved as conflicts on the combined issue.
 *
 * Nothing here infers resolution. Silence, disappearance, resumed monitoring and
 * planned work are not resolution evidence; only an explicit documented
 * resolution carried on a source record survives into `resolution`.
 */

/** Records sharing a family may describe the same requirement in different words. */
const family = (requirementKey: string) => requirementKey.split('.')[0]

const references = (issue: EvidenceIssue) => new Set(issue.citations.flatMap(c => c.recordRef ? [c.recordRef] : []))

/** Months covered by the reported period; an open end covers only its start month. */
function months(issue: EvidenceIssue) {
  const from = periodMonth(issue.period.from), through = periodMonth(issue.period.through)
  if (!from && !through) return []
  if (!from) return [through!]
  if (!through) return [from]
  const span: string[] = []
  let [year, month] = from.split('-').map(Number)
  for (let guard = 0; guard < 240; guard++) {
    const value = `${year}-${String(month).padStart(2, '0')}`
    span.push(value)
    if (value >= through) break
    if (++month > 12) { month = 1; year++ }
  }
  return span
}

/** Full agreement: both ends land in the same month, or both ends are absent together. */
function periodsAgree(a: EvidenceIssue, b: EvidenceIssue) {
  const fromA = periodMonth(a.period.from), fromB = periodMonth(b.period.from)
  const throughA = periodMonth(a.period.through), throughB = periodMonth(b.period.through)
  if (!fromA || !fromB || fromA !== fromB) return false
  if (throughA && throughB) return throughA === throughB
  return !throughA && !throughB
}

const periodsOverlap = (a: EvidenceIssue, b: EvidenceIssue) => {
  const left = months(a), right = new Set(months(b))
  return left.some(month => right.has(month))
}

function sameSystem(a: EvidenceIssue, b: EvidenceIssue) {
  if (a.system.placeId !== b.system.placeId) return false
  // A differing federal ID means the records describe different systems, whatever the name says.
  if (a.system.federalPwsId && b.system.federalPwsId && a.system.federalPwsId !== b.system.federalPwsId) return false
  return a.upstream === b.upstream
}

type Match = 'reference' | 'requirement' | 'none'

function matches(a: EvidenceIssue, b: EvidenceIssue): Match {
  if (!sameSystem(a, b)) return 'none'
  const refsA = references(a), refsB = references(b)
  if (refsA.size && refsB.size) return [...refsA].some(ref => refsB.has(ref)) ? 'reference' : 'none'
  if (a.requirementKey !== b.requirementKey) return 'none'
  return periodsAgree(a, b) ? 'requirement' : 'none'
}

/**
 * Close enough to mention, not close enough to merge: the same requirement
 * family over an overlapping period. Shown so a resident can see that WAVE
 * deliberately kept two accounts apart.
 */
function nearMatch(a: EvidenceIssue, b: EvidenceIssue) {
  if (!sameSystem(a, b) || matches(a, b) !== 'none') return false
  // Two separately numbered published records are definitively separate
  // records. Hinting that they might be one would misread the publisher.
  if (references(a).size && references(b).size) return false
  if (family(a.requirementKey) !== family(b.requirementKey)) return false
  return periodsOverlap(a, b)
}

const METHOD_ORDER: ReviewMethod[] = ['humanReviewed', 'autoRead', 'aiSummarized', 'structuredRecord', 'notReviewed']
const mergeMethods = (a: readonly ReviewMethod[], b: readonly ReviewMethod[]) =>
  METHOD_ORDER.filter(method => a.includes(method) || b.includes(method))

const sameCitation = (a: EvidenceCitation, b: EvidenceCitation) =>
  a.documentId === b.documentId && a.page === b.page && a.recordRef === b.recordRef && a.quote?.en === b.quote?.en

function addConflict(list: EvidenceConflict[], conflict: EvidenceConflict) {
  if (!list.some(existing => existing.kind === conflict.kind && existing.text.en === conflict.text.en)) list.push(conflict)
}

/** Keep every account of the period; never silently pick one source's dates. */
function dateConflicts(a: EvidenceIssue, b: EvidenceIssue, conflicts: EvidenceConflict[]) {
  const printed = (issue: EvidenceIssue) => [issue.period.from ?? '—', issue.period.through ?? (issue.period.currentAsPrinted ? '“Current”' : '—')].join(' – ')
  const left = printed(a), right = printed(b)
  if (left === right) return
  addConflict(conflicts, { kind: 'date', text: text(
    `The supporting records print different periods for this issue: ${left} and ${right}. WAVE keeps both as printed.`,
    `Los registros de respaldo indican períodos distintos para este asunto: ${left} y ${right}. WAVE conserva ambos tal como se imprimieron.`,
  ) })
}

function statusConflicts(a: EvidenceIssue, b: EvidenceIssue, conflicts: EvidenceConflict[]) {
  const current = [a, b].find(issue => issue.period.currentAsPrinted)
  const resolved = [a, b].find(issue => issue.resolution)
  if (current && resolved && current !== resolved) {
    const on = resolved.resolution?.on
    addConflict(conflicts, { kind: 'status', text: text(
      `One record prints this issue as “Current”; another records a documented resolution${on ? ` dated ${on}` : ''}. WAVE keeps both accounts.`,
      `Un registro imprime este asunto como “Current”; otro registra una resolución documentada${on ? ` con fecha ${on}` : ''}. WAVE conserva ambos relatos.`,
    ) })
  }
  const printed = [a.printedStatus?.label.en, b.printedStatus?.label.en].filter(Boolean)
  if (printed.length === 2 && printed[0] !== printed[1]) {
    addConflict(conflicts, { kind: 'status', text: text(
      `The records print different statuses: “${printed[0]}” and “${printed[1]}”.`,
      `Los registros indican estados distintos: “${printed[0]}” y “${printed[1]}”.`,
    ) })
  }
}

function merge(a: EvidenceIssue, b: EvidenceIssue): EvidenceIssue {
  const conflicts = [...a.conflicts]
  for (const conflict of b.conflicts) addConflict(conflicts, conflict)
  dateConflicts(a, b, conflicts)
  statusConflicts(a, b, conflicts)
  const citations = [...a.citations]
  for (const citation of b.citations) if (!citations.some(existing => sameCitation(existing, citation))) citations.push(citation)
  const actions = [...a.actions]
  for (const action of b.actions) if (!actions.some(existing => existing.label.en === action.label.en && existing.on === action.on)) actions.push(action)
  // A human-reviewed account leads; the automated record's wording is kept beside it.
  const lead = a.methods.includes('humanReviewed') || !b.methods.includes('humanReviewed') ? a : b
  const second = lead === a ? b : a
  return {
    ...lead,
    citations, actions, conflicts,
    methods: mergeMethods(a.methods, b.methods),
    // Keep the most explicit period available from either record.
    period: {
      from: lead.period.from ?? second.period.from,
      through: lead.period.through ?? second.period.through,
      ...(lead.period.currentAsPrinted || second.period.currentAsPrinted ? { currentAsPrinted: true } : {}),
    },
    resolution: lead.resolution ?? second.resolution,
    printedStatus: lead.printedStatus ?? second.printedStatus,
    uncertain: [...lead.uncertain, ...second.uncertain.filter(u => !lead.uncertain.some(existing => existing.issueId === u.issueId))],
  }
}

const unmerged = (issueId: string, title: string) => ({
  issueId,
  text: text(
    `A separate record describes a similar requirement over an overlapping period (“${title}”). The records do not agree closely enough to combine, so WAVE did not merge them.`,
    `Otro registro describe un requisito similar en un período que se solapa (“${title}”). Los registros no coinciden lo suficiente para combinarlos, así que WAVE no los fusionó.`,
  ),
})

/**
 * Groups one-record findings into distinct issues. Check ambiguous unnumbered
 * candidates against the complete input before merging, not just earlier rows.
 */
export function groupEvidenceIssues(candidates: readonly EvidenceIssue[]): EvidenceIssue[] {
  const ambiguous = new Set(candidates.filter(candidate => {
    if (references(candidate).size) return false
    const possible = candidates.filter(other => references(other).size && matches(candidate, other) === 'requirement')
    return new Set(possible.flatMap(other => [...references(other)])).size > 1
  }).map(candidate => candidate.id))
  const groups: EvidenceIssue[] = []
  for (const candidate of candidates) {
    const hits = ambiguous.has(candidate.id) ? [] : groups.filter(group => !ambiguous.has(group.id) && matches(group, candidate) !== 'none')
    // Rule 4: an ambiguous match is never resolved by guessing which record it belongs to.
    if (hits.length === 1) {
      groups[groups.indexOf(hits[0])] = merge(hits[0], candidate)
      continue
    }
    groups.push({ ...candidate, citations: [...candidate.citations], actions: [...candidate.actions], conflicts: [...candidate.conflicts], uncertain: [...candidate.uncertain] })
    if (hits.length > 1) {
      for (const hit of hits) {
        const index = groups.indexOf(hit)
        if (index >= 0 && !groups[index].uncertain.some(u => u.issueId === candidate.id)) {
          groups[index] = { ...groups[index], uncertain: [...groups[index].uncertain, unmerged(candidate.id, candidate.title.en)] }
        }
      }
    }
  }
  // Cross-reference the near matches WAVE deliberately kept apart.
  const withUncertain = groups.map(group => {
    const extra = groups.flatMap(other =>
      other !== group && (nearMatch(group, other) || ((ambiguous.has(group.id) || ambiguous.has(other.id)) && matches(group, other) === 'requirement')) && !group.uncertain.some(u => u.issueId === other.id) ? [unmerged(other.id, other.title.en)] : [])
    return extra.length ? { ...group, uncertain: [...group.uncertain, ...extra] } : group
  })
  // Source order is kept, so a finding sits where its document lists it. Views
  // that want newest first sort with `byReportedPeriod`.
  return withUncertain
}

/**
 * The provider badge counts distinct historical issues, never documents. A
 * missing or unretrieved record is not counted and never produces a zero.
 */
export const distinctIssueCount = (issues: readonly EvidenceIssue[]) => issues.length
