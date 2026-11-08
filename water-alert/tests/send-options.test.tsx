import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SendOptions } from '../src/SendOptions'
import { blankRequest, type HelpDraft } from '../src/help-requests'
import { callScript, mailtoUrl, sendOptions } from '../src/send-options'
import { PLACE_CATALOG } from '../src/place-catalog'

const place = (name: string) => PLACE_CATALOG.find(entry => entry.place.name === name)!.place
const draft = (name: string, patch: Partial<HelpDraft> = {}): HelpDraft => ({
  ...blankRequest(place(name)), description: 'Low pressure every morning', subject: 'Low water pressure', body: 'Hello team,\n\nPressure is low.', ...patch,
})
const copy = async () => true

describe('send options', () => {
  it('builds rows from the selected recipients and offers a separate escalation', () => {
    const { primary, next } = sendOptions(draft('FAYETTEVILLE WATERWORKS'))
    expect(primary.map(o => o.route)).toEqual(['provider'])
    expect(primary[0]).toMatchObject({ email: 'tnyander@fayetteville-ar.gov', emailKind: 'staff', dial: '+14795758386', recommended: true })
    expect(primary[0].emailSource?.source).toBe('EPA')
    expect(next?.route).toBe('adh')
    expect(sendOptions(draft('FAYETTEVILLE WATERWORKS', { issue: 'billing' })).next?.route).toBe('ag')
    expect(sendOptions(draft('FAYETTEVILLE WATERWORKS', { recipientRoutes: ['provider', 'adh'] })).next).toBeUndefined()
  })

  it('never invents an email for a system without a sourced address', () => {
    const [springdale] = sendOptions(draft('SPRINGDALE WATER UTILITIES')).primary
    expect(springdale.email).toBeUndefined()
    expect(springdale.dial).toBe('+14797515751')
  })

  it('rejects unsafe addresses and shortens oversized mail links', () => {
    expect(mailtoUrl('a@b.org?cc=x@y.org', 's', 'b')).toBeUndefined()
    expect(mailtoUrl('a@b.org', 'Subject', 'Body')).toEqual({ url: 'mailto:a@b.org?subject=Subject&body=Body', full: true })
    expect(mailtoUrl('a@b.org', 'Subject', 'x'.repeat(9000))).toEqual({ url: 'mailto:a@b.org?subject=Subject', full: false })
  })

  it('writes a call script only from the resident’s answers', () => {
    const lines = callScript(draft('ROGERS WATER UTILITIES', { answers: { began: '2026-11-01', ongoing: 'Yes' } }), 'en')
    expect(lines[0]).toBe('Hello, I\'m calling to report: service problem.')
    expect(lines.join(' ')).toContain('Low pressure every morning')
    expect(lines.at(-1)).toMatch(/reference number/)
    expect(callScript(draft('ROGERS WATER UTILITIES'), 'es')[0]).toBe('Hola, llamo para reportar: problema de servicio.')
  })
})

describe('SendOptions panel', () => {
  it.each(['en', 'es'] as const)('offers resident-initiated email, call and source links (%s)', language => {
    render(<SendOptions draft={draft('FAYETTEVILLE WATERWORKS')} language={language} sample={false} blocked={false} copy={copy} />)
    const row = within(screen.getByRole('article', { name: 'FAYETTEVILLE WATERWORKS' }))
    expect(row.getByRole('link', { name: language === 'en' ? /Open in email app/ : /Abrir en app de correo/ }).getAttribute('href')).toMatch(/^mailto:tnyander@fayetteville-ar\.gov\?subject=Low%20water%20pressure&body=/)
    expect(row.getByRole('link', { name: language === 'en' ? 'Call (479) 575-8386' : 'Llamar (479) 575-8386' })).toHaveAttribute('href', 'tel:+14795758386')
    expect(row.getByRole('link', { name: language === 'en' ? 'EPA water-system record' : 'registro federal de la EPA' })).toHaveAttribute('href', 'https://data.epa.gov/efservice/WATER_SYSTEM/PWSID/AR0000569/JSON')
    expect(screen.getByText(language === 'en' ? /WAVE does not send, call or file anything/ : /WAVE no envía, llama ni presenta nada/)).toBeVisible()
  })

  it('shows the disagreeing Leisure Hills listing without using it', () => {
    render(<SendOptions draft={draft('LEISURE HILLS MOBILE HOME PARK')} language="en" sample={false} blocked={false} copy={copy} />)
    expect(screen.getByText(/lists a different address \(SUPERCLAIO@YAHOO\.COM\); WAVE does not use it/)).toBeVisible()
    expect(document.querySelector('a[href^="mailto:SUPERCLAIO"]')).toBeNull()
    expect(document.querySelector('a[href^="mailto:LEISUREHILLSWATERCO@GMAIL.COM"]')).not.toBeNull()
  })

  it('says no email is on file instead of guessing one', () => {
    render(<SendOptions draft={draft('SPRINGDALE WATER UTILITIES')} language="en" sample={false} blocked={false} copy={copy} />)
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull()
    expect(screen.getByText(/No checked email on file — WAVE will not guess one/)).toBeVisible()
  })

  it('disables handoffs while blocked and for samples', () => {
    const { unmount } = render(<SendOptions draft={draft('ROGERS WATER UTILITIES')} language="en" sample={false} blocked copy={copy} />)
    expect(document.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull()
    expect(screen.getByRole('button', { name: /Open in email app/ })).toBeDisabled()
    unmount()
    render(<SendOptions draft={draft('ROGERS WATER UTILITIES')} language="en" sample blocked={false} copy={copy} />)
    expect(document.querySelector('a[href^="mailto:"], a[href^="tel:"]')).toBeNull()
    expect(screen.getAllByText('Sample — sending disabled.').length).toBeGreaterThan(0)
  })
})
