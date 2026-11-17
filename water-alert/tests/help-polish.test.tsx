import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { RequestWorkspace } from '../src/RequestWorkspace'
import { samplePlaces } from '../src/sample'

afterEach(() => { cleanup(); localStorage.clear() })

for (const es of [false, true]) test(`Help refinements preserve guidance and editable drafts (${es ? 'es' : 'en'})`, async () => {
  const { container } = render(<RequestWorkspace place={samplePlaces[0]} sample language={es ? 'es' : 'en'} onBack={() => {}} onHistory={() => {}} />)
  fireEvent.click(await screen.findByRole('button', { name: es ? 'Interrupción del servicio o baja presión' : 'Service interruption or low pressure' }))
  const description = screen.getByLabelText(es ? '¿Algo más? (opcional)' : 'Anything else? (optional)')
  fireEvent.change(description, { target: { value: 'Synthetic observation' } })
  expect(description).toHaveAccessibleDescription(es ? /no adivines la causa/ : /do not guess the cause/)
  expect(description.getAttribute('placeholder') ?? '').not.toMatch(/do not guess|no adivines/)
  const next = () => fireEvent.click(screen.getByRole('button', { name: es ? 'Continuar' : 'Continue' }))
  next()
  expect(screen.getByRole('heading', { level: 1, name: es ? 'Detalles y solicitud' : 'Details and request' })).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: /1.*(What’s wrong|Qué pasa)/ }))
  fireEvent.click(screen.getByRole('checkbox', { name: es ? 'No hay agua' : 'No water' }))
  next()
  expect(screen.getByLabelText(es ? '¿Con qué frecuencia? (opcional)' : 'How often? (optional)')).toBeVisible()
  next()
  expect(screen.getByText(es ? /no se adjuntan automáticamente/ : /not attached automatically/)).toBeVisible()
  fireEvent.click(screen.getByRole('button', { name: es ? 'Revisar mi mensaje' : 'Review my message' }))
  expect(screen.getByLabelText(es ? 'Asunto' : 'Subject')).toBeVisible()
  fireEvent.change(screen.getByLabelText(es ? 'Mensaje' : 'Message'), { target: { value: 'My editable message' } })
  expect(screen.getByLabelText(es ? 'Mensaje' : 'Message')).toHaveValue('My editable message')
  expect(container.querySelector('.request-review-update')).toBeNull()
  expect(screen.queryByText(/Included records|Registros incluidos|Downloads and tools|Descargas y herramientas/)).not.toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Download email|Descargar correo|Download report|Descargar reporte/ })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: es ? 'Fuentes citadas' : 'Cited sources' })).toBeVisible()
})
