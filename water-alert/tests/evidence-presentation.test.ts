import { describe, expect, it } from 'vitest'
import { currentProblem, problemGroups, problemHeading } from '../src/evidence-presentation'
import { text, type EvidenceIssue } from '../src/evidence-model'

const issue = (id: string, overrides: Partial<EvidenceIssue> = {}): EvidenceIssue => ({
  id, system: { placeId: 'test', name: 'Test' }, category: 'treatment', requirementKey: 'dbp1.treatment',
  requirement: text('Stage 1 Disinfectants and Disinfection Byproducts Rule', 'Stage 1 Disinfectants and Disinfection Byproducts Rule'),
  title: text('Full agency wording', 'Texto completo'), period: { from: '04/01/2026' },
  citations: [], actions: [], conflicts: [], upstream: false, uncertain: [], methods: ['structuredRecord'], ...overrides,
})

describe('problem presentation', () => {
  it('filters open periods without treating unknown or resolved records as current', () => {
    expect(currentProblem(issue('open'))).toBe(true)
    expect(currentProblem(issue('single-digit', { period: { from: '4/1/2026' } }))).toBe(true)
    expect(currentProblem(issue('bad-date', { period: { from: '02/31/2026' } }))).toBe(false)
    expect(currentProblem(issue('ended', { period: { from: '04/01/2026', through: '04/30/2026' } }))).toBe(false)
    expect(currentProblem(issue('undated', { period: {} }))).toBe(false)
    expect(currentProblem(issue('unknown-end', { period: { from: '04/01/2026', through: 'Unknown' } }))).toBe(false)
    expect(currentProblem(issue('resolved', { resolution: { label: text('Resolved', 'Resuelto'), citation: {} as never } }))).toBe(false)
    expect(currentProblem(issue('resolved-status', { printedStatus: { label: text('Resolved', 'Resolved'), citation: {} as never } }))).toBe(false)
    expect(currentProblem(issue('ongoing', { period: {}, printedStatus: { label: text('Ongoing', 'Ongoing'), citation: {} as never } }))).toBe(true)
  })

  it('groups distinct incidents by type and orders by full date without merging', () => {
    const groups = problemGroups([issue('early', { period: { from: '04/01/2026' } }), issue('report', { category: 'reporting' }), issue('late', { period: { from: '04/27/2026' } })], 'en')
    expect(groups.find(group => group.key === 'treatment')?.issues.map(value => value.id)).toEqual(['late', 'early'])
    expect(groups.find(group => group.key === 'reporting')?.label).toBe('Reporting issues')
    expect(groups.reduce((count, group) => count + group.issues.length, 0)).toBe(3)
    expect(problemGroups([issue('r', { category: 'reporting' })], 'es')[0].label).toBe('Problemas de informes')
  })

  it('shortens familiar rule headings without altering the agency text', () => {
    const original = issue('one')
    expect(problemHeading(original, 'en')).toBe('Disinfection treatment · Stage 1')
    expect(original.title.en).toBe('Full agency wording')
    expect(problemHeading(issue('unknown', { category: 'other', requirement: text('Specific unfamiliar rule', 'Regla específica') }), 'en')).toBe('Specific unfamiliar rule')
  })
})
