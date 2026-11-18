import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ReportGuidedQuestions } from '../src/ReportGuidedQuestions'
import { initialFacts } from '../src/help-flow'
import { blankRequest } from '../src/help-requests'
import { confirmedSections } from '../src/help-outputs'
import { LEISURE_HILLS_ID } from '../src/annual-reports'

afterEach(cleanup)
const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS', county: 'Benton', kind: 'system' as const }
const facts = initialFacts(place, [], false, false, 'en')
test('report questions are optional and relationship is offered only with a personal concern', () => {
  const edit = vi.fn(), draft = { ...blankRequest(place), issue: 'report' as const, facts }
  const view = render(<ReportGuidedQuestions draft={draft} language="en" edit={edit} />)
  expect(screen.getByLabelText(/Explain whether the finding has been addressed/)).not.toBeChecked()
  expect(screen.queryByLabelText(/Explain whether it could relate to my concern/)).toBeNull()
  fireEvent.click(screen.getByLabelText(/Explain whether the finding has been addressed/))
  expect(edit.mock.calls[0][0].wording.response.reportAddressed).toBe('Explain whether the finding has been addressed')
  view.rerender(<ReportGuidedQuestions draft={{ ...draft, issue: 'service', description: 'Low pressure' }} language="en" edit={edit} />)
  expect(screen.getByLabelText(/Explain whether it could relate to my concern/)).toBeVisible()
})
test('a saved relationship question is omitted when there is no personal concern', () => {
  const draft = { ...blankRequest(place), issue: 'report' as const, facts, wording: { report: {}, response: { reportRelationship: 'Explain whether it could relate to my concern' } } }
  expect(confirmedSections(draft, 'en').requests).not.toContain('relate to my concern')
})
