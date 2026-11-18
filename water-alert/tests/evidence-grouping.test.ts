import { expect, test } from 'vitest'
import { groupEvidenceIssues } from '../src/evidence-grouping'
import { byReportedPeriod, text, type EvidenceCitation, type EvidenceIssue, type SystemIdentity } from '../src/evidence-model'

const system: SystemIdentity = { placeId: 'ADH:abc', name: 'TEST WATERWORKS', adhPws: '747', federalPwsId: 'AR0000747' }
const other: SystemIdentity = { placeId: 'ADH:zzz', name: 'OTHER WATERWORKS', federalPwsId: 'AR0000999' }

function citation(documentId: string, extra: Partial<EvidenceCitation> = {}): EvidenceCitation {
  return { documentId, url: `https://example.test/${documentId}`, quoteVerified: false, method: 'structuredRecord', ...extra }
}

function issue(id: string, patch: Partial<EvidenceIssue> = {}): EvidenceIssue {
  return {
    id, system, category: 'monitoring', requirementKey: 'rtcr.monitoring',
    requirement: text('Revised Total Coliform Rule — monitoring', 'Regla revisada de coliformes totales — monitoreo'),
    title: text('Monitoring violation', 'Infracción de monitoreo'),
    period: { from: '10/01/2025', through: '10/31/2025' },
    citations: [citation('doc-a')], actions: [], conflicts: [], upstream: false, uncertain: [],
    methods: ['structuredRecord'], ...patch,
  }
}

test('records that carry the same reference number are one issue', () => {
  const grouped = groupEvidenceIssues([
    issue('epa:8848272', { citations: [citation('epa-v-8848272', { recordRef: '8848272' })] }),
    issue('adh:2025:1', { citations: [citation('adh-2025', { recordRef: '8848272', page: 2 })], methods: ['humanReviewed'] }),
  ])
  expect(grouped).toHaveLength(1)
  expect(grouped[0].citations.map(c => c.documentId)).toEqual(['epa-v-8848272', 'adh-2025'])
  expect(grouped[0].methods).toEqual(['humanReviewed', 'structuredRecord'])
})

test('two differently numbered records are never merged, even with the same requirement and period', () => {
  const grouped = groupEvidenceIssues([
    issue('epa:1', { citations: [citation('epa-v-1', { recordRef: '8848272' })] }),
    issue('epa:2', { citations: [citation('epa-v-2', { recordRef: '8848999' })] }),
  ])
  expect(grouped).toHaveLength(2)
})

test('an unnumbered document joins a numbered record on system, requirement and period', () => {
  const grouped = groupEvidenceIssues([
    issue('epa:8848272', { citations: [citation('epa-v-8848272', { recordRef: '8848272' })] }),
    issue('adh:2025:1', { period: { from: '10/01/2025', through: '10/31/2025' }, citations: [citation('adh-2025', { page: 2 })], methods: ['humanReviewed'] }),
  ])
  expect(grouped).toHaveLength(1)
  expect(grouped[0].citations).toHaveLength(2)
})

test('the same contaminant in different months stays as separate incidents', () => {
  const grouped = groupEvidenceIssues([
    issue('a', { period: { from: '10/01/2025', through: '10/31/2025' } }),
    issue('b', { period: { from: '07/01/2025', through: '07/31/2025' } }),
  ])
  expect(grouped).toHaveLength(2)
})

test('the same monitoring category under a different requirement is not merged', () => {
  const grouped = groupEvidenceIssues([
    issue('a', { requirementKey: 'rtcr.monitoring' }),
    issue('b', { requirementKey: 'rtcr.reporting', category: 'reporting' }),
  ])
  expect(grouped).toHaveLength(2)
})

test('a record that could match two others is preserved separately and cross-referenced', () => {
  const grouped = groupEvidenceIssues([
    issue('epa:monitoring', { requirementKey: 'rtcr.monitoring', citations: [citation('epa-a', { recordRef: '1' })], period: { from: '07/01/2025', through: '07/31/2025' } }),
    issue('epa:reporting', { requirementKey: 'rtcr.reporting', category: 'reporting', citations: [citation('epa-b', { recordRef: '2' })], period: { from: '07/01/2025' } }),
    issue('adh:ambiguous', {
      requirementKey: 'rtcr.monitorOrReport', category: 'monitoringOrReporting', methods: ['humanReviewed'],
      period: { from: '07/11/2025', through: '07/31/2025' }, citations: [citation('adh-2025', { page: 2 })],
    }),
  ])
  expect(grouped).toHaveLength(3)
  const ambiguous = grouped.find(i => i.id === 'adh:ambiguous')!
  expect(ambiguous.uncertain.map(u => u.issueId).sort()).toEqual(['epa:monitoring', 'epa:reporting'])
  expect(ambiguous.uncertain[0].text.en).toMatch(/not merged|did not merge/i)
  // The cross-reference is recorded on both sides, so neither view hides it.
  expect(grouped.find(i => i.id === 'epa:monitoring')!.uncertain.map(u => u.issueId)).toEqual(['adh:ambiguous'])
})

