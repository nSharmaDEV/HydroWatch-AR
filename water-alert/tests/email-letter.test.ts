import { expect, test } from 'vitest'
import { blankRequest, generateMessage, type HelpDraft } from '../src/help-requests'
import { samplePlaces } from '../src/sample'

// Shape taken from the FTC, CCW and Arkansas AG/PSC complaint-letter examples:
// who/where → problem → earlier contact → numbered requests → references → reply window → sign-off.
const billing = (): HelpDraft => ({
  ...blankRequest(samplePlaces[0]), issue: 'billing',
  locations: ['1908 SW Huntwick Ave, Bentonville, AR'],
  answers: { account: '4421-07', billingPeriod: 'October 2026', tried: 'I called the office once.' },
  wording: { report: { second: 'A charge appears more than once', third: 'The amount differs from what I expected' }, response: { first: 'Review the charge', second: 'Explain the bill' } },
  residentName: 'Ana Resident', replyContact: 'ana@example.test',
})

test('the letter opens with the address and account so the supplier can find the customer', () => {
  const [, intro] = generateMessage(billing(), 'en').body.split('\n\n')
  expect(intro).toContain('1908 SW Huntwick Ave, Bentonville, AR')
  expect(intro).toContain('account number 4421-07')
  expect(intro).toContain('October 2026')
})

test('selected observations become sentences, not pasted checkbox labels', () => {
  const body = generateMessage(billing(), 'en').body
  expect(body).toContain('A charge appears more than once on my bill.')
  expect(body).toContain('The total is different from what I expected.')
})

test('requests are a numbered list and come before the reply window and sign-off', () => {
  const body = generateMessage(billing(), 'en').body
  expect(body).toMatch(/Could you please:\n1\. Review the charge\n2\. Explain the bill/)
  const order = ['I have already tried', 'Could you please:', 'within 5 business days', 'You can reach me at ana@example.test', 'Thank you,\nAna Resident']
  const at = order.map(text => body.indexOf(text))
  expect(at.every(i => i >= 0)).toBe(true)
  expect(at.slice(1).every((value, i) => value > at[i])).toBe(true)
})

test('the reply window is polite and relative, never a threat or a fixed calendar date', () => {
  const body = generateMessage(billing(), 'en').body
  expect(body).toContain('I’d appreciate a reply within 5 business days.')
  expect(body).not.toMatch(/legal action|lawsuit|violation|demand/i)
})

test('the subject says what the email is about and carries the account number when given', () => {
  expect(generateMessage(billing(), 'en').subject).toBe('Question about my water bill — account 4421-07')
  const noAccount = { ...billing(), answers: { billingPeriod: 'October 2026' } }
  expect(generateMessage(noAccount, 'en').subject).toMatch(/^Question about my water bill — /)
  expect(generateMessage(noAccount, 'en').subject).not.toContain('account')
})

test('Spanish follows the same order with infinitive requests', () => {
  const d = { ...billing(), wording: { report: { second: 'Un cargo aparece más de una vez' }, response: { first: 'Revisar el cargo', second: 'Explicar la factura' } } }
  const body = generateMessage(d, 'es').body
  expect(body).toContain('número de cuenta 4421-07')
  expect(body).toContain('Un cargo aparece más de una vez en mi factura.')
  expect(body).toMatch(/Les pido, por favor:\n1\. Revisar el cargo\n2\. Explicar la factura/)
  expect(body).toContain('Agradecería una respuesta en un plazo de 5 días hábiles.')
  expect(body).toContain('Pueden comunicarse conmigo en ana@example.test')
  expect(body).toMatch(/Gracias,\nAna Resident/)
})

test('without requests, contact or name the letter still reads cleanly', () => {
  const d = { ...blankRequest(samplePlaces[0]), issue: 'service' as const, description: 'Low pressure every morning.' }
  const body = generateMessage(d, 'en').body
  expect(body).not.toContain('Could you please:')
  expect(body).not.toContain('reach me at')
  expect(body).not.toMatch(/\n\n\n|undefined|null/)
  expect(body).toContain('within 5 business days')
  expect(body.trim().endsWith('Thank you.')).toBe(true)
})

test('agency records sit under For reference after the requests', () => {
  const d: HelpDraft = { ...billing(), issue: 'service', wording: { report: { first: 'No water' }, response: { first: 'Restore service' } }, facts: [{ id: 'n1', text: 'The notice lists Oak Street.', kind: 'saved', included: true, sources: [{ recordId: 'n1', label: 'ADH notice', url: 'https://example.test/n1' }] }] }
  const body = generateMessage(d, 'en').body
  expect(body.indexOf('For reference:')).toBeGreaterThan(body.indexOf('Could you please:'))
  expect(body.indexOf('notice lists Oak Street.')).toBeGreaterThan(body.indexOf('For reference:'))
  expect(body).toContain('https://example.test/n1')
})

test('the call script reuses the email sentences as plain speech', async () => {
  const { callScript } = await import('../src/send-options')
  const lines = callScript(billing(), 'en')
  expect(lines[0]).toMatch(/^Hi, I’m a .+ customer at 1908 SW Huntwick Ave, Bentonville, AR \(account number 4421-07\)\.$/)
  expect(lines).toContain('I’m calling about my water bill for October 2026.')
  expect(lines.join(' ')).toContain('A charge appears more than once on my bill.')
  expect(lines).toContain('Could you please review the charge and explain the bill?')
  expect(lines.at(-1)).toBe('Could you give me a reference number for this call?')
  expect(lines.join(' ')).not.toMatch(/calling to report: bill or charge|I'm asking for:/)
  const es = callScript({ ...billing(), wording: { report: {}, response: { first: 'Revisar el cargo' } } }, 'es')
  expect(es[0]).toMatch(/^Hola, soy cliente de /)
  expect(es).toContain('Llamo por mi factura de agua de October 2026.')
  expect(es).toContain('¿Podrían, por favor, revisar el cargo?')
})
