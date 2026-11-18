import { describe, expect, test } from 'vitest'
import { blankRequest, generateMessage } from '../src/help-requests'
import { LOW_PRESSURE_REQUEST } from '../src/help-outputs'
import type { Place } from '../src/domain'
import { defaultRequests } from '../src/ConfirmedWording'
import { ConfirmedWording } from '../src/ConfirmedWording'
import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { createElement } from 'react'

afterEach(cleanup)

const place: Place = { id: 'synthetic:natural', name: 'Fictional Water', county: 'Example', kind: 'system' }

describe.each(['en', 'es'] as const)('natural email (%s)', language => {
  const es = language === 'es'
  test('combines selected service requests and includes supplied details without an account in the subject', () => {
    const d = { ...blankRequest(place), locations: ['123 Example Street'], residentName: 'Jordan Example', answers: { began: '2026-11-03', ongoing: 'Yes', account: 'PRIVATE-123' }, wording: { report: { second: es ? 'Menos presión de lo habitual' : 'Lower pressure than usual', third: es ? 'El servicio se interrumpe repetidamente' : 'Service keeps stopping' }, response: { first: es ? 'Restablecer el servicio' : 'Restore service', second: es ? 'Compartir una actualización' : 'Share an update', fourth: LOW_PRESSURE_REQUEST[es ? 1 : 0] } } }
    const { subject, body } = generateMessage(d, language)
    expect(subject).not.toContain('PRIVATE-123')
    for (const detail of ['123 Example Street', 'PRIVATE-123', '2026', 'Jordan Example']) expect(body).toContain(detail)
    expect(body).not.toContain('1. ')
    expect(body).toContain(es ? 'baja presión' : 'low pressure')
    expect(body).toContain(es ? 'restablecer' : 'restor')
    expect(body).toContain(es ? 'actualización' : 'update')
  })
  test('renders one selected request as a sentence and preserves custom wording', () => {
    const d = { ...blankRequest(place), issue: 'other' as const, description: 'A fictional concern', wording: { report: {}, response: { first: es ? 'Explicar el próximo paso' : 'Explain the next step' } } }
    expect(generateMessage(d, language).body).not.toContain('1. ')
    const custom = 'Please reply only by post.'
    expect(generateMessage({ ...d, wording: { report: {}, response: { details: custom } } }, language).body).toContain(custom)
  })
  test('does not ask an agency to correct a bill', () => {
    const d = { ...blankRequest(place), issue: 'billing' as const, route: 'ag' as const, wording: { report: {}, response: { first: es ? 'Revisar el cargo' : 'Review the charge', second: es ? 'Explicar la factura' : 'Explain the bill' } } }
    const body = generateMessage(d, language).body
    expect(body.toLowerCase()).toContain(es ? 'orient' : 'advis')
    expect(body).not.toContain(es ? 'corregirlo si es incorrecto' : 'correct it if it is incorrect')
  })
  test('complete service email uses supplied prior contact naturally', () => {
    const report = { second: es ? 'Menos presión de lo habitual' : 'Lower pressure than usual', third: es ? 'El servicio se interrumpe repetidamente' : 'Service keeps stopping' }
    const d = { ...blankRequest(place), locations: ['123 Example Street'], residentName: 'Jordan Example', answers: { began: '2026-11-03', ongoing: 'Yes', contacted: 'Yes', contactDate: '2026-11-05', contactMethod: es ? 'teléfono' : 'phone', contactResponse: es ? 'Dijeron que lo revisarían' : 'They said someone would look into it' }, wording: { report, response: defaultRequests('service', language, Object.values(report)) } }
    const body = generateMessage(d, language).body
    expect(body).toContain(es ? 'Me comuniqué con el proveedor por teléfono aproximadamente el' : 'I contacted the provider by phone around')
    expect(body).toContain(d.answers.contactResponse)
    expect(body).not.toContain(es ? 'Mi relato de la respuesta es:' : 'My account of the response is:')
    expect(body).toContain('Jordan Example')
    expect(body.split('\n\n')[1]).toContain(es ? '123 Example Street. Experimenté interrupciones' : '123 Example Street. I experienced interruptions')
    expect(body).toContain(es ? 'Lo noté el 3 de noviembre de 2026. El problema continúa.' : 'I first noticed this on November 3, 2026. The issue is ongoing.')
    const request = es ? '¿Podrían investigar el problema de servicio y la baja presión reportados' : 'Could you investigate the reported service problem and low pressure'
    expect(body.indexOf(request)).toBeGreaterThan(0)
    expect(body.indexOf(request)).toBeLessThan(body.indexOf(d.answers.contactResponse))
    expect(body).toContain(es ? 'avisarme cuándo puedo esperar una actualización?' : 'let me know when I can expect an update?')
    expect(body).toMatch(es ? /Gracias,\nJordan Example$/ : /Thank you,\nJordan Example$/)
  })
  test('ADH service request asks for guidance instead of direct restoration', () => {
    const d = { ...blankRequest(place), route: 'adh' as const, wording: { report: { second: es ? 'Menos presión de lo habitual' : 'Lower pressure than usual', third: es ? 'El servicio se interrumpe repetidamente' : 'Service keeps stopping' }, response: defaultRequests('service', language, [es ? 'Menos presión de lo habitual' : 'Lower pressure than usual', es ? 'El servicio se interrumpe repetidamente' : 'Service keeps stopping']) } }
    const body = generateMessage(d, language).body
    expect(body.toLowerCase()).toContain(es ? 'orient' : 'advis')
    expect(body).not.toContain(es ? '¿Podrían revisar qué causa' : 'Could you check what’s causing')
  })
  test('advisory coverage is asked only if selected', () => {
    const d = { ...blankRequest(place), issue: 'advisory' as const, wording: { report: { second: es ? 'No sé si el aviso incluye mi ubicación' : 'I am unsure whether the advisory covers my location' }, response: defaultRequests('advisory', language) } }
    render(createElement(ConfirmedWording, { draft: d, section: 'response', es, edit: vi.fn() }))
    expect(screen.getByRole('note').textContent).toContain(es ? 'puedes seleccionar' : 'you can select')
    expect((screen.getByRole('checkbox', { name: es ? 'Explicar dónde se aplica el aviso' : 'Explain where the advisory applies' }) as HTMLInputElement).checked).toBe(false)
    expect(generateMessage(d, language).body).not.toContain(es ? 'explicar dónde se aplica el aviso' : 'explain where the advisory applies')
    d.wording.response.third = es ? 'Explicar dónde se aplica el aviso' : 'Explain where the advisory applies'
    expect(generateMessage(d, language).body.toLowerCase()).toContain(es ? 'dónde se aplica el aviso' : 'where the advisory applies')
  })
})
