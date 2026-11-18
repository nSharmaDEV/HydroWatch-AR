import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { ProviderEvidenceSections } from '../src/ProviderEvidence'
import { providerEvidence } from '../src/provider-evidence'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { echoReportUrl } from '../src/echo-records'

afterEach(cleanup)
const place = { id: LEISURE_HILLS_ID, name: 'Leisure Hills', kind: 'system' as const, county: 'Benton' }
test('EPA links use the verified public facility page, not the data-service host', () => {
  expect(echoReportUrl('AR0000747')).toBe('https://echo.epa.gov/detailed-facility-report?fid=AR0000747&sys=SDWIS')
})
test.each(['en', 'es'] as const)('clear %s filters use collapsed type groups and qualified open records', language => {
  const es = language === 'es'
  render(<ProviderEvidenceSections evidence={providerEvidence({ place, sample: false })} language={language} onAsk={() => {}} />)
  const present = screen.getByRole('button', { name: es ? /Problemas actuales/ : /Current Problems/ })
  fireEvent.click(present)
  expect(screen.queryByText('Current status unavailable')).toBeNull()
  expect(document.querySelectorAll('.evidence-type-group[open]')).toHaveLength(0)
  expect(present).toHaveTextContent('1')
   expect(document.querySelector('details.evidence-type-group')).toBeNull()
   expect(screen.queryByText(/No end or resolution recorded|Sin fecha de fin ni resolución registrada/)).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: es ? 'Todos los problemas registrados · 4' : 'All recorded problems · 4' }))
  const group = document.querySelector('.evidence-type-group') as HTMLDetailsElement
   expect(group).toHaveClass('evidence-type-inline')
  const issue = document.querySelector('.evidence-inline-issue') as HTMLElement
   expect(issue.querySelector('.report-issue-leader')).not.toBeNull()
  expect(issue.querySelectorAll('dt svg')).toHaveLength(4)
  expect(within(issue).getByRole('button', { name: es ? 'Preguntar sobre esto' : 'Ask about this' })).toHaveClass('secondary', 'report-ask')
  expect(within(issue).queryByText(/Resolution not confirmed|Resolución no confirmada/)).toBeNull()
  expect(within(issue).queryByText(/Source wording and details|Texto y detalles/)).toBeNull()
  expect(document.querySelectorAll('.evidence-source-row .profile-leader')).toHaveLength(2)
  expect(screen.queryByRole('button', { name: es ? 'Detalles de las fuentes' : 'Source details' })).toBeNull()
  expect(document.querySelector('.evidence-record-list')).toBeNull()
  expect(screen.queryByText(es ? 'Notas sobre cada problema' : 'Notes about individual problems')).toBeNull()
  expect(within(document.querySelector('.evidence-source-headers') as HTMLElement).getByText(es ? /Revisado por una persona/ : /Reviewed by a person/)).toBeVisible()
})
