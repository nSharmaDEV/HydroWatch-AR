import { test, expect } from '@playwright/test'
import { SOURCES } from '../../src/domain'
import { LEISURE_HILLS_ID } from '../../src/annual-reports'
import { helpGuideStrings } from '../../src/help-guide-strings'
import type { HelpRequest } from '../../src/help-requests'

// Form/layout checks do not exercise decorative water animation (covered separately).
test.use({ reducedMotion: 'reduce' })

async function expectFits(page: import('@playwright/test').Page) {
  // One centred card per step, no wider than the Places supplier card.
  const card = page.locator('.request-card')
  await expect(card).toHaveCount(1)
  await expect(page.locator('.request-split, .request-panel')).toHaveCount(0)
  const box = (await card.boundingBox())!, width = page.viewportSize()!.width
  expect(box.width).toBeLessThanOrEqual(760.5)
  if (width > 800) expect(Math.abs(box.x + box.width / 2 - width / 2)).toBeLessThanOrEqual(1)
  expect(await card.evaluate(el => getComputedStyle(el).borderTopWidth)).toBe('1px')
  // The primary action sits at the bottom of the card, full width.
  const action = (await card.locator('.request-card-action .primary').first().boundingBox())!
  expect(action.y).toBeGreaterThan(box.y + box.height / 2)
  expect(action.width).toBeGreaterThan(box.width * .8)
  const composer = page.locator('.request-composer')
  if (await composer.count()) {
    await expect(composer.locator('.request-subject input')).toBeVisible()
    expect((await composer.locator('.request-message-editor').boundingBox())!.height).toBeGreaterThanOrEqual(140)
    await expect(page.locator('.request-review-table')).toHaveCount(0)
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  // Desktop sizes: the whole step, including its button, fits without scrolling.
  const layout = await page.evaluate(() => {
    const card = document.querySelector('.request-card')!
    const parents = []
    for (let el: Element | null = card; el; el = el.parentElement) {
      const style = getComputedStyle(el)
      parents.push({ tag: el.tagName, class: el.className, bottom: el.getBoundingClientRect().bottom, padding: style.padding, margin: style.margin, minHeight: style.minHeight })
    }
    return { height: document.documentElement.scrollHeight, card: card.getBoundingClientRect().toJSON(), parents }
  })
  expect(layout.height, JSON.stringify(layout)).toBeLessThanOrEqual(page.viewportSize()!.height + 1)
  expect(action.y + action.height).toBeLessThanOrEqual(page.viewportSize()!.height)
}
async function expectNarrow(page: import('@playwright/test').Page) {
  for (const width of [640, 390, 320]) {
    await page.setViewportSize({ width, height: 700 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    if (await page.locator('.request-review-email').count()) {
      const subject = (await page.locator('.request-review-email .request-subject').boundingBox())!
      const editor = (await page.locator('.request-message-editor').boundingBox())!
      const tools = (await page.locator('.request-review-update').boundingBox())!
      expect(editor.height).toBeGreaterThanOrEqual(240)
      expect(editor.y).toBeGreaterThanOrEqual(subject.y + subject.height)
      expect(tools.y).toBeGreaterThanOrEqual(editor.y + editor.height)
    }
  }
}

for (const viewport of [{ width: 1280, height: 800 }, { width: 1440, height: 780 }]) for (const language of ['en', 'es'] as const) for (const active of [true, false]) for (const issue of ['advisory', 'service', 'quality', 'billing', 'other'] as const) {
  test(`compact help workspace (${language}, active=${active}, ${issue}, ${viewport.width}×${viewport.height})`, async ({ page, context, baseURL }) => {
    const h = helpGuideStrings[language], es = language === 'es'
    let records: HelpRequest[] = []
    const at = new Date().toISOString()
    const place = { id: LEISURE_HILLS_ID, name: 'LEISURE HILLS MOBILE HOME PARK', county: 'Benton', kind: 'system' }
    const notice = { id: 'synthetic-workspace', placeId: place.id, name: place.name, county: place.county, agency: 'ADH', kind: 'boil', area: 'Synthetic test area', reason: 'Synthetic test incident\nSynthetic equipment repair', issued: '2026-10-20', lifted: null, url: SOURCES.ADH }
    const unexpected: string[] = [], errors: string[] = []
    page.on('pageerror', error => errors.push(error.message))
    await context.addInitScript(({ language, id }) => {
      sessionStorage.setItem('wave:logo-intro:v1', 'seen')
      localStorage.setItem('water-alert:live:v1', JSON.stringify({ watches: [id], liftWatches: [], language, checkOnOpen: true }))
    }, { language, id: place.id })
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin === baseURL && url.pathname === '/api/push/config' && route.request().method() === 'GET') return route.fulfill({ json: { enabled: false } })
      if (url.origin === baseURL && url.pathname === '/api/help/session' && route.request().method() === 'GET') return route.fulfill({ json: { enabled: true, user: { id: 'synthetic-user', email: 'resident@example.test' }, delivery: false, accountUrl: null } })
      if (url.origin === baseURL && url.pathname === '/api/help/requests') {
        if (route.request().method() === 'GET') return route.fulfill({ json: records })
        if (route.request().method() === 'POST') { const { draft, revision } = route.request().postDataJSON(); const record: HelpRequest = { id: draft.id, draft, revision: revision + 1, owner: 'synthetic-user', status: 'open', updatedAt: Date.now(), messages: [], events: [], replyToken: '' }; records = [record]; return route.fulfill({ json: record }) }
      }
      if (url.origin !== baseURL || (url.pathname.startsWith('/api/') && (url.pathname !== '/api/status' || route.request().method() !== 'GET'))) {
        unexpected.push(route.request().url()); return route.abort()
      }
      if (url.pathname === '/api/status') return route.fulfill({ json: { places: [place], sources: [{ agency: 'ADH', records: active ? [notice] : [], lastSuccessAt: at, retrievedAt: at, error: null }, { agency: 'ADEQ', records: [], lastSuccessAt: at, retrievedAt: at, error: null }], archive: [], coverageStart: at } })
      return route.continue()
    })
    await page.setViewportSize(viewport)
    await page.goto('/')
    await page.getByRole('button', { name: es ? 'Mapa' : 'Map', exact: true }).click()
    const mapBounds = await page.locator('.advisory-map-page').boundingBox()
    await page.getByRole('button', { name: es ? 'Lugares' : 'Places', exact: true }).click()
    await page.getByRole('button', { name: h.entry, exact: true }).click()
    const helpBounds = await page.locator('.request-workspace').first().boundingBox()
    expect(helpBounds!.x).toBeCloseTo(mapBounds!.x, 0)
    expect(helpBounds!.width).toBeCloseTo(mapBounds!.width, 0)
    await expect(page.locator('.request-progress')).toContainText(es ? /Paso 1 de \d/ : /Step 1 of \d/)
    await expect(page.locator('.help-directions')).toHaveCount(0)
    const choices = { advisory: ['Current advisory', 'Aviso actual'], billing: ['Bill or charge', 'Factura o cargo'], service: ['Service interruption or low pressure', 'Interrupción del servicio o baja presión'], quality: ['Water-quality concern', 'Inquietud sobre la calidad del agua'], other: ['Other issue', 'Otro problema'] }
    await page.getByRole('button', { name: choices[issue][es ? 1 : 0], exact: true }).click()
    const tiles = page.locator('.request-issue-choice')
    const first = await tiles.nth(0).boundingBox(), second = await tiles.nth(1).boundingBox(), other = await tiles.nth(4).boundingBox()
    expect(Number.parseFloat(await tiles.first().evaluate(el => getComputedStyle(el).fontSize))).toBeGreaterThanOrEqual(20)
    expect(Number.parseFloat(await tiles.first().locator('svg').evaluate(el => getComputedStyle(el).width))).toBeGreaterThanOrEqual(32)
    expect(second!.y).toBeCloseTo(first!.y, 0)
    expect(second!.x).toBeGreaterThan(first!.x + first!.width)
    expect(other!.width).toBeGreaterThan(first!.width * 1.9)
    await page.locator('.request-guided-workspace h1').focus()
    expect(await page.locator('.request-guided-workspace h1').evaluate(el => getComputedStyle(el).outlineStyle)).toBe('none')
    await page.keyboard.press('Tab')
    await tiles.first().focus()
    expect(await tiles.first().evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none')
    const capture = process.env.WAVE_HELP_CAPTURE_DIR && viewport.width === 1280 && language === 'en' && active && issue === 'advisory' && test.info().project.name === 'desktop'
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-choose.png` })
    await expect(page.getByLabel(es ? '¿Cómo te está afectando?' : 'How is this affecting you?', { exact: true })).toHaveCount(0)
    const next = () => page.locator('.request-card-action .primary').click()
    const step = (n: number) => expect(page.locator('.request-progress')).toContainText(es ? `Paso ${n} de 8` : `Step ${n} of 8`)
    await next()
    // Step 2: what you noticed, plus supporting material. No folding sections on any step.
    await step(2)
    await expect(page.locator('details.request-optional')).toHaveCount(0)
    await expect(page.locator('.request-location-panel input')).toHaveCount(0)
    if (issue !== 'other') await page.locator('.request-wording input[type=checkbox]').first().check()
    await expect(page.getByRole('button', { name: es ? 'Añade una foto o documento' : 'Add a photo or document' })).toBeVisible()
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-experience.png` })
    await expectNarrow(page)
    await page.setViewportSize(viewport)
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    await page.getByLabel(es ? 'Archivos adjuntos (opcional)' : 'Attachments (optional)', { exact: true }).setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic attachment only') })
    await expectFits(page)
    await next()
    // Step 3: details and the resident's own description.
    await step(3)
    if (issue === 'billing') await page.getByRole('textbox', { name: es ? '¿Qué cargo cuestionas? (opcional)' : 'Which charge is in question? (optional)', exact: true }).fill('Synthetic duplicated service charge')
    await page.getByRole('textbox', { name: issue === 'other' ? es ? 'Describe lo que pasó' : 'Describe what happened' : es ? 'Describe lo que pasó (opcional si ya seleccionaste)' : 'Describe what happened (optional if selected before)', exact: true }).fill('Synthetic resident issue, no actual submission')
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-details.png` })
    await next()
    // Step 4: when it happened.
    await step(4)
    if (issue === 'service') {
      await expect(page.locator('input[type=date]').last()).toBeEnabled()
      await page.getByRole('combobox', { name: es ? '¿Continúa? (opcional)' : 'Is it ongoing? (optional)', exact: true }).selectOption('No')
      await expect(page.locator('input[type=date]').last()).toBeEnabled()
      await expect(page.locator('input[type=date]').first()).toBeVisible()
      expect(await page.locator('input[type=date]').first().evaluate(el => getComputedStyle(el, '::-webkit-calendar-picker-indicator').opacity)).toBe('1')
    }
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-timing.png` })
    await next()
    // Step 5: where it happened.
    await step(5)
    {
      const locationInput = page.locator('.request-location-panel input')
      await expect(page.locator('.request-location-chips li')).toHaveCount(0)
      for (const location of ['Oak Street', 'Community centre', 'Remove me']) { await locationInput.fill(location); await locationInput.press('Enter') }
      await page.getByRole('button', { name: `${es ? 'Eliminar lugar' : 'Remove location'}: Remove me`, exact: true }).click()
      await expect(page.locator('.request-location-chips li')).toHaveCount(2)
    }
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-where.png` })
    await next()
    // Step 6: the response that would help.
    await step(6)
    await expect(page.locator('.request-card-action .primary')).toHaveText(es ? 'Revisar correo' : 'Review email')
    if (issue === 'billing') await page.getByRole('textbox', { name: es ? '¿Qué has intentado? (opcional)' : 'What have you already tried? (optional)', exact: true }).fill('Synthetic billing-desk question')
    await page.locator('.request-wording input[type=checkbox]').first().check()
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-response.png` })
    await page.getByRole('button', { name: es ? 'Revisar correo' : 'Review email', exact: true }).click()
    await step(7)
    const activeRecords = active && !['billing', 'other'].includes(issue)
    if (activeRecords) {
      await page.locator('.request-records-button').click()
      await expect(page.locator('.request-review-record').first()).toContainText('Synthetic test incident')
      await expect(page.locator('.request-review-record a').first()).toHaveAttribute('href', SOURCES.ADH)
      await expect(page.locator('.request-review-record').first()).toContainText('Synthetic test area')
      await page.keyboard.press('Escape')
    }
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-records.png` })
    const editor = page.getByRole('textbox', { name: es ? 'Mensaje' : 'Message', exact: true })
    expect(await editor.evaluate(el => el.scrollTop)).toBe(0)
    {
      await expect(editor).toHaveValue(/Oak Street/)
      await expect(editor).toHaveValue(/Community centre/)
      await expect(editor).not.toHaveValue(/Remove me/)
    }
    await expect(page.getByRole('tab')).toHaveCount(0)
    await expect(page.getByRole('button', { name: es ? 'Descargar reporte' : 'Download report', exact: true })).toBeVisible()
    await expect(editor).toBeVisible()
    expect((await editor.boundingBox())!.width).toBeGreaterThan(550)
    await expect(page.getByLabel(es ? 'Asunto' : 'Subject', { exact: true })).toBeVisible()
    if (activeRecords) { await expect(editor).toHaveValue(/Synthetic test incident/); await expect(editor).toHaveValue(/Synthetic equipment repair/) }
    else await expect(editor).not.toHaveValue(/Synthetic test incident/)
    if (issue === 'billing') { await expect(editor).toHaveValue(/Synthetic duplicated service charge/); await expect(editor).toHaveValue(/Synthetic billing-desk question/) }
    await expect(editor).not.toHaveValue(/WAVE references|Agency-reported problem:|\(optional\)/)
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-review.png` })
    await expectNarrow(page)
    if (capture) { await page.setViewportSize({ width: 390, height: 844 }); await page.evaluate(() => window.scrollTo(0, 0)); await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-review-mobile.png`, fullPage: true }) }
    await page.setViewportSize(viewport)
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    if (active && issue === 'advisory') {
      const longMessage = 'SYNTHETIC long message, no actual submission.\n'.repeat(100)
      await editor.fill(longMessage)
      await expectFits(page)
      expect(await editor.evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true)
      await editor.focus()
      await page.keyboard.press('End')
      await expect(editor).toHaveValue(longMessage)
      if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-confirm-full.png` })
      await expect(editor).toHaveValue(longMessage)
    }
    await editor.fill('SYNTHETIC EDIT RETAINED')
    if (active && issue === 'advisory') {
      await page.getByRole('button', { name: es ? 'Fuentes citadas' : 'Cited sources', exact: true }).click()
      await expect(page.getByRole('dialog')).toContainText('Synthetic test incident')
      await expect(page.getByRole('dialog').getByRole('link').first()).toHaveAttribute('href', SOURCES.ADH)
      await page.keyboard.press('Escape')
      await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
      await page.getByRole('button', { name: es ? 'Abrir Historial' : 'Open History', exact: true }).click()
      await page.getByRole('button', { name: es ? 'Reanudar borrador' : 'Resume draft', exact: true }).click()
      await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
       await page.locator('.request-records-button').click()
       const include = page.getByRole('checkbox', { name: es ? 'Incluir en el correo' : 'Include in email', exact: true }).filter({ visible: true })
       for (const checkbox of await include.all()) if (await checkbox.isEnabled()) await checkbox.uncheck()
      await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
      await expect(page.getByRole('checkbox', { name: es ? 'Incluir en el correo' : 'Include in email', exact: true }).first()).not.toBeChecked()
      await page.getByRole('button', { name: es ? 'Cerrar registros' : 'Close records', exact: true }).click()
    }
    await expect(page.getByRole('button', { name: es ? 'Enviar mensaje' : 'Send message', exact: true })).toHaveCount(0)
    await expect(page.locator('.send-options')).toHaveCount(0)
    await page.getByRole('button', { name: es ? 'Dónde enviarlo' : 'Where to send it', exact: true }).click()
    // Step 8: where to send it, on its own card.
    await step(8)
    await expect(page.locator('.send-options')).toBeVisible()
    await page.getByRole('button', { name: es ? 'Fuentes de contacto' : 'Contact sources', exact: true }).click()
    const contactSources = page.getByRole('dialog', { name: es ? 'Fuentes de contacto' : 'Contact sources', exact: true })
    if (issue !== 'quality') await expect(contactSources).toContainText('SUPERCLAIO@YAHOO.COM')
    else {
      await expect(contactSources).toContainText('Arkansas Department of Health')
      await expect(contactSources).not.toContainText('SUPERCLAIO@YAHOO.COM')
    }
    await expect(contactSources.getByRole('link').first()).toHaveAttribute('href', /^https:\/\//)
    await page.keyboard.press('Escape')
    await expect(contactSources).toBeHidden()
    await expect(page.getByRole('button', { name: es ? 'Enviar mensaje' : 'Send message', exact: true })).toHaveCount(0)
    const sendButton = page.getByRole('button', { name: es ? 'Copiar correo' : 'Copy email', exact: true })
    await expect(sendButton).toBeEnabled()
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-confirm.png` })
    const back = page.getByRole('button', { name: es ? 'Atrás' : 'Back', exact: true })
    await back.click()
    await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
    await back.click()
    await step(6)
    await page.getByRole('button', { name: es ? 'Revisar correo' : 'Review email', exact: true }).click()
    await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
    await expect(page.getByText(/synthetic.txt/, { exact: false })).toBeVisible()
    await page.getByRole('button', { name: es ? 'Dónde enviarlo' : 'Where to send it', exact: true }).click()
    // Narrow screens and enlarged text may naturally scroll, never horizontally.
    for (const width of [640, 390, 320]) {
      await page.setViewportSize({ width, height: 700 })
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
      await sendButton.scrollIntoViewIfNeeded()
    }
    await page.setViewportSize({ width: 1280, height: 700 })
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await sendButton.scrollIntoViewIfNeeded()
    await expect(sendButton).toBeVisible()
    expect(unexpected).toEqual([]); expect(errors).toEqual([])
  })
}
