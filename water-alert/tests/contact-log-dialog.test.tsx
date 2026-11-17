import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { addBusinessDays, FOLLOW_UP_BUSINESS_DAYS, localDate } from '../src/help-outcomes'
import { blankRequest, type HelpDraft } from '../src/help-requests'
import { SendOptions } from '../src/SendOptions'
import { PLACE_CATALOG } from '../src/place-catalog'

const fayetteville = PLACE_CATALOG.find(entry => entry.place.name === 'FAYETTEVILLE WATERWORKS')!.place
const base = (patch: Partial<HelpDraft> = {}): HelpDraft => ({ ...blankRequest(fayetteville), issue: 'service', description: 'Low pressure', subject: 'Low water pressure', body: 'Hello team,\n\nPressure is low.', ...patch })
const T = {
  en: { log: 'Log a contact attempt', date: 'Contact date', how: 'How did you try?', ref: 'Reference or ticket number', follow: 'When should you follow up?', told: 'What did they tell you? (optional)', refHint: 'e.g., case #12345', toldHint: 'e.g., They said a crew would investigate tomorrow.', unreachable: 'Couldn’t reach them', cancel: 'Cancel', save: 'Save', close: 'Close', note: /WAVE only records what you tell it; it cannot see your email, calls, or form submissions\./ },
  es: { log: 'Registrar un intento de contacto', date: 'Fecha de contacto', how: '¿Cómo lo intentaste?', ref: 'Número de referencia o caso', follow: '¿Cuándo debes dar seguimiento?', told: '¿Qué te dijeron? (opcional)', refHint: 'p. ej., caso n.º 12345', toldHint: 'p. ej., Dijeron que un equipo investigaría mañana.', unreachable: 'No pude comunicarme', cancel: 'Cancelar', save: 'Guardar', close: 'Cerrar', note: /WAVE solo guarda lo que le indicas; no puede ver tus correos, llamadas ni envíos de formularios\./ },
}
function setup(language: 'en' | 'es' = 'en') {
  const record = vi.fn(), onHistory = vi.fn()
  render(<SendOptions draft={base()} language={language} sample={false} blocked={false} copy={async () => true} record={record} onHistory={onHistory} compact />)
  return { record, onHistory, user: userEvent.setup(), t: T[language] }
}

describe('Log a contact attempt dialog', () => {
  it.each(['en', 'es'] as const)('opens a labelled modal with paired fields, examples and no reminder claim (%s)', async language => {
    const { user, t } = setup(language)
    const opener = screen.getByRole('button', { name: t.log })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: t.log })
    expect(dialog.tagName).toBe('DIALOG')
    expect(dialog).toHaveAttribute('open')
    const d = within(dialog)
    expect(d.getByText('Fayetteville Waterworks', { exact: false })).toBeVisible()
    expect(d.getByText(t.note)).toBeVisible()
    expect(d.getByLabelText(t.date)).toHaveValue(localDate())
    expect(d.getByLabelText(t.date)).toHaveAttribute('max', localDate())
    expect(d.getByLabelText(t.how)).toHaveValue('emailed')
    expect(d.getByLabelText(t.ref)).toHaveAttribute('placeholder', t.refHint)
    expect(d.getByLabelText(t.follow)).toHaveValue(addBusinessDays(localDate(), FOLLOW_UP_BUSINESS_DAYS))
    expect(d.getByLabelText(t.told)).toHaveAttribute('placeholder', t.toldHint)
    expect(dialog).not.toHaveTextContent(/Suggested|Sugerido|notification|notificaci/)
    for (const name of [t.unreachable, t.cancel, t.save]) expect(d.getByRole('button', { name }).querySelector('svg')).not.toBeNull()
    expect(d.getByRole('button', { name: t.close })).toBeVisible()
    expect(dialog).toContainElement(document.activeElement as HTMLElement)
    // The right column is unchanged: no inline form and the handoff card stays.
    expect(document.querySelector('.send-confirm')).toBeNull()
    expect(screen.getByRole('article', { name: /FAYETTEVILLE WATERWORKS/i })).toBeInTheDocument()
  })

  it.each(['cancel', 'close', 'escape'] as const)('records nothing and returns focus on %s', async how => {
    const { user, record, onHistory, t } = setup()
    const opener = screen.getByRole('button', { name: t.log })
    await user.click(opener)
    const dialog = screen.getByRole('dialog', { name: t.log })
    await user.type(within(dialog).getByLabelText(t.ref), 'ABC')
    if (how === 'escape') await user.keyboard('{Escape}')
    else await user.click(within(dialog).getByRole('button', { name: how === 'cancel' ? t.cancel : t.close }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(record).not.toHaveBeenCalled()
    expect(onHistory).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: t.log })).toHaveFocus()
  })

  it.each(['en', 'es'] as const)('saves through recordOutcome and opens History (%s)', async language => {
    const { user, record, onHistory, t } = setup(language)
    await user.click(screen.getByRole('button', { name: t.log }))
    const d = within(screen.getByRole('dialog', { name: t.log }))
    await user.selectOptions(d.getByLabelText(t.how), 'called')
    await user.type(d.getByLabelText(t.ref), 'REF-9')
    await user.type(d.getByLabelText(t.told), 'Crew tomorrow')
    await user.click(d.getByRole('button', { name: t.save }))
    expect(record).toHaveBeenCalledTimes(1)
    expect(record.mock.calls[0][0].outcomes.at(-1)).toMatchObject({ kind: 'called', route: 'provider', on: localDate(), reference: 'REF-9', note: 'Crew tomorrow' })
    expect(record.mock.calls[0][0].followUpOn).toBe(addBusinessDays(localDate(), FOLLOW_UP_BUSINESS_DAYS))
    expect(onHistory).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('records an unreachable attempt and opens History', async () => {
    const { user, record, onHistory, t } = setup()
    await user.click(screen.getByRole('button', { name: t.log }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: t.unreachable }))
    expect(record.mock.calls[0][0].outcomes.at(-1)).toMatchObject({ kind: 'unreachable' })
    expect(onHistory).toHaveBeenCalledTimes(1)
  })

  it('keeps the contact date validation', async () => {
    const { user, record, t } = setup()
    await user.click(screen.getByRole('button', { name: t.log }))
    const d = within(screen.getByRole('dialog'))
    fireEvent.change(d.getByLabelText(t.date), { target: { value: '2999-01-01' } })
    expect(d.getByRole('button', { name: t.save })).toBeDisabled()
    expect(d.getByRole('button', { name: t.unreachable })).toBeDisabled()
    fireEvent.change(d.getByLabelText(t.date), { target: { value: '' } })
    expect(d.getByRole('button', { name: t.save })).toBeDisabled()
    expect(record).not.toHaveBeenCalled()
  })

  it('is unavailable in sample mode', () => {
    render(<SendOptions draft={base()} language="en" sample blocked={false} copy={async () => true} record={vi.fn()} onHistory={vi.fn()} compact />)
    expect(screen.queryByRole('button', { name: T.en.log })).toBeNull()
  })
})