test('ambiguous unnumbered evidence never joins the first of two numbered candidates in any order', () => {
  const unnumbered = issue('annual')
  const first = issue('one', { citations: [citation('one', { recordRef: '1' })] })
  const second = issue('two', { citations: [citation('two', { recordRef: '2' })] })
  for (const order of [[unnumbered, first, second], [first, unnumbered, second], [first, second, unnumbered], [second, first, unnumbered]]) {
    const groups = groupEvidenceIssues(order)
    expect(groups).toHaveLength(3)
    expect(groups.find(group => group.id === 'annual')?.uncertain.map(row => row.issueId).sort()).toEqual(['one', 'two'])
    expect(groups.find(group => group.id === 'one')?.uncertain.map(row => row.issueId)).toEqual(['annual'])
  }
})

test('findings from two different systems are never combined', () => {
  const grouped = groupEvidenceIssues([issue('a'), issue('b', { system: other })])
  expect(grouped).toHaveLength(2)
})

test('an upstream supplier finding stays separate from the resident’s provider', () => {
  const grouped = groupEvidenceIssues([issue('a'), issue('b', { upstream: true })])
  expect(grouped).toHaveLength(2)
  expect(grouped.filter(i => i.upstream)).toHaveLength(1)
})

test('merging preserves differing printed dates rather than choosing one', () => {
  const grouped = groupEvidenceIssues([
    issue('epa', { period: { from: '07/01/2025', through: '07/31/2025' }, citations: [citation('epa-v', { recordRef: 'X' })] }),
    issue('adh', { period: { from: '07/11/2025', through: '07/31/2025' }, citations: [citation('adh-2025', { recordRef: 'X', page: 2 })], methods: ['humanReviewed'] }),
  ])
  expect(grouped).toHaveLength(1)
  const conflict = grouped[0].conflicts.find(c => c.kind === 'date')!
  expect(conflict.text.en).toContain('07/01/2025')
  expect(conflict.text.en).toContain('07/11/2025')
  expect(conflict.text.es).toContain('07/11/2025')
})

test('a printed “Current” status alongside documented resolution is kept as a conflict', () => {
  const resolution = { on: '01/13/2026', label: text('State Compliance achieved', 'Cumplimiento estatal alcanzado'), citation: citation('epa-v', { recordRef: 'P' }) }
  const grouped = groupEvidenceIssues([
    issue('epa', { requirementKey: 'publicNotice', category: 'publicNotice', period: { from: '10/01/2025' }, citations: [citation('epa-v', { recordRef: 'P' })], resolution }),
    issue('adh', { requirementKey: 'publicNotice', category: 'publicNotice', period: { from: '10/01/2025', currentAsPrinted: true }, citations: [citation('adh-2025', { page: 2 })], methods: ['humanReviewed'] }),
  ])
  expect(grouped).toHaveLength(1)
  expect(grouped[0].resolution?.on).toBe('01/13/2026')
  expect(grouped[0].conflicts.some(c => c.kind === 'status' && /Current/.test(c.text.en))).toBe(true)
})

test('resumed monitoring alone is never promoted to resolution evidence', () => {
  const grouped = groupEvidenceIssues([
    issue('adh', {
      methods: ['humanReviewed'], citations: [citation('adh-2025', { page: 2 })],
      actions: [{ label: text('Resumed bacteriological monitoring', 'Se reanudó el monitoreo bacteriológico'), citation: citation('adh-2025', { page: 2 }), interpreted: false }],
    }),
  ])
  expect(grouped[0].resolution).toBeUndefined()
})

test('human review is listed first and an automated method is never dropped', () => {
  const grouped = groupEvidenceIssues([
    issue('auto', { methods: ['autoRead'], citations: [citation('adh-auto', { recordRef: 'R' })] }),
    issue('human', { methods: ['humanReviewed'], citations: [citation('adh-human', { recordRef: 'R' })] }),
  ])
  expect(grouped[0].methods).toEqual(['humanReviewed', 'autoRead'])
})

test('grouping is stable and keeps each finding where its document lists it', () => {
  const input = [issue('b', { period: { from: '07/01/2025', through: '07/31/2025' } }), issue('a')]
  expect(groupEvidenceIssues(input).map(i => i.id)).toEqual(groupEvidenceIssues(input).map(i => i.id))
  // Source order, so a letter cites findings in the order the record prints them.
  expect(groupEvidenceIssues(input).map(i => i.id)).toEqual(['b', 'a'])
  // Views that want newest first sort explicitly.
  expect([...groupEvidenceIssues(input)].sort(byReportedPeriod).map(i => i.id)).toEqual(['a', 'b'])
})
