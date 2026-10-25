import { test, expect } from '@playwright/test'
import { SOURCES } from '../../src/domain'
import { LEISURE_HILLS_ID } from '../../src/annual-reports'
import { helpGuideStrings } from '../../src/help-guide-strings'
import type { HelpRequest } from '../../src/help-requests'

async function expectFits(page: import('@playwright/test').Page) {
  const panels = page.locator('.request-split > .request-panel')
  if (await panels.count() === 2) {
    const geometry = await panels.evaluateAll(els => els.map(el => ({ height: el.getBoundingClientRect().height, top: el.getBoundingClientRect().top, padding: getComputedStyle(el).padding, background: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopWidth })))
    expect(geometry[0].height).toBeCloseTo(geometry[1].height, 0)
    expect(geometry[0].top).toBeCloseTo(geometry[1].top, 0)
    for (const panel of geometry) {
      expect(panel.padding).toBe('24px')
      expect(panel.background).toBe('rgb(255, 255, 255)')
      expect(panel.border).toBe('1px')
    }
  }
  const composer = page.locator('.request-composer')
  if (await composer.count()) {
    await expect(composer.locator('.request-subject input')).toBeVisible()
    await expect(page.locator('.request-review-information input[type=file]')).toHaveCount(1)
    expect((await composer.locator('.request-message-editor').boundingBox())!.height).toBeGreaterThanOrEqual(160)
    const left = (await page.locator('.request-review-information').boundingBox())!, right = (await composer.boundingBox())!
    expect(left.y).toBeCloseTo(right.y, 0)
    expect(left.width / (left.width + right.width)).toBeCloseTo(0.35, 1)
    for (const cell of await page.locator('.request-review-table td').all()) expect(await cell.evaluate(el => getComputedStyle(el).textAlign)).toBe('left')
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  if (await page.locator('.request-review-grid').count() && page.viewportSize()?.width === 1280 && page.viewportSize()?.height === 800) {
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(801)
  }
  if (!await composer.count()) expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(page.viewportSize()!.height + 1)
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
    await page.getByRole('button', { name: es ? 'Continuar' : 'Continue', exact: true }).click()
    {
      const locationInput = page.locator('.request-location-panel input')
      await expect(page.locator('.request-location-chips li')).toHaveCount(0)
      for (const location of ['Oak Street', 'Community centre', 'Remove me']) { await locationInput.fill(location); await locationInput.press('Enter') }
      await page.getByRole('button', { name: `${es ? 'Eliminar lugar' : 'Remove location'}: Remove me`, exact: true }).click()
      await expect(page.locator('.request-location-chips li')).toHaveCount(2)
      await expect(page.locator('.request-title-row .primary')).toHaveText(es ? 'Continuar' : 'Continue')
      if (issue === 'service') {
        await expect(page.locator('input[type=date]').last()).toBeDisabled()
        await page.getByRole('combobox', { name: es ? '¿Continúa? (opcional)' : 'Is it ongoing? (optional)', exact: true }).selectOption('No')
        await expect(page.locator('input[type=date]').last()).toBeEnabled()
        await expect(page.locator('input[type=date]').first()).toBeVisible()
        expect(await page.locator('input[type=date]').first().evaluate(el => getComputedStyle(el, '::-webkit-calendar-picker-indicator').opacity)).toBe('1')
      }
      await expect(page.getByLabel(es ? 'Archivos adjuntos (opcional)' : 'Attachments (optional)', { exact: true })).toHaveCount(0)
      await expectFits(page)
      if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-timing.png` })
      await page.getByRole('button', { name: es ? 'Continuar' : 'Continue', exact: true }).click()
    }
    if (issue === 'billing') await page.getByRole('textbox', { name: es ? '¿Qué cargo cuestionas? (opcional)' : 'Which charge is in question? (optional)', exact: true }).fill('Synthetic duplicated service charge')
    await page.getByRole('textbox', { name: es ? 'Describe lo que pasó (opcional si seleccionaste arriba)' : 'Describe what happened (optional if selected above)', exact: true }).fill('Synthetic resident issue, no actual submission')
    if (issue !== 'other') await page.locator('.request-wording input[type=checkbox]').first().check()
    await expect(page.getByRole('button', { name: es ? 'Añade una foto o documento' : 'Add a photo or document' })).toBeVisible()
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-experience.png` })
    await expectNarrow(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-experience-mobile.png`, fullPage: true })
    await page.setViewportSize(viewport)
    await page.evaluate(() => { document.documentElement.style.fontSize = '32px' })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    await page.evaluate(() => { document.documentElement.style.fontSize = '' })
    await page.getByLabel(es ? 'Archivos adjuntos (opcional)' : 'Attachments (optional)', { exact: true }).setInputFiles({ name: 'synthetic.txt', mimeType: 'text/plain', buffer: Buffer.from('Synthetic attachment only') })
    await page.getByRole('button', { name: es ? 'Continuar' : 'Continue', exact: true }).click()
    if (issue === 'billing') await page.getByRole('textbox', { name: es ? '¿Qué has intentado? (opcional)' : 'What have you already tried? (optional)', exact: true }).fill('Synthetic billing-desk question')
    await page.locator('.request-wording input[type=checkbox]').first().check()
    await expect(page.locator('.request-title-row .primary')).toHaveText(es ? 'Revisar mensaje' : 'Review message')
    await expectFits(page)
    await page.getByRole('button', { name: es ? 'Revisar mensaje' : 'Review message', exact: true }).click()
    const activeRecords = active && !['billing', 'other'].includes(issue)
    if (activeRecords) {
      await expect(page.locator('.request-review-record').first()).toContainText('Synthetic test incident')
      await expect(page.locator('.request-review-record a').first()).toHaveAttribute('href', SOURCES.ADH)
      await expect(page.locator('.request-review-record').first()).toContainText('Synthetic test area')
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
    if (activeRecords) { await expect(editor).toHaveValue(/Synthetic test incident/); await expect(editor).toHaveValue(/Synthetic equipment repair/); await expect(page.locator('.request-source-links a').first()).toHaveAttribute('href', SOURCES.ADH) }
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
      await page.locator('.request-fact-wording > summary').first().click()
      await page.getByRole('button', { name: es ? 'Editar texto de la fuente' : 'Edit source wording', exact: true }).first().click()
      await page.getByRole('textbox', { name: es ? 'Texto de la fuente' : 'Source wording', exact: true }).fill('SYNTHETIC EDITED SOURCE CONTEXT')
      await page.locator('.request-fact-wording > summary').first().click()
      await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
      await page.getByRole('button', { name: es ? 'Abrir Historial' : 'Open History', exact: true }).click()
      await page.getByRole('button', { name: es ? 'Reanudar borrador' : 'Resume draft', exact: true }).click()
      await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
       await page.locator('.request-fact-wording > summary').first().click()
       await expect(page.locator('.request-review-record').first()).toContainText('SYNTHETIC EDITED SOURCE CONTEXT')
        page.on('dialog', dialog => void dialog.accept())
        while (await page.getByRole('button', { name: es ? 'Quitar registro de la fuente' : 'Remove source record', exact: true }).count()) await page.getByRole('button', { name: es ? 'Quitar registro de la fuente' : 'Remove source record', exact: true }).first().click()
      await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
      await expect(page.locator('.request-source-links')).toHaveCount(0)
    }
    await expect(page.getByRole('button', { name: es ? 'Continuar al envío' : 'Continue to send', exact: true })).toHaveCount(0)
    await expect(page.getByRole('button', { name: es ? 'Enviar mensaje' : 'Send message', exact: true })).toHaveCount(0)
    const sendButton = page.getByRole('button', { name: es ? 'Copiar correo' : 'Copy email', exact: true })
    await expect(sendButton).toBeEnabled()
    await expectFits(page)
    if (capture) await page.screenshot({ path: `${process.env.WAVE_HELP_CAPTURE_DIR}/help-confirm.png` })
    await page.getByRole('button', { name: es ? 'Atrás' : 'Back', exact: true }).click()
    await page.getByRole('button', { name: es ? 'Revisar mensaje' : 'Review message', exact: true }).click()
    await expect(editor).toHaveValue('SYNTHETIC EDIT RETAINED')
    await expect(page.getByText(/synthetic.txt/, { exact: false })).toBeVisible()
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
