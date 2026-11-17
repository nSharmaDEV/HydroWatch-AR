import { test, expect, type Page } from '@playwright/test'

// Synthetic device-only draft on Review; every API call is stubbed or blocked. No real sends.
test.use({ reducedMotion: 'reduce' })
const within = (page: Page, selector: string) => page.locator(selector).evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.left >= 0 && r.bottom <= innerHeight && r.right <= innerWidth })

for (const language of ['en', 'es'] as const) test(`Log a contact attempt opens a fitted modal and Save opens History (${language})`, async ({ page, context, baseURL }, info) => {
  const es = language === 'es', unexpected: string[] = []
  await context.addInitScript(language => {
    sessionStorage.setItem('wave:logo-intro:v1', 'seen')
    localStorage.setItem('water-alert:mode', 'live')
    localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [], liftWatches: [], language, checkOnOpen: false }))
    const place = { id: 'ADH:cb08f1d6d339ab0c908178b44da1deb36c8fddcf607f91025bcfef4d84b681bb', name: 'BENTONVILLE WATER UTILITIES', kind: 'system', county: 'Benton' }
    const draft = { id: 'synthetic-contact-log', place, issue: 'service', description: 'Synthetic contact log check', dates: '', route: 'provider', stage: 2, flowStep: 'send', attachments: [], evidence: [], context: '', subjectEdited: true, bodyEdited: true, subject: 'Synthetic low pressure', body: 'Hello team,\n\nSynthetic message.\n\nThank you.' }
    localStorage.setItem('water-alert:live-help:v1', JSON.stringify([{ id: draft.id, owner: 'device', draft, revision: 1, status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }]))
  }, language)
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    if (u.origin !== baseURL) { unexpected.push(u.href); return route.abort() }
    if (u.pathname === '/api/help/session') return route.fulfill({ json: { enabled: false, user: null, delivery: false, accountUrl: null } })
    if (u.pathname === '/api/push/config') return route.fulfill({ json: { enabled: false } })
    if (u.pathname === '/api/status') return route.fulfill({ json: { places: [], sources: [], archive: [], coverageStart: null } })
    if (u.pathname.startsWith('/api/')) { unexpected.push(u.href); return route.abort() }
    return route.continue()
  })
  const desktop = info.project.name === 'desktop'
  if (desktop) await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto('/')
  await page.getByRole('button', { name: es ? 'Historial' : 'History', exact: true }).click()
  await page.getByRole('button', { name: es ? 'Continuar borrador' : 'Continue draft', exact: true }).click()
  const opener = page.getByRole('button', { name: es ? 'Registrar un intento de contacto' : 'Log a contact attempt', exact: true })
  const sideHeight = await page.locator('.review-side').evaluate(el => el.getBoundingClientRect().height)
  await opener.click()
  const dialog = page.getByRole('dialog', { name: es ? 'Registrar un intento de contacto' : 'Log a contact attempt' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel(es ? 'Fecha de contacto' : 'Contact date', { exact: true })).toBeFocused()
  await expect(dialog.getByLabel(es ? 'Número de referencia o caso' : 'Reference or ticket number', { exact: true })).toHaveAttribute('placeholder', es ? 'p. ej., caso n.º 12345' : 'e.g., case #12345')
  await expect(dialog.getByLabel(es ? '¿Qué te dijeron? (opcional)' : 'What did they tell you? (optional)', { exact: true })).toHaveAttribute('placeholder', es ? 'p. ej., Dijeron que un equipo investigaría mañana.' : 'e.g., They said a crew would investigate tomorrow.')
  await expect(dialog).not.toContainText(/Sugerido|Suggested|notificaci|notification/)
  // The right column does not grow behind the popup.
  expect(await page.locator('.review-side').evaluate(el => el.getBoundingClientRect().height)).toBe(sideHeight)
  const top = (label: string) => dialog.getByLabel(label, { exact: true }).evaluate(el => Math.round(el.getBoundingClientRect().top))
  const [date, how] = [await top(es ? 'Fecha de contacto' : 'Contact date'), await top(es ? '¿Cómo lo intentaste?' : 'How did you try?')]
  if (desktop) {
    expect(how).toBe(date)
    expect(await within(page, 'dialog.contact-log-dialog')).toBe(true)
    expect(await page.locator('dialog.contact-log-dialog').evaluate(el => el.scrollHeight <= el.clientHeight)).toBe(true)
    for (const name of es ? ['No pude comunicarme', 'Cancelar', 'Guardar'] : ['Couldn’t reach them', 'Cancel', 'Save']) expect(await dialog.getByRole('button', { name, exact: true }).evaluate(el => { const r = el.getBoundingClientRect(); return r.bottom <= innerHeight && r.top >= 0 })).toBe(true)
  } else {
    expect(how).toBeGreaterThan(date)
    expect(await page.locator('dialog.contact-log-dialog').evaluate(el => el.getBoundingClientRect().right <= innerWidth)).toBe(true)
  }
  await page.screenshot({ path: info.outputPath(`contact-log-${language}-${info.project.name}.png`) })
  // Focus stays in the modal while tabbing.
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); expect(await page.evaluate(() => !!document.activeElement?.closest('dialog.contact-log-dialog'))).toBe(true) }
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(opener).toBeFocused()
  await opener.click()
  await dialog.getByLabel(es ? 'Número de referencia o caso' : 'Reference or ticket number', { exact: true }).fill('SYN-1')
  await dialog.getByRole('button', { name: es ? 'Guardar' : 'Save', exact: true }).click()
  await expect(page.getByRole('heading', { name: es ? 'Lo que registraste' : 'What you recorded' })).toBeVisible()
  await expect(page.getByText(/SYN-1/).first()).toBeVisible()
  expect(unexpected).toEqual([])
})
