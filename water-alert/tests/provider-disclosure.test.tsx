import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ProviderEvidenceSections } from '../src/ProviderEvidence'
import { providerEvidence } from '../src/provider-evidence'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import type { EchoRecordSet } from '../src/echo-records'

afterEach(cleanup)
const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', county: 'Benton', kind: 'system' as const }
// Isolated fixture: one resolved federal notice plus four synthetic treatment incidents.
const echo = {
  pwsid: 'AR0000747', retrievedOn: '2026-11-17', extractOn: '10/07/2026', rejected: 0, truncated: false,
  violations: [
    { id: '8848274', rule: 'Public Notice', contaminant: 'Public Notice', categoryCode: 'Other', category: 'Other Violation', from: '10/01/2025', status: 'Resolved', resolvedOn: '01/13/2026', actions: [{ id: '1248978', on: '01/13/2026', type: 'Resolving', action: 'State Compliance achieved' }] },
    ...[4, 5, 6, 7].map(month => ({ id: `synthetic-treatment-${month}`, rule: 'Stage 1 Disinfectants and Disinfection Byproducts Rule', categoryCode: 'TT', category: 'Treatment Technique Violation', from: `0${month}/01/2026`, actions: [] })),
  ],
  surveys: [], notices: [], formalActions: [],
} as unknown as EchoRecordSet

test('small types show inline only after a filter is opened, with Ask attached to the heading', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false })} language="en" onAsk={() => {}} />)
  expect(screen.queryByRole('button', { name: 'Ask about this' })).toBeNull()
  const current = screen.getByRole('button', { name: /Current Problems/ })
  fireEvent.click(current)
  expect(document.querySelectorAll('details.evidence-type-group')).toHaveLength(0)
  const issue = document.querySelector('.evidence-inline-issue') as HTMLElement
  const header = issue.querySelector('.report-issue-header') as HTMLElement
  expect(within(header).getByRole('button', { name: 'Ask about this' })).toBeVisible()
  expect(header.querySelector('.report-issue-leader')).not.toBeNull()
  fireEvent.click(current)
  expect(screen.queryByRole('button', { name: 'Ask about this' })).toBeNull()
})

test('both filters carry the same up/down chevron and no plus/minus icon', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false })} language="en" onAsk={() => {}} />)
  for (const name of [/Current Problems/, /All recorded problems/]) {
    const button = screen.getByRole('button', { name })
    expect(button.querySelector('svg.evidence-chevron')).not.toBeNull()
    expect(button.querySelector('.disclosure-icon')).toBeNull()
  }
})

test('six or more problems put every type behind its own collapsible group', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false, echo })} language="en" onAsk={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /All recorded problems/ }))
  expect(document.querySelectorAll('.evidence-inline-issue').length).toBeGreaterThanOrEqual(6)
  expect(document.querySelectorAll('.evidence-type-inline')).toHaveLength(0)
  expect(document.querySelectorAll('details.evidence-type-group').length).toBe(document.querySelectorAll('.evidence-type-group').length)
})

test('Show more sits alone at the end of its group as a filled button', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false, echo })} language="en" onAsk={() => {}} />)
  fireEvent.click(screen.getByRole('button', { name: /All recorded problems/ }))
  const group = [...document.querySelectorAll('details.evidence-type-group')].find(node => node.querySelector('summary')?.textContent?.includes('Treatment issues')) as HTMLDetailsElement
  fireEvent.click(group.querySelector('summary')!)
  const more = within(group).getByRole('button', { name: 'Show 1 more' })
  expect(more).toHaveClass('primary')
  expect(more.closest('.evidence-inline-issue')).toBeNull()
  const row = more.parentElement as HTMLElement
  expect(row).toHaveClass('evidence-more-row')
  expect(row.parentElement!.lastElementChild).toBe(row)
  fireEvent.click(more)
  expect(within(group).getByRole('button', { name: 'Show less' })).toHaveAttribute('aria-expanded', 'true')
  expect(group.querySelectorAll('.evidence-inline-issue:not([hidden] *)')).toHaveLength(4)
})

test('Source details and per-problem notes are not shown on the card', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false, echo })} language="en" onAsk={() => {}} />)
  expect(screen.queryByRole('button', { name: 'Source details' })).toBeNull()
  expect(document.querySelector('.evidence-source-content')).toBeNull()
  const all = screen.getByRole('button', { name: /All recorded problems/ })
  const panel = document.getElementById(all.getAttribute('aria-controls')!) as HTMLElement
  fireEvent.click(all)
  // The open list ends with the problems; source quotes, conflicts and record limits stay internal for emails.
  expect(panel.lastElementChild).toHaveClass('evidence-type-groups')
  expect(screen.queryByText(/Notes about (individual problems|these records)/)).toBeNull()
  expect(screen.queryByText('What these records do not show')).toBeNull()
  fireEvent.click(all)
  expect(panel).toHaveAttribute('inert')
  // General method and coverage text moved to Settings → Sources.
  expect(screen.queryByText(/A short list here is not evidence/)).toBeNull()
})

test('compact source rows keep each source’s method and freshness', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false, echo })} language="en" />)
  const rows = document.querySelector('.evidence-source-headers') as HTMLElement
  expect(within(rows).getByText(/Reviewed by a person|Read from the document’s tables|AI summary/)).toBeInTheDocument()
  expect(within(rows).getByText(/Data dated Oct 7, 2026/)).toBeInTheDocument()
})

test('a failed refresh keeps the saved records’ method and data date beside the failure', () => {
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false, echo })} language="en" onCheckRecords={() => {}} recordsStatus="incomplete" reportCheck={{ run: () => {}, busy: false, failed: true }} />)
  const rows = document.querySelector('.evidence-source-headers') as HTMLElement
  expect(within(rows).getByText(/^Update failed · Data dated Oct 7, 2026$/)).toBeInTheDocument()
  expect(within(rows).getByText(/^Update failed · (Reviewed by a person|Read from the document’s tables|AI summary)/)).toBeInTheDocument()
})

test.each([[], undefined])('zero findings omit all problem controls, empty-state copy and source details (%s)', reports => {
  const evidence = providerEvidence({ place, sample: false, reports: reports ?? [{ year: 2025, state: 'reviewed', reviewedOn: '2026-11-17', url: 'https://health.arkansas.gov/report', issues: [] }] })
  render(<ProviderEvidenceSections evidence={evidence} language="en" />)
  expect(screen.queryByRole('group', { name: 'Recorded problems' })).toBeNull()
  expect(screen.queryByText(/No read records|No matching open|No problems identified/)).toBeNull()
  expect(screen.queryByText('Notes about individual problems')).toBeNull()
  expect(screen.queryByRole('button', { name: 'Source details' })).toBeNull()
})
