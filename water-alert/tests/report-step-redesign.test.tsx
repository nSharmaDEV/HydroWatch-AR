import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { helpPath, helpStep, initialFacts, stepLabel } from '../src/help-flow'
import { blankRequest, generateMessage } from '../src/help-requests'
import { LEISURE_HILLS_ID } from '../src/annual-reports'
import { ReviewEmail } from '../src/ReviewEmail'
import { ReportGuidedQuestions } from '../src/ReportGuidedQuestions'

const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS', county: 'Benton', kind: 'system' as const }
const draft = () => ({ ...blankRequest(place), issue: 'service' as const, description: 'Low pressure', facts: initialFacts(place, [], false, false, 'en') })
afterEach(cleanup)
test('legacy report question progress returns to requests in the six-screen flow', () => {
  const d = draft()
  expect(helpPath(d)).toEqual(['choose', 'noticed', 'details', 'request', 'response', 'anything', 'send'])
  expect(stepLabel({ ...d, flowStep: 'reportQuestions' }, 'en')).toContain('4 of 6')
  expect(helpStep({ ...d, flowStep: 'reportQuestions' })).toBe('request')
  expect(helpPath({ ...d, facts: [] })).not.toContain('reportQuestions')
  expect(helpStep({ ...d, facts: [], flowStep: 'reportQuestions' })).toBe('request')
})
test('report questions reuse native icon tiles, retain optional choices and hide unrelated relationship', () => {
  const edit = vi.fn()
  render(<ReportGuidedQuestions draft={{ ...draft(), description: '' }} language="en" edit={edit} />)
  expect(screen.queryByRole('checkbox', { name: /relate to my concern/ })).not.toBeInTheDocument()
  const checkbox = screen.getByRole('checkbox', { name: /Verify this reading/ })
  expect(checkbox.closest('.request-wording-choice')?.querySelector('.wording-icon')).not.toBeNull()
  expect(checkbox.closest('.request-wording-grid')).not.toBeNull()
  fireEvent.click(checkbox)
  expect(edit.mock.calls[0][0].wording.response.reportVerify).toBeTruthy()
})
test('review opens answers as a separate view without replacing manually edited email', () => {
  render(<ReviewEmail draft={{ ...draft(), body: 'My edited email' }} language="en" extras={null} edit={vi.fn()} changeFacts={vi.fn()} go={vi.fn()} regenerate={vi.fn()} />)
  expect(screen.queryByRole('region', { name: 'Summary of form answers' })).not.toBeInTheDocument()
  expect(screen.getByLabelText('Message')).toHaveValue('My edited email')
  fireEvent.click(screen.getByRole('button', { name: 'Review answers' }))
  expect(screen.getByRole('region', { name: 'Summary of form answers' })).toHaveTextContent('Low pressure')
  expect(screen.queryByLabelText('Message')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Back to email' }))
  expect(screen.getByLabelText('Message')).toHaveValue('My edited email')
})
test.each(['en', 'es'] as const)('email follows each finding with concise clarification, then one historical qualification (%s)', language => {
  const d = { ...draft(), facts: initialFacts(place, [], false, false, language) }, es = language === 'es'
  const body = generateMessage({ ...d, wording: { report: {}, response: { first: es ? 'Restablecer el servicio' : 'Restore service', reportAddressed: es ? 'Explicar si se ha atendido el hallazgo' : 'Explain whether the finding has been addressed', reportVerify: es ? 'Verificar esta lectura del informe y compartir los documentos de respaldo' : 'Verify this reading of the report and share supporting records' } } }, language).body
  const first = body.indexOf(es ? '- Licencia' : '- Licensing'), second = body.indexOf(es ? '- Aviso de educación' : '- Public education')
  expect(first).toBeGreaterThan(body.indexOf(es ? 'servicio constante' : 'consistent service'))
  expect(body.slice(first, second)).toMatch(es ? /¿[^?]+\?/ : /Which requirement[^?]+\?/)
  expect(body).not.toContain('For historical context (not current status),')
  expect(body.match(es ? /Son hallazgos históricos/g : /These are historical findings/g)).toHaveLength(1)
  expect(body).not.toContain('Explain whether the finding has been addressed\n')
  const optedOut = generateMessage({ ...d, wording: { report: {}, response: {} } }, language).body
  expect(optedOut).toContain(es ? 'documentos de respaldo' : 'supporting records')
  expect(optedOut).toContain(es ? 'fecha de finalización' : 'completion date')
})
